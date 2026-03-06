"""Background worker that processes scheduled Resy booking jobs."""

import asyncio
import logging
import random
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.encryption import decrypt
from app.db.engine import async_session
from app.db.models import ActivityLog, ResyJob, User
from app.services import resy


def _utcnow() -> datetime:
    """Naive UTC now — matches TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(UTC).replace(tzinfo=None)


logger = logging.getLogger(__name__)

LOOP_INTERVAL = 5  # seconds between scheduler ticks
SNIPE_BURST_INTERVAL_MIN = 0.8  # min seconds between snipe attempts
SNIPE_BURST_INTERVAL_MAX = 2.5  # max seconds between snipe attempts
SNIPE_BURST_DURATION = 30  # seconds to keep sniping


def _success_details(job_id, confirmation):
    return {
        "job_id": str(job_id),
        "reservation_id": confirmation.get("reservation_id"),
    }


def _time_to_minutes(t: str) -> int:
    """Convert HH:MM or HH:MM:SS to minutes since midnight."""
    parts = t.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _find_best_slot(slots: list[dict], desired_time: str, flex_minutes: int) -> dict | None:
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


async def _attempt_booking(job: ResyJob, user: User) -> dict | None:
    """Try to find a matching slot and book it. Returns confirmation or None."""
    jwt_token = decrypt(user.resy_jwt)  # type: ignore[arg-type]

    slots = await resy.find_slots(job.venue_id, job.date, job.party_size)
    flex = job.time_flex_minutes or 0
    matched = _find_best_slot(slots, job.desired_time, flex)
    if matched is None:
        return None

    book_token = await resy.get_book_token(
        jwt_token, matched["config_token"], job.date, job.party_size
    )
    return await resy.book_reservation(
        jwt_token,
        book_token,
        user.payment_method_id,  # type: ignore[arg-type]
    )


async def _process_job(job: ResyJob) -> None:
    """Process a single job: snipe or poll mode."""
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == job.user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.resy_jwt:
            logger.warning("job %s: user missing or no resy token", job.id)
            return

        now = _utcnow()

        if job.mode == "snipe":
            if job.snipe_at and job.snipe_at > now:
                return  # not time yet
            end = now.timestamp() + SNIPE_BURST_DURATION
            while asyncio.get_event_loop().time() < end and job.attempts < job.max_attempts:
                job.attempts += 1
                job.last_attempt_at = _utcnow()
                try:
                    confirmation = await _attempt_booking(job, user)
                    if confirmation:
                        job.status = "success"
                        job.result = confirmation
                        session.add(
                            ActivityLog(
                                user_id=user.id,
                                action="book_success",
                                details=_success_details(job.id, confirmation),
                            )
                        )
                        await session.merge(job)
                        await session.commit()
                        logger.info("job %s: booked successfully", job.id)
                        return
                except Exception:
                    logger.debug(
                        "job %s: attempt %d failed",
                        job.id,
                        job.attempts,
                        exc_info=True,
                    )
                session.add(
                    ActivityLog(
                        user_id=user.id,
                        action="book_attempt",
                        details={"job_id": str(job.id), "attempt": job.attempts},
                    )
                )
                await session.merge(job)
                await session.commit()
                delay = random.uniform(SNIPE_BURST_INTERVAL_MIN, SNIPE_BURST_INTERVAL_MAX)
                await asyncio.sleep(delay)

        elif job.mode == "poll":
            interval = job.poll_interval_seconds or 60
            if job.last_attempt_at and (now - job.last_attempt_at).total_seconds() < interval:
                return  # too soon
            job.attempts += 1
            job.last_attempt_at = now
            job.status = "active"
            try:
                confirmation = await _attempt_booking(job, user)
                if confirmation:
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
            except Exception:
                logger.debug(
                    "job %s: poll attempt %d failed",
                    job.id,
                    job.attempts,
                    exc_info=True,
                )
                session.add(
                    ActivityLog(
                        user_id=user.id,
                        action="book_attempt",
                        details={"job_id": str(job.id), "attempt": job.attempts},
                    )
                )

        # Check max attempts
        if job.attempts >= job.max_attempts and job.status not in (
            "success",
            "cancelled",
        ):
            job.status = "failed"
            logger.info("job %s: max attempts reached", job.id)

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

            for job in jobs:
                try:
                    await _process_job(job)
                except Exception:
                    logger.exception("error processing job %s", job.id)

        except Exception:
            logger.exception("resy scheduler tick failed")

        await asyncio.sleep(LOOP_INTERVAL)
