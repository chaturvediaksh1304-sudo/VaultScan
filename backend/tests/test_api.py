"""API tests for the VaultScan backend.

Run:  pytest backend/tests -q     (from repo root, model artifacts must exist)
"""
from __future__ import annotations

import csv
import os

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from ml.dataset import V_COLS

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "data", "replay_sample.csv")


@pytest.fixture(scope="module")
def client():
    # Context-manager form runs the lifespan (loads model, starts simulator).
    with TestClient(app) as c:
        yield c


def _sample_payload(want_fraud: bool) -> dict:
    with open(SAMPLE, newline="") as fh:
        for r in csv.DictReader(fh):
            if (r["Class"] == "1") == want_fraud:
                return {
                    "transaction_id": "txn_test",
                    "amount": float(r["Amount"]),
                    "time": float(r["Time"]),
                    "features": [float(r[c]) for c in V_COLS],
                }
    raise AssertionError("no matching sample row")


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["flag_threshold"] >= 0


def test_score_returns_valid_shape(client):
    r = client.post("/score", json=_sample_payload(want_fraud=False))
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["risk_score"] <= 100
    assert isinstance(body["flagged"], bool)
    assert body["is_replay"] is False
    assert body["latency_ms"] >= 0


def test_score_rejects_wrong_feature_count(client):
    bad = _sample_payload(want_fraud=False)
    bad["features"] = bad["features"][:10]  # only 10 of 28
    r = client.post("/score", json=bad)
    assert r.status_code == 422  # pydantic validation error


def test_score_rejects_negative_amount(client):
    bad = _sample_payload(want_fraud=False)
    bad["amount"] = -5.0
    r = client.post("/score", json=bad)
    assert r.status_code == 422


def test_flagged_transaction_has_risk_flags(client):
    """At least one high-anomaly fraud row should flag with explanations."""
    flagged = None
    with open(SAMPLE, newline="") as fh:
        for row in csv.DictReader(fh):
            if row["Class"] != "1":
                continue
            payload = {
                "transaction_id": "txn_fraud",
                "amount": float(row["Amount"]),
                "time": float(row["Time"]),
                "features": [float(row[c]) for c in V_COLS],
            }
            body = client.post("/score", json=payload).json()
            if body["flagged"]:
                flagged = body
                break
    assert flagged is not None, "expected at least one flagged fraud row"
    assert len(flagged["risk_flags"]) >= 1
    assert all({"feature", "direction", "label"} <= set(f) for f in flagged["risk_flags"])


def test_stats_and_meta(client):
    s = client.get("/stats").json()
    assert set(s) == {"total_processed", "fraud_rate_pct", "avg_latency_ms", "flagged_last_minute"}
    m = client.get("/meta").json()
    assert m["model"] == "IsolationForest"
    assert "roc_auc" in m["metrics"]
