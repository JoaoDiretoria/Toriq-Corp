"""Integração com a API Gemini (Google Generative Language) — usada pelo SDR.

Cliente stateless e mínimo (httpx) que espelha o contrato de
``llm_claude.chamar_claude``: mesma assinatura, devolve **texto puro** e levanta
``LLMError`` (reusado de ``llm_claude``) em qualquer falha. Assim o dispatcher
``chamar_llm`` pode rotear por provedor sem o serviço saber a diferença.

Particularidades do Gemini tratadas aqui:
- a key vai na query string (``?key=<api_key>``), não em header;
- o endpoint embute o modelo na URL (``/models/<modelo>:generateContent``);
- papéis: ``assistant`` -> ``model``, ``user`` -> ``user``;
- ``system`` -> ``system_instruction``; cada mensagem vira ``parts:[{text}]``;
- a resposta sai em ``candidates[0].content.parts[].text``.
"""
from __future__ import annotations

import base64

import httpx

from app.integrations.llm_claude import LLMError

# ═══════════════════════════════════════════════════════════════════════════════
# Constantes da API generateContent do Gemini
# ═══════════════════════════════════════════════════════════════════════════════
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

_TIMEOUT = 60.0


def _papel(role: str | None) -> str:
    """Mapeia o papel interno (user/assistant) para o do Gemini (user/model)."""
    return "model" if role == "assistant" else "user"


async def chamar_gemini(
    *,
    api_key: str,
    modelo: str,
    system: str | None,
    mensagens: list[dict],
    temperatura: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Chama a API generateContent do Gemini e devolve o texto da resposta.

    ``mensagens`` é uma lista de ``{"role": "user"|"assistant", "content": str}``.
    Devolve a concatenação de ``candidates[0].content.parts[].text`` (ou ``""``).

    Levanta ``LLMError`` em qualquer falha HTTP ou de rede.
    """
    url = f"{GEMINI_BASE_URL}/{modelo}:generateContent"
    headers = {"content-type": "application/json"}
    payload: dict = {
        "contents": [
            {"role": _papel(m.get("role")), "parts": [{"text": m.get("content") or ""}]}
            for m in mensagens
        ],
        "generationConfig": {
            "temperature": temperatura,
            "maxOutputTokens": max_tokens,
        },
    }
    if system:
        payload["system_instruction"] = {"parts": [{"text": system}]}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(
                url, json=payload, headers=headers, params={"key": api_key}
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise LLMError(
                f"Falha ao chamar Gemini: HTTP {e.response.status_code} — "
                f"{e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise LLMError(f"Erro de rede ao chamar Gemini: {e}") from e
        data = resp.json()

    return _extrair_texto(data)


def _extrair_texto(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict))


async def descrever_imagem_gemini(
    *,
    api_key: str,
    modelo: str,
    imagem: bytes,
    mime: str | None,
    prompt: str | None = None,
) -> str:
    """Descreve uma imagem (Gemini vision) via ``inline_data`` base64.

    Devolve a descrição. Levanta ``LLMError`` em falha.
    """
    media_type = (mime or "image/jpeg").split(";")[0].strip() or "image/jpeg"
    b64 = base64.b64encode(imagem).decode()
    pergunta = prompt or "Descreva esta imagem em 1-2 frases, em português."
    url = f"{GEMINI_BASE_URL}/{modelo}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": pergunta},
                    {"inline_data": {"mime_type": media_type, "data": b64}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 300},
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(
                url, json=payload, headers={"content-type": "application/json"},
                params={"key": api_key},
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise LLMError(
                f"Falha ao descrever imagem (Gemini): HTTP {e.response.status_code} — "
                f"{e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise LLMError(f"Erro de rede ao descrever imagem (Gemini): {e}") from e
        data = resp.json()

    return _extrair_texto(data)
