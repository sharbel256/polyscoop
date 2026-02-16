"""Authentication dependencies for protected endpoints."""

import hmac
import logging

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.core.config import settings

logger = logging.getLogger(__name__)

_api_key_header = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)


async def require_internal_api_key(
    api_key: str | None = Security(_api_key_header),
) -> str:
    """Verify the caller provided a valid internal API key.

    Raises 401 if missing, 403 if invalid.
    """
    if not settings.INTERNAL_API_KEY:
        logger.error("INTERNAL_API_KEY not configured – refusing all requests")
        raise HTTPException(status_code=503, detail="Service not configured")

    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    if not hmac.compare_digest(api_key, settings.INTERNAL_API_KEY):
        logger.warning("invalid_api_key")
        raise HTTPException(status_code=403, detail="Invalid API key")

    return api_key
