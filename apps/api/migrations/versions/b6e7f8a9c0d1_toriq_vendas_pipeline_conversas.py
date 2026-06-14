"""Toriq Vendas — Pipeline & Conversas (CRM estilo Chatwoot)

Cria as tabelas do CRM e estende vendas_leads:
- vendas_pipeline_stages .. estágios do funil (kanban) por empresa.
- vendas_conversas ........ thread de mensagens por lead (lead|agente|sdr|sistema).
- vendas_leads (ALTER) .... stage_id, is_pinned, is_archived, last_message_at,
  last_read_at, pending_reply, temperatura, valor_estimado.

Os estágios padrão (Novo→...→Ganho/Perdido) são criados lazy pelo serviço na
primeira leitura do board, por empresa — não há seed aqui.

Revision ID: b6e7f8a9c0d1
Revises: a5c6d7e8f9a0
Create Date: 2026-06-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'b6e7f8a9c0d1'
down_revision: Union[str, None] = 'a5c6d7e8f9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Estágios do kanban ────────────────────────────────────────────────
    op.create_table(
        'vendas_pipeline_stages',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('cor', sa.Text(), nullable=True),
        sa.Column('ordem', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('is_closed', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('is_won', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            name='vendas_pipeline_stages_empresa_id_fkey', ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_pipeline_stages_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_pipeline_stages_empresa', 'vendas_pipeline_stages',
        ['empresa_id'], schema='public',
    )

    # ── Thread de conversas por lead ──────────────────────────────────────
    op.create_table(
        'vendas_conversas',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('lead_id', sa.Uuid(), nullable=False),
        sa.Column('sender_type', sa.Text(), nullable=False),
        sa.Column('canal', sa.Text(), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=True),
        sa.Column('media', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            name='vendas_conversas_empresa_id_fkey', ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['lead_id'], ['public.vendas_leads.id'],
            name='vendas_conversas_lead_id_fkey', ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_conversas_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_conversas_lead', 'vendas_conversas', ['lead_id'], schema='public',
    )
    op.create_index(
        'idx_vendas_conversas_empresa', 'vendas_conversas', ['empresa_id'], schema='public',
    )

    # ── ALTER vendas_leads: colunas do CRM ────────────────────────────────
    op.add_column('vendas_leads', sa.Column('stage_id', sa.Uuid(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('pending_reply', sa.Boolean(), server_default=sa.text('false'), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('temperatura', sa.Text(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('valor_estimado', sa.Numeric(), nullable=True), schema='public')
    op.create_foreign_key(
        'vendas_leads_stage_id_fkey', 'vendas_leads', 'vendas_pipeline_stages',
        ['stage_id'], ['id'],
        source_schema='public', referent_schema='public', ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('vendas_leads_stage_id_fkey', 'vendas_leads', schema='public', type_='foreignkey')
    for col in (
        'valor_estimado', 'temperatura', 'pending_reply', 'last_read_at',
        'last_message_at', 'is_archived', 'is_pinned', 'stage_id',
    ):
        op.drop_column('vendas_leads', col, schema='public')

    op.drop_index('idx_vendas_conversas_empresa', table_name='vendas_conversas', schema='public')
    op.drop_index('idx_vendas_conversas_lead', table_name='vendas_conversas', schema='public')
    op.drop_table('vendas_conversas', schema='public')

    op.drop_index('idx_vendas_pipeline_stages_empresa', table_name='vendas_pipeline_stages', schema='public')
    op.drop_table('vendas_pipeline_stages', schema='public')
