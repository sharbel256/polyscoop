"""Periodically recomputes trader profiles (bot detection + specialization)."""

import asyncio
import logging

from app.db.engine import async_session
from app.services.profile_scoring import compute_profiles

logger = logging.getLogger(__name__)

INTERVAL = 900  # 15 minutes


async def run_forever() -> None:
    """Run profile scoring on a loop."""
    # Wait for initial data accumulation
    await asyncio.sleep(60)

    while True:
        try:
            async with async_session() as session:
                count = await compute_profiles(session)
                logger.debug("profile_scorer computed %d profiles", count)
        except Exception:
            logger.exception("profile_scorer error")
        await asyncio.sleep(INTERVAL)
