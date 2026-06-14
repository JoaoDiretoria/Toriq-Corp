"""Webhook do Resend — eventos de entrega de email.

Rota PÚBLICA (o Resend chama). A segurança vem da assinatura Svix, validada
contra ``RESEND_WEBHOOK_SECRET``. Casa o evento com ``email_envios`` pelo
``resend_id`` (= ``data.email_id``) e atualiza o status.
"""
from __future__ import annotations

import datetime

from fastapi import APIRouter, Header, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.config import settings
from app.core.db import get_db
from app.integrations.resend_email import verificar_assinatura_webhook
from app.models.email_envios import EmailEnvios

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Mapa do tipo de evento Resend → nosso status. Eventos de engajamento
# (opened/clicked) não rebaixam o status, então ficam de fora.
_EVENTO_STATUS = {
    "email.sent": "enviado",
    "email.delivered": "entregue",
    "email.delivery_delayed": "atrasado",
    "email.bounced": "bounce",
    "email.complained": "spam",
}


@router.post("/resend")
async def receber_webhook_resend(
    request: Request,
    svix_id: str | None = Header(None, alias="svix-id"),
    svix_timestamp: str | None = Header(None, alias="svix-timestamp"),
    svix_signature: str | None = Header(None, alias="svix-signature"),
    db: AsyncSession = Depends(get_db),
):
    """Recebe eventos de entrega do Resend e atualiza ``email_envios``."""
    if not settings.resend_webhook_secret:
        return JSONResponse(
            {"detail": "webhook não configurado"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    raw = await request.body()
    if not verificar_assinatura_webhook(
        secret=settings.resend_webhook_secret,
        svix_id=svix_id,
        svix_timestamp=svix_timestamp,
        svix_signature=svix_signature,
        raw_body=raw,
    ):
        return JSONResponse(
            {"detail": "assinatura inválida"}, status_code=status.HTTP_403_FORBIDDEN
        )

    try:
        evento = await request.json()
    except Exception:  # noqa: BLE001
        evento = {}

    tipo = evento.get("type")
    data = evento.get("data") or {}
    email_id = data.get("email_id") or data.get("id")
    novo_status = _EVENTO_STATUS.get(tipo)

    if email_id and novo_status:
        registro = await db.scalar(
            select(EmailEnvios).where(EmailEnvios.resend_id == email_id)
        )
        if registro is not None:
            registro.status = novo_status
            registro.updated_at = datetime.datetime.now(datetime.timezone.utc)
            if novo_status in ("bounce", "spam"):
                motivo = data.get("bounce", {}) or data.get("reason")
                registro.erro = str(motivo)[:1000] if motivo else novo_status
            await db.commit()

    # Sempre 200 — o Resend reenvia se não receber 2xx.
    return JSONResponse({"ok": True}, status_code=200)
