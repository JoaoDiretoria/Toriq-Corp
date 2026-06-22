"""Integração com a Evolution Go (gateway WhatsApp self-hosted, baseado em whatsmeow).

Canal WhatsApp alternativo ao Meta (app/integrations/whatsapp_meta.py). Aqui só
falamos com a Evolution Go instalada na VPS: criar/conectar/encerrar instâncias,
enviar mensagens — além das funções PURAS de parsing do webhook (sem rede).

Auth — header ``apikey`` com DOIS significados conforme a rota:
- rotas *admin* (create / all / delete / forcereconnect) → ``apikey`` = GLOBAL_API_KEY
  do servidor (a nossa ``vendas_evolution_servidor.api_key_enc``).
- rotas *de instância* (connect / qr / status / logout / reconnect / send/* / message/*)
  → ``apikey`` = token DAQUELA instância (``instance_token_enc``); o servidor resolve
  a instância via ``GetInstanceByToken``.

Estilo: igual a whatsapp_meta.py — httpx.AsyncClient stateless (abre/fecha por
chamada); falhas HTTP viram EvolutionError. Respostas do Go vêm embrulhadas em
``{"message": "success", "data": {...}}`` — ver ``_unwrap``.
"""
from __future__ import annotations

import re

import httpx

_TIMEOUT = 30.0

# Categorias de evento que assinamos no connect (UPPERCASE — ver event_types.go):
# MESSAGE (inbound), CONNECTION (Connected/Disconnected/LoggedOut), QRCODE (QR ao vivo).
EVENTOS_PADRAO = ["MESSAGE", "CONNECTION", "QRCODE"]


class EvolutionError(Exception):
    """Erro ao falar com a Evolution Go (HTTP ou resposta inesperada)."""


def _headers(api_key: str) -> dict:
    return {"apikey": api_key, "Content-Type": "application/json"}


def _base(base_url: str) -> str:
    return (base_url or "").rstrip("/")


def _unwrap(data):
    """Desembrulha o envelope ``{"message","data"}`` do Go. Tolerante a respostas cruas."""
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    return data


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

async def criar_instancia(
    *, base_url: str, api_key: str, name: str, instance_id: str, token: str,
    advanced_settings: dict | None = None,
) -> dict:
    """Cria a instância no servidor (rota admin → GLOBAL_API_KEY).

    Passamos o ``instanceId`` (= nosso UUID local) e o ``token`` (gerado por nós),
    que depois usamos como ``apikey`` nas rotas de instância. ``name`` e ``token``
    são obrigatórios no Go.
    """
    url = f"{_base(base_url)}/instance/create"
    payload: dict = {"name": name, "instanceId": instance_id, "token": token}
    if advanced_settings:
        payload["advancedSettings"] = advanced_settings
    return await _request("POST", url, api_key, json=payload, contexto="criar instancia")


async def conectar(
    *, base_url: str, token: str, webhook_url: str, subscribe=None
) -> dict:
    """Inicia o login da instância e CONFIGURA o webhook (rota de instância → token).

    No Go o webhook não tem endpoint próprio: a URL + as categorias assinadas vão
    aqui no connect. O QR é obtido depois via ``obter_qrcode`` (ou chega no webhook).
    """
    url = f"{_base(base_url)}/instance/connect"
    payload = {"webhookUrl": webhook_url, "subscribe": subscribe or EVENTOS_PADRAO}
    return await _request("POST", url, token, json=payload, contexto="conectar")


async def obter_qrcode(*, base_url: str, token: str) -> dict:
    """GET /instance/qr → {base64, code}. O Go devolve o QR já como PNG data-URL."""
    url = f"{_base(base_url)}/instance/qr"
    data = _unwrap(await _request("GET", url, token, contexto="qrcode"))
    if isinstance(data, dict):
        return {
            "base64": data.get("Qrcode") or data.get("qrcode"),
            "code": data.get("code"),
        }
    return {"base64": None, "code": None}


