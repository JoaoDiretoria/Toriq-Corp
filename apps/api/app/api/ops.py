"""Router do dashboard Ops/Suporte (/ops). Guard: require_ops."""
from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ops
from app.core.db import get_db
from app.models.user import User
from app.core.config import settings
from app.schemas.ops import (
    DatabaseOut,
    HealthOut,
    RedisKeysOut,
    RedisOverviewOut,
    SchedulerOut,
    TicketResumo,
    TicketsListOut,
    TicketsMetricsOut,
)
from app.services import ops as ops_service

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/health", response_model=HealthOut)
async def health(
    request: Request,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> HealthOut:
    base = await ops_service.montar_health(db)

    started_at = getattr(request.app.state, "started_at", None)
    if started_at is not None:
        uptime = int(
            (datetime.datetime.now(tz=datetime.timezone.utc) - started_at).total_seconds()
        )
    else:
        uptime = 0

    scheduler = getattr(request.app.state, "scheduler", None)
    jobs = len(scheduler.get_jobs()) if scheduler is not None else None

    return HealthOut(
        status=base["status"],
        versao=request.app.version,
        uptime_segundos=uptime,
        dependencias=base["dependencias"],
        fila_profundidade=base["fila_profundidade"],
        scheduler_jobs=jobs,
    )


@router.get("/database/tables", response_model=DatabaseOut)
async def database_tables(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> DatabaseOut:
    tabelas = await ops_service.listar_tabelas(db)
    return DatabaseOut(
        tabelas=tabelas,
        total_tabelas=len(tabelas),
        pool=ops_service.pool_info(),
    )


@router.get("/redis/overview", response_model=RedisOverviewOut)
async def redis_overview(_: User = Depends(require_ops)) -> RedisOverviewOut:
    return RedisOverviewOut(**await ops_service.redis_overview())


@router.get("/redis/keys", response_model=RedisKeysOut)
async def redis_keys(
    prefix: str | None = None,
    _: User = Depends(require_ops),
) -> RedisKeysOut:
    prefixo = prefix or f"{settings.cache_prefix}:"
    return RedisKeysOut(**await ops_service.redis_keys(prefixo))


@router.get("/scheduler/jobs", response_model=SchedulerOut)
async def scheduler_jobs(
    request: Request,
    _: User = Depends(require_ops),
) -> SchedulerOut:
    scheduler = getattr(request.app.state, "scheduler", None)
    if scheduler is None:
        return SchedulerOut(rodando=False, jobs=[])
    jobs = [
        {"id": j.id, "nome": j.name or j.id, "proximo_run": j.next_run_time}
        for j in scheduler.get_jobs()
    ]
    return SchedulerOut(rodando=bool(scheduler.running), jobs=jobs)


@router.get("/tickets/metrics", response_model=TicketsMetricsOut)
async def tickets_metrics(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsMetricsOut:
    return TicketsMetricsOut(**await ops_service.tickets_metrics(db))


@router.get("/tickets", response_model=TicketsListOut)
async def tickets(
    status: str | None = None,
    prioridade: str | None = None,
    limit: int = 100,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsListOut:
    rows = await ops_service.listar_tickets(db, status, prioridade, min(limit, 500))
    return TicketsListOut(
        tickets=[TicketResumo.model_validate(t) for t in rows],
        total=len(rows),
    )
