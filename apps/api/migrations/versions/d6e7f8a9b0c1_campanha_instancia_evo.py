"""vendas/disparo: instancia Evolution escolhida na campanha (vendas_campanhas.instancia_id)

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-06-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vendas_campanhas",
        sa.Column("instancia_id", sa.Uuid(), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_campanhas", "instancia_id", schema="public")
