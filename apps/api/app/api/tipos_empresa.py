"""tipos_empresa — catálogo GLOBAL de tipos de empresa (rótulos de categorização).

Tabela sem `empresa_id` → não é tenant-scoped. Leitura liberada a qualquer
usuário autenticado (alimenta selects); escrita restrita a admin_vertical.

Prefixo próprio `/tipos-empresa` (não aninhado em /empresas) para não colidir
com a rota `/empresas/{id_}`.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import tipos_empresa as s

router = APIRouter(prefix="/tipos-empresa", tags=["tipos-empresa"])


@router.get("", response_model=list[s.TipoEmpresaOut])
async def listar(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.scalars(select(m.TiposEmpresa))
    return list(result)


@router.post("", response_model=s.TipoEmpresaOut, status_code=status.HTTP_201_CREATED)
async def criar(
    payload: s.TipoEmpresaIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = m.TiposEmpresa(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{id_}", response_model=s.TipoEmpresaOut)
async def atualizar(
    id_: uuid.UUID,
    payload: s.TipoEmpresaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = await db.scalar(select(m.TiposEmpresa).where(m.TiposEmpresa.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tipo de empresa não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = await db.scalar(select(m.TiposEmpresa).where(m.TiposEmpresa.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tipo de empresa não encontrado")
    await db.delete(obj)
    await db.commit()
