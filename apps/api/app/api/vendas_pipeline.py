"""Toriq Vendas — Pipeline & Conversas (CRM): rotas HTTP + SSE.

Kanban por estágios, inbox de conversas (thread por lead), dashboard de
conversão e stream de eventos em tempo real (SSE sobre Redis pub/sub).

Tenant SEMPRE por ``user.empresa_id`` (403 se None). Admin do módulo:
``admin_vertical`` / ``cliente_torq`` (mesma regra de app/api/vendas.py). O
endpoint SSE autentica via cookie (``get_current_user``).
"""
from __future__ import annotations

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.cache import cache
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret
from app.integrations.whatsapp_meta import WhatsAppError, baixar_media
from app.models.user import User, UserRole
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_pipeline import VendasPipelineStages
from app.schemas import vendas_pipeline as s
from app.services import vendas_pipeline as svc

router = APIRouter(prefix="/vendas", tags=["vendas-pipeline"])

require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)

# Mídia do WhatsApp é conteúdo de terceiro — só liberamos render inline para
# tipos seguros conhecidos; PDF e afins vão como download; o resto, octet-stream.
_MIME_INLINE = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr",
    "video/mp4", "video/3gpp",
}
_MIME_DOWNLOAD = {"application/pdf"}


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ═══════════════════════════════════════════════════════════════════════════════
# Estágios
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pipeline/stages", response_model=list[s.StageOut])
async def listar_stages(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await svc.garantir_estagios(db, empresa_id)


@router.post(
    "/pipeline/stages",
    response_model=s.StageOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_stage(
    payload: s.StageIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = VendasPipelineStages(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome=payload.nome,
        cor=payload.cor,
        ordem=payload.ordem if payload.ordem is not None else 0,
        is_closed=bool(payload.is_closed) if payload.is_closed is not None else False,
        is_won=bool(payload.is_won) if payload.is_won is not None else False,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/pipeline/stages/{stage_id}", response_model=s.StageOut)
async def atualizar_stage(
    stage_id: uuid.UUID,
    payload: s.StageUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasPipelineStages).where(
            VendasPipelineStages.id == stage_id,
            VendasPipelineStages.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "estágio não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/pipeline/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_stage(
    stage_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasPipelineStages).where(
            VendasPipelineStages.id == stage_id,
            VendasPipelineStages.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "estágio não encontrado")
    # Leads daquele estágio ficam sem estágio (stage_id = null).
    await db.execute(
        update(VendasLeads)
        .where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.stage_id == stage_id,
        )
        .values(stage_id=None)
    )
    await db.delete(obj)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# Board (kanban)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pipeline/board", response_model=s.BoardOut)
async def get_board(
    incluir_arquivados: bool = Query(False),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await svc.board(
        db, empresa_id=empresa_id, incluir_arquivados=incluir_arquivados
    )


@router.post("/pipeline/leads/{lead_id}/mover", response_model=s.LeadCardOut)
async def mover_lead(
    lead_id: uuid.UUID,
    payload: s.MoverLeadIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        lead = await svc.mover_lead(
            db,
            empresa_id=empresa_id,
            lead_id=lead_id,
            stage_id=payload.stage_id,
            valor_estimado=payload.valor_estimado,
            motivo=payload.motivo,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return await svc._card(db, lead)


@router.post(
    "/pipeline/stages/{stage_id}/reordenar",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reordenar_coluna(
    stage_id: uuid.UUID,
    payload: s.ReordenarColunaIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Persiste a ordem manual dos cards de um estágio (drag-and-drop)."""
    empresa_id = _require_empresa(user)
    stage = await db.scalar(
        select(VendasPipelineStages).where(
            VendasPipelineStages.id == stage_id,
            VendasPipelineStages.empresa_id == empresa_id,
        )
    )
    if stage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "estágio não encontrado")
    await svc.reordenar_coluna(
        db, empresa_id=empresa_id, stage_id=stage_id, lead_ids=payload.lead_ids
    )


@router.patch("/pipeline/leads/{lead_id}", response_model=s.LeadCardOut)
async def patch_lead(
    lead_id: uuid.UUID,
    payload: s.LeadPatchIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lead não encontrado")

    data = payload.model_dump(exclude_unset=True)
    if "stage_id" in data and data["stage_id"] is not None:
        stage = await db.scalar(
            select(VendasPipelineStages).where(
                VendasPipelineStages.id == data["stage_id"],
                VendasPipelineStages.empresa_id == empresa_id,
            )
        )
        if stage is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "estágio não encontrado")
    for k, v in data.items():
        setattr(lead, k, v)
    await db.commit()
    await db.refresh(lead)

    from app.core.events import publicar

    try:
        await publicar(
            empresa_id, {"tipo": "lead_atualizado", "lead_id": str(lead_id)}
        )
    except Exception:  # pragma: no cover
        pass
    return await svc._card(db, lead)


# ═══════════════════════════════════════════════════════════════════════════════
# Conversas (inbox)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pipeline/operadores", response_model=list[s.OperadorOut])
async def listar_operadores(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Operadores (usuários ativos) da empresa — seletor de responsável."""
    empresa_id = _require_empresa(user)
    return await svc.listar_operadores(db, empresa_id)


@router.get("/conversas", response_model=list[s.LeadCardOut])
async def listar_conversas(
    busca: Optional[str] = None,
    tag_id: Optional[uuid.UUID] = None,
    temperatura: Optional[str] = None,
    stage_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    minhas: bool = Query(False),
    arquivados: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    # "minhas" filtra pelo operador logado (atalho do front).
    if minhas:
        assigned_to = user.id
    return await svc.listar_conversas(
        db,
        empresa_id=empresa_id,
        busca=busca,
        tag_id=tag_id,
        temperatura=temperatura,
        stage_id=stage_id,
        assigned_to=assigned_to,
        arquivados=arquivados,
        limit=limit,
        offset=offset,
    )


@router.get("/conversas/{lead_id}", response_model=s.ConversaThreadOut)
async def get_thread(
    lead_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        return await svc.thread(db, empresa_id=empresa_id, lead_id=lead_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.post(
    "/conversas/{lead_id}/mensagem",
    response_model=s.ConversaMensagemOut,
)
async def enviar_mensagem(
    lead_id: uuid.UUID,
    payload: s.EnviarMensagemIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        return await svc.enviar_resposta(
            db, empresa_id=empresa_id, lead_id=lead_id, conteudo=payload.conteudo
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/conversas/media/{media_id}")
async def baixar_media_conversa(
    media_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Proxy autenticado: baixa o binário de uma mídia recebida no WhatsApp.

    A URL da mídia na Meta exige o token da empresa, então o front não consegue
    acessá-la direto — busca por aqui (escopado por empresa, com o token da
    config de disparo). Devolve os bytes com o ``Content-Type`` correto.
    """
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    if config is None or not config.whatsapp_token_enc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "WhatsApp não configurado")
    try:
        conteudo, mime = await baixar_media(
            token=decrypt_secret(config.whatsapp_token_enc), media_id=media_id
        )
    except WhatsAppError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    # Os bytes vêm de terceiro (a Meta repassa o que o lead enviou) — tratamos o
    # Content-Type como NÃO confiável para evitar XSS por content-sniffing:
    # só renderizamos inline mídia conhecida; o resto vira download (attachment).
    mime_base = (mime or "").split(";")[0].strip().lower()
    inline_ok = mime_base in _MIME_INLINE
    safe_mime = mime_base if (inline_ok or mime_base in _MIME_DOWNLOAD) else "application/octet-stream"
    return Response(
        content=conteudo,
        media_type=safe_mime,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline" if inline_ok else "attachment",
            "Cache-Control": "private, max-age=86400",
        },
    )


@router.post(
    "/conversas/{lead_id}/template",
    response_model=s.ConversaMensagemOut,
)
async def enviar_template(
    lead_id: uuid.UUID,
    payload: s.EnviarTemplateIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Envia um template HSM aprovado para reabrir a conversa (fora das 24h)."""
    empresa_id = _require_empresa(user)
    try:
        return await svc.enviar_template(
            db,
            empresa_id=empresa_id,
            lead_id=lead_id,
            template_id=payload.template_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.post("/conversas/{lead_id}/ler", status_code=status.HTTP_204_NO_CONTENT)
async def marcar_lido(
    lead_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        await svc.marcar_lido(db, empresa_id=empresa_id, lead_id=lead_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


# ═══════════════════════════════════════════════════════════════════════════════
# Conversão (dashboard)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pipeline/conversao", response_model=s.ConversaoOut)
async def get_conversao(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    # Dashboard agregado — cache curto (TTL padrão). Dados ~60s velhos são aceitáveis.
    return await cache.get_or_set(
        f"pipeline:conversao:{empresa_id}",
        ttl=None,
        factory=lambda: svc.conversao(db, empresa_id=empresa_id),
    )


@router.get("/pipeline/analytics", response_model=s.AnalyticsOut)
async def get_analytics(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Indicadores de desempenho: conversão, ganhos/perdidos, por origem/temperatura."""
    empresa_id = _require_empresa(user)
    # Dashboard agregado — cache curto (TTL padrão). Dados ~60s velhos são aceitáveis.
    return await cache.get_or_set(
        f"pipeline:analytics:{empresa_id}",
        ttl=None,
        factory=lambda: svc.analytics(db, empresa_id=empresa_id),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SSE — stream de eventos em tempo real
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/eventos/stream")
async def eventos_stream(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Server-Sent Events: empurra eventos do canal da empresa para o front.

    Autentica via cookie (get_current_user). Emite um heartbeat inicial e depois
    repassa cada evento recebido em ``app.core.events.assinar``. Encerra limpo no
    disconnect do cliente.
    """
    empresa_id = _require_empresa(user)

    async def gerar():
        # Heartbeat inicial (linha de comentário SSE).
        yield ": ping\n\n"
        from app.core.events import assinar

        async for evento in assinar(empresa_id):
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(evento)}\n\n"

    return StreamingResponse(
        gerar(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
