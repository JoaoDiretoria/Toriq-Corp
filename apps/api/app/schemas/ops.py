"""Schemas Pydantic do dashboard Ops/Suporte (/ops)."""
from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


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


class TicketResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    titulo: str
    status: str
    prioridade: str
    categoria: str | None = None
    empresa_solicitante_id: uuid.UUID | None = None
    solicitante_nome: str
    created_at: datetime.datetime | None = None
    resolvido_em: datetime.datetime | None = None


class TicketsListOut(BaseModel):
    tickets: list[TicketResumo]
    total: int


class TicketsMetricsOut(BaseModel):
    abertos: int
    sla_violados: int
    por_status: dict[str, int]
    por_prioridade: dict[str, int]


class OpsUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None = None
    ativo: bool
    created_at: datetime.datetime | None = None


class OpsUsersListOut(BaseModel):
    users: list[OpsUserOut]
    total: int


class OpsUserUpdateIn(BaseModel):
    nome: str | None = None
    email: str | None = None
    ativo: bool | None = None


class OpsRoleUpdateIn(BaseModel):
    role: UserRole


class OpsEmpresaUpdateIn(BaseModel):
    empresa_id: uuid.UUID | None = None


class OpsResetSenhaOut(BaseModel):
    ok: bool
    temp_password: str | None = None


class AuditRegistro(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_id: uuid.UUID
    actor_nome: str | None = None
    action: str
    target_user_id: uuid.UUID | None = None
    details: dict | None = None
    ip: str | None = None
    created_at: datetime.datetime


class AuditListOut(BaseModel):
    registros: list[AuditRegistro]
    total: int
