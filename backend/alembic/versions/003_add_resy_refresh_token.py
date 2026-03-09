"""add resy_refresh_token column to users

Revision ID: 003
Revises: 002
Create Date: 2026-03-08 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | Sequence[str] | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("resy_refresh_token", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "resy_refresh_token")
