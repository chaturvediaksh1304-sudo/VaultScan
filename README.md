# VaultScan

**Every transaction. Scored. Instantly.**

Real-time transaction fraud detection with a cinematic dark dashboard. Synthetic
(or real Kaggle) transactions stream through an unsupervised ML scorer and surface
on a live WebSocket dashboard — flagged anomalies appear with feature-level risk
explanations in milliseconds.

> Portfolio + live-demo project. Built to look impressive in a 60-second
> recruiter walkthrough *and* hold up to technical scrutiny in an interview.

---

## What it does

- **Scores every transaction** with an Isolation Forest anomaly detector — no
  labeled fraud needed at training time, mirroring real production constraints.
- **Explains each flag** with the top contributing features (e.g. *Unusual
  transaction amount*, *Anomalous account signal*), so an alert is never a black box.
- **Streams live** over a WebSocket — the dashboard's feed, stat counters, risk
  gauge, and alerts panel all update in real time as transactions are scored.
- **Runs out of the box** — no dataset download, no Kafka cluster, no database.
  One command brings up the whole stack.

## Architecture

```
                  ┌─────────────────── backend (FastAPI) ───────────────────┐
  ml/train.py     │                                                          │
  IsolationForest │   simulator ──► model_service.score() ──► buffer (mem)   │
   + scaler  ─────┼─►  (replays      (risk 0-100, flags)        │            │
   + metadata     │    sample @           │                     ▼            │
                  │    10 txn/s)          └──────────►  StreamHub.broadcast   │
                  └────────────────────────────────────────────┬────────────┘
                                                                │ WebSocket
                                            REST /score /stats   │ /ws/stream
                                                                ▼
                                           frontend (React + Vite + Framer Motion)
                                     Hero · StatsBar · Live Feed · Risk Gauge · Alerts
```

**Simplified for the demo:** the in-process `simulator` + in-memory `buffer`
stand in for the spec's Kafka → consumer → Redis/Postgres pipeline. Each lives
behind a small interface (`StreamHub`, `TransactionBuffer`) so a real Kafka
consumer or Redis backend can be swapped in without touching callers.

## Tech stack

| Layer | Tech |
|---|---|
| ML | scikit-learn Isolation Forest, calibrated decision threshold, SHAP (offline) |
| Backend | FastAPI, Pydantic v2, WebSockets, Uvicorn |
| Frontend | React 18, Vite, TypeScript, Tailwind, Framer Motion |
| Deploy | Docker · Render (backend) · Vercel (frontend) |

## Quick start

```bash
./run.sh
# backend  -> http://localhost:8000   (FastAPI, live stream)
# frontend -> http://localhost:5173   (dashboard)
```

That's it — `run.sh` creates the Python venv, trains the model on a synthetic
dataset, installs frontend deps, and starts both servers.

<details>
<summary>Manual steps</summary>

```bash
# 1. ML — train the model (writes model.joblib, scaler.joblib, metadata.json)
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m ml.train
python -m ml.evaluate          # precision / recall / ROC-AUC / confusion matrix

# 2. Backend
uvicorn backend.main:app --port 8000

# 3. Frontend
cd frontend && npm install && npm run dev
```
</details>

### Use the real Kaggle dataset

Drop [`creditcard.csv`](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
into `ml/data/` and re-run `python -m ml.train` — the pipeline auto-detects it.
Otherwise a synthetic dataset with the identical schema (Time, V1–V28, Amount,
Class) is generated so everything runs with zero setup.

## The model

Isolation Forest (`n_estimators=200`, `contamination=0.002`), scaling Time +
Amount (V1–V28 are already PCA components). Anomaly scores are normalized to a
0–100 risk score; the flag threshold is **calibrated during training to hold a
≥0.85 precision floor** (max recall at that precision). Evaluation metrics are
written to `ml/metadata.json` and surfaced at `GET /meta`.

**Why unsupervised?** Real fraud systems rarely have clean labels at training
time — anomaly detection matches that constraint. Labels here are used *only*
post-hoc for evaluation, never for training.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/score` | Score one transaction → risk score, flag, risk flags, latency |
| `WS` | `/ws/stream` | Live feed of scored transactions (warm-starts with recent history) |
| `GET` | `/stats` | Aggregate stats (total processed, fraud rate, avg latency, flagged/60s) |
| `GET` | `/health` | Liveness + readiness |
| `GET` | `/meta` | Model card (source, threshold, eval metrics) |

## Tests

```bash
pytest backend/tests -q     # API: scoring, validation, risk flags, stats
```

## Deploy

- **Backend** → Render (one-click via `render.yaml`) or any Docker host:
  `docker build -f backend/Dockerfile -t vaultscan-backend .`
- **Frontend** → Vercel. Set `VITE_API_URL` / `VITE_WS_URL` to the backend URL.
- **Both locally** → `docker compose up --build`.

## What I'd do next

- Swap the in-process simulator for a real Kafka consumer (Confluent free tier) —
  the `StreamHub` interface already isolates the broadcast leg.
- Persist a full audit log to Postgres and back the recent-buffer with Redis.
- Online learning to handle model drift; partition Kafka to scale past 10k TPS.

---

Built by Aksh Chaturvedi.
