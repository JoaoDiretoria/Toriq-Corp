"""Módulos do sistema — catálogo global + relação empresa↔módulo + telas.

  /modulos                                   → catálogo GLOBAL
       GET (autenticado) · POST/PUT/DELETE (admin_vertical)
  /empresas-modulos                          → relação empresa↔módulo (tenant)
       CRUD escopado por empresa_id (make_crud_router)
  /empresas-modulos/{em_id}/telas            → telas (filha de empresas_modulos)
       escopadas via o pai (valida empresa_id do usuário)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import modulos as s

router = APIRouter()

_ADMIN = Depends(require_role(UserRole.admin_vertical))


# ══════════════════════════════════════════════════════════════════════════════
# Modulos — catálogo GLOBAL (leitura autenticada, escrita admin_vertical)
# ══════════════════════════════════════════════════════════════════════════════

_mod = APIRouter(prefix="/modulos", tags=["modulos"])


async def _get_modulo_or_404(db: AsyncSession, id_: uuid.UUID) -> m.Modulos:
    obj = await db.scalar(select(m.Modulos).where(m.Modulos.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    return obj


@_mod.get("", response_model=list[s.ModuloOut])
async def listar_modulos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.scalars(select(m.Modulos))
    return list(result)


@_mod.get("/{id_}", response_model=s.ModuloOut)
async def obter_modulo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_modulo_or_404(db, id_)


@_mod.post("", response_model=s.ModuloOut, status_code=status.HTTP_201_CREATED)
async def criar_modulo(
    payload: s.ModuloIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.Modulos(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_mod.put("/{id_}", response_model=s.ModuloOut)
async def atualizar_modulo(
    id_: uuid.UUID,
    payload: s.ModuloUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_modulo_or_404(db, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_mod.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_modulo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    result = await db.execute(sa_delete(m.Modulos).where(m.Modulos.id == id_))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")


router.include_router(_mod)


# ══════════════════════════════════════════════════════════════════════════════
# EmpresasModulos — relação empresa↔módulo (tenant via empresa_id)
# ══════════════════════════════════════════════════════════════════════════════

router.include_router(
    make_crud_router(
        model=m.EmpresasModulos,
        create_schema=s.EmpresaModuloIn,
        update_schema=s.EmpresaModuloUpdate,
        read_schema=s.EmpresaModuloOut,
        prefix="/empresas-modulos",
        tags=["empresas-modulos"],
    )
)


# ══════════════════════════════════════════════════════════════════════════════
# EmpresasModulosTelas — filha de empresas_modulos (escopo via pai)
# ══════════════════════════════════════════════════════════════════════════════

_telas = APIRouter(prefix="/empresas-modulos", tags=["empresas-modulos-telas"])


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_em_scoped(
    em_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> m.EmpresasModulos:
    """Garante que o vínculo empresa↔módulo pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.EmpresasModulos).where(
            m.EmpresasModulos.id == em_id,
            m.EmpresasModulos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo módulo não encontrado")
    return obj


@_telas.get("/{em_id}/telas", response_model=list[s.EmpresaModuloTelaOut])
async def listar_telas(
    em_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    em = await _get_em_scoped(em_id, db, empresa_id)
    result = await db.scalars(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.empresa_id == empresa_id,
            m.EmpresasModulosTelas.modulo_id == em.modulo_id,
        )
    )
    return list(result)


@_telas.post(
    "/{em_id}/telas",
    response_model=s.EmpresaModuloTelaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_tela(
    em_id: uuid.UUID,
    payload: s.EmpresaModuloTelaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    em = await _get_em_scoped(em_id, db, empresa_id)
    obj = m.EmpresasModulosTelas(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        modulo_id=em.modulo_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_telas.put("/{em_id}/telas/{tela_pk}", response_model=s.EmpresaModuloTelaOut)
async def atualizar_tela(
    em_id: uuid.UUID,
    tela_pk: uuid.UUID,
    payload: s.EmpresaModuloTelaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    em = await _get_em_scoped(em_id, db, empresa_id)
    obj = await db.scalar(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.id == tela_pk,
            m.EmpresasModulosTelas.empresa_id == empresa_id,
            m.EmpresasModulosTelas.modulo_id == em.modulo_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tela não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_telas.delete(
    "/{em_id}/telas/{tela_pk}", status_code=status.HTTP_204_NO_CONTENT
)
async def remover_tela(
    em_id: uuid.UUID,
    tela_pk: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    em = await _get_em_scoped(em_id, db, empresa_id)
    obj = await db.scalar(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.id == tela_pk,
            m.EmpresasModulosTelas.empresa_id == empresa_id,
            m.EmpresasModulosTelas.modulo_id == em.modulo_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tela não encontrada")
    await db.delete(obj)
    await db.commit()


router.include_router(_telas)
