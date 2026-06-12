"""Router SST Saúde Ocupacional.

Entidades:
  /sst/saude/exames           → SaudeOcupacional   (empresa_id, TenantRepository)
  /sst/saude/profissionais    → ProfissionaisSaude (empresa_id, TenantRepository)
                                  POST valida cliente_id contra empresa_sst_id da ClientesSst
  /sst/saude/sinistros        → SinistrosColaborador (sem empresa_id — CRUD simples)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas.sst_saude import (
    ProfissionaisSaudeCreate,
    ProfissionaisSaudeOut,
    ProfissionaisSaudeUpdate,
    SaudeOcupacionalCreate,
    SaudeOcupacionalOut,
    SaudeOcupacionalUpdate,
    SinistrosColaboradorCreate,
    SinistrosColaboradorOut,
    SinistrosColaboradorUpdate,
)

router = APIRouter(prefix="/sst/saude", tags=["sst_saude"])


# ── Repositórios tenant-scoped ────────────────────────────────────────────────

class _SaudeRepo(TenantRepository):
    model = m.SaudeOcupacional


class _ProfRepo(TenantRepository):
    model = m.ProfissionaisSaude


# ── Helpers de dependência ────────────────────────────────────────────────────

def _get_saude_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _SaudeRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _SaudeRepo(db, user.empresa_id)


def _get_prof_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ProfRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ProfRepo(db, user.empresa_id)


def _get_current_user_with_empresa(
    user: User = Depends(get_current_user),
) -> User:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user


# ── SaudeOcupacional — exames ────────────────────────────────────────────────

@router.get("/exames", response_model=list[SaudeOcupacionalOut])
async def listar_exames(repo: _SaudeRepo = Depends(_get_saude_repo)):
    return await repo.list()


@router.get("/exames/{id_}", response_model=SaudeOcupacionalOut)
async def obter_exame(id_: uuid.UUID, repo: _SaudeRepo = Depends(_get_saude_repo)):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exame não encontrado")
    return obj


@router.post("/exames", response_model=SaudeOcupacionalOut, status_code=status.HTTP_201_CREATED)
async def criar_exame(
    payload: SaudeOcupacionalCreate,
    repo: _SaudeRepo = Depends(_get_saude_repo),
):
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/exames/{id_}", response_model=SaudeOcupacionalOut)
async def atualizar_exame(
    id_: uuid.UUID,
    payload: SaudeOcupacionalUpdate,
    repo: _SaudeRepo = Depends(_get_saude_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exame não encontrado")
    return obj


@router.delete("/exames/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_exame(id_: uuid.UUID, repo: _SaudeRepo = Depends(_get_saude_repo)):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exame não encontrado")


# ── ProfissionaisSaude ────────────────────────────────────────────────────────

@router.get("/profissionais", response_model=list[ProfissionaisSaudeOut])
async def listar_profissionais(repo: _ProfRepo = Depends(_get_prof_repo)):
    return await repo.list()


@router.get("/profissionais/{id_}", response_model=ProfissionaisSaudeOut)
async def obter_profissional(id_: uuid.UUID, repo: _ProfRepo = Depends(_get_prof_repo)):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profissional não encontrado")
    return obj


@router.post("/profissionais", response_model=ProfissionaisSaudeOut, status_code=status.HTTP_201_CREATED)
async def criar_profissional(
    payload: ProfissionaisSaudeCreate,
    user: User = Depends(_get_current_user_with_empresa),
    db: AsyncSession = Depends(get_db),
):
    """Cria profissional de saúde.

    Se cliente_id for fornecido, valida que o ClientesSst pertence à empresa
    do usuário autenticado (empresa_sst_id == user.empresa_id).
    """
    if payload.cliente_id is not None:
        cliente = await db.scalar(
            select(m.ClientesSst).where(
                m.ClientesSst.id == payload.cliente_id,
                m.ClientesSst.empresa_sst_id == user.empresa_id,
            )
        )
        if cliente is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "cliente_id não encontrado ou não pertence a esta empresa",
            )

    repo = _ProfRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/profissionais/{id_}", response_model=ProfissionaisSaudeOut)
async def atualizar_profissional(
    id_: uuid.UUID,
    payload: ProfissionaisSaudeUpdate,
    repo: _ProfRepo = Depends(_get_prof_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profissional não encontrado")
    return obj


@router.delete("/profissionais/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_profissional(id_: uuid.UUID, repo: _ProfRepo = Depends(_get_prof_repo)):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profissional não encontrado")


# ── SinistrosColaborador ──────────────────────────────────────────────────────
# Esta tabela NÃO possui empresa_id — vinculada a turmas de treinamento.
# Acesso requer autenticação; sem filtragem de tenant (não há coluna empresa_id).

@router.get("/sinistros", response_model=list[SinistrosColaboradorOut])
async def listar_sinistros(
    turma_id: uuid.UUID | None = None,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista sinistros, opcionalmente filtrados por turma_id."""
    q = select(m.SinistrosColaborador)
    if turma_id is not None:
        q = q.where(m.SinistrosColaborador.turma_id == turma_id)
    result = await db.scalars(q)
    return list(result)


@router.get("/sinistros/{id_}", response_model=SinistrosColaboradorOut)
async def obter_sinistro(
    id_: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.SinistrosColaborador).where(m.SinistrosColaborador.id == id_)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "sinistro não encontrado")
    return obj


@router.post("/sinistros", response_model=SinistrosColaboradorOut, status_code=status.HTTP_201_CREATED)
async def criar_sinistro(
    payload: SinistrosColaboradorCreate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obj = m.SinistrosColaborador(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/sinistros/{id_}", response_model=SinistrosColaboradorOut)
async def atualizar_sinistro(
    id_: uuid.UUID,
    payload: SinistrosColaboradorUpdate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.SinistrosColaborador).where(m.SinistrosColaborador.id == id_)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "sinistro não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/sinistros/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_sinistro(
    id_: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.SinistrosColaborador).where(m.SinistrosColaborador.id == id_)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "sinistro não encontrado")
    await db.delete(obj)
    await db.commit()
