"""Live leaderboard aggregation from the Trade table.

Used when scoping filters (market, event_id, custom date range) are provided
and pre-computed WalletScore rows don't apply.
"""

import statistics
from collections import defaultdict

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TrackedMarket, Trade, TraderProfile, Wallet


async def compute_live_leaderboard(
    session: AsyncSession,
    *,
    category: str = "all",
    market: str | None = None,
    event_id: str | None = None,
    from_ts: int | None = None,
    to_ts: int | None = None,
    min_trades: int | None = None,
    min_volume: float | None = None,
    min_win_rate: float | None = None,
    pnl_positive: bool = False,
    label: str | None = None,
    max_bot_score: float | None = None,
    min_roi: float | None = None,
    min_consistency: float | None = None,
    primary_category: str | None = None,
    sort_by: str = "volume",
    sort_dir: str = "desc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Aggregate rankings on-the-fly from the Trade table.

    Returns (rows, total_count).
    """
    # ── Build condition_id filter set ────────────────────────
    trade_filters: list = []

    if market:
        trade_filters.append(Trade.condition_id == market)
    elif event_id:
        cids = select(TrackedMarket.condition_id).where(TrackedMarket.event_id == event_id)
        trade_filters.append(Trade.condition_id.in_(cids))

    if category == "mentions" and not market:
        mentions_cids = select(TrackedMarket.condition_id).where(
            TrackedMarket.category == "mentions"
        )
        trade_filters.append(Trade.condition_id.in_(mentions_cids))

    if from_ts is not None:
        trade_filters.append(Trade.timestamp >= from_ts)
    if to_ts is not None:
        trade_filters.append(Trade.timestamp <= to_ts)

    # ── Volume & trade count per wallet ──────────────────────
    vol_q = (
        select(
            Trade.wallet,
            func.count().label("trade_count"),
            func.sum(Trade.size * Trade.price).label("volume"),
        )
        .where(*trade_filters)
        .group_by(Trade.wallet)
    )

    # ── Buy volume per wallet (for ROI) ──────────────────────
    buy_vol_q = (
        select(
            Trade.wallet,
            func.sum(Trade.size * Trade.price).label("buy_volume"),
        )
        .where(*trade_filters, Trade.side == "BUY")
        .group_by(Trade.wallet)
    )

    # ── PnL per wallet+market ────────────────────────────────
    pnl_sub = (
        select(
            Trade.wallet,
            Trade.condition_id,
            func.sum(
                case(
                    (Trade.side == "SELL", Trade.size * Trade.price),
                    else_=-Trade.size * Trade.price,
                )
            ).label("market_pnl"),
        )
        .where(*trade_filters)
        .group_by(Trade.wallet, Trade.condition_id)
        .subquery()
    )

    pnl_q = select(
        pnl_sub.c.wallet,
        func.sum(pnl_sub.c.market_pnl).label("pnl"),
        func.count().label("market_count"),
        func.sum(case((pnl_sub.c.market_pnl > 0, 1), else_=0)).label("wins"),
    ).group_by(pnl_sub.c.wallet)

    # Per-market PnL rows for consistency
    per_market_pnl_q = select(
        pnl_sub.c.wallet,
        pnl_sub.c.market_pnl,
    )

    # Execute all
    vol_rows = {r.wallet: r for r in (await session.execute(vol_q)).all()}
    pnl_rows = {r.wallet: r for r in (await session.execute(pnl_q)).all()}
    buy_vol_rows = {
        r.wallet: float(r.buy_volume or 0)
        for r in (await session.execute(buy_vol_q)).all()
    }
    per_market_rows = (await session.execute(per_market_pnl_q)).all()

    if not vol_rows:
        return [], 0

    # Collect per-market returns for consistency
    wallet_market_returns: dict[str, list[float]] = defaultdict(list)
    for r in per_market_rows:
        wallet_market_returns[r.wallet].append(float(r.market_pnl or 0.0))

    # ── Label filter: pre-fetch matching wallets ─────────────
    label_addrs: set[str] | None = None
    if label:
        label_q = select(Wallet.address).where(Wallet.labels.contains([label]))
        label_result = await session.execute(label_q)
        label_addrs = {r[0] for r in label_result.all()}

    # ── TraderProfile filter: pre-fetch when bot/category filters active ──
    profile_map: dict[str, TraderProfile] | None = None
    if max_bot_score is not None or primary_category is not None:
        tp_q = select(TraderProfile)
        if max_bot_score is not None:
            tp_q = tp_q.where(TraderProfile.bot_score <= max_bot_score)
        if primary_category is not None:
            tp_q = tp_q.where(TraderProfile.primary_category == primary_category)
        tp_result = await session.execute(tp_q)
        profile_map = {tp.wallet: tp for tp in tp_result.scalars().all()}

    # ── Merge into result list ───────────────────────────────
    rows: list[dict] = []
    for wallet_addr, vr in vol_rows.items():
        pr = pnl_rows.get(wallet_addr)
        pnl = float(pr.pnl or 0) if pr else 0.0
        market_count = int(pr.market_count or 0) if pr else 0
        wins = int(pr.wins or 0) if pr else 0
        win_rate = wins / market_count if market_count > 0 else 0.0
        volume = float(vr.volume or 0)
        trade_count = int(vr.trade_count or 0)

        # ROI
        bv = buy_vol_rows.get(wallet_addr, 0.0)
        roi = pnl / bv if bv > 0 else 0.0

        # Consistency
        returns = wallet_market_returns.get(wallet_addr, [])
        if len(returns) >= 2:
            sd = statistics.stdev(returns)
            consistency = statistics.mean(returns) / sd if sd > 0 else 0.0
        else:
            consistency = 0.0

        # Threshold filters
        if min_trades is not None and trade_count < min_trades:
            continue
        if min_volume is not None and volume < min_volume:
            continue
        if min_win_rate is not None and win_rate < min_win_rate:
            continue
        if pnl_positive and pnl <= 0:
            continue
        if label_addrs is not None and wallet_addr not in label_addrs:
            continue
        if min_roi is not None and roi < min_roi:
            continue
        if min_consistency is not None and consistency < min_consistency:
            continue
        if profile_map is not None and wallet_addr not in profile_map:
            continue

        rows.append(
            {
                "address": wallet_addr,
                "volume": volume,
                "pnl": pnl,
                "win_rate": win_rate,
                "trade_count": trade_count,
                "rank_volume": 0,
                "rank_pnl": 0,
                "roi": round(roi, 6),
                "consistency": round(consistency, 6),
            }
        )

    # ── Sort ─────────────────────────────────────────────────
    sort_key = {
        "volume": lambda r: r["volume"],
        "pnl": lambda r: r["pnl"],
        "win_rate": lambda r: r["win_rate"],
        "trade_count": lambda r: r["trade_count"],
        "roi": lambda r: r["roi"],
        "consistency": lambda r: r["consistency"],
    }.get(sort_by, lambda r: r["volume"])

    rows.sort(key=sort_key, reverse=(sort_dir == "desc"))

    # Assign ranks
    for i, row in enumerate(rows, 1):
        row["rank_volume"] = i  # rank in current sort order

    total = len(rows)
    page = rows[offset : offset + limit]

    # Re-rank the full list by volume and pnl for the response
    by_vol = sorted(rows, key=lambda r: r["volume"], reverse=True)
    by_pnl = sorted(rows, key=lambda r: r["pnl"], reverse=True)
    rank_vol = {r["address"]: i for i, r in enumerate(by_vol, 1)}
    rank_pnl = {r["address"]: i for i, r in enumerate(by_pnl, 1)}

    for row in page:
        row["rank_volume"] = rank_vol[row["address"]]
        row["rank_pnl"] = rank_pnl[row["address"]]

    # Batch-fetch profile data for this page
    if page:
        page_addrs = [r["address"] for r in page]
        profile_q = select(
            Wallet.address, Wallet.profile_image_url, Wallet.display_name
        ).where(Wallet.address.in_(page_addrs))
        profile_rows = (await session.execute(profile_q)).all()
        profile_map = {r.address: r for r in profile_rows}
        for row in page:
            pr = profile_map.get(row["address"])
            row["profile_image_url"] = pr.profile_image_url if pr else None
            row["display_name"] = pr.display_name if pr else None

    return page, total
