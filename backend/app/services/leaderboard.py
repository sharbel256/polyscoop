"""Live leaderboard aggregation from the Trade table.

Used when scoping filters (market, event_id, custom date range) are provided
and pre-computed WalletScore rows don't apply.
"""

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TrackedMarket, Trade, Wallet


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

    # Execute both
    vol_rows = {r.wallet: r for r in (await session.execute(vol_q)).all()}
    pnl_rows = {r.wallet: r for r in (await session.execute(pnl_q)).all()}

    if not vol_rows:
        return [], 0

    # ── Label filter: pre-fetch matching wallets ─────────────
    label_addrs: set[str] | None = None
    if label:
        label_q = select(Wallet.address).where(Wallet.labels.contains([label]))
        label_result = await session.execute(label_q)
        label_addrs = {r[0] for r in label_result.all()}

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

        rows.append(
            {
                "address": wallet_addr,
                "volume": volume,
                "pnl": pnl,
                "win_rate": win_rate,
                "trade_count": trade_count,
                "rank_volume": 0,
                "rank_pnl": 0,
            }
        )

    # ── Sort ─────────────────────────────────────────────────
    sort_key = {
        "volume": lambda r: r["volume"],
        "pnl": lambda r: r["pnl"],
        "win_rate": lambda r: r["win_rate"],
        "trade_count": lambda r: r["trade_count"],
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

    return page, total
