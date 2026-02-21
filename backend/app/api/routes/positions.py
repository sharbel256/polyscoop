"""Polymarket positions endpoint – proxies the Data API."""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.polymarket import PositionSummary

router = APIRouter(prefix="/positions", tags=["positions"])
logger = logging.getLogger(__name__)

DATA_API_URL = settings.POLYMARKET_DATA_API_URL

_SAFE_ADDR_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


@router.get("", response_model=list[PositionSummary])
async def list_positions(
    user: str = Query(pattern=r"^0x[a-fA-F0-9]{40}$"),
):
    """Fetch positions for a user (Safe wallet) from the Polymarket Data API."""
    if not _SAFE_ADDR_RE.fullmatch(user):
        raise HTTPException(status_code=400, detail="Invalid address format")

    params = {
        "user": user,
        "sizeThreshold": "0.01",
        "limit": "500",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{DATA_API_URL}/positions", params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("data_api_timeout GET /positions user=%s", user)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "data_api_http_error GET /positions status=%d body=%s",
            exc.response.status_code,
            exc.response.text[:500],
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("data_api_connection_error GET /positions error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    positions_raw = data if isinstance(data, list) else []
    positions = [PositionSummary(**p) for p in positions_raw]

    # Filter out resolved markets (redeemable or price settled to 0/1)
    active = [p for p in positions if not p.redeemable and p.curPrice not in (0.0, 1.0)]
    logger.debug(
        "list_positions returned %d positions (%d active) for %s",
        len(positions),
        len(active),
        user,
    )

    return active
