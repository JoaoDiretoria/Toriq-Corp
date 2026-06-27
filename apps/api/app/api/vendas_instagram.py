"""Toriq Vendas — canal Instagram (Fase IG-1): router.

Webhook PÚBLICO da Meta (handshake + assinatura HMAC) + endpoints autenticados
(config, gatilhos, comentários). Registrar em app/main.py (include_router).
Tenant por user.empresa_id (403 se None). Reusa o handshake/assinatura de
whatsapp_meta via instagram_meta.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, encrypt_secret, mask_secret
from app.integrations import instagram_meta
from app.models.user import User, UserRole
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
)
from app.schemas import vendas_instagram as s
from app.services import vendas_instagram as svc

router = APIRouter(prefix="/vendas", tags=["vendas-instagram"])
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ── Webhook (público) ──────────────────────────────────────────────────────────
@router.get("/instagram/webhook")
async def verificar_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    if not hub_verify_token:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.instagram_verify_token == hub_verify_token
        )
    )
    if config is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    challenge = instagram_meta.verify_webhook(
        hub_mode, hub_verify_token, hub_challenge, config.instagram_verify_token
    )
    if challenge is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    return PlainTextResponse(challenge, status_code=200)


async def _descobrir_config(db: AsyncSession, payload: dict) -> Optional[VendasDisparoConfig]:
    """Descobre a empresa dona do payload pelo entry[].id.

    No webhook do campo 'comments' do Instagram, entry[].id é o IG User ID
    (conta profissional) — o mesmo valor que salvamos em instagram_user_id.
    """
    ids: set[str] = set()
    for entry in payload.get("entry") or []:
        if isinstance(entry, dict) and entry.get("id"):
            ids.add(str(entry["id"]))
    if not ids:
        return None
    return await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.instagram_user_id.in_(ids)
        )
    )


@router.post("/instagram/webhook")
async def receber_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db),
):
    raw = await request.body()
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        payload = {}

    config = await _descobrir_config(db, payload)
    if config is None or not config.instagram_app_secret_enc:
        return JSONResponse({"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN)

    app_secret = decrypt_secret(config.instagram_app_secret_enc)
    if not instagram_meta.check_signature(app_secret, raw, x_hub_signature_256):
        return JSONResponse({"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN)

    comentarios = instagram_meta.parse_webhook(payload)
    await svc.processar_comentarios_webhook(
        db, empresa_id=config.empresa_id, comentarios=comentarios
    )
    return JSONResponse({"ok": True}, status_code=200)


# ── Config (autenticado) ───────────────────────────────────────────────────────
def _config_public(obj: Optional[VendasDisparoConfig]) -> s.InstagramConfigPublic:
    if obj is None:
        return s.InstagramConfigPublic()
    masked = None
    if obj.instagram_token_enc:
        masked = mask_secret(decrypt_secret(obj.instagram_token_enc))
    return s.InstagramConfigPublic(
        instagram_user_id=obj.instagram_user_id,
        instagram_username=obj.instagram_username,
        instagram_verify_token=obj.instagram_verify_token,
        instagram_token_set=bool(obj.instagram_token_enc),
        instagram_token_masked=masked,
        instagram_app_secret_set=bool(obj.instagram_app_secret_enc),
    )


@router.get("/instagram/config", response_model=s.InstagramConfigPublic)
async def get_config(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    return _config_public(obj)


@router.put("/instagram/config", response_model=s.InstagramConfigPublic)
async def put_config(
    payload: s.InstagramConfigUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    created = obj is None
    if created:
        obj = VendasDisparoConfig(id=uuid.uuid4(), empresa_id=empresa_id)

    for campo in ("instagram_user_id", "instagram_username", "instagram_verify_token"):
        valor = getattr(payload, campo)
        if valor is not None:
            setattr(obj, campo, valor)

    if payload.clear_instagram_token:
        obj.instagram_token_enc = None
    elif payload.instagram_token is not None:
        obj.instagram_token_enc = encrypt_secret(payload.instagram_token)

    if payload.clear_instagram_app_secret:
        obj.instagram_app_secret_enc = None
    elif payload.instagram_app_secret is not None:
        obj.instagram_app_secret_enc = encrypt_secret(payload.instagram_app_secret)

    obj.updated_at = _now()
    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _config_public(obj)


# ── Gatilhos CRUD ──────────────────────────────────────────────────────────────
async def _get_gatilho(db, gid, empresa_id) -> VendasInstagramGatilhos:
    obj = await db.scalar(
        select(VendasInstagramGatilhos).where(
            VendasInstagramGatilhos.id == gid,
            VendasInstagramGatilhos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "gatilho não encontrado")
    return obj


@router.get("/instagram/gatilhos", response_model=list[s.GatilhoPublic])
async def listar_gatilhos(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    rows = (await db.scalars(
        select(VendasInstagramGatilhos)
        .where(VendasInstagramGatilhos.empresa_id == empresa_id)
        .order_by(VendasInstagramGatilhos.created_at)
    )).all()
    return rows


@router.post("/instagram/gatilhos", response_model=s.GatilhoPublic, status_code=status.HTTP_201_CREATED)
async def criar_gatilho(
    payload: s.GatilhoCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=empresa_id, **payload.model_dump()
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/instagram/gatilhos/{gid}", response_model=s.GatilhoPublic)
async def atualizar_gatilho(
    gid: uuid.UUID,
    payload: s.GatilhoUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_gatilho(db, gid, empresa_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(obj, campo, valor)
    obj.updated_at = _now()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/instagram/gatilhos/{gid}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_gatilho(
    gid: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_gatilho(db, gid, empresa_id)
    await db.delete(obj)
    await db.commit()


# ── Comentários (leitura p/ a tela) ────────────────────────────────────────────
@router.get("/instagram/comentarios", response_model=list[s.ComentarioPublic])
async def listar_comentarios(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
):
    empresa_id = _require_empresa(user)
    rows = (await db.scalars(
        select(VendasInstagramComentarios)
        .where(VendasInstagramComentarios.empresa_id == empresa_id)
        .order_by(VendasInstagramComentarios.created_at.desc())
        .limit(limit)
    )).all()
    return rows
