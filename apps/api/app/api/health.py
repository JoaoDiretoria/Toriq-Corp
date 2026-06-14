from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_role
from app.core.config import settings
from app.models.user import User, UserRole

router = APIRouter(tags=["health"])

# Só admin da empresa pode disparar o erro de teste do Sentry.
_require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/sentry-debug")
async def sentry_debug(user: User = Depends(_require_admin)) -> None:
    """Dispara um erro de teste para verificar a integração com o Sentry.

    EXIGE admin autenticado — sem auth, um endpoint público de geração de erro
    permitiria a qualquer um estourar a quota/custo do Sentry (e gerar 500s em
    série). Em prod, um admin abre ``/sentry-debug`` e confirma a issue no
    projeto ``toriq-corp-backend``. Sem Sentry configurado, responde 404 genérico
    (não vaza o estado da config).
    """
    if not settings.sentry_dsn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
    _ = 1 / 0  # erro proposital — capturado pelo Sentry
