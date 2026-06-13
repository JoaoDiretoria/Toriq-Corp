"""Schemas Pydantic para o módulo Toriq Vendas — FASE 0 (Fundação).

snake_case batendo com os models/colunas do backend. Escopo: leads + tags +
segmentos + import. Tenant SEMPRE por user.empresa_id (carimbado no router).
"""
import datetime
import decimal
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ── Leads ───────────────────────────────────────────────────────────────────

class LeadIn(BaseModel):
    nome: Optional[str] = None
    empresa_nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    plataforma: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    avaliacao: Optional[decimal.Decimal] = None
    dados_brutos: Optional[dict[str, Any]] = None
    status: Optional[str] = None
    origem: Optional[str] = None
    consentimento: Optional[bool] = None


class LeadUpdate(BaseModel):
    nome: Optional[str] = None
    empresa_nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    plataforma: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    avaliacao: Optional[decimal.Decimal] = None
    dados_brutos: Optional[dict[str, Any]] = None
    status: Optional[str] = None
    origem: Optional[str] = None
    consentimento: Optional[bool] = None


class LeadOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: Optional[str]
    empresa_nome: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    plataforma: Optional[str]
    cidade: Optional[str]
    estado: Optional[str]
    avaliacao: Optional[decimal.Decimal]
    dados_brutos: Optional[dict[str, Any]]
    status: Optional[str]
    origem: Optional[str]
    consentimento: Optional[bool]
    dedupe_key: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


class LeadsListOut(BaseModel):
    items: list[LeadOut]
    total: int


class LeadsDeleteIn(BaseModel):
    ids: list[uuid.UUID]


class LeadImportItem(BaseModel):
    nome: Optional[str] = None
    empresa_nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    plataforma: Optional[str] = None


class LeadsImportIn(BaseModel):
    leads: list[LeadImportItem]


class LeadsImportOut(BaseModel):
    inseridos: int
    duplicados: int
    total: int


# ── Tags ────────────────────────────────────────────────────────────────────

class TagIn(BaseModel):
    nome: str
    cor: Optional[str] = None


class TagOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cor: Optional[str]
    created_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


class LeadTagsIn(BaseModel):
    lead_ids: list[uuid.UUID]
    tag_id: uuid.UUID


# ── Segmentos ─────────────────────────────────────────────────────────────────

class SegmentoIn(BaseModel):
    nome: str
    filtros: Optional[dict[str, Any]] = None
    cor: Optional[str] = None
    descricao: Optional[str] = None


class SegmentoUpdate(BaseModel):
    nome: Optional[str] = None
    filtros: Optional[dict[str, Any]] = None
    cor: Optional[str] = None
    descricao: Optional[str] = None


class SegmentoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    filtros: Optional[dict[str, Any]]
    cor: Optional[str]
    descricao: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}
