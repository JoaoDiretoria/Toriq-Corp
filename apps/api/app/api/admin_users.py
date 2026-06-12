"""Gestão de usuários (admin) + troca de senha do usuário logado.

Substitui as edge functions admin-create-user / update / delete /
reset-password do Supabase. Regras de tenant:

- ``admin_vertical`` pode criar/editar/listar usuários em qualquer empresa.
- ``cliente_torq`` SÓ pode operar dentro da própria empresa e NÃO pode criar
  ou promover usuários para ``admin_vertical``.

NUNCA serializa ``senha_hash`` em nenhuma resposta.
"""
import secrets
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.core.security import hash_password, verify_password
from app.models.generated import Profiles
from app.models.user import User, UserRole
from app.schemas.admin_users import (
    AdminResetPasswordIn,
    AdminUserCreatedOut,
    AdminUserCreateIn,
    AdminUserOut,
    AdminUserUpdateIn,
    ChangePasswordIn,
)

router = APIRouter(prefix="/admin/users", tags=["admin-users"])
password_router = APIRouter(prefix="/auth", tags=["admin-users"])

_PWD_ALPHABET = string.ascii_letters + string.digits


def _gen_temp_password(length: int = 16) -> str:
    """Senha temporária forte (alfanumérica, >=12 chars) via ``secrets``."""
    return "".join(secrets.choice(_PWD_ALPHABET) for _ in range(length))


def _resolve_target_empresa(actor: User, requested: uuid.UUID | None) -> uuid.UUID | None:
    """Resolve a empresa-alvo da CRIAÇÃO segundo o papel do ator.

    - cliente_torq: ignora/valida — sempre a própria empresa; 403 se tentar outra.
    - admin_vertical: usa o `requested` (pode ser qualquer empresa, incl. None).
    """
    if actor.role == UserRole.cliente_torq:
        if requested is not None and requested != actor.empresa_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "cliente_torq só pode criar usuários na própria empresa",
            )
        return actor.empresa_id
    return requested


async def _get_scoped_user(db: AsyncSession, actor: User, user_id: uuid.UUID) -> User:
    """Busca o usuário-alvo aplicando a regra de tenant.

    cliente_torq que tenta tocar usuário de outra empresa recebe 404 (não
    vazamos a existência de usuários de outros tenants).
    """
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
    if actor.role == UserRole.cliente_torq:
        # Fora da própria empresa: não existe (não vaza usuários de outro tenant).
        if target.empresa_id != actor.empresa_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
        # Hierarquia: um cliente_torq nunca pode tocar (editar/resetar/desativar)
        # um admin_vertical, mesmo na própria empresa (anti-escalonamento). 404 p/
        # não revelar a existência/privilégio do alvo.
        if target.role == UserRole.admin_vertical:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
    return target


@router.post(
    "",
    response_model=AdminUserCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: AdminUserCreateIn,
    actor: User = Depends(
        require_role(UserRole.admin_vertical, UserRole.cliente_torq)
    ),
    db: AsyncSession = Depends(get_db),
) -> AdminUserCreatedOut:
    # cliente_torq não pode criar/promover para admin_vertical.
    if actor.role == UserRole.cliente_torq and payload.role == UserRole.admin_vertical:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "cliente_torq não pode criar usuários admin_vertical",
        )

    empresa_id = _resolve_target_empresa(actor, payload.empresa_id)

    exists = await db.scalar(select(User).where(User.email == payload.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "email já cadastrado")

    temp_password: str | None = None
    plain = payload.password
    if not plain:
        plain = _gen_temp_password()
        temp_password = plain

    user = User(
        email=payload.email,
        senha_hash=hash_password(plain),
        nome=payload.nome,
        role=payload.role,
        empresa_id=empresa_id,
        ativo=True,
    )
    db.add(user)
    await db.flush()

    db.add(
        Profiles(
            id=user.id,
            email=user.email,
            nome=user.nome,
            role=user.role.value,
            empresa_id=user.empresa_id,
            senha_alterada=False,
            primeiro_acesso=True,
            ativo=True,
        )
    )
    await db.commit()
    await db.refresh(user)

    out = AdminUserCreatedOut.model_validate(user)
    out.temp_password = temp_password
    return out


@router.get("", response_model=list[AdminUserOut])
async def list_users(
    empresa_id: uuid.UUID | None = None,
    actor: User = Depends(
        require_role(UserRole.admin_vertical, UserRole.cliente_torq)
    ),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    stmt = select(User)
    if actor.role == UserRole.cliente_torq:
        stmt = stmt.where(User.empresa_id == actor.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(User.empresa_id == empresa_id)
    result = await db.scalars(stmt)
    return list(result.all())


@router.put("/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdateIn,
    actor: User = Depends(
        require_role(UserRole.admin_vertical, UserRole.cliente_torq)
    ),
    db: AsyncSession = Depends(get_db),
) -> User:
    target = await _get_scoped_user(db, actor, user_id)

    if payload.role is not None:
        if (
            actor.role == UserRole.cliente_torq
            and payload.role == UserRole.admin_vertical
        ):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "cliente_torq não pode promover para admin_vertical",
            )
        target.role = payload.role
    if payload.nome is not None:
        target.nome = payload.nome
    if payload.ativo is not None:
        target.ativo = payload.ativo

    profile = await db.get(Profiles, target.id)
    if profile is not None:
        if payload.nome is not None:
            profile.nome = payload.nome
        if payload.role is not None:
            profile.role = payload.role.value
        if payload.ativo is not None:
            profile.ativo = payload.ativo

    await db.commit()
    await db.refresh(target)
    return target


@router.post("/{user_id}/reset-password", response_model=AdminUserCreatedOut)
async def reset_password(
    user_id: uuid.UUID,
    payload: AdminResetPasswordIn,
    actor: User = Depends(
        require_role(UserRole.admin_vertical, UserRole.cliente_torq)
    ),
    db: AsyncSession = Depends(get_db),
) -> AdminUserCreatedOut:
    target = await _get_scoped_user(db, actor, user_id)

    temp_password: str | None = None
    plain = payload.password
    if not plain:
        plain = _gen_temp_password()
        temp_password = plain

    target.senha_hash = hash_password(plain)

    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.senha_alterada = False

    await db.commit()
    await db.refresh(target)

    out = AdminUserCreatedOut.model_validate(target)
    out.temp_password = temp_password
    return out


@router.delete("/{user_id}", response_model=AdminUserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    actor: User = Depends(
        require_role(UserRole.admin_vertical, UserRole.cliente_torq)
    ),
    db: AsyncSession = Depends(get_db),
) -> User:
    if user_id == actor.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "não é possível desativar a si mesmo"
        )
    target = await _get_scoped_user(db, actor, user_id)

    target.ativo = False
    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.ativo = False

    await db.commit()
    await db.refresh(target)
    return target


@password_router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, user.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "senha atual incorreta")

    user.senha_hash = hash_password(payload.new_password)
    profile = await db.get(Profiles, user.id)
    if profile is not None:
        profile.senha_alterada = True

    await db.commit()
