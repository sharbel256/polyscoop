"""Async Resy API service using httpx."""

import json
import logging
import urllib.parse

import httpx

logger = logging.getLogger(__name__)

API_KEY = "VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"
BASE_URL = "https://api.resy.com"
BASE_HEADERS = {"authorization": f'ResyAPI api_key="{API_KEY}"'}
GEO = {"latitude": 41.8827, "longitude": -87.6233, "radius": 40250}

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers=BASE_HEADERS,
            timeout=httpx.Timeout(15.0),
        )
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


def _auth_headers(jwt_token: str) -> dict[str, str]:
    return {"x-resy-auth-token": jwt_token, "x-resy-universal-auth": jwt_token}


async def authenticate(email: str, password: str) -> tuple[str, str]:
    """Authenticate with Resy. Returns (jwt_token, legacy_token)."""
    client = get_client()
    resp = await client.post(
        "/4/auth/password",
        data={"email": email, "password": password},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    legacy = data.get("legacy_token", "")
    if not token:
        raise ValueError("Authentication failed: no token returned")
    return token, legacy


async def get_payment_method(jwt_token: str) -> int:
    """Fetch the user's default payment method id."""
    client = get_client()
    resp = await client.get("/2/user", headers=_auth_headers(jwt_token))
    resp.raise_for_status()
    data = resp.json()
    pm_id = data.get("payment_method_id")
    if not pm_id:
        methods = data.get("payment_methods", [])
        if not methods:
            raise ValueError("No payment method on account")
        pm_id = methods[0]["id"]
    return pm_id


async def search_venues(query: str, date: str, party_size: int) -> list[dict]:
    """Search for venues by name. No auth required — uses API key only."""
    client = get_client()
    resp = await client.post(
        "/3/venuesearch/search",
        json={
            "availability": True,
            "page": 1,
            "per_page": 10,
            "slot_filter": {"day": date, "party_size": party_size},
            "types": ["venue"],
            "order_by": "availability",
            "geo": GEO,
            "query": query,
        },
    )
    resp.raise_for_status()
    hits = resp.json().get("search", {}).get("hits", [])
    results = []
    for h in hits:
        raw_rating = h.get("rating")
        rating = raw_rating["average"] if isinstance(raw_rating, dict) else (raw_rating or 0)
        results.append(
            {
                "venue_id": h["id"]["resy"],
                "name": h.get("name") or "",
                "region": h.get("region") or "",
                "cuisine": h.get("cuisine") or [],
                "price_range": h.get("price_range") or 0,
                "rating": rating,
                "url_slug": h.get("url_slug") or "",
                "images": h.get("images") or [],
            }
        )
    return results


async def find_slots(venue_id: int, date: str, party_size: int) -> list[dict]:
    """Get available slots for a venue. No auth required — uses API key only."""
    client = get_client()
    resp = await client.post(
        "/4/find",
        json={
            "lat": 0,
            "long": 0,
            "day": date,
            "party_size": party_size,
            "venue_id": venue_id,
        },
    )
    # Resy returns 500 when there's no availability — treat as empty
    if resp.status_code >= 500:
        return []
    resp.raise_for_status()

    raw_slots = resp.json().get("results", {}).get("venues", [{}])[0].get("slots", [])
    slots = []
    for s in raw_slots:
        avail_id = s.get("availability", {}).get("id", 0)
        if avail_id == 1:
            continue  # unavailable
        start = s.get("date", {}).get("start", "")
        slot_time = start.split(" ")[-1] if " " in start else start
        slots.append(
            {
                "time": slot_time,
                "config_token": s.get("config", {}).get("token", ""),
                "type": s.get("config", {}).get("type", "") or "Dining Room",
                "availability_id": avail_id,
            }
        )
    return slots


async def get_book_token(jwt_token: str, config_token: str, date: str, party_size: int) -> str:
    """Exchange a config token for a one-time book token."""
    client = get_client()
    resp = await client.post(
        "/3/details",
        json={
            "commit": 1,
            "config_id": config_token,
            "day": date,
            "party_size": str(party_size),
        },
        headers={**_auth_headers(jwt_token), "content-type": "application/json"},
    )
    resp.raise_for_status()
    token = resp.json().get("book_token", {}).get("value")
    if not token:
        raise ValueError("Failed to get book_token from /3/details")
    return token


async def book_reservation(jwt_token: str, book_token: str, payment_method_id: int) -> dict:
    """Submit the booking. Returns confirmation dict."""
    client = get_client()
    pm_json = json.dumps({"id": payment_method_id})
    body = "&".join(
        [
            f"book_token={urllib.parse.quote(book_token, safe='')}",
            f"struct_payment_method={urllib.parse.quote(pm_json, safe='')}",
            "source_id=resy.com-venue-details",
            "venue_marketing_opt_in=0",
        ]
    )
    resp = await client.post(
        "/3/book",
        content=body,
        headers={**_auth_headers(jwt_token), "content-type": "application/x-www-form-urlencoded"},
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("reservation_id"):
        raise ValueError(f"Booking returned no reservation_id: {data}")
    return data
