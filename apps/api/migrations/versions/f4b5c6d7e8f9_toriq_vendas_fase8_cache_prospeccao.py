"""Toriq Vendas — Fase 8 (Cache de prospecção + custo): cache_dias, parametros_hash, from_cache

- vendas_config.cache_dias: reusar a mesma busca Apify por N dias (0 = desligado).
- vendas_jobs.parametros_hash: hash dos parâmetros (chave do cache).
- vendas_jobs.from_cache: marca jobs servidos pelo cache (sem rodar a Apify).
(o custo em USD já usa a coluna vendas_jobs.custo existente.)

Revision ID: f4b5c6d7e8f9
Revises: e3a4b5c6d7e8
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f4b5c6d7e8f9'
down_revision: Union[str, None] = 'e3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'vendas_config',
        sa.Column('cache_dias', sa.Integer(), server_default=sa.text('0'), nullable=True),
        schema='public',
    )
    op.add_column(
        'vendas_jobs',
        sa.Column('parametros_hash', sa.Text(), nullable=True),
        schema='public',
    )
    op.add_column(
        'vendas_jobs',
        sa.Column('from_cache', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        schema='public',
    )
    op.create_index(
        'idx_vendas_jobs_empresa_hash',
        'vendas_jobs', ['empresa_id', 'parametros_hash'], schema='public',
    )


def downgrade() -> None:
    op.drop_index('idx_vendas_jobs_empresa_hash', table_name='vendas_jobs', schema='public')
    op.drop_column('vendas_jobs', 'from_cache', schema='public')
    op.drop_column('vendas_jobs', 'parametros_hash', schema='public')
    op.drop_column('vendas_config', 'cache_dias', schema='public')
