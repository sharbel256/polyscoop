"""Discovers active markets from Gamma API and inserts into tracked_markets.

If MENTIONS_TAG_SLUG is set, only fetches markets with that tag slug.
Otherwise, fetches top active events by volume.
"""

import asyncio
import json
import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.db.engine import async_session
from app.db.models import TrackedMarket
from app.services.polymarket import gamma_get

logger = logging.getLogger(__name__)

INTERVAL = 600  # 10 minutes
MAX_EVENTS = 50  # how many top events to track


async def discover_markets() -> int:
    """Fetch active events and upsert their markets. Returns count of markets upserted."""
    params: dict = {
        "limit": MAX_EVENTS,
        "active": "true",
        "closed": "false",
        "order": "volume",
        "ascending": "false",
    }

    # If a specific tag slug is configured, filter by it
    if settings.MENTIONS_TAG_SLUG:
        params["tag_slug"] = settings.MENTIONS_TAG_SLUG

    try:
        data = await gamma_get("/events", params=params)
    except Exception:
        logger.exception("failed to fetch events from gamma")
        return 0

    events = data if isinstance(data, list) else []
    if not events:
        logger.warning("market_discovery: gamma returned 0 events")
        return 0

    markets_to_upsert = []

    for event in events:
        event_id = str(event.get("id", ""))
        category = "mentions" if settings.MENTIONS_TAG_SLUG else ""
        event_tags = event.get("tags", [])
        if not category and event_tags and isinstance(event_tags, list):
            slugs = [t.get("slug", "") for t in event_tags if isinstance(t, dict)]
            category = slugs[0] if slugs else ""

        for m in event.get("markets", []):
            condition_id = m.get("conditionId", "")
            if not condition_id:
                continue

            # Only track active markets
            if not m.get("active", True) or m.get("closed", False):
                continue

            # Extract token IDs
            token_ids = []
            raw_tokens = m.get("tokens", [])
            if raw_tokens and isinstance(raw_tokens, list):
                for t in raw_tokens:
                    if isinstance(t, dict) and t.get("token_id"):
                        token_ids.append(t["token_id"])
            if not token_ids:
                try:
                    token_ids = json.loads(m.get("clobTokenIds", "[]"))
                except (json.JSONDecodeError, TypeError):
                    pass

            if not token_ids:
                continue

            markets_to_upsert.append(
                {
                    "condition_id": condition_id,
                    "question": m.get("question", ""),
                    "category": category,
                    "image": m.get("image", ""),
                    "token_ids": [str(t) for t in token_ids],
                    "active": True,
                    "event_id": event_id,
                }
            )

    if not markets_to_upsert:
        logger.info("market_discovery: no markets extracted from %d events", len(events))
        return 0

    async with async_session() as session:
        stmt = pg_insert(TrackedMarket).values(markets_to_upsert)
        stmt = stmt.on_conflict_do_update(
            index_elements=["condition_id"],
            set_={
                "question": stmt.excluded.question,
                "active": stmt.excluded.active,
                "token_ids": stmt.excluded.token_ids,
                "category": stmt.excluded.category,
            },
        )
        await session.execute(stmt)
        await session.commit()

    logger.info(
        "market_discovery: upserted %d markets from %d events",
        len(markets_to_upsert),
        len(events),
    )
    return len(markets_to_upsert)


async def run_forever() -> None:
    """Run market discovery on a loop."""
    # Run immediately on first tick (don't wait 10 min)
    while True:
        try:
            count = await discover_markets()
            logger.info("market_discovery tick: %d markets", count)
        except Exception:
            logger.exception("market_discovery error")
        await asyncio.sleep(INTERVAL)
