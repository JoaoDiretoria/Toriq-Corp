"""Toriq Vendas — FASE 5 (Medição & Contratação): router de uso.

Expõe o painel de uso (consumo do Toriq Vendas):
- GET /vendas/uso .......... uso da PRÓPRIA empresa (admin_vertical / cliente_torq).
- GET /vendas/uso/empresas .. visão cross-empresa p/ cobrança (SOMENTE admin_vertical).

Tenant SEMPRE por user.empresa_id (403 se None). Sem migration aqui — o
integrador roda a migration da tabela vendas_uso e registra este router em
main.py.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.models.user import User, UserRole
from app.schemas import vendas_uso as s
from app.services import vendas_uso as svc

router = APIRouter(prefix="/vendas", tags=["vendas-uso"])

# Admin do módulo de Vendas (própria empresa).
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)
# Super-admin (visão cross-empresa p/ cobrança).
require_super_admin = require_role(UserRole.admin_vertical)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


@router.get("/uso", response_model=s.UsoResumoOut)
async def uso_da_empresa(
    periodo: Optional[str] = Query(None),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Uso da PRÓPRIA empresa. Sem ``periodo`` = acumulado total."""
    empresa_id = _require_empresa(user)
    return await svc.resumo_uso(db, empresa_id=empresa_id, periodo=periodo)


@router.get("/uso/empresas", response_model=s.UsoEmpresasOut)
async def uso_por_empresa(
    periodo: Optional[str] = Query(None),
    user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Visão cross-empresa do uso (base para cobrança). SOMENTE admin_vertical."""
    return await svc.resumo_por_empresa(db, periodo=periodo)
