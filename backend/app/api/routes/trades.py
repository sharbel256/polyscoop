"""Polymarket trades endpoint – proxies the public Data API."""

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.polymarket import TradeRecord, TradesResponse

router = APIRouter(prefix="/trades", tags=["trades"])
logger = logging.getLogger(__name__)

DATA_API_URL = settings.POLYMARKET_DATA_API_URL


@router.get("", response_model=TradesResponse)
async def list_trades(
    market: str = Query(pattern=r"^0x[a-fA-F0-9]{1,128}$"),
    limit: int = Query(default=50, ge=1, le=500),
):
    """Fetch recent trades for a market from the Data API."""
    params = {"market": market, "limit": limit}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{DATA_API_URL}/trades", params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("data_api_timeout GET /trades market=%s", market)
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "data_api_http_error GET /trades market=%s status=%d",
            market,
            exc.response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream service error")
    except httpx.HTTPError as exc:
        logger.error("data_api_connection_error GET /trades error=%s", exc)
        raise HTTPException(status_code=502, detail="Upstream service error")

    raw_trades = data if isinstance(data, list) else []

    trades = []
    for t in raw_trades:
        trades.append(
            TradeRecord(
                wallet=t.get("proxyWallet", ""),
                market=t.get("conditionId", ""),
                asset_id=t.get("asset", ""),
                side=t.get("side", ""),
                size=float(t.get("size", 0)),
                price=float(t.get("price", 0)),
                timestamp=int(t.get("timestamp", 0)),
                outcome=t.get("outcome", ""),
                transaction_hash=t.get("transactionHash", ""),
                title=t.get("title", ""),
            )
        )

    return TradesResponse(trades=trades, count=len(trades))
