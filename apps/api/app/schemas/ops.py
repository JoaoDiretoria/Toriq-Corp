"""Schemas Pydantic do dashboard Ops/Suporte (/ops)."""
from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class DependenciaStatus(BaseModel):
    nome: str
    ok: bool
    detalhe: str | None = None


class HealthOut(BaseModel):
    status: str  # "ok" | "degradado"
    versao: str
    uptime_segundos: int
    dependencias: list[DependenciaStatus]
    fila_profundidade: int | None = None
    scheduler_jobs: int | None = None
