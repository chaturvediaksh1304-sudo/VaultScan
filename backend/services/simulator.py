"""In-process transaction simulator.

Replays the stratified sample exported by ml/train.py at a configurable rate,
scores each transaction, writes it to the buffer, and broadcasts it to all
WebSocket clients. This is the simplified stand-in for:

    producer/replay.py -> Kafka topic -> kafka_consumer.py -> broadcast

The public surface (start / stop / running) mirrors what a real Kafka consumer
task would expose, so swapping in Confluent later is a contained change.
"""
from __future__ import annotations

import asyncio
import csv
import os
import random
from typing import List, Optional

from ml.dataset import V_COLS
from .buffer import buffer
from .model_service import model_service
from .stream_hub import hub

REPLAY_SAMPLE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "ml", "data", "replay_sample.csv",
)
DEFAULT_TPS = float(os.environ.get("REPLAY_SPEED_TPS", "10"))


def _load_sample(path: str = REPLAY_SAMPLE_PATH) -> List[dict]:
    rows: List[dict] = []
    if not os.path.exists(path):
        return rows
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            rows.append({
                "amount": float(r["Amount"]),
                "time": float(r["Time"]),
                "features": [float(r[c]) for c in V_COLS],
                "label": int(float(r["Class"])),
            })
    return rows


class Simulator:
    def __init__(self, tps: float = DEFAULT_TPS) -> None:
        self.tps = max(0.5, tps)
        self._task: Optional[asyncio.Task] = None
        self._rows: List[dict] = []
        self._seq = 0
        self._running = False

    @property
    def running(self) -> bool:
        return self._running

    def start(self) -> None:
        if self._running:
            return
        self._rows = _load_sample()
        if not self._rows:
            # No sample yet (model not trained) — leave stream idle rather than crash.
            return
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run(self) -> None:
        delay = 1.0 / self.tps
        order = list(range(len(self._rows)))
        rng = random.Random(7)
        try:
            while self._running:
                rng.shuffle(order)
                for i in order:
                    if not self._running:
                        break
                    row = self._rows[i]
                    self._seq += 1
                    txn_id = f"txn_{self._seq:08d}"
                    scored = model_service.score(
                        transaction_id=txn_id,
                        amount=row["amount"],
                        time=row["time"],
                        features=row["features"],
                        is_replay=True,
                        original_label=row["label"],
                    )
                    buffer.push(scored)
                    await hub.broadcast(scored)
                    # Small jitter so the cadence feels organic, not metronomic.
                    await asyncio.sleep(delay * rng.uniform(0.7, 1.3))
        except asyncio.CancelledError:
            raise


simulator = Simulator()
