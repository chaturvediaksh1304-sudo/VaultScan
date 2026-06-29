"""WebSocket /ws/stream — real-time scored-transaction feed.

On connect we replay the current buffer (most recent first, oldest sent first
so the client ends up newest-on-top) then stream live transactions as the
simulator produces them.
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.buffer import buffer
from backend.services.stream_hub import hub

router = APIRouter()


@router.websocket("/ws/stream")
async def stream(ws: WebSocket) -> None:
    await hub.connect(ws)
    try:
        # Warm-start the client with recent history (oldest first).
        for txn in reversed(buffer.recent(50)):
            await ws.send_json(txn)
        # Then just hold the connection open; the hub pushes live updates.
        while True:
            # We don't expect inbound messages; this keeps the socket alive and
            # surfaces disconnects promptly.
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(ws)
