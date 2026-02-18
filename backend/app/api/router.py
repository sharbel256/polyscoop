"""Central API router – collects all route modules."""

from fastapi import APIRouter

from app.api.routes import health, markets, positions, prices, signing, trades

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(signing.router)
api_router.include_router(markets.router)
api_router.include_router(positions.router)
api_router.include_router(trades.router)
api_router.include_router(prices.router)
