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
    neg_risk: bool = False
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


class OrderbookAnalysis(OrderbookSummary):
    """Extended orderbook with depth analysis and wall detection."""

    bid_depth: float = 0.0
    ask_depth: float = 0.0
    imbalance_ratio: float | None = None
    bid_walls: list[dict] = []
    ask_walls: list[dict] = []


# ── Trades ────────────────────────────────────────────────


class TradeRecord(BaseModel):
    wallet: str = ""
    market: str = ""
    asset_id: str = ""
    side: str = ""
    size: float = 0.0
    price: float = 0.0
    timestamp: int = 0
    outcome: str = ""
    transaction_hash: str = ""
    title: str = ""


class TradesResponse(BaseModel):
    trades: list[TradeRecord]
    count: int


# ── Price history ─────────────────────────────────────────


class PricePoint(BaseModel):
    t: int
    p: float


class PriceHistoryResponse(BaseModel):
    history: list[PricePoint]


# ── Positions ─────────────────────────────────────────────


class PositionSummary(BaseModel):
    asset: str = ""
    conditionId: str = ""
    size: float = 0.0
    currentValue: float = 0.0
    cashPnl: float = 0.0
    percentPnl: float = 0.0
    curPrice: float = 0.0
    title: str = ""
    outcome: str = ""
    icon: str = ""
    slug: str = ""
