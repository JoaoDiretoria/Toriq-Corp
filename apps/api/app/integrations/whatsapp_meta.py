"""Integração com a WhatsApp Cloud API da Meta (Graph API).

Canal WhatsApp do módulo Toriq Vendas (Fase 3). Aqui só falamos com a Graph API
oficial da Meta (https://graph.facebook.com): envio de mensagens de template
(marketing — exige template aprovado) e de texto livre (somente dentro da janela
de 24h após o lead responder), além das funções puras de webhook (verificação do
challenge, validação da assinatura HMAC, parsing do payload e normalização de
status).

Componentes:
- ``GRAPH_VERSION`` / ``BASE``: versão e base da Graph API.
- ``WhatsAppError``: erro de domínio levantado em falhas de chamada à API.
- ``send_template`` / ``send_text``: envio de mensagens (stateless via httpx).
- ``verify_webhook``: valida o handshake GET do webhook (hub.* -> challenge).
- ``check_signature``: valida a assinatura HMAC SHA-256 do POST inbound.
- ``parse_webhook``: extrai mensagens e statuses do payload (tolerante).
- ``map_status_whatsapp``: normaliza o status da Meta para nosso vocabulário.

Estilo: igual a ``apify.py`` — ``httpx.AsyncClient`` stateless (abre/fecha por
chamada), erros HTTP viram ``WhatsAppError`` com mensagem útil.
"""
from __future__ import annotations

import hashlib
import hmac

import httpx

# ═══════════════════════════════════════════════════════════════════════════════
# Configuração da Graph API
# ═══════════════════════════════════════════════════════════════════════════════
GRAPH_VERSION = "v21.0"
BASE = "https://graph.facebook.com"

_TIMEOUT = 30.0


class WhatsAppError(Exception):
    """Erro ao falar com a Graph API da Meta (HTTP ou resposta inesperada)."""


# ═══════════════════════════════════════════════════════════════════════════════
# Envio de mensagens (Cloud API)
# ═══════════════════════════════════════════════════════════════════════════════

async def send_template(
    *,
    phone_id: str,
    token: str,
    to: str,
    template_name: str,
    lang_code: str = "pt_BR",
    components: list | None = None,
) -> str:
    """Envia uma mensagem de TEMPLATE (marketing — exige template aprovado).

    POST ``{BASE}/{GRAPH_VERSION}/{phone_id}/messages`` com Bearer token.
    Retorna o ``wamid`` (id da mensagem). Falha HTTP -> ``WhatsAppError``.
    """
    url = f"{BASE}/{GRAPH_VERSION}/{phone_id}/messages"
    template: dict = {"name": template_name, "language": {"code": lang_code}}
    if components:
        template["components"] = components
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": template,
    }
    return await _post_message(url, token, payload, contexto="template")


async def send_text(*, phone_id: str, token: str, to: str, body: str) -> str:
    """Envia uma mensagem de TEXTO livre (só na janela de 24h após resposta).

    POST ``{BASE}/{GRAPH_VERSION}/{phone_id}/messages`` com Bearer token.
    Retorna o ``wamid`` (id da mensagem). Falha HTTP -> ``WhatsAppError``.
    """
    url = f"{BASE}/{GRAPH_VERSION}/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }
    return await _post_message(url, token, payload, contexto="texto")


async def _post_message(url: str, token: str, payload: dict, *, contexto: str) -> str:
    """Faz o POST da mensagem e extrai o wamid; centraliza o tratamento de erro."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise WhatsAppError(
                f"Falha ao enviar mensagem ({contexto}): "
                f"HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise WhatsAppError(
                f"Erro de rede ao enviar mensagem ({contexto}): {e}"
            ) from e
        data = resp.json()
    try:
        return data["messages"][0]["id"]
    except (KeyError, IndexError, TypeError) as e:
        raise WhatsAppError(
            f"Resposta inesperada da Graph API ({contexto}): {data!r}"
        ) from e


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — verificação do handshake (GET)
# ═══════════════════════════════════════════════════════════════════════════════

def verify_webhook(
    mode: str | None,
    token: str | None,
    challenge: str | None,
    expected_token: str | None,
) -> str | None:
    """Valida o handshake GET do webhook da Meta.

    Se ``mode == "subscribe"`` e os tokens conferem, devolve o ``challenge``;
    caso contrário, ``None``.
    """
    if mode == "subscribe" and token and expected_token and token == expected_token:
        return challenge
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — validação da assinatura (POST)
# ═══════════════════════════════════════════════════════════════════════════════

def check_signature(
    app_secret: str, raw_body: bytes, signature_header: str | None
) -> bool:
    """Valida a assinatura ``X-Hub-Signature-256`` do POST inbound da Meta.

    Calcula ``'sha256=' + HMAC_SHA256(app_secret, raw_body)`` e compara com o
    header via ``hmac.compare_digest``. Sem header ou sem secret -> ``False``.
    """
    if not signature_header or not app_secret:
        return False
    esperado = "sha256=" + hmac.new(
        app_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(esperado, signature_header)


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — parsing do payload (tolerante)
# ═══════════════════════════════════════════════════════════════════════════════

def parse_webhook(payload: dict) -> dict:
    """Extrai mensagens inbound e statuses do payload do webhook.

    Percorre ``entry[].changes[].value`` recolhendo ``messages[]`` e
    ``statuses[]``. Totalmente tolerante: campos faltando geram listas vazias e
    nunca levantam exceção.

    Retorna ``{"mensagens": [...], "statuses": [...]}``:
    - mensagem: ``{"wamid", "from", "tipo", "texto", "timestamp"}``
    - status:   ``{"wamid", "status", "timestamp", "recipient"}``
    """
    mensagens: list[dict] = []
    statuses: list[dict] = []

    if not isinstance(payload, dict):
        return {"mensagens": mensagens, "statuses": statuses}

    for entry in payload.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            if not isinstance(change, dict):
                continue
            value = change.get("value")
            if not isinstance(value, dict):
                continue

            for m in value.get("messages") or []:
                if not isinstance(m, dict):
                    continue
                mensagens.append(
                    {
                        "wamid": m.get("id"),
                        "from": m.get("from"),
                        "tipo": m.get("type"),
                        "texto": (m.get("text") or {}).get("body"),
                        "timestamp": m.get("timestamp"),
                    }
                )

            for s in value.get("statuses") or []:
                if not isinstance(s, dict):
                    continue
                statuses.append(
                    {
                        "wamid": s.get("id"),
                        "status": s.get("status"),
                        "timestamp": s.get("timestamp"),
                        "recipient": s.get("recipient_id"),
                    }
                )

    return {"mensagens": mensagens, "statuses": statuses}


# ═══════════════════════════════════════════════════════════════════════════════
# Status: WhatsApp (Meta) -> nosso vocabulário
# ═══════════════════════════════════════════════════════════════════════════════

def map_status_whatsapp(s: str) -> str:
    """Normaliza o status de uma mensagem da Meta para nosso vocabulário interno."""
    mapa = {
        "sent": "enviado",
        "delivered": "entregue",
        "read": "lido",
        "failed": "erro",
    }
    return mapa.get(s, s)
