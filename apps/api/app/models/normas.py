"""Model de normas_regulamentadoras (tenant-scoped por empresa).

Tabela nova (criada na migration c3d4e5f6a7b8) — não veio da introspecção do
Supabase. Usa o Base compartilhado dos models gerados.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKeyConstraint,
    Index,
    PrimaryKeyConstraint,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class NormasRegulamentadoras(Base):
    __tablename__ = "normas_regulamentadoras"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="normas_regulamentadoras_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="normas_regulamentadoras_pkey"),
        Index("idx_normas_regulamentadoras_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nr: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
