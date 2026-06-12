"""Módulo de Produtos/Serviços (catálogo).

Tenant column: empresa_id em todas as tabelas de nível superior.
PacotesProdutosItens não tem empresa_id — escopo via pacote_id (parent).

Segurança:
- Todos os endpoints de escrita requerem usuário autenticado com empresa_id.
- FKs opcionais em ProdutosServicos (categoria_id, classificacao_id,
  natureza_id, tipo_id, tipo_servico_id, forma_cobranca_id) e
  PacotesProdutosItens.produto_id são validadas contra a empresa autenticada
  antes do INSERT (404 se não pertencer à empresa).
- Schemas de UPDATE excluem empresa_id e pacote_id (parentage/tenant FKs).
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import produtos as s

router = APIRouter(prefix="/produtos")

# ── Helper de autenticação ─────────────────────────────────────────────────────


def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ── CategoriasProdutos — tenant CRUD via factory ──────────────────────────────

router.include_router(make_crud_router(
    model=m.CategoriasProdutos,
    create_schema=s.CategoriaProdutoIn,
    update_schema=s.CategoriaProdutoIn,
    read_schema=s.CategoriaProdutoOut,
    prefix="/categorias",
    tags=["produtos-categorias"],
))

# ── ClassificacoesProdutos — tenant CRUD via factory ──────────────────────────

router.include_router(make_crud_router(
    model=m.ClassificacoesProdutos,
    create_schema=s.ClassificacaoProdutoIn,
    update_schema=s.ClassificacaoProdutoIn,
    read_schema=s.ClassificacaoProdutoOut,
    prefix="/classificacoes",
    tags=["produtos-classificacoes"],
))

# ── NaturezasProdutos — tenant CRUD via factory ───────────────────────────────

router.include_router(make_crud_router(
    model=m.NaturezasProdutos,
    create_schema=s.NaturezaProdutoIn,
    update_schema=s.NaturezaProdutoIn,
    read_schema=s.NaturezaProdutoOut,
    prefix="/naturezas",
    tags=["produtos-naturezas"],
))

# ── TiposProdutos — tenant CRUD via factory ───────────────────────────────────

router.include_router(make_crud_router(
    model=m.TiposProdutos,
    create_schema=s.TipoProdutoIn,
    update_schema=s.TipoProdutoIn,
    read_schema=s.TipoProdutoOut,
    prefix="/tipos",
    tags=["produtos-tipos"],
))

# ── TiposServico — tenant CRUD via factory ────────────────────────────────────

router.include_router(make_crud_router(
    model=m.TiposServico,
    create_schema=s.TipoServicoIn,
    update_schema=s.TipoServicoIn,
    read_schema=s.TipoServicoOut,
    prefix="/tipos-servico",
    tags=["produtos-tipos-servico"],
))

# ── Servicos — tenant CRUD via factory ────────────────────────────────────────

router.include_router(make_crud_router(
    model=m.Servicos,
    create_schema=s.ServicoIn,
    update_schema=s.ServicoUpdate,
    read_schema=s.ServicoOut,
    prefix="/servicos",
    tags=["produtos-servicos"],
))

# ── PlanosProdutos — tenant CRUD via factory ──────────────────────────────────

router.include_router(make_crud_router(
    model=m.PlanosProdutos,
    create_schema=s.PlanoProdutoIn,
    update_schema=s.PlanoProdutoIn,
    read_schema=s.PlanoProdutoOut,
    prefix="/planos",
    tags=["produtos-planos"],
))

# ── ProdutosServicos — tenant CRUD com validação de FK ───────────────────────
# As FKs opcionais (categoria_id, classificacao_id, natureza_id, tipo_id,
# tipo_servico_id, forma_cobranca_id) referem-se a tabelas tenant.
# Validamos que o registro referenciado pertence à mesma empresa antes do INSERT/UPDATE.

_ps_router = APIRouter(prefix="/catalogo", tags=["produtos-catalogo"])

# Mapeamento FK -> modelo para validação de tenant
_PS_FK_VALIDATORS: list[tuple[str, type]] = [
    ("categoria_id", m.CategoriasProdutos),
    ("classificacao_id", m.ClassificacoesProdutos),
    ("natureza_id", m.NaturezasProdutos),
    ("tipo_id", m.TiposProdutos),
    ("tipo_servico_id", m.TiposServico),
    ("forma_cobranca_id", m.FormasCobranca),
]


async def _validate_produto_servico_fks(
    payload_dict: dict,
    empresa_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Valida que todos os FKs opcionais em ProdutosServicos pertencem à empresa."""
    for field, model_cls in _PS_FK_VALIDATORS:
        fk_value: Optional[uuid.UUID] = payload_dict.get(field)
        if fk_value is None:
            continue
        exists = await db.scalar(
            select(model_cls.id).where(
                model_cls.id == fk_value,
                model_cls.empresa_id == empresa_id,
            )
        )
        if exists is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"{field} '{fk_value}' não encontrado para esta empresa",
            )


@_ps_router.get("", response_model=list[s.ProdutoServicoOut])
async def listar_produtos_servicos(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.ProdutosServicos).where(m.ProdutosServicos.empresa_id == empresa_id)
    )
    return list(result)


