"""Toriq Vendas — Fase 7 (Dedup de disparo): dedup_dias em vendas_disparo_config

Janela de deduplicação: não reenviar para o mesmo lead em N dias (0 = desligado).

Revision ID: e3a4b5c6d7e8
Revises: d2f3a4b5c6d7
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e3a4b5c6d7e8'
down_revision: Union[str, None] = 'd2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'vendas_disparo_config',
        sa.Column('dedup_dias', sa.Integer(), server_default=sa.text('0'), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('vendas_disparo_config', 'dedup_dias', schema='public')
