"""remove getit: drop resy_jobs, activity_logs, users tables

Revision ID: 004
Revises: 088943ba3ba7
Create Date: 2026-03-15 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "004"
down_revision: str | Sequence[str] | None = "088943ba3ba7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop all getit-related tables."""
    op.drop_table("activity_logs")
    op.drop_table("resy_jobs")
    op.drop_table("users")


def downgrade() -> None:
    """Recreate getit tables (without data)."""
    import sqlalchemy as sa
    from sqlalchemy.dialects.postgresql import JSONB, UUID

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default="false"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("resy_jwt", sa.Text(), nullable=True),
        sa.Column("resy_legacy_token", sa.Text(), nullable=True),
        sa.Column("resy_refresh_token", sa.Text(), nullable=True),
        sa.Column("payment_method_id", sa.Integer(), nullable=True),
        sa.Column("resy_token_updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "resy_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("venue_name", sa.String(256), nullable=False),
        sa.Column("venue_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("desired_time", sa.String(5), nullable=False),
        sa.Column("party_size", sa.Integer(), nullable=False),
        sa.Column("mode", sa.String(8), nullable=False),
        sa.Column("snipe_at", sa.DateTime(), nullable=True),
        sa.Column("poll_interval_seconds", sa.Integer(), nullable=True),
        sa.Column("time_flex_minutes", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(16), server_default="pending"),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("max_attempts", sa.Integer(), server_default="50"),
        sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
        sa.Column("result", JSONB(), nullable=True),
        sa.Column("trace_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_resy_jobs_user_id", "resy_jobs", ["user_id"])
    op.create_index("ix_resy_jobs_status", "resy_jobs", ["status"])

    op.create_table(
        "activity_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("details", JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
