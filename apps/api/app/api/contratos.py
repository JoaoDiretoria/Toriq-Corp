"""Contratos — CRUD de contratos, modelos de contrato, cláusulas e módulos.

Estrutura:
  /contratos              — tenant-scoped via empresa_id (TenantRepository)
  /contratos/{id}/clausulas  — filho escoped via contrato (JOIN → empresa_id)
  /contratos/{id}/modulos    — idem
  /modelos                — tenant-scoped (TenantRepository)
  /modelos/{id}/clausulas    — filho escoped via modelo (JOIN → empresa_id)
  /modelos/{id}/modulos      — idem
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import contratos as s
from app.services.contratos import proximo_numero_contrato

router = APIRouter(tags=["contratos"])


# ── Repositórios tenant-scoped ────────────────────────────────────────────────

class _ContratoRepo(TenantRepository):
    model = m.Contratos


class _ModeloRepo(TenantRepository):
    model = m.ModelosContrato


def _get_contrato_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ContratoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ContratoRepo(db, user.empresa_id)


def _get_modelo_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ModeloRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ModeloRepo(db, user.empresa_id)


# ── Helpers: verificar que contrato/modelo pertence à empresa ─────────────────

async def _get_contrato_scoped(
    contrato_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.Contratos:
    """Retorna contrato garantindo que pertence à empresa autenticada."""
    result = await db.scalar(
        select(m.Contratos).where(
            m.Contratos.id == contrato_id,
            m.Contratos.empresa_id == empresa_id,
        )
    )
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contrato não encontrado")
    return result


async def _get_modelo_scoped(
    modelo_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.ModelosContrato:
    """Retorna modelo garantindo que pertence à empresa autenticada."""
    result = await db.scalar(
        select(m.ModelosContrato).where(
            m.ModelosContrato.id == modelo_id,
            m.ModelosContrato.empresa_id == empresa_id,
        )
    )
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo não encontrado")
    return result


# ── Contratos ─────────────────────────────────────────────────────────────────

@router.get("/contratos", response_model=list[s.ContratoOut])
async def listar_contratos(repo: _ContratoRepo = Depends(_get_contrato_repo)):
    return await repo.list()


@router.post("/contratos", response_model=s.ContratoOut, status_code=status.HTTP_201_CREATED)
async def criar_contrato(
    payload: s.ContratoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    # Gera o número dentro da mesma transação (atomicidade)
    numero = await proximo_numero_contrato(db, user.empresa_id)
    data = payload.model_dump(exclude_unset=True)
    # status default 'rascunho' se não informado (server_default no DB)
    contrato = m.Contratos(
        id=uuid.uuid4(),
        empresa_id=user.empresa_id,
        numero=numero,
        **data,
    )
    db.add(contrato)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.get("/contratos/{contrato_id}", response_model=s.ContratoOut)
async def obter_contrato(
    contrato_id: uuid.UUID,
    repo: _ContratoRepo = Depends(_get_contrato_repo),
):
    obj = await repo.get(contrato_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contrato não encontrado")
    return obj


@router.put("/contratos/{contrato_id}", response_model=s.ContratoOut)
async def atualizar_contrato(
    contrato_id: uuid.UUID,
    payload: s.ContratoUpdate,
    repo: _ContratoRepo = Depends(_get_contrato_repo),
):
    obj = await repo.update(contrato_id, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contrato não encontrado")
    return obj


@router.delete("/contratos/{contrato_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_contrato(
    contrato_id: uuid.UUID,
    repo: _ContratoRepo = Depends(_get_contrato_repo),
):
    if not await repo.delete(contrato_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contrato não encontrado")


# ── Modelos de Contrato ───────────────────────────────────────────────────────

@router.get("/modelos", response_model=list[s.ModeloContratoOut])
async def listar_modelos(repo: _ModeloRepo = Depends(_get_modelo_repo)):
    return await repo.list()


@router.post("/modelos", response_model=s.ModeloContratoOut, status_code=status.HTTP_201_CREATED)
async def criar_modelo(
    payload: s.ModeloContratoIn,
    repo: _ModeloRepo = Depends(_get_modelo_repo),
):
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.get("/modelos/{modelo_id}", response_model=s.ModeloContratoOut)
async def obter_modelo(
    modelo_id: uuid.UUID,
    repo: _ModeloRepo = Depends(_get_modelo_repo),
):
    obj = await repo.get(modelo_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo não encontrado")
    return obj


@router.put("/modelos/{modelo_id}", response_model=s.ModeloContratoOut)
async def atualizar_modelo(
    modelo_id: uuid.UUID,
    payload: s.ModeloContratoUpdate,
    repo: _ModeloRepo = Depends(_get_modelo_repo),
):
    obj = await repo.update(modelo_id, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo não encontrado")
    return obj


@router.delete("/modelos/{modelo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_modelo(
    modelo_id: uuid.UUID,
    repo: _ModeloRepo = Depends(_get_modelo_repo),
):
    if not await repo.delete(modelo_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "modelo não encontrado")


# ── Cláusulas de Contrato ─────────────────────────────────────────────────────

@router.get(
    "/contratos/{contrato_id}/clausulas",
    response_model=list[s.ContratoClausulaOut],
)
async def listar_clausulas_contrato(
    contrato_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.ContratoClausulas).where(
            m.ContratoClausulas.contrato_id == contrato_id
        )
    )
    return list(result)


@router.post(
    "/contratos/{contrato_id}/clausulas",
    response_model=s.ContratoClausulaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_clausula_contrato(
    contrato_id: uuid.UUID,
    payload: s.ContratoClausulaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    clausula = m.ContratoClausulas(
        id=uuid.uuid4(),
        contrato_id=contrato_id,
        **payload.model_dump(),
    )
    db.add(clausula)
    await db.commit()
    await db.refresh(clausula)
    return clausula


@router.put(
    "/contratos/{contrato_id}/clausulas/{clausula_id}",
    response_model=s.ContratoClausulaOut,
)
async def atualizar_clausula_contrato(
    contrato_id: uuid.UUID,
    clausula_id: uuid.UUID,
    payload: s.ContratoClausulaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    clausula = await db.scalar(
        select(m.ContratoClausulas).where(
            m.ContratoClausulas.id == clausula_id,
            m.ContratoClausulas.contrato_id == contrato_id,
        )
    )
    if clausula is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cláusula não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(clausula, k, v)
    await db.commit()
    await db.refresh(clausula)
    return clausula


@router.delete(
    "/contratos/{contrato_id}/clausulas/{clausula_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_clausula_contrato(
    contrato_id: uuid.UUID,
    clausula_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    clausula = await db.scalar(
        select(m.ContratoClausulas).where(
            m.ContratoClausulas.id == clausula_id,
            m.ContratoClausulas.contrato_id == contrato_id,
        )
    )
    if clausula is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cláusula não encontrada")
    await db.delete(clausula)
    await db.commit()


# ── Módulos de Contrato ───────────────────────────────────────────────────────

@router.get(
    "/contratos/{contrato_id}/modulos",
    response_model=list[s.ContratoModuloOut],
)
async def listar_modulos_contrato(
    contrato_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.ContratoModulos).where(
            m.ContratoModulos.contrato_id == contrato_id
        )
    )
    return list(result)


@router.post(
    "/contratos/{contrato_id}/modulos",
    response_model=s.ContratoModuloOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_modulo_contrato(
    contrato_id: uuid.UUID,
    payload: s.ContratoModuloIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    modulo = m.ContratoModulos(
        id=uuid.uuid4(),
        contrato_id=contrato_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(modulo)
    await db.commit()
    await db.refresh(modulo)
    return modulo


@router.put(
    "/contratos/{contrato_id}/modulos/{modulo_id}",
    response_model=s.ContratoModuloOut,
)
async def atualizar_modulo_contrato(
    contrato_id: uuid.UUID,
    modulo_id: uuid.UUID,
    payload: s.ContratoModuloUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    modulo = await db.scalar(
        select(m.ContratoModulos).where(
            m.ContratoModulos.id == modulo_id,
            m.ContratoModulos.contrato_id == contrato_id,
        )
    )
    if modulo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(modulo, k, v)
    await db.commit()
    await db.refresh(modulo)
    return modulo


@router.delete(
    "/contratos/{contrato_id}/modulos/{modulo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_modulo_contrato(
    contrato_id: uuid.UUID,
    modulo_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_contrato_scoped(contrato_id, db, user.empresa_id)
    modulo = await db.scalar(
        select(m.ContratoModulos).where(
            m.ContratoModulos.id == modulo_id,
            m.ContratoModulos.contrato_id == contrato_id,
        )
    )
    if modulo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    await db.delete(modulo)
    await db.commit()


# ── Cláusulas de Modelo ───────────────────────────────────────────────────────

@router.get(
    "/modelos/{modelo_id}/clausulas",
    response_model=list[s.ModeloClausulaOut],
)
async def listar_clausulas_modelo(
    modelo_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.ModeloClausulas).where(
            m.ModeloClausulas.modelo_id == modelo_id
        )
    )
    return list(result)


@router.post(
    "/modelos/{modelo_id}/clausulas",
    response_model=s.ModeloClausulaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_clausula_modelo(
    modelo_id: uuid.UUID,
    payload: s.ModeloClausulaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    clausula = m.ModeloClausulas(
        id=uuid.uuid4(),
        modelo_id=modelo_id,
        **payload.model_dump(),
    )
    db.add(clausula)
    await db.commit()
    await db.refresh(clausula)
    return clausula


@router.put(
    "/modelos/{modelo_id}/clausulas/{clausula_id}",
    response_model=s.ModeloClausulaOut,
)
async def atualizar_clausula_modelo(
    modelo_id: uuid.UUID,
    clausula_id: uuid.UUID,
    payload: s.ModeloClausulaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    clausula = await db.scalar(
        select(m.ModeloClausulas).where(
            m.ModeloClausulas.id == clausula_id,
            m.ModeloClausulas.modelo_id == modelo_id,
        )
    )
    if clausula is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cláusula não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(clausula, k, v)
    await db.commit()
    await db.refresh(clausula)
    return clausula


@router.delete(
    "/modelos/{modelo_id}/clausulas/{clausula_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_clausula_modelo(
    modelo_id: uuid.UUID,
    clausula_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    clausula = await db.scalar(
        select(m.ModeloClausulas).where(
            m.ModeloClausulas.id == clausula_id,
            m.ModeloClausulas.modelo_id == modelo_id,
        )
    )
    if clausula is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cláusula não encontrada")
    await db.delete(clausula)
    await db.commit()


# ── Módulos de Modelo ─────────────────────────────────────────────────────────

@router.get(
    "/modelos/{modelo_id}/modulos",
    response_model=list[s.ModeloModuloOut],
)
async def listar_modulos_modelo(
    modelo_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    result = await db.scalars(
        select(m.ModeloModulos).where(
            m.ModeloModulos.modelo_id == modelo_id
        )
    )
    return list(result)


@router.post(
    "/modelos/{modelo_id}/modulos",
    response_model=s.ModeloModuloOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_modulo_modelo(
    modelo_id: uuid.UUID,
    payload: s.ModeloModuloIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    modulo = m.ModeloModulos(
        id=uuid.uuid4(),
        modelo_id=modelo_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(modulo)
    await db.commit()
    await db.refresh(modulo)
    return modulo


@router.put(
    "/modelos/{modelo_id}/modulos/{modulo_id}",
    response_model=s.ModeloModuloOut,
)
async def atualizar_modulo_modelo(
    modelo_id: uuid.UUID,
    modulo_id: uuid.UUID,
    payload: s.ModeloModuloUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    modulo = await db.scalar(
        select(m.ModeloModulos).where(
            m.ModeloModulos.id == modulo_id,
            m.ModeloModulos.modelo_id == modelo_id,
        )
    )
    if modulo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(modulo, k, v)
    await db.commit()
    await db.refresh(modulo)
    return modulo


@router.delete(
    "/modelos/{modelo_id}/modulos/{modulo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_modulo_modelo(
    modelo_id: uuid.UUID,
    modulo_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_modelo_scoped(modelo_id, db, user.empresa_id)
    modulo = await db.scalar(
        select(m.ModeloModulos).where(
            m.ModeloModulos.id == modulo_id,
            m.ModeloModulos.modelo_id == modelo_id,
        )
    )
    if modulo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    await db.delete(modulo)
    await db.commit()
