"""Seed do módulo 'Toriq Corp' no catálogo (modulos)

O backend novo só semeava 'Toriq Vendas' (c1e2f3a4b5c6). 'Toriq Corp' existia
apenas nas migrações antigas do Supabase, que não rodam aqui — por isso a aba
"Módulos" do super admin aparecia vazia (interseção MODULOS_CONFIG ∩ catálogo = ∅,
já que MODULOS_CONFIG espera o nome exato 'Toriq Corp').

Idempotente: só insere se ainda não existir um módulo com nome 'Toriq Corp'
(guard por nome, não por id, para tolerar uma linha legada com outro UUID).

Revision ID: c7d8e9f0a1b2
Revises: a1d2e3f4a5b6
Create Date: 2026-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, None] = 'a1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# UUID fixo do módulo Corp no catálogo (idempotência por nome no upgrade).
_MODULO_ID = 'c7d8e9f0-a1b2-4c3d-8e4f-000000000001'


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO public.modulos (id, nome, rota, descricao, icone) "
            "SELECT CAST(:id AS uuid), :nome, :rota, :descricao, :icone "
            "WHERE NOT EXISTS (SELECT 1 FROM public.modulos WHERE nome = :nome)"
        ).bindparams(
            id=_MODULO_ID,
            nome='Toriq Corp',
            rota='/sst',
            descricao=(
                'Gestão empresarial: tarefas, contratos, setores, financeiro, '
                'frota e equipamentos.'
            ),
            icone='Briefcase',
        )
    )


def downgrade() -> None:
    # Remove apenas a linha que ESTE seed criou (pelo id fixo); não toca em uma
    # eventual linha legada de mesmo nome com outro id.
    op.execute(
        sa.text("DELETE FROM public.modulos WHERE id = :id").bindparams(id=_MODULO_ID)
    )
