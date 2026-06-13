"""Testes da integração com a API da Anthropic (Claude).

Nenhum teste abre rede: ``chamar_claude`` é exercitado com um
``httpx.MockTransport`` injetado num ``httpx.AsyncClient`` via monkeypatch.
Cobre:
- ``extrair_json``: JSON puro, JSON embutido em texto, texto sem JSON -> None,
  JSON malformado -> None.
- ``chamar_claude``: monta headers/body corretos, concatena blocos ``text``,
  e erro HTTP vira ``LLMError``.
"""
import json

import httpx
import pytest

from app.integrations import llm_claude
from app.integrations.llm_claude import (
    ANTHROPIC_URL,
    ANTHROPIC_VERSION,
    LLMError,
    chamar_claude,
    extrair_json,
)


# ═══════════════════════════════════════════════════════════════════════════════
# extrair_json
# ═══════════════════════════════════════════════════════════════════════════════

def test_extrair_json_puro():
    assert extrair_json('{"score": 90, "status": "quente"}') == {
        "score": 90,
        "status": "quente",
    }


def test_extrair_json_embutido_em_texto():
    texto = 'Claro! Aqui vai a análise:\n{"score": 50, "status": "morno"}\nFim.'
    assert extrair_json(texto) == {"score": 50, "status": "morno"}


def test_extrair_json_texto_sem_json_retorna_none():
    assert extrair_json("Nenhum JSON aqui, apenas texto livre.") is None


def test_extrair_json_malformado_retorna_none():
    assert extrair_json('{"score": 90, "status": } isso quebra') is None


def test_extrair_json_vazio_retorna_none():
    assert extrair_json("") is None


def test_extrair_json_nao_objeto_retorna_none():
    # Um array não é objeto -> None (regex {.*} também não casaria).
    assert extrair_json("[1, 2, 3]") is None


# ═══════════════════════════════════════════════════════════════════════════════
# chamar_claude — httpx.MockTransport (sem rede)
# ═══════════════════════════════════════════════════════════════════════════════

def _patch_transport(monkeypatch, handler):
    """Faz o AsyncClient da integração usar um MockTransport com ``handler``."""
    transport = httpx.MockTransport(handler)
    original_init = httpx.AsyncClient.__init__

    def fake_init(self, *args, **kwargs):
        kwargs["transport"] = transport
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", fake_init)


@pytest.mark.anyio
async def test_chamar_claude_headers_body_e_concatena_text(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["url"] = str(request.url)
        capturado["headers"] = dict(request.headers)
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "content": [
                    {"type": "text", "text": "Olá"},
                    {"type": "thinking", "thinking": "ignore-me"},
                    {"type": "text", "text": " mundo"},
                ]
            },
        )

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_claude(
        api_key="sk-test-123",
        modelo="claude-sonnet-4-6",
        system="Você é um SDR.",
        mensagens=[{"role": "user", "content": "Oi"}],
        temperatura=0.3,
        max_tokens=256,
    )

    # Concatena apenas blocos type == "text".
    assert resposta == "Olá mundo"

    # URL e headers de autenticação/versão.
    assert capturado["url"] == ANTHROPIC_URL
    assert capturado["headers"]["x-api-key"] == "sk-test-123"
    assert capturado["headers"]["anthropic-version"] == ANTHROPIC_VERSION
    assert capturado["headers"]["content-type"] == "application/json"

    # Body correto.
    body = capturado["body"]
    assert body["model"] == "claude-sonnet-4-6"
    assert body["max_tokens"] == 256
    assert body["temperature"] == 0.3
    assert body["system"] == "Você é um SDR."
    assert body["messages"] == [{"role": "user", "content": "Oi"}]


@pytest.mark.anyio
async def test_chamar_claude_sem_system_omite_chave(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["body"] = json.loads(request.content)
        return httpx.Response(200, json={"content": [{"type": "text", "text": "ok"}]})

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_claude(
        api_key="k",
        modelo="claude-sonnet-4-6",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )

    assert resposta == "ok"
    # Sem system -> a chave não vai no payload; defaults aplicados.
    assert "system" not in capturado["body"]
    assert capturado["body"]["temperature"] == 0.7
    assert capturado["body"]["max_tokens"] == 1024


@pytest.mark.anyio
async def test_chamar_claude_resposta_vazia_retorna_string_vazia(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"content": []})

    _patch_transport(monkeypatch, handler)

    resposta = await chamar_claude(
        api_key="k",
        modelo="m",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )
    assert resposta == ""


@pytest.mark.anyio
async def test_chamar_claude_erro_http_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "invalid api key"}})

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError) as exc:
        await chamar_claude(
            api_key="ruim",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
    assert "401" in str(exc.value)


@pytest.mark.anyio
async def test_chamar_claude_erro_rede_vira_llmerror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("conexão recusada")

    _patch_transport(monkeypatch, handler)

    with pytest.raises(LLMError):
        await chamar_claude(
            api_key="k",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
