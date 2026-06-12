"""Módulo Agenda — CRUD de eventos, compartilhamentos e permissões."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import agenda as s

router = APIRouter(prefix="/agenda", tags=["agenda"])


# ── Repositórios tenant-scoped ────────────────────────────────────────────────

class _EventoRepo(TenantRepository):
    model = m.AgendaEventos


class _PermissaoRepo(TenantRepository):
    model = m.AgendaPermissoes


def _get_evento_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _EventoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _EventoRepo(db, user.empresa_id)


def _get_permissao_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _PermissaoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _PermissaoRepo(db, user.empresa_id)


# ── Helper: verifica que evento pertence à empresa do usuário ─────────────────

async def _get_evento_scoped(
    evento_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.AgendaEventos:
    evento = await db.scalar(
        select(m.AgendaEventos).where(
            m.AgendaEventos.id == evento_id,
            m.AgendaEventos.empresa_id == empresa_id,
        )
    )
    if evento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "evento não encontrado")
    return evento


# ── Eventos ───────────────────────────────────────────────────────────────────

@router.get("/eventos", response_model=list[s.EventoOut])
async def listar_eventos(
    repo: _EventoRepo = Depends(_get_evento_repo),
):
    return await repo.list()


@router.get("/eventos/{evento_id}", response_model=s.EventoOut)
async def obter_evento(
    evento_id: uuid.UUID,
    repo: _EventoRepo = Depends(_get_evento_repo),
):
    obj = await repo.get(evento_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "evento não encontrado")
    return obj


@router.post("/eventos", response_model=s.EventoOut, status_code=status.HTTP_201_CREATED)
async def criar_evento(
    payload: s.EventoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    # Validar FK cruzada: cliente_sst_id deve pertencer à mesma empresa
    if payload.cliente_sst_id is not None:
        cliente = await db.scalar(
            select(m.ClientesSst).where(
                m.ClientesSst.id == payload.cliente_sst_id,
                m.ClientesSst.empresa_sst_id == user.empresa_id,
            )
        )
        if cliente is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "cliente não encontrado")

    evento = m.AgendaEventos(
        id=uuid.uuid4(),
        empresa_id=user.empresa_id,
        criado_por=user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


@router.put("/eventos/{evento_id}", response_model=s.EventoOut)
async def atualizar_evento(
    evento_id: uuid.UUID,
    payload: s.EventoUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    evento = await _get_evento_scoped(evento_id, db, user.empresa_id)

    # Validar FK cruzada se cliente_sst_id for alterado
    dados = payload.model_dump(exclude_unset=True)
    if "cliente_sst_id" in dados and dados["cliente_sst_id"] is not None:
        cliente = await db.scalar(
            select(m.ClientesSst).where(
                m.ClientesSst.id == dados["cliente_sst_id"],
                m.ClientesSst.empresa_sst_id == user.empresa_id,
            )
        )
        if cliente is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "cliente não encontrado")

    for k, v in dados.items():
        setattr(evento, k, v)
    await db.commit()
    await db.refresh(evento)
    return evento


@router.delete("/eventos/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_evento(
    evento_id: uuid.UUID,
    repo: _EventoRepo = Depends(_get_evento_repo),
):
    if not await repo.delete(evento_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "evento não encontrado")


# ── Compartilhamentos ─────────────────────────────────────────────────────────

@router.get("/compartilhamentos", response_model=list[s.CompartilhamentoOut])
async def listar_compartilhamentos(
    evento_id: Optional[uuid.UUID] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista compartilhamentos para eventos da empresa do usuário autenticado."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    # Scope via join com AgendaEventos
    q = (
        select(m.AgendaCompartilhamentos)
        .join(
            m.AgendaEventos,
            m.AgendaCompartilhamentos.evento_id == m.AgendaEventos.id,
        )
        .where(m.AgendaEventos.empresa_id == user.empresa_id)
    )
    if evento_id is not None:
        q = q.where(m.AgendaCompartilhamentos.evento_id == evento_id)

    result = await db.scalars(q)
    return list(result)


@router.post(
    "/compartilhamentos",
    response_model=s.CompartilhamentoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_compartilhamento(
    payload: s.CompartilhamentoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compartilha um evento.  O evento deve pertencer à empresa do usuário."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    # Garante que o evento pertence à empresa (404 cross-tenant)
    await _get_evento_scoped(payload.evento_id, db, user.empresa_id)

    compartilhamento = m.AgendaCompartilhamentos(
        id=uuid.uuid4(),
        compartilhado_por=user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(compartilhamento)
    await db.commit()
    await db.refresh(compartilhamento)
    return compartilhamento


@router.delete(
    "/compartilhamentos/{compartilhamento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_compartilhamento(
    compartilhamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    # Scope via join
    obj = await db.scalar(
        select(m.AgendaCompartilhamentos)
        .join(
            m.AgendaEventos,
            m.AgendaCompartilhamentos.evento_id == m.AgendaEventos.id,
        )
        .where(
            m.AgendaCompartilhamentos.id == compartilhamento_id,
            m.AgendaEventos.empresa_id == user.empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "compartilhamento não encontrado")
    await db.delete(obj)
    await db.commit()


# ── Permissões ────────────────────────────────────────────────────────────────

@router.get("/permissoes", response_model=list[s.PermissaoOut])
async def listar_permissoes(
    repo: _PermissaoRepo = Depends(_get_permissao_repo),
):
    """Lista permissões de agenda da empresa."""
    return await repo.list()


@router.post(
    "/permissoes",
    response_model=s.PermissaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_permissao(
    payload: s.PermissaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Concede permissão a um usuário para criar eventos na agenda do dono."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")

    permissao = m.AgendaPermissoes(
        id=uuid.uuid4(),
        empresa_id=user.empresa_id,
        dono_id=user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(permissao)
    await db.commit()
    await db.refresh(permissao)
    return permissao


@router.delete(
    "/permissoes/{permissao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_permissao(
    permissao_id: uuid.UUID,
    repo: _PermissaoRepo = Depends(_get_permissao_repo),
):
    if not await repo.delete(permissao_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "permissão não encontrada")
