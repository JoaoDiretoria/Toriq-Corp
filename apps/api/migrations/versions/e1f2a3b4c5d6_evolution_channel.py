"""canal evolution: servidor, instancias, instancia_id em mensagens, ultimo_canal em leads

Revision ID: e1f2a3b4c5d6
Revises: c7d8e9f0a1b2
Create Date: 2026-06-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas_evolution_servidor",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("api_key_enc", sa.Text(), nullable=True),
        sa.Column("webhook_base_url", sa.Text(), nullable=True),
        sa.Column(
            "limite_padrao_instancias", sa.Integer(),
            server_default=sa.text("1"), nullable=True,
        ),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.PrimaryKeyConstraint("id", name="vendas_evolution_servidor_pkey"),
        schema="public",
    )
    op.create_table(
        "vendas_evolution_instancias",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("nome_exibicao", sa.Text(), nullable=False),
        sa.Column("instance_name", sa.Text(), nullable=False),
        sa.Column("numero", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'criada'"), nullable=True),
        sa.Column("instance_token_enc", sa.Text(), nullable=True),
        sa.Column("webhook_token", sa.Text(), nullable=False),
        sa.Column("criado_por", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_evolution_instancias_empresa_id_fkey",
        ),
        sa.PrimaryKeyConstraint("id", name="vendas_evolution_instancias_pkey"),
        sa.UniqueConstraint("instance_name", name="vendas_evolution_instancias_name_key"),
        sa.UniqueConstraint(
            "webhook_token", name="vendas_evolution_instancias_webhook_token_key"
        ),
        schema="public",
    )
    op.create_index(
        "idx_vendas_evolution_instancias_empresa_id",
        "vendas_evolution_instancias", ["empresa_id"], schema="public",
    )
    op.add_column(
        "vendas_mensagens",
        sa.Column("instancia_id", sa.Uuid(), nullable=True),
        schema="public",
    )
    op.add_column(
        "vendas_leads",
        sa.Column(
            "ultimo_canal", sa.Text(),
            server_default=sa.text("'whatsapp'"), nullable=True,
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_leads", "ultimo_canal", schema="public")
    op.drop_column("vendas_mensagens", "instancia_id", schema="public")
    op.drop_index(
        "idx_vendas_evolution_instancias_empresa_id",
        table_name="vendas_evolution_instancias", schema="public",
    )
    op.drop_table("vendas_evolution_instancias", schema="public")
    op.drop_table("vendas_evolution_servidor", schema="public")
