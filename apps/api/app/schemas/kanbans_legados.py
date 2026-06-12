"""Schemas Pydantic para os 4 kanbans legados.

Cada kanban expõe:
  - <Prefix>CardIn  — campos obrigatórios para criar um card (inclui coluna_id)
  - <Prefix>CardUpdate — campos opcionais para atualizar (SEM coluna_id nem FKs de
                         parentesco — anti cross-tenant mass-assignment)
  - <Prefix>CardOut — campos retornados ao cliente

ColunaIn / ColunaOut são compartilhados porque todos os colunas têm nome+ordem.
"""
import uuid
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel


# ── Colunas compartilhadas ────────────────────────────────────────────────────

class ColunaIn(BaseModel):
    nome: str
    ordem: int = 0


class ColunaOut(BaseModel):
    id: uuid.UUID
    nome: str
    ordem: int
    model_config = {"from_attributes": True}


# ── Closer ────────────────────────────────────────────────────────────────────
# Tabela: closer_cards
# NOT NULL sem default: empresa_id (setado pelo repo), coluna_id, titulo
# Optional úteis: descricao, valor, contato_nome, temperatura, etc.

class CloserCardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None


class CloserCardUpdate(BaseModel):
    """Update schema — NÃO inclui coluna_id (parentesco muda só via /mover)."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None
    dados_orcamento: Optional[Any] = None
    dados_proposta: Optional[Any] = None


class CloserCardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None
    ordem: Optional[int] = None
    arquivado: Optional[bool] = None
    dados_orcamento: Optional[Any] = None
    dados_proposta: Optional[Any] = None
    model_config = {"from_attributes": True}


# ── Prospecção ────────────────────────────────────────────────────────────────
# Tabela: prospeccao_cards
# NOT NULL sem default: empresa_id (setado pelo repo), coluna_id, titulo,
#   ordem (tem server_default=0), lead_numero (NOT NULL, SEM server_default)
# lead_numero é um contador interno — incluído no CardIn como obrigatório.

class ProspeccaoCardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID
    lead_numero: int
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None


class ProspeccaoCardUpdate(BaseModel):
    """Update schema — NÃO inclui coluna_id nem lead_numero."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None


class ProspeccaoCardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    lead_numero: int
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_empresa: Optional[str] = None
    origem: Optional[str] = None
    temperatura: Optional[str] = None
    ordem: Optional[int] = None
    arquivado: Optional[bool] = None
    model_config = {"from_attributes": True}


# ── Pós-Venda ─────────────────────────────────────────────────────────────────
# Tabela: pos_venda_cards
# NOT NULL sem default: empresa_id (setado pelo repo), coluna_id, titulo

class PosVendaCardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    temperatura: Optional[str] = None
    origem: Optional[str] = None


class PosVendaCardUpdate(BaseModel):
    """Update schema — NÃO inclui coluna_id."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    temperatura: Optional[str] = None
    origem: Optional[str] = None
    status_satisfacao: Optional[str] = None
    nota_nps: Optional[int] = None


class PosVendaCardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    temperatura: Optional[str] = None
    origem: Optional[str] = None
    status_satisfacao: Optional[str] = None
    nota_nps: Optional[int] = None
    ordem: Optional[int] = None
    arquivado: Optional[bool] = None
    model_config = {"from_attributes": True}


# ── Cross-Selling ─────────────────────────────────────────────────────────────
# Tabela: cross_selling_cards
# NOT NULL sem default: empresa_id (setado pelo repo), coluna_id, titulo
# ordem/arquivado/created_at/updated_at: NOT NULL mas todos têm server_default

class CrossSellingCardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    status_satisfacao: Optional[str] = None


class CrossSellingCardUpdate(BaseModel):
    """Update schema — NÃO inclui coluna_id."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    status_satisfacao: Optional[str] = None
    nota_nps: Optional[int] = None


class CrossSellingCardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    cliente_nome: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_empresa: Optional[str] = None
    tipo_servico: Optional[str] = None
    status_satisfacao: Optional[str] = None
    nota_nps: Optional[int] = None
    ordem: Optional[int] = None
    arquivado: Optional[bool] = None
    model_config = {"from_attributes": True}
