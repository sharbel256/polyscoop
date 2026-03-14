"""Resy API service using curl_cffi for browser TLS fingerprinting."""

import asyncio
import base64
import json
import logging
import time
import urllib.parse
from typing import Literal

from curl_cffi.requests import Session

logger = logging.getLogger(__name__)

API_KEY = "VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"
BASE_URL = "https://api.resy.com"
IMPERSONATE = "chrome120"
BASE_HEADERS = {
    "authorization": f'ResyAPI api_key="{API_KEY}"',
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.7",
    "cache-control": "no-cache",
    "origin": "https://resy.com",
    "referer": "https://resy.com/",
    "x-origin": "https://resy.com",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    ),
    "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "sec-gpc": "1",
}
GEO = {"latitude": 41.8827, "longitude": -87.6233, "radius": 40250}


# ── Custom exceptions ────────────────────────────────


class ResyHTTPError(Exception):
    """Raised when Resy returns a non-2xx status code."""

    def __init__(self, status_code: int, body: str = ""):
        self.status_code = status_code
        self.body = body
        super().__init__(f"HTTP {status_code}")


class ResyTimeoutError(Exception):
    """Raised when a Resy request times out."""


# ── Request helper ───────────────────────────────────


def create_session() -> Session:
    """Create a reusable session (for snipe bursts)."""
    return Session(impersonate=IMPERSONATE, default_headers=False)


HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "TRACE", "PATCH", "QUERY"]


def _resy_request(
    method: HttpMethod,
    path: str,
    headers: dict | None = None,
    data: str | None = None,
    cookies: dict | None = None,
    timeout: int = 30,
    session: Session | None = None,
):
    """Make a Resy API request with browser TLS fingerprint.

    If ``session`` is provided, reuses it (caller manages lifecycle).
    Otherwise creates a fresh session per request.

    Uses ``data=`` (pre-serialized) not ``json=`` so we control exact bytes.
    ``default_headers=False`` prevents Sec-Fetch-User injection that causes 500s.
    """
    url = BASE_URL + path
    merged = {**BASE_HEADERS, **(headers or {})}
    own_session = session is None
    if own_session:
        session = Session(impersonate=IMPERSONATE, default_headers=False)
    try:
        return session.request(
            method, url, headers=merged, data=data, cookies=cookies, timeout=timeout
        )
    except Exception as exc:
        if "timeout" in str(exc).lower() or "timed out" in str(exc).lower():
            raise ResyTimeoutError(str(exc)) from exc
        raise
    finally:
        if own_session:
            session.close()


def _check_status(resp, allowed: tuple[int, ...] = (200,)) -> None:
    """Raise ResyHTTPError if status code is not in allowed set."""
    if resp.status_code not in allowed:
        raise ResyHTTPError(resp.status_code, resp.text[:1000])


# ── Auth helpers ─────────────────────────────────────


def _auth_headers(jwt_token: str) -> dict[str, str]:
    return {"x-resy-auth-token": jwt_token, "x-resy-universal-auth": jwt_token}


def decode_jwt_exp(token: str) -> int | None:
    """Decode the exp claim from a JWT without verification. Returns epoch or None."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("exp")
    except Exception:
        return None


def is_token_expired(token: str, buffer_seconds: int = 3600) -> bool:
    """Check if a JWT expires within buffer_seconds from now."""
    exp = decode_jwt_exp(token)
    if exp is None:
        return True
    return time.time() + buffer_seconds >= exp


# ── API functions (all async, run sync curl_cffi in thread) ──


async def authenticate(email: str, password: str) -> tuple[str, str, str | None]:
    """Authenticate with Resy. Returns (jwt_token, legacy_token, refresh_token)."""

    def _call():
        body = urllib.parse.urlencode({"email": email, "password": password})
        resp = _resy_request(
            "POST",
            "/4/auth/password",
            headers={"content-type": "application/x-www-form-urlencoded"},
            data=body,
        )
        _check_status(resp)
        data = resp.json()
        token = data.get("token")
        legacy = data.get("legacy_token", "")
        if not token:
            raise ValueError("Authentication failed: no token returned")
        refresh = resp.cookies.get("production_refresh_token")
        return token, legacy, refresh

    return await asyncio.to_thread(_call)


async def refresh_access_token(refresh_token: str) -> tuple[str, str | None]:
    """Exchange a refresh token for a new access token."""

    def _call():
        resp = _resy_request(
            "POST",
            "/3/auth/refresh",
            cookies={"production_refresh_token": refresh_token},
        )
        _check_status(resp)
        data = resp.json()
        new_access = data.get("token")
        if not new_access:
            raise ValueError("Refresh failed: no token returned")
        new_refresh = resp.cookies.get("production_refresh_token")
        return new_access, new_refresh

    return await asyncio.to_thread(_call)


async def get_payment_method(jwt_token: str) -> int:
    """Fetch the user's default payment method id."""

    def _call():
        resp = _resy_request("GET", "/2/user", headers=_auth_headers(jwt_token))
        _check_status(resp)
        data = resp.json()
        pm_id = data.get("payment_method_id")
        if not pm_id:
            methods = data.get("payment_methods", [])
            if not methods:
                raise ValueError("No payment method on account")
            pm_id = methods[0]["id"]
        return pm_id

    return await asyncio.to_thread(_call)


