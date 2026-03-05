"""Health check endpoint."""

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.db.engine import async_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(request: Request):
    db_status = "ok"
    redis_status = "ok"

    # Check Postgres (Supabase)
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"

    # Check Redis (Upstash)
    try:
        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            redis_status = "unavailable"
        else:
            await redis.ping()
    except Exception:
        redis_status = "unavailable"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status": overall,
        "service": "polyscoop",
        "db": db_status,
        "redis": redis_status,
    }
