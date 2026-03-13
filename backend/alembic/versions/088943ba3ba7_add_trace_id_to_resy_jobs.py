"""add trace_id to resy_jobs

Revision ID: 088943ba3ba7
Revises: 003
Create Date: 2026-03-12 18:58:40.655305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '088943ba3ba7'
down_revision: Union[str, Sequence[str], None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('resy_jobs', sa.Column('trace_id', sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column('resy_jobs', 'trace_id')
