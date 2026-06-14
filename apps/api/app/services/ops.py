"""Lógica do dashboard Ops/Suporte: health, banco, redis, tickets, usuários, auditoria.

Tudo aqui é read-only, exceto as funções de gestão de usuários/auditoria.
Acesso ao Redis é feito pelos clients de app.core.cache / app.core.queue.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.config import settings
from app.core.db import engine
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


_DB_STATS_SQL = text(
    """
    SELECT schemaname AS schema_, relname AS nome,
           n_live_tup AS linhas,
           pg_total_relation_size(relid) AS tamanho_bytes
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    """
)


async def listar_tabelas(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(_DB_STATS_SQL)).mappings().all()
    return [
        {
            "nome": r["nome"],
            "schema_": r["schema_"],
            "linhas": int(r["linhas"] or 0),
            "tamanho_bytes": int(r["tamanho_bytes"] or 0),
        }
        for r in rows
    ]


def pool_info() -> dict:
    pool = getattr(engine.sync_engine, "pool", None)

    def _safe(attr: str):
        fn = getattr(pool, attr, None)
        try:
            return int(fn()) if callable(fn) else None
        except Exception:
            return None

    return {
        "tamanho": _safe("size"),
        "em_uso": _safe("checkedout"),
        "disponiveis": _safe("checkedin"),
        "overflow": _safe("overflow"),
    }


async def redis_overview() -> dict:
    client = cache._get_client()
    if client is None:
        return {"conectado": False}
    try:
        info = await client.info()
        depth = await fila_profundidade()
        # Conta chaves do prefixo da app (cap defensivo para não varrer infinito).
        total = 0
        async for _ in client.scan_iter(match=f"{settings.cache_prefix}:*", count=500):
            total += 1
            if total >= 10000:
                break
        return {
            "conectado": True,
            "memoria_usada": info.get("used_memory_human"),
            "clientes_conectados": info.get("connected_clients"),
            "keyspace_hits": info.get("keyspace_hits"),
            "keyspace_misses": info.get("keyspace_misses"),
            "fila_profundidade": depth,
            "total_chaves_prefixo": total,
        }
    except Exception:  # pragma: no cover
        return {"conectado": False, "memoria_usada": None}


async def redis_keys(prefixo: str, limite: int = 200) -> dict:
    client = cache._get_client()
    if client is None:
        return {"prefixo": prefixo, "chaves": [], "truncado": False}
    chaves: list[dict] = []
    truncado = False
    try:
        async for chave in client.scan_iter(match=f"{prefixo}*", count=200):
            if len(chaves) >= limite:
                truncado = True
                break
            ttl = await client.ttl(chave)
            chaves.append({"chave": chave, "ttl": int(ttl)})
    except Exception:  # pragma: no cover
        pass
    return {"prefixo": prefixo, "chaves": chaves, "truncado": truncado}


import datetime as _dt

from sqlalchemy import func, select

from app.models.generated import TicketsSuporte

# SLA padrão (horas) por prioridade para tickets ainda não resolvidos.
# v1 usa thresholds fixos; integração com tickets_sla_config fica para fase 2.
_SLA_HORAS = {"critica": 4, "alta": 24, "media": 72, "baixa": 168}
_STATUS_ABERTOS = ("aberto", "em_andamento", "aguardando_resposta")


async def listar_tickets(
    db: AsyncSession, status: str | None, prioridade: str | None, limite: int
) -> list[TicketsSuporte]:
    stmt = select(TicketsSuporte).order_by(TicketsSuporte.created_at.desc())
    if status:
        stmt = stmt.where(TicketsSuporte.status == status)
    if prioridade:
        stmt = stmt.where(TicketsSuporte.prioridade == prioridade)
    stmt = stmt.limit(limite)
    return list((await db.scalars(stmt)).all())


async def tickets_metrics(db: AsyncSession) -> dict:
    por_status = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(TicketsSuporte.status, func.count()).group_by(TicketsSuporte.status)
            )
        ).all()
    }
    por_prioridade = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(TicketsSuporte.prioridade, func.count()).group_by(TicketsSuporte.prioridade)
            )
        ).all()
    }
    abertos = sum(por_status.get(s, 0) for s in _STATUS_ABERTOS)

    # SLA violados: tickets abertos cuja idade ultrapassa o limite da prioridade.
    agora = _dt.datetime.now(tz=_dt.timezone.utc)
    abertos_rows = (
        await db.execute(
            select(TicketsSuporte.prioridade, TicketsSuporte.created_at).where(
                TicketsSuporte.status.in_(_STATUS_ABERTOS)
            )
        )
    ).all()
    sla_violados = 0
    for prioridade, created_at in abertos_rows:
        if created_at is None:
            continue
        limite_h = _SLA_HORAS.get(prioridade, 72)
        if (agora - created_at) > _dt.timedelta(hours=limite_h):
            sla_violados += 1

    return {
        "abertos": abertos,
        "sla_violados": sla_violados,
        "por_status": por_status,
        "por_prioridade": por_prioridade,
    }


from fastapi import HTTPException, status

from app.models.ops_audit import OpsAuditLog
from app.models.user import User, UserRole
from app.models.generated import Profiles


async def registrar_auditoria(
    db: AsyncSession, actor: User, action: str,
    target_user_id=None, details: dict | None = None, ip: str | None = None,
) -> None:
    db.add(OpsAuditLog(
        actor_id=actor.id,
        actor_nome=getattr(actor, "nome", None),
        action=action,
        target_user_id=target_user_id,
        details=details,
        ip=ip,
    ))


async def get_alvo(db: AsyncSession, actor: User, user_id) -> User:
    """Carrega o usuário-alvo. suporte não pode tocar um admin_vertical
    (anti-neutralização); admin_vertical pode tudo."""
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
    if actor.role == UserRole.suporte and target.role == UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "suporte não pode modificar admin_vertical")
    return target


async def _sync_profile(db: AsyncSession, target: User) -> None:
    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.nome = target.nome
        profile.role = target.role.value
        profile.ativo = target.ativo
        profile.empresa_id = target.empresa_id


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
