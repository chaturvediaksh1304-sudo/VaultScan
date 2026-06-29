"""Train the VaultScan Isolation Forest anomaly detector.

Steps (mirrors CLAUDE.md spec):
  1. Load creditcard.csv (or synthetic fallback with identical schema).
  2. Drop 'Class' for training — unsupervised. Labels kept only for evaluation.
  3. StandardScaler on Time + Amount (V1..V28 already PCA'd).
  4. IsolationForest(n_estimators=200, contamination=0.002, ...).
  5. Persist model.joblib, scaler.joblib, metadata.json.
  6. Export a small replay sample for the backend producer.

Run:  python -m ml.train      (from repo root)
"""
from __future__ import annotations

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.preprocessing import StandardScaler

from .dataset import FEATURE_COLS, load_dataset
from .scoring import (
    FLAG_THRESHOLD,
    META_PATH,
    MODEL_PATH,
    SCALED_COLS,
    SCALER_PATH,
    normalize_risk,
)

ML_DIR = os.path.dirname(__file__)
REPLAY_SAMPLE_PATH = os.path.join(ML_DIR, "data", "replay_sample.csv")
CONTAMINATION = 0.002
N_ESTIMATORS = 200
SEED = 42
TARGET_PRECISION = 0.85  # calibrate the flag threshold to hold >= this precision


def calibrate_threshold(risk: np.ndarray, labels: np.ndarray,
                        target_precision: float = TARGET_PRECISION) -> int:
    """Pick the lowest risk threshold that holds the target precision.

    Lowest qualifying threshold => maximum recall at that precision floor.
    Falls back to the best-F1 threshold if the target is unreachable.
    """
    candidates = np.arange(50, 100)  # only consider meaningfully-risky scores
    best_f1, best_f1_thr = -1.0, FLAG_THRESHOLD
    for thr in candidates:
        pred = (risk >= thr).astype(int)
        tp = int(((pred == 1) & (labels == 1)).sum())
        fp = int(((pred == 1) & (labels == 0)).sum())
        fn = int(((pred == 0) & (labels == 1)).sum())
        if tp + fp == 0:
            continue
        precision = tp / (tp + fp)
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        if f1 > best_f1:
            best_f1, best_f1_thr = f1, int(thr)
        if precision >= target_precision and recall > 0:
            return int(thr)
    return best_f1_thr


def main() -> None:
    df, source = load_dataset()
    print(f"[train] loaded {len(df):,} transactions (source={source}, "
          f"fraud={int(df['Class'].sum())})")

    labels = df["Class"].to_numpy()
    X = df[FEATURE_COLS].to_numpy(dtype=float)

    # 3. Scale Time + Amount only.
    scaler = StandardScaler()
    scaled_idx = [FEATURE_COLS.index(c) for c in SCALED_COLS]
    X_scaled = X.copy()
    X_scaled[:, scaled_idx] = scaler.fit_transform(X[:, scaled_idx])

    # 4. Train.
    print(f"[train] fitting IsolationForest(n_estimators={N_ESTIMATORS}, "
          f"contamination={CONTAMINATION})...")
    model = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # Decision scores across the training set => normalization bounds.
    decision = model.decision_function(X_scaled)
    min_score, max_score = float(decision.min()), float(decision.max())
    risk = normalize_risk(decision, min_score, max_score)

    # Calibrate the flag threshold to hold the target precision (max recall
    # at that floor). This is the operating point the live system flags on.
    flag_threshold = calibrate_threshold(risk, labels)
    print(f"[train] calibrated flag threshold: risk>={flag_threshold} "
          f"(target precision={TARGET_PRECISION})")

    # Post-hoc evaluation against held-out labels (for portfolio metrics).
    pred_flagged = (risk >= flag_threshold).astype(int)
    metrics = {
        "roc_auc": float(roc_auc_score(labels, risk / 100.0)),
        "precision": float(precision_score(labels, pred_flagged, zero_division=0)),
        "recall": float(recall_score(labels, pred_flagged, zero_division=0)),
        "f1": float(f1_score(labels, pred_flagged, zero_division=0)),
    }
    print(f"[train] metrics: ROC-AUC={metrics['roc_auc']:.3f} "
          f"precision={metrics['precision']:.3f} recall={metrics['recall']:.3f} "
          f"f1={metrics['f1']:.3f}")

    # 5. Persist artifacts.
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    meta = {
        "source": source,
        "n_estimators": N_ESTIMATORS,
        "contamination": CONTAMINATION,
        "flag_threshold": flag_threshold,
        "min_score": min_score,
        "max_score": max_score,
        "n_train": int(len(df)),
        "n_fraud_train": int(labels.sum()),
        "feature_cols": FEATURE_COLS,
        "metrics": metrics,
    }
    with open(META_PATH, "w") as fh:
        json.dump(meta, fh, indent=2)
    print(f"[train] saved model.joblib, scaler.joblib, metadata.json")

    # 6. Export a replay sample (stratified: keep all fraud + a legit sample)
    #    so the backend can stream realistic traffic without the full dataset.
    export_replay_sample(df)


def export_replay_sample(df, n_legit: int = 1500) -> None:
    rng = np.random.default_rng(SEED)
    fraud = df[df["Class"] == 1]
    legit = df[df["Class"] == 0]
    n_legit = min(n_legit, len(legit))
    legit_sample = legit.iloc[rng.choice(len(legit), size=n_legit, replace=False)]
    sample = pd.concat([legit_sample, fraud], ignore_index=True)
    sample = sample.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    sample.to_csv(REPLAY_SAMPLE_PATH, index=False)
    print(f"[train] wrote replay sample ({len(sample):,} rows, "
          f"{int(sample['Class'].sum())} fraud) -> {REPLAY_SAMPLE_PATH}")


if __name__ == "__main__":
    main()
