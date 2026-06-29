"""VaultScan FastAPI application.

Wires the model, the in-process simulator, the rolling buffer, and the
WebSocket hub together, and exposes the public API:

    POST /score        synchronous single-transaction scoring
    WS   /ws/stream     live scored-transaction feed
    GET  /stats         aggregate dashboard stats
    GET  /health        liveness + readiness
    GET  /meta          model card (source, threshold, eval metrics)
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import score, stream
from backend.schemas.transaction import Health, Stats
from backend.services.buffer import buffer
from backend.services.model_service import model_service
from backend.services.simulator import simulator

CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_service.load()
    simulator.start()
    yield
    await simulator.stop()


app = FastAPI(title="VaultScan API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router)
app.include_router(stream.router)


@app.get("/stats", response_model=Stats)
def get_stats() -> Stats:
    return Stats(**buffer.stats())


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="ok" if model_service.loaded else "degraded",
        model_loaded=model_service.loaded,
        stream_running=simulator.running,
        source=model_service.source,
        flag_threshold=model_service.flag_threshold,
    )


@app.get("/meta")
def meta() -> dict:
    """Model card for the UI / About section."""
    return {
        "model": "IsolationForest",
        "source": model_service.source,
        "flag_threshold": model_service.flag_threshold,
        "metrics": model_service.metrics,
        "replay_tps": simulator.tps,
    }
