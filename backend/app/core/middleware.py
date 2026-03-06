"""Request middleware – correlation ID propagation and request/response logging."""

import logging
import re
import time
import uuid

from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

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


class CorrelationIdMiddleware:
    """
    Pure ASGI middleware for correlation ID propagation and request logging.

    Uses raw ASGI instead of BaseHTTPMiddleware so that contextvar changes
    propagate correctly to exception handlers and all inner code.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Extract correlation ID from incoming headers
        headers = dict(scope.get("headers", []))
        raw_cid = headers.get(b"x-request-id", b"").decode() or None
        cid = _safe_correlation_id(raw_cid)
        correlation_id_ctx.set(cid)

        request = Request(scope)
        method = request.method
        path = request.url.path

        logger.info("request_started  %s %s", method, path)
        start = time.perf_counter()

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                elapsed_ms = (time.perf_counter() - start) * 1000
                logger.info(
                    "request_finished %s %s status=%d duration=%.1fms",
                    method,
                    path,
                    message["status"],
                    elapsed_ms,
                )
                # Inject response headers
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", cid.encode()))
                headers.append((b"x-response-time", f"{elapsed_ms:.1f}ms".encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
