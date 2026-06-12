"""Schemas Pydantic para o módulo SST — cadastros base."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Cargos ────────────────────────────────────────────────────────────────────

class CargoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: Optional[bool] = True
    cbo: Optional[str] = None


class CargoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    cbo: Optional[str] = None


class CargoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    cbo: Optional[str]
    model_config = {"from_attributes": True}


# ── Setores ───────────────────────────────────────────────────────────────────

class SetorIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: Optional[bool] = True
    ambiente: Optional[str] = None
    turno: Optional[str] = None
    escala: Optional[str] = None
    horarios: Optional[str] = None


class SetorUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    ambiente: Optional[str] = None
    turno: Optional[str] = None
    escala: Optional[str] = None
    horarios: Optional[str] = None


class SetorOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    ambiente: Optional[str]
    turno: Optional[str]
    escala: Optional[str]
    horarios: Optional[str]
    model_config = {"from_attributes": True}


# ── Riscos ────────────────────────────────────────────────────────────────────

class RiscoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    severidade: Optional[str] = None
    probabilidade: Optional[str] = None
    ativo: Optional[bool] = True


class RiscoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    severidade: Optional[str] = None
    probabilidade: Optional[str] = None
    ativo: Optional[bool] = None


class RiscoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    tipo: Optional[str]
    severidade: Optional[str]
    probabilidade: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── Perigos ───────────────────────────────────────────────────────────────────

class PerigoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    ativo: Optional[bool] = True


class PerigoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    ativo: Optional[bool] = None


class PerigoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    categoria: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── GruposClientes ────────────────────────────────────────────────────────────

class GrupoClienteIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: Optional[bool] = True


class GrupoClienteUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class GrupoClienteOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── CategoriasClientes (global — sem empresa_id, somente leitura) ─────────────

class CategoriaClienteOut(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str]
    model_config = {"from_attributes": True}


# ── Colaboradores ─────────────────────────────────────────────────────────────
# `cargo` e `setor` são campos TEXT livres (não FKs) — sem validação cross-tenant

class ColaboradorIn(BaseModel):
    nome: str
    cpf: Optional[str] = None
    cargo: Optional[str] = None
    setor: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_admissao: Optional[datetime.date] = None
    ativo: Optional[bool] = True
    matricula: Optional[str] = None
    tipo_contrato: Optional[str] = None
    observacoes: Optional[str] = None


class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    cargo: Optional[str] = None
    setor: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_admissao: Optional[datetime.date] = None
    ativo: Optional[bool] = None
    matricula: Optional[str] = None
    tipo_contrato: Optional[str] = None
    observacoes: Optional[str] = None


class ColaboradorOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cpf: Optional[str]
    cargo: Optional[str]
    setor: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    data_admissao: Optional[datetime.date]
    ativo: bool
    matricula: Optional[str]
    tipo_contrato: Optional[str]
    observacoes: Optional[str]
    model_config = {"from_attributes": True}


# ── ClientesSst ───────────────────────────────────────────────────────────────
# ATENÇÃO: a coluna tenant do ClientesSst é `empresa_sst_id` (não `empresa_id`)
# O router usa um repositório customizado que mapeia esse campo.

class ClienteIn(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    responsavel: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    sigla: Optional[str] = None
    cnae: Optional[str] = None
    grau_risco: Optional[str] = None
    porte_empresa: Optional[str] = None


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    responsavel: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    sigla: Optional[str] = None
    cnae: Optional[str] = None
    grau_risco: Optional[str] = None
    porte_empresa: Optional[str] = None


class ClienteOut(BaseModel):
    id: uuid.UUID
    empresa_sst_id: uuid.UUID
    nome: str
    cnpj: Optional[str]
    responsavel: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    sigla: Optional[str]
    cnae: Optional[str]
    grau_risco: Optional[str]
    porte_empresa: Optional[str]
    model_config = {"from_attributes": True}


# ── ClienteContatos ───────────────────────────────────────────────────────────

class ClienteContatoIn(BaseModel):
    nome: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = False


class ClienteContatoUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = None


class ClienteContatoOut(BaseModel):
    id: uuid.UUID
    cliente_id: uuid.UUID
    nome: str
    cargo: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    linkedin: Optional[str]
    principal: Optional[bool]
    model_config = {"from_attributes": True}


# ── UnidadesClientes ──────────────────────────────────────────────────────────

class UnidadeClienteIn(BaseModel):
    razao_social: str
    nome_referencia: Optional[str] = None
    cnae: Optional[str] = None
    grau_risco: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = "ativo"


class UnidadeClienteUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_referencia: Optional[str] = None
    cnae: Optional[str] = None
    grau_risco: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


class UnidadeClienteOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    cliente_id: uuid.UUID
    razao_social: str
    nome_referencia: Optional[str]
    cnae: Optional[str]
    grau_risco: Optional[str]
    cep: Optional[str]
    logradouro: Optional[str]
    numero: Optional[str]
    complemento: Optional[str]
    bairro: Optional[str]
    cidade: Optional[str]
    uf: Optional[str]
    email: Optional[str]
    status: Optional[str]
    model_config = {"from_attributes": True}
