"""Inicialização do Sentry (monitoramento de erros) do backend FastAPI.

Env-driven: sem ``SENTRY_DSN`` configurado, o init é no-op — nada é enviado e a
aplicação roda normal. Deve ser chamado o mais cedo possível (antes de criar o
app FastAPI) para que a integração Starlette/FastAPI seja auto-habilitada pelo
sentry-sdk.

Usar o DSN do projeto Sentry do BACKEND (separado do front).
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger("toriq.sentry")


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            # Não enviar dados pessoais por padrão (LGPD): sem corpo de request,
            # headers de auth, etc. até decisão explícita.
            send_default_pii=False,
        )
        logger.info("Sentry inicializado (environment=%s).", settings.sentry_environment)
    except Exception as exc:  # pragma: no cover - nunca derruba o boot por causa do Sentry
        logger.warning("Falha ao inicializar Sentry (%s); seguindo sem.", exc)
