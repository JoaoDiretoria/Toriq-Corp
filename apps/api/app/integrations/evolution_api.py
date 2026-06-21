"""Integração com a Evolution API (gateway WhatsApp self-hosted, baseado em Baileys).

Canal WhatsApp alternativo ao Meta (app/integrations/whatsapp_meta.py). Aqui só
falamos com a Evolution API instalada na VPS: criar/conectar/encerrar instâncias,
enviar mensagens, configurar webhook — além das funções PURAS de parsing do
webhook (sem rede).

Estilo: igual a whatsapp_meta.py — httpx.AsyncClient stateless (abre/fecha por
chamada); falhas HTTP viram EvolutionError. Header de auth: ``apikey``.

A CONFIRMAR contra a instância do usuário (paths/payloads divergem entre v1/v2):
- /instance/create, /instance/connect/{i}, /instance/connectionState/{i},
  /instance/logout/{i}, /instance/delete/{i}, /webhook/set/{i},
  /message/sendText/{i}.
- Callback: data.key.remoteJid/fromMe/id, data.message.conversation, data.pushName.
"""
from __future__ import annotations

import re

import httpx

_TIMEOUT = 30.0

# Eventos que pedimos a Evolution para nos enviar no webhook.
EVENTOS_PADRAO = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]


class EvolutionError(Exception):
    """Erro ao falar com a Evolution API (HTTP ou resposta inesperada)."""


def _headers(api_key: str) -> dict:
    return {"apikey": api_key, "Content-Type": "application/json"}


def _base(base_url: str) -> str:
    return (base_url or "").rstrip("/")


# ───────────────────────────── HTTP helpers ─────────────────────────────

