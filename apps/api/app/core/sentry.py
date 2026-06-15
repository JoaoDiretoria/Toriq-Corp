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


def get_sentry_dsn() -> str | None:
    """Retorna o DSN normalizado ou ``None`` quando ausente/vazio.

    Alguns PaaS gravam o valor da env com aspas literais em volta (ex.:
    ``"https://..."``); removê-las evita um DSN "inválido" por um caractere a mais.
    Espaços nas duas pontas também são aparados.
    """
    dsn = (settings.sentry_dsn or "").strip().strip("\"'").strip()
    return dsn or None


def has_valid_sentry_dsn() -> bool:
    """Valida o formato do DSN sem derrubar o processo."""
    dsn = get_sentry_dsn()
    if not dsn:
        return False
    try:
        from sentry_sdk.utils import Dsn

        Dsn(dsn)
        return True
    except Exception:
        return False


def init_sentry() -> None:
    dsn = get_sentry_dsn()
    if not dsn:
        logger.info("Sentry desativado: SENTRY_DSN ausente.")
        return
    if not has_valid_sentry_dsn():
        # DSN presente porém malformado (ex.: projeto vazio em "Invalid project in
        # DSN ('')"). Evita chamar sentry_sdk.init — que lançaria a cada boot de worker
        # — e desativa o Sentry de forma limpa, com uma mensagem acionável.
        logger.warning(
            "Sentry desativado: SENTRY_DSN inválido. O DSN precisa estar COMPLETO, no "
            "formato https://<key>@<host>/<project_id> — o id do projeto (número no "
            "final) não pode faltar."
        )
        return
    try:
        import sentry_sdk
        from sentry_sdk.utils import Dsn

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.sentry_environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            # Não enviar dados pessoais por padrão (LGPD): sem corpo de request,
            # headers de auth, etc. até decisão explícita.
            send_default_pii=False,
        )
        # Confirmação clara no boot — sem vazar a key, só host/projeto/ambiente.
        parsed = Dsn(dsn)
        logger.info(
            "Sentry ATIVO (host=%s, project=%s, environment=%s).",
            parsed.host,
            parsed.project_id,
            settings.sentry_environment,
        )
    except Exception as exc:  # pragma: no cover - nunca derruba o boot por causa do Sentry
        logger.warning("Falha ao inicializar Sentry (%s); seguindo sem.", exc)
