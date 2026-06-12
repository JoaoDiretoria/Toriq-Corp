"""SST — cadastros base: clientes, colaboradores, cargos, setores, riscos,
perigos, grupos-clientes, categorias-clientes (global/read-only).

Notas de segurança:
- ClientesSst usa `empresa_sst_id` como coluna de tenant (não `empresa_id`).
  Um repositório customizado (_ClienteSstRepo) mapeia esse campo.
- CategoriasClientes é uma tabela global (sem empresa_id) — exposta somente
  como GET (leitura), sem isolamento por tenant.
- Colaboradores.cargo / .setor são campos TEXT livres (não FKs para Cargos/
  Setores) — não há validação cross-tenant necessária.
- Endpoints filhos (contatos, unidades) derivam cliente_id do PATH; validam
  que o cliente pertence à empresa antes de qualquer operação.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import sst_cadastros as s

router = APIRouter(prefix="/sst")

# ── Cargos ─────────────────────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.Cargos,
    create_schema=s.CargoIn,
    update_schema=s.CargoUpdate,
    read_schema=s.CargoOut,
    prefix="/cargos",
    tags=["sst-cargos"],
))

# ── Setores ───────────────────────────────────────────────────────────────────
# Nota: a tabela setores já existia no sistema; reutilizamos o mesmo model.
router.include_router(make_crud_router(
    model=m.Setores,
    create_schema=s.SetorIn,
    update_schema=s.SetorUpdate,
    read_schema=s.SetorOut,
    prefix="/setores",
    tags=["sst-setores"],
))

# ── Riscos ────────────────────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.Riscos,
    create_schema=s.RiscoIn,
    update_schema=s.RiscoUpdate,
    read_schema=s.RiscoOut,
    prefix="/riscos",
    tags=["sst-riscos"],
))

# ── Perigos ───────────────────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.Perigos,
    create_schema=s.PerigoIn,
    update_schema=s.PerigoUpdate,
    read_schema=s.PerigoOut,
    prefix="/perigos",
    tags=["sst-perigos"],
))

# ── GruposClientes ────────────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.GruposClientes,
    create_schema=s.GrupoClienteIn,
    update_schema=s.GrupoClienteUpdate,
    read_schema=s.GrupoClienteOut,
    prefix="/grupos-clientes",
    tags=["sst-grupos-clientes"],
))

# ── Colaboradores ─────────────────────────────────────────────────────────────
router.include_router(make_crud_router(
    model=m.Colaboradores,
    create_schema=s.ColaboradorIn,
    update_schema=s.ColaboradorUpdate,
    read_schema=s.ColaboradorOut,
    prefix="/colaboradores",
    tags=["sst-colaboradores"],
))

# ── CategoriasClientes — global, somente leitura ──────────────────────────────
# Esta tabela NÃO possui empresa_id — é uma tabela de referência global.
# Exposta como GET-only; nenhum filtro de tenant é aplicado.

_cat_router = APIRouter(prefix="/categorias-clientes", tags=["sst-categorias-clientes"])


@_cat_router.get("", response_model=list[s.CategoriaClienteOut])
async def listar_categorias(db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(m.CategoriasClientes))
    return list(result)


@_cat_router.get("/{id_}", response_model=s.CategoriaClienteOut)
async def obter_categoria(id_: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await db.scalar(
        select(m.CategoriasClientes).where(m.CategoriasClientes.id == id_)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "categoria não encontrada")
    return obj


router.include_router(_cat_router)

# ── ClientesSst — repositório customizado (usa empresa_sst_id como tenant) ────
# A tabela clientes_sst usa `empresa_sst_id` em vez de `empresa_id`.
# Não podemos usar o TenantRepository genérico diretamente pois ele lê `.empresa_id`.
# Implementamos endpoints explícitos que aplicam o filtro correto.

_clientes_router = APIRouter(prefix="/clientes", tags=["sst-clientes"])


def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_cliente_scoped(
    cliente_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.ClientesSst:
    """Retorna o cliente SST garantindo que pertence à empresa autenticada."""
    obj = await db.scalar(
        select(m.ClientesSst).where(
            m.ClientesSst.id == cliente_id,
            m.ClientesSst.empresa_sst_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cliente não encontrado")
    return obj


@_clientes_router.get("", response_model=list[s.ClienteOut])
async def listar_clientes(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.ClientesSst).where(m.ClientesSst.empresa_sst_id == empresa_id)
    )
    return list(result)


@_clientes_router.get("/{id_}", response_model=s.ClienteOut)
async def obter_cliente(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    return await _get_cliente_scoped(id_, db, empresa_id)


@_clientes_router.post("", response_model=s.ClienteOut, status_code=status.HTTP_201_CREATED)
async def criar_cliente(
    payload: s.ClienteIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = m.ClientesSst(
        id=uuid.uuid4(),
        empresa_sst_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_clientes_router.put("/{id_}", response_model=s.ClienteOut)
async def atualizar_cliente(
    id_: uuid.UUID,
    payload: s.ClienteUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_cliente_scoped(id_, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_clientes_router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_cliente(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    # Verificar que o cliente existe e pertence à empresa
    await _get_cliente_scoped(id_, db, empresa_id)
    # Usar DELETE direto para evitar que o ORM carregue relações lazy inexistentes
    await db.execute(
        sa_delete(m.ClientesSst).where(
            m.ClientesSst.id == id_,
            m.ClientesSst.empresa_sst_id == empresa_id,
        )
    )
    await db.commit()


# ── Contatos do cliente (parent-scoped) ───────────────────────────────────────

@_clientes_router.get(
    "/{cliente_id}/contatos",
    response_model=list[s.ClienteContatoOut],
)
async def listar_contatos(
    cliente_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    result = await db.scalars(
        select(m.ClienteContatos).where(m.ClienteContatos.cliente_id == cliente_id)
    )
    return list(result)


@_clientes_router.post(
    "/{cliente_id}/contatos",
    response_model=s.ClienteContatoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_contato(
    cliente_id: uuid.UUID,
    payload: s.ClienteContatoIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    obj = m.ClienteContatos(
        id=uuid.uuid4(),
        cliente_id=cliente_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_clientes_router.put(
    "/{cliente_id}/contatos/{contato_id}",
    response_model=s.ClienteContatoOut,
)
async def atualizar_contato(
    cliente_id: uuid.UUID,
    contato_id: uuid.UUID,
    payload: s.ClienteContatoUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    contato = await db.scalar(
        select(m.ClienteContatos).where(
            m.ClienteContatos.id == contato_id,
            m.ClienteContatos.cliente_id == cliente_id,
        )
    )
    if contato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contato não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(contato, k, v)
    await db.commit()
    await db.refresh(contato)
    return contato


@_clientes_router.delete(
    "/{cliente_id}/contatos/{contato_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_contato(
    cliente_id: uuid.UUID,
    contato_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    contato = await db.scalar(
        select(m.ClienteContatos).where(
            m.ClienteContatos.id == contato_id,
            m.ClienteContatos.cliente_id == cliente_id,
        )
    )
    if contato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contato não encontrado")
    await db.delete(contato)
    await db.commit()


# ── Unidades do cliente (parent-scoped) ───────────────────────────────────────

@_clientes_router.get(
    "/{cliente_id}/unidades",
    response_model=list[s.UnidadeClienteOut],
)
async def listar_unidades(
    cliente_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    result = await db.scalars(
        select(m.UnidadesClientes).where(m.UnidadesClientes.cliente_id == cliente_id)
    )
    return list(result)


@_clientes_router.post(
    "/{cliente_id}/unidades",
    response_model=s.UnidadeClienteOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_unidade(
    cliente_id: uuid.UUID,
    payload: s.UnidadeClienteIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    obj = m.UnidadesClientes(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        cliente_id=cliente_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_clientes_router.put(
    "/{cliente_id}/unidades/{unidade_id}",
    response_model=s.UnidadeClienteOut,
)
async def atualizar_unidade(
    cliente_id: uuid.UUID,
    unidade_id: uuid.UUID,
    payload: s.UnidadeClienteUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    unidade = await db.scalar(
        select(m.UnidadesClientes).where(
            m.UnidadesClientes.id == unidade_id,
            m.UnidadesClientes.cliente_id == cliente_id,
            m.UnidadesClientes.empresa_id == empresa_id,
        )
    )
    if unidade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unidade não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(unidade, k, v)
    await db.commit()
    await db.refresh(unidade)
    return unidade


@_clientes_router.delete(
    "/{cliente_id}/unidades/{unidade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_unidade(
    cliente_id: uuid.UUID,
    unidade_id: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    await _get_cliente_scoped(cliente_id, db, empresa_id)
    # Verificar existência antes de deletar
    exists = await db.scalar(
        select(m.UnidadesClientes.id).where(
            m.UnidadesClientes.id == unidade_id,
            m.UnidadesClientes.cliente_id == cliente_id,
            m.UnidadesClientes.empresa_id == empresa_id,
        )
    )
    if exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unidade não encontrada")
    # Usar DELETE direto para evitar que o ORM carregue relações lazy inexistentes
    await db.execute(
        sa_delete(m.UnidadesClientes).where(
            m.UnidadesClientes.id == unidade_id,
            m.UnidadesClientes.cliente_id == cliente_id,
            m.UnidadesClientes.empresa_id == empresa_id,
        )
    )
    await db.commit()


router.include_router(_clientes_router)
