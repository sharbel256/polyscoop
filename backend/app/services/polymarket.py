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


async def fetch_polymarket_profile(address: str) -> dict | None:
    """Fetch public profile (avatar + display name) for a wallet address.

    Returns {"profile_image_url": ..., "display_name": ...} or None on 404/error.
    """
    try:
        data = await gamma_get("/public-profile", params={"address": address})
        if not isinstance(data, dict):
            return None
        profile_image = data.get("profileImage") or None
        display_name = data.get("name") or data.get("pseudonym") or None
        if not profile_image and not display_name:
            return None
        return {"profile_image_url": profile_image, "display_name": display_name}
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return None
        logger.warning("profile fetch error for %s: %s", address, exc)
        return None
    except Exception:
        logger.warning("profile fetch failed for %s", address, exc_info=True)
        return None


async def clob_get(path: str, params: dict | None = None) -> dict | list:
    """GET request to CLOB API with rate limiting."""
    async with _semaphore:
        resp = await get_client().get(f"{settings.POLYMARKET_CLOB_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()
