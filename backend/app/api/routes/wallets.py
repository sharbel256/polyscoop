"""Wallet endpoints — leaderboard, profile, trade history, positions."""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db.models import TrackedMarket, Trade, TraderProfile, Wallet, WalletScore, WalletSnapshot
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
    sort_by: str = Query(
        default="volume",
        pattern=r"^(volume|pnl|win_rate|trade_count|roi|consistency|bot_score)$",
    ),
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
    # New analytics filters
    max_bot_score: float | None = Query(default=None, ge=0.0, le=1.0),
    min_roi: float | None = Query(default=None),
    min_consistency: float | None = Query(default=None),
    primary_category: str | None = Query(default=None, min_length=1),
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
            max_bot_score=max_bot_score,
            min_roi=min_roi,
            min_consistency=min_consistency,
            primary_category=primary_category,
            sort_by=sort_by if sort_by != "bot_score" else "volume",
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )
        return {"wallets": rows, "total": total, "timeframe": timeframe}

    # ── Pre-computed WalletScore path (with threshold filters) ──
    order_col_map = {
        "volume": WalletScore.volume,
        "pnl": WalletScore.pnl,
        "win_rate": WalletScore.win_rate,
        "trade_count": WalletScore.trade_count,
        "roi": WalletScore.roi,
        "consistency": WalletScore.consistency,
    }

    # For bot_score sort, we need to join TraderProfile
    sorting_by_bot_score = sort_by == "bot_score"

    where = [WalletScore.timeframe == timeframe, WalletScore.category == category]
    if min_trades is not None:
        where.append(WalletScore.trade_count >= min_trades)
    if min_volume is not None:
        where.append(WalletScore.volume >= min_volume)
    if min_win_rate is not None:
        where.append(WalletScore.win_rate >= min_win_rate)
    if pnl_positive:
        where.append(WalletScore.pnl > 0)
    if min_roi is not None:
        where.append(WalletScore.roi >= min_roi)
    if min_consistency is not None:
        where.append(WalletScore.consistency >= min_consistency)

    # Determine if we need TraderProfile join
    needs_profile_join = (
        max_bot_score is not None
        or primary_category is not None
        or sorting_by_bot_score
    )

    if sorting_by_bot_score:
        order_expr = (
            TraderProfile.bot_score.asc()
            if sort_dir == "asc"
            else TraderProfile.bot_score.desc()
        )
    else:
        oc = order_col_map.get(sort_by, WalletScore.volume)
        order_expr = oc.asc() if sort_dir == "asc" else oc.desc()

    q = (
        select(WalletScore, Wallet.profile_image_url, Wallet.display_name)
        .outerjoin(Wallet, WalletScore.wallet == Wallet.address)
        .where(*where)
        .order_by(order_expr)
    )
    count_q = select(func.count()).select_from(WalletScore).where(*where)

    if needs_profile_join:
        q = q.join(TraderProfile, WalletScore.wallet == TraderProfile.wallet)
        count_q = count_q.join(TraderProfile, WalletScore.wallet == TraderProfile.wallet)
        if max_bot_score is not None:
            q = q.where(TraderProfile.bot_score <= max_bot_score)
            count_q = count_q.where(TraderProfile.bot_score <= max_bot_score)
        if primary_category is not None:
            q = q.where(TraderProfile.primary_category == primary_category)
            count_q = count_q.where(TraderProfile.primary_category == primary_category)

    if label:
        q = q.where(Wallet.labels.contains([label]))
        count_q = count_q.join(Wallet, WalletScore.wallet == Wallet.address).where(
            Wallet.labels.contains([label])
        )

    q = q.offset(offset).limit(limit)

    result = await session.execute(q)
    rows = result.all()

    total = (await session.execute(count_q)).scalar() or 0

    return {
        "wallets": [
            {
                "address": ws.wallet,
                "volume": ws.volume,
                "pnl": ws.pnl,
                "win_rate": ws.win_rate,
                "trade_count": ws.trade_count,
                "rank_volume": ws.rank_volume,
                "rank_pnl": ws.rank_pnl,
                "roi": ws.roi,
                "consistency": ws.consistency,
                "profile_image_url": img,
                "display_name": name,
            }
            for ws, img, name in rows
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

    # Batch-fetch wallet profiles and market images for this page
    wallet_addrs = list({t.wallet for t in trades})
    cond_ids = list({t.condition_id for t in trades})

    wallet_q = select(
        Wallet.address, Wallet.profile_image_url, Wallet.display_name
    ).where(Wallet.address.in_(wallet_addrs))
    wallet_rows = (await session.execute(wallet_q)).all()
    wallet_map = {r.address: r for r in wallet_rows}

    market_q = select(TrackedMarket.condition_id, TrackedMarket.image).where(
        TrackedMarket.condition_id.in_(cond_ids)
    )
    market_rows = (await session.execute(market_q)).all()
    market_map = {r.condition_id: r.image for r in market_rows}

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
                "profile_image_url": wallet_map[t.wallet].profile_image_url if t.wallet in wallet_map else None,
                "display_name": wallet_map[t.wallet].display_name if t.wallet in wallet_map else None,
                "market_image": market_map.get(t.condition_id),
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
    """Full wallet profile — stats, recent trades, scores, trader analytics."""
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

    # Fetch trader profile
    tp = await session.get(TraderProfile, address.lower())
    trader_profile = None
    if tp:
        trader_profile = {
            "median_trade_interval_s": tp.median_trade_interval_s,
            "trade_interval_cv": tp.trade_interval_cv,
            "size_cv": tp.size_cv,
            "active_hours": tp.active_hours,
            "bot_score": tp.bot_score,
            "primary_category": tp.primary_category,
            "category_concentration": tp.category_concentration,
            "market_count": tp.market_count,
            "avg_entry_timing": tp.avg_entry_timing,
            "avg_hold_duration_h": tp.avg_hold_duration_h,
            "avg_position_size_usd": tp.avg_position_size_usd,
        }

    return {
        "address": address.lower(),
        "first_seen": wallet.first_seen.isoformat() if wallet else None,
        "last_seen": wallet.last_seen.isoformat() if wallet else None,
        "total_trades": wallet.total_trades if wallet else 0,
        "total_volume": wallet.total_volume if wallet else 0,
        "labels": wallet.labels if wallet else [],
        "profile_image_url": wallet.profile_image_url if wallet else None,
        "display_name": wallet.display_name if wallet else None,
        "trader_profile": trader_profile,
        "scores": {
            s.timeframe: {
                "volume": s.volume,
                "pnl": s.pnl,
                "win_rate": s.win_rate,
                "trade_count": s.trade_count,
                "rank_volume": s.rank_volume,
                "roi": s.roi,
                "consistency": s.consistency,
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
