"""Transcrição de áudio via OpenAI Whisper (áudios recebidos no canal Evolution).

Cliente stateless mínimo sobre o endpoint de transcrição da OpenAI (httpx,
multipart). A chave da OpenAI é por empresa (``vendas_sdr_config.openai_api_key_enc``,
criptografada). Falha → ``WhisperError`` (o chamador degrada graciosamente).
"""
from __future__ import annotations

import httpx

_TIMEOUT = 60.0
_URL = "https://api.openai.com/v1/audio/transcriptions"

_EXT = {
    "audio/ogg": "audio.ogg",
    "audio/mpeg": "audio.mp3",
    "audio/mp4": "audio.m4a",
    "audio/wav": "audio.wav",
    "audio/webm": "audio.webm",
}


class WhisperError(Exception):
    """Erro ao transcrever áudio na OpenAI (HTTP ou rede)."""


async def transcrever(
    *, api_key: str, audio: bytes, mime: str | None = None, modelo: str = "whisper-1"
) -> str:
    """Transcreve ``audio`` (bytes) e devolve o texto. Levanta ``WhisperError``."""
    base_mime = (mime or "audio/ogg").split(";")[0].strip() or "audio/ogg"
    filename = _EXT.get(base_mime, "audio.ogg")
    files = {"file": (filename, audio, base_mime)}
    data = {"model": modelo}
    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(_URL, headers=headers, data=data, files=files)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise WhisperError(
                f"Whisper HTTP {e.response.status_code}: {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise WhisperError(f"Erro de rede no Whisper: {e}") from e
        out = resp.json()

    return (out or {}).get("text", "") if isinstance(out, dict) else ""
