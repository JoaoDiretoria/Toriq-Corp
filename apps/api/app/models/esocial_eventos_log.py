"""Log de transmissão de eventos eSocial SST.

Cada envio de evento (S-2210/2220/2240) registra uma linha com o protocolo
devolvido pelo eSocial; a consulta de lote atualiza o ``status`` e o ``recibo``.
``payload_hash`` permite detectar reenvio do mesmo conteúdo (idempotência).
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import DateTime, Index, PrimaryKeyConstraint, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class EsocialEventosLog(Base):
    __tablename__ = "esocial_eventos_log"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="esocial_eventos_log_pkey"),
        Index("idx_esocial_eventos_empresa", "empresa_id"),
        Index("idx_esocial_eventos_protocolo", "protocolo"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)  # S-2210/2220/2240
    fonte_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    id_lote: Mapped[Optional[str]] = mapped_column(Text)
    protocolo: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'enviado'")
    )
    recibo: Mapped[Optional[str]] = mapped_column(Text)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    payload_hash: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
