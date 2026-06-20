"""Canal WhatsApp via Evolution API — router.

- Config do servidor (global): só super admin (admin_vertical).
- Instâncias: admin do módulo de vendas (admin_vertical/cliente_torq), escopadas
  por empresa. Super admin pode informar empresa_id ao criar.
- Webhook PÚBLICO identificado por webhook_token na URL (inválido → 403).

Tenant SEMPRE por user.empresa_id (403 se None), igual a app/api/vendas_disparo.py.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, mask_secret
from app.models.user import User, UserRole
from app.models.vendas_evolution import VendasEvolutionInstancias
from app.schemas import vendas_evolution as s
from app.services import vendas_evolution as svc

router = APIRouter(prefix="/vendas", tags=["vendas-evolution"])

require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)
require_super = require_role(UserRole.admin_vertical)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _instancia_out(o: VendasEvolutionInstancias) -> s.InstanciaOut:
    return s.InstanciaOut(
        id=o.id, empresa_id=o.empresa_id, nome_exibicao=o.nome_exibicao,
        instance_name=o.instance_name, numero=o.numero, status=o.status,
        created_at=o.created_at,
    )


def _servidor_public(obj) -> s.ServidorPublic:
    if obj is None:
        return s.ServidorPublic()
    masked = mask_secret(decrypt_secret(obj.api_key_enc)) if obj.api_key_enc else None
    return s.ServidorPublic(
        base_url=obj.base_url, webhook_base_url=obj.webhook_base_url,
        limite_padrao_instancias=obj.limite_padrao_instancias, ativo=obj.ativo,
        api_key_set=bool(obj.api_key_enc), api_key_masked=masked,
    )


# ───────────────────── Config do servidor (super admin) ─────────────────────

@router.get("/evolution/servidor", response_model=s.ServidorPublic)
async def get_servidor(
    user: User = Depends(require_super), db: AsyncSession = Depends(get_db)
):
    return _servidor_public(await svc.get_servidor(db))


@router.put("/evolution/servidor", response_model=s.ServidorPublic)
async def put_servidor(
    dados: s.ServidorUpdate,
    user: User = Depends(require_super),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.salvar_servidor(db, dados=dados)
    await db.commit()
    return _servidor_public(obj)


# ───────────────────────── Instâncias (empresa) ─────────────────────────

@router.get("/evolution/instancias", response_model=list[s.InstanciaOut])
async def listar_instancias(
    user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    empresa_id = _require_empresa(user)
    rows = (
        await db.scalars(
            select(VendasEvolutionInstancias)
            .where(VendasEvolutionInstancias.empresa_id == empresa_id)
            .order_by(VendasEvolutionInstancias.created_at.desc())
        )
    ).all()
    return [_instancia_out(o) for o in rows]


@router.post("/evolution/instancias", response_model=s.InstanciaOut)
async def criar_instancia(
    dados: s.InstanciaIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Super admin pode criar para outra empresa; demais usam a própria.
    if dados.empresa_id is not None and user.role == UserRole.admin_vertical:
        empresa_id = dados.empresa_id
    else:
        empresa_id = _require_empresa(user)
    try:
        inst = await svc.criar_instancia(
            db, empresa_id=empresa_id,
            nome_exibicao=dados.nome_exibicao, criado_por=user.id,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    await db.commit()
    return _instancia_out(inst)


@router.get("/evolution/instancias/{instancia_id}/qrcode", response_model=s.QRCodeOut)
async def qrcode(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        data = await svc.obter_qrcode(
            db, empresa_id=empresa_id, instancia_id=instancia_id
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    return s.QRCodeOut(**data)


@router.get("/evolution/instancias/{instancia_id}/status", response_model=s.StatusOut)
async def status_instancia(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        st = await svc.sincronizar_status(
            db, empresa_id=empresa_id, instancia_id=instancia_id
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    await db.commit()
    return s.StatusOut(status=st)


@router.delete("/evolution/instancias/{instancia_id}")
async def deletar_instancia(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    ok = await svc.deletar_instancia(
        db, empresa_id=empresa_id, instancia_id=instancia_id
    )
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instância não encontrada")
    await db.commit()
    return {"ok": True}


@router.post(
    "/evolution/instancias/{instancia_id}/enviar", response_model=s.EnviarOut
)
async def enviar(
    instancia_id: uuid.UUID,
    dados: s.EnviarIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        res = await svc.enviar_texto(
            db, empresa_id=empresa_id, instancia_id=instancia_id,
            numero=dados.numero, texto=dados.texto,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    await db.commit()
    return s.EnviarOut(**res)


# ───────────────────────── Webhook (público) ─────────────────────────

@router.post("/evolution/webhook/{webhook_token}")
async def webhook(
    webhook_token: str, request: Request, db: AsyncSession = Depends(get_db)
):
    inst = await db.scalar(
        select(VendasEvolutionInstancias).where(
            VendasEvolutionInstancias.webhook_token == webhook_token
        )
    )
    if inst is None:
        return JSONResponse(
            {"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN
        )
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        payload = {}
    await svc.processar_webhook(db, instancia=inst, payload=payload)
    return JSONResponse({"ok": True}, status_code=200)
