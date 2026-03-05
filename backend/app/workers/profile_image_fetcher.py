"""Periodically fetches Polymarket profile images and display names."""

import asyncio
import logging

from app.db.engine import async_session
from app.services.profile_fetcher import fetch_missing_profiles

logger = logging.getLogger(__name__)

INTERVAL = 900  # 15 minutes


async def run_forever() -> None:
    """Run profile image fetching on a loop."""
    await asyncio.sleep(120)

    while True:
        try:
            async with async_session() as session:
                count = await fetch_missing_profiles(session)
                if count:
                    logger.info("profile_image_fetcher fetched %d profiles", count)
        except Exception:
            logger.exception("profile_image_fetcher error")
        await asyncio.sleep(INTERVAL)
