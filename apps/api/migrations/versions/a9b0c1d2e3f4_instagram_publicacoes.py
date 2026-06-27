"""instagram: tabela de publicacoes

Revision ID: a9b0c1d2e3f4
Revises: f8a9b0c1d2e3
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas_instagram_publicacoes",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("midias", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'processando'"), nullable=False),
        sa.Column("creation_id", sa.Text(), nullable=True),
        sa.Column("ig_media_id", sa.Text(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_publicacoes_empresa_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_publicacoes_pkey"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_publicacoes_empresa_id", "vendas_instagram_publicacoes", ["empresa_id"], schema="public")


def downgrade() -> None:
    op.drop_index("idx_vendas_instagram_publicacoes_empresa_id", table_name="vendas_instagram_publicacoes", schema="public")
    op.drop_table("vendas_instagram_publicacoes", schema="public")
