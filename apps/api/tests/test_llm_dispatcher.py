"""Testes do dispatcher de provedores de IA (``app.integrations.llm.chamar_llm``).

Não abrem rede: cada integração (chamar_claude/openai/gemini) é trocada por um
fake async via monkeypatch no namespace do módulo ``llm``. Verificam roteamento
por ``provider``, default para anthropic, repasse de argumentos e erro em
provedor desconhecido.
"""
import pytest

from app.integrations import llm
from app.integrations.llm import chamar_llm
from app.integrations.llm_claude import LLMError


def _fake(registro, marca):
    async def f(**kwargs):
        registro["marca"] = marca
        registro["kwargs"] = kwargs
        return f"resp-{marca}"

    return f


@pytest.mark.anyio
@pytest.mark.parametrize(
    "provider,marca",
    [("anthropic", "claude"), ("openai", "openai"), ("gemini", "gemini")],
)
async def test_chamar_llm_roteia_por_provider(monkeypatch, provider, marca):
    reg = {}
    monkeypatch.setattr(llm, "chamar_claude", _fake(reg, "claude"))
    monkeypatch.setattr(llm, "chamar_openai", _fake(reg, "openai"))
    monkeypatch.setattr(llm, "chamar_gemini", _fake(reg, "gemini"))

    resp = await chamar_llm(
        provider=provider,
        api_key="k",
        modelo="m",
        system="sys",
        mensagens=[{"role": "user", "content": "oi"}],
        temperatura=0.4,
        max_tokens=128,
    )

    assert resp == f"resp-{marca}"
    assert reg["marca"] == marca
    # Argumentos repassados sem provider (cada integração não conhece provider).
    assert reg["kwargs"] == {
        "api_key": "k",
        "modelo": "m",
        "system": "sys",
        "mensagens": [{"role": "user", "content": "oi"}],
        "temperatura": 0.4,
        "max_tokens": 128,
    }


@pytest.mark.anyio
async def test_chamar_llm_default_anthropic_quando_provider_none(monkeypatch):
    reg = {}
    monkeypatch.setattr(llm, "chamar_claude", _fake(reg, "claude"))
    monkeypatch.setattr(llm, "chamar_openai", _fake(reg, "openai"))
    monkeypatch.setattr(llm, "chamar_gemini", _fake(reg, "gemini"))

    resp = await chamar_llm(
        provider=None,
        api_key="k",
        modelo="m",
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
    )
    assert resp == "resp-claude"
    assert reg["marca"] == "claude"


@pytest.mark.anyio
async def test_chamar_llm_provider_desconhecido_vira_llmerror():
    with pytest.raises(LLMError):
        await chamar_llm(
            provider="xpto",
            api_key="k",
            modelo="m",
            system=None,
            mensagens=[{"role": "user", "content": "x"}],
        )
