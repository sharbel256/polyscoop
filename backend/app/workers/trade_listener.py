"""CLOB WebSocket trade listener — connects to Polymarket WS and ingests live trades."""

import asyncio
import json
import logging

import websockets
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.engine import async_session
from app.db.models import TrackedMarket, Trade
from app.services.scoring import upsert_wallet

logger = logging.getLogger(__name__)

WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
PING_INTERVAL = 10
RECONNECT_BASE = 1
RECONNECT_MAX = 60

# Reference to app.state.redis, set by manager
_redis = None


def set_redis(redis):
    global _redis
    _redis = redis


async def _get_asset_ids() -> list[str]:
    """Get all asset IDs from tracked markets."""
    async with async_session() as session:
        result = await session.execute(
            select(TrackedMarket.token_ids).where(TrackedMarket.active.is_(True))
        )
        rows = result.all()
    asset_ids = []
    for row in rows:
        if row[0]:
            asset_ids.extend(row[0])
    return asset_ids


async def _ingest_trade(trade_data: dict) -> None:
    """Process a trade message from the CLOB WebSocket."""
    tx_hash = trade_data.get("id", "")
    asset_id = trade_data.get("asset_id", "")
    if not tx_hash or not asset_id:
        return

    wallet = trade_data.get("maker_address", "") or trade_data.get("owner", "")
    size = float(trade_data.get("size", 0))
    price = float(trade_data.get("price", 0))
    side = trade_data.get("side", "")
    timestamp = int(trade_data.get("timestamp", 0))

    trade_row = {
        "transaction_hash": tx_hash,
        "asset_id": asset_id,
        "condition_id": trade_data.get("market", ""),
        "wallet": wallet,
        "side": side,
        "size": size,
        "price": price,
        "outcome": trade_data.get("outcome", ""),
        "title": "",
        "timestamp": timestamp,
    }

    async with async_session() as session:
        stmt = pg_insert(Trade).values(trade_row)
        stmt = stmt.on_conflict_do_nothing(constraint="uq_trade_tx_asset")
        result = await session.execute(stmt)
        if result.rowcount:  # type: ignore[union-attr]
            await upsert_wallet(session, wallet, size * price)
        await session.commit()

    # Publish to Redis for WebSocket broadcast
    if _redis:
        try:
            broadcast = json.dumps({"type": "trade", "data": trade_row})
            await _redis.publish("trades:live", broadcast)
        except Exception:
            logger.debug("redis publish failed")


async def run_forever() -> None:
    """Connect to CLOB WebSocket and listen for trades with auto-reconnect."""
    backoff = RECONNECT_BASE

    while True:
        asset_ids = await _get_asset_ids()
        if not asset_ids:
            logger.debug("trade_listener: no asset IDs to subscribe, waiting...")
            await asyncio.sleep(30)
            continue

        try:
            async with websockets.connect(WS_URL, ping_interval=PING_INTERVAL) as ws:
                # Subscribe to all tracked assets
                sub_msg = json.dumps(
                    {
                        "type": "market",
                        "assets_ids": asset_ids,  # Polymarket uses assets_ids (plural)
                    }
                )
                await ws.send(sub_msg)
                logger.info("trade_listener connected, subscribed to %d assets", len(asset_ids))
                backoff = RECONNECT_BASE

                async for message in ws:
                    try:
                        data = json.loads(message)
                        event_type = data.get("event_type", "")

                        if event_type == "last_trade_price":
                            # This event means a trade happened
                            for trade in data.get("data", [data]):
                                await _ingest_trade(trade)
                        elif event_type == "trade":
                            await _ingest_trade(data.get("data", data))
                    except json.JSONDecodeError:
                        pass
                    except Exception:
                        logger.exception("trade_listener message processing error")

        except Exception:
            logger.warning("trade_listener disconnected, reconnecting in %ds", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, RECONNECT_MAX)