async def estado_conexao(*, base_url: str, token: str) -> str:
    """GET /instance/status → 'open' | 'close' (Go devolve ``{Connected: bool}``)."""
    url = f"{_base(base_url)}/instance/status"
    data = _unwrap(await _request("GET", url, token, contexto="estado conexao"))
    if isinstance(data, dict):
        conectado = data.get("Connected")
        if conectado is None:
            conectado = data.get("connected")
        return "open" if conectado else "close"
    return "close"


async def logout(*, base_url: str, token: str) -> dict:
    url = f"{_base(base_url)}/instance/logout"
    return await _request("DELETE", url, token, contexto="logout")


async def reconectar(*, base_url: str, token: str) -> dict:
    url = f"{_base(base_url)}/instance/reconnect"
    return await _request("POST", url, token, contexto="reconectar")


async def deletar(*, base_url: str, api_key: str, instance_id: str) -> dict:
    """DELETE /instance/delete/{id} (rota admin → GLOBAL_API_KEY)."""
    url = f"{_base(base_url)}/instance/delete/{instance_id}"
    return await _request("DELETE", url, api_key, contexto="deletar")


# ───────────────────────────── Mensagens ─────────────────────────────

async def enviar_texto(
    *, base_url: str, token: str, numero: str, texto: str
) -> str:
    """POST /send/text {number, text} (rota de instância → token). Retorna o id."""
    url = f"{_base(base_url)}/send/text"
    payload = {"number": numero, "text": texto}
    data = await _request("POST", url, token, json=payload, contexto="enviar texto")
    return _extrair_id(data)


async def enviar_midia(
    *, base_url: str, token: str, numero: str, mediatype: str, media: str,
    mimetype: str | None = None, filename: str | None = None,
    caption: str | None = None,
) -> str:
    """POST /send/media (rota de instância → token).

    ``media`` vai no campo ``url`` — que aceita URL pública OU base64 (se não começa
    com http(s), o Go decodifica como base64). ``mediatype='audio'`` vira nota de voz
    (PTT). O Go detecta o mime sozinho (não há campo mimetype). Retorna o id.
    """
    url = f"{_base(base_url)}/send/media"
    payload: dict = {"number": numero, "type": mediatype, "url": media}
    if filename:
        payload["filename"] = filename
    if caption:
        payload["caption"] = caption
    data = await _request("POST", url, token, json=payload, contexto="enviar midia")
    return _extrair_id(data)


async def enviar_presenca(
    *, base_url: str, token: str, numero: str, state: str = "composing",
    is_audio: bool = False,
) -> None:
    """Mostra 'digitando...'/'gravando...' no WhatsApp do contato (humaniza o SDR).

    state: 'composing' | 'paused'. ``is_audio=True`` mostra 'gravando áudio'.
    Best-effort: nunca levanta — falha de presença não pode bloquear o envio.
    """
    url = f"{_base(base_url)}/message/presence"
    payload = {"number": numero, "state": state, "isAudio": is_audio}
    try:
        await _request("POST", url, token, json=payload, contexto="presence")
    except EvolutionError:
        return


def _extrair_id(data) -> str:
    """Id da mensagem enviada: ``data.Info.ID`` (Go embrulha em ``{message,data}``)."""
    inner = _unwrap(data)
    if isinstance(inner, dict):
        info = inner.get("Info")
        if isinstance(info, dict) and info.get("ID"):
            return str(info["ID"])
        # fallbacks defensivos
        key = inner.get("key")
        if isinstance(key, dict) and key.get("id"):
            return str(key["id"])
        if inner.get("id"):
            return str(inner["id"])
    return ""


# ───────────────────────────── Parsing puro do webhook ─────────────────────────────

def normalizar_telefone(valor: str) -> str:
    """Remove sufixo JID (@s.whatsapp.net/@g.us) e tudo que não é dígito."""
    base = (valor or "").split("@")[0]
    return re.sub(r"\D", "", base)


