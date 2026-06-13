"""Models do módulo Toriq Vendas — FASE 1 (Prospecção via Apify).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_config ... configuração da empresa (token Apify criptografado + overrides
  de actors). 1 linha por empresa (unique em empresa_id).
- vendas_jobs ..... job de scraping disparado num actor da Apify. Guarda parâmetros,
  ids da run/dataset na Apify, status, contadores e custo.
"""
import datetime
import decimal
import uuid
from typing import Optional

from sqlalchemy import (
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


class VendasConfig(Base):
    __tablename__ = "vendas_config"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_config_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_config_pkey"),
        UniqueConstraint("empresa_id", name="vendas_config_empresa_id_key"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    apify_token_enc: Mapped[Optional[str]] = mapped_column(Text)
    actors: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasJobs(Base):
    __tablename__ = "vendas_jobs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_jobs_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["tag_id"], ["public.vendas_tags.id"],
            ondelete="SET NULL", name="vendas_jobs_tag_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_jobs_pkey"),
        Index("idx_vendas_jobs_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    plataforma: Mapped[str] = mapped_column(Text, nullable=False)
    parametros: Mapped[Optional[dict]] = mapped_column(JSONB)
    tag_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    apify_run_id: Mapped[Optional[str]] = mapped_column(Text)
    apify_dataset_id: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'pending'")
    )
    total_captados: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    total_importados: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    total_duplicados: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("0")
    )
    custo: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
