"""setor_permissoes — permissões por setor.

Tenant model: setor_permissoes NÃO tem empresa_id. É filha de `setores`
(setores.empresa_id). Todo acesso é escopado via o setor (path), validando
que o setor pertence à empresa autenticada.

REGRA LEGADA CRÍTICA: lista de permissões vazia significa "libera tudo".
Portanto o GET de listagem retorna [] normalmente (nunca 404) quando não há
registros — desde que o setor exista e pertença à empresa.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import setor_permissoes as s

router = APIRouter(prefix="/setores", tags=["setor-permissoes"])


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_setor_scoped(
    setor_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> m.Setores:
    """Garante que o setor pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.Setores).where(
            m.Setores.id == setor_id, m.Setores.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "setor não encontrado")
    return obj


@router.get("/{setor_id}/permissoes", response_model=list[s.SetorPermissaoOut])
async def listar_permissoes(
    setor_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista as permissões do setor. Lista vazia ([]) = 'libera tudo' (legado)."""
    empresa_id = _require_empresa(user)
    await _get_setor_scoped(setor_id, db, empresa_id)
    result = await db.scalars(
        select(m.SetorPermissoes).where(m.SetorPermissoes.setor_id == setor_id)
    )
    return list(result)


@router.post(
    "/{setor_id}/permissoes",
    response_model=s.SetorPermissaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_permissao(
    setor_id: uuid.UUID,
    payload: s.SetorPermissaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_setor_scoped(setor_id, db, empresa_id)
    obj = m.SetorPermissoes(
        id=uuid.uuid4(),
        setor_id=setor_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get(
    "/{setor_id}/permissoes/{permissao_id}", response_model=s.SetorPermissaoOut
)
async def obter_permissao(
    setor_id: uuid.UUID,
    permissao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_setor_scoped(setor_id, db, empresa_id)
    obj = await db.scalar(
        select(m.SetorPermissoes).where(
            m.SetorPermissoes.id == permissao_id,
            m.SetorPermissoes.setor_id == setor_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "permissão não encontrada")
    return obj


@router.put(
    "/{setor_id}/permissoes/{permissao_id}", response_model=s.SetorPermissaoOut
)
async def atualizar_permissao(
    setor_id: uuid.UUID,
    permissao_id: uuid.UUID,
    payload: s.SetorPermissaoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_setor_scoped(setor_id, db, empresa_id)
    obj = await db.scalar(
        select(m.SetorPermissoes).where(
            m.SetorPermissoes.id == permissao_id,
            m.SetorPermissoes.setor_id == setor_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "permissão não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{setor_id}/permissoes/{permissao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_permissao(
    setor_id: uuid.UUID,
    permissao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_setor_scoped(setor_id, db, empresa_id)
    obj = await db.scalar(
        select(m.SetorPermissoes).where(
            m.SetorPermissoes.id == permissao_id,
            m.SetorPermissoes.setor_id == setor_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "permissão não encontrada")
    await db.delete(obj)
    await db.commit()
