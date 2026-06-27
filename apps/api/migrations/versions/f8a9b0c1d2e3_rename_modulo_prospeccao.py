"""rename modulo: Toriq Vendas -> Toriq Prospeccao

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MODULO_ID = "b5c6d7e8-f9a0-4b1c-8d2e-000000000005"


def upgrade() -> None:
    op.execute(
        sa.text(
            f"UPDATE public.modulos SET nome = 'Toriq Prospecção'"
            f" WHERE id = '{_MODULO_ID}'::uuid"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            f"UPDATE public.modulos SET nome = 'Toriq Vendas'"
            f" WHERE id = '{_MODULO_ID}'::uuid"
        )
    )
