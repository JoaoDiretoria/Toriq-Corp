"""Integração com a API Chat Completions da OpenAI — usada pelo SDR Inteligente.

Cliente stateless e mínimo (httpx) que espelha o contrato de
``llm_claude.chamar_claude``: mesma assinatura, devolve **texto puro** e levanta
``LLMError`` (reusado de ``llm_claude``) em qualquer falha. Assim o dispatcher
``chamar_llm`` pode rotear por provedor sem o serviço saber a diferença.

Diferenças do Claude tratadas aqui:
- autenticação via ``Authorization: Bearer <api_key>``;
- ``system`` entra como a PRIMEIRA mensagem (``role="system"``), não como campo;
- a resposta sai em ``choices[0].message.content``.
"""
from __future__ import annotations

import base64

import httpx

from app.integrations.llm_claude import LLMError

# ═══════════════════════════════════════════════════════════════════════════════
# Constantes da API Chat Completions da OpenAI
# ═══════════════════════════════════════════════════════════════════════════════
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

_TIMEOUT = 60.0


async def chamar_openai(
    *,
    api_key: str,
    modelo: str,
    system: str | None,
    mensagens: list[dict],
    temperatura: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Chama a API Chat Completions da OpenAI e devolve o texto da resposta.

    ``mensagens`` é uma lista de ``{"role": "user"|"assistant", "content": str}``
    (compatível com a OpenAI). Se ``system`` vier, é prefixado como
    ``{"role": "system", "content": system}``. Devolve
    ``choices[0].message.content`` (ou ``""`` se ausente).

    Levanta ``LLMError`` em qualquer falha HTTP ou de rede.
    """
    headers = {
        "authorization": f"Bearer {api_key}",
        "content-type": "application/json",
    }
    msgs: list[dict] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(mensagens)
    payload: dict = {
        "model": modelo,
        "max_tokens": max_tokens,
        "temperature": temperatura,
        "messages": msgs,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(OPENAI_URL, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise LLMError(
                f"Falha ao chamar OpenAI: HTTP {e.response.status_code} — "
                f"{e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise LLMError(f"Erro de rede ao chamar OpenAI: {e}") from e
        data = resp.json()

    choices = data.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    return msg.get("content") or ""


async def descrever_imagem_openai(
    *,
    api_key: str,
    modelo: str,
    imagem: bytes,
    mime: str | None,
    prompt: str | None = None,
) -> str:
    """Descreve uma imagem (OpenAI vision) reusando ``chamar_openai``.

    Monta uma mensagem multimodal (texto + ``image_url`` como data-URL base64).
    Devolve a descrição. Levanta ``LLMError`` em falha.
    """
    media_type = (mime or "image/jpeg").split(";")[0].strip() or "image/jpeg"
    b64 = base64.b64encode(imagem).decode()
    pergunta = prompt or "Descreva esta imagem em 1-2 frases, em português."
    content = [
        {"type": "text", "text": pergunta},
        {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
    ]
    return await chamar_openai(
        api_key=api_key,
        modelo=modelo,
        system=None,
        mensagens=[{"role": "user", "content": content}],
        temperatura=0.2,
        max_tokens=300,
    )
