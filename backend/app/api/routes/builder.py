"""Proxy for Polymarket builder attribution trades."""

import logging
import time

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.api.routes.signing import _build_hmac_signature
from app.core.config import settings
from app.schemas.polymarket import BuilderTrade, BuilderTradesResponse

router = APIRouter(prefix="/builder", tags=["builder"])
logger = logging.getLogger(__name__)


@router.get("/trades", response_model=BuilderTradesResponse)
async def get_builder_trades(
    before: str | None = Query(None),
    after: str | None = Query(None),
    next_cursor: str | None = Query(None),
):
    """Fetch trades attributed to polyscoop's builder key."""
    if not settings.POLYMARKET_BUILDER_API_KEY:
        raise HTTPException(status_code=503, detail="Builder credentials not configured")

    path = "/builder/trades"
    params: dict[str, str] = {}
    if before:
        params["before"] = before
    if after:
        params["after"] = after
    if next_cursor:
        params["next_cursor"] = next_cursor

    ts = int(time.time() * 1000)

    try:
        signature = _build_hmac_signature(
            secret=settings.POLYMARKET_BUILDER_SECRET,
            timestamp=ts,
            method="GET",
            path=path,
        )
    except Exception:
        logger.exception("builder_trades hmac computation error")
        raise HTTPException(status_code=500, detail="Signing computation failed")

    headers = {
        "POLY_BUILDER_SIGNATURE": signature,
        "POLY_BUILDER_TIMESTAMP": str(ts),
        "POLY_BUILDER_API_KEY": settings.POLYMARKET_BUILDER_API_KEY,
        "POLY_BUILDER_PASSPHRASE": settings.POLYMARKET_BUILDER_PASSPHRASE,
    }

    url = f"{settings.POLYMARKET_CLOB_URL}{path}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers, params=params)

    if resp.status_code != 200:
        logger.warning("builder_trades clob_status=%d body=%s", resp.status_code, resp.text[:200])
        raise HTTPException(status_code=resp.status_code, detail="CLOB request failed")

    data = resp.json()

    # The CLOB may return the trades directly as a list or as an object
    if isinstance(data, list):
        trades = [BuilderTrade(**t) for t in data]
        return BuilderTradesResponse(trades=trades, count=len(trades))

    trades = [BuilderTrade(**t) for t in data.get("data", data.get("trades", []))]
    return BuilderTradesResponse(
        trades=trades,
        count=data.get("count", len(trades)),
        next_cursor=data.get("next_cursor"),
    )
