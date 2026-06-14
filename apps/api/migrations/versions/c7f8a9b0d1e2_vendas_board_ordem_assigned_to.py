"""Toriq Vendas — board_ordem + assigned_to em vendas_leads

- board_ordem: ordem manual do card dentro do estágio (kanban drag-and-drop).
- assigned_to: operador responsável pela conversa (assignee estilo Chatwoot),
  FK para users SET NULL ao apagar o usuário.

Revision ID: c7f8a9b0d1e2
Revises: b6e7f8a9c0d1
Create Date: 2026-06-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c7f8a9b0d1e2'
down_revision: Union[str, None] = 'b6e7f8a9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vendas_leads', sa.Column('board_ordem', sa.Integer(), nullable=True), schema='public')
    op.add_column('vendas_leads', sa.Column('assigned_to', sa.Uuid(), nullable=True), schema='public')
    op.create_index('idx_vendas_leads_assigned_to', 'vendas_leads', ['assigned_to'], schema='public')
    op.create_foreign_key(
        'vendas_leads_assigned_to_fkey', 'vendas_leads', 'users',
        ['assigned_to'], ['id'],
        source_schema='public', referent_schema='public', ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('vendas_leads_assigned_to_fkey', 'vendas_leads', schema='public', type_='foreignkey')
    op.drop_index('idx_vendas_leads_assigned_to', table_name='vendas_leads', schema='public')
    op.drop_column('vendas_leads', 'assigned_to', schema='public')
    op.drop_column('vendas_leads', 'board_ordem', schema='public')
