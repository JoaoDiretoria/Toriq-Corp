"""instagram: comentarios (config + leads + gatilhos + comentarios)

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "e7f8a9b0c1d2"
down_revision = "d6e7f8a9b0c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Credenciais Instagram na MESMA config de disparo (igual whatsapp_*).
    op.add_column("vendas_disparo_config", sa.Column("instagram_user_id", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_username", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_token_enc", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_app_secret_enc", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_verify_token", sa.Text(), nullable=True), schema="public")

    # 2) Identidade Instagram no lead (p/ casar o @ que comentou).
    op.add_column("vendas_leads", sa.Column("instagram_user_id", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_leads", sa.Column("instagram_username", sa.Text(), nullable=True), schema="public")
    op.create_index("idx_vendas_leads_instagram_user_id", "vendas_leads", ["empresa_id", "instagram_user_id"], schema="public")

    # 3) Gatilhos (regras híbridas: palavra-chave dispara, IA escreve).
    op.create_table(
        "vendas_instagram_gatilhos",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("palavra_chave", sa.Text(), nullable=True),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("responder_publico", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("responder_dm", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("instrucao_ia", sa.Text(), nullable=True),
        sa.Column("resposta_publica_fixa", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_gatilhos_empresa_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_gatilhos_pkey"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_gatilhos_empresa_id", "vendas_instagram_gatilhos", ["empresa_id"], schema="public")

    # 4) Comentarios (idempotencia + historico + alimenta a tela).
    op.create_table(
        "vendas_instagram_comentarios",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("comment_id", sa.Text(), nullable=False),
        sa.Column("media_id", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Text(), nullable=True),
        sa.Column("from_user_id", sa.Text(), nullable=True),
        sa.Column("from_username", sa.Text(), nullable=True),
        sa.Column("texto", sa.Text(), nullable=True),
        sa.Column("lead_id", sa.Uuid(), nullable=True),
        sa.Column("gatilho_id", sa.Uuid(), nullable=True),
        sa.Column("respondido_publico", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("respondido_dm", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resposta_texto", sa.Text(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_comentarios_empresa_id_fkey"),
        sa.ForeignKeyConstraint(["lead_id"], ["public.vendas_leads.id"], ondelete="SET NULL", name="vendas_instagram_comentarios_lead_id_fkey"),
        sa.ForeignKeyConstraint(["gatilho_id"], ["public.vendas_instagram_gatilhos.id"], ondelete="SET NULL", name="vendas_instagram_comentarios_gatilho_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_comentarios_pkey"),
        sa.UniqueConstraint("empresa_id", "comment_id", name="vendas_instagram_comentarios_empresa_comment_key"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_comentarios_empresa_id", "vendas_instagram_comentarios", ["empresa_id"], schema="public")


def downgrade() -> None:
    op.drop_table("vendas_instagram_comentarios", schema="public")
    op.drop_table("vendas_instagram_gatilhos", schema="public")
    op.drop_index("idx_vendas_leads_instagram_user_id", table_name="vendas_leads", schema="public")
    op.drop_column("vendas_leads", "instagram_username", schema="public")
    op.drop_column("vendas_leads", "instagram_user_id", schema="public")
    for col in ("instagram_verify_token", "instagram_app_secret_enc", "instagram_token_enc", "instagram_username", "instagram_user_id"):
        op.drop_column("vendas_disparo_config", col, schema="public")
