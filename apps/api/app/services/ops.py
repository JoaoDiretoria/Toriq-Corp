"""Lógica do dashboard Ops/Suporte: health, banco, redis, tickets, usuários, auditoria.

Tudo aqui é read-only, exceto as funções de gestão de usuários/auditoria.
Acesso ao Redis é feito pelos clients de app.core.cache / app.core.queue.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.config import settings
from app.core.queue import queue


async def _db_ok(db: AsyncSession) -> tuple[bool, str | None]:
    try:
        await db.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


async def _redis_ok() -> tuple[bool, str | None]:
    client = cache._get_client()
    if client is None:
        return False, "Redis desligado (REDIS_URL ausente)"
    try:
        await client.ping()
        return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


async def fila_profundidade() -> int | None:
    """Nº de jobs aguardando na lista Redis da fila. None se sem Redis."""
    client = queue._get_client()
    if client is None:
        return None
    try:
        return int(await client.llen(f"{settings.cache_prefix}:queue"))
    except Exception:  # pragma: no cover
        return None


async def montar_health(db: AsyncSession) -> dict:
    db_ok, db_detalhe = await _db_ok(db)
    redis_ok, redis_detalhe = await _redis_ok()
    deps = [
        {"nome": "postgres", "ok": db_ok, "detalhe": db_detalhe},
        {"nome": "redis", "ok": redis_ok, "detalhe": redis_detalhe},
    ]
    # Redis é opcional (degradação graciosa): não derruba o status geral.
    status = "ok" if db_ok else "degradado"
    return {
        "status": status,
        "dependencias": deps,
        "fila_profundidade": await fila_profundidade(),
    }
