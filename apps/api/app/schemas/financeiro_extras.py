"""Schemas para sub-tabelas de FINANCEIRO.

Cobre:
  - financeiro_contas              (tenant: empresa_id direto)
  - modelos_atividade             (tenant: empresa_id direto)
  - contas_pagar_atividades       (filha de contas_pagar via conta_id)
  - contas_pagar_atividades_anexos(filha de atividade via atividade_id)
  - contas_pagar_movimentacoes    (filha de contas_pagar via conta_id, append-only)
"""
import datetime
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── financeiro_contas (empresa_id direto) ────────────────────────────────────
class FinanceiroContaIn(BaseModel):
    tipo: str  # 'pagar' | 'receber'
    descricao: str
    valor: decimal.Decimal
    vencimento: datetime.date
    status: Optional[str] = None  # 'pendente' | 'pago' | 'cancelado'


class FinanceiroContaUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[decimal.Decimal] = None
    vencimento: Optional[datetime.date] = None
    status: Optional[str] = None


class FinanceiroContaOut(BaseModel):
    id: uuid.UUID
    empresa_id: Optional[uuid.UUID] = None
    tipo: str
    descricao: str
    valor: decimal.Decimal
    vencimento: datetime.date
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── modelos_atividade (empresa_id direto) ────────────────────────────────────
class ModeloAtividadeIn(BaseModel):
    nome: str
    descricao: str


class ModeloAtividadeUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None


class ModeloAtividadeOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: str
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── contas_pagar_atividades (filha de contas_pagar) ──────────────────────────
class AtividadeIn(BaseModel):
    tipo: str
    descricao: str
    status: Optional[str] = None
    prazo: Optional[datetime.date] = None
    horario: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None


class AtividadeUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    prazo: Optional[datetime.date] = None
    horario: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None


class AtividadeOut(BaseModel):
    id: uuid.UUID
    conta_id: uuid.UUID
    tipo: str
    descricao: str
    status: str
    prazo: Optional[datetime.date] = None
    horario: Optional[str] = None
    usuario_id: Optional[uuid.UUID] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── contas_pagar_atividades_anexos (filha de atividade) ──────────────────────
class AnexoIn(BaseModel):
    nome_arquivo: str
    url: str
    storage_path: str
    tipo_arquivo: Optional[str] = None
    tamanho: Optional[int] = None


class AnexoOut(BaseModel):
    id: uuid.UUID
    atividade_id: uuid.UUID
    nome_arquivo: str
    url: str
    storage_path: str
    tipo_arquivo: Optional[str] = None
    tamanho: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── contas_pagar_movimentacoes (filha de contas_pagar, append-only) ──────────
class MovimentacaoIn(BaseModel):
    tipo: str
    descricao: str
    coluna_origem_id: Optional[uuid.UUID] = None
    coluna_destino_id: Optional[uuid.UUID] = None
    usuario_id: Optional[uuid.UUID] = None


class MovimentacaoOut(BaseModel):
    id: uuid.UUID
    conta_id: uuid.UUID
    tipo: str
    descricao: str
    coluna_origem_id: Optional[uuid.UUID] = None
    coluna_destino_id: Optional[uuid.UUID] = None
    usuario_id: Optional[uuid.UUID] = None
    created_at: datetime.datetime
    model_config = {"from_attributes": True}
