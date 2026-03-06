"""Redis sliding-window rate limiter middleware."""

import logging
import time

from fastapi import Request, Response
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings

logger = logging.getLogger(__name__)


def _extract_user_id(request: Request) -> str | None:
    """Try to extract user_id from Bearer token without hitting the DB."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from app.core.auth import decode_access_token

        payload = decode_access_token(auth[7:])
        return payload.get("sub")
    except (JWTError, Exception):
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            return await call_next(request)

        now = int(time.time())
        window_key_suffix = str(now // 60)  # 1-minute window

        # Global rate limit
        global_key = f"ratelimit:global:{window_key_suffix}"
        try:
            global_count = await redis.incr(global_key)
            if global_count == 1:
                await redis.expire(global_key, 120)
            if global_count > settings.RATE_LIMIT_GLOBAL:
                return Response(
                    content='{"detail":"rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
        except Exception:
            logger.debug("redis rate limit check failed, allowing request")

        # Per-user (or per-IP) rate limit
        user_id = _extract_user_id(request)
        identity = user_id or (request.client.host if request.client else "unknown")
        user_key = f"ratelimit:user:{identity}:{window_key_suffix}"
        try:
            user_count = await redis.incr(user_key)
            if user_count == 1:
                await redis.expire(user_key, 120)
            if user_count > settings.RATE_LIMIT_PER_USER:
                return Response(
                    content='{"detail":"rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
        except Exception:
            logger.debug("redis rate limit check failed, allowing request")

        return await call_next(request)
