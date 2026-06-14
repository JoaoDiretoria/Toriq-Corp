"""Router do dashboard Ops/Suporte (/ops). Guard: require_ops."""
from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ops
from app.core.db import get_db
from app.models.user import User
from app.schemas.ops import DatabaseOut, HealthOut
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