async def search_venues(query: str, date: str, party_size: int) -> list[dict]:
    """Search for venues by name. No auth required — uses API key only."""

    def _call():
        payload = json.dumps(
            {
                "availability": True,
                "page": 1,
                "per_page": 10,
                "slot_filter": {"day": date, "party_size": party_size},
                "types": ["venue"],
                "order_by": "availability",
                "geo": GEO,
                "query": query,
            }
        )
        resp = _resy_request(
            "POST",
            "/3/venuesearch/search",
            headers={"content-type": "application/json"},
            data=payload,
        )
        _check_status(resp)
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

    return await asyncio.to_thread(_call)


async def find_slots(
    venue_id: int, date: str, party_size: int, session: Session | None = None
) -> list[dict]:
    """Get available slots for a venue. No auth required — uses API key only."""

    def _call():
        payload = json.dumps(
            {
                "lat": 0,
                "long": 0,
                "day": date,
                "party_size": party_size,
                "venue_id": venue_id,
            }
        )
        resp = _resy_request(
            "POST",
            "/4/find",
            headers={"content-type": "application/json"},
            data=payload,
            session=session,
        )
        _check_status(resp)

        data = resp.json()
        venues = data.get("results", {}).get("venues", [])
        if not venues:
            logger.info("Resy /4/find: no venues in response for venue_id=%s", venue_id)
            return []
        raw_slots = venues[0].get("slots", [])
        logger.info("Resy /4/find: %d raw slots for venue_id=%s", len(raw_slots), venue_id)
        slots = []
        for s in raw_slots:
            avail_id = s.get("availability", {}).get("id", 0)
            if avail_id == 1:
                continue
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

    return await asyncio.to_thread(_call)


async def find_slots_raw(venue_id: int, date: str, party_size: int) -> dict:
    """Raw /4/find response for admin debugging. Returns {status_code, body}."""

    def _call():
        payload = json.dumps(
            {
                "lat": 0,
                "long": 0,
                "day": date,
                "party_size": party_size,
                "venue_id": venue_id,
            }
        )
        resp = _resy_request(
            "POST",
            "/4/find",
            headers={"content-type": "application/json"},
            data=payload,
        )
        return {"status_code": resp.status_code, "body": resp.text}

    return await asyncio.to_thread(_call)


async def get_book_token(
    jwt_token: str,
    config_token: str,
    date: str,
    party_size: int,
    session: Session | None = None,
) -> str:
    """Exchange a config token for a one-time book token."""

    def _call():
        payload = json.dumps(
            {
                "commit": 1,
                "config_id": config_token,
                "day": date,
                "party_size": str(party_size),
            }
        )
        resp = _resy_request(
            "POST",
            "/3/details",
            headers={**_auth_headers(jwt_token), "content-type": "application/json"},
            data=payload,
            session=session,
        )
        _check_status(resp)
        token = resp.json().get("book_token", {}).get("value")
        if not token:
            raise ValueError("Failed to get book_token from /3/details")
        return token

    return await asyncio.to_thread(_call)


async def book_reservation(
    jwt_token: str, book_token: str, payment_method_id: int, session: Session | None = None
) -> dict:
    """Submit the booking. Returns confirmation dict."""

    def _call():
        pm_json = json.dumps({"id": payment_method_id})
        body = "&".join(
            [
                f"book_token={urllib.parse.quote(book_token, safe='')}",
                f"struct_payment_method={urllib.parse.quote(pm_json, safe='')}",
                "source_id=resy.com-venue-details",
                "venue_marketing_opt_in=0",
            ]
        )
        try:
            resp = _resy_request(
                "POST",
                "/3/book",
                headers={
                    **_auth_headers(jwt_token),
                    "content-type": "application/x-www-form-urlencoded",
                },
                data=body,
                session=session,
            )
        except Exception:
            logger.error(
                "/3/book request failed (timeout or network error)"
                " — booking may have succeeded on Resy side"
            )
            raise
        logger.info("/3/book response: status=%s body=%s", resp.status_code, resp.text[:1000])
        _check_status(resp)
        data = resp.json()
        if not data.get("reservation_id"):
            logger.warning("/3/book returned 200 but no reservation_id: %s", resp.text[:1000])
        return data

    return await asyncio.to_thread(_call)
