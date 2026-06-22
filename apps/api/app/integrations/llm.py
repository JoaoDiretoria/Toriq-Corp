"""Dispatcher de provedores de IA do SDR.

Ponto único de entrada para o serviço falar com qualquer provedor (Anthropic,
OpenAI, Gemini) sem conhecer suas diferenças. Roteia por ``provider`` e repassa
os mesmos argumentos para a integração correspondente — todas têm a mesma
assinatura e devolvem texto puro, levantando ``LLMError`` em falha.

``LLMError`` e ``extrair_json`` são re-exportados de ``llm_claude`` para que o
restante do código importe tudo de um lugar só.
"""
from __future__ import annotations

from app.integrations.llm_claude import (
    LLMError,
    chamar_claude,
    descrever_imagem,
    extrair_json,
)
from app.integrations.llm_gemini import chamar_gemini, descrever_imagem_gemini
from app.integrations.llm_openai import chamar_openai, descrever_imagem_openai

__all__ = [
    "LLMError",
    "extrair_json",
    "chamar_llm",
    "descrever_imagem_llm",
    "modelo_padrao",
]

# Modelo default por provedor (chat e visão). Usado quando a config não fixa um.
MODELO_PADRAO = {
    "anthropic": "claude-sonnet-4-6",
    "openai": "gpt-4o",
    "gemini": "gemini-2.0-flash",
}


def modelo_padrao(provider: str | None) -> str:
    return MODELO_PADRAO.get((provider or "anthropic").lower(), "claude-sonnet-4-6")


# Prompt default de visão (pt-BR), focado em atendimento de vendas.
_PROMPT_VISAO_PADRAO = (
    "Descreva esta imagem em 1-2 frases, em português, focando o que é "
    "relevante para um atendimento de vendas (ex.: produto, documento, print)."
)


async def chamar_llm(
    *,
    provider: str | None,
    api_key: str,
    modelo: str,
    system: str | None,
    mensagens: list[dict],
    temperatura: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Roteia a chamada de IA para o provedor configurado.

    ``provider`` aceita ``anthropic`` (default), ``openai`` ou ``gemini``.
    Provedor desconhecido → ``LLMError``.
    """
    p = (provider or "anthropic").lower()
    kwargs = dict(
        api_key=api_key,
        modelo=modelo,
        system=system,
        mensagens=mensagens,
        temperatura=temperatura,
        max_tokens=max_tokens,
    )
    if p == "anthropic":
        return await chamar_claude(**kwargs)
    if p == "openai":
        return await chamar_openai(**kwargs)
    if p == "gemini":
        return await chamar_gemini(**kwargs)
    raise LLMError(f"provedor de IA desconhecido: {provider}")


async def descrever_imagem_llm(
    *,
    provider: str | None,
    api_key: str,
    modelo: str,
    imagem: bytes,
    mime: str | None,
    prompt: str | None = None,
) -> str:
    """Roteia a descrição de imagem (visão) para o provedor configurado.

    ``provider``: ``anthropic`` (default), ``openai`` ou ``gemini``. Provedor
    desconhecido → ``LLMError``.
    """
    p = (provider or "anthropic").lower()
    pr = prompt or _PROMPT_VISAO_PADRAO
    kwargs = dict(api_key=api_key, modelo=modelo, imagem=imagem, mime=mime, prompt=pr)
    if p == "anthropic":
        return await descrever_imagem(**kwargs)
    if p == "openai":
        return await descrever_imagem_openai(**kwargs)
    if p == "gemini":
        return await descrever_imagem_gemini(**kwargs)
    raise LLMError(f"provedor de IA desconhecido: {provider}")
