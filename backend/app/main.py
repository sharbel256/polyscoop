"""polyscoop FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import CorrelationIdMiddleware
from app.core.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def _run_migrations() -> None:
    """Run alembic migrations synchronously before the event loop starts."""
    from alembic.config import Config

    from alembic import command

    try:
        alembic_cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
        # Set a connect timeout so we don't hang if the DB is unreachable
        from app.core.config import settings as cfg

        sync_url = cfg.DATABASE_URL.replace("+asyncpg", "")
        params = []
        if "connect_timeout" not in sync_url:
            params.append("connect_timeout=10")
        if "localhost" not in sync_url and "sslmode" not in sync_url:
            params.append("sslmode=require")
        if params:
            sep = "&" if "?" in sync_url else "?"
            sync_url += sep + "&".join(params)
        alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
        command.upgrade(alembic_cfg, "head")
    except Exception:
        logging.getLogger(__name__).warning("migrations skipped — database not available")


_run_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    from app.core.telemetry import setup_telemetry

    otel_shutdown = setup_telemetry(app)

    logger.info("polyscoop starting up")

    from app.db.engine import engine

    logger.info("database migrations applied")

    # Initialize Redis
    import redis.asyncio as aioredis

    from app.core.config import settings as cfg

    app.state.redis = aioredis.from_url(cfg.REDIS_URL, decode_responses=True)
    try:
        await app.state.redis.ping()  # type: ignore[reportGeneralTypeIssues]
        logger.info("redis connected")
    except Exception:
        logger.warning("redis not available — live features disabled")
        app.state.redis = None

    # Background workers paused — uncomment to re-enable data ingestion
    # from app.workers.manager import start_workers, stop_workers
    # await start_workers()

    # Resy scheduler managed at runtime via admin API
    app.state.resy_scheduler = None

    # Initialize shared httpx client
    from app.services.polymarket import get_client

    get_client()

    if FRONTEND_DIST.exists():
        logger.info("serving frontend from %s", FRONTEND_DIST)
    else:
        logger.warning(
            "frontend dist not found at %s – run 'just build-frontend'",
            FRONTEND_DIST,
        )
    yield

    # Shutdown
    logger.info("polyscoop shutting down")
    if otel_shutdown:
        otel_shutdown()
    # await stop_workers()

    from app.services.polymarket import close_client

    await close_client()

    if app.state.redis:
        await app.state.redis.aclose()

    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Exception handlers
register_exception_handlers(app)

# Middleware (last added = outermost; correlation ID must be outermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Serve frontend static build if present
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(FRONTEND_DIST / "assets")),
            name="assets",
        )

    @app.get("/{path:path}")
    async def serve_frontend(request: Request, path: str):
        """Serve static files or fall back to index.html for SPA routing."""
        if path:
            file = (FRONTEND_DIST / path).resolve()
            # Prevent path traversal – resolved path must stay inside dist
            if file.is_relative_to(FRONTEND_DIST) and file.is_file():
                return FileResponse(str(file))

        index = FRONTEND_DIST / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(str(index))
