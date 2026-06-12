"""Schemas Pydantic para o módulo SST — EPI / Equipamentos."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── EquipamentosCategorias ───────────────────────────────────────────────────

class CategoriaSstIn(BaseModel):
    nome: str


class CategoriaSstUpdate(BaseModel):
    nome: Optional[str] = None


class CategoriaSstOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosFinalidades ──────────────────────────────────────────────────

class FinalidadeIn(BaseModel):
    nome: str


class FinalidadeUpdate(BaseModel):
    nome: Optional[str] = None


class FinalidadeOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosStatus ───────────────────────────────────────────────────────

class StatusSstIn(BaseModel):
    codigo: str
    nome: str
    cor: Optional[str] = None


class StatusSstUpdate(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    cor: Optional[str] = None


class StatusSstOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    codigo: str
    nome: str
    cor: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosUnidades ─────────────────────────────────────────────────────

class UnidadeSstIn(BaseModel):
    nome: str


class UnidadeSstUpdate(BaseModel):
    nome: Optional[str] = None


class UnidadeSstOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosSst (core EPI item) ─────────────────────────────────────────

class EquipamentoIn(BaseModel):
    nome: str
    codigo: str
    categoria: str
    numero_serie: Optional[str] = None
    unidade_medida: Optional[str] = None
    quantidade: Optional[int] = 1
    usado_para: Optional[list[str]] = None
    status: Optional[str] = "disponivel"
    local_base: Optional[str] = None
    validade_calibracao: Optional[datetime.date] = None
    observacoes: Optional[str] = None


class EquipamentoUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    categoria: Optional[str] = None
    numero_serie: Optional[str] = None
    unidade_medida: Optional[str] = None
    quantidade: Optional[int] = None
    usado_para: Optional[list[str]] = None
    status: Optional[str] = None
    local_base: Optional[str] = None
    validade_calibracao: Optional[datetime.date] = None
    observacoes: Optional[str] = None


class EquipamentoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    codigo: str
    categoria: str
    numero_serie: Optional[str] = None
    unidade_medida: Optional[str] = None
    quantidade: Optional[int] = None
    usado_para: Optional[list[str]] = None
    status: Optional[str] = None
    local_base: Optional[str] = None
    validade_calibracao: Optional[datetime.date] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosKits ─────────────────────────────────────────────────────────

class KitIn(BaseModel):
    nome: str
    codigo: str
    quantidade: Optional[int] = 1
    tipo_servico: Optional[list[str]] = None
    descricao: Optional[str] = None


class KitUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    quantidade: Optional[int] = None
    tipo_servico: Optional[list[str]] = None
    descricao: Optional[str] = None


class KitOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    codigo: str
    quantidade: int
    tipo_servico: Optional[list[str]] = None
    descricao: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosKitItens (child of Kit) ──────────────────────────────────────

class KitItemIn(BaseModel):
    equipamento_id: uuid.UUID
    quantidade: Optional[int] = 1


class KitItemUpdate(BaseModel):
    quantidade: Optional[int] = None


class KitItemOut(BaseModel):
    id: uuid.UUID
    kit_id: uuid.UUID
    equipamento_id: uuid.UUID
    quantidade: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EquipamentosMovimentacoes ────────────────────────────────────────────────

class MovimentacaoIn(BaseModel):
    tipo: str  # 'saida' | 'entrada'
    equipamento_id: Optional[uuid.UUID] = None
    kit_id: Optional[uuid.UUID] = None
    quantidade: Optional[int] = 1
    tipo_servico: Optional[str] = None
    responsavel_retirada: Optional[str] = None
    data_saida: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.datetime] = None
    status: Optional[str] = "demanda"
    observacoes: Optional[str] = None
    numero_movimentacao: Optional[str] = None


class MovimentacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    quantidade: Optional[int] = None
    tipo_servico: Optional[str] = None
    responsavel_retirada: Optional[str] = None
    data_saida: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.datetime] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    numero_movimentacao: Optional[str] = None


class MovimentacaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    tipo: str
    equipamento_id: Optional[uuid.UUID] = None
    kit_id: Optional[uuid.UUID] = None
    quantidade: Optional[int] = None
    tipo_servico: Optional[str] = None
    responsavel_retirada: Optional[str] = None
    data_saida: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.datetime] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    numero_movimentacao: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
