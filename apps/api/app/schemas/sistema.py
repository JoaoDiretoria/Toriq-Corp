"""Schemas dos módulos de sistema/infra.

Cobre: access_logs, system_updates, user_update_views, import_queue,
google_oauth_tokens, cbo_ocupacoes, tickets_sla_config.

Regras aplicadas:
- Schemas de UPDATE nunca incluem FKs de parentesco/tenant (empresa_id,
  user_id, update_id) — esses vêm do contexto (usuário logado / path).
- Colunas sensíveis (access_token, refresh_token) NUNCA aparecem em schemas
  de resposta de google_oauth_tokens; só status/flags derivados.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── access_logs (append-only, por empresa) ────────────────────────────────────
class AccessLogIn(BaseModel):
    acao: str
    modulo: Optional[str] = None
    pagina: Optional[str] = None
    descricao: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    metadata_: Optional[dict] = None


class AccessLogOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    acao: str
    user_id: Optional[uuid.UUID]
    user_email: Optional[str]
    user_nome: Optional[str]
    modulo: Optional[str]
    pagina: Optional[str]
    descricao: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    metadata_: Optional[dict]
    created_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── system_updates (GLOBAL — changelog) ───────────────────────────────────────
class SystemUpdateIn(BaseModel):
    version: str
    title: str
    description: Optional[str] = None
    changelog: Optional[list] = None
    release_date: Optional[datetime.datetime] = None
    is_active: Optional[bool] = True


class SystemUpdateUpdate(BaseModel):
    version: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    changelog: Optional[list] = None
    release_date: Optional[datetime.datetime] = None
    is_active: Optional[bool] = None


class SystemUpdateOut(BaseModel):
    id: uuid.UUID
    version: str
    title: str
    description: Optional[str]
    changelog: Optional[list]
    release_date: Optional[datetime.datetime]
    is_active: Optional[bool]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── user_update_views (por usuário) ───────────────────────────────────────────
class UserUpdateViewOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    update_id: uuid.UUID
    viewed_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── import_queue (por empresa) ────────────────────────────────────────────────
class ImportQueueIn(BaseModel):
    tipo: str = "empresas"
    status: str = "pending"
    total_rows: int = 0
    processed_rows: int = 0
    success_count: int = 0
    error_count: int = 0
    data: list = []
    errors: Optional[list] = None


class ImportQueueUpdate(BaseModel):
    tipo: Optional[str] = None
    status: Optional[str] = None
    total_rows: Optional[int] = None
    processed_rows: Optional[int] = None
    success_count: Optional[int] = None
    error_count: Optional[int] = None
    data: Optional[list] = None
    errors: Optional[list] = None
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None


class ImportQueueOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    user_id: uuid.UUID
    tipo: str
    status: str
    total_rows: int
    processed_rows: int
    success_count: int
    error_count: int
    data: list
    errors: Optional[list]
    started_at: Optional[datetime.datetime]
    completed_at: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── google_oauth_tokens (SENSÍVEL — nunca expor tokens) ───────────────────────
class GoogleOauthTokenIn(BaseModel):
    """Upsert dos tokens OAuth. Os tokens ENTRAM mas nunca SAEM em respostas."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "Bearer"
    scope: Optional[str] = None
    expiry_date: Optional[int] = None
    google_email: Optional[str] = None


class GoogleOauthStatusOut(BaseModel):
    """Status de conexão — NÃO inclui access_token nem refresh_token."""
    empresa_id: uuid.UUID
    conectado: bool
    google_email: Optional[str]
    scope: Optional[str]
    token_type: Optional[str]
    expiry_date: Optional[int]
    expirado: bool
    criado_em: Optional[datetime.datetime]
    atualizado_em: Optional[datetime.datetime]


# ── cbo_ocupacoes (GLOBAL — referência, só leitura) ───────────────────────────
class CboOcupacaoOut(BaseModel):
    id: int
    codigo: str
    codigo_formatado: str
    descricao: str
    grande_grupo: Optional[int]
    desc_grande_grupo: Optional[str]
    model_config = {"from_attributes": True}


# ── tickets_sla_config (por empresa, singleton) ───────────────────────────────
class SlaConfigIn(BaseModel):
    prioridade_baixa_horas: int = 72
    prioridade_media_horas: int = 48
    prioridade_alta_horas: int = 24
    prioridade_critica_horas: int = 4


class SlaConfigUpdate(BaseModel):
    prioridade_baixa_horas: Optional[int] = None
    prioridade_media_horas: Optional[int] = None
    prioridade_alta_horas: Optional[int] = None
    prioridade_critica_horas: Optional[int] = None


class SlaConfigOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    prioridade_baixa_horas: int
    prioridade_media_horas: int
    prioridade_alta_horas: int
    prioridade_critica_horas: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}
