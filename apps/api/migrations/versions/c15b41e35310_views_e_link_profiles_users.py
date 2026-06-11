"""views e link profiles->users

Revision ID: c15b41e35310
Revises: 73b23d643565
Create Date: 2026-06-11 19:44:00.434487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c15b41e35310'
down_revision: Union[str, Sequence[str], None] = '73b23d643565'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEF_ATIVIDADES_UNIFICADAS = """
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.updated_at, a.created_at) AS updated_at,
    'funil_generico'::text AS funil_origem,
    f.nome AS funil_nome,
    f.empresa_id,
    c.titulo AS card_titulo,
    f.id AS funil_id
   FROM funil_card_atividades a
     JOIN funil_cards c ON c.id = a.card_id
     JOIN funis f ON f.id = c.funil_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.data_conclusao, a.created_at) AS updated_at,
    'prospeccao'::text AS funil_origem,
    'Prospecção (SDR)'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
   FROM prospeccao_atividades a
     JOIN prospeccao_cards c ON c.id = a.card_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.updated_at, a.created_at) AS updated_at,
    'closer'::text AS funil_origem,
    'Closer'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
   FROM closer_atividades a
     JOIN closer_cards c ON c.id = a.card_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.data_conclusao, a.created_at) AS updated_at,
    'pos_venda'::text AS funil_origem,
    'Pós-Venda'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
   FROM pos_venda_atividades a
     JOIN pos_venda_cards c ON c.id = a.card_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo,
    a.horario,
    a.status,
    a.usuario_id AS criador_id,
    NULL::uuid AS responsavel_id,
    a.created_at,
    a.created_at AS updated_at,
    'cross_selling'::text AS funil_origem,
    'Cross-Selling'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
   FROM cross_selling_atividades a
     JOIN cross_selling_cards c ON c.id = a.card_id
"""

DEF_BLOG_TRENDING = """
 SELECT b.id,
    b.titulo,
    b.slug,
    b.descricao,
    b.imagem_capa_url,
    b.publicado_em,
    b.tempo_leitura,
    b.categoria_id,
    b.autor_id,
    count(bv.id) AS clicks_30d,
    count(
        CASE
            WHEN bv.created_at > (now() - '7 days'::interval) THEN 1
            ELSE NULL::integer
        END) AS clicks_7d,
    count(
        CASE
            WHEN bv.created_at > (now() - '1 day'::interval) THEN 1
            ELSE NULL::integer
        END) AS clicks_24h
   FROM blogs b
     LEFT JOIN blog_visualizacoes bv ON b.id = bv.blog_id AND bv.created_at > (now() - '30 days'::interval)
  WHERE b.status::text = 'publicado'::text
  GROUP BY b.id
  ORDER BY (count(
        CASE
            WHEN bv.created_at > (now() - '7 days'::interval) THEN 1
            ELSE NULL::integer
        END)) DESC, (count(bv.id)) DESC
"""


def upgrade() -> None:
    """Upgrade schema."""
    # As views vieram como tabelas vazias do create_all; trocar por views reais.
    op.drop_table("atividades_unificadas", schema="public")
    op.drop_table("blog_trending", schema="public")
    op.execute(f"CREATE VIEW public.atividades_unificadas AS {DEF_ATIVIDADES_UNIFICADAS}")
    op.execute(f"CREATE VIEW public.blog_trending AS {DEF_BLOG_TRENDING}")
    # Vincular o perfil de negócio à tabela de credenciais.
    op.create_foreign_key(
        "profiles_id_users_fkey", "profiles", "users",
        ["id"], ["id"], ondelete="CASCADE",
        source_schema="public",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("profiles_id_users_fkey", "profiles", schema="public", type_="foreignkey")
    op.execute("DROP VIEW IF EXISTS public.blog_trending")
    op.execute("DROP VIEW IF EXISTS public.atividades_unificadas")
    # Recriar as tabelas placeholder para simetria (sem dados, sem constraints)
    op.create_table(
        "atividades_unificadas",
        sa.Column("id", sa.Uuid(), nullable=True),
        sa.Column("card_id", sa.Uuid(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=True),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("prazo", sa.Text(), nullable=True),
        sa.Column("horario", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("criador_id", sa.Uuid(), nullable=True),
        sa.Column("responsavel_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("funil_origem", sa.Text(), nullable=True),
        sa.Column("funil_nome", sa.String(), nullable=True),
        sa.Column("empresa_id", sa.Uuid(), nullable=True),
        sa.Column("card_titulo", sa.String(), nullable=True),
        sa.Column("funil_id", sa.Uuid(), nullable=True),
        schema="public",
    )
    op.create_table(
        "blog_trending",
        sa.Column("id", sa.Uuid(), nullable=True),
        sa.Column("titulo", sa.String(length=255), nullable=True),
        sa.Column("slug", sa.String(length=255), nullable=True),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("imagem_capa_url", sa.Text(), nullable=True),
        sa.Column("publicado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tempo_leitura", sa.Integer(), nullable=True),
        sa.Column("categoria_id", sa.Uuid(), nullable=True),
        sa.Column("autor_id", sa.Uuid(), nullable=True),
        sa.Column("clicks_30d", sa.BigInteger(), nullable=True),
        sa.Column("clicks_7d", sa.BigInteger(), nullable=True),
        sa.Column("clicks_24h", sa.BigInteger(), nullable=True),
        schema="public",
    )
