"""Resy token lifecycle — ensure access tokens stay fresh."""

import logging
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.services import resy

logger = logging.getLogger(__name__)


class ResyTokenExpired(Exception):
    """Raised when the Resy access token cannot be refreshed."""


async def ensure_fresh_resy_token(user: User, session: AsyncSession) -> str:
    """Return a valid Resy JWT for *user*, refreshing if near-expiry.

    Persists new tokens to the database when a refresh occurs.
    Raises ``ResyTokenExpired`` if the token can't be refreshed.
    """
    if not user.resy_jwt:
        raise ResyTokenExpired("no resy access token")

    if not resy.is_token_expired(user.resy_jwt):
        return user.resy_jwt

    # Access token is expired or near-expiry — try refresh
    if not user.resy_refresh_token:
        raise ResyTokenExpired("access token expired and no refresh token stored")

    try:
        new_access, new_refresh = await resy.refresh_access_token(user.resy_refresh_token)
    except Exception as exc:
        logger.warning("resy token refresh failed for user %s: %s", user.id, exc)
        raise ResyTokenExpired("refresh failed") from exc

    user.resy_jwt = new_access
    if new_refresh:
        user.resy_refresh_token = new_refresh
    user.resy_token_updated_at = datetime.now(UTC).replace(tzinfo=None)
    await session.commit()

    logger.info("refreshed resy token for user %s", user.id)
    return new_access
