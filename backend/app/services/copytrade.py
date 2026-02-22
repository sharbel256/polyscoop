"""Copy-trade signal detection and management."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CopytradeConfig, CopytradeExecution

logger = logging.getLogger(__name__)


async def check_copytrade_signals(session: AsyncSession, trade: dict) -> list[dict]:
    """Check if a trade matches any active copytrade configs.

    Returns a list of signal dicts to push to users via WebSocket.
    """
    wallet = trade.get("wallet", "").lower()
    if not wallet:
        return []

    # Find active configs targeting this wallet
    q = select(CopytradeConfig).where(
        CopytradeConfig.target_wallet == wallet,
        CopytradeConfig.enabled.is_(True),
    )
    result = await session.execute(q)
    configs = result.scalars().all()

    signals = []
    for config in configs:
        target_size = trade.get("size", 0)
        target_price = trade.get("price", 0)
        max_size = config.max_position_usd / max(target_price, 0.01)
        copy_size = min(target_size * config.fraction, max_size)

        # Create execution record
        execution = CopytradeExecution(
            config_id=config.id,
            user_address=config.user_address,
            target_wallet=wallet,
            source_trade_hash=trade.get("transaction_hash", ""),
            condition_id=trade.get("condition_id", ""),
            side=trade.get("side", ""),
            target_size=target_size,
            copy_size=copy_size,
            target_price=target_price,
            status="pending",
        )
        session.add(execution)
        await session.flush()

        signals.append(
            {
                "execution_id": execution.id,
                "config_id": config.id,
                "user_address": config.user_address,
                "target_wallet": wallet,
                "condition_id": trade.get("condition_id", ""),
                "side": trade.get("side", ""),
                "target_size": target_size,
                "copy_size": copy_size,
                "target_price": target_price,
                "title": trade.get("title", ""),
                "outcome": trade.get("outcome", ""),
            }
        )

    if signals:
        await session.commit()

    return signals
