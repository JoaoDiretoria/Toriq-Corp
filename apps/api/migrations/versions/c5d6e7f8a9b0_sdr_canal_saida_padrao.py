"""vendas/sdr: canal de saida padrao do SDR (vendas_sdr_config.canal_saida_padrao)

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-06-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vendas_sdr_config",
        sa.Column(
            "canal_saida_padrao", sa.Text(), nullable=True,
            server_default=sa.text("'auto'"),
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_sdr_config", "canal_saida_padrao", schema="public")
