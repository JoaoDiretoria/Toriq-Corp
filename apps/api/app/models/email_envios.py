"""Model do log de emails transacionais (envio via Resend).

Cada envio transacional (convite, reset de senha, etc.) registra uma linha
aqui com o ``resend_id``; o webhook do Resend atualiza o ``status``
(enviado→entregue/bounce/spam) casando por esse id.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import DateTime, Index, PrimaryKeyConstraint, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class EmailEnvios(Base):
    __tablename__ = "email_envios"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="email_envios_pkey"),
        Index("idx_email_envios_resend_id", "resend_id"),
        Index("idx_email_envios_empresa", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    to_email: Mapped[str] = mapped_column(Text, nullable=False)
    assunto: Mapped[Optional[str]] = mapped_column(Text)
    template: Mapped[Optional[str]] = mapped_column(Text)
    resend_id: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'enviado'")
    )
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
