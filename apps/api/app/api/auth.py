from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import hash_password, verify_password
from app.core.tokens import create_token
from app.models.user import User
from app.schemas.auth import LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, user: User) -> None:
    empresa_id = str(user.empresa_id) if user.empresa_id else None
    access = create_token(
        subject=str(user.id), token_type="access",
        empresa_id=empresa_id, role=user.role.value,
    )
    refresh = create_token(
        subject=str(user.id), token_type="refresh",
        empresa_id=empresa_id, role=user.role.value,
    )
    common = {"httponly": True, "secure": settings.cookie_secure, "samesite": "lax"}
    response.set_cookie("access_token", access,
                        max_age=settings.jwt_access_ttl_seconds, **common)
    response.set_cookie("refresh_token", refresh,
                        max_age=settings.jwt_refresh_ttl_seconds, path="/auth", **common)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> User:
    exists = await db.scalar(select(User).where(User.email == payload.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "email já cadastrado")
    user = User(
        email=payload.email,
        senha_hash=hash_password(payload.password),
        nome=payload.nome,
        role=payload.role,
        empresa_id=payload.empresa_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response,
                db: AsyncSession = Depends(get_db)) -> User:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credenciais inválidas")
    if not user.ativo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário inativo")
    _set_auth_cookies(response, user)
    return user
