"""Email signup endpoint for update notifications."""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db.models import User

router = APIRouter(prefix="/signup", tags=["signup"])
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    email: EmailStr


class SignupResponse(BaseModel):
    ok: bool
    message: str


@router.post("", response_model=SignupResponse)
async def signup_for_updates(
    body: SignupRequest,
    session: AsyncSession = Depends(get_session),
):
    """Register an email address for update notifications."""
    email = body.email.lower().strip()

    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        return SignupResponse(ok=True, message="you're already signed up!")

    user = User(email=email)
    session.add(user)
    await session.commit()

    logger.info("signup email=%s", email)
    return SignupResponse(ok=True, message="you're signed up for updates!")
