"""Leads da Landing Page — formulário de contato público.

Tenant model: tabela GLOBAL (sem empresa_id). Controle por role:

  Table          | Access mode
  ---------------|------------------------------------------------------
  leads_landing  | POST público (formulário de contato, SEM auth);
                 | GET/obter/deletar → admin_vertical

SEGURANÇA: o POST público aceita SÓ os campos do formulário (LeadIn);
nunca aceita empresa_id/role/flags de admin no payload.
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
from app.schemas import leads_landing as s

router = APIRouter(prefix="/leads-landing", tags=["leads-landing"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))


async def _get_or_404(db: AsyncSession, id_: uuid.UUID) -> m.LeadsLanding:
    obj = await db.scalar(select(m.LeadsLanding).where(m.LeadsLanding.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lead não encontrado")
    return obj


# ── POST público (sem auth) ────────────────────────────────────────────────────

@router.post("", response_model=s.LeadOut, status_code=status.HTTP_201_CREATED)
async def criar_lead(payload: s.LeadIn, db: AsyncSession = Depends(get_db)):
    """Captura um lead da landing page — público, sem autenticação."""
    obj = m.LeadsLanding(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Leitura / gestão (admin_vertical) ──────────────────────────────────────────

@router.get("", response_model=list[s.LeadOut])
async def listar_leads(db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    """Lista todos os leads — restrito a admin_vertical."""
    result = await db.scalars(
        select(m.LeadsLanding).order_by(m.LeadsLanding.created_at.desc())
    )
    return list(result)


@router.get("/{id_}", response_model=s.LeadOut)
async def obter_lead(id_: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    return await _get_or_404(db, id_)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_lead(id_: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = _ADMIN):
    result = await db.execute(sa_delete(m.LeadsLanding).where(m.LeadsLanding.id == id_))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lead não encontrado")
