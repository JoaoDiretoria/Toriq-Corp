"""Endpoints do módulo Notificações.

Rotas:
  GET    /notificacoes              — lista notificações do tenant (filtros opcionais)
  GET    /notificacoes/{id}         — obtém notificação por id (tenant-scoped)
  PATCH  /notificacoes/{id}/lida    — marca como lida
  DELETE /notificacoes/{id}         — remove notificação
  GET    /notificacoes/config       — lista NotificacaoConfig (global, sem tenant)
  GET    /notificacoes/config/{tabela}        — obtém config por tabela
  PATCH  /notificacoes/config/{tabela}        — atualiza config por tabela
"""
import datetime
import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.core.events import assinar
from app.models import generated as m
from app.models.user import User, UserRole
from app.repositories.base import TenantRepository
from app.schemas import notificacoes as s

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


# ── Repositório tenant-scoped ─────────────────────────────────────────────────

class _NotifRepo(TenantRepository):
    model = m.Notificacoes


def _get_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _NotifRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _NotifRepo(db, user.empresa_id)


# ── Notificações ──────────────────────────────────────────────────────────────

# IMPORTANTE: rota específica ANTES de /{notif_id} para não ser capturada como UUID
@router.get("/config", response_model=list[s.NotificacaoConfigOut])
async def listar_config(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as configurações de notificação (tabela global, sem tenant)."""
    result = await db.scalars(select(m.NotificacaoConfig))
    return list(result)


@router.get("/config/{tabela}", response_model=s.NotificacaoConfigOut)
async def obter_config(
    tabela: str,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await db.get(m.NotificacaoConfig, tabela)
    if cfg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "configuração não encontrada")
    return cfg


@router.patch("/config/{tabela}", response_model=s.NotificacaoConfigOut)
async def atualizar_config(
    tabela: str,
    payload: s.NotificacaoConfigUpdateIn,
    _admin: User = Depends(require_role(UserRole.admin_vertical)),
    db: AsyncSession = Depends(get_db),
):
    # NotificacaoConfig é uma tabela GLOBAL (afeta todos os tenants) — só admin_vertical edita.
    cfg = await db.get(m.NotificacaoConfig, tabela)
    if cfg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "configuração não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.get("", response_model=list[s.NotificacaoOut])
async def listar_notificacoes(
    nao_lidas: Optional[bool] = Query(None, description="true = apenas não lidas"),
    usuario_id: Optional[uuid.UUID] = Query(None, description="filtra por destinatário"),
    repo: _NotifRepo = Depends(_get_repo),
):
    """Lista notificações do tenant autenticado."""
    q = (
        select(m.Notificacoes)
        .where(m.Notificacoes.empresa_id == repo.empresa_id)
        .order_by(m.Notificacoes.created_at.desc())
    )
    if nao_lidas is True:
        q = q.where(m.Notificacoes.lida.is_(False))
    elif nao_lidas is False:
        q = q.where(m.Notificacoes.lida.is_(True))
    if usuario_id is not None:
        q = q.where(m.Notificacoes.usuario_id == usuario_id)
    result = await repo.db.scalars(q)
    return list(result)


# IMPORTANTE: rota específica ANTES de /{notif_id} para não ser capturada como UUID
@router.get("/stream")
async def stream_notificacoes(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Server-Sent Events — PUSH de notificações em tempo real.

    Assina o canal da empresa (Redis pub/sub) e repassa apenas os eventos de
    notificação (``notificacao_nova``) e heartbeats (``ping``). O front conecta
    via ``EventSource(url, { withCredentials: true })`` — o cookie httpOnly de
    auth é enviado automaticamente.
    """
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    empresa_id = user.empresa_id

    async def gerar():
        # Comentário inicial abre o stream imediatamente (alguns proxies bufferizam).
        yield ": ok\n\n"
        async for evento in assinar(empresa_id):
            if await request.is_disconnected():
                break
            tipo = (evento or {}).get("tipo")
            # Só interessa ao sino: eventos de notificação + heartbeat.
            if tipo not in ("notificacao_nova", "ping"):
                continue
            yield f"data: {json.dumps(evento, default=str)}\n\n"

    return StreamingResponse(
        gerar(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # desliga buffering do nginx
        },
    )


@router.get("/{notif_id}", response_model=s.NotificacaoOut)
async def obter_notificacao(
    notif_id: uuid.UUID,
    repo: _NotifRepo = Depends(_get_repo),
):
    notif = await repo.get(notif_id)
    if notif is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "notificação não encontrada")
    return notif


@router.patch("/{notif_id}/lida", response_model=s.NotificacaoOut)
async def marcar_como_lida(
    notif_id: uuid.UUID,
    payload: s.MarcarLidaIn,
    repo: _NotifRepo = Depends(_get_repo),
):
    """Marca a notificação como lida (tenant-scoped — cross-tenant retorna 404)."""
    notif = await repo.get(notif_id)
    if notif is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "notificação não encontrada")
    notif.lida = True
    notif.lida_em = datetime.datetime.now(datetime.UTC)
    if payload.lida_por is not None:
        notif.lida_por = payload.lida_por
    await repo.db.commit()
    await repo.db.refresh(notif)
    return notif


@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_notificacao(
    notif_id: uuid.UUID,
    repo: _NotifRepo = Depends(_get_repo),
):
    if not await repo.delete(notif_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "notificação não encontrada")
