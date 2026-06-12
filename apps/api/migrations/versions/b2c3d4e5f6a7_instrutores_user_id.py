"""adiciona instrutores.user_id (vínculo com o usuário/profile)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'instrutores',
        sa.Column('user_id', postgresql.UUID(), nullable=True),
        schema='public',
    )
    op.create_foreign_key(
        'fk_instrutores_user_id_profiles',
        'instrutores', 'profiles',
        ['user_id'], ['id'],
        source_schema='public', referent_schema='public',
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_instrutores_user_id_profiles', 'instrutores', schema='public', type_='foreignkey')
    op.drop_column('instrutores', 'user_id', schema='public')
