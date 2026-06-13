"""Toriq Vendas — Fase 5 (Medição & Contratação): vendas_uso + seed do módulo toriq_vendas

- vendas_uso: log de medição de uso por empresa (base p/ cobrança). Métricas:
  apify_runs, leads_captados, emails_enviados, whatsapp_enviados,
  sdr_qualificacoes, sdr_conversas.
- Registra o módulo 'toriq_vendas' no catálogo (tabela modulos) para que empresas
  possam contratá-lo via o fluxo white-label existente (/empresas-modulos).

Revision ID: c1e2f3a4b5c6
Revises: b0d1e2f3a4b5
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1e2f3a4b5c6'
down_revision: Union[str, None] = 'b0d1e2f3a4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# UUID fixo do módulo no catálogo (idempotente via ON CONFLICT DO NOTHING).
_MODULO_ID = 'b5c6d7e8-f9a0-4b1c-8d2e-000000000005'


def upgrade() -> None:
    # ── vendas_uso ──────────────────────────────────────────────────────────────
    op.create_table(
        'vendas_uso',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('metrica', sa.Text(), nullable=False),
        sa.Column('quantidade', sa.Integer(), server_default=sa.text('1'), nullable=True),
        sa.Column('referencia', sa.Text(), nullable=True),
        sa.Column('periodo', sa.Text(), nullable=True),
        sa.Column('meta', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_uso_empresa_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_uso_pkey'),
        schema='public',
    )
    op.create_index('idx_vendas_uso_empresa_metrica', 'vendas_uso', ['empresa_id', 'metrica'], schema='public')
    op.create_index('idx_vendas_uso_empresa_periodo', 'vendas_uso', ['empresa_id', 'periodo'], schema='public')

    # ── catálogo: módulo toriq_vendas (idempotente) ─────────────────────────────
    op.execute(
        sa.text(
            "INSERT INTO public.modulos (id, nome, rota, descricao, icone) "
            "VALUES (CAST(:id AS uuid), :nome, :rota, :descricao, :icone) "
            "ON CONFLICT (id) DO NOTHING"
        ).bindparams(
            id=_MODULO_ID,
            nome='Toriq Vendas',
            rota='toriq-vendas',
            descricao='Prospecção (Apify), disparo em massa (e-mail/WhatsApp) e SDR inteligente com IA.',
            icone='Megaphone',
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM public.modulos WHERE id = :id").bindparams(id=_MODULO_ID))

    op.drop_index('idx_vendas_uso_empresa_periodo', table_name='vendas_uso', schema='public')
    op.drop_index('idx_vendas_uso_empresa_metrica', table_name='vendas_uso', schema='public')
    op.drop_table('vendas_uso', schema='public')
