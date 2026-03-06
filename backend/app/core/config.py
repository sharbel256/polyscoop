"""Application configuration via environment variables."""

import os

from dotenv import load_dotenv

load_dotenv(override=False)


class Settings:
    """Thin wrapper that reads from the environment (already loaded via dotenv)."""

    # ── App ──────────────────────────────────────────────
    PROJECT_NAME = os.getenv("PROJECT_NAME", "polyscoop")
    API_V1_PREFIX = os.getenv("API_V1_PREFIX", "/api/v1")
    BACKEND_CORS_ORIGINS = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:5173")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    # ── Polymarket ───────────────────────────────────────
    POLYMARKET_BUILDER_API_KEY = os.getenv("POLYMARKET_BUILDER_API_KEY", "")
    POLYMARKET_BUILDER_SECRET = os.getenv("POLYMARKET_BUILDER_SECRET", "")
    POLYMARKET_BUILDER_PASSPHRASE = os.getenv("POLYMARKET_BUILDER_PASSPHRASE", "")
    POLYMARKET_CLOB_URL = os.getenv("POLYMARKET_CLOB_URL", "https://clob.polymarket.com")
    POLYMARKET_GAMMA_URL = os.getenv("POLYMARKET_GAMMA_URL", "https://gamma-api.polymarket.com")
    POLYMARKET_DATA_API_URL = os.getenv(
        "POLYMARKET_DATA_API_URL", "https://data-api.polymarket.com"
    )

    # ── Database & Cache ─────────────────────────────────
    _raw_db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/polyscoop",
    )
    # Normalize to asyncpg driver — the secret may use plain postgresql://
    if "+asyncpg" not in _raw_db_url:
        DATABASE_URL = _raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        DATABASE_URL = _raw_db_url
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    MENTIONS_TAG_SLUG = os.getenv("MENTIONS_TAG_SLUG", "mention-markets")

    # ── Auth & Encryption ────────────────────────────────
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    # generate FERNET_KEY via: python -c "from cryptography.fernet import Fernet; ..."
    FERNET_KEY = os.getenv("FERNET_KEY", "")
    RATE_LIMIT_PER_USER = int(os.getenv("RATE_LIMIT_PER_USER", "30"))
    RATE_LIMIT_GLOBAL = int(os.getenv("RATE_LIMIT_GLOBAL", "200"))


settings = Settings()
