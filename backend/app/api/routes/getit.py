"""Getit (Resy) routes — hidden booking tool at /getit."""

import asyncio
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, hash_password, require_admin, verify_password
from app.db.engine import get_session
from app.db.models import ActivityLog, ResyJob, User
from app.schemas.getit import (
    ActivityEntry,
    AdminUserSummary,
    AdminUserUpdate,
    BookRequest,
    BookResponse,
    JobCreate,
    JobResponse,
    JobRun,
    JobUpdate,
    LoginRequest,
    LoginResponse,
    SlotResult,
    UserProfile,
    VenueResult,
    WorkerStatus,
    WorkerUpdate,
)
from app.services import resy
from app.services.resy_token import ResyTokenExpired, ensure_fresh_resy_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/getit", tags=["getit"])


# ── Helpers ───────────────────────────────────────────


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


async def _log_activity(
    session: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    details: dict | None = None,
    ip: str | None = None,
) -> None:
    session.add(ActivityLog(user_id=user_id, action=action, details=details, ip_address=ip))
    await session.flush()


def _as_utc(dt: datetime | None) -> datetime | None:
    """Tag a naive datetime as UTC so Pydantic serializes with +00:00."""
    if dt is None:
        return None
    return dt.replace(tzinfo=UTC)


def _user_profile(user: User) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        resy_connected=user.resy_jwt is not None,
        resy_token_updated_at=_as_utc(user.resy_token_updated_at),
    )


def _create_access_token(user: User) -> str:
    from app.core.auth import create_access_token

    return create_access_token(user.id, user.is_admin)


def _safe_resy_error(exc: Exception) -> str:
    """Return a user-friendly error message from a Resy exception."""
    if isinstance(exc, resy.ResyHTTPError):
        code = exc.status_code
        if code == 404:
            return "restaurant not found on resy"
        if code in (401, 403):
            return "resy session expired — please re-login"
        if code >= 500:
            return "resy is temporarily unavailable"
        return "something went wrong with resy"
    if isinstance(exc, resy.ResyTimeoutError):
        return "resy took too long to respond"
    if isinstance(exc, ValueError):
        return str(exc)
    return "something went wrong with resy"


# ── Auth ──────────────────────────────────────────────


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Authenticate via Resy, upsert platform user, return platform JWT.

    If the user already has a valid (non-expired) Resy token and a stored
    password hash, we verify locally and skip the Resy API call entirely.
    """
    email = body.email.lower()
    result = await session.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    now = datetime.now(UTC).replace(tzinfo=None)

    # Fast path: reuse existing Resy token if still valid
    if (
        user is not None
        and user.password_hash
        and verify_password(body.password, user.password_hash)
        and user.resy_jwt
        and not resy.is_token_expired(user.resy_jwt)
    ):
        await _log_activity(session, user.id, "login", ip=_client_ip(request))
        await session.commit()
        if not user.is_active:
            raise HTTPException(status_code=403, detail="account pending admin approval")
        token = _create_access_token(user)
        return LoginResponse(token=token, user=_user_profile(user))

    # Slow path: authenticate with Resy API
    try:
        resy_jwt, resy_legacy, resy_refresh = await resy.authenticate(body.email, body.password)
    except Exception as exc:
        logger.warning("Resy authentication failed for %s: %s", email, exc)
        raise HTTPException(
            status_code=401,
            detail=_safe_resy_error(exc),
        ) from exc

    try:
        payment_id = await resy.get_payment_method(resy_jwt)
    except Exception:
        payment_id = None

    pw_hash = hash_password(body.password)

    if user is None:
        user = User(
            email=email,
            password_hash=pw_hash,
            is_active=False,
            resy_jwt=resy_jwt,
            resy_legacy_token=resy_legacy,
            resy_refresh_token=resy_refresh,
            payment_method_id=payment_id,
            resy_token_updated_at=now,
        )
        session.add(user)
    else:
        user.password_hash = pw_hash
        user.resy_jwt = resy_jwt
        user.resy_legacy_token = resy_legacy
        user.resy_refresh_token = resy_refresh
        user.payment_method_id = payment_id
        user.resy_token_updated_at = now

    await session.commit()
    await session.refresh(user)

    await _log_activity(session, user.id, "login", ip=_client_ip(request))
    await session.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="account pending admin approval")

    token = _create_access_token(user)
    return LoginResponse(token=token, user=_user_profile(user))


@router.get("/me", response_model=UserProfile)
async def me(user: User = Depends(get_current_user)):
    return _user_profile(user)


@router.post("/logout")
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Log the user out (Resy tokens are preserved for other sessions/scheduler)."""
    await _log_activity(session, user.id, "logout", ip=_client_ip(request))
    await session.commit()
    return {"ok": True}


# ── Search & Book ─────────────────────────────────────


