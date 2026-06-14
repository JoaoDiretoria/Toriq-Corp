"""Schemas Pydantic para o módulo Toriq Vendas — Pipeline & Conversas (CRM).

snake_case batendo com os models/colunas do backend. Escopo: estágios do funil
(kanban) + cards de lead + thread de conversas (inbox) + dashboard de conversão.
Tenant SEMPRE por user.empresa_id (carimbado no router).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Estágios (pipeline) ───────────────────────────────────────────────────────

class StageIn(BaseModel):
    nome: str
    cor: Optional[str] = None
    ordem: Optional[int] = None
    is_closed: Optional[bool] = None
    is_won: Optional[bool] = None


class StageUpdate(BaseModel):
    nome: Optional[str] = None
    cor: Optional[str] = None
    ordem: Optional[int] = None
    is_closed: Optional[bool] = None
    is_won: Optional[bool] = None


class StageOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cor: Optional[str]
    ordem: int
    is_closed: bool
    is_won: bool
    model_config = ConfigDict(from_attributes=True)


# ── Cards de lead / board ─────────────────────────────────────────────────────

class LeadCardOut(BaseModel):
    id: uuid.UUID
    nome: Optional[str]
    empresa_nome: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    stage_id: Optional[uuid.UUID]
    temperatura: Optional[str]
    valor_estimado: Optional[float]
    sdr_score: Optional[int]
    status: Optional[str]
    origem: Optional[str]
    is_pinned: bool
    is_archived: bool
    pending_reply: bool
    unread: int
    last_message_at: Optional[datetime.datetime]
    last_message_preview: Optional[str]
    tags: list[dict]


class BoardOut(BaseModel):
    stages: list[StageOut]
    leads: list[LeadCardOut]


class MoverLeadIn(BaseModel):
    stage_id: uuid.UUID
    valor_estimado: Optional[float] = None
    motivo: Optional[str] = None


# ── Conversas (inbox / thread) ────────────────────────────────────────────────

class ConversaMensagemOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    lead_id: uuid.UUID
    sender_type: str
    canal: Optional[str]
    conteudo: Optional[str]
    status: Optional[str]
    media: Optional[dict]
    created_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


class ConversaThreadOut(BaseModel):
    lead: LeadCardOut
    mensagens: list[ConversaMensagemOut]


class EnviarMensagemIn(BaseModel):
    conteudo: str


class LeadPatchIn(BaseModel):
    stage_id: Optional[uuid.UUID] = None
    temperatura: Optional[str] = None
    valor_estimado: Optional[float] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


# ── Conversão (dashboard) ─────────────────────────────────────────────────────

class ConversaoOut(BaseModel):
    itens: list[dict]
    total_leads: int
    valor_total: float
