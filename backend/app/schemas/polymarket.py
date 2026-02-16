"""Pydantic schemas for Polymarket API responses and request bodies."""

from pydantic import BaseModel

# ── Builder signing ──────────────────────────────────────


class SignRequest(BaseModel):
    method: str
    path: str
    body: str = ""


class SignResponse(BaseModel):
    POLY_BUILDER_SIGNATURE: str
    POLY_BUILDER_TIMESTAMP: str
    POLY_BUILDER_API_KEY: str
    POLY_BUILDER_PASSPHRASE: str


# ── Market data ──────────────────────────────────────────


class MarketToken(BaseModel):
    token_id: str
    outcome: str
    price: float | None = None
    winner: bool | None = None


class MarketSummary(BaseModel):
    condition_id: str
    question: str
    slug: str = ""
    description: str = ""
    category: str = ""
    image: str = ""
    end_date: str = ""
    active: bool = True
    closed: bool = False
    volume: float = 0.0
    liquidity: float = 0.0
    tokens: list[MarketToken] = []
    best_bid: float | None = None
    best_ask: float | None = None


class MarketsResponse(BaseModel):
    markets: list[MarketSummary]
    count: int
    next_cursor: str | None = None


class OrderbookSummary(BaseModel):
    token_id: str
    bids: list[dict]
    asks: list[dict]
    spread: float | None = None
    mid_price: float | None = None