@router.get("/search", response_model=list[VenueResult])
async def search_venues(
    request: Request,
    query: str = Query(..., min_length=1),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    party_size: int = Query(..., ge=1),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        venues = await resy.search_venues(query, date, party_size)
    except Exception as exc:
        logger.warning("Resy search failed (query=%s, date=%s): %s", query, date, exc)
        raise HTTPException(status_code=502, detail=_safe_resy_error(exc)) from exc
    await _log_activity(
        session,
        user.id,
        "search_venue",
        details={"query": query, "date": date, "party_size": party_size},
        ip=_client_ip(request),
    )
    await session.commit()
    return venues


@router.get("/venues/{venue_id}/slots", response_model=list[SlotResult])
async def get_slots(
    venue_id: int,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    party_size: int = Query(..., ge=1),
    _user: User = Depends(get_current_user),
):
    try:
        slots = await resy.find_slots(venue_id, date, party_size)
    except Exception as exc:
        logger.warning("Resy slot fetch failed (venue_id=%s, date=%s): %s", venue_id, date, exc)
        raise HTTPException(status_code=502, detail=_safe_resy_error(exc)) from exc
    return slots


@router.post("/book", response_model=BookResponse)
async def book_now(
    body: BookRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not user.payment_method_id:
        raise HTTPException(status_code=400, detail="Payment method missing")
    try:
        jwt_token = await ensure_fresh_resy_token(user, session)
    except ResyTokenExpired:
        raise HTTPException(
            status_code=401, detail="Resy session expired — please re-login"
        ) from None
    try:
        book_token = await resy.get_book_token(
            jwt_token, body.config_token, body.date, body.party_size
        )
        confirmation = await resy.book_reservation(jwt_token, book_token, user.payment_method_id)
    except Exception as exc:
        logger.warning("Resy booking failed (venue_id=%s): %s", body.venue_id, exc)
        await _log_activity(
            session,
            user.id,
            "book_failed",
            details={"venue_id": body.venue_id, "error": str(exc)},
            ip=_client_ip(request),
        )
        await session.commit()
        raise HTTPException(status_code=502, detail=_safe_resy_error(exc)) from exc

    await _log_activity(
        session,
        user.id,
        "book_success",
        details={"venue_id": body.venue_id, "reservation_id": confirmation.get("reservation_id")},
        ip=_client_ip(request),
    )
    await session.commit()
    return BookResponse(
        reservation_id=confirmation["reservation_id"],
        details=confirmation,
    )


# ── Stats ─────────────────────────────────────────────


@router.get("/stats")
async def job_stats(
    request: Request,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(ResyJob.status, func.count()).group_by(ResyJob.status))
    counts: dict[str, int] = {row[0]: row[1] for row in result.all()}
    task = request.app.state.resy_scheduler
    last_check = None
    if resy.last_resy_check:
        lc = resy.last_resy_check
        last_check = {
            "status_code": lc.get("status_code"),
            "at": lc.get("at"),
            "ok": lc.get("status_code") == 200,
        }
    return {
        "pending": counts.get("pending", 0),
        "active": counts.get("active", 0),
        "scheduler_active": task is not None and not task.done(),
        "last_resy_check": last_check,
    }


# ── Jobs ──────────────────────────────────────────────


@router.post("/jobs", response_model=JobResponse, status_code=201)
async def create_job(
    body: JobCreate,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Enforce 1 active job per non-admin user
    if not user.is_admin:
        existing = await session.execute(
            select(ResyJob).where(
                ResyJob.user_id == user.id,
                ResyJob.status.in_(["pending", "active"]),
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=409,
                detail="You already have an active job. Cancel it first.",
            )

    from app.core.logging import correlation_id_ctx

    job = ResyJob(
        user_id=user.id,
        venue_name=body.venue_name,
        venue_id=body.venue_id,
        date=body.date,
        desired_time=body.desired_time,
        party_size=body.party_size,
        mode=body.mode,
        snipe_at=body.snipe_at.replace(tzinfo=None) if body.snipe_at else None,
        poll_interval_seconds=body.poll_interval_seconds,
        time_flex_minutes=body.time_flex_minutes,
        max_attempts=body.max_attempts,
        trace_id=correlation_id_ctx.get("-"),
    )
    session.add(job)
    await _log_activity(
        session,
        user.id,
        "job_created",
        details={"venue_name": body.venue_name, "mode": body.mode},
        ip=_client_ip(request),
    )
    await session.commit()
    await session.refresh(job)
    return _job_response(job)


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(ResyJob).where(ResyJob.user_id == user.id)
    query = query.order_by(ResyJob.created_at.desc()).limit(3)
    result = await session.execute(query)
    jobs = result.scalars().all()
    responses = []
    for j in jobs:
        runs = await _fetch_runs(session, j.id)
        responses.append(_job_response(j, runs))
    return responses


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    job = await _get_user_job(session, job_id, user)
    runs = await _fetch_runs(session, job.id)
    return _job_response(job, runs)


@router.patch("/jobs/{job_id}", response_model=JobResponse)
async def cancel_job(
    job_id: uuid.UUID,
    body: JobUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    job = await _get_user_job(session, job_id, user)
    if body.status == "cancelled" and job.status in ("pending", "active"):
        job.status = "cancelled"
        await _log_activity(
            session,
            user.id,
            "job_cancelled",
            details={"job_id": str(job_id)},
            ip=_client_ip(request),
        )
        await session.commit()
        await session.refresh(job)
    runs = await _fetch_runs(session, job.id)
    return _job_response(job, runs)


# ── Activity ──────────────────────────────────────────


@router.get("/activity", response_model=list[ActivityEntry])
async def get_activity(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(ActivityLog)
    if not user.is_admin:
        query = query.where(ActivityLog.user_id == user.id)
    query = query.order_by(ActivityLog.created_at.desc()).limit(limit)
    result = await session.execute(query)
    return result.scalars().all()


# ── Admin ─────────────────────────────────────────────


@router.get("/admin/users", response_model=list[AdminUserSummary])
async def admin_list_users(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/admin/users/{user_id}", response_model=AdminUserSummary)
async def admin_update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if body.is_admin is not None:
        target.is_admin = body.is_admin
    if body.is_active is not None:
        target.is_active = body.is_active
    await session.commit()
    await session.refresh(target)
    return target


@router.get("/admin/jobs", response_model=list[JobResponse])
async def admin_list_jobs(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    query = select(ResyJob).order_by(ResyJob.created_at.desc())
    result = await session.execute(query)
    jobs = result.scalars().all()
    responses = []
    for j in jobs:
        runs = await _fetch_runs(session, j.id)
        responses.append(_job_response(j, runs))
    return responses


@router.get("/admin/jobs/{job_id}/find")
async def admin_debug_find(
    job_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """Run a raw /4/find for a job's venue/date/party_size and return the response."""
    result = await session.execute(select(ResyJob).where(ResyJob.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return await resy.find_slots_raw(job.venue_id, job.date, job.party_size)


# ── Workers ───────────────────────────────────────────


@router.get("/admin/workers", response_model=WorkerStatus)
async def admin_worker_status(
    request: Request,
    _admin: User = Depends(require_admin),
):
    task = request.app.state.resy_scheduler
    return WorkerStatus(resy_scheduler=task is not None and not task.done())


@router.post("/admin/workers", response_model=WorkerStatus)
async def admin_toggle_workers(
    body: WorkerUpdate,
    request: Request,
    _admin: User = Depends(require_admin),
):
    task = request.app.state.resy_scheduler

    if body.resy_scheduler:
        # Start if not already running
        if task is None or task.done():
            from app.workers.resy_scheduler import run_forever

            request.app.state.resy_scheduler = asyncio.create_task(run_forever())
            logger.info("resy scheduler started via admin API")
    else:
        # Stop if running
        if task is not None and not task.done():
            task.cancel()
            request.app.state.resy_scheduler = None
            logger.info("resy scheduler stopped via admin API")

    task = request.app.state.resy_scheduler
    return WorkerStatus(resy_scheduler=task is not None and not task.done())


# ── Internal helpers ──────────────────────────────────


async def _fetch_runs(session: AsyncSession, job_id: uuid.UUID, limit: int = 5) -> list[JobRun]:
    """Fetch the last N activity log entries for a job."""
    result = await session.execute(
        select(ActivityLog)
        .where(
            ActivityLog.action.in_(["book_attempt", "book_success", "book_failed"]),
            ActivityLog.details["job_id"].astext == str(job_id),
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return [
        JobRun(
            attempt=log.details.get("attempt", 0) if log.details else 0,
            action=log.action,
            timestamp=_as_utc(log.created_at),  # type: ignore[arg-type]
            details=log.details,
        )
        for log in result.scalars().all()
    ]


def _job_response(job: ResyJob, runs: list[JobRun] | None = None) -> JobResponse:
    return JobResponse(
        id=job.id,
        venue_name=job.venue_name,
        venue_id=job.venue_id,
        date=job.date,
        desired_time=job.desired_time,
        party_size=job.party_size,
        mode=job.mode,
        snipe_at=_as_utc(job.snipe_at),
        poll_interval_seconds=job.poll_interval_seconds,
        time_flex_minutes=job.time_flex_minutes,
        status=job.status,
        attempts=job.attempts,
        max_attempts=job.max_attempts,
        last_attempt_at=_as_utc(job.last_attempt_at),
        result=job.result,
        runs=runs or [],
        created_at=_as_utc(job.created_at),  # type: ignore[arg-type]
        updated_at=_as_utc(job.updated_at),  # type: ignore[arg-type]
    )


async def _get_user_job(session: AsyncSession, job_id: uuid.UUID, user: User) -> ResyJob:
    result = await session.execute(select(ResyJob).where(ResyJob.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if not user.is_admin and job.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your job")
    return job
