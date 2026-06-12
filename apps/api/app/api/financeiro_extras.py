"""Sub-tabelas de FINANCEIRO — routers REST.

Tenant direto (empresa_id) via make_crud_router:
  - financeiro_contas  → /financeiro/contas
  - modelos_atividade  → /financeiro/modelos-atividade

Filhas de contas_pagar, escopadas via o pai (JOIN validando empresa_id):
  - contas_pagar_atividades        → /financeiro/contas-pagar/{conta_id}/atividades
  - contas_pagar_movimentacoes     → /financeiro/contas-pagar/{conta_id}/movimentacoes (append-only)

Filha de uma atividade (escopo via atividade → conta → empresa):
  - contas_pagar_atividades_anexos → /financeiro/contas-pagar/atividades/{atividade_id}/anexos

Notas de segurança:
  - UPDATE schemas não contêm FKs de parentesco (conta_id, atividade_id).
  - O isolamento multi-tenant das filhas é garantido pelo JOIN com contas_pagar.empresa_id;
    referenciar um pai de outro tenant retorna 404.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import financeiro_extras as s

# ─────────────────────────────────────────────────────────────────────────────
# Tenant direto (empresa_id) — make_crud_router
# ─────────────────────────────────────────────────────────────────────────────

financeiro_contas_router = make_crud_router(
    model=m.FinanceiroContas,
    create_schema=s.FinanceiroContaIn,
    update_schema=s.FinanceiroContaUpdate,
    read_schema=s.FinanceiroContaOut,
    prefix="/financeiro/contas",
    tags=["financeiro-contas"],
)

modelos_atividade_router = make_crud_router(
    model=m.ModelosAtividade,
    create_schema=s.ModeloAtividadeIn,
    update_schema=s.ModeloAtividadeUpdate,
    read_schema=s.ModeloAtividadeOut,
    prefix="/financeiro/modelos-atividade",
    tags=["financeiro-modelos-atividade"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de escopo
# ─────────────────────────────────────────────────────────────────────────────

def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_conta_scoped(
    conta_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.ContasPagar:
    """Garante que a conta a pagar pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.ContasPagar).where(
            m.ContasPagar.id == conta_id,
            m.ContasPagar.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conta não encontrada")
    return obj


async def _get_atividade_scoped(
    atividade_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.ContasPagarAtividades:
    """Garante que a atividade pertence a uma conta da empresa autenticada.

    Escopo: atividade → contas_pagar.empresa_id (JOIN).
    """
    obj = await db.scalar(
        select(m.ContasPagarAtividades)
        .join(m.ContasPagar, m.ContasPagarAtividades.conta_id == m.ContasPagar.id)
        .where(
            m.ContasPagarAtividades.id == atividade_id,
            m.ContasPagar.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")
    return obj


# ─────────────────────────────────────────────────────────────────────────────
# contas_pagar_atividades — filha de contas_pagar (CRUD escopado via conta_id)
# ─────────────────────────────────────────────────────────────────────────────

atividades_router = APIRouter(
    prefix="/financeiro/contas-pagar/{conta_id}/atividades",
    tags=["contas-pagar-atividades"],
)


@atividades_router.get("", response_model=list[s.AtividadeOut])
async def listar_atividades(
    conta_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    result = await db.scalars(
        select(m.ContasPagarAtividades).where(
            m.ContasPagarAtividades.conta_id == conta_id
        )
    )
    return list(result)


@atividades_router.post(
    "", response_model=s.AtividadeOut, status_code=status.HTTP_201_CREATED
)
async def criar_atividade(
    conta_id: uuid.UUID,
    payload: s.AtividadeIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    obj = m.ContasPagarAtividades(
        id=uuid.uuid4(),
        conta_id=conta_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@atividades_router.get("/{atividade_id}", response_model=s.AtividadeOut)
async def obter_atividade(
    conta_id: uuid.UUID,
    atividade_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    obj = await db.scalar(
        select(m.ContasPagarAtividades).where(
            m.ContasPagarAtividades.id == atividade_id,
            m.ContasPagarAtividades.conta_id == conta_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")
    return obj


@atividades_router.put("/{atividade_id}", response_model=s.AtividadeOut)
async def atualizar_atividade(
    conta_id: uuid.UUID,
    atividade_id: uuid.UUID,
    payload: s.AtividadeUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    obj = await db.scalar(
        select(m.ContasPagarAtividades).where(
            m.ContasPagarAtividades.id == atividade_id,
            m.ContasPagarAtividades.conta_id == conta_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@atividades_router.delete(
    "/{atividade_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remover_atividade(
    conta_id: uuid.UUID,
    atividade_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    result = await db.execute(
        sa_delete(m.ContasPagarAtividades).where(
            m.ContasPagarAtividades.id == atividade_id,
            m.ContasPagarAtividades.conta_id == conta_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")


# ─────────────────────────────────────────────────────────────────────────────
# contas_pagar_atividades_anexos — filha de atividade (escopo via atividade→conta)
# ─────────────────────────────────────────────────────────────────────────────

anexos_router = APIRouter(
    prefix="/financeiro/contas-pagar/atividades/{atividade_id}/anexos",
    tags=["contas-pagar-atividades-anexos"],
)


@anexos_router.get("", response_model=list[s.AnexoOut])
async def listar_anexos(
    atividade_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_atividade_scoped(atividade_id, db, empresa_id)
    result = await db.scalars(
        select(m.ContasPagarAtividadesAnexos).where(
            m.ContasPagarAtividadesAnexos.atividade_id == atividade_id
        )
    )
    return list(result)


@anexos_router.post(
    "", response_model=s.AnexoOut, status_code=status.HTTP_201_CREATED
)
async def criar_anexo(
    atividade_id: uuid.UUID,
    payload: s.AnexoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_atividade_scoped(atividade_id, db, empresa_id)
    obj = m.ContasPagarAtividadesAnexos(
        id=uuid.uuid4(),
        atividade_id=atividade_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@anexos_router.get("/{anexo_id}", response_model=s.AnexoOut)
async def obter_anexo(
    atividade_id: uuid.UUID,
    anexo_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_atividade_scoped(atividade_id, db, empresa_id)
    obj = await db.scalar(
        select(m.ContasPagarAtividadesAnexos).where(
            m.ContasPagarAtividadesAnexos.id == anexo_id,
            m.ContasPagarAtividadesAnexos.atividade_id == atividade_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")
    return obj


@anexos_router.delete("/{anexo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_anexo(
    atividade_id: uuid.UUID,
    anexo_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_atividade_scoped(atividade_id, db, empresa_id)
    result = await db.execute(
        sa_delete(m.ContasPagarAtividadesAnexos).where(
            m.ContasPagarAtividadesAnexos.id == anexo_id,
            m.ContasPagarAtividadesAnexos.atividade_id == atividade_id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")


# ─────────────────────────────────────────────────────────────────────────────
# contas_pagar_movimentacoes — filha de contas_pagar (append-only: GET + POST)
# ─────────────────────────────────────────────────────────────────────────────

cp_movimentacoes_router = APIRouter(
    prefix="/financeiro/contas-pagar/{conta_id}/movimentacoes",
    tags=["contas-pagar-movimentacoes"],
)


@cp_movimentacoes_router.get("", response_model=list[s.MovimentacaoOut])
async def listar_movimentacoes(
    conta_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    result = await db.scalars(
        select(m.ContasPagarMovimentacoes).where(
            m.ContasPagarMovimentacoes.conta_id == conta_id
        )
    )
    return list(result)


@cp_movimentacoes_router.post(
    "", response_model=s.MovimentacaoOut, status_code=status.HTTP_201_CREATED
)
async def criar_movimentacao(
    conta_id: uuid.UUID,
    payload: s.MovimentacaoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    obj = m.ContasPagarMovimentacoes(
        id=uuid.uuid4(),
        conta_id=conta_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@cp_movimentacoes_router.get("/{mov_id}", response_model=s.MovimentacaoOut)
async def obter_movimentacao(
    conta_id: uuid.UUID,
    mov_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_conta_scoped(conta_id, db, empresa_id)
    obj = await db.scalar(
        select(m.ContasPagarMovimentacoes).where(
            m.ContasPagarMovimentacoes.id == mov_id,
            m.ContasPagarMovimentacoes.conta_id == conta_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "movimentação não encontrada")
    return obj
