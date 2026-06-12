"""Modelos / Templates — CRUD de modelos de atividade, proposta comercial e
propostas (builder).

Estrutura:
  /modelos/atividades          — tenant-scoped via empresa_id
  /modelos/propostas-comerciais — tenant-scoped via empresa_id (created_by injetado)
  /modelos/propostas            — tenant-scoped via empresa_id (created_by injetado)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas.modelos import (
    ModeloAtividadeIn,
    ModeloAtividadeOut,
    ModeloAtividadeUpdate,
    ModeloPropostaComercialIn,
    ModeloPropostaComercialOut,
    ModeloPropostaComercialUpdate,
    PropostaModeloIn,
    PropostaModeloOut,
    PropostaModeloUpdate,
)

router = APIRouter(prefix="/modelos", tags=["modelos"])


# ── Repositórios tenant-scoped ────────────────────────────────────────────────

class _AtividadeRepo(TenantRepository):
    model = m.ModelosAtividade


class _PropostaComercialRepo(TenantRepository):
    model = m.ModelosPropostaComercial


class _PropostaModeloRepo(TenantRepository):
    model = m.PropostasModelos


# ── Dependency: garante que o usuário tem empresa ─────────────────────────────

def _require_empresa(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, AsyncSession]:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user, db


def _get_atividade_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _AtividadeRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _AtividadeRepo(db, user.empresa_id)


def _get_proposta_comercial_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _PropostaComercialRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _PropostaComercialRepo(db, user.empresa_id)


def _get_proposta_modelo_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _PropostaModeloRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _PropostaModeloRepo(db, user.empresa_id)


# ── ModelosAtividade ──────────────────────────────────────────────────────────

@router.get("/atividades", response_model=list[ModeloAtividadeOut])
async def listar_modelos_atividade(
    repo: _AtividadeRepo = Depends(_get_atividade_repo),
):
    return await repo.list()


@router.get("/atividades/{id_}", response_model=ModeloAtividadeOut)
async def obter_modelo_atividade(
    id_: uuid.UUID,
    repo: _AtividadeRepo = Depends(_get_atividade_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo de atividade não encontrado")
    return obj


@router.post(
    "/atividades",
    response_model=ModeloAtividadeOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_modelo_atividade(
    payload: ModeloAtividadeIn,
    repo: _AtividadeRepo = Depends(_get_atividade_repo),
):
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/atividades/{id_}", response_model=ModeloAtividadeOut)
async def atualizar_modelo_atividade(
    id_: uuid.UUID,
    payload: ModeloAtividadeUpdate,
    repo: _AtividadeRepo = Depends(_get_atividade_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo de atividade não encontrado")
    return obj


@router.delete("/atividades/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_modelo_atividade(
    id_: uuid.UUID,
    repo: _AtividadeRepo = Depends(_get_atividade_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo de atividade não encontrado")


# ── ModelosPropostaComercial ──────────────────────────────────────────────────

@router.get("/propostas-comerciais", response_model=list[ModeloPropostaComercialOut])
async def listar_modelos_proposta_comercial(
    repo: _PropostaComercialRepo = Depends(_get_proposta_comercial_repo),
):
    return await repo.list()


@router.get("/propostas-comerciais/{id_}", response_model=ModeloPropostaComercialOut)
async def obter_modelo_proposta_comercial(
    id_: uuid.UUID,
    repo: _PropostaComercialRepo = Depends(_get_proposta_comercial_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "modelo de proposta comercial não encontrado"
        )
    return obj


@router.post(
    "/propostas-comerciais",
    response_model=ModeloPropostaComercialOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_modelo_proposta_comercial(
    payload: ModeloPropostaComercialIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    repo = _PropostaComercialRepo(db, user.empresa_id)
    data = payload.model_dump(exclude_unset=True)
    # Injeta created_by com o usuário autenticado
    data.setdefault("created_by", user.id)
    return await repo.add(**data)


@router.put("/propostas-comerciais/{id_}", response_model=ModeloPropostaComercialOut)
async def atualizar_modelo_proposta_comercial(
    id_: uuid.UUID,
    payload: ModeloPropostaComercialUpdate,
    repo: _PropostaComercialRepo = Depends(_get_proposta_comercial_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "modelo de proposta comercial não encontrado"
        )
    return obj


@router.delete("/propostas-comerciais/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_modelo_proposta_comercial(
    id_: uuid.UUID,
    repo: _PropostaComercialRepo = Depends(_get_proposta_comercial_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "modelo de proposta comercial não encontrado"
        )


# ── PropostasModelos ──────────────────────────────────────────────────────────

@router.get("/propostas", response_model=list[PropostaModeloOut])
async def listar_propostas_modelos(
    repo: _PropostaModeloRepo = Depends(_get_proposta_modelo_repo),
):
    return await repo.list()


@router.get("/propostas/{id_}", response_model=PropostaModeloOut)
async def obter_proposta_modelo(
    id_: uuid.UUID,
    repo: _PropostaModeloRepo = Depends(_get_proposta_modelo_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta modelo não encontrada")
    return obj


@router.post(
    "/propostas",
    response_model=PropostaModeloOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_proposta_modelo(
    payload: PropostaModeloIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    repo = _PropostaModeloRepo(db, user.empresa_id)
    data = payload.model_dump(exclude_unset=True)
    # Injeta created_by com o usuário autenticado
    data.setdefault("created_by", user.id)
    return await repo.add(**data)


@router.put("/propostas/{id_}", response_model=PropostaModeloOut)
async def atualizar_proposta_modelo(
    id_: uuid.UUID,
    payload: PropostaModeloUpdate,
    repo: _PropostaModeloRepo = Depends(_get_proposta_modelo_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta modelo não encontrada")
    return obj


@router.delete("/propostas/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_proposta_modelo(
    id_: uuid.UUID,
    repo: _PropostaModeloRepo = Depends(_get_proposta_modelo_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta modelo não encontrada")
