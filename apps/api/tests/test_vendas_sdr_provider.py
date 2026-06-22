"""Testes de roteamento multi-provedor do SDR (helper ``_chamar_ia``).

Unitários, sem DB e sem rede: constroem um ``VendasSdrConfig`` em memória (com a
chave criptografada de verdade via esocial_crypto) e trocam
``app.services.vendas_sdr.chamar_llm`` por um fake async que registra os kwargs.
Verificam: provider repassado, chave decriptada, modelo-default por provedor,
resolução de temperatura (config vs. override) e max_tokens.
"""
import pytest

from app.core.esocial_crypto import encrypt_secret
from app.models.vendas_sdr import VendasSdrConfig
from app.services import vendas_sdr as svc


def _fake_llm(reg):
    async def f(**kwargs):
        reg.update(kwargs)
        return "resposta-fake"

    return f


@pytest.mark.anyio
async def test_chamar_ia_openai_usa_modelo_default_e_temperatura_da_config(monkeypatch):
    reg = {}
    monkeypatch.setattr(svc, "chamar_llm", _fake_llm(reg))

    cfg = VendasSdrConfig(
        provider="openai",
        api_key_enc=encrypt_secret("sk-openai-secreto"),
        modelo=None,
        temperatura=None,
    )

    out = await svc._chamar_ia(
        cfg, system="s", mensagens=[{"role": "user", "content": "oi"}]
    )

    assert out == "resposta-fake"
    assert reg["provider"] == "openai"
    assert reg["api_key"] == "sk-openai-secreto"
    assert reg["modelo"] == "gpt-4o"  # default do provedor openai
    assert reg["system"] == "s"
    assert reg["mensagens"] == [{"role": "user", "content": "oi"}]
    assert reg["temperatura"] == 0.7  # config None -> 0.7
    assert reg["max_tokens"] == 1024  # default


@pytest.mark.anyio
async def test_chamar_ia_gemini_default(monkeypatch):
    reg = {}
    monkeypatch.setattr(svc, "chamar_llm", _fake_llm(reg))

    cfg = VendasSdrConfig(
        provider="gemini",
        api_key_enc=encrypt_secret("k"),
        modelo=None,
        temperatura=None,
    )
    await svc._chamar_ia(cfg, system=None, mensagens=[{"role": "user", "content": "x"}])

    assert reg["provider"] == "gemini"
    assert reg["modelo"] == "gemini-2.0-flash"  # default do provedor gemini


@pytest.mark.anyio
async def test_chamar_ia_respeita_modelo_da_config_e_overrides(monkeypatch):
    reg = {}
    monkeypatch.setattr(svc, "chamar_llm", _fake_llm(reg))

    cfg = VendasSdrConfig(
        provider="gemini",
        api_key_enc=encrypt_secret("k"),
        modelo="gemini-1.5-pro",
        temperatura=0.5,
    )

    await svc._chamar_ia(
        cfg,
        system=None,
        mensagens=[{"role": "user", "content": "x"}],
        temperatura=0.3,  # override explícito (ex.: fase 2 do CoT)
        max_tokens=800,
    )

    assert reg["modelo"] == "gemini-1.5-pro"  # respeita modelo da config
    assert reg["temperatura"] == 0.3  # override tem precedência sobre config
    assert reg["max_tokens"] == 800


@pytest.mark.anyio
async def test_chamar_ia_anthropic_default_quando_provider_vazio(monkeypatch):
    reg = {}
    monkeypatch.setattr(svc, "chamar_llm", _fake_llm(reg))

    cfg = VendasSdrConfig(
        provider=None,
        api_key_enc=encrypt_secret("k"),
        modelo=None,
        temperatura=None,
    )
    await svc._chamar_ia(cfg, system=None, mensagens=[{"role": "user", "content": "x"}])

    assert reg["provider"] is None  # repassa como veio; dispatcher trata o default
    assert reg["modelo"] == "claude-sonnet-4-6"  # default anthropic
