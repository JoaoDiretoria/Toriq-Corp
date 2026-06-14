from fastapi import APIRouter, HTTPException, status

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/sentry-debug")
async def sentry_debug() -> None:
    """Dispara um erro de teste para verificar a integração com o Sentry.

    Só levanta o erro quando o Sentry está REALMENTE configurado (SENTRY_DSN
    setado) — assim não fica um endpoint que sempre dá 500 em ambientes sem
    Sentry. Em prod, abra ``/sentry-debug`` e confirme a issue no projeto
    ``toriq-corp-backend``. Pode remover depois de verificar.
    """
    if not settings.sentry_dsn:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Sentry não configurado (defina SENTRY_DSN)."
        )
    _ = 1 / 0  # erro proposital — capturado pelo Sentry
