"""Polymarket market data endpoints – proxies Gamma + CLOB APIs."""

import json
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Path, Query

from app.core.config import settings
from app.schemas.polymarket import (
    EventsResponse,
    EventSummary,
    MarketsResponse,
    MarketSummary,
    OrderbookAnalysis,
    Tag,
)

router = APIRouter(prefix="/markets", tags=["markets"])
logger = logging.getLogger(__name__)

GAMMA_URL = settings.POLYMARKET_GAMMA_URL
CLOB_URL = settings.POLYMARKET_CLOB_URL

# Polymarket IDs are hex strings (condition IDs: 64-char, token IDs: up to 78-char).
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


def _parse_json_string(val: str | None) -> list:
    """Parse a JSON-encoded string list, e.g. '["a","b"]' → ['a','b']."""
    if not val:
        return []
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return []


def _parse_gamma_market(raw: dict) -> MarketSummary:
    """Convert a Gamma API market object into our schema."""
    tokens = []

    # Gamma returns tokens as a list of dicts (single-market detail endpoint)
    # OR as separate JSON-string fields (list endpoint).
    raw_tokens = raw.get("tokens")
    if raw_tokens and isinstance(raw_tokens, list) and isinstance(raw_tokens[0], dict):
        for t in raw_tokens:
            tokens.append(
                {
                    "token_id": t.get("token_id", ""),
                    "outcome": t.get("outcome", ""),
                    "price": float(t["price"]) if t.get("price") else None,
                    "winner": t.get("winner"),
                }
            )
    else:
        # Build tokens from the separate JSON-string fields
        token_ids = _parse_json_string(raw.get("clobTokenIds"))
        outcomes = _parse_json_string(raw.get("outcomes"))
        prices = _parse_json_string(raw.get("outcomePrices"))

        for i, tid in enumerate(token_ids):
            tokens.append(
                {
                    "token_id": str(tid).strip(),
                    "outcome": outcomes[i] if i < len(outcomes) else "",
                    "price": float(prices[i]) if i < len(prices) and prices[i] else None,
                    "winner": None,
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
        neg_risk=bool(raw.get("negRisk", False)),
        tokens=tokens,
        best_bid=float(raw["bestBid"]) if raw.get("bestBid") else None,
        best_ask=float(raw["bestAsk"]) if raw.get("bestAsk") else None,
    )


def _parse_gamma_event(raw: dict) -> EventSummary:
    """Convert a Gamma API event object into our schema."""
    raw_markets = raw.get("markets", [])
    markets = []
    if raw_markets:
        for m in raw_markets:
            # Skip closed/resolved markets within events
            if m.get("closed", False):
                continue
            markets.append(_parse_gamma_market(m))

    raw_tags = raw.get("tags", [])
    tags = []
    if raw_tags and isinstance(raw_tags, list):
        for t in raw_tags:
            if isinstance(t, dict):
                tags.append(
                    Tag(
                        id=str(t.get("id", "")),
                        label=t.get("label", ""),
                        slug=t.get("slug", ""),
                    )
                )

    return EventSummary(
        id=str(raw.get("id", "")),
        title=raw.get("title", ""),
        slug=raw.get("slug", ""),
        description=raw.get("description", ""),
        image=raw.get("image", ""),
        tags=tags,
        active=raw.get("active", True),
        closed=raw.get("closed", False),
        volume=float(raw.get("volume", 0) or 0),
        liquidity=float(raw.get("liquidity", 0) or 0),
        end_date=raw.get("endDate", raw.get("end_date_iso", "")),
        markets=markets,
    )


@router.get("/tags", response_model=list[Tag])
async def list_tags():
    """Fetch available tags from the Polymarket Gamma API."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{GAMMA_URL}/tags")
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("gamma_timeout GET /tags")
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error("gamma_http_error GET /tags status=%d", exc.response.status_code)
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("gamma_connection_error GET /tags error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    raw_tags = data if isinstance(data, list) else data.get("data", [])
    return [
        Tag(
            id=str(t.get("id", "")),
            label=t.get("label", ""),
            slug=t.get("slug", ""),
        )
        for t in raw_tags
        if isinstance(t, dict)
    ]


@router.get("/events", response_model=EventsResponse)
async def list_events(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    active: bool = Query(default=True),
    closed: bool = Query(default=False),
    tag_id: str | None = Query(default=None),
    order: str = Query(
        default="volume",
        pattern=r"^(volume|liquidity|volume_24hr|endDate)$",
        description="Sort field: volume, liquidity, volume_24hr, endDate",
    ),
    ascending: bool = Query(default=False),
):
    """Fetch events from the Polymarket Gamma API."""
    params: dict = {
        "limit": limit,
        "offset": offset,
        "active": str(active).lower(),
        "closed": str(closed).lower(),
        "archived": "false",
        "order": order,
        "ascending": str(ascending).lower(),
    }
    if tag_id:
        params["tag_id"] = tag_id

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{GAMMA_URL}/events", params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("gamma_timeout GET /events params=%s", params)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "gamma_http_error GET /events status=%d body=%s",
            exc.response.status_code,
            exc.response.text[:500],
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("gamma_connection_error GET /events error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    events_raw = data if isinstance(data, list) else data.get("data", data.get("events", []))
    events = [_parse_gamma_event(e) for e in events_raw]

    # Drop events with no open markets after filtering
    if active and not closed:
        events = [e for e in events if e.markets]

    logger.debug("list_events returned %d events", len(events))

    return EventsResponse(
        events=events,
        count=len(events),
        next_cursor=str(offset + limit) if len(events) == limit else None,
    )


@router.get("", response_model=MarketsResponse)
async def list_markets(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    active: bool = Query(default=True),
    closed: bool = Query(default=False),
    order: str = Query(
        default="volume",
        pattern=r"^(volume|liquidity|endDate)$",
        description="Sort field: volume, liquidity, endDate",
    ),
    ascending: bool = Query(default=False),
):
    """Fetch markets from the Polymarket Gamma API."""
    params = {
        "limit": limit,
        "offset": offset,
        "active": str(active).lower(),
        "closed": str(closed).lower(),
        "archived": "false",
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

    # Filter out closed/resolved markets that Gamma may still return
    if active and not closed:
        markets = [m for m in markets if m.active and not m.closed]

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
            resp = await client.get(
                f"{GAMMA_URL}/markets",
                params={"conditionId": condition_id, "limit": 1},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("gamma_timeout GET /markets?condition_id=%s", condition_id)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "gamma_http_error GET /markets?condition_id=%s status=%d",
            condition_id,
            exc.response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error(
            "gamma_connection_error GET /markets?condition_id=%s error=%s",
            condition_id,
            exc,
        )
        raise HTTPException(status_code=502, detail="Upstream service error")

    results = data if isinstance(data, list) else data.get("data", [])
    if not results:
        raise HTTPException(status_code=404, detail="Market not found")

    return _parse_gamma_market(results[0])


def _detect_walls(levels: list[dict], threshold_multiplier: float = 2.0) -> list[dict]:
    """Find price levels with size > threshold_multiplier * average size."""
    if not levels:
        return []
    sizes = [float(lv.get("size", 0)) for lv in levels]
    avg = sum(sizes) / len(sizes) if sizes else 0
    if avg == 0:
        return []
    return [
        {"price": lv["price"], "size": lv["size"]}
        for lv, sz in zip(levels, sizes)
        if sz > avg * threshold_multiplier
    ]


@router.get("/{token_id}/orderbook", response_model=OrderbookAnalysis)
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
            # Return empty orderbook for markets with no active book
            return OrderbookAnalysis(
                token_id=token_id,
                bids=[],
                asks=[],
                spread=None,
                mid_price=None,
                bid_depth=0.0,
                ask_depth=0.0,
                imbalance_ratio=None,
                bid_walls=[],
                ask_walls=[],
            )
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

    bid_depth = sum(float(b.get("size", 0)) for b in bids)
    ask_depth = sum(float(a.get("size", 0)) for a in asks)
    total_depth = bid_depth + ask_depth
    imbalance_ratio = bid_depth / total_depth if total_depth > 0 else None

    return OrderbookAnalysis(
        token_id=token_id,
        bids=bids,
        asks=asks,
        spread=spread,
        mid_price=mid,
        bid_depth=bid_depth,
        ask_depth=ask_depth,
        imbalance_ratio=imbalance_ratio,
        bid_walls=_detect_walls(bids),
        ask_walls=_detect_walls(asks),
    )
