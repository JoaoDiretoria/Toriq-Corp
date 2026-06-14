"""Adiciona o valor 'suporte' ao enum app_role (role de staff interno).

Aditiva. PG 12+ permite ADD VALUE dentro de transação (o valor só não pode ser
USADO na mesma transação — aqui só adicionamos).

Revision ID: f0c1a2b3c4d5
Revises: e9b0c1d2f3a4
Create Date: 2026-06-14 17:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f0c1a2b3c4d5"
down_revision: Union[str, None] = "e9b0c1d2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'suporte'")


def downgrade() -> None:
    # Postgres não suporta remover valor de enum sem recriar o tipo. No-op
    # intencional: reverter exigiria recriar app_role e reescrever a coluna.
    pass
