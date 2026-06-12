"""Frota (fleet) module — veículos, motoristas e sub-recursos de veículos.

Security rules enforced:
- All repositories filter by empresa_id (tenant isolation).
- On create of child resources (manutencoes, checklists, custos, documentos,
  ocorrencias, utilizacoes) the veiculo_id in the payload is validated to belong
  to the authenticated empresa (404 otherwise) — prevents FK-injection attacks.
- UPDATE schemas never include empresa_id or veiculo_id.
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
from app.repositories.base import TenantRepository
from app.schemas import frota as s

# ── Repositórios ──────────────────────────────────────────────────────────────


class _VeiculoRepo(TenantRepository):
    model = m.FrotaVeiculos


class _MotoristaRepo(TenantRepository):
    model = m.FrotaMotoristas


class _ManutencaoRepo(TenantRepository):
    model = m.FrotaManutencoes


class _ChecklistRepo(TenantRepository):
    model = m.FrotaChecklists


class _CustoRepo(TenantRepository):
    model = m.FrotaCustos


class _DocumentoRepo(TenantRepository):
    model = m.FrotaDocumentos


class _OcorrenciaRepo(TenantRepository):
    model = m.FrotaOcorrencias


class _UtilizacaoRepo(TenantRepository):
    model = m.FrotaUtilizacoes


# ── Dependency helpers ────────────────────────────────────────────────────────

def _get_veiculo_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _VeiculoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _VeiculoRepo(db, user.empresa_id)


def _get_motorista_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _MotoristaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _MotoristaRepo(db, user.empresa_id)


def _get_manutencao_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ManutencaoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ManutencaoRepo(db, user.empresa_id)


def _get_checklist_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _ChecklistRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ChecklistRepo(db, user.empresa_id)


def _get_custo_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _CustoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _CustoRepo(db, user.empresa_id)


def _get_documento_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _DocumentoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _DocumentoRepo(db, user.empresa_id)


def _get_ocorrencia_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _OcorrenciaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _OcorrenciaRepo(db, user.empresa_id)


def _get_utilizacao_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> _UtilizacaoRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _UtilizacaoRepo(db, user.empresa_id)


# ── Helper: verificar que veiculo pertence à empresa autenticada ──────────────

async def _get_veiculo_scoped(
    veiculo_id: uuid.UUID,
    db: AsyncSession,
    empresa_id: uuid.UUID,
) -> m.FrotaVeiculos:
    veiculo = await db.scalar(
        select(m.FrotaVeiculos).where(
            m.FrotaVeiculos.id == veiculo_id,
            m.FrotaVeiculos.empresa_id == empresa_id,
        )
    )
    if veiculo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "veículo não encontrado")
    return veiculo


# ── Router principal ──────────────────────────────────────────────────────────

router = APIRouter(prefix="/frota", tags=["frota"])


# ── Veículos ──────────────────────────────────────────────────────────────────

@router.get("/veiculos", response_model=list[s.VeiculoOut])
async def listar_veiculos(repo: _VeiculoRepo = Depends(_get_veiculo_repo)):
    return await repo.list()


@router.get("/veiculos/{veiculo_id}", response_model=s.VeiculoOut)
async def obter_veiculo(
    veiculo_id: uuid.UUID,
    repo: _VeiculoRepo = Depends(_get_veiculo_repo),
):
    obj = await repo.get(veiculo_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "veículo não encontrado")
    return obj


@router.post("/veiculos", response_model=s.VeiculoOut, status_code=status.HTTP_201_CREATED)
async def criar_veiculo(
    payload: s.VeiculoIn,
    repo: _VeiculoRepo = Depends(_get_veiculo_repo),
):
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/veiculos/{veiculo_id}", response_model=s.VeiculoOut)
async def atualizar_veiculo(
    veiculo_id: uuid.UUID,
    payload: s.VeiculoUpdate,
    repo: _VeiculoRepo = Depends(_get_veiculo_repo),
):
    obj = await repo.update(veiculo_id, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "veículo não encontrado")
    return obj


@router.delete("/veiculos/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_veiculo(
    veiculo_id: uuid.UUID,
    repo: _VeiculoRepo = Depends(_get_veiculo_repo),
):
    if not await repo.delete(veiculo_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "veículo não encontrado")


# ── Motoristas ────────────────────────────────────────────────────────────────

@router.get("/motoristas", response_model=list[s.MotoristaOut])
async def listar_motoristas(repo: _MotoristaRepo = Depends(_get_motorista_repo)):
    return await repo.list()


@router.get("/motoristas/{motorista_id}", response_model=s.MotoristaOut)
async def obter_motorista(
    motorista_id: uuid.UUID,
    repo: _MotoristaRepo = Depends(_get_motorista_repo),
):
    obj = await repo.get(motorista_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "motorista não encontrado")
    return obj


@router.post("/motoristas", response_model=s.MotoristaOut, status_code=status.HTTP_201_CREATED)
async def criar_motorista(
    payload: s.MotoristaIn,
    repo: _MotoristaRepo = Depends(_get_motorista_repo),
):
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/motoristas/{motorista_id}", response_model=s.MotoristaOut)
async def atualizar_motorista(
    motorista_id: uuid.UUID,
    payload: s.MotoristaUpdate,
    repo: _MotoristaRepo = Depends(_get_motorista_repo),
):
    obj = await repo.update(motorista_id, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "motorista não encontrado")
    return obj


@router.delete("/motoristas/{motorista_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_motorista(
    motorista_id: uuid.UUID,
    repo: _MotoristaRepo = Depends(_get_motorista_repo),
):
    if not await repo.delete(motorista_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "motorista não encontrado")


# ── Manutenções ───────────────────────────────────────────────────────────────

@router.get("/manutencoes", response_model=list[s.ManutencaoOut])
async def listar_manutencoes(repo: _ManutencaoRepo = Depends(_get_manutencao_repo)):
    return await repo.list()


@router.get("/manutencoes/{id_}", response_model=s.ManutencaoOut)
async def obter_manutencao(
    id_: uuid.UUID,
    repo: _ManutencaoRepo = Depends(_get_manutencao_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "manutenção não encontrada")
    return obj


@router.post("/manutencoes", response_model=s.ManutencaoOut, status_code=status.HTTP_201_CREATED)
async def criar_manutencao(
    payload: s.ManutencaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _ManutencaoRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/manutencoes/{id_}", response_model=s.ManutencaoOut)
async def atualizar_manutencao(
    id_: uuid.UUID,
    payload: s.ManutencaoUpdate,
    repo: _ManutencaoRepo = Depends(_get_manutencao_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "manutenção não encontrada")
    return obj


@router.delete("/manutencoes/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_manutencao(
    id_: uuid.UUID,
    repo: _ManutencaoRepo = Depends(_get_manutencao_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "manutenção não encontrada")


# ── Checklists ────────────────────────────────────────────────────────────────

@router.get("/checklists", response_model=list[s.ChecklistOut])
async def listar_checklists(repo: _ChecklistRepo = Depends(_get_checklist_repo)):
    return await repo.list()


@router.get("/checklists/{id_}", response_model=s.ChecklistOut)
async def obter_checklist(
    id_: uuid.UUID,
    repo: _ChecklistRepo = Depends(_get_checklist_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "checklist não encontrado")
    return obj


@router.post("/checklists", response_model=s.ChecklistOut, status_code=status.HTTP_201_CREATED)
async def criar_checklist(
    payload: s.ChecklistIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _ChecklistRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/checklists/{id_}", response_model=s.ChecklistOut)
async def atualizar_checklist(
    id_: uuid.UUID,
    payload: s.ChecklistUpdate,
    repo: _ChecklistRepo = Depends(_get_checklist_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "checklist não encontrado")
    return obj


@router.delete("/checklists/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_checklist(
    id_: uuid.UUID,
    repo: _ChecklistRepo = Depends(_get_checklist_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "checklist não encontrado")


# ── Custos ────────────────────────────────────────────────────────────────────

@router.get("/custos", response_model=list[s.CustoOut])
async def listar_custos(repo: _CustoRepo = Depends(_get_custo_repo)):
    return await repo.list()


@router.get("/custos/{id_}", response_model=s.CustoOut)
async def obter_custo(
    id_: uuid.UUID,
    repo: _CustoRepo = Depends(_get_custo_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "custo não encontrado")
    return obj


@router.post("/custos", response_model=s.CustoOut, status_code=status.HTTP_201_CREATED)
async def criar_custo(
    payload: s.CustoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _CustoRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/custos/{id_}", response_model=s.CustoOut)
async def atualizar_custo(
    id_: uuid.UUID,
    payload: s.CustoUpdate,
    repo: _CustoRepo = Depends(_get_custo_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "custo não encontrado")
    return obj


@router.delete("/custos/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_custo(
    id_: uuid.UUID,
    repo: _CustoRepo = Depends(_get_custo_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "custo não encontrado")


# ── Documentos ────────────────────────────────────────────────────────────────

@router.get("/documentos", response_model=list[s.DocumentoOut])
async def listar_documentos(repo: _DocumentoRepo = Depends(_get_documento_repo)):
    return await repo.list()


@router.get("/documentos/{id_}", response_model=s.DocumentoOut)
async def obter_documento(
    id_: uuid.UUID,
    repo: _DocumentoRepo = Depends(_get_documento_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "documento não encontrado")
    return obj


@router.post("/documentos", response_model=s.DocumentoOut, status_code=status.HTTP_201_CREATED)
async def criar_documento(
    payload: s.DocumentoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _DocumentoRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/documentos/{id_}", response_model=s.DocumentoOut)
async def atualizar_documento(
    id_: uuid.UUID,
    payload: s.DocumentoUpdate,
    repo: _DocumentoRepo = Depends(_get_documento_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "documento não encontrado")
    return obj


@router.delete("/documentos/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_documento(
    id_: uuid.UUID,
    repo: _DocumentoRepo = Depends(_get_documento_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "documento não encontrado")


# ── Ocorrências ───────────────────────────────────────────────────────────────

@router.get("/ocorrencias", response_model=list[s.OcorrenciaOut])
async def listar_ocorrencias(repo: _OcorrenciaRepo = Depends(_get_ocorrencia_repo)):
    return await repo.list()


@router.get("/ocorrencias/{id_}", response_model=s.OcorrenciaOut)
async def obter_ocorrencia(
    id_: uuid.UUID,
    repo: _OcorrenciaRepo = Depends(_get_ocorrencia_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ocorrência não encontrada")
    return obj


@router.post("/ocorrencias", response_model=s.OcorrenciaOut, status_code=status.HTTP_201_CREATED)
async def criar_ocorrencia(
    payload: s.OcorrenciaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _OcorrenciaRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/ocorrencias/{id_}", response_model=s.OcorrenciaOut)
async def atualizar_ocorrencia(
    id_: uuid.UUID,
    payload: s.OcorrenciaUpdate,
    repo: _OcorrenciaRepo = Depends(_get_ocorrencia_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ocorrência não encontrada")
    return obj


@router.delete("/ocorrencias/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ocorrencia(
    id_: uuid.UUID,
    repo: _OcorrenciaRepo = Depends(_get_ocorrencia_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ocorrência não encontrada")


# ── Utilizações ───────────────────────────────────────────────────────────────

@router.get("/utilizacoes", response_model=list[s.UtilizacaoOut])
async def listar_utilizacoes(repo: _UtilizacaoRepo = Depends(_get_utilizacao_repo)):
    return await repo.list()


@router.get("/utilizacoes/{id_}", response_model=s.UtilizacaoOut)
async def obter_utilizacao(
    id_: uuid.UUID,
    repo: _UtilizacaoRepo = Depends(_get_utilizacao_repo),
):
    obj = await repo.get(id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "utilização não encontrada")
    return obj


@router.post("/utilizacoes", response_model=s.UtilizacaoOut, status_code=status.HTTP_201_CREATED)
async def criar_utilizacao(
    payload: s.UtilizacaoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    await _get_veiculo_scoped(payload.veiculo_id, db, user.empresa_id)
    repo = _UtilizacaoRepo(db, user.empresa_id)
    return await repo.add(**payload.model_dump(exclude_unset=True))


@router.put("/utilizacoes/{id_}", response_model=s.UtilizacaoOut)
async def atualizar_utilizacao(
    id_: uuid.UUID,
    payload: s.UtilizacaoUpdate,
    repo: _UtilizacaoRepo = Depends(_get_utilizacao_repo),
):
    obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "utilização não encontrada")
    return obj


@router.delete("/utilizacoes/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_utilizacao(
    id_: uuid.UUID,
    repo: _UtilizacaoRepo = Depends(_get_utilizacao_repo),
):
    if not await repo.delete(id_):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "utilização não encontrada")
