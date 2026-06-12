"""Funil / Comercial avançado — automações, configurações, comercial legado,
propostas comerciais e atividades unificadas.

Estratégia de tenant por tabela:
- automacoes ............... empresa_id (TenantRepository) + valida funil_id/etapa_id na criação.
- automacoes_execucoes ..... filha de automacoes; escopada via automacao (path) → empresa_id.
- funis_configuracoes ...... escopada via funil_id → funis.empresa_id (empresa_id é nullable).
- funil_negocio_configuracoes empresa_id (CRUD genérico).
- comercial_funil .......... empresa_id NULLABLE → router custom que SEMPRE carimba
                             empresa_id na escrita e filtra estritamente por ele.
- propostas_comerciais_* ... empresa_id (CRUD) + valida card_id (quando enviado) contra o tenant.
- atividades_unificadas .... VIEW (sem PK) → somente leitura, filtrada por empresa_id.
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
from app.schemas import funil_comercial as s

router = APIRouter(prefix="/funil-comercial", tags=["funil-comercial"])


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _validar_funil(db: AsyncSession, funil_id: uuid.UUID, empresa_id: uuid.UUID) -> m.Funis:
    funil = await db.scalar(
        select(m.Funis).where(m.Funis.id == funil_id, m.Funis.empresa_id == empresa_id)
    )
    if funil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "funil não encontrado")
    return funil


async def _validar_etapa_no_funil(
    db: AsyncSession, etapa_id: uuid.UUID, funil_id: uuid.UUID
) -> m.FunilEtapas:
    etapa = await db.scalar(
        select(m.FunilEtapas).where(
            m.FunilEtapas.id == etapa_id, m.FunilEtapas.funil_id == funil_id
        )
    )
    if etapa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada no funil")
    return etapa


async def _validar_card(db: AsyncSession, card_id: uuid.UUID, empresa_id: uuid.UUID) -> m.FunilCards:
    card = await db.scalar(
        select(m.FunilCards)
        .join(m.Funis, m.FunilCards.funil_id == m.Funis.id)
        .where(m.FunilCards.id == card_id, m.Funis.empresa_id == empresa_id)
    )
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card não encontrado")
    return card


# ═══════════════════════════════════════════════════════════════════════════════
# Automações (empresa_id + validação de funil_id / etapa_id)
# ═══════════════════════════════════════════════════════════════════════════════

automacoes_router = APIRouter(prefix="/automacoes", tags=["automacoes"])


@automacoes_router.get("", response_model=list[s.AutomacaoOut])
async def listar_automacoes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(m.Automacoes).where(m.Automacoes.empresa_id == empresa_id)
    )
    return list(result)


@automacoes_router.post("", response_model=s.AutomacaoOut, status_code=status.HTTP_201_CREATED)
async def criar_automacao(
    payload: s.AutomacaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    data = payload.model_dump(exclude_unset=True)
    funil_id = data.get("funil_id")
    etapa_id = data.get("etapa_id")
    if funil_id is not None:
        await _validar_funil(db, funil_id, empresa_id)
        if etapa_id is not None:
            await _validar_etapa_no_funil(db, etapa_id, funil_id)
    elif etapa_id is not None:
        # etapa sem funil: garantir que a etapa pertence à empresa via o funil dela
        etapa = await db.scalar(
            select(m.FunilEtapas)
            .join(m.Funis, m.FunilEtapas.funil_id == m.Funis.id)
            .where(m.FunilEtapas.id == etapa_id, m.Funis.empresa_id == empresa_id)
        )
        if etapa is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "etapa não encontrada")
    obj = m.Automacoes(id=uuid.uuid4(), empresa_id=empresa_id, **data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@automacoes_router.get("/{automacao_id}", response_model=s.AutomacaoOut)
async def obter_automacao(
    automacao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.Automacoes).where(
            m.Automacoes.id == automacao_id, m.Automacoes.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "automação não encontrada")
    return obj


@automacoes_router.put("/{automacao_id}", response_model=s.AutomacaoOut)
async def atualizar_automacao(
    automacao_id: uuid.UUID,
    payload: s.AutomacaoUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.Automacoes).where(
            m.Automacoes.id == automacao_id, m.Automacoes.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "automação não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@automacoes_router.delete("/{automacao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_automacao(
    automacao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.Automacoes).where(
            m.Automacoes.id == automacao_id, m.Automacoes.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "automação não encontrada")
    await db.delete(obj)
    await db.commit()


# ── Execuções (filhas de automacoes, escopadas via automacao) ──────────────────

async def _validar_automacao(
    db: AsyncSession, automacao_id: uuid.UUID, empresa_id: uuid.UUID
) -> m.Automacoes:
    obj = await db.scalar(
        select(m.Automacoes).where(
            m.Automacoes.id == automacao_id, m.Automacoes.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "automação não encontrada")
    return obj


@automacoes_router.get(
    "/{automacao_id}/execucoes", response_model=list[s.AutomacaoExecucaoOut]
)
async def listar_execucoes(
    automacao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_automacao(db, automacao_id, empresa_id)
    result = await db.scalars(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.automacao_id == automacao_id
        )
    )
    return list(result)


@automacoes_router.post(
    "/{automacao_id}/execucoes",
    response_model=s.AutomacaoExecucaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_execucao(
    automacao_id: uuid.UUID,
    payload: s.AutomacaoExecucaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_automacao(db, automacao_id, empresa_id)
    # card_id do payload validado contra o tenant
    await _validar_card(db, payload.card_id, empresa_id)
    obj = m.AutomacoesExecucoes(
        id=uuid.uuid4(),
        automacao_id=automacao_id,
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@automacoes_router.get(
    "/{automacao_id}/execucoes/{execucao_id}",
    response_model=s.AutomacaoExecucaoOut,
)
async def obter_execucao(
    automacao_id: uuid.UUID,
    execucao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_automacao(db, automacao_id, empresa_id)
    obj = await db.scalar(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.id == execucao_id,
            m.AutomacoesExecucoes.automacao_id == automacao_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "execução não encontrada")
    return obj


@automacoes_router.put(
    "/{automacao_id}/execucoes/{execucao_id}",
    response_model=s.AutomacaoExecucaoOut,
)
async def atualizar_execucao(
    automacao_id: uuid.UUID,
    execucao_id: uuid.UUID,
    payload: s.AutomacaoExecucaoUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_automacao(db, automacao_id, empresa_id)
    obj = await db.scalar(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.id == execucao_id,
            m.AutomacoesExecucoes.automacao_id == automacao_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "execução não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@automacoes_router.delete(
    "/{automacao_id}/execucoes/{execucao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_execucao(
    automacao_id: uuid.UUID,
    execucao_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_automacao(db, automacao_id, empresa_id)
    obj = await db.scalar(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.id == execucao_id,
            m.AutomacoesExecucoes.automacao_id == automacao_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "execução não encontrada")
    await db.delete(obj)
    await db.commit()


router.include_router(automacoes_router)


# ═══════════════════════════════════════════════════════════════════════════════
# Configurações do funil (funis_configuracoes — escopada via funil_id → funis)
# ═══════════════════════════════════════════════════════════════════════════════

funil_cfg_router = APIRouter(prefix="/funis/{funil_id}/configuracao", tags=["funis-configuracoes"])


@funil_cfg_router.get("", response_model=s.FunilConfiguracaoOut)
async def obter_funil_configuracao(
    funil_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_funil(db, funil_id, empresa_id)
    cfg = await db.scalar(
        select(m.FunisConfiguracoes).where(m.FunisConfiguracoes.funil_id == funil_id)
    )
    if cfg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "configuração não encontrada")
    return cfg


@funil_cfg_router.put("", response_model=s.FunilConfiguracaoOut)
async def upsert_funil_configuracao(
    funil_id: uuid.UUID,
    payload: s.FunilConfiguracaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _validar_funil(db, funil_id, empresa_id)
    cfg = await db.scalar(
        select(m.FunisConfiguracoes).where(m.FunisConfiguracoes.funil_id == funil_id)
    )
    data = payload.model_dump(exclude_unset=True)
    if cfg is None:
        cfg = m.FunisConfiguracoes(
            id=uuid.uuid4(), funil_id=funil_id, empresa_id=empresa_id, **data
        )
        db.add(cfg)
    else:
        for k, v in data.items():
            setattr(cfg, k, v)
    await db.commit()
    await db.refresh(cfg)
    return cfg


router.include_router(funil_cfg_router)


# ═══════════════════════════════════════════════════════════════════════════════
# Configurações de negócio do funil (funil_negocio_configuracoes — empresa_id)
# ═══════════════════════════════════════════════════════════════════════════════

router.include_router(make_crud_router(
    model=m.FunilNegocioConfiguracoes,
    create_schema=s.FunilNegocioConfiguracaoIn,
    update_schema=s.FunilNegocioConfiguracaoIn,
    read_schema=s.FunilNegocioConfiguracaoOut,
    prefix="/negocio-configuracoes",
    tags=["funil-negocio-configuracoes"],
))


# ═══════════════════════════════════════════════════════════════════════════════
# Comercial funil (legado — empresa_id NULLABLE → router custom)
# ═══════════════════════════════════════════════════════════════════════════════

comercial_router = APIRouter(prefix="/comercial-funil", tags=["comercial-funil"])


@comercial_router.get("", response_model=list[s.ComercialFunilOut])
async def listar_comercial(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(m.ComercialFunil).where(m.ComercialFunil.empresa_id == empresa_id)
    )
    return list(result)


@comercial_router.post("", response_model=s.ComercialFunilOut, status_code=status.HTTP_201_CREATED)
async def criar_comercial(
    payload: s.ComercialFunilIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = m.ComercialFunil(
        id=uuid.uuid4(), empresa_id=empresa_id, **payload.model_dump(exclude_unset=True)
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@comercial_router.get("/{item_id}", response_model=s.ComercialFunilOut)
async def obter_comercial(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.ComercialFunil).where(
            m.ComercialFunil.id == item_id, m.ComercialFunil.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "registro não encontrado")
    return obj


@comercial_router.put("/{item_id}", response_model=s.ComercialFunilOut)
async def atualizar_comercial(
    item_id: uuid.UUID,
    payload: s.ComercialFunilUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.ComercialFunil).where(
            m.ComercialFunil.id == item_id, m.ComercialFunil.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "registro não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@comercial_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_comercial(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(m.ComercialFunil).where(
            m.ComercialFunil.id == item_id, m.ComercialFunil.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "registro não encontrado")
    await db.delete(obj)
    await db.commit()


router.include_router(comercial_router)


# ═══════════════════════════════════════════════════════════════════════════════
# Propostas comerciais (3 variantes — empresa_id + validação de card_id)
# ═══════════════════════════════════════════════════════════════════════════════

def _make_proposta_router(*, model, create_schema, update_schema, read_schema, prefix, tag):
    """Router CRUD para uma tabela de proposta (empresa_id), validando card_id."""
    pr = APIRouter(prefix=prefix, tags=[tag])

    @pr.get("", response_model=list[read_schema])
    async def listar(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        empresa_id = _require_empresa(user)
        result = await db.scalars(select(model).where(model.empresa_id == empresa_id))
        return list(result)

    @pr.post("", response_model=read_schema, status_code=status.HTTP_201_CREATED)
    async def criar(
        payload: create_schema,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        empresa_id = _require_empresa(user)
        data = payload.model_dump(exclude_unset=True)
        card_id = data.get("card_id")
        if card_id is not None:
            await _validar_card(db, card_id, empresa_id)
        obj = model(id=uuid.uuid4(), empresa_id=empresa_id, **data)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    @pr.get("/{item_id}", response_model=read_schema)
    async def obter(
        item_id: uuid.UUID,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        empresa_id = _require_empresa(user)
        obj = await db.scalar(
            select(model).where(model.id == item_id, model.empresa_id == empresa_id)
        )
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
        return obj

    @pr.put("/{item_id}", response_model=read_schema)
    async def atualizar(
        item_id: uuid.UUID,
        payload: update_schema,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        empresa_id = _require_empresa(user)
        obj = await db.scalar(
            select(model).where(model.id == item_id, model.empresa_id == empresa_id)
        )
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        await db.commit()
        await db.refresh(obj)
        return obj

    @pr.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def remover(
        item_id: uuid.UUID,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        empresa_id = _require_empresa(user)
        obj = await db.scalar(
            select(model).where(model.id == item_id, model.empresa_id == empresa_id)
        )
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "proposta não encontrada")
        await db.delete(obj)
        await db.commit()

    return pr


router.include_router(_make_proposta_router(
    model=m.PropostasComerciaisTreinamentos,
    create_schema=s.PropostaTreinamentoIn,
    update_schema=s.PropostaTreinamentoUpdateIn,
    read_schema=s.PropostaTreinamentoOut,
    prefix="/propostas/treinamentos",
    tag="propostas-treinamentos",
))

router.include_router(_make_proposta_router(
    model=m.PropostasComerciaisServicosSst,
    create_schema=s.PropostaServicosSstIn,
    update_schema=s.PropostaServicosSstUpdateIn,
    read_schema=s.PropostaServicosSstOut,
    prefix="/propostas/servicos-sst",
    tag="propostas-servicos-sst",
))

router.include_router(_make_proposta_router(
    model=m.PropostasComerciaisVertical365,
    create_schema=s.PropostaVertical365In,
    update_schema=s.PropostaVertical365UpdateIn,
    read_schema=s.PropostaVertical365Out,
    prefix="/propostas/vertical365",
    tag="propostas-vertical365",
))


# ═══════════════════════════════════════════════════════════════════════════════
# Atividades unificadas (VIEW — somente leitura, filtrada por empresa_id)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/atividades-unificadas", response_model=list[s.AtividadeUnificadaOut])
async def listar_atividades_unificadas(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    t = m.t_atividades_unificadas
    result = await db.execute(select(t).where(t.c.empresa_id == empresa_id))
    return [dict(row._mapping) for row in result]
