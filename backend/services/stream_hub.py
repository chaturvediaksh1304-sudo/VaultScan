"""Fan-out hub for the /ws/stream WebSocket broadcast.

Holds all connected dashboard clients and pushes each scored transaction to
every one of them. Replaces the "Kafka consumer -> WebSocket broadcast" leg of
the architecture with a direct in-process fan-out.
"""
from __future__ import annotations

import asyncio
from typing import Set

from fastapi import WebSocket


class StreamHub:
    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def broadcast(self, message: dict) -> None:
        if not self._clients:
            return
        async with self._lock:
            targets = list(self._clients)
        dead = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.discard(ws)


hub = StreamHub()
