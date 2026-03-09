"""Pydantic schemas for the getit (Resy) feature."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr  # noqa: I001

# ── Auth ──────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserProfile"


class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    resy_connected: bool
    resy_token_updated_at: datetime | None


# ── Venues & Slots ───────────────────────────────────


class VenueResult(BaseModel):
    venue_id: int
    name: str
    region: str
    cuisine: list[str]
    price_range: int
    rating: float
    url_slug: str
    images: list[str]


class SlotResult(BaseModel):
    time: str
    config_token: str
    type: str
    availability_id: int


class BookRequest(BaseModel):
    venue_id: int
    config_token: str
    date: str
    party_size: int


class BookResponse(BaseModel):
    reservation_id: int
    details: dict


# ── Jobs ─────────────────────────────────────────────


class JobCreate(BaseModel):
    venue_name: str
    venue_id: int
    date: str
    desired_time: str
    party_size: int
    mode: str  # "snipe" | "poll"
    snipe_at: datetime | None = None
    poll_interval_seconds: int | None = None
    time_flex_minutes: int = 0
    max_attempts: int = 50


class JobRun(BaseModel):
    attempt: int
    action: str
    timestamp: datetime
    details: dict | None


class JobResponse(BaseModel):
    id: uuid.UUID
    venue_name: str
    venue_id: int
    date: str
    desired_time: str
    party_size: int
    mode: str
    snipe_at: datetime | None
    poll_interval_seconds: int | None
    time_flex_minutes: int
    status: str
    attempts: int
    max_attempts: int
    last_attempt_at: datetime | None
    result: dict | None
    runs: list[JobRun]
    created_at: datetime
    updated_at: datetime


class JobUpdate(BaseModel):
    status: str  # only "cancelled" expected from user


# ── Activity ─────────────────────────────────────────


class ActivityEntry(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    details: dict | None
    ip_address: str | None
    created_at: datetime


# ── Admin ────────────────────────────────────────────


class AdminUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime


class AdminUserUpdate(BaseModel):
    is_admin: bool | None = None
    is_active: bool | None = None


# ── Workers ─────────────────────────────────────────


class WorkerStatus(BaseModel):
    resy_scheduler: bool


class WorkerUpdate(BaseModel):
    resy_scheduler: bool