async def _request(method: str, url: str, api_key: str, *, json=None, contexto: str):
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.request(method, url, json=json, headers=_headers(api_key))
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise EvolutionError(
                f"Falha na Evolution ({contexto}): HTTP "
                f"{e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise EvolutionError(f"Erro de rede na Evolution ({contexto}): {e}") from e
        try:
            return resp.json()
        except ValueError:
            return {}


# ───────────────────────────── Instâncias ─────────────────────────────

async def criar_instancia(*, base_url: str, api_key: str, instance_name: str) -> dict:
    """Cria a instância na Evolution. Retorna o JSON (inclui qrcode quando disponível)."""
    url = f"{_base(base_url)}/instance/create"
    payload = {
        "instanceName": instance_name,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }
    return await _request("POST", url, api_key, json=payload, contexto="criar instancia")


async def definir_webhook(
    *, base_url: str, api_key: str, instance_name: str, webhook_url: str, eventos=None
) -> dict:
    url = f"{_base(base_url)}/webhook/set/{instance_name}"
    payload = {
        "webhook": {
            "enabled": True,
            "url": webhook_url,
            "events": eventos or EVENTOS_PADRAO,
            "base64": True,
        }
    }
    return await _request("POST", url, api_key, json=payload, contexto="definir webhook")


async def conectar_qrcode(*, base_url: str, api_key: str, instance_name: str) -> dict:
    """GET connect → {base64, code/pairingCode}."""
    url = f"{_base(base_url)}/instance/connect/{instance_name}"
    return await _request("GET", url, api_key, contexto="conectar/qrcode")


async def estado_conexao(*, base_url: str, api_key: str, instance_name: str) -> str:
    """Retorna 'open' | 'connecting' | 'close'."""
    url = f"{_base(base_url)}/instance/connectionState/{instance_name}"
    data = await _request("GET", url, api_key, contexto="estado conexao")
    if isinstance(data, dict):
        inst = data.get("instance")
        if isinstance(inst, dict) and inst.get("state"):
            return inst["state"]
        if data.get("state"):
            return data["state"]
    return "close"


async def logout(*, base_url: str, api_key: str, instance_name: str) -> dict:
    url = f"{_base(base_url)}/instance/logout/{instance_name}"
    return await _request("DELETE", url, api_key, contexto="logout")


async def deletar(*, base_url: str, api_key: str, instance_name: str) -> dict:
    url = f"{_base(base_url)}/instance/delete/{instance_name}"
    return await _request("DELETE", url, api_key, contexto="deletar")


async def reiniciar(*, base_url: str, api_key: str, instance_name: str) -> dict:
    url = f"{_base(base_url)}/instance/restart/{instance_name}"
    return await _request("PUT", url, api_key, contexto="reiniciar")


async def definir_settings(
    *, base_url: str, api_key: str, instance_name: str, settings: dict
) -> dict:
    """Aplica settings da instância (rejectCall, groupsIgnore, readMessages, ...)."""
    url = f"{_base(base_url)}/settings/set/{instance_name}"
    return await _request("POST", url, api_key, json=settings, contexto="settings")


# ───────────────────────────── Mensagens ─────────────────────────────

async def enviar_texto(
    *, base_url: str, api_key: str, instance_name: str, numero: str, texto: str
) -> str:
    """Envia texto. Retorna o id da mensagem (key.id) quando presente."""
    url = f"{_base(base_url)}/message/sendText/{instance_name}"
    payload = {"number": numero, "text": texto}
    data = await _request("POST", url, api_key, json=payload, contexto="enviar texto")
    return _extrair_id(data)


async def enviar_midia(
    *, base_url: str, api_key: str, instance_name: str, numero: str,
    mediatype: str, media: str, mimetype: str | None = None,
    filename: str | None = None, caption: str | None = None,
) -> str:
    """Envia mídia (image/video/document). ``media`` = URL pública ou base64.
    Retorna o id da mensagem."""
    url = f"{_base(base_url)}/message/sendMedia/{instance_name}"
    payload: dict = {"number": numero, "mediatype": mediatype, "media": media}
    if mimetype:
        payload["mimetype"] = mimetype
    if filename:
        payload["fileName"] = filename
    if caption:
        payload["caption"] = caption
    data = await _request("POST", url, api_key, json=payload, contexto="enviar midia")
    return _extrair_id(data)


async def enviar_audio(
    *, base_url: str, api_key: str, instance_name: str, numero: str, audio: str
) -> str:
    """Envia áudio de voz (PTT). ``audio`` = URL pública ou base64."""
    url = f"{_base(base_url)}/message/sendWhatsAppAudio/{instance_name}"
    payload = {"number": numero, "audio": audio}
    data = await _request("POST", url, api_key, json=payload, contexto="enviar audio")
    return _extrair_id(data)


async def baixar_midia(
    *, base_url: str, api_key: str, instance_name: str, message_id: str
) -> str:
    """Baixa a mídia de uma mensagem recebida como base64 (fallback quando o
    webhook não trouxe base64 inline). Retorna '' se não vier."""
    url = f"{_base(base_url)}/chat/getBase64FromMediaMessage/{instance_name}"
    payload = {"message": {"key": {"id": message_id}}}
    data = await _request("POST", url, api_key, json=payload, contexto="baixar midia")
    if isinstance(data, dict):
        return data.get("base64") or ""
    return ""


async def enviar_presenca(
    *, base_url: str, api_key: str, instance_name: str, numero: str,
    presence: str = "composing", delay_ms: int = 1200,
) -> None:
    """Mostra 'digitando...'/'gravando...' no WhatsApp do contato (humaniza o SDR).

    presence: 'composing' | 'recording' | 'paused' | 'available'. Best-effort:
    nunca levanta (igual ao tio-crm) — falha de presença não pode bloquear o envio.
    """
    url = f"{_base(base_url)}/chat/sendPresence/{instance_name}"
    payload = {"number": numero, "presence": presence, "delay": delay_ms}
    try:
        await _request("POST", url, api_key, json=payload, contexto="presence")
    except EvolutionError:
        return


def _extrair_id(data) -> str:
    if isinstance(data, dict):
        key = data.get("key")
        if isinstance(key, dict) and key.get("id"):
            return key["id"]
        if data.get("id"):
            return str(data["id"])
    return ""


# ───────────────────────────── Parsing puro do webhook ─────────────────────────────

def normalizar_telefone(valor: str) -> str:
    """Remove sufixo JID (@s.whatsapp.net/@g.us) e tudo que não é dígito."""
    base = (valor or "").split("@")[0]
    return re.sub(r"\D", "", base)


# Tipos de mídia da Evolution (chave em data.message → nosso vocabulário).
_MEDIA_KEYS = {
    "imageMessage": "image",
    "audioMessage": "audio",
    "videoMessage": "video",
    "documentMessage": "document",
    "stickerMessage": "sticker",
}


def _extrair_media(m: dict, msg: dict) -> dict | None:
    """Extrai metadados de mídia + base64 inline (quando o webhook manda base64).

    Retorna ``None`` p/ mensagem de texto puro; senão um dict com
    ``{tipo, mime_type, caption, filename, seconds, media_id, base64}``.
    O ``base64`` é usado em memória (download/transcrição) e NÃO é persistido.
    """
    for chave, tipo in _MEDIA_KEYS.items():
        obj = msg.get(chave)
        if isinstance(obj, dict):
            return {
                "tipo": tipo,
                "mime_type": obj.get("mimetype"),
                "caption": obj.get("caption"),
                "filename": obj.get("fileName"),
                "seconds": obj.get("seconds"),
                "media_id": (m.get("key") or {}).get("id"),
                "base64": msg.get("base64") or m.get("base64"),
            }
    return None


def parse_webhook(payload) -> dict:
    """Extrai inbound/conexão do callback da Evolution. Tolerante a lixo.

    Retorna {"mensagens": [...], "statuses": [...], "conexao": {...}|None,
    "instance": str|None}. Cada mensagem: {wamid, from, pushName, texto, timestamp}.
    """
    out = {"mensagens": [], "statuses": [], "conexao": None, "instance": None}
    if not isinstance(payload, dict):
        return out

    out["instance"] = payload.get("instance")
    evento = (payload.get("event") or "").lower()
    data = payload.get("data")

    if evento == "messages.upsert":
        itens = data if isinstance(data, list) else [data]
        for m in itens:
            if not isinstance(m, dict):
                continue
            key = m.get("key") or {}
            if key.get("fromMe"):
                continue  # ignora as mensagens que NÓS enviamos
            msg = m.get("message") or {}
            media = _extrair_media(m, msg)
            texto = (
                msg.get("conversation")
                or (msg.get("extendedTextMessage") or {}).get("text")
                or (media or {}).get("caption")
            )
            out["mensagens"].append(
                {
                    "wamid": key.get("id"),
                    "from": normalizar_telefone(key.get("remoteJid") or ""),
                    "pushName": m.get("pushName"),
                    "texto": texto,
                    "media": media,
                    "timestamp": m.get("messageTimestamp"),
                }
            )
    elif evento == "connection.update":
        if isinstance(data, dict):
            out["conexao"] = {"state": data.get("state")}

    return out


def map_status(s: str) -> str:
    """Normaliza status de mensagem da Evolution para nosso vocabulário."""
    mapa = {
        "PENDING": "pendente",
        "SERVER_ACK": "enviado",
        "DELIVERY_ACK": "entregue",
        "READ": "lido",
        "PLAYED": "lido",
    }
    return mapa.get(s, s)
