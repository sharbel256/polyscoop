"""Wallet scoring algorithms — aggregates trade data into wallet rankings."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TrackedMarket, Trade, Wallet, WalletScore

logger = logging.getLogger(__name__)

TIMEFRAMES = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "all": None,
}


async def compute_scores(session: AsyncSession) -> int:
    """Recompute wallet_scores for all timeframes. Returns number of scores written."""
    total = 0

    for tf_name, delta in TIMEFRAMES.items():
        now = datetime.now(UTC)

        # Time filter
        time_filter = []
        if delta:
            cutoff = now - delta
            cutoff_ts = int(cutoff.timestamp())
            time_filter = [Trade.timestamp >= cutoff_ts]

        # Volume & trade count per wallet
        vol_q = (
            select(
                Trade.wallet,
                func.count().label("trade_count"),
                func.sum(Trade.size * Trade.price).label("volume"),
            )
            .where(*time_filter)
            .group_by(Trade.wallet)
        )
        vol_rows = {r.wallet: r for r in (await session.execute(vol_q)).all()}
        if not vol_rows:
            continue

        # PnL per wallet+market: sells - buys
        pnl_q = (
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
            .where(*time_filter)
            .group_by(Trade.wallet, Trade.condition_id)
        )
        pnl_rows = (await session.execute(pnl_q)).all()

        # Aggregate PnL and win rate per wallet
        wallet_pnl: dict[str, float] = {}
        wallet_wins: dict[str, int] = {}
        wallet_markets: dict[str, int] = {}
        for r in pnl_rows:
            wallet_pnl[r.wallet] = wallet_pnl.get(r.wallet, 0.0) + (r.market_pnl or 0.0)
            wallet_markets[r.wallet] = wallet_markets.get(r.wallet, 0) + 1
            if (r.market_pnl or 0.0) > 0:
                wallet_wins[r.wallet] = wallet_wins.get(r.wallet, 0) + 1

        # Build score dicts
        wallet_list = list(vol_rows.keys())

        # Precompute win rates
        wallet_wr: dict[str, float] = {}
        for w in wallet_list:
            mc = wallet_markets.get(w, 0)
            wallet_wr[w] = wallet_wins.get(w, 0) / mc if mc > 0 else 0.0

        # Sort for rankings
        by_volume = sorted(wallet_list, key=lambda w: vol_rows[w].volume or 0, reverse=True)
        by_pnl = sorted(wallet_list, key=lambda w: wallet_pnl.get(w, 0.0), reverse=True)
        by_wr = sorted(wallet_list, key=lambda w: wallet_wr[w], reverse=True)

        rank_vol = {w: i for i, w in enumerate(by_volume, 1)}
        rank_pnl = {w: i for i, w in enumerate(by_pnl, 1)}
        rank_wr = {w: i for i, w in enumerate(by_wr, 1)}

        scores = []
        for w in wallet_list:
            scores.append(
                {
                    "wallet": w,
                    "category": "all",
                    "timeframe": tf_name,
                    "volume": vol_rows[w].volume or 0,
                    "pnl": wallet_pnl.get(w, 0.0),
                    "win_rate": wallet_wr[w],
                    "trade_count": vol_rows[w].trade_count,
                    "rank_volume": rank_vol[w],
                    "rank_pnl": rank_pnl[w],
                    "rank_win_rate": rank_wr[w],
                }
            )

        # Upsert scores in batches (asyncpg has a 32767 param limit)
        if scores:
            # Clear old scores for this timeframe
            await session.execute(
                delete(WalletScore).where(
                    WalletScore.timeframe == tf_name,
                    WalletScore.category == "all",
                )
            )

            batch_size = 3000  # 10 cols per row → 30k params per batch
            for i in range(0, len(scores), batch_size):
                batch = scores[i : i + batch_size]
                stmt = pg_insert(WalletScore).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["wallet", "category", "timeframe"],
                    set_={
                        "volume": stmt.excluded.volume,
                        "pnl": stmt.excluded.pnl,
                        "win_rate": stmt.excluded.win_rate,
                        "trade_count": stmt.excluded.trade_count,
                        "rank_volume": stmt.excluded.rank_volume,
                        "rank_pnl": stmt.excluded.rank_pnl,
                        "rank_win_rate": stmt.excluded.rank_win_rate,
                    },
                )
                await session.execute(stmt)
            total += len(scores)

    # ── Second pass: category="mentions" (only trades on mentions markets) ──
    mentions_cids_q = select(TrackedMarket.condition_id).where(TrackedMarket.category == "mentions")
    mentions_cids_result = await session.execute(mentions_cids_q)
    mentions_cids = {r[0] for r in mentions_cids_result.all()}

    if mentions_cids:
        for tf_name, delta in TIMEFRAMES.items():
            now = datetime.now(UTC)

            time_filter: list = [Trade.condition_id.in_(mentions_cids)]
            if delta:
                cutoff = now - delta
                cutoff_ts = int(cutoff.timestamp())
                time_filter.append(Trade.timestamp >= cutoff_ts)

            vol_q = (
                select(
                    Trade.wallet,
                    func.count().label("trade_count"),
                    func.sum(Trade.size * Trade.price).label("volume"),
                )
                .where(*time_filter)
                .group_by(Trade.wallet)
            )
            vol_rows = {r.wallet: r for r in (await session.execute(vol_q)).all()}
            if not vol_rows:
                continue

            pnl_q = (
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
                .where(*time_filter)
                .group_by(Trade.wallet, Trade.condition_id)
            )
            pnl_rows = (await session.execute(pnl_q)).all()

            wallet_pnl: dict[str, float] = {}
            wallet_wins: dict[str, int] = {}
            wallet_markets: dict[str, int] = {}
            for r in pnl_rows:
                wallet_pnl[r.wallet] = wallet_pnl.get(r.wallet, 0.0) + (r.market_pnl or 0.0)
                wallet_markets[r.wallet] = wallet_markets.get(r.wallet, 0) + 1
                if (r.market_pnl or 0.0) > 0:
                    wallet_wins[r.wallet] = wallet_wins.get(r.wallet, 0) + 1

            wallet_list = list(vol_rows.keys())

            wallet_wr: dict[str, float] = {}
            for w in wallet_list:
                mc = wallet_markets.get(w, 0)
                wallet_wr[w] = wallet_wins.get(w, 0) / mc if mc > 0 else 0.0

            by_volume = sorted(wallet_list, key=lambda w: vol_rows[w].volume or 0, reverse=True)
            by_pnl = sorted(wallet_list, key=lambda w: wallet_pnl.get(w, 0.0), reverse=True)
            by_wr = sorted(wallet_list, key=lambda w: wallet_wr[w], reverse=True)

            rank_vol = {w: i for i, w in enumerate(by_volume, 1)}
            rank_pnl = {w: i for i, w in enumerate(by_pnl, 1)}
            rank_wr = {w: i for i, w in enumerate(by_wr, 1)}

            scores = []
            for w in wallet_list:
                scores.append(
                    {
                        "wallet": w,
                        "category": "mentions",
                        "timeframe": tf_name,
                        "volume": vol_rows[w].volume or 0,
                        "pnl": wallet_pnl.get(w, 0.0),
                        "win_rate": wallet_wr[w],
                        "trade_count": vol_rows[w].trade_count,
                        "rank_volume": rank_vol[w],
                        "rank_pnl": rank_pnl[w],
                        "rank_win_rate": rank_wr[w],
                    }
                )

            if scores:
                await session.execute(
                    delete(WalletScore).where(
                        WalletScore.timeframe == tf_name,
                        WalletScore.category == "mentions",
                    )
                )

                batch_size = 3000
                for i in range(0, len(scores), batch_size):
                    batch = scores[i : i + batch_size]
                    stmt = pg_insert(WalletScore).values(batch)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["wallet", "category", "timeframe"],
                        set_={
                            "volume": stmt.excluded.volume,
                            "pnl": stmt.excluded.pnl,
                            "win_rate": stmt.excluded.win_rate,
                            "trade_count": stmt.excluded.trade_count,
                            "rank_volume": stmt.excluded.rank_volume,
                            "rank_pnl": stmt.excluded.rank_pnl,
                            "rank_win_rate": stmt.excluded.rank_win_rate,
                        },
                    )
                    await session.execute(stmt)
                total += len(scores)

    await session.commit()
    logger.info("computed %d wallet scores", total)
    return total


async def upsert_wallet(session: AsyncSession, address: str, trade_volume: float) -> None:
    """Create or update a wallet record when a trade is ingested."""
    stmt = pg_insert(Wallet).values(
        address=address,
        total_trades=1,
        total_volume=trade_volume,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["address"],
        set_={
            "last_seen": func.now(),
            "total_trades": Wallet.total_trades + 1,
            "total_volume": Wallet.total_volume + trade_volume,
        },
    )
    await session.execute(stmt)
