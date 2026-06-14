"""Log de transmissão de eventos eSocial SST — tabela esocial_eventos_log

Registra cada envio de evento (S-2210/2220/2240) com o protocolo; a consulta de
lote atualiza status/recibo. Aditiva.

Revision ID: f0c1d2e3a4b5
Revises: e9b0c1d2f3a4
Create Date: 2026-06-14 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f0c1d2e3a4b5'
down_revision: Union[str, None] = 'e9b0c1d2f3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'esocial_eventos_log',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', sa.Uuid(), nullable=False),
        sa.Column('tipo', sa.Text(), nullable=False),
        sa.Column('fonte_id', sa.Uuid(), nullable=True),
        sa.Column('id_lote', sa.Text(), nullable=True),
        sa.Column('protocolo', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), server_default=sa.text("'enviado'"), nullable=True),
        sa.Column('recibo', sa.Text(), nullable=True),
        sa.Column('erro', sa.Text(), nullable=True),
        sa.Column('payload_hash', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id', name='esocial_eventos_log_pkey'),
        schema='public',
    )
    op.create_index('idx_esocial_eventos_empresa', 'esocial_eventos_log', ['empresa_id'], schema='public')
    op.create_index('idx_esocial_eventos_protocolo', 'esocial_eventos_log', ['protocolo'], schema='public')


def downgrade() -> None:
    op.drop_index('idx_esocial_eventos_protocolo', table_name='esocial_eventos_log', schema='public')
    op.drop_index('idx_esocial_eventos_empresa', table_name='esocial_eventos_log', schema='public')
    op.drop_table('esocial_eventos_log', schema='public')
