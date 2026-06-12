"""Schemas Pydantic para o módulo Treinamentos — instrutores, empresas
parceiras, datas indisponíveis (filha de instrutores), config de reconhecimento
facial e anexos de card do funil.

Notas de segurança:
- Schemas de UPDATE NUNCA incluem colunas de parentesco/tenant
  (empresa_id, empresa_sst_id, instrutor_id, card_id, cliente_empresa_id) —
  evita re-parenteamento / re-tenanting cross-tenant.
- empresa_parceira_id (no payload de Instrutor) é validado contra o tenant no
  create do router.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Instrutores (tenant = empresa_id) ─────────────────────────────────────────

class InstrutorIn(BaseModel):
    nome: str
    cpf_cnpj: str
    email: str
    telefone: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    ativo: Optional[bool] = True
    empresa_parceira_id: Optional[uuid.UUID] = None
    formacao_academica: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None


class InstrutorUpdate(BaseModel):
    nome: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    ativo: Optional[bool] = None
    empresa_parceira_id: Optional[uuid.UUID] = None
    formacao_academica: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None


class InstrutorOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cpf_cnpj: str
    email: str
    telefone: Optional[str]
    data_nascimento: Optional[datetime.date]
    ativo: Optional[bool]
    empresa_parceira_id: Optional[uuid.UUID]
    formacao_academica: Optional[str]
    cep: Optional[str]
    logradouro: Optional[str]
    numero: Optional[str]
    complemento: Optional[str]
    bairro: Optional[str]
    cidade: Optional[str]
    uf: Optional[str]
    veiculo: Optional[str]
    placa: Optional[str]
    model_config = {"from_attributes": True}


# ── EmpresasParceiras (tenant = empresa_sst_id, NÃO empresa_id) ───────────────

class EmpresaParceiraIn(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    responsavel: Optional[str] = None
    tipo_fornecedor: Optional[str] = None


class EmpresaParceiraUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    responsavel: Optional[str] = None
    tipo_fornecedor: Optional[str] = None


class EmpresaParceiraOut(BaseModel):
    id: uuid.UUID
    empresa_sst_id: uuid.UUID
    nome: str
    cnpj: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    responsavel: Optional[str]
    tipo_fornecedor: Optional[str]
    model_config = {"from_attributes": True}


# ── InstrutorDatasIndisponiveis (filha de instrutores via instrutor_id) ───────

class DataIndisponivelIn(BaseModel):
    data: datetime.date
    motivo: Optional[str] = None
    status: Optional[str] = None
    origem: Optional[str] = None


class DataIndisponivelUpdate(BaseModel):
    data: Optional[datetime.date] = None
    motivo: Optional[str] = None
    status: Optional[str] = None
    origem: Optional[str] = None
    motivo_rejeicao: Optional[str] = None


class DataIndisponivelOut(BaseModel):
    id: uuid.UUID
    instrutor_id: uuid.UUID
    data: datetime.date
    motivo: Optional[str]
    status: Optional[str]
    origem: Optional[str]
    motivo_rejeicao: Optional[str]
    model_config = {"from_attributes": True}


# ── ReconhecimentoFacialConfig (tenant = empresa_sst_id) ──────────────────────
# UNIQUE(empresa_sst_id, cliente_empresa_id). cliente_empresa_id vem no create
# (define o cliente); no update só `ativo` é alterável.

class ReconhecimentoFacialConfigIn(BaseModel):
    cliente_empresa_id: uuid.UUID
    ativo: Optional[bool] = False


class ReconhecimentoFacialConfigUpdate(BaseModel):
    ativo: Optional[bool] = None


class ReconhecimentoFacialConfigOut(BaseModel):
    id: uuid.UUID
    empresa_sst_id: uuid.UUID
    cliente_empresa_id: uuid.UUID
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── FunilCardAnexos (filha de funil_cards via card_id) ────────────────────────

class CardAnexoIn(BaseModel):
    nome: Optional[str] = None
    arquivo_url: Optional[str] = None
    arquivo_path: Optional[str] = None


class CardAnexoUpdate(BaseModel):
    nome: Optional[str] = None
    arquivo_url: Optional[str] = None
    arquivo_path: Optional[str] = None


class CardAnexoOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    nome: Optional[str]
    arquivo_url: Optional[str]
    arquivo_path: Optional[str]
    model_config = {"from_attributes": True}
