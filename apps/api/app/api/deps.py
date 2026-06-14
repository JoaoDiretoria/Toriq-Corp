import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.tokens import TokenError, decode_token
from app.models.user import User, UserRole


async def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "não autenticado")
    try:
        payload = decode_token(access_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "tipo de token inválido")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "usuário inválido")
    return user


async def get_optional_user(
    access_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Como ``get_current_user``, mas devolve ``None`` em vez de 401 quando não
    há sessão válida. Para rotas que mudam de comportamento conforme autenticado
    ou não (ex.: /auth/register gated pós-bootstrap)."""
    if not access_token:
        return None
    try:
        payload = decode_token(access_token)
    except TokenError:
        return None
    if payload.get("type") != "access":
        return None
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.ativo:
        return None
    return user


CurrentUser = User


def require_role(*roles: UserRole) -> Callable:
    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "permissão insuficiente")
        return user

    return _guard


# Guard do dashboard de suporte/observabilidade (/ops): staff interno TORIQ.
# admin_vertical (superadmin) também acessa. Use como dependência em todo /ops.
require_ops = require_role(UserRole.admin_vertical, UserRole.suporte)
