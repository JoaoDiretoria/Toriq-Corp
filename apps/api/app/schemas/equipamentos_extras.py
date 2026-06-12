"""Schemas para sub-tabelas de EPI / EQUIPAMENTOS.

Cobre:
  - equipamentos_modelos_atividade        (tenant: empresa_id direto)
  - equipamentos_movimentacoes_historico  (filha de equipamentos_movimentacoes, append-only)
"""
import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ── equipamentos_modelos_atividade (empresa_id direto) ───────────────────────
class ModeloAtividadeEpiIn(BaseModel):
    tipo: str  # 'tarefa' | 'checklist'
    nome: str
    descricao: Optional[str] = None
    itens: Optional[Any] = None


class ModeloAtividadeEpiUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[Any] = None


class ModeloAtividadeEpiOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    tipo: str
    nome: str
    descricao: Optional[str] = None
    itens: Optional[Any] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── equipamentos_movimentacoes_historico (filha de movimentacao, append-only) ─
class HistoricoIn(BaseModel):
    tipo: str
    descricao: str
    funil_id: Optional[uuid.UUID] = None
    funil_nome: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    card_titulo: Optional[str] = None
    status_anterior: Optional[str] = None
    status_novo: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None
    usuario_nome: Optional[str] = None
    dados_adicionais: Optional[Any] = None


class HistoricoOut(BaseModel):
    id: uuid.UUID
    movimentacao_id: uuid.UUID
    tipo: str
    descricao: str
    funil_id: Optional[uuid.UUID] = None
    funil_nome: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    card_titulo: Optional[str] = None
    status_anterior: Optional[str] = None
    status_novo: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None
    usuario_nome: Optional[str] = None
    dados_adicionais: Optional[Any] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
