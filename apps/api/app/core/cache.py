"""Cache Redis com fallback gracioso (Toriq — performance).

Uso típico::

    from app.core.cache import cache

    dados = await cache.get_or_set(
        f"uso:{empresa_id}", ttl=60, factory=lambda: calcular_uso(...)
    )

Regras de ouro:
- Se ``settings.redis_url`` não estiver configurada, o cache fica DESLIGADO:
  ``get`` sempre devolve None e ``get_or_set`` apenas chama o ``factory``. A app
  funciona normalmente, só sem cache.
- Erros de conexão/Redis NUNCA propagam: viram cache-miss. O objetivo é acelerar,
  jamais quebrar a requisição.
- Valores são serializados em JSON. Chaves são prefixadas por ``settings.cache_prefix``.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Awaitable, Callable, Optional

from app.core.config import settings

logger = logging.getLogger("toriq.cache")

try:  # redis é dep de runtime, mas degrade se faltar por algum motivo.
    import redis.asyncio as aioredis
except Exception:  # pragma: no cover
    aioredis = None  # type: ignore[assignment]


class _Cache:
    """Wrapper fino sobre redis.asyncio, tolerante a falhas."""

    def __init__(self) -> None:
        self._client: Optional[Any] = None
        self._disabled = False

    def _get_client(self) -> Optional[Any]:
        if self._disabled:
            return None
        if self._client is not None:
            return self._client
        url = settings.redis_url
        if not url or aioredis is None:
            self._disabled = True
            return None
        try:
            self._client = aioredis.from_url(
                url, encoding="utf-8", decode_responses=True
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Cache Redis indisponível (%s); cache desligado.", exc)
            self._disabled = True
            return None
        return self._client

    def _k(self, key: str) -> str:
        return f"{settings.cache_prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        client = self._get_client()
        if client is None:
            return None
        try:
            raw = await client.get(self._k(key))
            return json.loads(raw) if raw is not None else None
        except Exception as exc:
            logger.debug("cache.get falhou (%s) — tratando como miss.", exc)
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        client = self._get_client()
        if client is None:
            return
        try:
            await client.set(
                self._k(key),
                json.dumps(value, default=str),
                ex=ttl if ttl is not None else settings.cache_ttl_seconds,
            )
        except Exception as exc:
            logger.debug("cache.set falhou (%s) — ignorado.", exc)

    async def delete(self, *keys: str) -> None:
        client = self._get_client()
        if client is None or not keys:
            return
        try:
            await client.delete(*[self._k(k) for k in keys])
        except Exception as exc:
            logger.debug("cache.delete falhou (%s) — ignorado.", exc)

    async def delete_prefixo(self, prefixo: str) -> None:
        """Apaga todas as chaves que começam com ``prefixo`` (invalidação em lote)."""
        client = self._get_client()
        if client is None:
            return
        try:
            padrao = self._k(prefixo) + "*"
            async for chave in client.scan_iter(match=padrao, count=200):
                await client.delete(chave)
        except Exception as exc:
            logger.debug("cache.delete_prefixo falhou (%s) — ignorado.", exc)

    async def try_lock(self, key: str, ttl: int) -> bool:
        """Tenta adquirir um lock distribuído (SET NX EX). Retorna True se pegou.

        SEM Redis (ou em erro), retorna SEMPRE True: não há lock, mas o trabalho
        nunca é bloqueado — comportamento idêntico ao de antes do lock existir.
        """
        client = self._get_client()
        if client is None:
            return True
        try:
            return bool(
                await client.set(self._k(f"lock:{key}"), "1", nx=True, ex=ttl)
            )
        except Exception as exc:
            logger.debug("try_lock falhou (%s) — seguindo sem lock.", exc)
            return True

    async def release_lock(self, key: str) -> None:
        """Libera um lock adquirido por ``try_lock``. Best-effort."""
        await self.delete(f"lock:{key}")

    async def get_or_set(
        self,
        key: str,
        ttl: Optional[int],
        factory: Callable[[], Awaitable[Any]],
    ) -> Any:
        """Devolve o valor cacheado ou calcula via ``factory`` e cacheia.

        Em qualquer falha de cache, cai direto no ``factory`` (sem cachear).
        """
        cached = await self.get(key)
        if cached is not None:
            return cached
        valor = await factory()
        if valor is not None:
            await self.set(key, valor, ttl)
        return valor

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:  # pragma: no cover
                pass
            self._client = None


cache = _Cache()
