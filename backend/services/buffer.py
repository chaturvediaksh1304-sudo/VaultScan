"""In-memory rolling buffer + live stats.

This is the simplified stand-in for Redis (recent-transactions buffer) and the
Postgres audit log. The interface (push / recent / stats) is deliberately small
so it can be swapped for a real Redis/Postgres backend without touching callers.
"""
from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Deque, Dict, List

MAX_BUFFER = 500
LATENCY_WINDOW = 200  # samples to average latency over


class TransactionBuffer:
    def __init__(self, maxlen: int = MAX_BUFFER) -> None:
        self._buf: Deque[dict] = deque(maxlen=maxlen)
        self._latencies: Deque[float] = deque(maxlen=LATENCY_WINDOW)
        self._flagged_times: Deque[float] = deque(maxlen=maxlen)
        self._total = 0
        self._fraud_total = 0
        self._lock = Lock()

    def push(self, txn: dict) -> None:
        with self._lock:
            self._buf.appendleft(txn)
            self._total += 1
            self._latencies.append(float(txn.get("latency_ms", 0.0)))
            if txn.get("flagged"):
                self._fraud_total += 1
                self._flagged_times.append(time.monotonic())

    def recent(self, limit: int = 50) -> List[dict]:
        with self._lock:
            return list(self._buf)[:limit]

    def stats(self) -> Dict[str, float]:
        with self._lock:
            total = self._total
            fraud = self._fraud_total
            latencies = list(self._latencies)
            now = time.monotonic()
            flagged_last_minute = sum(1 for t in self._flagged_times if now - t <= 60)
        fraud_rate = (fraud / total * 100.0) if total else 0.0
        avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0
        return {
            "total_processed": total,
            "fraud_rate_pct": round(fraud_rate, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "flagged_last_minute": flagged_last_minute,
        }


# Module-level singleton.
buffer = TransactionBuffer()
