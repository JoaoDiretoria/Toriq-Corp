"""Models do módulo Toriq Vendas — FASE 2 (Disparo em Massa — Email).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_disparo_config .. configuração de envio da empresa (provedor + SMTP, com a
  senha SMTP criptografada em repouso). 1 linha por empresa (unique em empresa_id).
- vendas_templates ....... templates de mensagem (assunto + corpo), reusáveis por canal.
- vendas_campanhas ....... campanha de disparo sobre um segmento ou lista de leads.
- vendas_mensagens ....... 1 linha por destinatário/campanha, com status e tracking.
- vendas_supressao ....... lista de supressão (opt-out LGPD) por empresa.

O campo 'canal' já fica previsto para reuso em WhatsApp (Fase 3); agora só 'email'.
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


class VendasDisparoConfig(Base):
    __tablename__ = "vendas_disparo_config"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_disparo_config_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_disparo_config_pkey"),
        UniqueConstraint("empresa_id", name="vendas_disparo_config_empresa_id_key"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    email_provider: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'smtp'")
    )
    email_remetente: Mapped[Optional[str]] = mapped_column(Text)
    email_remetente_nome: Mapped[Optional[str]] = mapped_column(Text)
    smtp_host: Mapped[Optional[str]] = mapped_column(Text)
    smtp_port: Mapped[Optional[int]] = mapped_column(Integer)
    smtp_user: Mapped[Optional[str]] = mapped_column(Text)
    smtp_password_enc: Mapped[Optional[str]] = mapped_column(Text)
    smtp_use_tls: Mapped[Optional[bool]] = mapped_column(
        Boolean, server_default=text("true")
    )
    email_rate_limit: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("100")
    )
    # WhatsApp (Fase 3 — Meta Cloud API). Token e app_secret criptografados.
    whatsapp_phone_id: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_waba_id: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_token_enc: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_app_secret_enc: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_verify_token: Mapped[Optional[str]] = mapped_column(Text)
    whatsapp_rate_limit: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("80")
    )
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasTemplates(Base):
    __tablename__ = "vendas_templates"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_templates_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_templates_pkey"),
        Index("idx_vendas_templates_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    canal: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'email'")
    )
    assunto: Mapped[Optional[str]] = mapped_column(Text)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    meta_template_name: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasCampanhas(Base):
    __tablename__ = "vendas_campanhas"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_campanhas_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["template_id"], ["public.vendas_templates.id"],
            ondelete="SET NULL", name="vendas_campanhas_template_id_fkey",
        ),
        ForeignKeyConstraint(
            ["segmento_id"], ["public.vendas_segmentos.id"],
            ondelete="SET NULL", name="vendas_campanhas_segmento_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_campanhas_pkey"),
        Index("idx_vendas_campanhas_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    canal: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'email'")
    )
    segmento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    lead_ids: Mapped[Optional[list]] = mapped_column(JSONB)
    agendada_para: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'rascunho'")
    )
    total_destinatarios: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    total_enviados: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    total_erros: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class VendasMensagens(Base):
    __tablename__ = "vendas_mensagens"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_mensagens_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["campanha_id"], ["public.vendas_campanhas.id"],
            ondelete="CASCADE", name="vendas_mensagens_campanha_id_fkey",
        ),
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="SET NULL", name="vendas_mensagens_lead_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_mensagens_pkey"),
        Index("idx_vendas_mensagens_campanha_id", "campanha_id"),
        Index("idx_vendas_mensagens_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    campanha_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    canal: Mapped[Optional[str]] = mapped_column(Text)
    destinatario: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'pendente'")
    )
    provider_id: Mapped[Optional[str]] = mapped_column(Text)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    enviado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    entregue_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    lido_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    respondeu_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasSupressao(Base):
    __tablename__ = "vendas_supressao"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_supressao_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_supressao_pkey"),
        UniqueConstraint(
            "empresa_id", "tipo", "valor", name="vendas_supressao_empresa_tipo_valor_key"
        ),
        Index("idx_vendas_supressao_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[str] = mapped_column(Text, nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
