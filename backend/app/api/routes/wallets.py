"""Wallet endpoints — leaderboard, profile, trade history, positions."""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db.models import TrackedMarket, Trade, Wallet, WalletScore, WalletSnapshot
from app.services.leaderboard import compute_live_leaderboard

router = APIRouter(prefix="/wallets", tags=["wallets"])
logger = logging.getLogger(__name__)

_ADDR_RE = r"^0x[a-fA-F0-9]{40}$"

_TIMEFRAME_DELTAS = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "all": None,
}


# ── Static routes MUST come before /{address} wildcard ────


@router.get("/leaderboard")
async def leaderboard(
    timeframe: str = Query(default="7d", pattern=r"^(24h|7d|30d|all)$"),
    sort_by: str = Query(default="volume", pattern=r"^(volume|pnl|win_rate|trade_count)$"),
    sort_dir: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    category: str = Query(default="mentions", pattern=r"^(all|mentions)$"),
    # Threshold filters
    min_trades: int | None = Query(default=None, ge=1),
    min_volume: float | None = Query(default=None, ge=0),
    min_win_rate: float | None = Query(default=None, ge=0.0, le=1.0),
    pnl_positive: bool = Query(default=False),
    label: str | None = Query(default=None, min_length=1),
    # Scoping filters
    market: str | None = Query(default=None, min_length=1),
    event_id: str | None = Query(default=None, min_length=1),
    from_ts: int | None = Query(default=None),
    to_ts: int | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Ranked wallets by volume/pnl/win_rate, filterable by timeframe and category.

    When scoping filters (market, event_id, from_ts, to_ts) are provided, rankings
    are computed on-the-fly from the Trade table instead of pre-computed WalletScore.
    """
    use_live = market or event_id or from_ts is not None or to_ts is not None

    if use_live:
        # Compute custom time range from timeframe when no explicit range given
        if from_ts is None and to_ts is None:
            delta = _TIMEFRAME_DELTAS.get(timeframe)
            if delta:
                from_ts = int((datetime.now(UTC) - delta).timestamp())

        rows, total = await compute_live_leaderboard(
            session,
            category=category,
            market=market,
            event_id=event_id,
            from_ts=from_ts,
            to_ts=to_ts,
            min_trades=min_trades,
            min_volume=min_volume,
            min_win_rate=min_win_rate,
            pnl_positive=pnl_positive,
            label=label,
            sort_by=sort_by,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )
        return {"wallets": rows, "total": total, "timeframe": timeframe}

    # ── Pre-computed WalletScore path (with threshold filters) ──
    order_col = {
        "volume": WalletScore.volume,
        "pnl": WalletScore.pnl,
        "win_rate": WalletScore.win_rate,
        "trade_count": WalletScore.trade_count,
    }[sort_by]

    where = [WalletScore.timeframe == timeframe, WalletScore.category == category]
    if min_trades is not None:
        where.append(WalletScore.trade_count >= min_trades)
    if min_volume is not None:
        where.append(WalletScore.volume >= min_volume)
    if min_win_rate is not None:
        where.append(WalletScore.win_rate >= min_win_rate)
    if pnl_positive:
        where.append(WalletScore.pnl > 0)

    order_fn = order_col.asc() if sort_dir == "asc" else order_col.desc()
    q = select(WalletScore).where(*where).order_by(order_fn)

    if label:
        q = q.join(Wallet, WalletScore.wallet == Wallet.address).where(
            Wallet.labels.contains([label])
        )

    count_q = select(func.count()).select_from(WalletScore).where(*where)
    if label:
        count_q = count_q.join(Wallet, WalletScore.wallet == Wallet.address).where(
            Wallet.labels.contains([label])
        )

    q = q.offset(offset).limit(limit)

    result = await session.execute(q)
    rows = result.scalars().all()

    total = (await session.execute(count_q)).scalar() or 0

    return {
        "wallets": [
            {
                "address": r.wallet,
                "volume": r.volume,
                "pnl": r.pnl,
                "win_rate": r.win_rate,
                "trade_count": r.trade_count,
                "rank_volume": r.rank_volume,
                "rank_pnl": r.rank_pnl,
            }
            for r in rows
        ],
        "total": total,
        "timeframe": timeframe,
    }


@router.get("/feed/trades")
async def feed_trades(
    limit: int = Query(default=50, ge=1, le=200),
    category: str = Query(default="mentions", pattern=r"^(all|mentions)$"),
    session: AsyncSession = Depends(get_session),
):
    """Recent trades across tracked markets, optionally scoped to a category."""
    if category == "mentions":
        # Only trades on mentions markets
        mentions_cids = select(TrackedMarket.condition_id).where(
            TrackedMarket.category == "mentions"
        )
        q = (
            select(Trade)
            .where(Trade.condition_id.in_(mentions_cids))
            .order_by(Trade.timestamp.desc())
            .limit(limit)
        )
    else:
        q = select(Trade).order_by(Trade.timestamp.desc()).limit(limit)
    result = await session.execute(q)
    trades = result.scalars().all()

    return {
        "trades": [
            {
                "transaction_hash": t.transaction_hash,
                "asset_id": t.asset_id,
                "condition_id": t.condition_id,
                "wallet": t.wallet,
                "side": t.side,
                "size": t.size,
                "price": t.price,
                "outcome": t.outcome,
                "title": t.title,
                "timestamp": t.timestamp,
            }
            for t in trades
        ],
    }


# ── Parameterized routes ─────────────────────────────────


@router.get("/{address}")
async def wallet_profile(
    address: str = Path(pattern=_ADDR_RE),
    session: AsyncSession = Depends(get_session),
):
    """Full wallet profile — stats, recent trades, scores."""
    wallet = await session.get(Wallet, address.lower())

    scores_q = select(WalletScore).where(WalletScore.wallet == address.lower())
    scores_result = await session.execute(scores_q)
    scores = scores_result.scalars().all()

    trades_q = (
        select(Trade)
        .where(Trade.wallet == address.lower())
        .order_by(Trade.timestamp.desc())
        .limit(10)
    )
    trades_result = await session.execute(trades_q)
    recent_trades = trades_result.scalars().all()

    return {
        "address": address.lower(),
        "first_seen": wallet.first_seen.isoformat() if wallet else None,
        "last_seen": wallet.last_seen.isoformat() if wallet else None,
        "total_trades": wallet.total_trades if wallet else 0,
        "total_volume": wallet.total_volume if wallet else 0,
        "labels": wallet.labels if wallet else [],
        "scores": {
            s.timeframe: {
                "volume": s.volume,
                "pnl": s.pnl,
                "win_rate": s.win_rate,
                "trade_count": s.trade_count,
                "rank_volume": s.rank_volume,
            }
            for s in scores
        },
        "recent_trades": [
            {
                "transaction_hash": t.transaction_hash,
                "condition_id": t.condition_id,
                "side": t.side,
                "size": t.size,
                "price": t.price,
                "outcome": t.outcome,
                "title": t.title,
                "timestamp": t.timestamp,
            }
            for t in recent_trades
        ],
    }


@router.get("/{address}/trades")
async def wallet_trades(
    address: str = Path(pattern=_ADDR_RE),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Paginated trade history for a wallet."""
    q = (
        select(Trade)
        .where(Trade.wallet == address.lower())
        .order_by(Trade.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(q)
    trades = result.scalars().all()

    count_q = select(func.count()).select_from(Trade).where(Trade.wallet == address.lower())
    total = (await session.execute(count_q)).scalar() or 0

    return {
        "trades": [
            {
                "transaction_hash": t.transaction_hash,
                "asset_id": t.asset_id,
                "condition_id": t.condition_id,
                "side": t.side,
                "size": t.size,
                "price": t.price,
                "outcome": t.outcome,
                "title": t.title,
                "timestamp": t.timestamp,
            }
            for t in trades
        ],
        "total": total,
    }


@router.get("/{address}/positions")
async def wallet_positions(
    address: str = Path(pattern=_ADDR_RE),
    session: AsyncSession = Depends(get_session),
):
    """Latest position snapshots for a wallet on tracked markets."""
    subq = (
        select(
            WalletSnapshot.condition_id,
            func.max(WalletSnapshot.snapshot_at).label("latest"),
        )
        .where(WalletSnapshot.wallet == address.lower())
        .group_by(WalletSnapshot.condition_id)
        .subquery()
    )

    q = select(WalletSnapshot).join(
        subq,
        (WalletSnapshot.condition_id == subq.c.condition_id)
        & (WalletSnapshot.snapshot_at == subq.c.latest)
        & (WalletSnapshot.wallet == address.lower()),
    )
    result = await session.execute(q)
    snapshots = result.scalars().all()

    return {
        "positions": [
            {
                "condition_id": s.condition_id,
                "size": s.size,
                "pnl": s.pnl,
                "snapshot_at": s.snapshot_at.isoformat(),
            }
            for s in snapshots
        ],
    }
