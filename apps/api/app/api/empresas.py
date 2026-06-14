"""Empresas — raiz do tenant (o próprio `id` é o empresa_id).

Tenant model: a tabela `empresas` É a empresa. Controle de acesso:

  Endpoint              | Acesso
  ----------------------|--------------------------------------------------
  GET  /empresas/me     | usuário autenticado → a própria empresa
  GET  /empresas        | admin_vertical → lista TODAS as empresas
  GET  /empresas/{id}   | admin_vertical (qualquer) | usuário comum (só a sua)
  PUT  /empresas/{id}   | admin da própria empresa (admin_vertical) → só a sua

Campos sensíveis do certificado A1 NUNCA são expostos (ver schema EmpresaOut).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import empresas as s
from app.services.notificacoes import notificar

router = APIRouter(prefix="/empresas", tags=["empresas"])


async def _assert_empresa_access(
    user: User, empresa_id: uuid.UUID, db: AsyncSession
) -> m.Empresas:
    """admin_vertical acessa qualquer empresa; demais só a própria. 404 se não existe."""
    if user.role != UserRole.admin_vertical and user.empresa_id != empresa_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == empresa_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


@router.get("/me", response_model=s.EmpresaOut)
async def obter_minha_empresa(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a empresa do usuário autenticado."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == user.empresa_id))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


@router.get("", response_model=list[s.EmpresaOut])
async def listar_empresas(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    """Lista todas as empresas — restrito a admin_vertical."""
    result = await db.scalars(select(m.Empresas))
    return list(result)


@router.post("", response_model=s.EmpresaOut, status_code=status.HTTP_201_CREATED)
async def criar_empresa(
    payload: s.EmpresaCreate,
    user: User = Depends(require_role(UserRole.admin_vertical, UserRole.cliente_torq)),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma empresa (raiz de tenant).

    - admin_vertical: pode criar qualquer `tipo`.
    - cliente_torq (SST): só pode criar sub-tenants (cliente_final, empresa_parceira,
      lead) — nunca um peer `sst` ou `vertical_on`.
    """
    if payload.tipo not in s.TIPOS_EMPRESA:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "tipo de empresa inválido")
    if user.role == UserRole.cliente_torq and payload.tipo not in s.CLIENT_TIPOS:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "cliente_torq só pode criar cliente_final, empresa_parceira ou lead",
        )
    obj = m.Empresas(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)

    # Notifica o tenant do criador (a empresa nova ainda não tem usuários).
    if user.empresa_id is not None:
        nome_empresa = (
            getattr(obj, "nome", None)
            or getattr(obj, "razao_social", None)
            or getattr(obj, "nome_fantasia", None)
            or "Nova empresa"
        )
        await notificar(
            db,
            empresa_id=user.empresa_id,
            titulo="Nova empresa cadastrada",
            mensagem=f"A empresa {nome_empresa} foi criada.",
            tipo="success",
            categoria="cadastro",
            modulo="gestao_empresa",
            tela="empresas",
            referencia_tipo="empresa",
            referencia_id=obj.id,
            usuario_nome=getattr(user, "nome", None),
        )
    return obj


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_empresa(
    id_: uuid.UUID,
    _: User = Depends(require_role(UserRole.admin_vertical)),
    db: AsyncSession = Depends(get_db),
):
    """Remove uma empresa — restrito a admin_vertical. 409 se houver dependências
    (FKs de usuários, clientes, etc.) — não força cascade destrutivo."""
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    await db.delete(obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "empresa possui registros vinculados; remova-os antes",
        )


# ── Contatos da empresa (empresa_contatos) — tenant-scoped pela empresa ────────

@router.get("/{empresa_id}/contatos", response_model=list[s.EmpresaContatoOut])
async def listar_contatos(
    empresa_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_empresa_access(user, empresa_id, db)
    result = await db.scalars(
        select(m.EmpresaContatos).where(m.EmpresaContatos.empresa_id == empresa_id)
    )
    return list(result)


@router.post(
    "/{empresa_id}/contatos",
    response_model=s.EmpresaContatoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_contato(
    empresa_id: uuid.UUID,
    payload: s.EmpresaContatoIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_empresa_access(user, empresa_id, db)
    obj = m.EmpresaContatos(
        id=uuid.uuid4(), empresa_id=empresa_id, **payload.model_dump(exclude_unset=True)
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/{empresa_id}/contatos/{contato_id}", response_model=s.EmpresaContatoOut
)
async def atualizar_contato(
    empresa_id: uuid.UUID,
    contato_id: uuid.UUID,
    payload: s.EmpresaContatoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_empresa_access(user, empresa_id, db)
    obj = await db.scalar(
        select(m.EmpresaContatos).where(
            m.EmpresaContatos.id == contato_id,
            m.EmpresaContatos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contato não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete(
    "/{empresa_id}/contatos/{contato_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remover_contato(
    empresa_id: uuid.UUID,
    contato_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_empresa_access(user, empresa_id, db)
    obj = await db.scalar(
        select(m.EmpresaContatos).where(
            m.EmpresaContatos.id == contato_id,
            m.EmpresaContatos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contato não encontrado")
    await db.delete(obj)
    await db.commit()


@router.get("/{id_}", response_model=s.EmpresaOut)
async def obter_empresa(
    id_: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """admin_vertical pode obter qualquer empresa; usuário comum só a própria."""
    if user.role != UserRole.admin_vertical and user.empresa_id != id_:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "acesso negado")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    return obj


@router.put("/{id_}", response_model=s.EmpresaOut)
async def atualizar_empresa(
    id_: uuid.UUID,
    payload: s.EmpresaUpdate,
    user: User = Depends(require_role(UserRole.admin_vertical)),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza a própria empresa — apenas admin da empresa (admin_vertical).

    O admin só pode editar a EMPRESA dele (empresa_id == id_).
    """
    if user.empresa_id != id_:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "só pode editar a própria empresa")
    obj = await db.scalar(select(m.Empresas).where(m.Empresas.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj
