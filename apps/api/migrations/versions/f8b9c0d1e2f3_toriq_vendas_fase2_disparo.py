"""Toriq Vendas — Fase 2 (Disparo em Massa Email): config, templates, campanhas, mensagens, supressao

Tabelas novas (tenant-scoped por empresa) do subsistema de disparo:
- vendas_disparo_config: provedor de email (SMTP) por empresa, com senha criptografada.
- vendas_templates:      templates de mensagem (canal email/whatsapp).
- vendas_campanhas:      campanha sobre segmento/leads, com agendamento e métricas.
- vendas_mensagens:      1 linha por envio (status/tracking/opt-out).
- vendas_supressao:      opt-out global por empresa (LGPD).

O campo 'canal' já prevê o WhatsApp (Fase 3) reusando as mesmas tabelas.

Revision ID: f8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f8b9c0d1e2f3'
down_revision: Union[str, None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vendas_disparo_config ───────────────────────────────────────────────────
    op.create_table(
        'vendas_disparo_config',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('email_provider', sa.Text(), server_default=sa.text("'smtp'"), nullable=True),
        sa.Column('email_remetente', sa.Text(), nullable=True),
        sa.Column('email_remetente_nome', sa.Text(), nullable=True),
        sa.Column('smtp_host', sa.Text(), nullable=True),
        sa.Column('smtp_port', sa.Integer(), nullable=True),
        sa.Column('smtp_user', sa.Text(), nullable=True),
        sa.Column('smtp_password_enc', sa.Text(), nullable=True),
        sa.Column('smtp_use_tls', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('email_rate_limit', sa.Integer(), server_default=sa.text('100'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_disparo_config_empresa_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_disparo_config_pkey'),
        sa.UniqueConstraint('empresa_id', name='vendas_disparo_config_empresa_id_key'),
        schema='public',
    )

    # ── vendas_templates ────────────────────────────────────────────────────────
    op.create_table(
        'vendas_templates',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('canal', sa.Text(), server_default=sa.text("'email'"), nullable=False),
        sa.Column('assunto', sa.Text(), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('categoria', sa.Text(), nullable=True),
        sa.Column('meta_template_name', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_templates_empresa_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_templates_pkey'),
        schema='public',
    )
    op.create_index('idx_vendas_templates_empresa_id', 'vendas_templates', ['empresa_id'], schema='public')

    # ── vendas_campanhas ────────────────────────────────────────────────────────
    op.create_table(
        'vendas_campanhas',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('template_id', postgresql.UUID(), nullable=True),
        sa.Column('canal', sa.Text(), server_default=sa.text("'email'"), nullable=False),
        sa.Column('segmento_id', postgresql.UUID(), nullable=True),
        sa.Column('lead_ids', postgresql.JSONB(), nullable=True),
        sa.Column('agendada_para', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'rascunho'"), nullable=True),
        sa.Column('total_destinatarios', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('total_enviados', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('total_erros', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_campanhas_empresa_id_fkey'),
        sa.ForeignKeyConstraint(['template_id'], ['public.vendas_templates.id'], ondelete='SET NULL', name='vendas_campanhas_template_id_fkey'),
        sa.ForeignKeyConstraint(['segmento_id'], ['public.vendas_segmentos.id'], ondelete='SET NULL', name='vendas_campanhas_segmento_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_campanhas_pkey'),
        schema='public',
    )
    op.create_index('idx_vendas_campanhas_empresa_id', 'vendas_campanhas', ['empresa_id'], schema='public')

    # ── vendas_mensagens ────────────────────────────────────────────────────────
    op.create_table(
        'vendas_mensagens',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('campanha_id', postgresql.UUID(), nullable=False),
        sa.Column('lead_id', postgresql.UUID(), nullable=True),
        sa.Column('canal', sa.Text(), nullable=True),
        sa.Column('destinatario', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'pendente'"), nullable=True),
        sa.Column('provider_id', sa.Text(), nullable=True),
        sa.Column('erro', sa.Text(), nullable=True),
        sa.Column('enviado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('entregue_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lido_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('respondeu_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_mensagens_empresa_id_fkey'),
        sa.ForeignKeyConstraint(['campanha_id'], ['public.vendas_campanhas.id'], ondelete='CASCADE', name='vendas_mensagens_campanha_id_fkey'),
        sa.ForeignKeyConstraint(['lead_id'], ['public.vendas_leads.id'], ondelete='SET NULL', name='vendas_mensagens_lead_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_mensagens_pkey'),
        schema='public',
    )
    op.create_index('idx_vendas_mensagens_campanha_id', 'vendas_mensagens', ['campanha_id'], schema='public')
    op.create_index('idx_vendas_mensagens_empresa_id', 'vendas_mensagens', ['empresa_id'], schema='public')

    # ── vendas_supressao ────────────────────────────────────────────────────────
    op.create_table(
        'vendas_supressao',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('tipo', sa.Text(), nullable=False),
        sa.Column('valor', sa.Text(), nullable=False),
        sa.Column('motivo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='vendas_supressao_empresa_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='vendas_supressao_pkey'),
        sa.UniqueConstraint('empresa_id', 'tipo', 'valor', name='vendas_supressao_empresa_tipo_valor_key'),
        schema='public',
    )
    op.create_index('idx_vendas_supressao_empresa_id', 'vendas_supressao', ['empresa_id'], schema='public')


def downgrade() -> None:
    op.drop_index('idx_vendas_supressao_empresa_id', table_name='vendas_supressao', schema='public')
    op.drop_table('vendas_supressao', schema='public')

    op.drop_index('idx_vendas_mensagens_empresa_id', table_name='vendas_mensagens', schema='public')
    op.drop_index('idx_vendas_mensagens_campanha_id', table_name='vendas_mensagens', schema='public')
    op.drop_table('vendas_mensagens', schema='public')

    op.drop_index('idx_vendas_campanhas_empresa_id', table_name='vendas_campanhas', schema='public')
    op.drop_table('vendas_campanhas', schema='public')

    op.drop_index('idx_vendas_templates_empresa_id', table_name='vendas_templates', schema='public')
    op.drop_table('vendas_templates', schema='public')

    op.drop_table('vendas_disparo_config', schema='public')
