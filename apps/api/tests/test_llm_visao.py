"""Testes do roteamento de VISÃO multimodal do SDR (descrever imagem por provedor).

Sem rede (httpx.MockTransport). Cobre a montagem do payload multimodal de
OpenAI (image_url data-URL) e Gemini (inline_data base64), a extração do texto e
o dispatcher ``descrever_imagem_llm`` (roteia por provider).
"""
import base64
import json

import httpx
import pytest

from app.integrations import llm
from app.integrations.llm import descrever_imagem_llm
from app.integrations.llm_gemini import descrever_imagem_gemini
from app.integrations.llm_openai import descrever_imagem_openai


def _patch_transport(monkeypatch, handler):
    transport = httpx.MockTransport(handler)
    original_init = httpx.AsyncClient.__init__

    def fake_init(self, *args, **kwargs):
        kwargs["transport"] = transport
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", fake_init)


@pytest.mark.anyio
async def test_descrever_imagem_openai_monta_image_url_e_parseia(monkeypatch):
    capturado = {}
    imagem = b"img-bytes"

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "um print de produto"}}]}
        )

    _patch_transport(monkeypatch, handler)

    desc = await descrever_imagem_openai(
        api_key="sk", modelo="gpt-4o", imagem=imagem, mime="image/png",
        prompt="Descreva.",
    )

    assert desc == "um print de produto"
    content = capturado["body"]["messages"][-1]["content"]
    b64 = base64.b64encode(imagem).decode()
    assert {"type": "text", "text": "Descreva."} in content
    assert {
        "type": "image_url",
        "image_url": {"url": f"data:image/png;base64,{b64}"},
    } in content


@pytest.mark.anyio
async def test_descrever_imagem_gemini_monta_inline_data_e_parseia(monkeypatch):
    capturado = {}
    imagem = b"img-bytes"

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": "um documento"}]}}]},
        )

    _patch_transport(monkeypatch, handler)

    desc = await descrever_imagem_gemini(
        api_key="k", modelo="gemini-2.0-flash", imagem=imagem, mime="image/jpeg",
        prompt="Descreva.",
    )

    assert desc == "um documento"
    parts = capturado["body"]["contents"][0]["parts"]
    b64 = base64.b64encode(imagem).decode()
    assert {"text": "Descreva."} in parts
    assert {"inline_data": {"mime_type": "image/jpeg", "data": b64}} in parts


@pytest.mark.anyio
@pytest.mark.parametrize(
    "provider,alvo",
    [
        ("anthropic", "descrever_imagem"),
        ("openai", "descrever_imagem_openai"),
        ("gemini", "descrever_imagem_gemini"),
    ],
)
async def test_descrever_imagem_llm_roteia_por_provider(monkeypatch, provider, alvo):
    reg = {}

    def _fake(marca):
        async def f(**kwargs):
            reg["marca"] = marca
            return f"desc-{marca}"

        return f

    monkeypatch.setattr(llm, "descrever_imagem", _fake("descrever_imagem"))
    monkeypatch.setattr(llm, "descrever_imagem_openai", _fake("descrever_imagem_openai"))
    monkeypatch.setattr(llm, "descrever_imagem_gemini", _fake("descrever_imagem_gemini"))

    desc = await descrever_imagem_llm(
        provider=provider, api_key="k", modelo="m", imagem=b"x", mime="image/png",
    )
    assert desc == f"desc-{alvo}"
    assert reg["marca"] == alvo
