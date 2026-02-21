"""Polls Data API for trades on tracked markets and ingests them."""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.engine import async_session
from app.db.models import TrackedMarket, Trade
from app.services.polymarket import data_api_get
from app.services.scoring import upsert_wallet

logger = logging.getLogger(__name__)

INTERVAL = 30  # seconds between full poll cycles
BATCH_SIZE = 20  # trades per market per poll
MAX_MARKETS_PER_CYCLE = 100  # cap to avoid rate limits
REQUEST_DELAY = 0.15  # 150ms between requests (~6.6 req/s, well under 20 req/s limit)


async def poll_trades() -> int:
    """Poll trades for tracked markets. Returns count of new trades inserted."""
    async with async_session() as session:
        # Fetch active markets, ordered by most recently updated so we prioritize fresh ones
        result = await session.execute(
            select(TrackedMarket.condition_id)
            .where(TrackedMarket.active.is_(True))
            .order_by(TrackedMarket.updated_at.desc())
            .limit(MAX_MARKETS_PER_CYCLE)
        )
        market_ids = [row[0] for row in result.all()]

    if not market_ids:
        return 0

    total_new = 0

    for condition_id in market_ids:
        try:
            data = await data_api_get(
                "/trades", params={"market": condition_id, "limit": BATCH_SIZE}
            )
        except Exception:
            logger.debug("failed to fetch trades for %s", condition_id)
            # Back off a bit more on failures (likely rate-limited)
            await asyncio.sleep(1.0)
            continue

        # Rate-limit delay between successful requests
        await asyncio.sleep(REQUEST_DELAY)

        raw_trades = data if isinstance(data, list) else []
        if not raw_trades:
            continue

        trades_to_insert = []
        for t in raw_trades:
            tx_hash = t.get("transactionHash", "")
            asset_id = t.get("asset", "")
            if not tx_hash or not asset_id:
                continue

            wallet = t.get("proxyWallet", "")
            size = float(t.get("size", 0))
            price = float(t.get("price", 0))

            trades_to_insert.append(
                {
                    "transaction_hash": tx_hash,
                    "asset_id": asset_id,
                    "condition_id": condition_id,
                    "wallet": wallet,
                    "side": t.get("side", ""),
                    "size": size,
                    "price": price,
                    "outcome": t.get("outcome", ""),
                    "title": t.get("title", ""),
                    "timestamp": int(t.get("timestamp", 0)),
                }
            )

        if not trades_to_insert:
            continue

        async with async_session() as session:
            stmt = pg_insert(Trade).values(trades_to_insert)
            stmt = stmt.on_conflict_do_nothing(
                constraint="uq_trade_tx_asset",
            )
            result = await session.execute(stmt)
            inserted = result.rowcount or 0  # type: ignore[union-attr]
            total_new += inserted

            # Upsert wallets for new trades
            if inserted > 0:
                seen_wallets: dict[str, float] = {}
                for t in trades_to_insert:
                    w = t["wallet"]
                    seen_wallets[w] = seen_wallets.get(w, 0) + t["size"] * t["price"]
                for addr, vol in seen_wallets.items():
                    await upsert_wallet(session, addr, vol)

            await session.commit()

    return total_new


async def run_forever() -> None:
    """Run trade polling on a loop."""
    while True:
        try:
            count = await poll_trades()
            if count > 0:
                logger.info("trade_poller ingested %d new trades", count)
        except Exception:
            logger.exception("trade_poller error")
        await asyncio.sleep(INTERVAL)
