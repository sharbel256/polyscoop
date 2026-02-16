"""Central API router – collects all route modules."""

from fastapi import APIRouter

from app.api.routes import health, markets, signing

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(signing.router)
api_router.include_router(markets.router)
