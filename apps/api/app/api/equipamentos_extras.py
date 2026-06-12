"""Sub-tabelas de EPI / EQUIPAMENTOS — routers REST.

Tenant direto (empresa_id) via make_crud_router:
  - equipamentos_modelos_atividade → /sst/epi/modelos-atividade

Filha de equipamentos_movimentacoes (escopo via movimentacao → empresa_id):
  - equipamentos_movimentacoes_historico
        → /sst/epi/movimentacoes/{movimentacao_id}/historico  (append-only: GET + POST)

Notas de segurança:
  - O histórico é escopado validando que a movimentação pai pertence à empresa
    do caller (equipamentos_movimentacoes.empresa_id); referenciar uma movimentação
    de outro tenant retorna 404.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import equipamentos_extras as s

# ─────────────────────────────────────────────────────────────────────────────
# equipamentos_modelos_atividade — tenant direto (empresa_id)
# ─────────────────────────────────────────────────────────────────────────────

epi_modelos_atividade_router = make_crud_router(
    model=m.EquipamentosModelosAtividade,
    create_schema=s.ModeloAtividadeEpiIn,
    update_schema=s.ModeloAtividadeEpiUpdate,
    read_schema=s.ModeloAtividadeEpiOut,
    prefix="/sst/epi/modelos-atividade",
    tags=["sst-epi-modelos-atividade"],
)


# ─────────────────────────────────────────────────────────────────────────────
# equipamentos_movimentacoes_historico — filha de movimentacao (append-only)
# ─────────────────────────────────────────────────────────────────────────────

def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_movimentacao_scoped(
    movimentacao_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.EquipamentosMovimentacoes:
    """Garante que a movimentação pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.EquipamentosMovimentacoes).where(
            m.EquipamentosMovimentacoes.id == movimentacao_id,
            m.EquipamentosMovimentacoes.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "movimentação não encontrada")
    return obj


historico_router = APIRouter(
    prefix="/sst/epi/movimentacoes/{movimentacao_id}/historico",
    tags=["sst-epi-movimentacoes-historico"],
)


@historico_router.get("", response_model=list[s.HistoricoOut])
async def listar_historico(
    movimentacao_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_movimentacao_scoped(movimentacao_id, db, empresa_id)
    result = await db.scalars(
        select(m.EquipamentosMovimentacoesHistorico).where(
            m.EquipamentosMovimentacoesHistorico.movimentacao_id == movimentacao_id
        )
    )
    return list(result)


@historico_router.post(
    "", response_model=s.HistoricoOut, status_code=status.HTTP_201_CREATED
)
async def criar_historico(
    movimentacao_id: uuid.UUID,
    payload: s.HistoricoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_movimentacao_scoped(movimentacao_id, db, empresa_id)
    obj = m.EquipamentosMovimentacoesHistorico(
        id=uuid.uuid4(),
        movimentacao_id=movimentacao_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@historico_router.get("/{historico_id}", response_model=s.HistoricoOut)
async def obter_historico(
    movimentacao_id: uuid.UUID,
    historico_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_movimentacao_scoped(movimentacao_id, db, empresa_id)
    obj = await db.scalar(
        select(m.EquipamentosMovimentacoesHistorico).where(
            m.EquipamentosMovimentacoesHistorico.id == historico_id,
            m.EquipamentosMovimentacoesHistorico.movimentacao_id == movimentacao_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "histórico não encontrado")
    return obj
