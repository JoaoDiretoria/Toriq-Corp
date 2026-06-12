"""Schemas para o módulo Agenda (eventos, compartilhamentos e permissões)."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── AgendaEventos ─────────────────────────────────────────────────────────────

class EventoIn(BaseModel):
    """Payload de criação de evento.

    empresa_id e criado_por são injetados pelo endpoint via token — não
    são aceitos do cliente para evitar mass-assignment cross-tenant.
    cliente_sst_id é validado pelo endpoint (404 se pertencer a outra empresa).
    """
    titulo: str
    data_inicio: datetime.datetime
    descricao: Optional[str] = None
    data_fim: Optional[datetime.datetime] = None
    dia_inteiro: bool = False
    local: Optional[str] = None
    cor: Optional[str] = "#16E17A"
    tipo: Optional[str] = "evento"
    status: Optional[str] = "ativo"
    visibilidade: Optional[str] = "privado"
    bloqueado: bool = False
    meet_link: Optional[str] = None
    cliente_sst_id: Optional[uuid.UUID] = None
    cliente_email: Optional[str] = None
    cliente_nome: Optional[str] = None


class EventoUpdateIn(BaseModel):
    """Payload de atualização — exclui empresa_id e criado_por (FKs de parentagem)."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[datetime.datetime] = None
    data_fim: Optional[datetime.datetime] = None
    dia_inteiro: Optional[bool] = None
    local: Optional[str] = None
    cor: Optional[str] = None
    tipo: Optional[str] = None
    status: Optional[str] = None
    visibilidade: Optional[str] = None
    bloqueado: Optional[bool] = None
    meet_link: Optional[str] = None
    cliente_sst_id: Optional[uuid.UUID] = None
    cliente_email: Optional[str] = None
    cliente_nome: Optional[str] = None


class EventoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    criado_por: uuid.UUID
    titulo: str
    data_inicio: datetime.datetime
    descricao: Optional[str] = None
    data_fim: Optional[datetime.datetime] = None
    dia_inteiro: Optional[bool] = None
    local: Optional[str] = None
    cor: Optional[str] = None
    tipo: Optional[str] = None
    status: Optional[str] = None
    visibilidade: Optional[str] = None
    bloqueado: Optional[bool] = None
    meet_link: Optional[str] = None
    cliente_sst_id: Optional[uuid.UUID] = None
    cliente_email: Optional[str] = None
    cliente_nome: Optional[str] = None
    convite_enviado: Optional[bool] = None
    convite_enviado_em: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── AgendaCompartilhamentos ───────────────────────────────────────────────────

class CompartilhamentoIn(BaseModel):
    """Cria um compartilhamento de evento.

    evento_id é validado no endpoint (pertence à empresa do user autenticado).
    compartilhado_por é injetado a partir do user autenticado.
    """
    evento_id: uuid.UUID
    compartilhado_com: uuid.UUID
    pode_editar: bool = False


class CompartilhamentoOut(BaseModel):
    id: uuid.UUID
    evento_id: uuid.UUID
    compartilhado_com: uuid.UUID
    compartilhado_por: uuid.UUID
    pode_editar: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── AgendaPermissoes ──────────────────────────────────────────────────────────

class PermissaoIn(BaseModel):
    """Cria/concede permissão de agenda.

    empresa_id e dono_id são injetados pelo endpoint.
    """
    usuario_id: uuid.UUID
    pode_criar_eventos: bool = False


class PermissaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    dono_id: uuid.UUID
    usuario_id: uuid.UUID
    pode_criar_eventos: bool
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
