"""Log de emails transacionais (envio via Resend) — tabela email_envios

Registra cada envio transacional com o resend_id; o webhook do Resend atualiza
o status (enviado→entregue/bounce/spam). Aditiva.

Revision ID: e9b0c1d2f3a4
Revises: d8a9b0c1e2f3
Create Date: 2026-06-14 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e9b0c1d2f3a4'
down_revision: Union[str, None] = 'd8a9b0c1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'email_envios',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=True),
        sa.Column('to_email', sa.Text(), nullable=False),
        sa.Column('assunto', sa.Text(), nullable=True),
        sa.Column('template', sa.Text(), nullable=True),
        sa.Column('resend_id', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'enviado'"), nullable=True),
        sa.Column('erro', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id', name='email_envios_pkey'),
        schema='public',
    )
    op.create_index('idx_email_envios_resend_id', 'email_envios', ['resend_id'], schema='public')
    op.create_index('idx_email_envios_empresa', 'email_envios', ['empresa_id'], schema='public')


def downgrade() -> None:
    op.drop_index('idx_email_envios_resend_id', table_name='email_envios', schema='public')
    op.drop_index('idx_email_envios_empresa', table_name='email_envios', schema='public')
    op.drop_table('email_envios', schema='public')
