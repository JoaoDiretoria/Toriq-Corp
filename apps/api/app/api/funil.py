"""Funil / CRM genérico — CRUD de funis, etapas, cards, etiquetas e atividades."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import funil as s
from app.services.funil import criar_configuracao_padrao

# ── Repositórios tenant-scoped ────────────────────────────────────────────────


class _FunilRepo(TenantRepository):
    model = m.Funis


class _EtiquetaRepo(TenantRepository):
    model = m.FunilEtiquetas


def _get_funil_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _FunilRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _FunilRepo(db, user.empresa_id)


def _get_etiqueta_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _EtiquetaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _EtiquetaRepo(db, user.empresa_id)


# ── Helper: verificar que card pertence à empresa ─────────────────────────────

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


# ── Router principal ──────────────────────────────────────────────────────────

router = APIRouter(prefix="/funil", tags=["funil"])


# ── Funis ─────────────────────────────────────────────────────────────────────

@router.get("/funis", response_model=list[s.FunilOut])
async def listar_funis(repo: _FunilRepo = Depends(_get_funil_repo)):
    return await repo.list()


# IMPORTANTE: rota específica ANTES de /{funil_id} para não ser capturada
@router.get("/funis/{funil_id}/configuracao", response_model=s.ConfiguracaoOut)
async def obter_configuracao(
    funil_id: uuid.UUID,
    repo: _FunilRepo = Depends(_get_funil_repo),
    db: AsyncSession = Depends(get_db),
):
    funil = await repo.get(funil_id)
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    cfg = await db.scalar(
        select(m.FunisConfiguracoes).where(
            m.FunisConfiguracoes.funil_id == funil_id
        )
    )
    if cfg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "configuração não encontrada")
    return cfg


@router.get("/funis/{funil_id}", response_model=s.FunilOut)
async def obter_funil(funil_id: uuid.UUID, repo: _FunilRepo = Depends(_get_funil_repo)):
    funil = await repo.get(funil_id)
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    return funil


@router.post("/funis", response_model=s.FunilOut, status_code=status.HTTP_201_CREATED)
async def criar_funil(
    payload: s.FunilIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    funil = m.Funis(
        id=uuid.uuid4(),
        empresa_id=user.empresa_id,
        **payload.model_dump(),
    )
    db.add(funil)
    await db.flush()
    await criar_configuracao_padrao(db, funil)
    await db.commit()
    await db.refresh(funil)
    return funil


@router.put("/funis/{funil_id}", response_model=s.FunilOut)
async def atualizar_funil(
    funil_id: uuid.UUID,
    payload: s.FunilIn,
    repo: _FunilRepo = Depends(_get_funil_repo),
):
    funil = await repo.update(funil_id, **payload.model_dump(exclude_unset=True))
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    return funil


@router.delete("/funis/{funil_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_funil(funil_id: uuid.UUID, repo: _FunilRepo = Depends(_get_funil_repo)):
    if not await repo.delete(funil_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")


# ── Etapas ────────────────────────────────────────────────────────────────────

@router.get("/etapas", response_model=list[s.EtapaOut])
async def listar_etapas(
    funil_id: Optional[uuid.UUID] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    q = (
        select(m.FunilEtapas)
        .join(m.Funis, m.FunilEtapas.funil_id == m.Funis.id)
        .where(m.Funis.empresa_id == user.empresa_id)
    )
    if funil_id:
        q = q.where(m.FunilEtapas.funil_id == funil_id)
    result = await db.scalars(q)
    return list(result)


@router.post("/etapas", response_model=s.EtapaOut, status_code=status.HTTP_201_CREATED)
async def criar_etapa(
    payload: s.EtapaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    # Verificar que o funil pertence à empresa
    funil = await db.scalar(
        select(m.Funis).where(
            m.Funis.id == payload.funil_id,
            m.Funis.empresa_id == user.empresa_id,
        )
    )
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    etapa = m.FunilEtapas(id=uuid.uuid4(), **payload.model_dump())
    db.add(etapa)
    await db.commit()
    await db.refresh(etapa)
    return etapa


@router.get("/etapas/{etapa_id}", response_model=s.EtapaOut)
async def obter_etapa(
    etapa_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    etapa = await db.scalar(
        select(m.FunilEtapas)
        .join(m.Funis, m.FunilEtapas.funil_id == m.Funis.id)
        .where(m.FunilEtapas.id == etapa_id, m.Funis.empresa_id == user.empresa_id)
    )
    if etapa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada")
    return etapa


@router.put("/etapas/{etapa_id}", response_model=s.EtapaOut)
async def atualizar_etapa(
    etapa_id: uuid.UUID,
    payload: s.EtapaUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    etapa = await db.scalar(
        select(m.FunilEtapas)
        .join(m.Funis, m.FunilEtapas.funil_id == m.Funis.id)
        .where(m.FunilEtapas.id == etapa_id, m.Funis.empresa_id == user.empresa_id)
    )
    if etapa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(etapa, k, v)
    await db.commit()
    await db.refresh(etapa)
    return etapa


@router.delete("/etapas/{etapa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_etapa(
    etapa_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    etapa = await db.scalar(
        select(m.FunilEtapas)
        .join(m.Funis, m.FunilEtapas.funil_id == m.Funis.id)
        .where(m.FunilEtapas.id == etapa_id, m.Funis.empresa_id == user.empresa_id)
    )
    if etapa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada")
    await db.delete(etapa)
    await db.commit()


# ── Cards ─────────────────────────────────────────────────────────────────────

@router.patch("/cards/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reordenar_cards(
    itens: list[s.ReorderItem],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    for it in itens:
        card = await _get_card_scoped(it.id, db, user.empresa_id)
        card.ordem = it.ordem
    await db.commit()


@router.post("/cards/{card_id}/mover", response_model=s.CardOut)
async def mover_card(
    card_id: uuid.UUID,
    body: s.MoverEtapaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    card = await _get_card_scoped(card_id, db, user.empresa_id)

    # Verificar que a etapa destino pertence ao mesmo funil do card (não apenas à empresa),
    # prevenindo movimentação cross-funil/cross-tenant
    etapa_destino = await db.scalar(
        select(m.FunilEtapas).where(
            m.FunilEtapas.id == body.etapa_destino_id,
            m.FunilEtapas.funil_id == card.funil_id,
        )
    )
    if etapa_destino is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa destino não encontrada")

    etapa_origem_id = card.etapa_id
    card.etapa_id = body.etapa_destino_id

    descricao = body.justificativa or "movimentação de etapa"
    db.add(
        m.FunilCardMovimentacoes(
            id=uuid.uuid4(),
            card_id=card_id,
            tipo="mudanca_etapa",
            descricao=descricao,
            etapa_origem_id=etapa_origem_id,
            etapa_destino_id=body.etapa_destino_id,
        )
    )
    await db.commit()
    await db.refresh(card)
    return card


@router.get("/cards", response_model=list[s.CardOut])
async def listar_cards(
    funil_id: Optional[uuid.UUID] = None,
    etapa_id: Optional[uuid.UUID] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    q = (
        select(m.FunilCards)
        .join(m.Funis, m.FunilCards.funil_id == m.Funis.id)
        .where(m.Funis.empresa_id == user.empresa_id)
    )
    if funil_id:
        q = q.where(m.FunilCards.funil_id == funil_id)
    if etapa_id:
        q = q.where(m.FunilCards.etapa_id == etapa_id)
    result = await db.scalars(q)
    return list(result)


@router.post("/cards", response_model=s.CardOut, status_code=status.HTTP_201_CREATED)
async def criar_card(
    payload: s.CardIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    # Verificar que o funil pertence à empresa
    funil = await db.scalar(
        select(m.Funis).where(
            m.Funis.id == payload.funil_id,
            m.Funis.empresa_id == user.empresa_id,
        )
    )
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    # Verificar que a etapa pertence ao funil informado (evita injeção cross-funil)
    etapa = await db.scalar(
        select(m.FunilEtapas).where(
            m.FunilEtapas.id == payload.etapa_id,
            m.FunilEtapas.funil_id == payload.funil_id,
        )
    )
    if etapa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada no funil")
    card = m.FunilCards(id=uuid.uuid4(), **payload.model_dump())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.get("/cards/{card_id}", response_model=s.CardOut)
async def obter_card(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return await _get_card_scoped(card_id, db, user.empresa_id)


@router.put("/cards/{card_id}", response_model=s.CardOut)
async def atualizar_card(
    card_id: uuid.UUID,
    payload: s.CardUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    card = await _get_card_scoped(card_id, db, user.empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(card, k, v)
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_card(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    card = await _get_card_scoped(card_id, db, user.empresa_id)
    await db.delete(card)
    await db.commit()


# ── Etiquetas ─────────────────────────────────────────────────────────────────

@router.get("/etiquetas", response_model=list[s.EtiquetaOut])
async def listar_etiquetas(repo: _EtiquetaRepo = Depends(_get_etiqueta_repo)):
    return await repo.list()


@router.post("/etiquetas", response_model=s.EtiquetaOut, status_code=status.HTTP_201_CREATED)
async def criar_etiqueta(
    payload: s.EtiquetaIn,
    repo: _EtiquetaRepo = Depends(_get_etiqueta_repo),
):
    return await repo.add(**payload.model_dump())


@router.get("/etiquetas/{etiqueta_id}", response_model=s.EtiquetaOut)
async def obter_etiqueta(
    etiqueta_id: uuid.UUID,
    repo: _EtiquetaRepo = Depends(_get_etiqueta_repo),
):
    obj = await repo.get(etiqueta_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etiqueta não encontrada")
    return obj


@router.put("/etiquetas/{etiqueta_id}", response_model=s.EtiquetaOut)
async def atualizar_etiqueta(
    etiqueta_id: uuid.UUID,
    payload: s.EtiquetaIn,
    repo: _EtiquetaRepo = Depends(_get_etiqueta_repo),
):
    obj = await repo.update(etiqueta_id, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etiqueta não encontrada")
    return obj


@router.delete("/etiquetas/{etiqueta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_etiqueta(
    etiqueta_id: uuid.UUID,
    repo: _EtiquetaRepo = Depends(_get_etiqueta_repo),
):
    if not await repo.delete(etiqueta_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etiqueta não encontrada")


# ── Etiquetas do card (M:N) ───────────────────────────────────────────────────

@router.get("/cards/{card_id}/etiquetas", response_model=list[s.EtiquetaOut])
async def listar_etiquetas_do_card(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.FunilEtiquetas)
        .join(
            m.FunilCardEtiquetas,
            m.FunilCardEtiquetas.etiqueta_id == m.FunilEtiquetas.id,
        )
        .where(m.FunilCardEtiquetas.card_id == card_id)
    )
    return list(result)


@router.post(
    "/cards/{card_id}/etiquetas",
    response_model=s.EtiquetaOut,
    status_code=status.HTTP_201_CREATED,
)
async def associar_etiqueta_ao_card(
    card_id: uuid.UUID,
    body: s.AssociarEtiquetaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    # Verificar que a etiqueta pertence à empresa
    etiqueta = await db.scalar(
        select(m.FunilEtiquetas).where(
            m.FunilEtiquetas.id == body.etiqueta_id,
            m.FunilEtiquetas.empresa_id == user.empresa_id,
        )
    )
    if etiqueta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etiqueta não encontrada")
    # Evitar duplicata
    existente = await db.scalar(
        select(m.FunilCardEtiquetas).where(
            m.FunilCardEtiquetas.card_id == card_id,
            m.FunilCardEtiquetas.etiqueta_id == body.etiqueta_id,
        )
    )
    if existente is None:
        db.add(
            m.FunilCardEtiquetas(
                id=uuid.uuid4(),
                card_id=card_id,
                etiqueta_id=body.etiqueta_id,
            )
        )
        await db.commit()
    return etiqueta


@router.delete(
    "/cards/{card_id}/etiquetas/{etiqueta_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_etiqueta_do_card(
    card_id: uuid.UUID,
    etiqueta_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    assoc = await db.scalar(
        select(m.FunilCardEtiquetas).where(
            m.FunilCardEtiquetas.card_id == card_id,
            m.FunilCardEtiquetas.etiqueta_id == etiqueta_id,
        )
    )
    if assoc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "associação não encontrada")
    await db.delete(assoc)
    await db.commit()


# ── Atividades do card ────────────────────────────────────────────────────────

@router.get("/cards/{card_id}/atividades", response_model=list[s.AtividadeOut])
async def listar_atividades_do_card(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.card_id == card_id
        )
    )
    return list(result)


@router.post(
    "/cards/{card_id}/atividades",
    response_model=s.AtividadeOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_atividade_no_card(
    card_id: uuid.UUID,
    payload: s.AtividadeIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    atividade = m.FunilCardAtividades(
        id=uuid.uuid4(),
        card_id=card_id,
        **payload.model_dump(),
    )
    db.add(atividade)
    await db.commit()
    await db.refresh(atividade)
    return atividade


@router.put(
    "/cards/{card_id}/atividades/{atividade_id}",
    response_model=s.AtividadeOut,
)
async def atualizar_atividade(
    card_id: uuid.UUID,
    atividade_id: uuid.UUID,
    payload: s.AtividadeIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    atividade = await db.scalar(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.id == atividade_id,
            m.FunilCardAtividades.card_id == card_id,
        )
    )
    if atividade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(atividade, k, v)
    await db.commit()
    await db.refresh(atividade)
    return atividade


@router.delete(
    "/cards/{card_id}/atividades/{atividade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_atividade(
    card_id: uuid.UUID,
    atividade_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_card_scoped(card_id, db, user.empresa_id)
    atividade = await db.scalar(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.id == atividade_id,
            m.FunilCardAtividades.card_id == card_id,
        )
    )
    if atividade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "atividade não encontrada")
    await db.delete(atividade)
    await db.commit()
