"""Request middleware – correlation ID propagation and request/response logging."""

import logging
import re
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import correlation_id_ctx

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"
RESPONSE_TIME_HEADER = "X-Response-Time"

# Only allow alphanumeric, hyphens, underscores; max 64 chars.
_CID_RE = re.compile(r"^[a-zA-Z0-9\-_]{1,64}$")


def _safe_correlation_id(raw: str | None) -> str:
    """Return the header value if it matches the safe pattern, else a new UUID."""
    if raw and _CID_RE.fullmatch(raw):
        return raw
    return uuid.uuid4().hex


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Generates (or propagates) a ``request_id`` for every request.

    * Reads from the incoming ``X-Request-ID`` header if present.
    * Validates it against a strict pattern (alphanumeric, hyphens, max 64).
    * Otherwise generates a new UUID-4.
    * Stores the value in a contextvar so log records can include it.
    * Sets ``X-Request-ID`` and ``X-Response-Time`` on the response.
    * Logs request start / finish with status code and duration.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        cid = _safe_correlation_id(request.headers.get(REQUEST_ID_HEADER))
        correlation_id_ctx.set(cid)

        method = request.method
        path = request.url.path

        logger.info("request_started  %s %s", method, path)
        start = time.perf_counter()

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "request_finished %s %s status=%d duration=%.1fms",
            method,
            path,
            response.status_code,
            elapsed_ms,
        )

        response.headers[REQUEST_ID_HEADER] = cid
        response.headers[RESPONSE_TIME_HEADER] = f"{elapsed_ms:.1f}ms"
        return response
