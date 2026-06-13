"""Toriq Vendas — Fase 4 (SDR Inteligente): vendas_sdr_config, vendas_sdr_interacoes, sdr_* em leads

Tabelas do agente SDR (Claude) por empresa:
- vendas_sdr_config:     prompts dinâmicos + api_key criptografada + modelo/temperatura.
- vendas_sdr_interacoes: histórico de qualificação/conversa por lead.
E adiciona em vendas_leads os campos de qualificação por IA:
sdr_status, sdr_score, sdr_notas, sdr_proximo_followup.

Revision ID: b0d1e2f3a4b5
Revises: a9c0d1e2f3a4
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b0d1e2f3a4b5'
down_revision: Union[str, None] = 'a9c0d1e2f3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vendas_sdr_config ───────────────────────────────────────────────────────
    op.create_table(
        'vendas_sdr_config',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('provider', sa.Text(), server_default=sa.text("'anthropic'"), nullable=True),
        sa.Column('api_key_enc', sa.Text(), nullable=True),
        sa.Column('modelo', sa.Text(), server_default=sa.text("'claude-sonnet-4-6'"), nullable=True),
        sa.Column('prompt_sistema', sa.Text(), nullable=True),
        sa.Column('temperatura', sa.Numeric(), server_default=sa.text('0.7'), nullable=True),
        sa.Column('diretrizes', sa.Text(), nullable=True),
        sa.Column('prompt_qualificacao', sa.Text(), nullable=True),
        sa.Column('persona', sa.Text(), nullable=True),
        sa.Column('objetivo', sa.Text(), nullable=True),
        sa.Column('ativo', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_sdr_config_empresa_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_sdr_config_pkey'),
        sa.UniqueConstraint('empresa_id', name='vendas_sdr_config_empresa_id_key'),
        schema='public',
    )

    # ── vendas_sdr_interacoes ───────────────────────────────────────────────────
    op.create_table(
        'vendas_sdr_interacoes',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('lead_id', postgresql.UUID(), nullable=False),
        sa.Column('papel', sa.Text(), nullable=True),
        sa.Column('tipo', sa.Text(), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=True),
        sa.Column('meta', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_sdr_interacoes_empresa_id_fkey'),
        sa.ForeignKeyConstraint(['lead_id'], ['public.vendas_leads.id'], ondelete='CASCADE', name='vendas_sdr_interacoes_lead_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_sdr_interacoes_pkey'),
        schema='public',
    )
    op.create_index('idx_vendas_sdr_interacoes_lead_id', 'vendas_sdr_interacoes', ['lead_id'], schema='public')
    op.create_index('idx_vendas_sdr_interacoes_empresa_id', 'vendas_sdr_interacoes', ['empresa_id'], schema='public')

    # ── vendas_leads.sdr_* ──────────────────────────────────────────────────────
    op.add_column('vendas_leads', sa.Column('sdr_status', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('sdr_score', sa.Integer(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('sdr_notas', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('sdr_proximo_followup', sa.DateTime(timezone=True), nullable=True), schema='public')


def downgrade() -> None:
    op.drop_column('vendas_leads', 'sdr_proximo_followup', schema='public')
    op.drop_column('vendas_leads', 'sdr_notas', schema='public')
    op.drop_column('vendas_leads', 'sdr_score', schema='public')
    op.drop_column('vendas_leads', 'sdr_status', schema='public')

    op.drop_index('idx_vendas_sdr_interacoes_empresa_id', table_name='vendas_sdr_interacoes', schema='public')
    op.drop_index('idx_vendas_sdr_interacoes_lead_id', table_name='vendas_sdr_interacoes', schema='public')
    op.drop_table('vendas_sdr_interacoes', schema='public')

    op.drop_table('vendas_sdr_config', schema='public')
