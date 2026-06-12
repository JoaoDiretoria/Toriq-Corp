"""Schemas para o módulo Contratos — contratos, modelos, cláusulas e módulos."""
import datetime
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Contratos ─────────────────────────────────────────────────────────────────

class ContratoIn(BaseModel):
    """Payload de criação de contrato.

    NOT NULL sem server_default: empresa_id (injetado pelo router), numero
    (gerado pelo serviço), tipo (default 'cliente' no DB, mas aqui opcional).
    Todos os outros campos são opcionais conforme o modelo gerado.
    """
    tipo: str = "cliente"
    modelo_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    parceiro_id: Optional[uuid.UUID] = None
    instrutor_id: Optional[uuid.UUID] = None
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    email: Optional[str] = None
    representante_legal: Optional[str] = None
    valor_implantacao: Optional[decimal.Decimal] = None
    valor_mensal: Optional[decimal.Decimal] = None
    valor_avista: Optional[decimal.Decimal] = None
    texto_avista: Optional[str] = None
    valor_3x: Optional[decimal.Decimal] = None
    texto_3x: Optional[str] = None
    valor_leasing: Optional[decimal.Decimal] = None
    texto_leasing: Optional[str] = None
    forma_pagamento: Optional[str] = None
    meio_pagamento: Optional[str] = None
    observacao_comercial: Optional[str] = None
    validade_dias: Optional[int] = None
    foro: Optional[str] = None
    observacoes_adicionais: Optional[str] = None
    criado_por: Optional[str] = None
    assinante_nome: Optional[str] = None
    assinante_cpf: Optional[str] = None
    status: Optional[str] = None  # default 'rascunho' no DB


class ContratoUpdate(BaseModel):
    tipo: Optional[str] = None
    modelo_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    parceiro_id: Optional[uuid.UUID] = None
    instrutor_id: Optional[uuid.UUID] = None
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    email: Optional[str] = None
    representante_legal: Optional[str] = None
    valor_implantacao: Optional[decimal.Decimal] = None
    valor_mensal: Optional[decimal.Decimal] = None
    valor_avista: Optional[decimal.Decimal] = None
    texto_avista: Optional[str] = None
    valor_3x: Optional[decimal.Decimal] = None
    texto_3x: Optional[str] = None
    valor_leasing: Optional[decimal.Decimal] = None
    texto_leasing: Optional[str] = None
    forma_pagamento: Optional[str] = None
    meio_pagamento: Optional[str] = None
    observacao_comercial: Optional[str] = None
    validade_dias: Optional[int] = None
    foro: Optional[str] = None
    observacoes_adicionais: Optional[str] = None
    criado_por: Optional[str] = None
    assinante_nome: Optional[str] = None
    assinante_cpf: Optional[str] = None
    assinado: Optional[bool] = None
    data_assinatura: Optional[datetime.datetime] = None
    status: Optional[str] = None


class ContratoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    numero: str
    tipo: str
    status: Optional[str] = None
    modelo_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    parceiro_id: Optional[uuid.UUID] = None
    instrutor_id: Optional[uuid.UUID] = None
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    email: Optional[str] = None
    representante_legal: Optional[str] = None
    valor_implantacao: Optional[decimal.Decimal] = None
    valor_mensal: Optional[decimal.Decimal] = None
    valor_avista: Optional[decimal.Decimal] = None
    texto_avista: Optional[str] = None
    valor_3x: Optional[decimal.Decimal] = None
    texto_3x: Optional[str] = None
    valor_leasing: Optional[decimal.Decimal] = None
    texto_leasing: Optional[str] = None
    forma_pagamento: Optional[str] = None
    meio_pagamento: Optional[str] = None
    observacao_comercial: Optional[str] = None
    validade_dias: Optional[int] = None
    foro: Optional[str] = None
    observacoes_adicionais: Optional[str] = None
    criado_por: Optional[str] = None
    assinante_nome: Optional[str] = None
    assinante_cpf: Optional[str] = None
    assinado: Optional[bool] = None
    data_assinatura: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Modelos de Contrato ───────────────────────────────────────────────────────

class ModeloContratoIn(BaseModel):
    nome: str
    tipo: str = "cliente"
    descricao: Optional[str] = None
    ativo: bool = True


class ModeloContratoUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class ModeloContratoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    tipo: str
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Cláusulas de Contrato ─────────────────────────────────────────────────────

class ContratoClausulaIn(BaseModel):
    numero: int
    titulo: str
    conteudo: str
    ordem: int = 0


class ContratoClausulaUpdate(BaseModel):
    numero: Optional[int] = None
    titulo: Optional[str] = None
    conteudo: Optional[str] = None
    ordem: Optional[int] = None


class ContratoClausulaOut(BaseModel):
    id: uuid.UUID
    contrato_id: uuid.UUID
    numero: int
    titulo: str
    conteudo: str
    ordem: int
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Módulos de Contrato ───────────────────────────────────────────────────────

class ContratoModuloIn(BaseModel):
    nome: str
    ordem: int = 0
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None


class ContratoModuloUpdate(BaseModel):
    nome: Optional[str] = None
    ordem: Optional[int] = None
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None


class ContratoModuloOut(BaseModel):
    id: uuid.UUID
    contrato_id: uuid.UUID
    nome: str
    ordem: int
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Cláusulas de Modelo ───────────────────────────────────────────────────────

class ModeloClausulaIn(BaseModel):
    numero: int
    titulo: str
    conteudo: str
    ordem: int = 0


class ModeloClausulaUpdate(BaseModel):
    numero: Optional[int] = None
    titulo: Optional[str] = None
    conteudo: Optional[str] = None
    ordem: Optional[int] = None


class ModeloClausulaOut(BaseModel):
    id: uuid.UUID
    modelo_id: uuid.UUID
    numero: int
    titulo: str
    conteudo: str
    ordem: int
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Módulos de Modelo ─────────────────────────────────────────────────────────

class ModeloModuloIn(BaseModel):
    nome: str
    ordem: int = 0
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None


class ModeloModuloUpdate(BaseModel):
    nome: Optional[str] = None
    ordem: Optional[int] = None
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None


class ModeloModuloOut(BaseModel):
    id: uuid.UUID
    modelo_id: uuid.UUID
    nome: str
    ordem: int
    versao: Optional[str] = None
    tipo_cliente: Optional[str] = None
    descricao: Optional[str] = None
    itens: Optional[list[str]] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
