"""Toriq Vendas — FASE 3 (WhatsApp via API oficial Meta): router do webhook.

Expõe APENAS o webhook da Meta (Cloud API / Graph API). A configuração do
WhatsApp é salva pelo MESMO endpoint da Fase 2 (/vendas/disparo/config — campos
whatsapp_*), e o envio de campanhas reusa o fluxo de vendas_disparo (o integrador
liga o despacho por canal). Aqui ficam só as 2 rotas PÚBLICAS que a Meta chama:

- GET  /vendas/whatsapp/webhook → verificação (hub.mode/hub.verify_token/hub.challenge).
- POST /vendas/whatsapp/webhook → eventos (statuses + mensagens inbound), com
  validação de assinatura HMAC SHA-256 (X-Hub-Signature-256).

São PÚBLICAS (sem auth) porque a Meta as chama. A segurança vem de:
- GET: o verify_token tem de bater com o de ALGUMA empresa (whatsapp_verify_token).
- POST: a assinatura HMAC é validada contra o app_secret da empresa dona do
  payload (descoberta pelo waba_id ou phone_number_id). Assinatura inválida → 403.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, Query, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret
from app.integrations.whatsapp_meta import (
    check_signature,
    parse_webhook,
    verify_webhook,
)
from app.models.vendas_disparo import VendasDisparoConfig
from app.services import vendas_whatsapp as svc

router = APIRouter(prefix="/vendas", tags=["vendas-whatsapp"])


# ═══════════════════════════════════════════════════════════════════════════════
# GET — verificação do webhook (handshake da Meta)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/whatsapp/webhook")
async def verificar_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    """Handshake de verificação. Acha QUAL empresa tem esse verify_token e, se a
    verificação passar, devolve o challenge em texto puro. Senão → 403."""
    if not hub_verify_token:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)

    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.whatsapp_verify_token == hub_verify_token
        )
    )
    if config is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)

    challenge = verify_webhook(
        hub_mode, hub_verify_token, hub_challenge, config.whatsapp_verify_token
    )
    if challenge is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)

    return PlainTextResponse(challenge, status_code=200)


# ═══════════════════════════════════════════════════════════════════════════════
# POST — eventos do webhook (statuses + inbound), com assinatura HMAC
# ═══════════════════════════════════════════════════════════════════════════════

async def _descobrir_config(
    db: AsyncSession, payload: dict
) -> Optional[VendasDisparoConfig]:
    """Descobre a empresa dona do payload: por waba_id (entry[].id) ou pelo
    phone_number_id (value.metadata.phone_number_id)."""
    waba_ids: set[str] = set()
    phone_ids: set[str] = set()
    for entry in payload.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        if entry.get("id"):
            waba_ids.add(str(entry["id"]))
        for change in entry.get("changes") or []:
            if not isinstance(change, dict):
                continue
            value = change.get("value") or {}
            metadata = value.get("metadata") or {}
            pid = metadata.get("phone_number_id")
            if pid:
                phone_ids.add(str(pid))

    if waba_ids:
        config = await db.scalar(
            select(VendasDisparoConfig).where(
                VendasDisparoConfig.whatsapp_waba_id.in_(waba_ids)
            )
        )
        if config is not None:
            return config

    if phone_ids:
        config = await db.scalar(
            select(VendasDisparoConfig).where(
                VendasDisparoConfig.whatsapp_phone_id.in_(phone_ids)
            )
        )
        if config is not None:
            return config

    return None


@router.post("/whatsapp/webhook")
async def receber_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db),
):
    """Recebe statuses + mensagens inbound da Meta.

    Lê o corpo CRU (necessário para a assinatura), descobre a empresa pelo
    payload, valida a assinatura HMAC contra o app_secret dela; inválida → 403.
    Válida → processa statuses + inbound e retorna {"ok": true} 200 (a Meta
    reenvia se não receber 200).
    """
    raw = await request.body()

    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001 — corpo não-JSON: trata como vazio.
        payload = {}

    config = await _descobrir_config(db, payload)
    if config is None or not config.whatsapp_app_secret_enc:
        return JSONResponse(
            {"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN
        )

    app_secret = decrypt_secret(config.whatsapp_app_secret_enc)
    if not check_signature(app_secret, raw, x_hub_signature_256):
        return JSONResponse(
            {"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN
        )

    eventos = parse_webhook(payload)
    await svc.processar_status_webhook(
        db, empresa_id=config.empresa_id, statuses=eventos.get("statuses") or []
    )
    await svc.processar_inbound_webhook(
        db, empresa_id=config.empresa_id, mensagens=eventos.get("mensagens") or []
    )
    await db.commit()

    return JSONResponse({"ok": True}, status_code=200)
