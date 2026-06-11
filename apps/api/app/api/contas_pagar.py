"""Contas a Pagar — CRUD + colunas + kanban (reorder, mover, bootstrap)."""
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
from app.schemas import contas_pagar as s

# ── CRUD básico via fábrica ───────────────────────────────────────────────────
contas_crud_router = make_crud_router(
    model=m.ContasPagar,
    create_schema=s.ContaPagarIn,
    update_schema=s.ContaPagarIn,
    read_schema=s.ContaPagarOut,
    prefix="/financeiro/contas-pagar",
    tags=["contas-pagar"],
)

colunas_crud_router = make_crud_router(
    model=m.ContasPagarColunas,
    create_schema=s.ColunaIn,
    update_schema=s.ColunaIn,
    read_schema=s.ColunaOut,
    prefix="/financeiro/contas-pagar/colunas",
    tags=["contas-pagar-colunas"],
)

# ── Endpoints de kanban ───────────────────────────────────────────────────────
router = APIRouter(prefix="/financeiro/contas-pagar", tags=["contas-pagar"])


class _ContaRepo(TenantRepository):
    model = m.ContasPagar


def _repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ContaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ContaRepo(db, user.empresa_id)


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reordenar(itens: list[s.ReorderItem], repo: _ContaRepo = Depends(_repo)):
    """Reordena múltiplas contas em lote (tenant-scoped)."""
    for it in itens:
        await repo.update(it.id, ordem=it.ordem)


@router.post("/{conta_id}/mover", response_model=s.ContaPagarOut)
async def mover(
    conta_id: uuid.UUID,
    body: s.MoverColunaIn,
    repo: _ContaRepo = Depends(_repo),
    db: AsyncSession = Depends(get_db),
):
    """Move uma conta para outra coluna e registra a movimentação (tenant-scoped)."""
    conta = await repo.get(conta_id)
    if conta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrada")
    origem = conta.coluna_id
    conta = await repo.update(conta_id, coluna_id=body.coluna_destino_id)
    descricao = body.justificativa or "movimentação de coluna"
    db.add(m.ContasPagarMovimentacoes(
        id=uuid.uuid4(),
        conta_id=conta_id,
        tipo="movimentacao",
        descricao=descricao,
        coluna_origem_id=origem,
        coluna_destino_id=body.coluna_destino_id,
    ))
    await db.commit()
    return conta


@router.post("/gerar-recorrentes")
async def gerar_recorrentes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual: gera as contas recorrentes do mês atual para a empresa do usuário."""
    from datetime import date

    from app.services.contas_recorrentes import gerar_contas_recorrentes

    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    n = await gerar_contas_recorrentes(db, user.empresa_id, ref=date.today().replace(day=1))
    return {"criadas": n}


@router.post("/bootstrap-colunas", status_code=status.HTTP_201_CREATED)
async def bootstrap_colunas(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria as colunas padrão de CP se a empresa ainda não tiver nenhuma.

    NOTE: A coluna 'Pagamentos Recorrentes' é usada pelo job de recorrência (Task 4).
    """
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    existe = await db.scalar(
        select(m.ContasPagarColunas).where(
            m.ContasPagarColunas.empresa_id == user.empresa_id
        )
    )
    if existe:
        return {"criadas": 0}
    padroes = ["A Pagar", "Pagamentos Recorrentes", "Vencidos", "Pagas"]
    for i, nome in enumerate(padroes):
        db.add(m.ContasPagarColunas(
            id=uuid.uuid4(),
            empresa_id=user.empresa_id,
            nome=nome,
            ordem=i,
        ))
    await db.commit()
    return {"criadas": len(padroes)}
