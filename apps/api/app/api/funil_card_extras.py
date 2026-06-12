"""Funil Card Extras — orçamentos, orçamentos SST, propostas e comparações.

Todas as tabelas filhas de funil_cards são escopadas via:
    card_id (path) → funil_cards.funil_id → funis.empresa_id

Assim o isolamento multi-tenant é garantido sem empresa_id no path.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import funil_card_extras as s

router = APIRouter(prefix="/funil/cards", tags=["funil-card-extras"])


# ── Helper: verificar que card pertence à empresa (igual ao funil.py) ─────────

async def _get_card_scoped(
    card_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.FunilCards:
    """Retorna o card garantindo que pertence ao funil da empresa autenticada."""
    result = await db.scalar(
        select(m.FunilCards)
        .join(m.Funis, m.FunilCards.funil_id == m.Funis.id)
        .where(m.FunilCards.id == card_id, m.Funis.empresa_id == empresa_id)
    )
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card não encontrado")
    return result


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ── Orçamentos ────────────────────────────────────────────────────────────────

@router.get("/{card_id}/orcamentos", response_model=list[s.OrcamentoOut])
async def listar_orcamentos(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    result = await db.scalars(
        select(m.FunilCardOrcamentos).where(
            m.FunilCardOrcamentos.card_id == card_id
        )
    )
    return list(result)


@router.post(
    "/{card_id}/orcamentos",
    response_model=s.OrcamentoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_orcamento(
    card_id: uuid.UUID,
    payload: s.OrcamentoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = m.FunilCardOrcamentos(
        id=uuid.uuid4(),
        card_id=card_id,
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{card_id}/orcamentos/{orcamento_id}", response_model=s.OrcamentoOut)
async def obter_orcamento(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentos).where(
            m.FunilCardOrcamentos.id == orcamento_id,
            m.FunilCardOrcamentos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento não encontrado")
    return obj


@router.put("/{card_id}/orcamentos/{orcamento_id}", response_model=s.OrcamentoOut)
async def atualizar_orcamento(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    payload: s.OrcamentoUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentos).where(
            m.FunilCardOrcamentos.id == orcamento_id,
            m.FunilCardOrcamentos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{card_id}/orcamentos/{orcamento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_orcamento(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentos).where(
            m.FunilCardOrcamentos.id == orcamento_id,
            m.FunilCardOrcamentos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento não encontrado")
    await db.delete(obj)
    await db.commit()


# ── Orçamentos SST ────────────────────────────────────────────────────────────

@router.get("/{card_id}/orcamentos-sst", response_model=list[s.OrcamentoSstOut])
async def listar_orcamentos_sst(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    result = await db.scalars(
        select(m.FunilCardOrcamentosServicosSst).where(
            m.FunilCardOrcamentosServicosSst.card_id == card_id
        )
    )
    return list(result)


@router.post(
    "/{card_id}/orcamentos-sst",
    response_model=s.OrcamentoSstOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_orcamento_sst(
    card_id: uuid.UUID,
    payload: s.OrcamentoSstIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = m.FunilCardOrcamentosServicosSst(
        id=uuid.uuid4(),
        card_id=card_id,
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get(
    "/{card_id}/orcamentos-sst/{orcamento_id}",
    response_model=s.OrcamentoSstOut,
)
async def obter_orcamento_sst(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentosServicosSst).where(
            m.FunilCardOrcamentosServicosSst.id == orcamento_id,
            m.FunilCardOrcamentosServicosSst.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento SST não encontrado")
    return obj


@router.put(
    "/{card_id}/orcamentos-sst/{orcamento_id}",
    response_model=s.OrcamentoSstOut,
)
async def atualizar_orcamento_sst(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    payload: s.OrcamentoSstUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentosServicosSst).where(
            m.FunilCardOrcamentosServicosSst.id == orcamento_id,
            m.FunilCardOrcamentosServicosSst.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento SST não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{card_id}/orcamentos-sst/{orcamento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_orcamento_sst(
    card_id: uuid.UUID,
    orcamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardOrcamentosServicosSst).where(
            m.FunilCardOrcamentosServicosSst.id == orcamento_id,
            m.FunilCardOrcamentosServicosSst.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "orçamento SST não encontrado")
    await db.delete(obj)
    await db.commit()


# ── Propostas ─────────────────────────────────────────────────────────────────

@router.get("/{card_id}/propostas", response_model=list[s.PropostaOut])
async def listar_propostas(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    result = await db.scalars(
        select(m.FunilCardPropostas).where(
            m.FunilCardPropostas.card_id == card_id
        )
    )
    return list(result)


@router.post(
    "/{card_id}/propostas",
    response_model=s.PropostaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_proposta(
    card_id: uuid.UUID,
    payload: s.PropostaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = m.FunilCardPropostas(
        id=uuid.uuid4(),
        card_id=card_id,
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{card_id}/propostas/{proposta_id}", response_model=s.PropostaOut)
async def obter_proposta(
    card_id: uuid.UUID,
    proposta_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardPropostas).where(
            m.FunilCardPropostas.id == proposta_id,
            m.FunilCardPropostas.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
    return obj


@router.put("/{card_id}/propostas/{proposta_id}", response_model=s.PropostaOut)
async def atualizar_proposta(
    card_id: uuid.UUID,
    proposta_id: uuid.UUID,
    payload: s.PropostaUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardPropostas).where(
            m.FunilCardPropostas.id == proposta_id,
            m.FunilCardPropostas.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{card_id}/propostas/{proposta_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_proposta(
    card_id: uuid.UUID,
    proposta_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardPropostas).where(
            m.FunilCardPropostas.id == proposta_id,
            m.FunilCardPropostas.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
    await db.delete(obj)
    await db.commit()


# ── Comparações ───────────────────────────────────────────────────────────────

@router.get("/{card_id}/comparacoes", response_model=list[s.ComparacaoOut])
async def listar_comparacoes(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    result = await db.scalars(
        select(m.FunilCardComparacoes).where(
            m.FunilCardComparacoes.card_id == card_id
        )
    )
    return list(result)


@router.post(
    "/{card_id}/comparacoes",
    response_model=s.ComparacaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_comparacao(
    card_id: uuid.UUID,
    payload: s.ComparacaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = m.FunilCardComparacoes(
        id=uuid.uuid4(),
        card_id=card_id,
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{card_id}/comparacoes/{comparacao_id}", response_model=s.ComparacaoOut)
async def obter_comparacao(
    card_id: uuid.UUID,
    comparacao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardComparacoes).where(
            m.FunilCardComparacoes.id == comparacao_id,
            m.FunilCardComparacoes.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "comparação não encontrada")
    return obj


@router.put("/{card_id}/comparacoes/{comparacao_id}", response_model=s.ComparacaoOut)
async def atualizar_comparacao(
    card_id: uuid.UUID,
    comparacao_id: uuid.UUID,
    payload: s.ComparacaoUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardComparacoes).where(
            m.FunilCardComparacoes.id == comparacao_id,
            m.FunilCardComparacoes.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "comparação não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{card_id}/comparacoes/{comparacao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_comparacao(
    card_id: uuid.UUID,
    comparacao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(m.FunilCardComparacoes).where(
            m.FunilCardComparacoes.id == comparacao_id,
            m.FunilCardComparacoes.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "comparação não encontrada")
    await db.delete(obj)
    await db.commit()
