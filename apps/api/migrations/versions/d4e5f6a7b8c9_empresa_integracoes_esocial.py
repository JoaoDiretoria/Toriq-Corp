"""adiciona metadados do certificado em empresa_integracoes_esocial

A tabela empresa_integracoes_esocial JÁ EXISTE no banco (PK em `id`, unique em
`empresa_id` → 1 config por empresa). Esta migration apenas ACRESCENTA as colunas
de metadados do certificado A1 usadas para exibição (certificado_cn,
certificado_serial, certificado_emissor) — idempotente via IF NOT EXISTS.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "ADD COLUMN IF NOT EXISTS certificado_cn text"
    )
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "ADD COLUMN IF NOT EXISTS certificado_serial text"
    )
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "ADD COLUMN IF NOT EXISTS certificado_emissor text"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "DROP COLUMN IF EXISTS certificado_emissor"
    )
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "DROP COLUMN IF EXISTS certificado_serial"
    )
    op.execute(
        "ALTER TABLE public.empresa_integracoes_esocial "
        "DROP COLUMN IF EXISTS certificado_cn"
    )
