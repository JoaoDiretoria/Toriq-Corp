from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.nota import Nota
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas.nota import NotaIn, NotaOut

router = APIRouter(prefix="/notas", tags=["notas"])


class NotaRepository(TenantRepository[Nota]):
    model = Nota


def get_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotaRepository:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return NotaRepository(db, user.empresa_id)


@router.get("", response_model=list[NotaOut])
async def listar(repo: NotaRepository = Depends(get_repo)) -> list[Nota]:
    return await repo.list()


@router.post("", response_model=NotaOut, status_code=status.HTTP_201_CREATED)
async def criar(payload: NotaIn, repo: NotaRepository = Depends(get_repo)) -> Nota:
    return await repo.add(texto=payload.texto)
