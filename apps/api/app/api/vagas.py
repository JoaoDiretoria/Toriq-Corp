"""Vagas e Candidaturas — recrutamento público.

Tenant model: tabelas GLOBAIS (sem empresa_id). Controle por role:

  Table         | Access mode
  --------------|-------------------------------------------------------
  vagas         | GET público (lista de vagas abertas, ativa=true);
                | GET /admin (todas), POST/PUT/DELETE → admin_vertical
  candidaturas  | POST público (candidatar-se a uma vaga; valida que a
                | vaga existe); GET lista → admin_vertical

SEGURANÇA: o POST público de candidatura aceita SÓ os campos do formulário
(CandidaturaIn); vaga_id vem do path e é validado contra uma vaga existente.
UPDATE de vaga não expõe FKs de parentesco.
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
from app.schemas import vagas as s

router = APIRouter(prefix="/vagas", tags=["vagas"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))


async def _get_vaga_or_404(db: AsyncSession, vaga_id: uuid.UUID) -> m.Vagas:
    obj = await db.scalar(select(m.Vagas).where(m.Vagas.id == vaga_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vaga não encontrada")
    return obj


# ── Vagas: leitura pública ─────────────────────────────────────────────────────

@router.get("", response_model=list[s.VagaOut])
async def listar_vagas(db: AsyncSession = Depends(get_db)):
    """Lista apenas vagas abertas (ativa = true) — público."""
    result = await db.scalars(select(m.Vagas).where(m.Vagas.ativa.is_(True)))
    return list(result)


@router.get("/admin", response_model=list[s.VagaOut])
async def listar_vagas_admin(db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    """Lista todas as vagas (ativas e inativas) — admin_vertical."""
    result = await db.scalars(select(m.Vagas))
    return list(result)


@router.get("/{vaga_id}", response_model=s.VagaOut)
async def obter_vaga(vaga_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Detalhe público de uma vaga."""
    return await _get_vaga_or_404(db, vaga_id)


# ── Vagas: escrita (admin_vertical) ────────────────────────────────────────────

@router.post("", response_model=s.VagaOut, status_code=status.HTTP_201_CREATED)
async def criar_vaga(payload: s.VagaIn, db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    obj = m.Vagas(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{vaga_id}", response_model=s.VagaOut)
async def atualizar_vaga(
    vaga_id: uuid.UUID,
    payload: s.VagaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_vaga_or_404(db, vaga_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{vaga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_vaga(vaga_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    result = await db.execute(sa_delete(m.Vagas).where(m.Vagas.id == vaga_id))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vaga não encontrada")


# ── Candidaturas ───────────────────────────────────────────────────────────────

@router.post(
    "/{vaga_id}/candidaturas",
    response_model=s.CandidaturaOut,
    status_code=status.HTTP_201_CREATED,
    tags=["candidaturas"],
)
async def criar_candidatura(
    vaga_id: uuid.UUID,
    payload: s.CandidaturaIn,
    db: AsyncSession = Depends(get_db),
):
    """Candidatar-se a uma vaga — público, sem autenticação.

    Valida que a vaga existe (404 caso contrário). vaga_id vem do path.
    """
    await _get_vaga_or_404(db, vaga_id)
    obj = m.Candidaturas(
        id=uuid.uuid4(),
        vaga_id=vaga_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get(
    "/{vaga_id}/candidaturas",
    response_model=list[s.CandidaturaOut],
    tags=["candidaturas"],
)
async def listar_candidaturas(
    vaga_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Lista as candidaturas de uma vaga — restrito a admin_vertical."""
    await _get_vaga_or_404(db, vaga_id)
    result = await db.scalars(
        select(m.Candidaturas).where(m.Candidaturas.vaga_id == vaga_id)
    )
    return list(result)


@router.get(
    "/candidaturas/todas",
    response_model=list[s.CandidaturaOut],
    tags=["candidaturas"],
)
async def listar_todas_candidaturas(db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    """Lista todas as candidaturas (todas as vagas) — admin_vertical."""
    result = await db.scalars(select(m.Candidaturas))
    return list(result)
