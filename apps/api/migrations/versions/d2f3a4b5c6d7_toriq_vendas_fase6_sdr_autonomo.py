"""Toriq Vendas — Fase 6 (SDR autônomo): auto_responder + notificar_telefones em vendas_sdr_config

Habilita o SDR autônomo (event-driven): responder automaticamente o inbound de
WhatsApp (janela 24h) e escalar p/ humano via WhatsApp aos telefones de notificação.

Revision ID: d2f3a4b5c6d7
Revises: c1e2f3a4b5c6
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd2f3a4b5c6d7'
down_revision: Union[str, None] = 'c1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'vendas_sdr_config',
        sa.Column('auto_responder', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        schema='public',
    )
    op.add_column(
        'vendas_sdr_config',
        sa.Column('notificar_telefones', sa.Text(), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('vendas_sdr_config', 'notificar_telefones', schema='public')
    op.drop_column('vendas_sdr_config', 'auto_responder', schema='public')
