"""Shared Polymarket HTTP client with connection pooling and rate limiting."""

import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Rate limit: 200 requests per 10 seconds across all endpoints
_semaphore = asyncio.Semaphore(20)
_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return the singleton httpx client. Must be called after startup."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _client


async def close_client() -> None:
    """Close the singleton client on shutdown."""
    global _client
    if _client:
        await _client.aclose()
        _client = None


async def gamma_get(path: str, params: dict | None = None) -> dict | list:
    """GET request to Gamma API with rate limiting."""
    async with _semaphore:
        resp = await get_client().get(f"{settings.POLYMARKET_GAMMA_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()


async def data_api_get(path: str, params: dict | None = None) -> dict | list:
    """GET request to Data API with rate limiting."""
    async with _semaphore:
        resp = await get_client().get(f"{settings.POLYMARKET_DATA_API_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()


async def clob_get(path: str, params: dict | None = None) -> dict | list:
    """GET request to CLOB API with rate limiting."""
    async with _semaphore:
        resp = await get_client().get(f"{settings.POLYMARKET_CLOB_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()
