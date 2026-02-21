"""Periodically recomputes wallet rankings from the trades table."""

import asyncio
import logging

from app.db.engine import async_session
from app.services.scoring import compute_scores

logger = logging.getLogger(__name__)

INTERVAL = 300  # 5 minutes


async def run_forever() -> None:
    """Run wallet scoring on a loop."""
    # Wait a bit on startup for initial trades to be ingested
    await asyncio.sleep(30)

    while True:
        try:
            async with async_session() as session:
                count = await compute_scores(session)
                logger.debug("wallet_scorer computed %d scores", count)
        except Exception:
            logger.exception("wallet_scorer error")
        await asyncio.sleep(INTERVAL)
