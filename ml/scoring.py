"""Shared inference + risk-scoring logic.

Both the training pipeline (to compute normalization metadata) and the FastAPI
backend import from here so the scoring math never drifts between offline and
online code paths.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

import joblib
import numpy as np

from .dataset import ANOMALY_COMPONENTS, FEATURE_COLS, V_COLS

ML_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(ML_DIR, "model.joblib")
SCALER_PATH = os.path.join(ML_DIR, "scaler.joblib")
META_PATH = os.path.join(ML_DIR, "metadata.json")

# Columns the StandardScaler is fit on (V1..V28 are already PCA'd in the
# Kaggle data, so only Time and Amount get scaled).
SCALED_COLS = ["Time", "Amount"]

FLAG_THRESHOLD = 65  # risk >= this => flagged as suspicious

# Human-readable risk-flag labels keyed by feature.
FLAG_LABELS: Dict[str, str] = {
    "Amount": "Unusual transaction amount",
    "Time": "Off-hours activity",
    "V4": "Atypical spending pattern",
    "V11": "Irregular merchant behavior",
    "V14": "Anomalous account signal",
    "V17": "Rare transaction profile",
}


def _label_for(feature: str) -> str:
    return FLAG_LABELS.get(feature, f"Abnormal {feature}")


def prepare_matrix(rows: np.ndarray, scaler) -> np.ndarray:
    """Scale Time + Amount columns in-place style and return the full matrix.

    ``rows`` must be ordered as FEATURE_COLS: [Time, V1..V28, Amount].
    """
    rows = np.asarray(rows, dtype=float)
    if rows.ndim == 1:
        rows = rows.reshape(1, -1)
    time_idx = FEATURE_COLS.index("Time")
    amount_idx = FEATURE_COLS.index("Amount")
    scaled = scaler.transform(rows[:, [time_idx, amount_idx]])
    out = rows.copy()
    out[:, time_idx] = scaled[:, 0]
    out[:, amount_idx] = scaled[:, 1]
    return out


def normalize_risk(decision_scores: np.ndarray, min_score: float, max_score: float) -> np.ndarray:
    """Map IsolationForest decision_function scores to a 0-100 risk score.

    decision_function: higher == more normal, lower/negative == more anomalous.
    """
    span = max(max_score - min_score, 1e-9)
    risk = (1.0 - (np.asarray(decision_scores) - min_score) / span) * 100.0
    return np.clip(risk, 0, 100)


@dataclass
class RiskFlag:
    feature: str
    direction: str
    label: str

    def to_dict(self) -> Dict[str, str]:
        return {"feature": self.feature, "direction": self.direction, "label": self.label}


def explain_row(feature_values: Dict[str, float], top_k: int = 3) -> List[RiskFlag]:
    """Fast, deterministic per-transaction explainer for the live stream.

    Legit PCA components are ~N(0,1), so |value| is a standardized deviation.
    We rank features by how far they sit from their expected range and surface
    the top contributors as human-readable risk flags. (Offline, ml/explain.py
    uses full SHAP TreeExplainer; this lightweight version keeps per-txn latency
    in the single-digit-millisecond range for the real-time dashboard.)
    """
    deviations: List[tuple] = []
    for comp in ANOMALY_COMPONENTS:
        val = float(feature_values.get(comp, 0.0))
        deviations.append((abs(val), comp, "high" if val > 0 else "low"))
    # Any other strongly-deviating PCA component also counts.
    for comp in V_COLS:
        if comp in ANOMALY_COMPONENTS:
            continue
        val = float(feature_values.get(comp, 0.0))
        if abs(val) > 3.0:
            deviations.append((abs(val), comp, "high" if val > 0 else "low"))

    # Amount: flag if far from the typical ~$88 mean of the dataset.
    amount = float(feature_values.get("Amount", 0.0))
    if amount > 600:
        deviations.append((amount / 100.0, "Amount", "high"))
    elif amount < 2 and amount >= 0:
        deviations.append((4.0, "Amount", "low"))

    deviations.sort(reverse=True, key=lambda d: d[0])
    flags: List[RiskFlag] = []
    seen = set()
    for _, feature, direction in deviations:
        if feature in seen:
            continue
        seen.add(feature)
        flags.append(RiskFlag(feature=feature, direction=direction, label=_label_for(feature)))
        if len(flags) >= top_k:
            break
    return flags


class Scorer:
    """Loads model artifacts and scores transactions for the backend."""

    def __init__(self, model, scaler, meta: dict):
        self.model = model
        self.scaler = scaler
        self.min_score = float(meta["min_score"])
        self.max_score = float(meta["max_score"])
        self.flag_threshold = int(meta.get("flag_threshold", FLAG_THRESHOLD))
        self.source = meta.get("source", "unknown")
        self.metrics = meta.get("metrics", {})

    @classmethod
    def load(
        cls,
        model_path: str = MODEL_PATH,
        scaler_path: str = SCALER_PATH,
        meta_path: str = META_PATH,
    ) -> "Scorer":
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        with open(meta_path) as fh:
            meta = json.load(fh)
        return cls(model, scaler, meta)

    def score(self, amount: float, time: float, features: Sequence[float]) -> dict:
        """Score one transaction.

        ``features`` is the 28-length V1..V28 vector.
        """
        if len(features) != 28:
            raise ValueError(f"expected 28 V-features, got {len(features)}")
        row = np.array([time, *features, amount], dtype=float)
        prepared = prepare_matrix(row, self.scaler)
        decision = float(self.model.decision_function(prepared)[0])
        risk = int(round(float(normalize_risk(np.array([decision]), self.min_score, self.max_score)[0])))
        flagged = risk >= self.flag_threshold

        feature_values = {comp: float(v) for comp, v in zip(V_COLS, features)}
        feature_values["Amount"] = float(amount)
        feature_values["Time"] = float(time)
        flags = explain_row(feature_values) if flagged else []

        return {
            "risk_score": risk,
            "flagged": flagged,
            "decision_score": decision,
            "risk_flags": [f.to_dict() for f in flags],
        }
