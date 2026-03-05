"""add trader_profiles and wallet_score roi consistency

Revision ID: 7a2f8d7f51de
Revises: 092c9ceebb96
Create Date: 2026-03-01 19:40:01.091571

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7a2f8d7f51de"
down_revision: str | Sequence[str] | None = "092c9ceebb96"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # trader_profiles table
    op.execute("""
        CREATE TABLE IF NOT EXISTS trader_profiles (
            wallet VARCHAR(42) NOT NULL PRIMARY KEY,
            median_trade_interval_s FLOAT NOT NULL DEFAULT 0,
            trade_interval_cv FLOAT NOT NULL DEFAULT 0,
            size_cv FLOAT NOT NULL DEFAULT 0,
            active_hours INTEGER NOT NULL DEFAULT 0,
            bot_score FLOAT NOT NULL DEFAULT 0,
            primary_category VARCHAR(64) NOT NULL DEFAULT '',
            category_concentration FLOAT NOT NULL DEFAULT 0,
            market_count INTEGER NOT NULL DEFAULT 0,
            avg_entry_timing FLOAT NOT NULL DEFAULT 0,
            avg_hold_duration_h FLOAT NOT NULL DEFAULT 0,
            avg_position_size_usd FLOAT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_tp_bot_score ON trader_profiles (bot_score)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_tp_primary_category ON trader_profiles (primary_category)"
    )

    # New columns on wallet_scores
    op.add_column(
        "wallet_scores",
        sa.Column("roi", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "wallet_scores",
        sa.Column("consistency", sa.Float(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("wallet_scores", "consistency")
    op.drop_column("wallet_scores", "roi")
    op.execute("DROP INDEX IF EXISTS ix_tp_primary_category")
    op.execute("DROP INDEX IF EXISTS ix_tp_bot_score")
    op.execute("DROP TABLE IF EXISTS trader_profiles")
