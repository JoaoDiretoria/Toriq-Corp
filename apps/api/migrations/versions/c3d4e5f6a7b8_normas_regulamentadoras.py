"""cria normas_regulamentadoras (tenant-scoped por empresa)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'normas_regulamentadoras',
        sa.Column('id', postgresql.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('empresa_id', postgresql.UUID(), nullable=False),
        sa.Column('nr', sa.Text(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(
            ['empresa_id'], ['public.empresas.id'],
            ondelete='CASCADE', name='normas_regulamentadoras_empresa_id_fkey',
        ),
        sa.PrimaryKeyConstraint('id', name='normas_regulamentadoras_pkey'),
        schema='public',
    )
    op.create_index(
        'idx_normas_regulamentadoras_empresa_id',
        'normas_regulamentadoras', ['empresa_id'], schema='public',
    )


def downgrade() -> None:
    op.drop_index(
        'idx_normas_regulamentadoras_empresa_id',
        table_name='normas_regulamentadoras', schema='public',
    )
    op.drop_table('normas_regulamentadoras', schema='public')
