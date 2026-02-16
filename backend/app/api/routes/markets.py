"""Polymarket market data endpoints – proxies Gamma + CLOB APIs."""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Path, Query

from app.core.config import settings
from app.schemas.polymarket import MarketsResponse, MarketSummary, OrderbookSummary

router = APIRouter(prefix="/markets", tags=["markets"])
logger = logging.getLogger(__name__)

GAMMA_URL = settings.POLYMARKET_GAMMA_URL
CLOB_URL = settings.POLYMARKET_CLOB_URL

# Polymarket IDs are hex strings (condition IDs: 64-char, token IDs: up to 78-char).
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


def _parse_gamma_market(raw: dict) -> MarketSummary:
    """Convert a Gamma API market object into our schema."""
    tokens = []
    for t in raw.get("tokens", []) or raw.get("clobTokenIds", "").split(","):
        if isinstance(t, dict):
            tokens.append(
                {
                    "token_id": t.get("token_id", ""),
                    "outcome": t.get("outcome", ""),
                    "price": float(t["price"]) if t.get("price") else None,
                    "winner": t.get("winner"),
                }
            )

    return MarketSummary(
        condition_id=raw.get("conditionId", raw.get("condition_id", "")),
        question=raw.get("question", ""),
        slug=raw.get("slug", ""),
        description=raw.get("description", ""),
        category=raw.get("category", ""),
        image=raw.get("image", ""),
        end_date=raw.get("endDate", raw.get("end_date_iso", "")),
        active=raw.get("active", True),
        closed=raw.get("closed", False),
        volume=float(raw.get("volume", 0) or 0),
        liquidity=float(raw.get("liquidity", 0) or 0),
        tokens=tokens,
    )


@router.get("", response_model=MarketsResponse)
async def list_markets(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    active: bool = Query(default=True),
    closed: bool = Query(default=False),
    order: str = Query(
        default="volume",
        pattern=r"^(volume|liquidity|end_date)$",
        description="Sort field: volume, liquidity, end_date",
    ),
    ascending: bool = Query(default=False),
):
    """Fetch markets from the Polymarket Gamma API."""
    params = {
        "limit": limit,
        "offset": offset,
        "active": str(active).lower(),
        "closed": str(closed).lower(),
        "order": order,
        "ascending": str(ascending).lower(),
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{GAMMA_URL}/markets", params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("gamma_timeout GET /markets params=%s", params)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "gamma_http_error GET /markets status=%d body=%s",
            exc.response.status_code,
            exc.response.text[:500],
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("gamma_connection_error GET /markets error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    markets_raw = data if isinstance(data, list) else data.get("data", data.get("markets", []))
    markets = [_parse_gamma_market(m) for m in markets_raw]
    logger.debug("list_markets returned %d markets", len(markets))

    return MarketsResponse(
        markets=markets,
        count=len(markets),
        next_cursor=str(offset + limit) if len(markets) == limit else None,
    )


@router.get("/{condition_id}", response_model=MarketSummary)
async def get_market(
    condition_id: str = Path(pattern=r"^[a-zA-Z0-9_\-]{1,128}$"),
):
    """Fetch a single market by condition ID."""
    if not _SAFE_ID_RE.fullmatch(condition_id):
        raise HTTPException(status_code=400, detail="Invalid condition_id format")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{GAMMA_URL}/markets/{condition_id}")
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("gamma_timeout GET /markets/%s", condition_id)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Market not found")
        logger.error(
            "gamma_http_error GET /markets/%s status=%d",
            condition_id,
            exc.response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("gamma_connection_error GET /markets/%s error=%s", condition_id, exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    return _parse_gamma_market(data)


@router.get("/{token_id}/orderbook", response_model=OrderbookSummary)
async def get_orderbook(
    token_id: str = Path(pattern=r"^[a-zA-Z0-9_\-]{1,128}$"),
):
    """Fetch orderbook for a specific outcome token from the CLOB."""
    if not _SAFE_ID_RE.fullmatch(token_id):
        raise HTTPException(status_code=400, detail="Invalid token_id format")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{CLOB_URL}/book", params={"token_id": token_id})
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("clob_timeout GET /book token_id=%s", token_id)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Orderbook not found")
        logger.error(
            "clob_http_error GET /book token_id=%s status=%d",
            token_id,
            exc.response.status_code,
        )
        raise HTTPException(
            status_code=502,
            detail="Upstream service error",
        )
    except httpx.HTTPError as exc:
        logger.error("clob_connection_error GET /book token_id=%s error=%s", token_id, exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    bids = data.get("bids", [])
    asks = data.get("asks", [])

    best_bid = float(bids[0]["price"]) if bids else None
    best_ask = float(asks[0]["price"]) if asks else None
    mid = (best_bid + best_ask) / 2 if best_bid and best_ask else None
    spread = best_ask - best_bid if best_bid and best_ask else None

    return OrderbookSummary(
        token_id=token_id,
        bids=bids,
        asks=asks,
        spread=spread,
        mid_price=mid,
    )
