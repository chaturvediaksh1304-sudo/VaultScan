#!/usr/bin/env bash
# One-command local dev: trains the model (if needed), starts the FastAPI
# backend and the Vite frontend. Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")"

# --- Python env ---
if [ ! -d .venv ]; then
  echo "[setup] creating venv + installing backend deps..."
  python3 -m venv .venv
  ./.venv/bin/pip install -q --upgrade pip
  ./.venv/bin/pip install -q -r backend/requirements.txt
fi

# --- Train model if artifacts are missing ---
if [ ! -f ml/model.joblib ]; then
  echo "[setup] training model (synthetic dataset)..."
  ./.venv/bin/python -m ml.train
fi

# --- Frontend deps ---
if [ ! -d frontend/node_modules ]; then
  echo "[setup] installing frontend deps..."
  (cd frontend && npm install)
fi

cleanup() { echo; echo "[stop] shutting down..."; kill 0; }
trap cleanup EXIT INT TERM

echo "[run] backend  -> http://localhost:8000"
REPLAY_SPEED_TPS="${REPLAY_SPEED_TPS:-10}" \
  ./.venv/bin/python -m uvicorn backend.main:app --port 8000 &

echo "[run] frontend -> http://localhost:5173"
(cd frontend && npm run dev) &

wait
