"""Testes da integração com a API da OpenAI (Chat Completions) — usada pelo SDR.

Mesma estratégia de ``test_llm_claude``: nenhum teste abre rede; o
``httpx.AsyncClient`` da integração recebe um ``httpx.MockTransport`` via
monkeypatch. Cobre montagem de headers/body (incl. ``system`` como 1ª mensagem),
extração de ``choices[0].message.content`` e conversão de falha em ``LLMError``.
"""
import json

import httpx
import pytest

from app.integrations.llm_openai import (
    OPENAI_URL,
    chamar_openai,
)
from app.integrations.llm_claude import LLMError


def _patch_transport(monkeypatch, handler):
    """Faz o AsyncClient da integração usar um MockTransport com ``handler``."""
    transport = httpx.MockTransport(handler)
    original_init = httpx.AsyncClient.__init__

    def fake_init(self, *args, **kwargs):
        kwargs["transport"] = transport
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", fake_init)


@pytest.mark.anyio
async def test_chamar_openai_headers_body_com_system(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["url"] = str(request.url)
        capturado["headers"] = dict(request.headers)
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"role": "assistant", "content": "Olá mundo"}}]},
        )

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_openai(
        api_key="sk-test-123",
        modelo="gpt-4o",
        system="Você é um SDR.",
        mensagens=[{"role": "user", "content": "Oi"}],
        temperatura=0.3,
        max_tokens=256,
    )

    assert resposta == "Olá mundo"
    assert capturado["url"] == OPENAI_URL
    assert capturado["headers"]["authorization"] == "Bearer sk-test-123"
    assert capturado["headers"]["content-type"] == "application/json"

    body = capturado["body"]
    assert body["model"] == "gpt-4o"
    assert body["max_tokens"] == 256
    assert body["temperature"] == 0.3
    # system entra como PRIMEIRA mensagem (role=system), seguido das demais.
    assert body["messages"] == [
        {"role": "system", "content": "Você é um SDR."},
        {"role": "user", "content": "Oi"},
    ]


@pytest.mark.anyio
async def test_chamar_openai_sem_system_nao_adiciona_mensagem_system(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "ok"}}]}
        )

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_openai(
        api_key="k",
        modelo="gpt-4o-mini",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )

    assert resposta == "ok"
    assert capturado["body"]["messages"] == [{"role": "user", "content": "x"}]
    # Defaults aplicados.
    assert capturado["body"]["temperature"] == 0.7
    assert capturado["body"]["max_tokens"] == 1024


@pytest.mark.anyio
async def test_chamar_openai_resposta_vazia_retorna_string_vazia(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": []})

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_openai(
        api_key="k",
        modelo="m",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )
    assert resposta == ""


@pytest.mark.anyio
async def test_chamar_openai_erro_http_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "invalid api key"}})

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError) as exc:
        await chamar_openai(
            api_key="ruim",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
    assert "401" in str(exc.value)


@pytest.mark.anyio
async def test_chamar_openai_erro_rede_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("conexão recusada")

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError):
        await chamar_openai(
            api_key="k",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
