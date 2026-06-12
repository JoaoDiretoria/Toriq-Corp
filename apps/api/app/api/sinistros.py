"""Sinistros — tipos/colaborador/fotos, tenant-scoped via turma.

Segurança crítica (IDOR prevenido):
  sinistros_colaborador e sinistro_fotos NÃO possuem empresa_id própria.
  TODO acesso é escopado validando que a turma pertence à empresa do token:
    turma_id → turmas_treinamento.empresa_id == user.empresa_id

  Para cada operação que envolve sinistro ou foto, um helper busca o
  sinistro garantindo o join turma → empresa antes de retornar.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.treinamentos import TurmasTreinamento
from app.models.user import User
from app.schemas.sinistros import (
    SinistroColaboradorIn,
    SinistroColaboradorOut,
    SinistroColaboradorUpdate,
    SinistroFotoIn,
    SinistroFotoOut,
    TipoSinistroOut,
)

router = APIRouter(prefix="/sst", tags=["sst-sinistros"])


# ── Utilitários de tenant ─────────────────────────────────────────────────────

def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_turma_scoped(
    turma_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> TurmasTreinamento:
    """Retorna a turma garantindo que ela pertence à empresa autenticada.

    Levanta 404 se a turma não existir ou pertencer a outra empresa,
    impedindo IDOR via turma_id.
    """
    obj = await db.scalar(
        select(TurmasTreinamento).where(
            TurmasTreinamento.id == turma_id,
            TurmasTreinamento.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "turma não encontrada")
    return obj


async def _get_sinistro_scoped(
    sinistro_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.SinistrosColaborador:
    """Retorna o sinistro garantindo o chain sinistro → turma → empresa.

    O join com turmas_treinamento valida o tenant sem depender de empresa_id
    direto no sinistro (que não existe na tabela).
    """
    obj = await db.scalar(
        select(m.SinistrosColaborador)
        .join(
            TurmasTreinamento,
            TurmasTreinamento.id == m.SinistrosColaborador.turma_id,
        )
        .where(
            m.SinistrosColaborador.id == sinistro_id,
            TurmasTreinamento.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "sinistro não encontrado")
    return obj


async def _get_foto_scoped(
    foto_id: uuid.UUID,
    sinistro_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.SinistroFotos:
    """Retorna a foto garantindo o chain foto → sinistro → turma → empresa."""
    # Primeiro valida que o sinistro pertence à empresa
    await _get_sinistro_scoped(sinistro_id, db, empresa_id)

    foto = await db.scalar(
        select(m.SinistroFotos).where(
            m.SinistroFotos.id == foto_id,
            m.SinistroFotos.sinistro_id == sinistro_id,
        )
    )
    if foto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "foto não encontrada")
    return foto


# ── GET /sst/tipos-sinistro ───────────────────────────────────────────────────
# Tabela global (sem empresa_id). Exige autenticação mas não filtra por tenant.

@router.get(
    "/tipos-sinistro",
    response_model=list[TipoSinistroOut],
    tags=["sst-sinistros"],
)
async def listar_tipos_sinistro(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Lista todos os tipos de sinistro (tabela global, leitura apenas)."""
    result = await db.scalars(
        select(m.TiposSinistro)
        .where(m.TiposSinistro.ativo.is_(True))
        .order_by(m.TiposSinistro.ordem)
    )
    return list(result)


