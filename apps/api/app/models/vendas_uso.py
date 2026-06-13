"""Model do módulo Toriq Vendas — FASE 5 (Medição & Contratação / white-label).

Tabela nova: registra o uso (consumo) do Toriq Vendas por empresa, base para
medição/cobrança dos planos. Tenant por empresa_id.

- vendas_uso .. 1 linha por evento de uso (métrica + quantidade), com período
  ('YYYY-MM') para acumular por mês. As métricas são gravadas pelos serviços do
  integrador via ``app.services.vendas_uso.registrar_uso``.

Métricas previstas (nomes EXATOS): "apify_runs", "leads_captados",
"emails_enviados", "whatsapp_enviados", "sdr_qualificacoes", "sdr_conversas".

NÃO criar migration aqui — o integrador roda a migration desta tabela.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
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


class VendasUso(Base):
    __tablename__ = "vendas_uso"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_uso_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_uso_pkey"),
        Index("idx_vendas_uso_empresa_metrica", "empresa_id", "metrica"),
        Index("idx_vendas_uso_empresa_periodo", "empresa_id", "periodo"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    metrica: Mapped[str] = mapped_column(Text, nullable=False)
    quantidade: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("1")
    )
    referencia: Mapped[Optional[str]] = mapped_column(Text)
    periodo: Mapped[Optional[str]] = mapped_column(Text)  # 'YYYY-MM'
    meta: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
