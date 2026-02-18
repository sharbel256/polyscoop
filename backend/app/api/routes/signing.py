"""Remote builder signing endpoint – keeps builder credentials server-side."""

import hashlib
import hmac
import logging
import time

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.polymarket import SignRequest, SignResponse

router = APIRouter(prefix="/signing", tags=["signing"])
logger = logging.getLogger(__name__)


def _build_hmac_signature(
    secret: str,
    timestamp: int,
    method: str,
    path: str,
    body: str = "",
) -> str:
    """Replicate the HMAC-SHA256 signing from @polymarket/builder-signing-sdk."""
    message = f"{timestamp}{method}{path}{body}"
    is_hex = all(c in "0123456789abcdef" for c in secret.lower())
    key = bytes.fromhex(secret) if is_hex else secret.encode()
    sig = hmac.new(key, message.encode(), hashlib.sha256).hexdigest()
    return sig


@router.post("/sign", response_model=SignResponse)
async def sign_builder_request(payload: SignRequest):
    """
    Server-side HMAC signing for Polymarket builder requests.

    The frontend sends { method, path, body } and receives back the
    headers needed to authenticate as this builder.
    """
    if not settings.POLYMARKET_BUILDER_API_KEY:
        logger.error("sign_request_failed builder credentials not configured")
        raise HTTPException(status_code=503, detail="Builder credentials not configured")

    ts = str(int(time.time() * 1000))

    try:
        signature = _build_hmac_signature(
            secret=settings.POLYMARKET_BUILDER_SECRET,
            timestamp=int(ts),
            method=payload.method,
            path=payload.path,
            body=payload.body,
        )
    except Exception:
        logger.exception("sign_request_failed hmac computation error")
        raise HTTPException(status_code=500, detail="Signing computation failed")

    logger.debug("sign_request method=%s path=%s", payload.method, payload.path)

    return SignResponse(
        POLY_BUILDER_SIGNATURE=signature,
        POLY_BUILDER_TIMESTAMP=ts,
        POLY_BUILDER_API_KEY=settings.POLYMARKET_BUILDER_API_KEY,
        POLY_BUILDER_PASSPHRASE=settings.POLYMARKET_BUILDER_PASSPHRASE,
    )
