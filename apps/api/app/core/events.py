"""Eventos em tempo real via Redis pub/sub (Toriq Vendas — Pipeline/Conversas).

Modelo simples de publicação/assinatura por empresa: o backend PUBLICA eventos
(nova mensagem, lead movido, lead atualizado) e o SSE assina o canal da empresa
para retransmitir ao front.

Regras de ouro (iguais ao ``app.core.cache``):
- Se ``settings.redis_url`` não estiver configurada (ou ``redis`` faltar), o
  pub/sub degrada graciosamente: ``publicar`` vira no-op silencioso e ``assinar``
  apenas emite heartbeats periódicos. A aplicação NUNCA quebra por falta de Redis.
- Erros de conexão/Redis NUNCA propagam para fora destas funções.

Tipos de evento (string em ``evento["tipo"]``):
``"conversa_nova_mensagem"``, ``"lead_atualizado"``, ``"lead_movido"``.
Sempre inclua ``evento["lead_id"]`` quando aplicável.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncGenerator

from app.core.config import settings

logger = logging.getLogger("toriq.eventos")

try:  # redis é dep de runtime, mas degrade se faltar por algum motivo.
    import redis.asyncio as aioredis
except Exception:  # pragma: no cover
    aioredis = None  # type: ignore[assignment]

# Intervalo do heartbeat quando NÃO há Redis (mantém a conexão SSE viva).
_HEARTBEAT_SEGUNDOS = 15


def _canal(empresa_id: Any) -> str:
    """Nome do canal pub/sub da empresa: ``<prefixo>:eventos:<empresa_id>``."""
    return f"{settings.cache_prefix}:eventos:{empresa_id}"


def _cliente() -> Any | None:
    """Cria um cliente redis.asyncio, ou None se indisponível (no-op gracioso)."""
    url = settings.redis_url
    if not url or aioredis is None:
        return None
    try:
        return aioredis.from_url(url, encoding="utf-8", decode_responses=True)
    except Exception as exc:  # pragma: no cover
        logger.warning("Redis pub/sub indisponível (%s); eventos desligados.", exc)
        return None


async def publicar(empresa_id: Any, evento: dict) -> None:
    """Publica ``evento`` (JSON) no canal da empresa.

    Sem Redis configurado, ou em qualquer erro, é um no-op silencioso — nunca
    levanta para fora.
    """
    client = _cliente()
    if client is None:
        return
    try:
        await client.publish(_canal(empresa_id), json.dumps(evento, default=str))
    except Exception as exc:
        logger.debug("publicar evento falhou (%s) — ignorado.", exc)
    finally:
        try:
            await client.aclose()
        except Exception:  # pragma: no cover
            pass


async def assinar(empresa_id: Any) -> AsyncGenerator[dict, None]:
    """Async generator que dá ``yield`` em eventos recebidos no canal da empresa.

    - COM Redis: assina o canal e retransmite cada mensagem decodificada.
    - SEM Redis (ou erro): apenas dorme e emite ``{"tipo": "ping"}`` a cada
      ~15s, mantendo a conexão SSE viva.
    - Encerra limpo no ``CancelledError`` (disconnect do cliente). Nunca levanta
      para fora.
    """
    client = _cliente()
    if client is None:
        # Fallback sem Redis: só heartbeats.
        try:
            while True:
                await asyncio.sleep(_HEARTBEAT_SEGUNDOS)
                yield {"tipo": "ping"}
        except asyncio.CancelledError:  # pragma: no cover
            return
        return

    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(_canal(empresa_id))
        while True:
            try:
                msg = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=_HEARTBEAT_SEGUNDOS,
                )
            except asyncio.CancelledError:  # pragma: no cover
                raise
            except Exception as exc:  # pragma: no cover
                logger.debug("get_message falhou (%s) — heartbeat.", exc)
                yield {"tipo": "ping"}
                continue
            if msg is None:
                # Timeout sem mensagens → heartbeat para manter a conexão viva.
                yield {"tipo": "ping"}
                continue
            dado = msg.get("data")
            if dado is None:
                continue
            try:
                yield json.loads(dado)
            except Exception:  # pragma: no cover
                # Conteúdo não-JSON: ignora silenciosamente.
                continue
    except asyncio.CancelledError:  # pragma: no cover
        # Disconnect do cliente: encerra a subscription limpo.
        return
    finally:
        try:
            await pubsub.unsubscribe(_canal(empresa_id))
        except Exception:  # pragma: no cover
            pass
        try:
            await pubsub.aclose()
        except Exception:  # pragma: no cover
            pass
        try:
            await client.aclose()
        except Exception:  # pragma: no cover
            pass
