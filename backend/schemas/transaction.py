"""Pydantic models for the VaultScan API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class RiskFlag(BaseModel):
    feature: str
    direction: str
    label: str


class TransactionIn(BaseModel):
    """Input to POST /score."""
    transaction_id: str = Field(..., examples=["txn_abc123"])
    amount: float = Field(..., ge=0)
    time: float = Field(..., description="Seconds since first transaction (Kaggle 'Time')")
    features: List[float] = Field(..., min_length=28, max_length=28,
                                  description="V1..V28 PCA components")


class ScoredTransaction(BaseModel):
    """Response from POST /score and each /ws/stream message."""
    transaction_id: str
    amount: float
    risk_score: int = Field(..., ge=0, le=100)
    flagged: bool
    risk_flags: List[RiskFlag]
    latency_ms: float
    timestamp: str
    # Present only on streamed (replayed) transactions:
    is_replay: bool = False
    original_label: Optional[int] = None


class Stats(BaseModel):
    total_processed: int
    fraud_rate_pct: float
    avg_latency_ms: float
    flagged_last_minute: int


class Health(BaseModel):
    status: str
    model_loaded: bool
    stream_running: bool
    source: str
    flag_threshold: int
