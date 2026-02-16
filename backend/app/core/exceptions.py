"""Centralised exception handlers for the FastAPI application."""

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

from app.core.logging import correlation_id_ctx

logger = logging.getLogger(__name__)


def _error_body(
    status: int, detail: str | Sequence[Any], *, error_type: str = "error"
) -> dict[str, Any]:
    """Standard JSON error envelope."""
    return {
        "error": {
            "type": error_type,
            "status": status,
            "detail": detail,
            "agi_correlation_id": correlation_id_ctx.get("-"),
        }
    }


async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Handle explicitly raised HTTPException (4xx / 5xx)."""
    if exc.status_code >= 500:
        logger.error("http_error status=%d detail=%s", exc.status_code, exc.detail)
    else:
        logger.warning("http_error status=%d detail=%s", exc.status_code, exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.status_code, exc.detail, error_type="http_error"),
    )


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic / query-param validation failures (422)."""
    errors = exc.errors()
    logger.warning("validation_error errors=%s", errors)
    return JSONResponse(
        status_code=422,
        content=_error_body(422, errors, error_type="validation_error"),
    )


async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions – log full traceback, return 500."""
    logger.exception("unhandled_exception %s: %s", type(exc).__name__, exc)
    return JSONResponse(
        status_code=500,
        content=_error_body(500, "Internal server error", error_type="internal_error"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all exception handlers to the app."""
    app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]
