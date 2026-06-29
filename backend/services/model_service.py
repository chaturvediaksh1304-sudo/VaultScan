"""Loads the trained model once and scores transactions.

Wraps ml.scoring.Scorer and adds latency measurement + timestamping so the
result matches the API contract.
"""
from __future__ import annotations

import time as _time
from datetime import datetime, timezone
from typing import List, Optional, Sequence

from ml.scoring import Scorer


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ModelService:
    def __init__(self) -> None:
        self._scorer: Optional[Scorer] = None

    def load(self) -> None:
        self._scorer = Scorer.load()

    @property
    def loaded(self) -> bool:
        return self._scorer is not None

    @property
    def source(self) -> str:
        return self._scorer.source if self._scorer else "unloaded"

    @property
    def flag_threshold(self) -> int:
        return self._scorer.flag_threshold if self._scorer else -1

    @property
    def metrics(self) -> dict:
        return self._scorer.metrics if self._scorer else {}

    def score(
        self,
        transaction_id: str,
        amount: float,
        time: float,
        features: Sequence[float],
        is_replay: bool = False,
        original_label: Optional[int] = None,
    ) -> dict:
        if self._scorer is None:
            raise RuntimeError("model not loaded")
        start = _time.perf_counter()
        result = self._scorer.score(amount=amount, time=time, features=features)
        latency_ms = (_time.perf_counter() - start) * 1000.0
        return {
            "transaction_id": transaction_id,
            "amount": round(float(amount), 2),
            "risk_score": result["risk_score"],
            "flagged": result["flagged"],
            "risk_flags": result["risk_flags"],
            "latency_ms": round(latency_ms, 2),
            "timestamp": _utc_now_iso(),
            "is_replay": is_replay,
            "original_label": original_label,
        }


# Module-level singleton — loaded on app startup.
model_service = ModelService()
