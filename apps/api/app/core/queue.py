"""Fila durável em Redis com fallback inline (Toriq — performance).

Permite tirar trabalho pesado do caminho da requisição (envio de campanha,
qualificação SDR em lote, import de scraping, resposta autônoma do SDR) sem
bloquear a resposta HTTP.

Modelo:
- ``register(nome)`` registra um handler async ``fn(payload: dict)``.
- ``enqueue(nome, payload)`` empilha o job:
    * COM Redis  → RPUSH numa lista; o consumidor (start_consumer) processa.
    * SEM Redis  → executa o handler INLINE (await) na hora — a app funciona
      igual, só sem assincronismo distribuído.
- ``start_consumer()`` roda em loop (asyncio task no lifespan do FastAPI),
  fazendo BLPOP e despachando para o handler. Erros são logados e não derrubam
  o loop. Jobs sem handler registrado são descartados com aviso.

Idempotência/retry ficam a cargo dos handlers (cada um já é seguro p/ reexecução).
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Optional

from app.core.config import settings

logger = logging.getLogger("toriq.queue")

try:
    import redis.asyncio as aioredis
    from redis.exceptions import (
        ConnectionError as RedisConnectionError,
        TimeoutError as RedisTimeoutError,
    )
except Exception:  # pragma: no cover
    aioredis = None  # type: ignore[assignment]

    class RedisConnectionError(Exception):  # type: ignore[no-redef]
        ...

    class RedisTimeoutError(Exception):  # type: ignore[no-redef]
        ...

Handler = Callable[[dict], Awaitable[None]]
_handlers: dict[str, Handler] = {}

# Poll da fila: LPOP rápido + sleep, em vez de BLPOP bloqueante. Um BLPOP que
# bloqueia mais que o ``socket_timeout`` da conexão estoura "Timeout reading
# from ..." a cada ciclo ocioso. O LPOP é uma ida-e-volta curta e não conflita
# com esse timeout.
_POLL_INTERVAL_SECONDS = 1.0
_REDIS_BACKOFF_SECONDS = 5.0


def register(nome: str) -> Callable[[Handler], Handler]:
    """Decorator que registra um handler de tarefa pelo nome."""

    def _wrap(fn: Handler) -> Handler:
        _handlers[nome] = fn
        return fn

    return _wrap


def register_handler(nome: str, fn: Handler) -> None:
    _handlers[nome] = fn


class _Queue:
    def __init__(self) -> None:
        self._client: Optional[Any] = None
        self._disabled = False
        self._stop = False

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
            logger.warning("Fila Redis indisponível (%s); rodando inline.", exc)
            self._disabled = True
            return None
        return self._client

    @property
    def _list_key(self) -> str:
        return f"{settings.cache_prefix}:queue"

    async def enqueue(self, nome: str, payload: dict | None = None) -> None:
        payload = payload or {}
        client = self._get_client()
        if client is None:
            # Sem Redis: executa inline (não perde o trabalho).
            await self._dispatch(nome, payload)
            return
        try:
            await client.rpush(
                self._list_key, json.dumps({"task": nome, "payload": payload})
            )
        except Exception as exc:
            logger.warning("enqueue falhou (%s) — rodando inline.", exc)
            await self._dispatch(nome, payload)

    async def _dispatch(self, nome: str, payload: dict) -> None:
        fn = _handlers.get(nome)
        if fn is None:
            logger.warning("Job sem handler registrado: %s (descartado).", nome)
            return
        try:
            await fn(payload)
        except Exception:
            logger.exception("Handler da tarefa %s falhou.", nome)

    async def start_consumer(self) -> None:
        """Loop do consumidor (rodar como asyncio task). No-op sem Redis.

        Usa LPOP com poll curto em vez de BLPOP bloqueante: um BLPOP que bloqueia
        mais que o ``socket_timeout`` da conexão lança "Timeout reading from ..." a
        cada ciclo ocioso, poluindo o log. LPOP é uma ida-e-volta rápida (não
        conflita com o socket_timeout) e mantém a ordem FIFO (RPUSH na cauda,
        LPOP na cabeça).
        """
        client = self._get_client()
        if client is None:
            logger.info("Fila sem Redis: consumidor não inicia (modo inline).")
            return
        logger.info(
            "Consumidor da fila iniciado (Redis, poll=%ss).", _POLL_INTERVAL_SECONDS
        )
        self._stop = False
        falhas_redis = 0
        while not self._stop:
            try:
                raw = await client.lpop(self._list_key)
                falhas_redis = 0
                if raw is None:
                    await asyncio.sleep(_POLL_INTERVAL_SECONDS)
                    continue
                msg = json.loads(raw)
                await self._dispatch(msg.get("task", ""), msg.get("payload") or {})
            except asyncio.CancelledError:  # pragma: no cover
                break
            except (RedisConnectionError, RedisTimeoutError) as exc:
                # Redis indisponível/lento: backoff e log parcimonioso (1ª falha e
                # depois a cada ~30 ciclos) — não inunda o log nem esconde uma
                # queda real do Redis.
                falhas_redis += 1
                if falhas_redis == 1 or falhas_redis % 30 == 0:
                    logger.warning(
                        "Fila: Redis indisponível (%s); tentando de novo.", exc
                    )
                await asyncio.sleep(_REDIS_BACKOFF_SECONDS)
            except Exception as exc:
                logger.warning("Erro no loop da fila (%s); continuando.", exc)
                await asyncio.sleep(1)

    def stop(self) -> None:
        self._stop = True

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:  # pragma: no cover
                pass
            self._client = None


queue = _Queue()
