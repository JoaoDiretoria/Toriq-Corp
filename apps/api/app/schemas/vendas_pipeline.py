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
    assigned_to: Optional[uuid.UUID] = None
    assigned_to_nome: Optional[str] = None


class BoardOut(BaseModel):
    stages: list[StageOut]
    leads: list[LeadCardOut]


class MoverLeadIn(BaseModel):
    stage_id: uuid.UUID
    valor_estimado: Optional[float] = None
    motivo: Optional[str] = None


class ReordenarColunaIn(BaseModel):
    """Nova ordem dos cards de um estágio (na sequência = board_ordem)."""
    lead_ids: list[uuid.UUID]


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
    # Janela de atendimento do WhatsApp (24h desde a última msg do lead). Quando
    # fechada, texto livre é rejeitado pela Meta → o front força um template HSM.
    janela_aberta: bool = True
    janela_expira_em: Optional[datetime.datetime] = None


class EnviarMensagemIn(BaseModel):
    conteudo: str
    # 'whatsapp' (Meta) | 'whatsapp_evo' (Evolution) | None = segue o último canal do lead.
    canal: Optional[str] = None


class EnviarTemplateIn(BaseModel):
    template_id: uuid.UUID


class LeadPatchIn(BaseModel):
    stage_id: Optional[uuid.UUID] = None
    temperatura: Optional[str] = None
    valor_estimado: Optional[float] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    assigned_to: Optional[uuid.UUID] = None


class OperadorOut(BaseModel):
    id: uuid.UUID
    nome: str


# ── Conversão (dashboard) ─────────────────────────────────────────────────────

class ConversaoOut(BaseModel):
    itens: list[dict]
    total_leads: int
    valor_total: float


class AnalyticsOut(BaseModel):
    total_leads: int
    ganhos: int
    perdidos: int
    valor_ganho: float
    taxa_conversao: float
    por_origem: list[dict]
    por_temperatura: list[dict]
