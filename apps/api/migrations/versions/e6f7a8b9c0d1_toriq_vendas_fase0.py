"""cria tabelas do Toriq Vendas — Fase 0 (leads, tags, lead_tags, segmentos)

Tabelas novas (tenant-scoped por empresa). Escopo da Fase 0: leads + tags +
segmentação + import. NADA de Apify/scraping, disparo, WhatsApp ou SDR.

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vendas_leads ──────────────────────────────────────────────────────────
    op.create_table(
        'vendas_leads',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=True),
        sa.Column('empresa_nome', sa.Text(), nullable=True),
        sa.Column('telefone', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('plataforma', sa.Text(), nullable=True),
        sa.Column('cidade', sa.Text(), nullable=True),
        sa.Column('estado', sa.Text(), nullable=True),
        sa.Column('avaliacao', sa.Numeric(), nullable=True),
        sa.Column('dados_brutos', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'novo'"), nullable=True),
        sa.Column('origem', sa.Text(), nullable=True),
        sa.Column('consentimento', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('dedupe_key', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='vendas_leads_empresa_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_leads_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_leads_empresa_id',
        'vendas_leads', ['empresa_id'], schema='public',
    )
    # unique parcial (empresa_id, dedupe_key) apenas quando dedupe_key NOT NULL.
    op.create_index(
        'vendas_leads_empresa_dedupe_key',
        'vendas_leads', ['empresa_id', 'dedupe_key'], unique=True, schema='public',
        postgresql_where=sa.text('dedupe_key IS NOT NULL'),
    )

    # ── vendas_tags ───────────────────────────────────────────────────────────
    op.create_table(
        'vendas_tags',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('cor', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='vendas_tags_empresa_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_tags_pkey'),
        sa.UniqueConstraint('empresa_id', 'nome', name='vendas_tags_empresa_nome_key'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_tags_empresa_id',
        'vendas_tags', ['empresa_id'], schema='public',
    )

    # ── vendas_lead_tags (N:N) ──────────────────────────────────────────────────
    op.create_table(
        'vendas_lead_tags',
        sa.Column('lead_id', postgresql.UUID(), nullable=False),
        sa.Column('tag_id', postgresql.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ['lead_id'], ['public.vendas_leads.id'],
            ondelete='CASCADE', name='vendas_lead_tags_lead_id_fkey',
        ),
        sa.ForeignKeyConstraint(
            ['tag_id'], ['public.vendas_tags.id'],
            ondelete='CASCADE', name='vendas_lead_tags_tag_id_fkey',
        ),
        sa.PrimaryKeyConstraint('lead_id', 'tag_id', name='vendas_lead_tags_pkey'),
        schema='public',
    )

    # ── vendas_segmentos ─────────────────────────────────────────────────────────
    op.create_table(
        'vendas_segmentos',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('filtros', postgresql.JSONB(), nullable=True),
        sa.Column('cor', sa.Text(), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='vendas_segmentos_empresa_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_segmentos_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_segmentos_empresa_id',
        'vendas_segmentos', ['empresa_id'], schema='public',
    )


def downgrade() -> None:
    op.drop_index('idx_vendas_segmentos_empresa_id', table_name='vendas_segmentos', schema='public')
    op.drop_table('vendas_segmentos', schema='public')

    op.drop_table('vendas_lead_tags', schema='public')

    op.drop_index('idx_vendas_tags_empresa_id', table_name='vendas_tags', schema='public')
    op.drop_table('vendas_tags', schema='public')

    op.drop_index('vendas_leads_empresa_dedupe_key', table_name='vendas_leads', schema='public')
    op.drop_index('idx_vendas_leads_empresa_id', table_name='vendas_leads', schema='public')
    op.drop_table('vendas_leads', schema='public')
