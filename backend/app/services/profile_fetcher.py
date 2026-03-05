"""Batch-fetch Polymarket public profiles for wallets missing avatar data."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Wallet
from app.services.polymarket import fetch_polymarket_profile

logger = logging.getLogger(__name__)

_STALE_AFTER = timedelta(days=7)
_BATCH_SIZE = 50


async def fetch_missing_profiles(session: AsyncSession) -> int:
    """Fetch profiles for wallets that haven't been checked recently.

    Returns the number of wallets processed.
    """
    cutoff = datetime.now(UTC).replace(tzinfo=None) - _STALE_AFTER

    q = (
        select(Wallet)
        .where(
            or_(
                Wallet.profile_fetched_at.is_(None),
                Wallet.profile_fetched_at < cutoff,
            )
        )
        .order_by(Wallet.total_volume.desc())
        .limit(_BATCH_SIZE)
    )
    result = await session.execute(q)
    wallets = result.scalars().all()

    if not wallets:
        return 0

    count = 0
    for wallet in wallets:
        profile = await fetch_polymarket_profile(wallet.address)
        if profile:
            wallet.profile_image_url = profile["profile_image_url"]
            wallet.display_name = profile["display_name"]
        wallet.profile_fetched_at = datetime.now(UTC).replace(tzinfo=None)
        count += 1

    await session.commit()
    return count
