"""Models do canal Instagram (Fase IG-1) — gatilhos + comentários.

Tabelas novas (migration e7f8a9b0c1d2). Base compartilhado, schema public,
tenant por empresa_id. As credenciais do IG ficam em vendas_disparo_config
(colunas instagram_*), igual ao WhatsApp.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Index,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasInstagramGatilhos(Base):
    __tablename__ = "vendas_instagram_gatilhos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_instagram_gatilhos_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_instagram_gatilhos_pkey"),
        Index("idx_vendas_instagram_gatilhos_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    palavra_chave: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    responder_publico: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    responder_dm: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    instrucao_ia: Mapped[Optional[str]] = mapped_column(Text)
    resposta_publica_fixa: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasInstagramComentarios(Base):
    __tablename__ = "vendas_instagram_comentarios"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_instagram_comentarios_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="SET NULL", name="vendas_instagram_comentarios_lead_id_fkey",
        ),
        ForeignKeyConstraint(
            ["gatilho_id"], ["public.vendas_instagram_gatilhos.id"],
            ondelete="SET NULL", name="vendas_instagram_comentarios_gatilho_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_instagram_comentarios_pkey"),
        UniqueConstraint(
            "empresa_id", "comment_id",
            name="vendas_instagram_comentarios_empresa_comment_key",
        ),
        Index("idx_vendas_instagram_comentarios_empresa_id", "empresa_id"),
        Index("idx_vendas_instagram_comentarios_lead_id", "lead_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    comment_id: Mapped[str] = mapped_column(Text, nullable=False)
    media_id: Mapped[Optional[str]] = mapped_column(Text)
    parent_id: Mapped[Optional[str]] = mapped_column(Text)
    from_user_id: Mapped[Optional[str]] = mapped_column(Text)
    from_username: Mapped[Optional[str]] = mapped_column(Text)
    texto: Mapped[Optional[str]] = mapped_column(Text)
    lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    gatilho_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    respondido_publico: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    respondido_dm: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    resposta_texto: Mapped[Optional[str]] = mapped_column(Text)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
