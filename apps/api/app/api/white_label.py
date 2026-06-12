"""White Label / Configuração de empresa.

Endpoints:
  GET    /white-label/config            → obter config da própria empresa (cria se não existir)
  PUT    /white-label/config            → upsert config da própria empresa
  GET    /white-label/modulos           → catálogo global de módulos (read-only)
  GET    /white-label/modulos/{id_}     → módulo por id (read-only)
  GET    /white-label/empresa-modulos   → módulos ativos da empresa autenticada
  POST   /white-label/empresa-modulos   → vincular módulo à empresa
  PUT    /white-label/empresa-modulos/{id_}   → atualizar (ativar/desativar)
  DELETE /white-label/empresa-modulos/{id_}   → desvincular módulo da empresa
  GET    /white-label/empresa-modulos-telas   → telas por módulo da empresa
  POST   /white-label/empresa-modulos-telas   → vincular tela
  PUT    /white-label/empresa-modulos-telas/{id_}  → atualizar tela
  DELETE /white-label/empresa-modulos-telas/{id_}  → desvincular tela

Notas de segurança:
- WhiteLabelConfig tem UniqueConstraint(empresa_id) → 1-per-empresa.
  GET faz upsert implícito (retorna ou cria registro vazio), PUT atualiza.
- EmpresasModulos e EmpresasModulosTelas são tenant-scoped por empresa_id.
- Modulos é global (sem empresa_id) → somente leitura, sem filtro de tenant.
- Todas as operações de escrita injetam o empresa_id do token autenticado;
  nunca aceitam empresa_id vindo do payload.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.schemas import white_label as s

router = APIRouter(prefix="/white-label", tags=["white-label"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _require_empresa(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ── WhiteLabelConfig  (1-per-empresa) ─────────────────────────────────────────

@router.get("/config", response_model=s.WhiteLabelConfigOut)
async def obter_config(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a config white-label da empresa autenticada.
    Se ainda não existir, cria um registro com todos os defaults.
    """
    obj = await db.scalar(
        select(m.WhiteLabelConfig).where(
            m.WhiteLabelConfig.empresa_id == empresa_id
        )
    )
    if obj is None:
        obj = m.WhiteLabelConfig(id=uuid.uuid4(), empresa_id=empresa_id)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
    return obj


@router.put("/config", response_model=s.WhiteLabelConfigOut)
async def atualizar_config(
    payload: s.WhiteLabelConfigUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza (upsert) a config white-label da empresa autenticada.
    empresa_id nunca pode ser alterado via payload — sempre vem do token.
    """
    obj = await db.scalar(
        select(m.WhiteLabelConfig).where(
            m.WhiteLabelConfig.empresa_id == empresa_id
        )
    )
    if obj is None:
        obj = m.WhiteLabelConfig(id=uuid.uuid4(), empresa_id=empresa_id)
        db.add(obj)

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)

    await db.commit()
    await db.refresh(obj)
    return obj


# ── Modulos — catálogo global (sem empresa_id) ────────────────────────────────

@router.get("/modulos", response_model=list[s.ModuloOut])
async def listar_modulos(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Catálogo global de módulos disponíveis (somente leitura)."""
    result = await db.scalars(select(m.Modulos))
    return list(result)


@router.get("/modulos/{id_}", response_model=s.ModuloOut)
async def obter_modulo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    obj = await db.scalar(select(m.Modulos).where(m.Modulos.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "módulo não encontrado")
    return obj


# ── EmpresasModulos ───────────────────────────────────────────────────────────

@router.get("/empresa-modulos", response_model=list[s.EmpresaModuloOut])
async def listar_empresa_modulos(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.EmpresasModulos).where(
            m.EmpresasModulos.empresa_id == empresa_id
        )
    )
    return list(result)


@router.post(
    "/empresa-modulos",
    response_model=s.EmpresaModuloOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_empresa_modulo(
    payload: s.EmpresaModuloIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = m.EmpresasModulos(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        modulo_id=payload.modulo_id,
        ativo=payload.ativo,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/empresa-modulos/{id_}", response_model=s.EmpresaModuloOut)
async def atualizar_empresa_modulo(
    id_: uuid.UUID,
    payload: s.EmpresaModuloUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.EmpresasModulos).where(
            m.EmpresasModulos.id == id_,
            m.EmpresasModulos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa-modulo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/empresa-modulos/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_empresa_modulo(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.EmpresasModulos).where(
            m.EmpresasModulos.id == id_,
            m.EmpresasModulos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa-modulo não encontrado")
    await db.delete(obj)
    await db.commit()


# ── EmpresasModulosTelas ──────────────────────────────────────────────────────

@router.get("/empresa-modulos-telas", response_model=list[s.EmpresaModuloTelaOut])
async def listar_empresa_modulos_telas(
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.empresa_id == empresa_id
        )
    )
    return list(result)


@router.post(
    "/empresa-modulos-telas",
    response_model=s.EmpresaModuloTelaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_empresa_modulo_tela(
    payload: s.EmpresaModuloTelaIn,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = m.EmpresasModulosTelas(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        modulo_id=payload.modulo_id,
        tela_id=payload.tela_id,
        ativo=payload.ativo,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/empresa-modulos-telas/{id_}", response_model=s.EmpresaModuloTelaOut)
async def atualizar_empresa_modulo_tela(
    id_: uuid.UUID,
    payload: s.EmpresaModuloTelaUpdate,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.id == id_,
            m.EmpresasModulosTelas.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tela não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/empresa-modulos-telas/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_empresa_modulo_tela(
    id_: uuid.UUID,
    empresa_id: uuid.UUID = Depends(_require_empresa),
    db: AsyncSession = Depends(get_db),
):
    obj = await db.scalar(
        select(m.EmpresasModulosTelas).where(
            m.EmpresasModulosTelas.id == id_,
            m.EmpresasModulosTelas.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tela não encontrada")
    await db.delete(obj)
    await db.commit()
