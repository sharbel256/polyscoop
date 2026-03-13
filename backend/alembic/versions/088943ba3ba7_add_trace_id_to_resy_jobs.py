"""add trace_id to resy_jobs

Revision ID: 088943ba3ba7
Revises: 003
Create Date: 2026-03-12 18:58:40.655305

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "088943ba3ba7"
down_revision: str | Sequence[str] | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("resy_jobs", sa.Column("trace_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("resy_jobs", "trace_id")
