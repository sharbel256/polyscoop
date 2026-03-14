"""Background worker that processes scheduled Resy booking jobs."""

import asyncio
import logging
import random
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from curl_cffi.requests import Session as CffiSession
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import async_session
from app.db.models import ActivityLog, ResyJob, User
from app.services import resy
from app.services.resy_token import ResyTokenExpired, ensure_fresh_resy_token


def _utcnow() -> datetime:
    """Naive UTC now — matches TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(UTC).replace(tzinfo=None)


logger = logging.getLogger(__name__)

LOOP_INTERVAL = 5  # seconds between scheduler ticks
SNIPE_BURST_INTERVAL_MIN = 0.8  # min seconds between snipe attempts
SNIPE_BURST_INTERVAL_MAX = 1.75  # max seconds between snipe attempts
SNIPE_BURST_DURATION = 45  # seconds to keep sniping
POLL_BACKOFF_MAX = 600  # max backoff cap for poll failures (10 min)

# Track consecutive poll failures per job for exponential backoff
_poll_failures: dict[str, int] = {}


def _success_details(job_id: uuid.UUID, confirmation: dict[str, Any]) -> dict[str, Any]:
    return {
        "job_id": str(job_id),
        "reservation_id": confirmation.get("reservation_id"),
    }


def _friendly_error(exc: Exception) -> str:
    """Convert an exception into a user-friendly message for job results."""
    if isinstance(exc, resy.ResyHTTPError):
        code = exc.status_code
        if code == 404:
            return "restaurant not found on resy"
        if code in (401, 403):
            return "resy session expired"
        if code >= 500:
            return "resy is temporarily unavailable"
        return "something went wrong with resy"
    if isinstance(exc, resy.ResyTimeoutError):
        return "resy took too long to respond"
    if isinstance(exc, ValueError):
        return str(exc)
    return "unexpected error"


def _time_to_minutes(t: str) -> int:
    """Convert HH:MM or HH:MM:SS to minutes since midnight."""
    parts = t.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _find_best_slot(
    slots: list[dict[str, Any]], desired_time: str, flex_minutes: int
) -> dict[str, Any] | None:
    """Find the slot closest to desired_time within the flex window."""
    desired = _time_to_minutes(desired_time)
    best = None
    best_diff = float("inf")
    for s in slots:
        slot_mins = _time_to_minutes(s["time"])
        diff = abs(slot_mins - desired)
        if diff <= flex_minutes and diff < best_diff:
            best = s
            best_diff = diff
    return best


class NoMatchingSlot(Exception):
    """No slot matched within the flex window."""

    def __init__(self, available: list[str]):
        self.available = available
        super().__init__("no matching slot")


async def _attempt_booking(
    job: ResyJob, user: User, session: CffiSession | None = None
) -> dict[str, Any]:
    """Try to find a matching slot and book it. Returns confirmation or raises."""
    assert user.resy_jwt is not None  # caller checks resy_jwt
    jwt_token = user.resy_jwt

    slots = await resy.find_slots(job.venue_id, job.date, job.party_size, session=session)
    logger.info("job %s: found %d slots", job.id, len(slots))
    flex = job.time_flex_minutes or 0
    matched = _find_best_slot(slots, job.desired_time, flex)
    if matched is None:
        logger.info("job %s: no slot within flex window", job.id)
        raise NoMatchingSlot([s["time"] for s in slots])

    logger.info("job %s: matched slot %s, getting book token", job.id, matched["time"])
    book_token = await resy.get_book_token(
        jwt_token, matched["config_token"], job.date, job.party_size, session=session
    )
    logger.info("job %s: got book token, submitting /3/book", job.id)
    return await resy.book_reservation(
        jwt_token,
        book_token,
        user.payment_method_id,  # type: ignore[arg-type]
        session=session,
    )


async def _run_attempt(
    job: ResyJob, user: User, session: AsyncSession, http_session: CffiSession | None = None
) -> bool:
    """Run one booking attempt. Returns True on success."""
    job.attempts += 1
    job.last_attempt_at = _utcnow()
    try:
        confirmation = await _attempt_booking(job, user, session=http_session)
        job.status = "success"
        job.result = confirmation
        session.add(
            ActivityLog(
                user_id=user.id,
                action="book_success",
                details=_success_details(job.id, confirmation),
            )
        )
        logger.info("job %s: booked successfully", job.id)
        return True
    except NoMatchingSlot as nms:
        job.result = {"available_slots": nms.available}
    except Exception as exc:
        job.result = {"error": _friendly_error(exc)}
        logger.warning("job %s: attempt %d failed: %s", job.id, job.attempts, exc, exc_info=True)
    session.add(
        ActivityLog(
            user_id=user.id,
            action="book_attempt",
            details={"job_id": str(job.id), "attempt": job.attempts, "result": job.result},
        )
    )
    return False


async def _process_snipe(job: ResyJob, user: User, session: AsyncSession) -> None:
    """Run snipe burst loop."""
    now = _utcnow()
    if job.snipe_at and job.snipe_at > now:
        return
    # Hard stop: snipe window expired on a previous burst
    if job.attempts > 0 and (
        job.snipe_at and (now - job.snipe_at).total_seconds() > SNIPE_BURST_DURATION
    ):
        if job.status not in ("success", "cancelled"):
            job.status = "exhausted"
            logger.info("job %s: snipe hard stop (attempts=%d)", job.id, job.attempts)
            await session.commit()
        return

    snipe_session = resy.create_session()
    try:
        end = time.monotonic() + SNIPE_BURST_DURATION
        while time.monotonic() < end:
            await session.refresh(job)
            if job.status not in ("pending", "active"):
                logger.info("job %s: cancelled mid-burst", job.id)
                return
            if await _run_attempt(job, user, session, http_session=snipe_session):
                await session.merge(job)
                await session.commit()
                return
            await session.merge(job)
            await session.commit()
            await asyncio.sleep(random.uniform(SNIPE_BURST_INTERVAL_MIN, SNIPE_BURST_INTERVAL_MAX))
        if job.status not in ("success", "cancelled"):
            job.status = "exhausted"
            logger.info("job %s: snipe burst finished after %d attempts", job.id, job.attempts)
    finally:
        snipe_session.close()


async def _process_poll(job: ResyJob, user: User, session: AsyncSession) -> None:
    """Run a single poll attempt with backoff."""
    now = _utcnow()
    base_interval = job.poll_interval_seconds or 60
    jid = str(job.id)
    failures = _poll_failures.get(jid, 0)
    interval = min(base_interval * (2**failures), POLL_BACKOFF_MAX)
    if job.last_attempt_at and (now - job.last_attempt_at).total_seconds() < interval:
        return  # too soon

    job.status = "active"
    if await _run_attempt(job, user, session):
        _poll_failures.pop(jid, None)
    elif job.result and "error" in job.result:
        # Real error — apply backoff
        _poll_failures[jid] = failures + 1
        next_interval = min(base_interval * (2 ** (failures + 1)), POLL_BACKOFF_MAX)
        next_attempt_at = _utcnow().timestamp() + next_interval
        job.result["next_attempt_in"] = next_interval
        job.result["next_attempt_at"] = datetime.fromtimestamp(next_attempt_at).isoformat()
    else:
        # NoMatchingSlot — reset backoff
        _poll_failures.pop(jid, None)

    if job.attempts >= job.max_attempts and job.status not in ("success", "cancelled"):
        job.status = "exhausted"
        _poll_failures.pop(jid, None)
        logger.info("job %s: max attempts reached", job.id)


async def _process_job(job: ResyJob) -> None:
    """Process a single job: snipe or poll mode."""
    from app.core.logging import correlation_id_ctx

    correlation_id_ctx.set(job.trace_id or f"job-{job.id}")

    async with async_session() as session:
        result = await session.execute(select(ResyJob).where(ResyJob.id == job.id))
        fresh_job = result.scalar_one_or_none()
        if fresh_job is None:
            return
        job = fresh_job
        if job.status not in ("pending", "active"):
            _poll_failures.pop(str(job.id), None)
            return

        result = await session.execute(select(User).where(User.id == job.user_id))
        user = result.scalar_one_or_none()
        if user is None:
            logger.warning("job %s: user missing", job.id)
            return

        try:
            await ensure_fresh_resy_token(user, session)
        except ResyTokenExpired:
            logger.warning("job %s: resy token expired, marking failed", job.id)
            job.status = "failed"
            job.result = {"error": "resy session expired — please re-login"}
            session.add(
                ActivityLog(
                    user_id=user.id,
                    action="book_failed",
                    details={"job_id": str(job.id), "error": "resy_token_expired"},
                )
            )
            await session.merge(job)
            await session.commit()
            return

        if job.mode == "snipe":
            await _process_snipe(job, user, session)
        elif job.mode == "poll":
            await _process_poll(job, user, session)

        await session.merge(job)
        await session.commit()


async def run_forever() -> None:
    """Main scheduler loop — runs every LOOP_INTERVAL seconds."""
    logger.info("resy scheduler started")
    while True:
        try:
            async with async_session() as session:
                result = await session.execute(
                    select(ResyJob).where(ResyJob.status.in_(["pending", "active"]))
                )
                jobs = result.scalars().all()

            async def _safe_process(j: ResyJob) -> None:
                try:
                    await _process_job(j)
                except Exception as exc:
                    logger.exception("error processing job %s", j.id)
                    try:
                        async with async_session() as err_session:
                            r = await err_session.execute(select(ResyJob).where(ResyJob.id == j.id))
                            err_job = r.scalar_one_or_none()
                            if err_job and err_job.status in ("pending", "active"):
                                err_job.status = "failed"
                                err_job.result = {"error": _friendly_error(exc)}
                                await err_session.commit()
                    except Exception:
                        logger.exception("failed to mark job %s as failed", j.id)

            await asyncio.gather(*[_safe_process(j) for j in jobs])

        except Exception:
            logger.exception("resy scheduler tick failed")

        await asyncio.sleep(LOOP_INTERVAL)
