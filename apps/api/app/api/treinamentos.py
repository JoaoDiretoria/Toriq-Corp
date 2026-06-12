"""Router TREINAMENTOS.

Estratégia de tenant por tabela:

  /treinamentos/catalogo          → CatalogoTreinamentos (empresa_id) — make_crud_router
  /treinamentos/treinamentos      → Treinamentos         (empresa_id) — make_crud_router
  /treinamentos/turmas            → TurmasTreinamento    (empresa_id); o create valida
                                     cliente_id (→clientes_sst.empresa_sst_id),
                                     treinamento_id (→catalogo_treinamentos.empresa_id) e
                                     instrutor_id (→instrutores.empresa_id) contra o tenant.

  Tabelas-filhas (escopadas via pai, sem empresa_id no path):
  /treinamentos/turmas/{turma_id}/aulas               ← turma_id → turmas_treinamento.empresa_id
  /treinamentos/turmas/{turma_id}/colaboradores       ← turma_id; valida colaborador_id (tenant)
  /treinamentos/colaboradores/{colaborador_id}/treinamentos
                                                      ← colaborador_id → colaboradores.empresa_id;
                                                        valida treinamento_id (tenant)
  /treinamentos/colaboradores-treinamentos/{colaborador_treinamento_id}/datas
                                                      ← escope via colaboradores_treinamentos → colaboradores
  /treinamentos/colaboradores/{colaborador_id}/certificados
                                                      ← colaborador_id → colaboradores.empresa_id

O isolamento das filhas é garantido por JOIN até a tabela com empresa_id.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as gm
from app.models import treinamentos as tm
from app.models.user import User
from app.schemas import treinamentos as s

router = APIRouter(prefix="/treinamentos", tags=["treinamentos"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


async def _get_turma_scoped(
    turma_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> tm.TurmasTreinamento:
    """Retorna a turma garantindo que pertence ao tenant autenticado."""
    obj = await db.scalar(
        select(tm.TurmasTreinamento).where(
            tm.TurmasTreinamento.id == turma_id,
            tm.TurmasTreinamento.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "turma não encontrada")
    return obj


async def _get_colaborador_scoped(
    colaborador_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> gm.Colaboradores:
    """Retorna o colaborador garantindo que pertence ao tenant autenticado."""
    obj = await db.scalar(
        select(gm.Colaboradores).where(
            gm.Colaboradores.id == colaborador_id,
            gm.Colaboradores.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "colaborador não encontrado")
    return obj


async def _get_colab_treino_scoped(
    colaborador_treinamento_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> tm.ColaboradoresTreinamentos:
    """Retorna o vínculo colaborador↔treinamento escopado via colaboradores.empresa_id."""
    obj = await db.scalar(
        select(tm.ColaboradoresTreinamentos)
        .join(
            gm.Colaboradores,
            tm.ColaboradoresTreinamentos.colaborador_id == gm.Colaboradores.id,
        )
        .where(
            tm.ColaboradoresTreinamentos.id == colaborador_treinamento_id,
            gm.Colaboradores.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")
    return obj


async def _validate_treinamento(
    treinamento_id: uuid.UUID, db: AsyncSession, empresa_id: uuid.UUID
) -> None:
    obj = await db.scalar(
        select(tm.CatalogoTreinamentos.id).where(
            tm.CatalogoTreinamentos.id == treinamento_id,
            tm.CatalogoTreinamentos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "treinamento_id não encontrado ou não pertence a esta empresa",
        )


# ══════════════════════════════════════════════════════════════════════════════
# Tabelas-filhas e rotas específicas — REGISTRADAS ANTES dos crud_routers /{id_}
# (rotas mais específicas devem ser declaradas antes das genéricas com path param)
# ══════════════════════════════════════════════════════════════════════════════

# ── Turmas — CRUD com validação de FKs no create ──────────────────────────────

@router.get("/turmas", response_model=list[s.TurmaTreinamentoOut])
async def listar_turmas(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(tm.TurmasTreinamento).where(
            tm.TurmasTreinamento.empresa_id == empresa_id
        )
    )
    return list(result)


@router.post(
    "/turmas",
    response_model=s.TurmaTreinamentoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_turma(
    payload: s.TurmaTreinamentoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)

    # Valida FKs contra o tenant do usuário.
    cliente = await db.scalar(
        select(gm.ClientesSst.id).where(
            gm.ClientesSst.id == payload.cliente_id,
            gm.ClientesSst.empresa_sst_id == empresa_id,
        )
    )
    if cliente is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "cliente_id não encontrado ou não pertence a esta empresa",
        )

    await _validate_treinamento(payload.treinamento_id, db, empresa_id)

    if payload.instrutor_id is not None:
        instrutor = await db.scalar(
            select(gm.Instrutores.id).where(
                gm.Instrutores.id == payload.instrutor_id,
                gm.Instrutores.empresa_id == empresa_id,
            )
        )
        if instrutor is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "instrutor_id não encontrado ou não pertence a esta empresa",
            )

    obj = tm.TurmasTreinamento(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/turmas/{turma_id}", response_model=s.TurmaTreinamentoOut)
async def obter_turma(
    turma_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    return await _get_turma_scoped(turma_id, db, empresa_id)


@router.put("/turmas/{turma_id}", response_model=s.TurmaTreinamentoOut)
async def atualizar_turma(
    turma_id: uuid.UUID,
    payload: s.TurmaTreinamentoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_turma_scoped(turma_id, db, empresa_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/turmas/{turma_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_turma(
    turma_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_turma_scoped(turma_id, db, empresa_id)
    await db.delete(obj)
    await db.commit()


# ── Turma → Aulas (filha de turmas_treinamento) ───────────────────────────────

@router.get("/turmas/{turma_id}/aulas", response_model=list[s.TurmaAulaOut])
async def listar_aulas(
    turma_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    result = await db.scalars(
        select(tm.TurmasTreinamentoAulas).where(
            tm.TurmasTreinamentoAulas.turma_id == turma_id
        )
    )
    return list(result)


@router.post(
    "/turmas/{turma_id}/aulas",
    response_model=s.TurmaAulaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_aula(
    turma_id: uuid.UUID,
    payload: s.TurmaAulaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    obj = tm.TurmasTreinamentoAulas(
        id=uuid.uuid4(),
        turma_id=turma_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/turmas/{turma_id}/aulas/{aula_id}", response_model=s.TurmaAulaOut
)
async def atualizar_aula(
    turma_id: uuid.UUID,
    aula_id: uuid.UUID,
    payload: s.TurmaAulaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.TurmasTreinamentoAulas).where(
            tm.TurmasTreinamentoAulas.id == aula_id,
            tm.TurmasTreinamentoAulas.turma_id == turma_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aula não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/turmas/{turma_id}/aulas/{aula_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_aula(
    turma_id: uuid.UUID,
    aula_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.TurmasTreinamentoAulas).where(
            tm.TurmasTreinamentoAulas.id == aula_id,
            tm.TurmasTreinamentoAulas.turma_id == turma_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aula não encontrada")
    await db.delete(obj)
    await db.commit()


# ── Turma → Colaboradores (filha de turmas_treinamento) ───────────────────────

@router.get(
    "/turmas/{turma_id}/colaboradores",
    response_model=list[s.TurmaColaboradorOut],
)
async def listar_turma_colaboradores(
    turma_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    result = await db.scalars(
        select(tm.TurmaColaboradores).where(
            tm.TurmaColaboradores.turma_id == turma_id
        )
    )
    return list(result)


@router.post(
    "/turmas/{turma_id}/colaboradores",
    response_model=s.TurmaColaboradorOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_turma_colaborador(
    turma_id: uuid.UUID,
    payload: s.TurmaColaboradorCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    # valida colaborador_id contra o tenant
    await _get_colaborador_scoped(payload.colaborador_id, db, empresa_id)
    obj = tm.TurmaColaboradores(
        id=uuid.uuid4(),
        turma_id=turma_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/turmas/{turma_id}/colaboradores/{tc_id}",
    response_model=s.TurmaColaboradorOut,
)
async def atualizar_turma_colaborador(
    turma_id: uuid.UUID,
    tc_id: uuid.UUID,
    payload: s.TurmaColaboradorUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.TurmaColaboradores).where(
            tm.TurmaColaboradores.id == tc_id,
            tm.TurmaColaboradores.turma_id == turma_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/turmas/{turma_id}/colaboradores/{tc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_turma_colaborador(
    turma_id: uuid.UUID,
    tc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_turma_scoped(turma_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.TurmaColaboradores).where(
            tm.TurmaColaboradores.id == tc_id,
            tm.TurmaColaboradores.turma_id == turma_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")
    await db.delete(obj)
    await db.commit()


# ── Colaborador → Treinamentos (filha de colaboradores) ───────────────────────

@router.get(
    "/colaboradores/{colaborador_id}/treinamentos",
    response_model=list[s.ColaboradorTreinamentoOut],
)
async def listar_colaborador_treinamentos(
    colaborador_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    result = await db.scalars(
        select(tm.ColaboradoresTreinamentos).where(
            tm.ColaboradoresTreinamentos.colaborador_id == colaborador_id
        )
    )
    return list(result)


@router.post(
    "/colaboradores/{colaborador_id}/treinamentos",
    response_model=s.ColaboradorTreinamentoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_colaborador_treinamento(
    colaborador_id: uuid.UUID,
    payload: s.ColaboradorTreinamentoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    # valida treinamento_id contra o tenant
    await _validate_treinamento(payload.treinamento_id, db, empresa_id)
    obj = tm.ColaboradoresTreinamentos(
        id=uuid.uuid4(),
        colaborador_id=colaborador_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/colaboradores/{colaborador_id}/treinamentos/{ct_id}",
    response_model=s.ColaboradorTreinamentoOut,
)
async def atualizar_colaborador_treinamento(
    colaborador_id: uuid.UUID,
    ct_id: uuid.UUID,
    payload: s.ColaboradorTreinamentoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresTreinamentos).where(
            tm.ColaboradoresTreinamentos.id == ct_id,
            tm.ColaboradoresTreinamentos.colaborador_id == colaborador_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/colaboradores/{colaborador_id}/treinamentos/{ct_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_colaborador_treinamento(
    colaborador_id: uuid.UUID,
    ct_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresTreinamentos).where(
            tm.ColaboradoresTreinamentos.id == ct_id,
            tm.ColaboradoresTreinamentos.colaborador_id == colaborador_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vínculo não encontrado")
    await db.delete(obj)
    await db.commit()


# ── ColaboradoresTreinamentos → Datas (filha de colaboradores_treinamentos) ───

@router.get(
    "/colaboradores-treinamentos/{colaborador_treinamento_id}/datas",
    response_model=list[s.ColaboradorTreinamentoDataOut],
)
async def listar_colab_treino_datas(
    colaborador_treinamento_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colab_treino_scoped(colaborador_treinamento_id, db, empresa_id)
    result = await db.scalars(
        select(tm.ColaboradoresTreinamentosDatas).where(
            tm.ColaboradoresTreinamentosDatas.colaborador_treinamento_id
            == colaborador_treinamento_id
        )
    )
    return list(result)


@router.post(
    "/colaboradores-treinamentos/{colaborador_treinamento_id}/datas",
    response_model=s.ColaboradorTreinamentoDataOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_colab_treino_data(
    colaborador_treinamento_id: uuid.UUID,
    payload: s.ColaboradorTreinamentoDataCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colab_treino_scoped(colaborador_treinamento_id, db, empresa_id)
    obj = tm.ColaboradoresTreinamentosDatas(
        id=uuid.uuid4(),
        colaborador_treinamento_id=colaborador_treinamento_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/colaboradores-treinamentos/{colaborador_treinamento_id}/datas/{data_id}",
    response_model=s.ColaboradorTreinamentoDataOut,
)
async def atualizar_colab_treino_data(
    colaborador_treinamento_id: uuid.UUID,
    data_id: uuid.UUID,
    payload: s.ColaboradorTreinamentoDataUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colab_treino_scoped(colaborador_treinamento_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresTreinamentosDatas).where(
            tm.ColaboradoresTreinamentosDatas.id == data_id,
            tm.ColaboradoresTreinamentosDatas.colaborador_treinamento_id
            == colaborador_treinamento_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "data não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/colaboradores-treinamentos/{colaborador_treinamento_id}/datas/{data_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_colab_treino_data(
    colaborador_treinamento_id: uuid.UUID,
    data_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colab_treino_scoped(colaborador_treinamento_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresTreinamentosDatas).where(
            tm.ColaboradoresTreinamentosDatas.id == data_id,
            tm.ColaboradoresTreinamentosDatas.colaborador_treinamento_id
            == colaborador_treinamento_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "data não encontrada")
    await db.delete(obj)
    await db.commit()


# ── Colaborador → Certificados (filha de colaboradores) ───────────────────────

@router.get(
    "/colaboradores/{colaborador_id}/certificados",
    response_model=list[s.ColaboradorCertificadoOut],
)
async def listar_certificados(
    colaborador_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    result = await db.scalars(
        select(tm.ColaboradoresCertificados).where(
            tm.ColaboradoresCertificados.colaborador_id == colaborador_id
        )
    )
    return list(result)


@router.post(
    "/colaboradores/{colaborador_id}/certificados",
    response_model=s.ColaboradorCertificadoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_certificado(
    colaborador_id: uuid.UUID,
    payload: s.ColaboradorCertificadoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    # se turma_id fornecido, valida contra o tenant
    if payload.turma_id is not None:
        await _get_turma_scoped(payload.turma_id, db, empresa_id)
    obj = tm.ColaboradoresCertificados(
        id=uuid.uuid4(),
        colaborador_id=colaborador_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/colaboradores/{colaborador_id}/certificados/{cert_id}",
    response_model=s.ColaboradorCertificadoOut,
)
async def atualizar_certificado(
    colaborador_id: uuid.UUID,
    cert_id: uuid.UUID,
    payload: s.ColaboradorCertificadoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresCertificados).where(
            tm.ColaboradoresCertificados.id == cert_id,
            tm.ColaboradoresCertificados.colaborador_id == colaborador_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "certificado não encontrado")
    data = payload.model_dump(exclude_unset=True)
    if data.get("turma_id") is not None:
        await _get_turma_scoped(data["turma_id"], db, empresa_id)
    for k, v in data.items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/colaboradores/{colaborador_id}/certificados/{cert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remover_certificado(
    colaborador_id: uuid.UUID,
    cert_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    await _get_colaborador_scoped(colaborador_id, db, empresa_id)
    obj = await db.scalar(
        select(tm.ColaboradoresCertificados).where(
            tm.ColaboradoresCertificados.id == cert_id,
            tm.ColaboradoresCertificados.colaborador_id == colaborador_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "certificado não encontrado")
    await db.delete(obj)
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# CRUD genéricos (empresa_id / TenantRepository) — incluídos por último para não
# capturarem prefixos mais específicos como /turmas ou /colaboradores.
# ══════════════════════════════════════════════════════════════════════════════

router.include_router(
    make_crud_router(
        model=tm.CatalogoTreinamentos,
        create_schema=s.CatalogoTreinamentoCreate,
        update_schema=s.CatalogoTreinamentoUpdate,
        read_schema=s.CatalogoTreinamentoOut,
        prefix="/catalogo",
        tags=["treinamentos-catalogo"],
    )
)

router.include_router(
    make_crud_router(
        model=tm.Treinamentos,
        create_schema=s.TreinamentoCreate,
        update_schema=s.TreinamentoUpdate,
        read_schema=s.TreinamentoOut,
        prefix="/treinamentos",
        tags=["treinamentos-realizados"],
    )
)
