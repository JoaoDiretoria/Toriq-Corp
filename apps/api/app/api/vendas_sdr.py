"""Toriq Vendas — FASE 4 (SDR Inteligente): router do agente de IA (Claude).

Configuração dos PROMPTS DINÂMICOS do agente (persona, objetivo, prompt_sistema,
diretrizes, prompt_qualificacao, modelo, temperatura) + chave de API criptografada
em repouso; qualificação de leads (single + batch); conversa (gera/registra
respostas — NÃO envia por canal); interações; follow-ups e stats.

Tenant SEMPRE por user.empresa_id (403 se None). Acesso admin restrito a
admin_vertical / cliente_torq via require_role (mesma regra de app/api/vendas.py).
Cripto da chave de API via app/core/esocial_crypto.py.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, encrypt_secret, mask_secret
from app.core.queue import queue
from app.models.user import User, UserRole
from app.models.vendas import VendasLeads
from app.models.vendas_sdr import VendasSdrConfig, VendasSdrInteracoes
from app.schemas import vendas_sdr as s
from app.services import vendas_sdr as svc

router = APIRouter(prefix="/vendas", tags=["vendas-sdr"])

# Admin do módulo de Vendas (mesma regra de app/api/vendas.py).
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG (prompts dinâmicos + chave de API criptografada)
# ═══════════════════════════════════════════════════════════════════════════════

def _config_public(obj: Optional[VendasSdrConfig]) -> s.SdrConfigPublic:
    if obj is None:
        return s.SdrConfigPublic(
            provider=None,
            modelo=None,
            prompt_sistema=None,
            temperatura=None,
            diretrizes=None,
            prompt_qualificacao=None,
            persona=None,
            objetivo=None,
            ativo=False,
            api_key_set=False,
            api_key_masked=None,
        )
    masked = None
    if obj.api_key_enc:
        masked = mask_secret(decrypt_secret(obj.api_key_enc))
    return s.SdrConfigPublic(
        provider=obj.provider,
        modelo=obj.modelo,
        prompt_sistema=obj.prompt_sistema,
        temperatura=float(obj.temperatura) if obj.temperatura is not None else None,
        diretrizes=obj.diretrizes,
        prompt_qualificacao=obj.prompt_qualificacao,
        persona=obj.persona,
        objetivo=obj.objetivo,
        ativo=bool(obj.ativo),
        auto_responder=bool(obj.auto_responder),
        notificar_telefones=obj.notificar_telefones,
        api_key_set=bool(obj.api_key_enc),
        api_key_masked=masked,
    )


@router.get("/sdr/config", response_model=s.SdrConfigPublic)
async def get_sdr_config(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    return _config_public(obj)


@router.put("/sdr/config", response_model=s.SdrConfigPublic)
async def put_sdr_config(
    payload: s.SdrConfigUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    created = obj is None
    if created:
        obj = VendasSdrConfig(id=uuid.uuid4(), empresa_id=empresa_id)

    # Campos simples (atualiza só os que vieram).
    for campo in (
        "provider",
        "modelo",
        "prompt_sistema",
        "temperatura",
        "diretrizes",
        "prompt_qualificacao",
        "persona",
        "objetivo",
        "ativo",
        "auto_responder",
        "notificar_telefones",
    ):
        valor = getattr(payload, campo)
        if valor is not None:
            setattr(obj, campo, valor)

    # Chave de API (segredo): clear tem precedência; senão grava se veio não-nula.
    if payload.clear_api_key:
        obj.api_key_enc = None
    elif payload.api_key is not None:
        obj.api_key_enc = encrypt_secret(payload.api_key)

    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _config_public(obj)


# ═══════════════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/sdr/stats", response_model=s.SdrStatsOut)
async def get_sdr_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await svc.stats(db, empresa_id=empresa_id)


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS (visão SDR)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/sdr/leads", response_model=s.SdrLeadsListOut)
async def listar_sdr_leads(
    sdr_status: Optional[str] = Query(None),
    score_min: Optional[int] = Query(None),
    busca: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func, or_

    empresa_id = _require_empresa(user)
    conds = [VendasLeads.empresa_id == empresa_id]
    if sdr_status:
        conds.append(VendasLeads.sdr_status == sdr_status)
    if score_min is not None:
        conds.append(VendasLeads.sdr_score >= score_min)
    if busca:
        like = f"%{busca}%"
        conds.append(
            or_(
                VendasLeads.nome.ilike(like),
                VendasLeads.empresa_nome.ilike(like),
                VendasLeads.email.ilike(like),
                VendasLeads.telefone.ilike(like),
            )
        )

    total = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(*conds)
    )
    result = await db.scalars(
        select(VendasLeads)
        .where(*conds)
        .order_by(
            VendasLeads.sdr_score.desc().nullslast(),
            VendasLeads.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return {"items": list(result), "total": total or 0}


@router.patch("/sdr/leads/{lead_id}", response_model=s.SdrLeadOut)
async def patch_sdr_lead(
    lead_id: uuid.UUID,
    payload: s.SdrLeadPatch,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lead não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ═══════════════════════════════════════════════════════════════════════════════
# QUALIFICAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/sdr/leads/{lead_id}/qualificar", response_model=s.QualificarOut)
async def qualificar_lead(
    lead_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        return await svc.qualificar_lead(db, empresa_id=empresa_id, lead_id=lead_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.post(
    "/sdr/qualificar-batch",
    response_model=s.QualificarBatchAceitoOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def qualificar_batch(
    payload: s.QualificarBatchIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Qualifica um lote de leads pela IA de forma ASSÍNCRONA.

    A qualificação chama o modelo por lead — em lote grande, rodar no request dá
    timeout. Aqui validamos a config (feedback imediato: 400 se o SDR não está
    configurado) e enfileiramos o trabalho (``sdr_qualificar_lote``) para fora do
    request. Sem Redis, o enqueue roda inline. O front acompanha relendo os leads.
    """
    empresa_id = _require_empresa(user)
    try:
        await svc.assegurar_config(db, empresa_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    await queue.enqueue(
        "sdr_qualificar_lote",
        {"empresa_id": str(empresa_id), "lead_ids": [str(x) for x in payload.lead_ids]},
    )
    return {"enfileirados": len(payload.lead_ids), "status": "processando"}


# ═══════════════════════════════════════════════════════════════════════════════
# INTERAÇÕES + CONVERSA
# ═══════════════════════════════════════════════════════════════════════════════

async def _lead_da_empresa(
    db: AsyncSession, *, lead_id: uuid.UUID, empresa_id: uuid.UUID
) -> VendasLeads:
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lead não encontrado")
    return lead


@router.get("/sdr/leads/{lead_id}/interacoes", response_model=list[s.InteracaoOut])
async def listar_interacoes(
    lead_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _lead_da_empresa(db, lead_id=lead_id, empresa_id=empresa_id)
    result = await db.scalars(
        select(VendasSdrInteracoes)
        .where(
            VendasSdrInteracoes.lead_id == lead_id,
            VendasSdrInteracoes.empresa_id == empresa_id,
        )
        .order_by(VendasSdrInteracoes.created_at)
    )
    return list(result)


@router.post("/sdr/leads/{lead_id}/interacao", response_model=s.InteracaoOut)
async def criar_interacao(
    lead_id: uuid.UUID,
    payload: s.InteracaoIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _lead_da_empresa(db, lead_id=lead_id, empresa_id=empresa_id)
    obj = VendasSdrInteracoes(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        lead_id=lead_id,
        papel=payload.papel,
        tipo=payload.tipo,
        conteudo=payload.conteudo,
        meta=None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/sdr/leads/{lead_id}/responder", response_model=s.ResponderOut)
async def responder(
    lead_id: uuid.UUID,
    payload: s.ResponderIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        resposta = await svc.gerar_resposta(
            db, empresa_id=empresa_id, lead_id=lead_id, mensagem=payload.mensagem
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return {"resposta": resposta}


# ═══════════════════════════════════════════════════════════════════════════════
# FOLLOW-UPS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/sdr/followups", response_model=list[s.SdrLeadOut])
async def listar_followups(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasLeads)
        .where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.sdr_proximo_followup.isnot(None),
        )
        .order_by(VendasLeads.sdr_proximo_followup.asc())
    )
    return list(result)
