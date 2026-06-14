"""Models do módulo Toriq Vendas — Pipeline & Conversas (CRM estilo Chatwoot/tio-crm).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_pipeline_stages .. estágios do funil (kanban) por empresa.
- vendas_conversas ........ thread de mensagens por lead (lead|agente|sdr|sistema).

As colunas novas em vendas_leads (stage_id, is_pinned, is_archived, last_message_at,
last_read_at, pending_reply, temperatura, valor_estimado) são adicionadas pelo
integrador via migration — aqui só referenciamos lead_id por FK.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    Text,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasPipelineStages(Base):
    __tablename__ = "vendas_pipeline_stages"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_pipeline_stages_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_pipeline_stages_pkey"),
        Index("idx_vendas_pipeline_stages_empresa", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(Text)
    ordem: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    is_closed: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    is_won: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasConversas(Base):
    __tablename__ = "vendas_conversas"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_conversas_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="CASCADE", name="vendas_conversas_lead_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_conversas_pkey"),
        Index("idx_vendas_conversas_lead", "lead_id"),
        Index("idx_vendas_conversas_empresa", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    lead_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    sender_type: Mapped[str] = mapped_column(Text, nullable=False)
    canal: Mapped[Optional[str]] = mapped_column(Text)
    conteudo: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(Text)
    media: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
