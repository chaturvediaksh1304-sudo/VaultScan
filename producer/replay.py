"""Standalone transaction producer (load-test / Kafka-substitute demo).

The live dashboard is driven by the backend's in-process simulator. This script
is the explicit "producer" component: it replays the stratified sample against
the running backend's POST /score endpoint, mirroring how a Kafka producer would
feed transactions into the pipeline. Useful for load-testing and for showing the
synchronous scoring API in isolation.

Usage:
    python -m producer.replay --url http://localhost:8000 --tps 10 --limit 100
"""
from __future__ import annotations

import argparse
import csv
import os
import time
from urllib import request, error

REPLAY_SAMPLE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "ml", "data", "replay_sample.csv"
)
V_COLS = [f"V{i}" for i in range(1, 29)]


def load_rows(path: str):
    with open(path, newline="") as fh:
        for i, r in enumerate(csv.DictReader(fh)):
            yield {
                "transaction_id": f"txn_replay_{i:06d}",
                "amount": float(r["Amount"]),
                "time": float(r["Time"]),
                "features": [float(r[c]) for c in V_COLS],
            }


def post_score(base_url: str, payload: dict) -> dict:
    import json
    data = json.dumps(payload).encode()
    req = request.Request(f"{base_url}/score", data=data,
                          headers={"Content-Type": "application/json"})
    with request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--tps", type=float, default=10.0)
    ap.add_argument("--limit", type=int, default=0, help="0 = all rows")
    args = ap.parse_args()

    delay = 1.0 / max(0.5, args.tps)
    sent = flagged = 0
    for row in load_rows(REPLAY_SAMPLE_PATH):
        if args.limit and sent >= args.limit:
            break
        try:
            result = post_score(args.url, row)
        except error.URLError as e:
            raise SystemExit(f"Could not reach backend at {args.url}: {e}")
        sent += 1
        if result["flagged"]:
            flagged += 1
            print(f"FLAGGED {result['transaction_id']} risk={result['risk_score']} "
                  f"${result['amount']:.2f} latency={result['latency_ms']}ms")
        time.sleep(delay)
    print(f"\nDone. Sent {sent} transactions, {flagged} flagged.")


if __name__ == "__main__":
    main()