def _jid_to_phone(valor) -> str:
    """Telefone a partir de um JID que pode vir como string OU objeto whatsmeow.

    whatsmeow pode serializar ``types.JID`` como string (``"55..@s.whatsapp.net"``)
    ou como objeto (``{"User": "55..", "Server": "s.whatsapp.net", ...}``).
    """
    if isinstance(valor, dict):
        return normalizar_telefone(valor.get("User") or valor.get("user") or "")
    return normalizar_telefone(valor or "")


# Tipos de mídia do whatsmeow (chave em data.Message → nosso vocabulário).
_MEDIA_KEYS = {
    "imageMessage": "image",
    "audioMessage": "audio",
    "videoMessage": "video",
    "documentMessage": "document",
    "stickerMessage": "sticker",
}


def _extrair_media(info: dict, msg: dict) -> dict | None:
    """Metadados de mídia + base64/url inline (o webhook do Go já traz a mídia).

    Retorna ``None`` p/ texto puro; senão ``{tipo, mime_type, caption, filename,
    seconds, media_id, base64, url}``. ``base64`` (MinIO off) ou ``url`` (MinIO on)
    vêm no nível de ``Message``; o resto, no objeto da mídia.
    """
    for chave, tipo in _MEDIA_KEYS.items():
        obj = msg.get(chave)
        if isinstance(obj, dict):
            return {
                "tipo": tipo,
                "mime_type": obj.get("mimetype") or msg.get("mimetype"),
                "caption": obj.get("caption"),
                "filename": obj.get("fileName"),
                "seconds": obj.get("seconds"),
                "media_id": (info or {}).get("ID"),
                "base64": msg.get("base64"),
                "url": msg.get("mediaUrl"),
            }
    return None


def parse_webhook(payload) -> dict:
    """Extrai inbound/conexão do callback da Evolution Go. Tolerante a lixo.

    Retorna {"mensagens": [...], "statuses": [...], "conexao": {...}|None,
    "instance": str|None}. Cada mensagem: {wamid, from, pushName, texto, media,
    timestamp}. Eventos relevantes (PascalCase): ``Message`` (inbound),
    ``Connected`` / ``Disconnected`` / ``LoggedOut`` (conexão).
    """
    out = {"mensagens": [], "statuses": [], "conexao": None, "instance": None}
    if not isinstance(payload, dict):
        return out

    out["instance"] = payload.get("instance") or payload.get("instanceName")
    evento = (payload.get("event") or "").lower()
    data = payload.get("data")

    if evento == "message":
        if not isinstance(data, dict):
            return out
        info = data.get("Info") or data.get("info") or {}
        if info.get("IsFromMe") or info.get("isFromMe"):
            return out  # ignora as mensagens que NÓS enviamos
        msg = data.get("Message") or data.get("message") or {}
        media = _extrair_media(info, msg)
        texto = (
            msg.get("conversation")
            or (msg.get("extendedTextMessage") or {}).get("text")
            or (media or {}).get("caption")
        )
        out["mensagens"].append(
            {
                "wamid": info.get("ID") or info.get("Id"),
                "from": _jid_to_phone(info.get("Sender") or info.get("Chat")),
                "pushName": info.get("PushName") or info.get("pushName"),
                "texto": texto,
                "media": media,
                "timestamp": info.get("Timestamp"),
            }
        )
    elif evento == "connected":
        out["conexao"] = {"state": "open"}
    elif evento in ("disconnected", "loggedout"):
        out["conexao"] = {"state": "close"}

    return out


def map_status(s: str) -> str:
    """Normaliza tipo de recibo (whatsmeow Receipt) para nosso vocabulário."""
    mapa = {
        "sender": "enviado",
        "delivery": "entregue",
        "read": "lido",
        "read-self": "lido",
        "played": "lido",
    }
    return mapa.get(s, s)
