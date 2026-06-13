"""Validação do Cloudflare Turnstile (captcha) no servidor.

Quando ``settings.turnstile_secret_key`` está vazio, a validação é PULADA
(captcha desligado). Quando configurado, o token enviado pelo front é validado
contra o endpoint siteverify do Cloudflare — fail-closed (qualquer falha/timeout
ou token ausente → inválido).

Usa ``urllib`` (stdlib) num thread para não exigir dependência de runtime extra.
"""
import asyncio
import json
import urllib.parse
import urllib.request

from app.core.config import settings

_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def _verify_sync(secret: str, token: str, remoteip: str | None = None) -> bool:
    data = {"secret": secret, "response": token}
    if remoteip:
        data["remoteip"] = remoteip
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(_SITEVERIFY_URL, data=body)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 (URL fixa)
            payload = json.loads(resp.read().decode())
        return bool(payload.get("success") is True)
    except Exception:
        return False


async def verify_turnstile(token: str | None, remoteip: str | None = None) -> bool:
    """True se o captcha for válido OU se estiver desligado (sem secret key).

    Com secret configurada: token ausente → False; erro/timeout → False (fail-closed).
    """
    secret = settings.turnstile_secret_key
    if not secret:
        return True  # captcha desligado
    if not token:
        return False
    return await asyncio.to_thread(_verify_sync, secret, token, remoteip)
