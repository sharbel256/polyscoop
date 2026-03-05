"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create all tables."""
    op.create_table(
        "tracked_markets",
        sa.Column("condition_id", sa.String(128), primary_key=True),
        sa.Column("question", sa.Text(), server_default=""),
        sa.Column("category", sa.String(64), server_default=""),
        sa.Column("image", sa.Text(), server_default=""),
        sa.Column("token_ids", ARRAY(sa.String), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true"),
        sa.Column("event_id", sa.String(64), server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now()
        ),
    )

    op.create_table(
        "trades",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column("transaction_hash", sa.String(128), nullable=False),
        sa.Column("asset_id", sa.String(128), nullable=False),
        sa.Column("condition_id", sa.String(128), nullable=False),
        sa.Column("wallet", sa.String(42), nullable=False),
        sa.Column("side", sa.String(4), nullable=False),
        sa.Column("size", sa.Float(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("outcome", sa.String(32), server_default=""),
        sa.Column("title", sa.Text(), server_default=""),
        sa.Column("timestamp", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "transaction_hash", "asset_id", name="uq_trade_tx_asset"
        ),
    )
    op.create_index("ix_trades_condition_id", "trades", ["condition_id"])
    op.create_index("ix_trades_wallet", "trades", ["wallet"])
    op.create_index("ix_trades_timestamp", "trades", ["timestamp"])
    op.create_index(
        "ix_trades_wallet_ts", "trades", ["wallet", "timestamp"]
    )

    op.create_table(
        "wallets",
        sa.Column("address", sa.String(42), primary_key=True),
        sa.Column(
            "first_seen", sa.DateTime(), server_default=sa.func.now()
        ),
        sa.Column(
            "last_seen", sa.DateTime(), server_default=sa.func.now()
        ),
        sa.Column("total_trades", sa.Integer(), server_default="0"),
        sa.Column("total_volume", sa.Float(), server_default="0"),
        sa.Column("labels", ARRAY(sa.String), nullable=True),
        sa.Column("profile_image_url", sa.Text(), nullable=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("profile_fetched_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "wallet_scores",
        sa.Column("wallet", sa.String(42), primary_key=True),
        sa.Column(
            "category", sa.String(64), primary_key=True, server_default="all"
        ),
        sa.Column("timeframe", sa.String(8), primary_key=True),
        sa.Column("volume", sa.Float(), server_default="0"),
        sa.Column("pnl", sa.Float(), server_default="0"),
        sa.Column("win_rate", sa.Float(), server_default="0"),
        sa.Column("trade_count", sa.Integer(), server_default="0"),
        sa.Column("rank_volume", sa.Integer(), server_default="0"),
        sa.Column("rank_pnl", sa.Integer(), server_default="0"),
        sa.Column("rank_win_rate", sa.Integer(), server_default="0"),
        sa.Column("roi", sa.Float(), server_default="0"),
        sa.Column("consistency", sa.Float(), server_default="0"),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_ws_timeframe_rank_vol",
        "wallet_scores",
        ["timeframe", "rank_volume"],
    )

    op.create_table(
        "wallet_snapshots",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column("wallet", sa.String(42), nullable=False),
        sa.Column("condition_id", sa.String(128), nullable=False),
        sa.Column("size", sa.Float(), server_default="0"),
        sa.Column("pnl", sa.Float(), server_default="0"),
        sa.Column(
            "snapshot_at", sa.DateTime(), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_wallet_snapshots_wallet", "wallet_snapshots", ["wallet"])

    op.create_table(
        "trader_profiles",
        sa.Column("wallet", sa.String(42), primary_key=True),
        sa.Column(
            "median_trade_interval_s", sa.Float(), server_default="0"
        ),
        sa.Column("trade_interval_cv", sa.Float(), server_default="0"),
        sa.Column("size_cv", sa.Float(), server_default="0"),
        sa.Column("active_hours", sa.Integer(), server_default="0"),
        sa.Column("bot_score", sa.Float(), server_default="0"),
        sa.Column(
            "primary_category", sa.String(64), server_default=""
        ),
        sa.Column(
            "category_concentration", sa.Float(), server_default="0"
        ),
        sa.Column("market_count", sa.Integer(), server_default="0"),
        sa.Column("avg_entry_timing", sa.Float(), server_default="0"),
        sa.Column("avg_hold_duration_h", sa.Float(), server_default="0"),
        sa.Column(
            "avg_position_size_usd", sa.Float(), server_default="0"
        ),
        sa.Column("easy_win_ratio", sa.Float(), server_default="0"),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now()
        ),
    )
    op.create_index("ix_tp_bot_score", "trader_profiles", ["bot_score"])
    op.create_index(
        "ix_tp_primary_category", "trader_profiles", ["primary_category"]
    )

    op.create_table(
        "copytrade_configs",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column("user_address", sa.String(42), nullable=False),
        sa.Column("target_wallet", sa.String(42), nullable=False),
        sa.Column("fraction", sa.Float(), server_default="0.5"),
        sa.Column("max_position_usd", sa.Float(), server_default="100"),
        sa.Column("daily_limit_usd", sa.Float(), server_default="500"),
        sa.Column("delay_seconds", sa.Integer(), server_default="0"),
        sa.Column(
            "slippage_tolerance", sa.Float(), server_default="0.05"
        ),
        sa.Column("cooldown_seconds", sa.Integer(), server_default="60"),
        sa.Column("enabled", sa.Boolean(), server_default="true"),
        sa.Column("filters", JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_copytrade_configs_user", "copytrade_configs", ["user_address"]
    )
    op.create_index(
        "ix_copytrade_configs_target",
        "copytrade_configs",
        ["target_wallet"],
    )

    op.create_table(
        "copytrade_executions",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column("config_id", sa.BigInteger(), nullable=False),
        sa.Column("user_address", sa.String(42), nullable=False),
        sa.Column("target_wallet", sa.String(42), nullable=False),
        sa.Column("source_trade_hash", sa.String(128), nullable=False),
        sa.Column("condition_id", sa.String(128), nullable=False),
        sa.Column("side", sa.String(4), nullable=False),
        sa.Column("target_size", sa.Float(), nullable=False),
        sa.Column("copy_size", sa.Float(), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=False),
        sa.Column("executed_price", sa.Float(), nullable=True),
        sa.Column("slippage", sa.Float(), nullable=True),
        sa.Column("status", sa.String(16), server_default="pending"),
        sa.Column("reason", sa.Text(), server_default=""),
        sa.Column("pnl", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_copytrade_exec_config",
        "copytrade_executions",
        ["config_id"],
    )
    op.create_index(
        "ix_copytrade_exec_user",
        "copytrade_executions",
        ["user_address"],
    )

    op.create_table(
        "users",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True
        ),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("users")
    op.drop_table("copytrade_executions")
    op.drop_table("copytrade_configs")
    op.drop_table("trader_profiles")
    op.drop_table("wallet_snapshots")
    op.drop_table("wallet_scores")
    op.drop_table("wallets")
    op.drop_table("trades")
    op.drop_table("tracked_markets")
