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

logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("polyscoop starting up")

    # Initialize database tables
    from app.db.engine import engine
    from app.db.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database tables ready")

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

    # Start background workers
    from app.workers.manager import start_workers, stop_workers

    await start_workers()

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
    await stop_workers()

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

# Middleware (applied in reverse order – correlation ID runs first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)
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
