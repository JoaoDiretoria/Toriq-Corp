import uuid

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.reset_token import gerar_token_senha, ler_token_senha
from app.core.security import hash_password, verify_password
from app.core.turnstile import verify_turnstile
from app.core.tokens import TokenError, create_token, decode_token
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User, UserRole
from app.schemas.auth import EmpresaOut, LoginIn, MeOut, ProfileOut, RegisterIn, UserOut
from app.services import email_sistema

router = APIRouter(prefix="/auth", tags=["auth"])


class EsqueciSenhaIn(BaseModel):
    email: str


class DefinirSenhaIn(BaseModel):
    token: str
    senha: str


def _set_auth_cookies(response: Response, user: User, imp_by: str | None = None) -> None:
    empresa_id = str(user.empresa_id) if user.empresa_id else None
    access = create_token(
        subject=str(user.id), token_type="access",
        empresa_id=empresa_id, role=user.role.value,
        imp_by=imp_by,
    )
    refresh = create_token(
        subject=str(user.id), token_type="refresh",
        empresa_id=empresa_id, role=user.role.value,
        imp_by=imp_by,
    )
    common = {"httponly": True, "secure": settings.cookie_secure, "samesite": "lax"}
    response.set_cookie("access_token", access,
                        max_age=settings.jwt_access_ttl_seconds, **common)
    response.set_cookie("refresh_token", refresh,
                        max_age=settings.jwt_refresh_ttl_seconds, path="/auth", **common)


# Cadastro gated (Fatia 0). Como o endpoint aceita `role`/`empresa_id`, deixá-lo
# aberto é privilege escalation. Regra:
#   - settings.open_register=False (default, prod): exige admin_vertical autenticado;
#   - settings.open_register=True: aberto (bootstrap controlado / suíte de testes).
# O 1º admin entra pelo seed (app.seed_admin), nunca pela rota aberta em produção.
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterIn,
    db: AsyncSession = Depends(get_db),
    actor: User | None = Depends(get_optional_user),
) -> User:
    if not settings.open_register and (actor is None or actor.role != UserRole.admin_vertical):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "cadastro restrito: requer admin_vertical autenticado",
        )
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
    await db.flush()
    # Cria o perfil de negócio (profiles.id -> users.id). Sem isso, FKs como
    # agenda_eventos.criado_por -> profiles.id quebram para qualquer usuário.
    from app.models.generated import Profiles

    db.add(Profiles(
        id=user.id, email=user.email, nome=user.nome,
        role=user.role.value, empresa_id=user.empresa_id,
    ))
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=MeOut)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    """Retorna a sessão atual (usuário + perfil de negócio + empresa).

    É o que o front chama ao restaurar a sessão (substitui o
    `supabase.auth.getSession()` + busca de profile/empresa).
    """
    from app.models.generated import Empresas, Profiles

    profile = await db.get(Profiles, user.id)
    empresa = None
    if profile is not None and profile.empresa_id is not None:
        empresa = await db.get(Empresas, profile.empresa_id)
    return MeOut(
        user=UserOut.model_validate(user),
        profile=ProfileOut.model_validate(profile) if profile is not None else None,
        empresa=EmpresaOut.model_validate(empresa) if empresa is not None else None,
    )


@router.post("/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response,
                db: AsyncSession = Depends(get_db)) -> User:
    # Captcha (Turnstile): validado só quando TURNSTILE_SECRET_KEY está configurada.
    if not await verify_turnstile(payload.captcha_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "captcha inválido")
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credenciais inválidas")
    if not user.ativo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário inativo")
    _set_auth_cookies(response, user)
    return user


@router.post("/refresh", response_model=UserOut)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sem refresh token")
    try:
        payload = decode_token(refresh_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "refresh inválido")
    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "tipo de token inválido")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "usuário inválido")
    _set_auth_cookies(response, user, imp_by=payload.get("imp_by"))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/auth")


@router.post("/esqueci-senha", status_code=status.HTTP_204_NO_CONTENT)
async def esqueci_senha(
    payload: EsqueciSenhaIn, db: AsyncSession = Depends(get_db)
) -> None:
    """Solicita redefinição de senha por email (link com token de 24h).

    SEMPRE responde 204 — não revela se o email existe (anti-enumeração). Só
    dispara o email se houver um usuário ativo com aquele email.
    """
    email = (payload.email or "").strip().lower()
    if not email:
        return
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not user.ativo:
        return
    token = gerar_token_senha(user.id)
    link = f"{settings.frontend_base_url}/definir-senha?token={token}"
    await email_sistema.enviar_reset_senha(
        db, to=user.email, link=link, empresa_id=user.empresa_id
    )


@router.post("/definir-senha", response_model=UserOut)
async def definir_senha(
    payload: DefinirSenhaIn, response: Response, db: AsyncSession = Depends(get_db)
) -> User:
    """Define a senha a partir do token do email (convite/reset). Loga o usuário."""
    try:
        user_id = ler_token_senha(payload.token)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "token inválido ou expirado")
    if len(payload.senha or "") < 8:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "a senha deve ter ao menos 8 caracteres"
        )
    user = await db.get(User, user_id)
    if user is None or not user.ativo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "usuário inválido")

    user.senha_hash = hash_password(payload.senha)
    # Marca o perfil como senha já definida (libera do fluxo de 1º acesso).
    from app.models.generated import Profiles

    profile = await db.get(Profiles, user.id)
    if profile is not None:
        profile.senha_alterada = True
    await db.commit()
    await db.refresh(user)
    _set_auth_cookies(response, user)
    return user
