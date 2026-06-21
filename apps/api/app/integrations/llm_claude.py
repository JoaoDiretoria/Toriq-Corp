"""Integração com a API da Anthropic (Claude) — usada pelo SDR Inteligente.

Cliente stateless e mínimo sobre a API Messages da Anthropic (httpx). Não há
SDK próprio: falamos direto com o endpoint REST, montando os headers de
autenticação/versão e extraindo o texto dos blocos de conteúdo da resposta.

Componentes:
- ``chamar_claude``: faz um POST na API Messages e devolve o texto concatenado
  dos blocos ``type == "text"`` da resposta.
- ``extrair_json``: tenta achar/parsear o primeiro objeto JSON dentro de um
  texto livre (útil para parsear o resultado da qualificação de leads).
- ``LLMError``: erro de domínio levantado em falhas de chamada (HTTP ou rede).
"""
from __future__ import annotations

import json
import re

import httpx

# ═══════════════════════════════════════════════════════════════════════════════
# Constantes da API Messages da Anthropic
# ═══════════════════════════════════════════════════════════════════════════════
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

_TIMEOUT = 60.0


class LLMError(Exception):
    """Erro ao falar com a API da Anthropic (HTTP ou rede)."""


async def chamar_claude(
    *,
    api_key: str,
    modelo: str,
    system: str | None,
    mensagens: list[dict],
    temperatura: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Chama a API Messages do Claude e devolve o texto da resposta.

    ``mensagens`` é uma lista de ``{"role": "user"|"assistant", "content": str}``.
    Extrai e concatena os blocos ``type == "text"`` de ``data["content"]``.

    Levanta ``LLMError`` em qualquer falha HTTP ou de rede.
    """
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    payload: dict = {
        "model": modelo,
        "max_tokens": max_tokens,
        "temperature": temperatura,
        **({"system": system} if system else {}),
        "messages": mensagens,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(ANTHROPIC_URL, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise LLMError(
                f"Falha ao chamar Claude: HTTP {e.response.status_code} — "
                f"{e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise LLMError(f"Erro de rede ao chamar Claude: {e}") from e
        data = resp.json()

    blocos = data.get("content") or []
    partes = [
        b.get("text", "")
        for b in blocos
        if isinstance(b, dict) and b.get("type") == "text"
    ]
    return "".join(partes)


async def descrever_imagem(
    *, api_key: str, modelo: str, imagem: bytes, mime: str | None,
    prompt: str | None = None,
) -> str:
    """Descreve uma imagem recebida (Claude vision) em pt-BR, p/ alimentar o SDR.

    Reusa ``chamar_claude`` passando um bloco de imagem (base64) + um bloco de
    texto. Retorna a descrição (string). Levanta ``LLMError`` em falha.
    """
    import base64

    media_type = (mime or "image/jpeg").split(";")[0].strip() or "image/jpeg"
    b64 = base64.b64encode(imagem).decode()
    pergunta = prompt or (
        "Descreva esta imagem em 1-2 frases, em português, focando o que é "
        "relevante para um atendimento de vendas (ex.: produto, documento, print)."
    )
    blocos = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        },
        {"type": "text", "text": pergunta},
    ]
    return await chamar_claude(
        api_key=api_key, modelo=modelo, system=None,
        mensagens=[{"role": "user", "content": blocos}],
        temperatura=0.2, max_tokens=300,
    )


def extrair_json(texto: str) -> dict | None:
    """Tenta extrair o primeiro objeto JSON contido em ``texto``.

    Procura do primeiro ``{`` ao último ``}`` e tenta ``json.loads``. Devolve o
    dict resultante ou ``None`` se não houver JSON válido (texto sem JSON ou
    JSON malformado nunca explode).
    """
    if not texto:
        return None
    m = re.search(r"\{.*\}", texto, re.DOTALL)
    if not m:
        return None
    try:
        resultado = json.loads(m.group(0))
    except (ValueError, TypeError):
        return None
    return resultado if isinstance(resultado, dict) else None
