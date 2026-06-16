"""Administração cross-tenant de módulos por empresa (super admin).

Diferente de ``/white-label/*`` (auto-serviço, escopo do token), estes endpoints
recebem o ``empresa_id`` ALVO pelo path e são restritos a ``admin_vertical``.
Servem o dashboard super admin para ligar/desligar módulos e telas de QUALQUER
empresa.

    GET    /empresas/{empresa_id}/modulos                    → vínculos da empresa-alvo
    PUT    /empresas/{empresa_id}/modulos/{modulo_id}        → upsert {ativo} (idempotente)
    DELETE /empresas/{empresa_id}/modulos/{modulo_id}        → remove vínculo
    GET    /empresas/{empresa_id}/modulos-telas              → todas as telas da empresa
    PUT    /empresas/{empresa_id}/modulos/{modulo_id}/telas  → define o conjunto exato

Segurança: o ``empresa_id`` vem do PATH (não do token) de propósito — o portão é
o guard ``admin_vertical``. Mantido em arquivo separado dos ``/white-label/*`` para
deixar essa fronteira de tenant explícita. Padrão já validado em
``/admin/users?empresa_id=``.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import white_label as s

router = APIRouter(prefix="/empresas/{empresa_id}", tags=["empresas-modulos-admin"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))


async def _empresa_or_404(db: AsyncSession, empresa_id: uuid.UUID) -> m.Empresas:
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == empresa_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


async def _modulo_or_404(db: AsyncSession, modulo_id: uuid.UUID) -> m.Modulos:
    obj = await db.scalar(select(m.Modulos).where(m.Modulos.id == modulo_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    return obj


# ── Módulos vinculados à empresa-alvo ─────────────────────────────────────────

@router.get("/modulos", response_model=list[s.EmpresaModuloOut])
async def listar_modulos(
    empresa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    await _empresa_or_404(db, empresa_id)
    result = await db.scalars(
        select(m.EmpresasModulos).where(m.EmpresasModulos.empresa_id == empresa_id)
    )
    return list(result)


@router.put("/modulos/{modulo_id}", response_model=s.EmpresaModuloOut)
async def upsert_modulo(
    empresa_id: uuid.UUID,
    modulo_id: uuid.UUID,
    payload: s.EmpresaModuloAtivoIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Ativa/atualiza o vínculo empresa↔módulo. Idempotente via
    UniqueConstraint(empresa_id, modulo_id): cria se não existir, atualiza ``ativo``."""
    await _empresa_or_404(db, empresa_id)
    await _modulo_or_404(db, modulo_id)

    obj = await db.scalar(
        select(m.EmpresasModulos).where(
            m.EmpresasModulos.empresa_id == empresa_id,
            m.EmpresasModulos.modulo_id == modulo_id,
        )
    )
    if obj is None:
        obj = m.EmpresasModulos(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            modulo_id=modulo_id,
            ativo=payload.ativo,
        )
        db.add(obj)
    else:
        obj.ativo = payload.ativo

    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/modulos/{modulo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_modulo(
    empresa_id: uuid.UUID,
    modulo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    await _empresa_or_404(db, empresa_id)
    result = await db.execute(
        sa_delete(m.EmpresasModulos).where(
            m.EmpresasModulos.empresa_id == empresa_id,
            m.EmpresasModulos.modulo_id == modulo_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")


# ── Telas por módulo da empresa-alvo ──────────────────────────────────────────

@router.get("/modulos-telas", response_model=list[s.EmpresaModuloTelaOut])
async def listar_telas(
    empresa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Lista plana de TODAS as telas configuradas para a empresa (todos os módulos)."""
    await _empresa_or_404(db, empresa_id)
    result = await db.scalars(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.empresa_id == empresa_id
        )
    )
    return list(result)


@router.put("/modulos/{modulo_id}/telas", response_model=list[s.EmpresaModuloTelaOut])
async def definir_telas(
    empresa_id: uuid.UUID,
    modulo_id: uuid.UUID,
    payload: s.TelasSetIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Define o conjunto EXATO de telas ativas do módulo para a empresa.

    Reconcilia numa transação: insere as ausentes, remove as que sumiram,
    reativa as presentes. Retorna o estado final das telas do módulo.
    """
    await _empresa_or_404(db, empresa_id)
    await _modulo_or_404(db, modulo_id)

    desejadas = set(payload.tela_ids)
    existentes = list(
        await db.scalars(
            select(m.EmpresasModulosTelas).where(
                m.EmpresasModulosTelas.empresa_id == empresa_id,
                m.EmpresasModulosTelas.modulo_id == modulo_id,
            )
        )
    )
    por_tela = {t.tela_id: t for t in existentes}

    # Remove as que não estão mais no conjunto desejado.
    for tela in existentes:
        if tela.tela_id not in desejadas:
            await db.delete(tela)

    # Insere as novas; reativa as que já existiam.
    for tela_id in desejadas:
        existente = por_tela.get(tela_id)
        if existente is None:
            db.add(
                m.EmpresasModulosTelas(
                    id=uuid.uuid4(),
                    empresa_id=empresa_id,
                    modulo_id=modulo_id,
                    tela_id=tela_id,
                    ativo=True,
                )
            )
        else:
            existente.ativo = True

    await db.commit()

    result = await db.scalars(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.empresa_id == empresa_id,
            m.EmpresasModulosTelas.modulo_id == modulo_id,
        )
    )
    return list(result)
