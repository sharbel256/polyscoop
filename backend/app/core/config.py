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


settings = Settings()
