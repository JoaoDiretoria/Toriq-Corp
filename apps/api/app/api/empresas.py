"""Empresas — raiz do tenant (o próprio `id` é o empresa_id).

Tenant model: a tabela `empresas` É a empresa. Controle de acesso:

  Endpoint              | Acesso
  ----------------------|--------------------------------------------------
  GET  /empresas/me     | usuário autenticado → a própria empresa
  GET  /empresas        | admin_vertical → lista TODAS as empresas
  GET  /empresas/{id}   | admin_vertical (qualquer) | usuário comum (só a sua)
  PUT  /empresas/{id}   | admin da própria empresa (admin_vertical) → só a sua

Campos sensíveis do certificado A1 NUNCA são expostos (ver schema EmpresaOut).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import empresas as s

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("/me", response_model=s.EmpresaOut)
async def obter_minha_empresa(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a empresa do usuário autenticado."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == user.empresa_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


@router.get("", response_model=list[s.EmpresaOut])
async def listar_empresas(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    """Lista todas as empresas — restrito a admin_vertical."""
    result = await db.scalars(select(m.Empresas))
    return list(result)


@router.get("/{id_}", response_model=s.EmpresaOut)
async def obter_empresa(
    id_: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """admin_vertical pode obter qualquer empresa; usuário comum só a própria."""
    if user.role != UserRole.admin_vertical and user.empresa_id != id_:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "acesso negado")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


@router.put("/{id_}", response_model=s.EmpresaOut)
async def atualizar_empresa(
    id_: uuid.UUID,
    payload: s.EmpresaUpdate,
    user: User = Depends(require_role(UserRole.admin_vertical)),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza a própria empresa — apenas admin da empresa (admin_vertical).

    O admin só pode editar a EMPRESA dele (empresa_id == id_).
    """
    if user.empresa_id != id_:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "só pode editar a própria empresa")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj
