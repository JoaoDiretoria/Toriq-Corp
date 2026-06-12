"""Pesquisas de Opinião — CRUD de pesquisas, opções e votação.

Tenant model: PesquisasOpiniao é GLOBAL (sem empresa_id), igual ao Blog.
Access control é por role, não por tenant isolation:

  Table              | Access mode
  -------------------|------------------------------------------------------
  pesquisas_opiniao  | GET público; POST/PUT/DELETE → admin_vertical
  pesquisas_opcoes   | GET público (escopado via pesquisa_id);
                     | POST/PUT/DELETE → admin_vertical
  pesquisas_votos    | POST público (qualquer autenticado);
                     | GET resultados → público

Votação valida que o opcao_id pertence à pesquisa do path (prevenção de
cross-pesquisa injection). Deduplicação via session_id é imposta pelo
constraint UNIQUE(pesquisa_id, session_id) no DB em produção.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import pesquisas as s

router = APIRouter(prefix="/pesquisas", tags=["pesquisas"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))


# ── helpers ────────────────────────────────────────────────────────────────────

async def _get_pesquisa_or_404(db: AsyncSession, pesquisa_id: uuid.UUID) -> m.PesquisasOpiniao:
    obj = await db.scalar(select(m.PesquisasOpiniao).where(m.PesquisasOpiniao.id == pesquisa_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "pesquisa não encontrada")
    return obj


async def _get_opcao_or_404(
    db: AsyncSession,
    pesquisa_id: uuid.UUID,
    opcao_id: uuid.UUID,
) -> m.PesquisasOpcoes:
    obj = await db.scalar(
        select(m.PesquisasOpcoes).where(
            m.PesquisasOpcoes.id == opcao_id,
            m.PesquisasOpcoes.pesquisa_id == pesquisa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "opção não encontrada")
    return obj


# ── PesquisasOpiniao ───────────────────────────────────────────────────────────

@router.get("", response_model=list[s.PesquisaOut])
async def listar_pesquisas(db: AsyncSession = Depends(get_db)):
    """Lista todas as pesquisas — acesso público."""
    result = await db.scalars(select(m.PesquisasOpiniao))
    return list(result)


@router.get("/{pesquisa_id}", response_model=s.PesquisaOut)
async def obter_pesquisa(pesquisa_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_pesquisa_or_404(db, pesquisa_id)


@router.post("", response_model=s.PesquisaOut, status_code=status.HTTP_201_CREATED)
async def criar_pesquisa(
    payload: s.PesquisaIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.PesquisasOpiniao(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{pesquisa_id}", response_model=s.PesquisaOut)
async def atualizar_pesquisa(
    pesquisa_id: uuid.UUID,
    payload: s.PesquisaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_pesquisa_or_404(db, pesquisa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{pesquisa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_pesquisa(
    pesquisa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_pesquisa_or_404(db, pesquisa_id)
    await db.delete(obj)
    await db.commit()


# ── PesquisasOpcoes ────────────────────────────────────────────────────────────

@router.get("/{pesquisa_id}/opcoes", response_model=list[s.OpcaoOut])
async def listar_opcoes(pesquisa_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_pesquisa_or_404(db, pesquisa_id)
    result = await db.scalars(
        select(m.PesquisasOpcoes)
        .where(m.PesquisasOpcoes.pesquisa_id == pesquisa_id)
        .order_by(m.PesquisasOpcoes.ordem)
    )
    return list(result)


@router.post(
    "/{pesquisa_id}/opcoes",
    response_model=s.OpcaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_opcao(
    pesquisa_id: uuid.UUID,
    payload: s.OpcaoIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    await _get_pesquisa_or_404(db, pesquisa_id)
    obj = m.PesquisasOpcoes(
        id=uuid.uuid4(),
        pesquisa_id=pesquisa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/{pesquisa_id}/opcoes/{opcao_id}", response_model=s.OpcaoOut)
async def atualizar_opcao(
    pesquisa_id: uuid.UUID,
    opcao_id: uuid.UUID,
    payload: s.OpcaoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_opcao_or_404(db, pesquisa_id, opcao_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{pesquisa_id}/opcoes/{opcao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_opcao(
    pesquisa_id: uuid.UUID,
    opcao_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_opcao_or_404(db, pesquisa_id, opcao_id)
    await db.delete(obj)
    await db.commit()


# ── Votação ────────────────────────────────────────────────────────────────────

@router.post(
    "/{pesquisa_id}/votar",
    response_model=s.VotoOut,
    status_code=status.HTTP_201_CREATED,
)
async def votar(
    pesquisa_id: uuid.UUID,
    payload: s.VotoIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Registra um voto.

    Validações:
    - A pesquisa existe (404 se não).
    - opcao_id pertence à pesquisa informada (404 cross-pesquisa injection).
    - Deduplicação via session_id é imposta pelo constraint UNIQUE no DB.
    """
    pesquisa = await _get_pesquisa_or_404(db, pesquisa_id)
    opcao = await _get_opcao_or_404(db, pesquisa_id, payload.opcao_id)

    voto = m.PesquisasVotos(
        id=uuid.uuid4(),
        pesquisa_id=pesquisa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(voto)

    # Incrementa contadores desnormalizados
    opcao.votos = (opcao.votos or 0) + 1
    pesquisa.total_votos = (pesquisa.total_votos or 0) + 1

    await db.commit()
    await db.refresh(voto)
    return voto


# ── Resultados ─────────────────────────────────────────────────────────────────

@router.get("/{pesquisa_id}/resultados", response_model=s.ResultadoPesquisa)
async def resultados_pesquisa(
    pesquisa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retorna a pesquisa com suas opções e contagem de votos por opção."""
    pesquisa = await _get_pesquisa_or_404(db, pesquisa_id)

    opcoes_result = await db.scalars(
        select(m.PesquisasOpcoes)
        .where(m.PesquisasOpcoes.pesquisa_id == pesquisa_id)
        .order_by(m.PesquisasOpcoes.ordem)
    )
    opcoes = list(opcoes_result)
    total = sum(op.votos or 0 for op in opcoes)

    return s.ResultadoPesquisa(
        pesquisa=s.PesquisaOut.model_validate(pesquisa),
        opcoes=[s.ResultadoOpcao.model_validate(op) for op in opcoes],
        total_votos=total,
    )
