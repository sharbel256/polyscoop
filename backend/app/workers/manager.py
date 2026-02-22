"""Worker lifecycle manager — starts/stops background tasks in FastAPI lifespan."""

import asyncio
import logging

from app.workers import market_discovery, trade_listener, trade_poller, wallet_scorer

logger = logging.getLogger(__name__)

_tasks: list[asyncio.Task] = []  # type: ignore[type-arg]


async def start_workers() -> None:
    """Start all background worker tasks."""
    logger.info("starting background workers")
    _tasks.append(asyncio.create_task(market_discovery.run_forever(), name="market_discovery"))
    _tasks.append(asyncio.create_task(trade_poller.run_forever(), name="trade_poller"))
    _tasks.append(asyncio.create_task(wallet_scorer.run_forever(), name="wallet_scorer"))
    _tasks.append(asyncio.create_task(trade_listener.run_forever(), name="trade_listener"))
    logger.info("started %d workers", len(_tasks))


async def stop_workers() -> None:
    """Cancel all background worker tasks."""
    logger.info("stopping %d workers", len(_tasks))
    for task in _tasks:
        task.cancel()
    await asyncio.gather(*_tasks, return_exceptions=True)
    _tasks.clear()
    logger.info("all workers stopped")
