"""SST EPI / Equipamentos — endpoints CRUD.

Tabelas tenant (todas usam empresa_id):
  - equipamentos_sst        → CRUD completo via make_crud_router
  - equipamentos_categorias → CRUD completo via make_crud_router
  - equipamentos_finalidades → CRUD completo via make_crud_router
  - equipamentos_status     → CRUD completo via make_crud_router
  - equipamentos_unidades   → CRUD completo via make_crud_router
  - equipamentos_kits       → CRUD completo via make_crud_router
  - equipamentos_kit_itens  → child de kit (scoped por kit_id, sem empresa_id próprio)
  - equipamentos_movimentacoes → CRUD com validação de FK cross-tenant

Notas de segurança:
  - UPDATE schemas excluem empresa_id e parent FKs (kit_id, equipamento_id).
  - Na criação de movimentacoes, equipamento_id e kit_id são validados para
    garantir que pertencem à empresa do caller (retorna 404 caso contrário).
  - Na criação de kit_itens, equipamento_id é validado contra empresa do kit.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import sst_epi as s

router = APIRouter(prefix="/sst/epi")

# ── helper: require empresa ──────────────────────────────────────────────────

def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ── Categorias (tenant: empresa_id) ─────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosCategorias,
    create_schema=s.CategoriaSstIn,
    update_schema=s.CategoriaSstUpdate,
    read_schema=s.CategoriaSstOut,
    prefix="/categorias",
    tags=["sst-epi-categorias"],
))

# ── Finalidades (tenant: empresa_id) ────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosFinalidades,
    create_schema=s.FinalidadeIn,
    update_schema=s.FinalidadeUpdate,
    read_schema=s.FinalidadeOut,
    prefix="/finalidades",
    tags=["sst-epi-finalidades"],
))

# ── Status (tenant: empresa_id) ──────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosStatus,
    create_schema=s.StatusSstIn,
    update_schema=s.StatusSstUpdate,
    read_schema=s.StatusSstOut,
    prefix="/status",
    tags=["sst-epi-status"],
))

# ── Unidades (tenant: empresa_id) ────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosUnidades,
    create_schema=s.UnidadeSstIn,
    update_schema=s.UnidadeSstUpdate,
    read_schema=s.UnidadeSstOut,
    prefix="/unidades",
    tags=["sst-epi-unidades"],
))

# ── EquipamentosSst core (tenant: empresa_id) ────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosSst,
    create_schema=s.EquipamentoIn,
    update_schema=s.EquipamentoUpdate,
    read_schema=s.EquipamentoOut,
    prefix="/equipamentos",
    tags=["sst-epi-equipamentos"],
))

# ── Kits (tenant: empresa_id) ────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.EquipamentosKits,
    create_schema=s.KitIn,
    update_schema=s.KitUpdate,
    read_schema=s.KitOut,
    prefix="/kits",
    tags=["sst-epi-kits"],
))

# ── Kit Itens — child scoped via kit_id ─────────────────────────────────────

_kit_itens_router = APIRouter(prefix="/kits", tags=["sst-epi-kit-itens"])


async def _get_kit_scoped(
    kit_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.EquipamentosKits:
    """Verifica que o kit pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.EquipamentosKits).where(
            m.EquipamentosKits.id == kit_id,
            m.EquipamentosKits.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "kit não encontrado")
    return obj


async def _get_equipamento_scoped(
    equipamento_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.EquipamentosSst:
    """Verifica que o equipamento pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.EquipamentosSst).where(
            m.EquipamentosSst.id == equipamento_id,
            m.EquipamentosSst.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "equipamento não encontrado")
    return obj


@_kit_itens_router.get("/{kit_id}/itens", response_model=list[s.KitItemOut])
async def listar_kit_itens(
    kit_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_kit_scoped(kit_id, db, empresa_id)
    result = await db.scalars(
        select(m.EquipamentosKitItens).where(
            m.EquipamentosKitItens.kit_id == kit_id
        )
    )
    return list(result)


@_kit_itens_router.post(
    "/{kit_id}/itens",
    response_model=s.KitItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_kit_item(
    kit_id: uuid.UUID,
    payload: s.KitItemIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_kit_scoped(kit_id, db, empresa_id)
    # Validate that the equipamento_id belongs to the same empresa
    await _get_equipamento_scoped(payload.equipamento_id, db, empresa_id)

    obj = m.EquipamentosKitItens(
        id=uuid.uuid4(),
        kit_id=kit_id,
        equipamento_id=payload.equipamento_id,
        quantidade=payload.quantidade,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_kit_itens_router.put(
    "/{kit_id}/itens/{item_id}",
    response_model=s.KitItemOut,
)
async def atualizar_kit_item(
    kit_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: s.KitItemUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_kit_scoped(kit_id, db, empresa_id)
    item = await db.scalar(
        select(m.EquipamentosKitItens).where(
            m.EquipamentosKitItens.id == item_id,
            m.EquipamentosKitItens.kit_id == kit_id,
        )
    )
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@_kit_itens_router.delete(
    "/{kit_id}/itens/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_kit_item(
    kit_id: uuid.UUID,
    item_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_kit_scoped(kit_id, db, empresa_id)
    result = await db.execute(
        sa_delete(m.EquipamentosKitItens).where(
            m.EquipamentosKitItens.id == item_id,
            m.EquipamentosKitItens.kit_id == kit_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")


router.include_router(_kit_itens_router)


# ── Movimentacoes (tenant: empresa_id, with FK validation) ──────────────────

_mov_router = APIRouter(prefix="/movimentacoes", tags=["sst-epi-movimentacoes"])


async def _get_movimentacao_scoped(
    mov_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.EquipamentosMovimentacoes:
    obj = await db.scalar(
        select(m.EquipamentosMovimentacoes).where(
            m.EquipamentosMovimentacoes.id == mov_id,
            m.EquipamentosMovimentacoes.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "movimentação não encontrada")
    return obj


@_mov_router.get("", response_model=list[s.MovimentacaoOut])
async def listar_movimentacoes(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.EquipamentosMovimentacoes).where(
            m.EquipamentosMovimentacoes.empresa_id == empresa_id
        )
    )
    return list(result)


@_mov_router.get("/{id_}", response_model=s.MovimentacaoOut)
async def obter_movimentacao(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    return await _get_movimentacao_scoped(id_, db, empresa_id)


@_mov_router.post("", response_model=s.MovimentacaoOut, status_code=status.HTTP_201_CREATED)
async def criar_movimentacao(
    payload: s.MovimentacaoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    # Validate payload FKs belong to this empresa
    if payload.equipamento_id is not None:
        await _get_equipamento_scoped(payload.equipamento_id, db, empresa_id)

    if payload.kit_id is not None:
        await _get_kit_scoped(payload.kit_id, db, empresa_id)

    obj = m.EquipamentosMovimentacoes(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_mov_router.put("/{id_}", response_model=s.MovimentacaoOut)
async def atualizar_movimentacao(
    id_: uuid.UUID,
    payload: s.MovimentacaoUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_movimentacao_scoped(id_, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_mov_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_movimentacao(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        sa_delete(m.EquipamentosMovimentacoes).where(
            m.EquipamentosMovimentacoes.id == id_,
            m.EquipamentosMovimentacoes.empresa_id == empresa_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "movimentação não encontrada")


router.include_router(_mov_router)
