"""Copy-trade configuration and execution endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db.models import CopytradeConfig, CopytradeExecution

router = APIRouter(prefix="/copytrade", tags=["copytrade"])
logger = logging.getLogger(__name__)


class CreateConfigRequest(BaseModel):
    user_address: str
    target_wallet: str
    fraction: float = 0.5
    max_position_usd: float = 100.0
    daily_limit_usd: float = 500.0
    delay_seconds: int = 0
    slippage_tolerance: float = 0.05
    cooldown_seconds: int = 60
    filters: dict = {}


class UpdateConfigRequest(BaseModel):
    fraction: float | None = None
    max_position_usd: float | None = None
    daily_limit_usd: float | None = None
    delay_seconds: int | None = None
    slippage_tolerance: float | None = None
    cooldown_seconds: int | None = None
    enabled: bool | None = None
    filters: dict | None = None


@router.post("/configs")
async def create_config(
    req: CreateConfigRequest,
    session: AsyncSession = Depends(get_session),
):
    """Create a new copy-trade configuration."""
    config = CopytradeConfig(
        user_address=req.user_address.lower(),
        target_wallet=req.target_wallet.lower(),
        fraction=req.fraction,
        max_position_usd=req.max_position_usd,
        daily_limit_usd=req.daily_limit_usd,
        delay_seconds=req.delay_seconds,
        slippage_tolerance=req.slippage_tolerance,
        cooldown_seconds=req.cooldown_seconds,
        filters=req.filters,
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)

    return _config_to_dict(config)


@router.get("/configs")
async def list_configs(
    user_address: str = Query(pattern=r"^0x[a-fA-F0-9]{40}$"),
    session: AsyncSession = Depends(get_session),
):
    """List user's copy-trade configurations."""
    q = select(CopytradeConfig).where(CopytradeConfig.user_address == user_address.lower())
    result = await session.execute(q)
    configs = result.scalars().all()

    return {"configs": [_config_to_dict(c) for c in configs]}


@router.patch("/configs/{config_id}")
async def update_config(
    config_id: int,
    req: UpdateConfigRequest,
    user_address: str = Query(pattern=r"^0x[a-fA-F0-9]{40}$"),
    session: AsyncSession = Depends(get_session),
):
    """Update or toggle a copy-trade configuration."""
    config = await session.get(CopytradeConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    if config.user_address != user_address.lower():
        raise HTTPException(status_code=403, detail="Not your config")

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(config, field, value)

    await session.commit()
    await session.refresh(config)

    return _config_to_dict(config)


@router.delete("/configs/{config_id}")
async def delete_config(
    config_id: int,
    user_address: str = Query(pattern=r"^0x[a-fA-F0-9]{40}$"),
    session: AsyncSession = Depends(get_session),
):
    """Delete a copy-trade configuration."""
    config = await session.get(CopytradeConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    if config.user_address != user_address.lower():
        raise HTTPException(status_code=403, detail="Not your config")

    await session.delete(config)
    await session.commit()

    return {"deleted": True}


@router.get("/history")
async def execution_history(
    user_address: str = Query(pattern=r"^0x[a-fA-F0-9]{40}$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Execution log for a user's copy trades."""
    q = (
        select(CopytradeExecution)
        .where(CopytradeExecution.user_address == user_address.lower())
        .order_by(CopytradeExecution.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(q)
    executions = result.scalars().all()

    count_q = (
        select(func.count())
        .select_from(CopytradeExecution)
        .where(CopytradeExecution.user_address == user_address.lower())
    )
    total = (await session.execute(count_q)).scalar() or 0

    return {
        "executions": [
            {
                "id": e.id,
                "config_id": e.config_id,
                "target_wallet": e.target_wallet,
                "source_trade_hash": e.source_trade_hash,
                "condition_id": e.condition_id,
                "side": e.side,
                "target_size": e.target_size,
                "copy_size": e.copy_size,
                "target_price": e.target_price,
                "executed_price": e.executed_price,
                "slippage": e.slippage,
                "status": e.status,
                "reason": e.reason,
                "pnl": e.pnl,
                "created_at": e.created_at.isoformat(),
            }
            for e in executions
        ],
        "total": total,
    }


def _config_to_dict(config: CopytradeConfig) -> dict:
    return {
        "id": config.id,
        "user_address": config.user_address,
        "target_wallet": config.target_wallet,
        "fraction": config.fraction,
        "max_position_usd": config.max_position_usd,
        "daily_limit_usd": config.daily_limit_usd,
        "delay_seconds": config.delay_seconds,
        "slippage_tolerance": config.slippage_tolerance,
        "cooldown_seconds": config.cooldown_seconds,
        "enabled": config.enabled,
        "filters": config.filters,
        "created_at": config.created_at.isoformat(),
    }
