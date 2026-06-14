"""Testes do cache/fila com fallback gracioso (sem Redis configurado).

No ambiente de teste não há REDIS_URL, então o cache fica desligado (get -> None,
get_or_set chama o factory) e a fila roda inline (enqueue -> handler na hora).
Isso garante que a aplicação NUNCA depende do Redis para funcionar.
"""
import pytest

from app.core.cache import cache
from app.core import queue as queue_mod


@pytest.mark.anyio
async def test_cache_desligado_get_or_set_chama_factory():
    chamadas = {"n": 0}

    async def factory():
        chamadas["n"] += 1
        return {"valor": 42}

    r1 = await cache.get_or_set("teste:x", ttl=10, factory=factory)
    r2 = await cache.get_or_set("teste:x", ttl=10, factory=factory)
    assert r1 == {"valor": 42}
    assert r2 == {"valor": 42}
    # Sem Redis não há cache: o factory roda nas duas chamadas.
    assert chamadas["n"] == 2


@pytest.mark.anyio
async def test_cache_get_retorna_none_sem_redis():
    assert await cache.get("inexistente:y") is None


@pytest.mark.anyio
async def test_try_lock_sem_redis_sempre_concede():
    # Sem Redis não há lock distribuído: try_lock concede sempre (nunca bloqueia
    # o trabalho). release_lock é no-op gracioso.
    assert await cache.try_lock("campanha:abc", ttl=60) is True
    assert await cache.try_lock("campanha:abc", ttl=60) is True
    await cache.release_lock("campanha:abc")


@pytest.mark.anyio
async def test_fila_enqueue_roda_inline_sem_redis():
    recebido = {}

    @queue_mod.register("__teste_job__")
    async def _h(payload):
        recebido.update(payload)

    await queue_mod.queue.enqueue("__teste_job__", {"ok": True})
    # Sem Redis o enqueue executa o handler imediatamente (inline).
    assert recebido == {"ok": True}
