"""Toriq Vendas — FASE 0 (Fundação): leads + tags + segmentação + import.

Tenant SEMPRE por user.empresa_id (403 se None). Acesso restrito a
admin_vertical / cliente_torq via require_role. Escopo: NADA de Apify/scraping,
disparo, WhatsApp ou SDR (fases 1-4).

dedupe_key: normaliza telefone (dígitos) ou, na ausência, email (lower/trim).
Usado para evitar leads duplicados POR EMPRESA (unique parcial empresa_id+dedupe_key).
"""
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models.user import User, UserRole
from app.models.vendas import VendasLeadTags, VendasLeads, VendasSegmentos, VendasTags
from app.schemas import vendas as s

router = APIRouter(prefix="/vendas", tags=["vendas"])

# Admin do módulo de Vendas (mesma regra para todas as rotas).
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _dedupe_key(telefone: Optional[str], email: Optional[str]) -> Optional[str]:
    """Normaliza telefone (somente dígitos) ou email (lower/trim) para dedupe.

    Retorna None quando não há nem telefone nem email — nesse caso o lead não
    participa do unique parcial (vários leads sem chave são permitidos).
    """
    if telefone:
        digitos = re.sub(r"\D", "", telefone)
        if digitos:
            return f"tel:{digitos}"
    if email:
        e = email.strip().lower()
        if e:
            return f"email:{e}"
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/leads", response_model=s.LeadsListOut)
async def listar_leads(
    status_filtro: Optional[str] = Query(None, alias="status"),
    busca: Optional[str] = None,
    cidade: Optional[str] = None,
    plataforma: Optional[str] = None,
    tag_ids: Optional[list[uuid.UUID]] = Query(None),
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    conds = [VendasLeads.empresa_id == empresa_id]

    if status_filtro:
        conds.append(VendasLeads.status == status_filtro)
    if cidade:
        conds.append(VendasLeads.cidade == cidade)
    if plataforma:
        conds.append(VendasLeads.plataforma == plataforma)
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
    if data_inicio:
        conds.append(VendasLeads.created_at >= data_inicio)
    if data_fim:
        conds.append(VendasLeads.created_at <= data_fim)
    if tag_ids:
        conds.append(
            VendasLeads.id.in_(
                select(VendasLeadTags.lead_id).where(
                    VendasLeadTags.tag_id.in_(tag_ids)
                )
            )
        )

    where = and_(*conds)
    total = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(where)
    )
    result = await db.scalars(
        select(VendasLeads)
        .where(where)
        .order_by(VendasLeads.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return {"items": list(result), "total": total or 0}


@router.post("/leads", response_model=s.LeadOut, status_code=status.HTTP_201_CREATED)
async def criar_lead(
    payload: s.LeadIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    data = payload.model_dump(exclude_unset=True)
    dedupe_key = _dedupe_key(data.get("telefone"), data.get("email"))

    if dedupe_key is not None:
        existente = await db.scalar(
            select(VendasLeads).where(
                VendasLeads.empresa_id == empresa_id,
                VendasLeads.dedupe_key == dedupe_key,
            )
        )
        if existente is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "lead duplicado (telefone/email já cadastrado)"
            )

    obj = VendasLeads(
        id=uuid.uuid4(), empresa_id=empresa_id, dedupe_key=dedupe_key, **data
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/leads/{lead_id}", response_model=s.LeadOut)
async def atualizar_lead(
    lead_id: uuid.UUID,
    payload: s.LeadUpdate,
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

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    # Recalcula dedupe_key se telefone/email mudaram.
    if "telefone" in data or "email" in data:
        obj.dedupe_key = _dedupe_key(obj.telefone, obj.email)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/leads", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_leads(
    payload: s.LeadsDeleteIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    if not payload.ids:
        return
    await db.execute(
        delete(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.id.in_(payload.ids),
        )
    )
    await db.commit()


@router.post("/leads/import", response_model=s.LeadsImportOut)
async def importar_leads(
    payload: s.LeadsImportIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    total = len(payload.leads)
    inseridos = 0
    duplicados = 0
    # Chaves já vistas neste lote (para deduplicar dentro do próprio import).
    vistos: set[str] = set()

    for item in payload.leads:
        data = item.model_dump(exclude_unset=True)
        dedupe_key = _dedupe_key(data.get("telefone"), data.get("email"))

        if dedupe_key is not None:
            if dedupe_key in vistos:
                duplicados += 1
                continue
            existente = await db.scalar(
                select(VendasLeads.id).where(
                    VendasLeads.empresa_id == empresa_id,
                    VendasLeads.dedupe_key == dedupe_key,
                )
            )
            if existente is not None:
                duplicados += 1
                continue
            vistos.add(dedupe_key)

        db.add(
            VendasLeads(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                dedupe_key=dedupe_key,
                origem="import",
                **data,
            )
        )
        inseridos += 1

    await db.commit()
    return {"inseridos": inseridos, "duplicados": duplicados, "total": total}


# ═══════════════════════════════════════════════════════════════════════════════
# TAGS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tags", response_model=list[s.TagOut])
async def listar_tags(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasTags)
        .where(VendasTags.empresa_id == empresa_id)
        .order_by(VendasTags.nome)
    )
    return list(result)


@router.post("/tags", response_model=s.TagOut, status_code=status.HTTP_201_CREATED)
async def criar_tag(
    payload: s.TagIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    existente = await db.scalar(
        select(VendasTags).where(
            VendasTags.empresa_id == empresa_id, VendasTags.nome == payload.nome
        )
    )
    if existente is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "tag já existe")
    obj = VendasTags(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome=payload.nome,
        cor=payload.cor,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_tag(
    tag_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasTags).where(
            VendasTags.id == tag_id, VendasTags.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tag não encontrada")
    await db.delete(obj)
    await db.commit()


async def _validar_tag(db: AsyncSession, tag_id: uuid.UUID, empresa_id: uuid.UUID) -> VendasTags:
    tag = await db.scalar(
        select(VendasTags).where(
            VendasTags.id == tag_id, VendasTags.empresa_id == empresa_id
        )
    )
    if tag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tag não encontrada")
    return tag


async def _leads_da_empresa(
    db: AsyncSession, lead_ids: list[uuid.UUID], empresa_id: uuid.UUID
) -> list[uuid.UUID]:
    """Filtra lead_ids para apenas os que pertencem à empresa (anti cross-tenant)."""
    if not lead_ids:
        return []
    result = await db.scalars(
        select(VendasLeads.id).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.id.in_(lead_ids),
        )
    )
    return list(result)


@router.post("/leads/tags", status_code=status.HTTP_204_NO_CONTENT)
async def adicionar_tag_aos_leads(
    payload: s.LeadTagsIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_tag(db, payload.tag_id, empresa_id)
    leads = await _leads_da_empresa(db, payload.lead_ids, empresa_id)
    if leads:
        rows = [{"lead_id": lid, "tag_id": payload.tag_id} for lid in leads]
        stmt = pg_insert(VendasLeadTags).values(rows).on_conflict_do_nothing(
            index_elements=["lead_id", "tag_id"]
        )
        await db.execute(stmt)
        await db.commit()


@router.delete("/leads/tags", status_code=status.HTTP_204_NO_CONTENT)
async def remover_tag_dos_leads(
    payload: s.LeadTagsIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_tag(db, payload.tag_id, empresa_id)
    leads = await _leads_da_empresa(db, payload.lead_ids, empresa_id)
    if leads:
        await db.execute(
            delete(VendasLeadTags).where(
                VendasLeadTags.tag_id == payload.tag_id,
                VendasLeadTags.lead_id.in_(leads),
            )
        )
        await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENTOS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/segmentos", response_model=list[s.SegmentoOut])
async def listar_segmentos(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasSegmentos)
        .where(VendasSegmentos.empresa_id == empresa_id)
        .order_by(VendasSegmentos.created_at.desc())
    )
    return list(result)


@router.post("/segmentos", response_model=s.SegmentoOut, status_code=status.HTTP_201_CREATED)
async def criar_segmento(
    payload: s.SegmentoIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = VendasSegmentos(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/segmentos/{segmento_id}", response_model=s.SegmentoOut)
async def atualizar_segmento(
    segmento_id: uuid.UUID,
    payload: s.SegmentoUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasSegmentos).where(
            VendasSegmentos.id == segmento_id,
            VendasSegmentos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "segmento não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/segmentos/{segmento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_segmento(
    segmento_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasSegmentos).where(
            VendasSegmentos.id == segmento_id,
            VendasSegmentos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "segmento não encontrado")
    await db.delete(obj)
    await db.commit()


def _aplicar_filtros_segmento(empresa_id: uuid.UUID, filtros: Optional[dict]):
    """Monta as condições SQL a partir dos filtros salvos no segmento.

    Filtros suportados (todos opcionais): status, cidade, plataforma, estado,
    busca (nome/empresa_nome/email/telefone), tag_ids (lista de uuid).
    """
    conds = [VendasLeads.empresa_id == empresa_id]
    filtros = filtros or {}

    if filtros.get("status"):
        conds.append(VendasLeads.status == filtros["status"])
    if filtros.get("cidade"):
        conds.append(VendasLeads.cidade == filtros["cidade"])
    if filtros.get("estado"):
        conds.append(VendasLeads.estado == filtros["estado"])
    if filtros.get("plataforma"):
        conds.append(VendasLeads.plataforma == filtros["plataforma"])
    if filtros.get("busca"):
        like = f"%{filtros['busca']}%"
        conds.append(
            or_(
                VendasLeads.nome.ilike(like),
                VendasLeads.empresa_nome.ilike(like),
                VendasLeads.email.ilike(like),
                VendasLeads.telefone.ilike(like),
            )
        )
    tag_ids = filtros.get("tag_ids")
    if tag_ids:
        conds.append(
            VendasLeads.id.in_(
                select(VendasLeadTags.lead_id).where(
                    VendasLeadTags.tag_id.in_(tag_ids)
                )
            )
        )
    return and_(*conds)


@router.get("/segmentos/{segmento_id}/leads", response_model=s.LeadsListOut)
async def listar_leads_do_segmento(
    segmento_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    seg = await db.scalar(
        select(VendasSegmentos).where(
            VendasSegmentos.id == segmento_id,
            VendasSegmentos.empresa_id == empresa_id,
        )
    )
    if seg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "segmento não encontrado")

    where = _aplicar_filtros_segmento(empresa_id, seg.filtros)
    total = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(where)
    )
    result = await db.scalars(
        select(VendasLeads)
        .where(where)
        .order_by(VendasLeads.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return {"items": list(result), "total": total or 0}
