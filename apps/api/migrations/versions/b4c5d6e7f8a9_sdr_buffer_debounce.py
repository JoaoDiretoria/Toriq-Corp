"""evolution/sdr: buffer de debounce no lead (sdr_buffer + sdr_buffer_ate)

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vendas_leads", sa.Column("sdr_buffer", sa.Text(), nullable=True),
        schema="public",
    )
    op.add_column(
        "vendas_leads",
        sa.Column("sdr_buffer_ate", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_leads", "sdr_buffer_ate", schema="public")
    op.drop_column("vendas_leads", "sdr_buffer", schema="public")
