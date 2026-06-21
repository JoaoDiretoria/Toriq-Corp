"""Models do canal WhatsApp via Evolution API (self-hosted).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_evolution_servidor ... 1 linha global (config do servidor Evolution na VPS):
  base_url + api_key criptografada + URL pública do webhook. Só super admin escreve.
- vendas_evolution_instancias .. N por empresa. Cada instância = 1 conexão de WhatsApp
  (1 número), criada no servidor compartilhado com nome namespeado por empresa.
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
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasEvolutionServidor(Base):
    __tablename__ = "vendas_evolution_servidor"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="vendas_evolution_servidor_pkey"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    base_url: Mapped[Optional[str]] = mapped_column(Text)
    api_key_enc: Mapped[Optional[str]] = mapped_column(Text)
    webhook_base_url: Mapped[Optional[str]] = mapped_column(Text)
    limite_padrao_instancias: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("1")
    )
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasEvolutionInstancias(Base):
    __tablename__ = "vendas_evolution_instancias"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_evolution_instancias_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_evolution_instancias_pkey"),
        UniqueConstraint("instance_name", name="vendas_evolution_instancias_name_key"),
        UniqueConstraint(
            "webhook_token", name="vendas_evolution_instancias_webhook_token_key"
        ),
        Index("idx_vendas_evolution_instancias_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_exibicao: Mapped[str] = mapped_column(Text, nullable=False)
    instance_name: Mapped[str] = mapped_column(Text, nullable=False)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'criada'")
    )
    instance_token_enc: Mapped[Optional[str]] = mapped_column(Text)
    webhook_token: Mapped[str] = mapped_column(Text, nullable=False)
    criado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasEvolutionWebhookEventos(Base):
    """Idempotência do webhook: 1 linha por evento, UNIQUE em event_id.

    A Evolution reenvia o webhook se não receber 200 rápido. Antes de processar,
    inserimos o evento aqui; o UNIQUE em event_id descarta duplicatas (evita, p.ex.,
    o SDR responder o mesmo lead duas vezes). Eventos de mensagem usam o
    ``data.key.id`` como event_id; demais usam um id sintético (sempre processam).
    """

    __tablename__ = "vendas_evolution_webhook_eventos"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="vendas_evolution_webhook_eventos_pkey"),
        UniqueConstraint(
            "event_id", name="vendas_evolution_webhook_eventos_event_id_key"
        ),
        Index("idx_vendas_evolution_webhook_eventos_instancia", "instancia_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    instancia_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    event_id: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[Optional[str]] = mapped_column(Text)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'received'")
    )
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    processed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
