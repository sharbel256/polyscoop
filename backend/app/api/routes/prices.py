"""Polymarket price history endpoint – proxies the CLOB prices-history API."""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.polymarket import PriceHistoryResponse, PricePoint

router = APIRouter(prefix="/prices", tags=["prices"])
logger = logging.getLogger(__name__)

CLOB_URL = settings.POLYMARKET_CLOB_URL

_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


@router.get("/history", response_model=PriceHistoryResponse)
async def get_price_history(
    market: str = Query(pattern=r"^[a-zA-Z0-9_\-]{1,128}$"),
    interval: str = Query(default="1h", pattern=r"^(1m|5m|15m|1h|4h|1d|1w)$"),
    fidelity: int = Query(default=100, ge=1, le=1000),
):
    """Fetch price history for a market from the CLOB."""
    if not _SAFE_ID_RE.fullmatch(market):
        raise HTTPException(status_code=400, detail="Invalid market ID format")

    params = {"market": market, "interval": interval, "fidelity": fidelity}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{CLOB_URL}/prices-history", params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("clob_timeout GET /prices-history market=%s", market)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "clob_http_error GET /prices-history market=%s status=%d",
            market,
            exc.response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("clob_connection_error GET /prices-history error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    raw_history = data if isinstance(data, list) else data.get("history", [])

    history = []
    for point in raw_history:
        history.append(
            PricePoint(
                t=int(point.get("t", 0)),
                p=float(point.get("p", 0)),
            )
        )

    return PriceHistoryResponse(history=history)
