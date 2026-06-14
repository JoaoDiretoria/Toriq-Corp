"""Testes de app.core.events — pub/sub de eventos com fallback gracioso.

Nenhum teste abre rede: o caminho exercitado é o de DEGRADAÇÃO (sem Redis).
Forçamos ``settings.redis_url = None`` para garantir que ``_cliente()`` devolva
None e o fallback (heartbeat / no-op) seja usado.

Cobre:
- ``_canal`` formata ``<prefixo>:eventos:<empresa_id>``.
- ``publicar`` NÃO levanta quando não há Redis (no-op silencioso).
- ``assinar`` (sem Redis) emite ao menos um heartbeat e encerra limpo.
"""
import asyncio
import uuid

import pytest

from app.core import events
from app.core.config import settings


@pytest.fixture
def sem_redis(monkeypatch):
    """Garante o caminho sem Redis (fallback) em todos os testes."""
    monkeypatch.setattr(settings, "redis_url", None)
    yield


def test_canal_formata_certo():
    empresa_id = uuid.uuid4()
    esperado = f"{settings.cache_prefix}:eventos:{empresa_id}"
    assert events._canal(empresa_id) == esperado


def test_cliente_none_sem_redis(sem_redis):
    assert events._cliente() is None


async def test_publicar_nao_levanta_sem_redis(sem_redis):
    # Não deve abrir rede nem levantar — no-op silencioso.
    await events.publicar(uuid.uuid4(), {"tipo": "lead_atualizado", "lead_id": "x"})


async def test_assinar_emite_heartbeat_sem_redis(sem_redis, monkeypatch):
    # Heartbeat curto para o teste ser rápido (sem rede, sem espera real longa).
    monkeypatch.setattr(events, "_HEARTBEAT_SEGUNDOS", 0.01)

    gen = events.assinar(uuid.uuid4())
    try:
        evento = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    finally:
        await gen.aclose()

    assert evento == {"tipo": "ping"}


async def test_assinar_encerra_limpo_no_aclose(sem_redis, monkeypatch):
    # Fechar o gerador (equivale ao disconnect) não deve levantar.
    monkeypatch.setattr(events, "_HEARTBEAT_SEGUNDOS", 0.01)
    gen = events.assinar(uuid.uuid4())
    await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    await gen.aclose()  # não deve levantar
