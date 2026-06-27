"""Integração com a Graph API da Meta para Instagram (Fase IG-1).

Mesma Graph API do WhatsApp (graph.facebook.com), produto Instagram: webhook do
campo ``comments``, resposta pública sob o comentário, private reply (DM amarrado
ao comentário) e listagem de mídia (posts). Reusa o handshake e a validação de
assinatura HMAC de ``whatsapp_meta`` (são genéricos de webhook Meta).

Estilo: igual a ``whatsapp_meta.py`` — ``httpx.AsyncClient`` stateless, erros HTTP
viram ``InstagramError``.
"""
from __future__ import annotations

import httpx

# Reusa versão/base e os helpers de webhook (idênticos entre canais Meta).
from app.integrations.whatsapp_meta import (  # noqa: F401
    BASE,
    GRAPH_VERSION,
    check_signature,
    verify_webhook,
)

_TIMEOUT = 30.0


class InstagramError(Exception):
    """Erro ao falar com a Graph API (Instagram) — HTTP ou resposta inesperada."""


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — parsing dos comentários (tolerante)
# ═══════════════════════════════════════════════════════════════════════════════

def parse_webhook(payload: dict) -> list[dict]:
    """Extrai os comentários do payload do webhook (campo ``comments``).

    Retorna lista de ``{comment_id, media_id, parent_id, from_id, from_username,
    texto, timestamp}``. Totalmente tolerante: campos faltando viram None e
    ``changes`` de outros campos (mentions, etc.) são ignorados.
    """
    out: list[dict] = []
    if not isinstance(payload, dict):
        return out
    for entry in payload.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            if not isinstance(change, dict) or change.get("field") != "comments":
                continue
            v = change.get("value")
            if not isinstance(v, dict):
                continue
            frm = v.get("from") if isinstance(v.get("from"), dict) else {}
            media = v.get("media") if isinstance(v.get("media"), dict) else {}
            out.append(
                {
                    "comment_id": v.get("id"),
                    "media_id": media.get("id"),
                    "parent_id": v.get("parent_id"),
                    "from_id": frm.get("id"),
                    "from_username": frm.get("username"),
                    "texto": v.get("text"),
                    "timestamp": v.get("timestamp"),
                }
            )
    return out


# ═══════════════════════════════════════════════════════════════════════════════
# Envio — resposta pública e private reply (DM)
# ═══════════════════════════════════════════════════════════════════════════════

async def _post(url: str, token: str, payload: dict, *, contexto: str) -> dict:
    """POST autenticado (Bearer); centraliza o tratamento de erro."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha ({contexto}): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede ({contexto}): {e}") from e
        return resp.json()


async def reply_public(*, token: str, comment_id: str, message: str) -> str:
    """Responde PUBLICAMENTE sob um comentário. Retorna o id da resposta."""
    url = f"{BASE}/{GRAPH_VERSION}/{comment_id}/replies"
    data = await _post(url, token, {"message": message}, contexto="reply_public")
    return data.get("id") or ""


async def send_private_reply(
    *, token: str, ig_user_id: str, comment_id: str, message: str
) -> str:
    """Manda um DM (private reply) amarrado ao comentário (comment-to-DM).

    NÃO depende da janela de 24h: 1 por comentário, até 7 dias. Retorna o
    message_id.
    """
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/messages"
    payload = {"recipient": {"comment_id": comment_id}, "message": {"text": message}}
    data = await _post(url, token, payload, contexto="private_reply")
    return data.get("message_id") or data.get("id") or ""


# ═══════════════════════════════════════════════════════════════════════════════
# Leitura — listar mídia (posts). Uso pleno é Fase 2; aqui p/ contagem na tela.
# ═══════════════════════════════════════════════════════════════════════════════

async def list_media(*, token: str, ig_user_id: str) -> list[dict]:
    """Lista os posts do usuário IG (id, caption, media_url, permalink, etc.)."""
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/media"
    params = {
        "fields": "id,caption,media_type,media_url,permalink,timestamp,comments_count",
        "access_token": token,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.get(url, params=params)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha (list_media): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede (list_media): {e}") from e
        data = resp.json()
    return data.get("data") or []
