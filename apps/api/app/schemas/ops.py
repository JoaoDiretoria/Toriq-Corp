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


class TabelaInfo(BaseModel):
    nome: str
    schema_: str
    linhas: int
    tamanho_bytes: int


class PoolInfo(BaseModel):
    tamanho: int | None = None
    em_uso: int | None = None
    disponiveis: int | None = None
    overflow: int | None = None


class DatabaseOut(BaseModel):
    tabelas: list[TabelaInfo]
    total_tabelas: int
    pool: PoolInfo


class RedisOverviewOut(BaseModel):
    conectado: bool
    memoria_usada: str | None = None
    clientes_conectados: int | None = None
    keyspace_hits: int | None = None
    keyspace_misses: int | None = None
    fila_profundidade: int | None = None
    total_chaves_prefixo: int | None = None


class RedisChave(BaseModel):
    chave: str
    ttl: int  # -1 sem expiração, -2 inexistente


class RedisKeysOut(BaseModel):
    prefixo: str
    chaves: list[RedisChave]
    truncado: bool


class SchedulerJob(BaseModel):
    id: str
    nome: str
    proximo_run: datetime.datetime | None = None


class SchedulerOut(BaseModel):
    rodando: bool
    jobs: list[SchedulerJob]
