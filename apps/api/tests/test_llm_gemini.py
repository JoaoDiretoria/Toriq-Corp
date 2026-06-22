"""Testes da integração com a API Gemini (generateContent) — usada pelo SDR.

Mesma estratégia de ``test_llm_claude``/``test_llm_openai``: sem rede, com
``httpx.MockTransport``. Cobre montagem da URL (modelo + key na query), mapeamento
de papéis (``assistant`` -> ``model``), ``system`` -> ``system_instruction``,
extração de ``candidates[0].content.parts[].text`` e ``LLMError`` em falha.
"""
import json

import httpx
import pytest

from app.integrations.llm_gemini import (
    GEMINI_BASE_URL,
    chamar_gemini,
)
from app.integrations.llm_claude import LLMError


def _patch_transport(monkeypatch, handler):
    transport = httpx.MockTransport(handler)
    original_init = httpx.AsyncClient.__init__

    def fake_init(self, *args, **kwargs):
        kwargs["transport"] = transport
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", fake_init)


@pytest.mark.anyio
async def test_chamar_gemini_url_body_mapeia_papeis_e_system(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["url"] = str(request.url)
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {"content": {"role": "model", "parts": [{"text": "Olá"}, {"text": " mundo"}]}}
                ]
            },
        )

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_gemini(
        api_key="key-123",
        modelo="gemini-2.0-flash",
        system="Você é um SDR.",
        mensagens=[
            {"role": "user", "content": "Oi"},
            {"role": "assistant", "content": "Olá!"},
            {"role": "user", "content": "Tudo bem?"},
        ],
        temperatura=0.3,
        max_tokens=256,
    )

    # Concatena as parts de texto.
    assert resposta == "Olá mundo"

    # URL com modelo (endpoint generateContent) e key na query.
    assert capturado["url"].startswith(
        f"{GEMINI_BASE_URL}/gemini-2.0-flash:generateContent"
    )
    assert "key=key-123" in capturado["url"]

    body = capturado["body"]
    # system vira system_instruction.
    assert body["system_instruction"] == {"parts": [{"text": "Você é um SDR."}]}
    # assistant -> model; user -> user; cada um com parts[text].
    assert body["contents"] == [
        {"role": "user", "parts": [{"text": "Oi"}]},
        {"role": "model", "parts": [{"text": "Olá!"}]},
        {"role": "user", "parts": [{"text": "Tudo bem?"}]},
    ]
    assert body["generationConfig"]["temperature"] == 0.3
    assert body["generationConfig"]["maxOutputTokens"] == 256


@pytest.mark.anyio
async def test_chamar_gemini_sem_system_omite_instruction(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200, json={"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}
        )

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_gemini(
        api_key="k",
        modelo="gemini-2.0-flash",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )

    assert resposta == "ok"
    assert "system_instruction" not in capturado["body"]
    # Defaults aplicados.
    assert capturado["body"]["generationConfig"]["temperature"] == 0.7
    assert capturado["body"]["generationConfig"]["maxOutputTokens"] == 1024


@pytest.mark.anyio
async def test_chamar_gemini_resposta_vazia_retorna_string_vazia(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"candidates": []})

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_gemini(
        api_key="k",
        modelo="m",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )
    assert resposta == ""


@pytest.mark.anyio
async def test_chamar_gemini_erro_http_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": {"message": "bad key"}})

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError) as exc:
        await chamar_gemini(
            api_key="ruim",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
    assert "400" in str(exc.value)


@pytest.mark.anyio
async def test_chamar_gemini_erro_rede_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("conexão recusada")

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError):
        await chamar_gemini(
            api_key="k",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
