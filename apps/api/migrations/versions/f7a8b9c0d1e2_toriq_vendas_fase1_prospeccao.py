"""Toriq Vendas — Fase 1 (Prospecção via Apify): vendas_config, vendas_jobs, job_id

Tabelas novas (tenant-scoped por empresa) para a prospecção via Apify:
- vendas_config: token Apify criptografado + overrides de actors (1 por empresa).
- vendas_jobs:   job de scraping (run/dataset da Apify, status, contadores, custo).
E adiciona vendas_leads.job_id (FK → vendas_jobs, SET NULL) para rastrear a origem
de cada lead captado por prospecção.

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vendas_config ───────────────────────────────────────────────────────────
    op.create_table(
        'vendas_config',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('apify_token_enc', sa.Text(), nullable=True),
        sa.Column('actors', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='vendas_config_empresa_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_config_pkey'),
        sa.UniqueConstraint('empresa_id', name='vendas_config_empresa_id_key'),
        schema='public',
    )

    # ── vendas_jobs ─────────────────────────────────────────────────────────────
    op.create_table(
        'vendas_jobs',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('plataforma', sa.Text(), nullable=False),
        sa.Column('parametros', postgresql.JSONB(), nullable=True),
        sa.Column('tag_id', postgresql.UUID(), nullable=True),
        sa.Column('apify_run_id', sa.Text(), nullable=True),
        sa.Column('apify_dataset_id', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'pending'"), nullable=True),
        sa.Column('total_captados', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('total_importados', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('total_duplicados', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('custo', sa.Numeric(), nullable=True),
        sa.Column('erro', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='vendas_jobs_empresa_id_fkey',
        ),
        sa.ForeignKeyConstraint(
            ['tag_id'], ['public.vendas_tags.id'],
            ondelete='SET NULL', name='vendas_jobs_tag_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='vendas_jobs_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_vendas_jobs_empresa_id',
        'vendas_jobs', ['empresa_id'], schema='public',
    )

    # ── vendas_leads.job_id (origem da prospecção) ──────────────────────────────
    op.add_column(
        'vendas_leads',
        sa.Column('job_id', postgresql.UUID(), nullable=True),
        schema='public',
    )
    op.create_foreign_key(
        'vendas_leads_job_id_fkey',
        'vendas_leads', 'vendas_jobs',
        ['job_id'], ['id'],
        source_schema='public', referent_schema='public',
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('vendas_leads_job_id_fkey', 'vendas_leads', schema='public', type_='foreignkey')
    op.drop_column('vendas_leads', 'job_id', schema='public')

    op.drop_index('idx_vendas_jobs_empresa_id', table_name='vendas_jobs', schema='public')
    op.drop_table('vendas_jobs', schema='public')

    op.drop_table('vendas_config', schema='public')
