"""Integração com o Resend (envio de emails transacionais via API HTTP).

- ``enviar_resend``: POST https://api.resend.com/emails (Bearer API key). Retorna
  o id da mensagem no Resend (usado para casar os eventos do webhook).
- ``verificar_assinatura_webhook``: valida a assinatura Svix do webhook do Resend
  (HMAC-SHA256) sem depender do pacote ``svix`` — mesma ideia da verificação do
  webhook da Meta em ``whatsapp_meta.py``.

Sem ``RESEND_API_KEY`` configurada, ``enviar_resend`` levanta
``ResendNotConfigured`` — o chamador degrada (não envia, mas não quebra).
"""
from __future__ import annotations

import base64
import hashlib
import hmac

import httpx

from app.core.config import settings

_API_URL = "https://api.resend.com/emails"
_TIMEOUT = 30.0


class ResendError(Exception):
    """Falha ao enviar email pelo Resend (HTTP/rede/resposta inesperada)."""


class ResendNotConfigured(ResendError):
    """RESEND_API_KEY não configurada — envio desabilitado."""


async def enviar_resend(
    *,
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
    reply_to: str | None = None,
    tags: list[dict] | None = None,
) -> str:
    """Envia um email pelo Resend e devolve o id da mensagem.

    Levanta ``ResendNotConfigured`` se não houver API key; ``ResendError`` em
    qualquer falha de envio.
    """
    if not settings.resend_api_key:
        raise ResendNotConfigured("RESEND_API_KEY não configurada")

    payload: dict = {
        "from": settings.resend_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text
    if reply_to:
        payload["reply_to"] = reply_to
    if tags:
        payload["tags"] = tags

    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            raise ResendError(
                f"Falha ao enviar email: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise ResendError(f"Erro de rede ao enviar email: {e}") from e
    rid = data.get("id")
    if not rid:
        raise ResendError(f"Resposta inesperada do Resend: {data!r}")
    return rid


def verificar_assinatura_webhook(
    *,
    secret: str,
    svix_id: str | None,
    svix_timestamp: str | None,
    svix_signature: str | None,
    raw_body: bytes,
) -> bool:
    """Valida a assinatura Svix do webhook do Resend.

    Conteúdo assinado = ``"{id}.{timestamp}.{body}"``; a chave é o ``secret``
    (``whsec_<base64>``) decodificado de base64; assinatura = base64 do
    HMAC-SHA256. O header ``svix-signature`` traz uma ou mais assinaturas
    ``v1,<sig>`` separadas por espaço — basta uma bater.
    """
    if not (secret and svix_id and svix_timestamp and svix_signature):
        return False
    chave_b64 = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
    try:
        chave = base64.b64decode(chave_b64)
    except Exception:  # noqa: BLE001
        return False

    assinado = f"{svix_id}.{svix_timestamp}.{raw_body.decode('utf-8', 'replace')}"
    esperado = base64.b64encode(
        hmac.new(chave, assinado.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8")

    for parte in svix_signature.split():
        _, _, assinatura = parte.partition(",")
        if assinatura and hmac.compare_digest(assinatura, esperado):
            return True
    return False
