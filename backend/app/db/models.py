"""ORM models for polyscoop data layer."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TrackedMarket(Base):
    """Markets we're actively ingesting trades for."""

    __tablename__ = "tracked_markets"

    condition_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    question: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), default="")
    image: Mapped[str] = mapped_column(Text, default="")
    token_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    event_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Trade(Base):
    """Every trade on tracked markets."""

    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transaction_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    asset_id: Mapped[str] = mapped_column(String(128), nullable=False)
    condition_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    wallet: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    side: Mapped[str] = mapped_column(String(4), nullable=False)  # BUY / SELL
    size: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), default="")
    title: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("transaction_hash", "asset_id", name="uq_trade_tx_asset"),
        Index("ix_trades_wallet_ts", "wallet", "timestamp"),
    )


class Wallet(Base):
    """Discovered trader profiles."""

    __tablename__ = "wallets"

    address: Mapped[str] = mapped_column(String(42), primary_key=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_seen: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    total_volume: Mapped[float] = mapped_column(Float, default=0.0)
    labels: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    profile_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    profile_fetched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class WalletScore(Base):
    """Pre-computed rankings per timeframe."""

    __tablename__ = "wallet_scores"

    wallet: Mapped[str] = mapped_column(String(42), primary_key=True)
    category: Mapped[str] = mapped_column(String(64), primary_key=True, default="all")
    timeframe: Mapped[str] = mapped_column(String(8), primary_key=True)  # 24h, 7d, 30d, all
    volume: Mapped[float] = mapped_column(Float, default=0.0)
    pnl: Mapped[float] = mapped_column(Float, default=0.0)
    win_rate: Mapped[float] = mapped_column(Float, default=0.0)
    trade_count: Mapped[int] = mapped_column(Integer, default=0)
    rank_volume: Mapped[int] = mapped_column(Integer, default=0)
    rank_pnl: Mapped[int] = mapped_column(Integer, default=0)
    rank_win_rate: Mapped[int] = mapped_column(Integer, default=0)
    roi: Mapped[float] = mapped_column(Float, default=0.0)
    consistency: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_ws_timeframe_rank_vol", "timeframe", "rank_volume"),)


class WalletSnapshot(Base):
    """Periodic position snapshots from Data API."""

    __tablename__ = "wallet_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wallet: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    condition_id: Mapped[str] = mapped_column(String(128), nullable=False)
    size: Mapped[float] = mapped_column(Float, default=0.0)
    pnl: Mapped[float] = mapped_column(Float, default=0.0)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class TraderProfile(Base):
    """Per-wallet behavioral metrics: bot detection + specialization."""

    __tablename__ = "trader_profiles"

    wallet: Mapped[str] = mapped_column(String(42), primary_key=True)
    median_trade_interval_s: Mapped[float] = mapped_column(Float, default=0.0)
    trade_interval_cv: Mapped[float] = mapped_column(Float, default=0.0)
    size_cv: Mapped[float] = mapped_column(Float, default=0.0)
    active_hours: Mapped[int] = mapped_column(Integer, default=0)
    bot_score: Mapped[float] = mapped_column(Float, default=0.0)
    primary_category: Mapped[str] = mapped_column(String(64), default="")
    category_concentration: Mapped[float] = mapped_column(Float, default=0.0)
    market_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_entry_timing: Mapped[float] = mapped_column(Float, default=0.0)
    avg_hold_duration_h: Mapped[float] = mapped_column(Float, default=0.0)
    avg_position_size_usd: Mapped[float] = mapped_column(Float, default=0.0)
    easy_win_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_tp_bot_score", "bot_score"),
        Index("ix_tp_primary_category", "primary_category"),
    )


class CopytradeConfig(Base):
    """User's copy-trade settings."""

    __tablename__ = "copytrade_configs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    target_wallet: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    fraction: Mapped[float] = mapped_column(Float, default=0.5)
    max_position_usd: Mapped[float] = mapped_column(Float, default=100.0)
    daily_limit_usd: Mapped[float] = mapped_column(Float, default=500.0)
    delay_seconds: Mapped[int] = mapped_column(Integer, default=0)
    slippage_tolerance: Mapped[float] = mapped_column(Float, default=0.05)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=60)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class CopytradeExecution(Base):
    """Execution log for copy trades."""

    __tablename__ = "copytrade_executions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    target_wallet: Mapped[str] = mapped_column(String(42), nullable=False)
    source_trade_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    condition_id: Mapped[str] = mapped_column(String(128), nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)
    target_size: Mapped[float] = mapped_column(Float, nullable=False)
    copy_size: Mapped[float] = mapped_column(Float, nullable=False)
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    executed_price: Mapped[float] = mapped_column(Float, nullable=True)
    slippage: Mapped[float] = mapped_column(Float, nullable=True)
    # pending, sent, filled, skipped, failed
    status: Mapped[str] = mapped_column(String(16), default="pending")
    reason: Mapped[str] = mapped_column(Text, default="")
    pnl: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    """Platform user account (authenticated via Resy)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Resy-specific fields (encrypted at rest)
    resy_jwt: Mapped[str | None] = mapped_column(Text, nullable=True)
    resy_legacy_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    resy_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resy_token_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class ResyJob(Base):
    """Scheduled Resy booking attempt."""

    __tablename__ = "resy_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    venue_name: Mapped[str] = mapped_column(String(256), nullable=False)
    venue_id: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    desired_time: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(8), nullable=False)  # snipe | poll
    snipe_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    poll_interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_flex_minutes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=50)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_resy_jobs_status", "status"),)


class ActivityLog(Base):
    """Tracks all user actions on the platform."""

    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
