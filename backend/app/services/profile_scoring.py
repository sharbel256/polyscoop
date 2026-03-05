"""Trader profile computation — bot detection + specialization metrics."""

import logging
import statistics
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TrackedMarket, Trade, TraderProfile

logger = logging.getLogger(__name__)

MIN_TRADES = 5


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _cv(values: list[float]) -> float:
    """Coefficient of variation (stddev / mean). Returns 0 if insufficient data."""
    if len(values) < 2:
        return 0.0
    m = statistics.mean(values)
    if m == 0:
        return 0.0
    return statistics.stdev(values) / m


async def compute_profiles(session: AsyncSession) -> int:
    """Recompute trader_profiles for all wallets with enough trades."""

    # Fetch all trades ordered by wallet, timestamp
    q = select(
        Trade.wallet,
        Trade.condition_id,
        Trade.side,
        Trade.size,
        Trade.price,
        Trade.timestamp,
    ).order_by(Trade.wallet, Trade.timestamp)
    rows = (await session.execute(q)).all()

    if not rows:
        return 0

    # condition_id → category map
    cat_q = select(TrackedMarket.condition_id, TrackedMarket.category)
    cat_rows = (await session.execute(cat_q)).all()
    cid_category: dict[str, str] = {r.condition_id: r.category for r in cat_rows}

    # Per-market first/last trade timestamps (for entry timing normalization)
    market_first: dict[str, int] = {}
    market_last: dict[str, int] = {}
    for r in rows:
        cid = r.condition_id
        ts = r.timestamp
        if cid not in market_first or ts < market_first[cid]:
            market_first[cid] = ts
        if cid not in market_last or ts > market_last[cid]:
            market_last[cid] = ts

    # Group trades by wallet
    wallet_trades: dict[str, list] = defaultdict(list)
    for r in rows:
        wallet_trades[r.wallet].append(r)

    profiles: list[dict] = []

    for wallet, trades in wallet_trades.items():
        if len(trades) < MIN_TRADES:
            continue

        timestamps = [t.timestamp for t in trades]
        sizes = [t.size * t.price for t in trades]

        # ── Bot detection ─────────────────────────────────
        intervals = [timestamps[i] - timestamps[i - 1] for i in range(1, len(timestamps))]
        intervals = [iv for iv in intervals if iv > 0]

        if intervals:
            median_interval = statistics.median(intervals)
            interval_cv = _cv(intervals)
        else:
            median_interval = 0.0
            interval_cv = 0.0

        size_cv = _cv(sizes)
        active_hours = len({(ts // 3600) % 24 for ts in timestamps})

        # Bot score composite: low CV and high active hours → more bot-like
        # interval_cv_signal: low CV → high score (bots are regular)
        interval_cv_signal = _clamp(1.0 - min(interval_cv, 3.0) / 3.0)
        # size_cv_signal: low CV → high score (bots use uniform sizes)
        size_cv_signal = _clamp(1.0 - min(size_cv, 3.0) / 3.0)
        # active_hours_signal: more hours → more bot-like
        active_hours_signal = active_hours / 24.0
        # speed_signal: low median interval → high score (bots trade fast)
        # Normalize: 60s → 1.0, 86400s (1 day) → 0.0
        speed_signal = _clamp(1.0 - min(median_interval, 86400) / 86400)

        bot_score = (
            0.25 * interval_cv_signal
            + 0.20 * size_cv_signal
            + 0.30 * active_hours_signal
            + 0.25 * speed_signal
        )

        # ── Specialization ────────────────────────────────
        # Category counts
        cat_counts: dict[str, int] = defaultdict(int)
        for t in trades:
            cat = cid_category.get(t.condition_id, "unknown")
            cat_counts[cat] += 1

        total_trades = len(trades)
        primary_category = max(cat_counts, key=cat_counts.get)  # type: ignore[arg-type]

        # Herfindahl index
        shares = [c / total_trades for c in cat_counts.values()]
        category_concentration = sum(s * s for s in shares)

        # Distinct markets
        condition_ids = {t.condition_id for t in trades}
        market_count = len(condition_ids)

        # Entry timing: how late into a market's lifecycle did the wallet enter?
        entry_timings: list[float] = []
        for cid in condition_ids:
            mf = market_first.get(cid, 0)
            ml = market_last.get(cid, 0)
            span = ml - mf
            if span <= 0:
                continue
            wallet_first_in_market = min(t.timestamp for t in trades if t.condition_id == cid)
            entry_timings.append((wallet_first_in_market - mf) / span)

        avg_entry_timing = statistics.mean(entry_timings) if entry_timings else 0.0

        # Hold duration: per market, max SELL ts - min BUY ts
        hold_durations: list[float] = []
        for cid in condition_ids:
            cid_trades = [t for t in trades if t.condition_id == cid]
            buy_ts = [t.timestamp for t in cid_trades if t.side == "BUY"]
            sell_ts = [t.timestamp for t in cid_trades if t.side == "SELL"]
            if buy_ts and sell_ts:
                duration_h = (max(sell_ts) - min(buy_ts)) / 3600.0
                if duration_h > 0:
                    hold_durations.append(duration_h)

        avg_hold_duration_h = statistics.mean(hold_durations) if hold_durations else 0.0

        avg_position_size_usd = statistics.mean(sizes) if sizes else 0.0

        # Easy win ratio: fraction of BUY trades entered at >= 90% probability
        buy_trades = [t for t in trades if t.side == "BUY"]
        if buy_trades:
            easy_buys = sum(1 for t in buy_trades if t.price >= 0.90)
            easy_win_ratio = easy_buys / len(buy_trades)
        else:
            easy_win_ratio = 0.0

        profiles.append(
            {
                "wallet": wallet,
                "median_trade_interval_s": median_interval,
                "trade_interval_cv": interval_cv,
                "size_cv": size_cv,
                "active_hours": active_hours,
                "bot_score": round(bot_score, 4),
                "primary_category": primary_category,
                "category_concentration": round(category_concentration, 4),
                "market_count": market_count,
                "avg_entry_timing": round(avg_entry_timing, 4),
                "avg_hold_duration_h": round(avg_hold_duration_h, 2),
                "avg_position_size_usd": round(avg_position_size_usd, 2),
                "easy_win_ratio": round(easy_win_ratio, 4),
            }
        )

    # Batch upsert
    if profiles:
        batch_size = 2000
        for i in range(0, len(profiles), batch_size):
            batch = profiles[i : i + batch_size]
            stmt = pg_insert(TraderProfile).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["wallet"],
                set_={
                    "median_trade_interval_s": stmt.excluded.median_trade_interval_s,
                    "trade_interval_cv": stmt.excluded.trade_interval_cv,
                    "size_cv": stmt.excluded.size_cv,
                    "active_hours": stmt.excluded.active_hours,
                    "bot_score": stmt.excluded.bot_score,
                    "primary_category": stmt.excluded.primary_category,
                    "category_concentration": stmt.excluded.category_concentration,
                    "market_count": stmt.excluded.market_count,
                    "avg_entry_timing": stmt.excluded.avg_entry_timing,
                    "avg_hold_duration_h": stmt.excluded.avg_hold_duration_h,
                    "avg_position_size_usd": stmt.excluded.avg_position_size_usd,
                    "easy_win_ratio": stmt.excluded.easy_win_ratio,
                },
            )
            await session.execute(stmt)

    await session.commit()
    logger.info("computed %d trader profiles", len(profiles))
    return len(profiles)
