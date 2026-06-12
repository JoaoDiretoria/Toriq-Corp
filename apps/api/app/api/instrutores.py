"""Treinamentos — instrutores, empresas parceiras, datas indisponíveis,
config de reconhecimento facial e anexos de card do funil.

Estratégias de tenant (variam por tabela):

- instrutores                    → tenant `empresa_id` (TenantRepository genérico
                                   via make_crud_router). No create validamos
                                   `empresa_parceira_id` contra o tenant
                                   (empresa_sst_id) antes de carimbar.
- empresas_parceiras             → tenant `empresa_sst_id` (NÃO empresa_id!).
                                   Router custom filtrando/carimbando
                                   `empresa_sst_id == user.empresa_id`
                                   (padrão clientes_sst em sst_cadastros.py).
- instrutor_datas_indisponiveis  → FILHA de instrutores; escopo via
                                   instrutor_id (path) → instrutores.empresa_id.
- reconhecimento_facial_config   → tenant `empresa_sst_id` (igual parceiras).
                                   UNIQUE(empresa_sst_id, cliente_empresa_id).
- funil_card_anexos              → FILHA de funil_cards; escopo via
                                   card_id (path) → funis.empresa_id (JOIN).

Segurança:
- Schemas de UPDATE não carregam FKs de tenant/parentesco.
- FKs do payload validadas contra o tenant no create.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models import treinamentos as t
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import instrutores as s


def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ══════════════════════════════════════════════════════════════════════════════
# Instrutores — tenant empresa_id (router custom) + validação empresa_parceira_id
# ══════════════════════════════════════════════════════════════════════════════
# Router custom (não a factory direta) porque o POST precisa validar
# `empresa_parceira_id` contra o tenant ANTES de carimbar. As rotas filhas
# (/{instrutor_id}/datas) são declaradas mais abaixo neste mesmo router; o
# segmento literal "/datas" evita colisão com /{id_}.

instrutores_router = APIRouter(
    prefix="/treinamentos/instrutores", tags=["treinamentos-instrutores"]
)


class _InstrutorRepo(TenantRepository):
    model = t.Instrutores


def _get_instrutor_repo(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
) -> _InstrutorRepo:
    return _InstrutorRepo(db, empresa_id)


@instrutores_router.get("", response_model=list[s.InstrutorOut])
async def listar_instrutores(repo: _InstrutorRepo = Depends(_get_instrutor_repo)):
    return await repo.list()


@instrutores_router.get("/{id_}", response_model=s.InstrutorOut)
async def obter_instrutor(
    id_: uuid.UUID, repo: _InstrutorRepo = Depends(_get_instrutor_repo)
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instrutor não encontrado")
    return obj


@instrutores_router.post(
    "",
    response_model=s.InstrutorOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_instrutor(
    payload: s.InstrutorIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    # Anti FK-injection: empresa_parceira_id deve pertencer ao tenant
    # (empresas_parceiras.empresa_sst_id == empresa_id).
    if payload.empresa_parceira_id is not None:
        parceira = await db.scalar(
            select(t.EmpresasParceiras.id).where(
                t.EmpresasParceiras.id == payload.empresa_parceira_id,
                t.EmpresasParceiras.empresa_sst_id == empresa_id,
            )
        )
        if parceira is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "empresa parceira não encontrada"
            )
    repo = _InstrutorRepo(db, empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@instrutores_router.put("/{id_}", response_model=s.InstrutorOut)
async def atualizar_instrutor(
    id_: uuid.UUID,
    payload: s.InstrutorUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    # Se o update tentar trocar empresa_parceira_id, valida contra o tenant.
    if payload.empresa_parceira_id is not None:
        parceira = await db.scalar(
            select(t.EmpresasParceiras.id).where(
                t.EmpresasParceiras.id == payload.empresa_parceira_id,
                t.EmpresasParceiras.empresa_sst_id == empresa_id,
            )
        )
        if parceira is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "empresa parceira não encontrada"
            )
    repo = _InstrutorRepo(db, empresa_id)
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instrutor não encontrado")
    return obj


@instrutores_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_instrutor(
    id_: uuid.UUID,
    repo: _InstrutorRepo = Depends(_get_instrutor_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instrutor não encontrado")


# ══════════════════════════════════════════════════════════════════════════════
# EmpresasParceiras — tenant empresa_sst_id (router custom)
# ══════════════════════════════════════════════════════════════════════════════
parceiras_router = APIRouter(
    prefix="/treinamentos/empresas-parceiras", tags=["treinamentos-empresas-parceiras"]
)


async def _get_parceira_scoped(
    parceira_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> t.EmpresasParceiras:
    obj = await db.scalar(
        select(t.EmpresasParceiras).where(
            t.EmpresasParceiras.id == parceira_id,
            t.EmpresasParceiras.empresa_sst_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa parceira não encontrada")
    return obj


@parceiras_router.get("", response_model=list[s.EmpresaParceiraOut])
async def listar_parceiras(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(t.EmpresasParceiras).where(
            t.EmpresasParceiras.empresa_sst_id == empresa_id
        )
    )
    return list(result)


@parceiras_router.get("/{id_}", response_model=s.EmpresaParceiraOut)
async def obter_parceira(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    return await _get_parceira_scoped(id_, db, empresa_id)


@parceiras_router.post(
    "", response_model=s.EmpresaParceiraOut, status_code=status.HTTP_201_CREATED
)
async def criar_parceira(
    payload: s.EmpresaParceiraIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = t.EmpresasParceiras(
        id=uuid.uuid4(),
        empresa_sst_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@parceiras_router.put("/{id_}", response_model=s.EmpresaParceiraOut)
async def atualizar_parceira(
    id_: uuid.UUID,
    payload: s.EmpresaParceiraUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_parceira_scoped(id_, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@parceiras_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_parceira(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_parceira_scoped(id_, db, empresa_id)
    await db.execute(
        sa_delete(t.EmpresasParceiras).where(
            t.EmpresasParceiras.id == id_,
            t.EmpresasParceiras.empresa_sst_id == empresa_id,
        )
    )
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# InstrutorDatasIndisponiveis — filha de instrutores (escopo via instrutor_id)
# ══════════════════════════════════════════════════════════════════════════════
# Registrado no MESMO router de instrutores para reaproveitar o prefixo;
# rotas filhas são declaradas após o POST de instrutor mas o FastAPI resolve
# por path completo — paths específicos (/{instrutor_id}/datas) não colidem
# com /{id_}.

async def _get_instrutor_scoped(
    instrutor_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> t.Instrutores:
    obj = await db.scalar(
        select(t.Instrutores).where(
            t.Instrutores.id == instrutor_id,
            t.Instrutores.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instrutor não encontrado")
    return obj


@instrutores_router.get(
    "/{instrutor_id}/datas", response_model=list[s.DataIndisponivelOut]
)
async def listar_datas(
    instrutor_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_instrutor_scoped(instrutor_id, db, empresa_id)
    result = await db.scalars(
        select(t.InstrutorDatasIndisponiveis).where(
            t.InstrutorDatasIndisponiveis.instrutor_id == instrutor_id
        )
    )
    return list(result)


@instrutores_router.post(
    "/{instrutor_id}/datas",
    response_model=s.DataIndisponivelOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_data(
    instrutor_id: uuid.UUID,
    payload: s.DataIndisponivelIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_instrutor_scoped(instrutor_id, db, empresa_id)
    obj = t.InstrutorDatasIndisponiveis(
        id=uuid.uuid4(),
        instrutor_id=instrutor_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@instrutores_router.put(
    "/{instrutor_id}/datas/{data_id}", response_model=s.DataIndisponivelOut
)
async def atualizar_data(
    instrutor_id: uuid.UUID,
    data_id: uuid.UUID,
    payload: s.DataIndisponivelUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_instrutor_scoped(instrutor_id, db, empresa_id)
    obj = await db.scalar(
        select(t.InstrutorDatasIndisponiveis).where(
            t.InstrutorDatasIndisponiveis.id == data_id,
            t.InstrutorDatasIndisponiveis.instrutor_id == instrutor_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "data não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@instrutores_router.delete(
    "/{instrutor_id}/datas/{data_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remover_data(
    instrutor_id: uuid.UUID,
    data_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_instrutor_scoped(instrutor_id, db, empresa_id)
    obj = await db.scalar(
        select(t.InstrutorDatasIndisponiveis).where(
            t.InstrutorDatasIndisponiveis.id == data_id,
            t.InstrutorDatasIndisponiveis.instrutor_id == instrutor_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "data não encontrada")
    await db.delete(obj)
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# ReconhecimentoFacialConfig — tenant empresa_sst_id (router custom)
# ══════════════════════════════════════════════════════════════════════════════
recon_facial_router = APIRouter(
    prefix="/treinamentos/reconhecimento-facial-config",
    tags=["treinamentos-reconhecimento-facial"],
)


async def _get_recon_scoped(
    config_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> t.ReconhecimentoFacialConfig:
    obj = await db.scalar(
        select(t.ReconhecimentoFacialConfig).where(
            t.ReconhecimentoFacialConfig.id == config_id,
            t.ReconhecimentoFacialConfig.empresa_sst_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "config não encontrada")
    return obj


@recon_facial_router.get("", response_model=list[s.ReconhecimentoFacialConfigOut])
async def listar_recon(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(t.ReconhecimentoFacialConfig).where(
            t.ReconhecimentoFacialConfig.empresa_sst_id == empresa_id
        )
    )
    return list(result)


@recon_facial_router.get("/{id_}", response_model=s.ReconhecimentoFacialConfigOut)
async def obter_recon(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    return await _get_recon_scoped(id_, db, empresa_id)


@recon_facial_router.post(
    "",
    response_model=s.ReconhecimentoFacialConfigOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_recon(
    payload: s.ReconhecimentoFacialConfigIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = t.ReconhecimentoFacialConfig(
        id=uuid.uuid4(),
        empresa_sst_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@recon_facial_router.put("/{id_}", response_model=s.ReconhecimentoFacialConfigOut)
async def atualizar_recon(
    id_: uuid.UUID,
    payload: s.ReconhecimentoFacialConfigUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_recon_scoped(id_, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@recon_facial_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_recon(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_recon_scoped(id_, db, empresa_id)
    await db.execute(
        sa_delete(t.ReconhecimentoFacialConfig).where(
            t.ReconhecimentoFacialConfig.id == id_,
            t.ReconhecimentoFacialConfig.empresa_sst_id == empresa_id,
        )
    )
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# FunilCardAnexos — filha de funil_cards (escopo via card_id → funis.empresa_id)
# ══════════════════════════════════════════════════════════════════════════════
anexos_router = APIRouter(prefix="/funil/cards", tags=["funil-card-anexos"])


async def _get_card_scoped(
    card_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> m.FunilCards:
    obj = await db.scalar(
        select(m.FunilCards)
        .join(m.Funis, m.FunilCards.funil_id == m.Funis.id)
        .where(m.FunilCards.id == card_id, m.Funis.empresa_id == empresa_id)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card não encontrado")
    return obj


@anexos_router.get("/{card_id}/anexos", response_model=list[s.CardAnexoOut])
async def listar_anexos(
    card_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_card_scoped(card_id, db, empresa_id)
    result = await db.scalars(
        select(t.FunilCardAnexos).where(t.FunilCardAnexos.card_id == card_id)
    )
    return list(result)


@anexos_router.post(
    "/{card_id}/anexos",
    response_model=s.CardAnexoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_anexo(
    card_id: uuid.UUID,
    payload: s.CardAnexoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_card_scoped(card_id, db, empresa_id)
    obj = t.FunilCardAnexos(
        id=uuid.uuid4(),
        card_id=card_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@anexos_router.get("/{card_id}/anexos/{anexo_id}", response_model=s.CardAnexoOut)
async def obter_anexo(
    card_id: uuid.UUID,
    anexo_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(t.FunilCardAnexos).where(
            t.FunilCardAnexos.id == anexo_id,
            t.FunilCardAnexos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")
    return obj


@anexos_router.put("/{card_id}/anexos/{anexo_id}", response_model=s.CardAnexoOut)
async def atualizar_anexo(
    card_id: uuid.UUID,
    anexo_id: uuid.UUID,
    payload: s.CardAnexoUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(t.FunilCardAnexos).where(
            t.FunilCardAnexos.id == anexo_id,
            t.FunilCardAnexos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@anexos_router.delete(
    "/{card_id}/anexos/{anexo_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remover_anexo(
    card_id: uuid.UUID,
    anexo_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_card_scoped(card_id, db, empresa_id)
    obj = await db.scalar(
        select(t.FunilCardAnexos).where(
            t.FunilCardAnexos.id == anexo_id,
            t.FunilCardAnexos.card_id == card_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "anexo não encontrado")
    await db.delete(obj)
    await db.commit()
