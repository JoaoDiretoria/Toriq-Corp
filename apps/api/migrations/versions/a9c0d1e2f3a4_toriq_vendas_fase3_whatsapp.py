"""Toriq Vendas — Fase 3 (WhatsApp Meta Cloud API): colunas whatsapp_* em vendas_disparo_config

Adiciona à tabela vendas_disparo_config (Fase 2) os campos de configuração do
canal WhatsApp via API oficial da Meta. Token e app_secret ficam criptografados
(Fernet). Reusa as demais tabelas do disparo (templates/campanhas/mensagens/supressao).

Revision ID: a9c0d1e2f3a4
Revises: f8b9c0d1e2f3
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a9c0d1e2f3a4'
down_revision: Union[str, None] = 'f8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vendas_disparo_config', sa.Column('whatsapp_phone_id', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_disparo_config', sa.Column('whatsapp_waba_id', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_disparo_config', sa.Column('whatsapp_token_enc', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_disparo_config', sa.Column('whatsapp_app_secret_enc', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_disparo_config', sa.Column('whatsapp_verify_token', sa.Text(), nullable=True), schema='public')
    op.add_column(
        'vendas_disparo_config',
        sa.Column('whatsapp_rate_limit', sa.Integer(), server_default=sa.text('80'), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('vendas_disparo_config', 'whatsapp_rate_limit', schema='public')
    op.drop_column('vendas_disparo_config', 'whatsapp_verify_token', schema='public')
    op.drop_column('vendas_disparo_config', 'whatsapp_app_secret_enc', schema='public')
    op.drop_column('vendas_disparo_config', 'whatsapp_token_enc', schema='public')
    op.drop_column('vendas_disparo_config', 'whatsapp_waba_id', schema='public')
    op.drop_column('vendas_disparo_config', 'whatsapp_phone_id', schema='public')
