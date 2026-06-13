"""Models do módulo Toriq Vendas — FASE 4 (SDR Inteligente — agente de IA Claude).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_sdr_config ...... configuração do agente SDR da empresa (provider + api_key
  criptografada em repouso + prompts dinâmicos). 1 linha por empresa (unique em empresa_id).
- vendas_sdr_interacoes .. histórico de interações do agente com cada lead (qualificação
  e mensagens), com papel (usuario/assistente) e meta em JSONB.

Os campos sdr_* em vendas_leads são adicionados pelo integrador (migration à parte).
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
    Numeric,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasSdrConfig(Base):
    __tablename__ = "vendas_sdr_config"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_sdr_config_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_sdr_config_pkey"),
        UniqueConstraint("empresa_id", name="vendas_sdr_config_empresa_id_key"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    provider: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'anthropic'")
    )
    api_key_enc: Mapped[Optional[str]] = mapped_column(Text)
    modelo: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'claude-sonnet-4-6'")
    )
    prompt_sistema: Mapped[Optional[str]] = mapped_column(Text)
    temperatura: Mapped[Optional[float]] = mapped_column(
        Numeric, server_default=text("0.7")
    )
    diretrizes: Mapped[Optional[str]] = mapped_column(Text)
    prompt_qualificacao: Mapped[Optional[str]] = mapped_column(Text)
    persona: Mapped[Optional[str]] = mapped_column(Text)
    objetivo: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasSdrInteracoes(Base):
    __tablename__ = "vendas_sdr_interacoes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_sdr_interacoes_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="CASCADE", name="vendas_sdr_interacoes_lead_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_sdr_interacoes_pkey"),
        Index("idx_vendas_sdr_interacoes_lead_id", "lead_id"),
        Index("idx_vendas_sdr_interacoes_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    lead_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    papel: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(Text)
    conteudo: Mapped[Optional[str]] = mapped_column(Text)
    meta: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
