"""Contas a Receber — CRUD + colunas + kanban (reorder, mover, bootstrap)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import contas_receber as s

# ── CRUD básico via fábrica ───────────────────────────────────────────────────
# Exportamos três routers: contas, colunas e kanban.
# main.py deve incluir os três.

contas_crud_router = make_crud_router(
    model=m.ContasReceber,
    create_schema=s.ContaReceberIn,
    update_schema=s.ContaReceberIn,
    read_schema=s.ContaReceberOut,
    prefix="/financeiro/contas-receber",
    tags=["contas-receber"],
)

colunas_crud_router = make_crud_router(
    model=m.ContasReceberColunas,
    create_schema=s.ColunaIn,
    update_schema=s.ColunaIn,
    read_schema=s.ColunaOut,
    prefix="/financeiro/contas-receber/colunas",
    tags=["contas-receber-colunas"],
)

# ── Endpoints de kanban ───────────────────────────────────────────────────────
router = APIRouter(prefix="/financeiro/contas-receber", tags=["contas-receber"])


class _ContaRepo(TenantRepository):
    model = m.ContasReceber


def _repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ContaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ContaRepo(db, user.empresa_id)


@router.post("", response_model=s.ContaReceberOut, status_code=status.HTTP_201_CREATED)
async def criar_conta(
    payload: s.ContaReceberIn,
    repo: _ContaRepo = Depends(_repo),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma conta validando que coluna_id pertence à empresa do usuário (anti FK-injection).

    Este endpoint explícito tem prioridade sobre o POST genérico do contas_crud_router
    porque o cr_kanban_router é registrado antes no main.py.
    """
    col = await db.scalar(
        select(m.ContasReceberColunas).where(
            m.ContasReceberColunas.id == payload.coluna_id,
            m.ContasReceberColunas.empresa_id == repo.empresa_id,
        )
    )
    if col is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coluna não encontrada")
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reordenar(itens: list[s.ReorderItem], repo: _ContaRepo = Depends(_repo)):
    """Reordena múltiplas contas em lote (tenant-scoped)."""
    for it in itens:
        await repo.update(it.id, ordem=it.ordem)


@router.post("/{conta_id}/mover", response_model=s.ContaReceberOut)
async def mover(
    conta_id: uuid.UUID,
    body: s.MoverColunaIn,
    repo: _ContaRepo = Depends(_repo),
    db: AsyncSession = Depends(get_db),
):
    """Move uma conta para outra coluna e registra a movimentação (tenant-scoped).

    Valida que coluna_destino_id pertence à empresa do usuário (anti FK-injection).
    """
    conta = await repo.get(conta_id)
    if conta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrada")

    # Validate destination column belongs to the caller's tenant
    dest = await db.scalar(
        select(m.ContasReceberColunas).where(
            m.ContasReceberColunas.id == body.coluna_destino_id,
            m.ContasReceberColunas.empresa_id == repo.empresa_id,
        )
    )
    if dest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coluna destino não encontrada")

    origem = conta.coluna_id
    conta = await repo.update(conta_id, coluna_id=body.coluna_destino_id)
    descricao = body.justificativa or "movimentação de coluna"
    db.add(m.ContasReceberMovimentacoes(
        id=uuid.uuid4(),
        conta_id=conta_id,
        tipo="mudanca_coluna",
        descricao=descricao,
        coluna_origem_id=origem,
        coluna_destino_id=body.coluna_destino_id,
    ))
    await db.commit()
    return conta


@router.post("/bootstrap-colunas", status_code=status.HTTP_201_CREATED)
async def bootstrap_colunas(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria as colunas padrão de CR se a empresa ainda não tiver nenhuma."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    existe = await db.scalar(
        select(m.ContasReceberColunas).where(
            m.ContasReceberColunas.empresa_id == user.empresa_id
        )
    )
    if existe:
        return {"criadas": 0}
    # NOTE: race condition acceptable here (pre-launch, low concurrency).
    # A concurrent call could insert duplicates between the scalar check and commit.
    # A DB-level unique constraint or advisory lock would eliminate it if needed later.
    padroes = ["A Receber", "Emitir NFe", "Cobrança", "Vencidos", "Recebidas"]
    for i, nome in enumerate(padroes):
        db.add(m.ContasReceberColunas(
            id=uuid.uuid4(),
            empresa_id=user.empresa_id,
            nome=nome,
            ordem=i,
        ))
    await db.commit()
    return {"criadas": len(padroes)}
