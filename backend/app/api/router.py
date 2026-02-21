"""Central API router – collects all route modules."""

from fastapi import APIRouter

from app.api.routes import (
    builder,
    copytrade,
    health,
    live,
    markets,
    positions,
    prices,
    signing,
    signup,
    trades,
    wallets,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(signing.router)
api_router.include_router(builder.router)
api_router.include_router(markets.router)
api_router.include_router(positions.router)
api_router.include_router(trades.router)
api_router.include_router(prices.router)
api_router.include_router(wallets.router)
api_router.include_router(live.router)
api_router.include_router(copytrade.router)
api_router.include_router(signup.router)