@router.get(
    "/tipos-sinistro/{tipo_id}",
    response_model=TipoSinistroOut,
    tags=["sst-sinistros"],
)
async def obter_tipo_sinistro(
    tipo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    obj = await db.scalar(
        select(m.TiposSinistro).where(m.TiposSinistro.id == tipo_id)
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tipo não encontrado")
    return obj


# ── GET /sst/turmas/{turma_id}/sinistros ──────────────────────────────────────

@router.get(
    "/turmas/{turma_id}/sinistros",
    response_model=list[SinistroColaboradorOut],
    tags=["sst-sinistros"],
)
async def listar_sinistros_turma(
    turma_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Lista sinistros de uma turma, validando que ela pertence à empresa do token."""
    await _get_turma_scoped(turma_id, db, empresa_id)
    result = await db.scalars(
        select(m.SinistrosColaborador).where(
            m.SinistrosColaborador.turma_id == turma_id
        )
    )
    return list(result)


# ── POST /sst/turmas/{turma_id}/sinistros ─────────────────────────────────────

@router.post(
    "/turmas/{turma_id}/sinistros",
    response_model=SinistroColaboradorOut,
    status_code=status.HTTP_201_CREATED,
    tags=["sst-sinistros"],
)
async def criar_sinistro(
    turma_id: uuid.UUID,
    payload: SinistroColaboradorIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Registra sinistro para um colaborador da turma.

    Valida turma → empresa antes de inserir. Carimba registrado_por=user.id.
    """
    await _get_turma_scoped(turma_id, db, empresa_id)

    obj = m.SinistrosColaborador(
        id=uuid.uuid4(),
        turma_id=turma_id,
        turma_colaborador_id=payload.turma_colaborador_id,
        tipo_sinistro_id=payload.tipo_sinistro_id,
        acao=payload.acao,
        descricao=payload.descricao,
        registrado_por=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── GET /sst/sinistros/{id} ───────────────────────────────────────────────────

@router.get(
    "/sinistros/{sinistro_id}",
    response_model=SinistroColaboradorOut,
    tags=["sst-sinistros"],
)
async def obter_sinistro(
    sinistro_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    return await _get_sinistro_scoped(sinistro_id, db, empresa_id)


# ── PUT /sst/sinistros/{id} ───────────────────────────────────────────────────

@router.put(
    "/sinistros/{sinistro_id}",
    response_model=SinistroColaboradorOut,
    tags=["sst-sinistros"],
)
async def atualizar_sinistro(
    sinistro_id: uuid.UUID,
    payload: SinistroColaboradorUpdate,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Atualiza sinistro validando chain sinistro → turma → empresa."""
    obj = await _get_sinistro_scoped(sinistro_id, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── DELETE /sst/sinistros/{id} ────────────────────────────────────────────────

@router.delete(
    "/sinistros/{sinistro_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["sst-sinistros"],
)
async def remover_sinistro(
    sinistro_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Remove sinistro e suas fotos (CASCADE no DB). Valida tenant antes."""
    await _get_sinistro_scoped(sinistro_id, db, empresa_id)
    await db.execute(
        sa_delete(m.SinistrosColaborador).where(
            m.SinistrosColaborador.id == sinistro_id
        )
    )
    await db.commit()


# ── GET /sst/sinistros/{sinistro_id}/fotos ────────────────────────────────────

@router.get(
    "/sinistros/{sinistro_id}/fotos",
    response_model=list[SinistroFotoOut],
    tags=["sst-sinistros"],
)
async def listar_fotos(
    sinistro_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Lista fotos de um sinistro validando sinistro → turma → empresa."""
    await _get_sinistro_scoped(sinistro_id, db, empresa_id)
    result = await db.scalars(
        select(m.SinistroFotos)
        .where(m.SinistroFotos.sinistro_id == sinistro_id)
        .order_by(m.SinistroFotos.ordem)
    )
    return list(result)


# ── POST /sst/sinistros/{sinistro_id}/fotos ───────────────────────────────────

@router.post(
    "/sinistros/{sinistro_id}/fotos",
    response_model=SinistroFotoOut,
    status_code=status.HTTP_201_CREATED,
    tags=["sst-sinistros"],
)
async def adicionar_foto(
    sinistro_id: uuid.UUID,
    payload: SinistroFotoIn,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Registra metadado de foto após upload no storage.

    O arquivo já foi enviado ao RustFS via /storage; este endpoint persiste
    a URL e os metadados na tabela sinistro_fotos.
    """
    await _get_sinistro_scoped(sinistro_id, db, empresa_id)

    foto = m.SinistroFotos(
        id=uuid.uuid4(),
        sinistro_id=sinistro_id,
        foto_url=payload.foto_url,
        descricao=payload.descricao,
        data_captura=payload.data_captura,
        ordem=payload.ordem,
    )
    db.add(foto)
    await db.commit()
    await db.refresh(foto)
    return foto


# ── DELETE /sst/sinistros/{sinistro_id}/fotos/{foto_id} ──────────────────────

@router.delete(
    "/sinistros/{sinistro_id}/fotos/{foto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["sst-sinistros"],
)
async def remover_foto(
    sinistro_id: uuid.UUID,
    foto_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    empresa_id: uuid.UUID = Depends(_require_empresa),
):
    """Remove foto validando foto → sinistro → turma → empresa."""
    await _get_foto_scoped(foto_id, sinistro_id, db, empresa_id)
    await db.execute(
        sa_delete(m.SinistroFotos).where(m.SinistroFotos.id == foto_id)
    )
    await db.commit()