@_ps_router.get("/{id_}", response_model=s.ProdutoServicoOut)
async def obter_produto_servico(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.ProdutosServicos).where(
            m.ProdutosServicos.id == id_,
            m.ProdutosServicos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "produto/serviço não encontrado")
    return obj


@_ps_router.post("", response_model=s.ProdutoServicoOut, status_code=status.HTTP_201_CREATED)
async def criar_produto_servico(
    payload: s.ProdutoServicoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    await _validate_produto_servico_fks(data, empresa_id, db)
    obj = m.ProdutosServicos(id=uuid.uuid4(), empresa_id=empresa_id, **data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_ps_router.put("/{id_}", response_model=s.ProdutoServicoOut)
async def atualizar_produto_servico(
    id_: uuid.UUID,
    payload: s.ProdutoServicoUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.ProdutosServicos).where(
            m.ProdutosServicos.id == id_,
            m.ProdutosServicos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "produto/serviço não encontrado")
    data = payload.model_dump(exclude_unset=True)
    await _validate_produto_servico_fks(data, empresa_id, db)
    for k, v in data.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_ps_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_produto_servico(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.ProdutosServicos).where(
            m.ProdutosServicos.id == id_,
            m.ProdutosServicos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "produto/serviço não encontrado")
    await db.delete(obj)
    await db.commit()


router.include_router(_ps_router)

# ── PacotesProdutos + PacotesProdutosItens (child) ────────────────────────────

_pacotes_router = APIRouter(prefix="/pacotes", tags=["produtos-pacotes"])


async def _get_pacote_scoped(
    pacote_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.PacotesProdutos:
    """Retorna o pacote garantindo que pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.PacotesProdutos).where(
            m.PacotesProdutos.id == pacote_id,
            m.PacotesProdutos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "pacote não encontrado")
    return obj


@_pacotes_router.get("", response_model=list[s.PacoteProdutoOut])
async def listar_pacotes(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.PacotesProdutos).where(m.PacotesProdutos.empresa_id == empresa_id)
    )
    return list(result)


@_pacotes_router.get("/{id_}", response_model=s.PacoteProdutoOut)
async def obter_pacote(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    return await _get_pacote_scoped(id_, db, empresa_id)


@_pacotes_router.post("", response_model=s.PacoteProdutoOut, status_code=status.HTTP_201_CREATED)
async def criar_pacote(
    payload: s.PacoteProdutoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = m.PacotesProdutos(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_pacotes_router.put("/{id_}", response_model=s.PacoteProdutoOut)
async def atualizar_pacote(
    id_: uuid.UUID,
    payload: s.PacoteProdutoUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_pacote_scoped(id_, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_pacotes_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_pacote(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_pacote_scoped(id_, db, empresa_id)
    await db.delete(obj)
    await db.commit()


# ── Itens do Pacote (child, sem empresa_id) ───────────────────────────────────

@_pacotes_router.get("/{pacote_id}/itens", response_model=list[s.PacoteItemOut])
async def listar_itens(
    pacote_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_pacote_scoped(pacote_id, db, empresa_id)
    result = await db.scalars(
        select(m.PacotesProdutosItens).where(
            m.PacotesProdutosItens.pacote_id == pacote_id
        )
    )
    return list(result)


@_pacotes_router.post(
    "/{pacote_id}/itens",
    response_model=s.PacoteItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def adicionar_item(
    pacote_id: uuid.UUID,
    payload: s.PacoteItemIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    # Valida que o pacote pertence à empresa
    await _get_pacote_scoped(pacote_id, db, empresa_id)
    # Valida que o produto pertence à mesma empresa (anti FK-injection)
    produto_exists = await db.scalar(
        select(m.ProdutosServicos.id).where(
            m.ProdutosServicos.id == payload.produto_id,
            m.ProdutosServicos.empresa_id == empresa_id,
        )
    )
    if produto_exists is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"produto_id '{payload.produto_id}' não encontrado para esta empresa",
        )
    obj = m.PacotesProdutosItens(
        id=uuid.uuid4(),
        pacote_id=pacote_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_pacotes_router.put(
    "/{pacote_id}/itens/{item_id}",
    response_model=s.PacoteItemOut,
)
async def atualizar_item(
    pacote_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: s.PacoteItemUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_pacote_scoped(pacote_id, db, empresa_id)
    item = await db.scalar(
        select(m.PacotesProdutosItens).where(
            m.PacotesProdutosItens.id == item_id,
            m.PacotesProdutosItens.pacote_id == pacote_id,
        )
    )
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@_pacotes_router.delete(
    "/{pacote_id}/itens/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_item(
    pacote_id: uuid.UUID,
    item_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_pacote_scoped(pacote_id, db, empresa_id)
    item = await db.scalar(
        select(m.PacotesProdutosItens).where(
            m.PacotesProdutosItens.id == item_id,
            m.PacotesProdutosItens.pacote_id == pacote_id,
        )
    )
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")
    await db.delete(item)
    await db.commit()


router.include_router(_pacotes_router)
