"""WebSocket live feed — pushes trades to connected clients via Redis pub/sub."""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["live"])
logger = logging.getLogger(__name__)

# In-memory set of connected clients
_clients: set[WebSocket] = set()


async def broadcast_trade(trade_data: dict) -> None:
    """Broadcast a trade to all connected WebSocket clients."""
    global _clients
    message = json.dumps({"type": "trade", "data": trade_data})
    disconnected = set()
    for ws in _clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    _clients -= disconnected


async def broadcast_copytrade_signal(signal_data: dict, target_user: str) -> None:
    """Send a copy-trade signal to a specific user's WebSocket connections."""
    global _clients
    message = json.dumps({"type": "copytrade_signal", "data": signal_data})
    disconnected = set()
    for ws in _clients:
        try:
            # Check if this client subscribed to this wallet
            subs = getattr(ws, "_subscriptions", set())
            if f"wallet:{target_user}" in subs or "trades:mentions" in subs:
                await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    _clients -= disconnected


@router.websocket("/ws/feed")
async def ws_feed(websocket: WebSocket):
    """WebSocket endpoint for live trade feed.

    Client subscribes: {"type": "subscribe", "channels": ["trades:mentions", "wallet:<addr>"]}
    Server pushes: {"type": "trade", "data": {...}}
    """
    await websocket.accept()
    _clients.add(websocket)
    websocket._subscriptions = {"trades:mentions"}  # type: ignore[attr-defined]
    logger.info("ws client connected, total=%d", len(_clients))

    pubsub = None
    pubsub_task = None
    try:
        # Also start Redis pub/sub listener if Redis is available
        redis = websocket.app.state.redis

        if redis:
            pubsub = redis.pubsub()
            await pubsub.subscribe("trades:live")

            async def redis_listener():
                try:
                    async for msg in pubsub.listen():
                        if msg["type"] == "message":
                            await websocket.send_text(msg["data"])
                except Exception:
                    pass

            pubsub_task = asyncio.create_task(redis_listener())

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "subscribe":
                    channels = msg.get("channels", [])
                    websocket._subscriptions = set(channels)  # type: ignore[attr-defined]
                    await websocket.send_text(
                        json.dumps({"type": "subscribed", "channels": channels})
                    )
                elif msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
        if pubsub_task:
            pubsub_task.cancel()
        if pubsub:
            await pubsub.unsubscribe("trades:live")
            await pubsub.aclose()
        logger.info("ws client disconnected, total=%d", len(_clients))
