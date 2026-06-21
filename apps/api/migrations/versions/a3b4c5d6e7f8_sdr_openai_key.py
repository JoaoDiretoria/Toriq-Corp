"""sdr: coluna openai_api_key_enc (transcrição de áudio do canal Evolution)

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vendas_sdr_config",
        sa.Column("openai_api_key_enc", sa.Text(), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_sdr_config", "openai_api_key_enc", schema="public")
