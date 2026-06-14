"""Toriq Vendas — Fase 9 (Templates HSM): approval_status em vendas_templates

Rastreia o status de aprovação do template WhatsApp na Meta
(unknown|pending|approved|rejected). Disparos WhatsApp com template 'rejected'
são bloqueados no serviço de envio.

Revision ID: a5c6d7e8f9a0
Revises: f4b5c6d7e8f9
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a5c6d7e8f9a0'
down_revision: Union[str, None] = 'f4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'vendas_templates',
        sa.Column('approval_status', sa.Text(), server_default=sa.text("'unknown'"), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('vendas_templates', 'approval_status', schema='public')
