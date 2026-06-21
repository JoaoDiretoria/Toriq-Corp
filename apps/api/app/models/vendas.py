"""Models do módulo Toriq Vendas — FASE 0 (Fundação).

Tabelas novas (criadas na migration e6f7a8b9c0d1) — não vieram da introspecção do
Supabase. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

Escopo da Fase 0: leads + tags + segmentação + import. NADA de Apify/scraping,
disparo, WhatsApp ou SDR (fases 1-4).

- vendas_leads ....... lead comercial (manual/importado). dedupe por (empresa_id, dedupe_key).
- vendas_tags ........ tag de lead (unique por (empresa_id, nome)).
- vendas_lead_tags ... N:N entre leads e tags (PK composta).
- vendas_segmentos ... segmento salvo (filtros jsonb aplicados sobre vendas_leads).
"""
import datetime
import decimal
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


class VendasLeads(Base):
    __tablename__ = "vendas_leads"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_leads_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["job_id"], ["public.vendas_jobs.id"],
            ondelete="SET NULL", name="vendas_leads_job_id_fkey",
        ),
        ForeignKeyConstraint(
            ["stage_id"], ["public.vendas_pipeline_stages.id"],
            ondelete="SET NULL", name="vendas_leads_stage_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_leads_pkey"),
        Index("idx_vendas_leads_empresa_id", "empresa_id"),
        UniqueConstraint(
            "empresa_id", "dedupe_key", name="vendas_leads_empresa_dedupe_key"
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[Optional[str]] = mapped_column(Text)
    empresa_nome: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    plataforma: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(Text)
    avaliacao: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    dados_brutos: Mapped[Optional[dict]] = mapped_column(JSONB)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'novo'"))
    origem: Mapped[Optional[str]] = mapped_column(Text)
    consentimento: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    dedupe_key: Mapped[Optional[str]] = mapped_column(Text)
    # Origem do lead quando veio de prospecção (Apify) — FK para vendas_jobs.
    # Adicionada na Fase 1 (migration f7a8b9c0d1e2). SET NULL ao apagar o job.
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    # SDR Inteligente (Fase 4 — migration b0d1e2f3a4b5). Qualificação por IA.
    sdr_status: Mapped[Optional[str]] = mapped_column(Text)
    sdr_score: Mapped[Optional[int]] = mapped_column(Integer)
    sdr_notas: Mapped[Optional[str]] = mapped_column(Text)
    sdr_proximo_followup: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True)
    )
    # Pipeline & Conversas (CRM estilo Chatwoot — migration b6e7f8a9c0d1).
    # stage_id: estágio do kanban (FK vendas_pipeline_stages, SET NULL ao apagar);
    # is_pinned/is_archived: organização da inbox; last_message_at/last_read_at:
    # ordenação + cálculo de não-lidas; pending_reply: "aguardando resposta";
    # temperatura: quente|morno|frio; valor_estimado: valor do negócio (R$).
    stage_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    is_pinned: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    is_archived: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    last_message_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    last_read_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    pending_reply: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("false")
    )
    temperatura: Mapped[Optional[str]] = mapped_column(Text)
    valor_estimado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    # Ordem manual do card dentro do estágio no kanban (migration c7f8a9b0d1e2).
    board_ordem: Mapped[Optional[int]] = mapped_column(Integer)
    # Operador responsável pela conversa (assignee estilo Chatwoot). FK users
    # SET NULL ao apagar o usuário (migration c7f8a9b0d1e2).
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    # Canal por onde chegou o último inbound do lead (define o transporte de
    # resposta do SDR). 'whatsapp' (Meta, default) | 'whatsapp_evo' (Evolution).
    ultimo_canal: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'whatsapp'")
    )
    # Debounce do SDR (canal Evolution): mensagens que chegaram rápido são
    # acumuladas aqui; o scheduler drena após a janela e chama o SDR uma vez.
    sdr_buffer: Mapped[Optional[str]] = mapped_column(Text)
    sdr_buffer_ate: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasTags(Base):
    __tablename__ = "vendas_tags"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_tags_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_tags_pkey"),
        Index("idx_vendas_tags_empresa_id", "empresa_id"),
        UniqueConstraint("empresa_id", "nome", name="vendas_tags_empresa_nome_key"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasLeadTags(Base):
    __tablename__ = "vendas_lead_tags"
    __table_args__ = (
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="CASCADE", name="vendas_lead_tags_lead_id_fkey",
        ),
        ForeignKeyConstraint(
            ["tag_id"], ["public.vendas_tags.id"],
            ondelete="CASCADE", name="vendas_lead_tags_tag_id_fkey",
        ),
        PrimaryKeyConstraint("lead_id", "tag_id", name="vendas_lead_tags_pkey"),
        {"schema": "public"},
    )

    lead_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)


class VendasSegmentos(Base):
    __tablename__ = "vendas_segmentos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_segmentos_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_segmentos_pkey"),
        Index("idx_vendas_segmentos_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    filtros: Mapped[Optional[dict]] = mapped_column(JSONB)
    cor: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
