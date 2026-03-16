"""Authentication utilities: JWT token decode for rate limiting."""

from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
