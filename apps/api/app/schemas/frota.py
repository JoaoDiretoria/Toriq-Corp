"""Schemas Pydantic para o módulo Frota (fleet management)."""
import datetime
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Veículos ──────────────────────────────────────────────────────────────────

class VeiculoIn(BaseModel):
    placa: str
    renavam: Optional[str] = None
    chassi: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[str] = None
    tipo: Optional[str] = None
    combustivel: Optional[str] = None
    km_atual: Optional[int] = None
    gestor_responsavel: Optional[str] = None
    motorista_padrao: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = True
    checklist_obrigatorio: Optional[bool] = False


class VeiculoUpdate(BaseModel):
    placa: Optional[str] = None
    renavam: Optional[str] = None
    chassi: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[str] = None
    tipo: Optional[str] = None
    combustivel: Optional[str] = None
    km_atual: Optional[int] = None
    gestor_responsavel: Optional[str] = None
    motorista_padrao: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None
    checklist_obrigatorio: Optional[bool] = None


class VeiculoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    placa: str
    renavam: Optional[str] = None
    chassi: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[str] = None
    tipo: Optional[str] = None
    combustivel: Optional[str] = None
    km_atual: Optional[int] = None
    gestor_responsavel: Optional[str] = None
    motorista_padrao: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None
    checklist_obrigatorio: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Motoristas ────────────────────────────────────────────────────────────────

class MotoristaIn(BaseModel):
    nome: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    cnh_numero: Optional[str] = None
    cnh_categoria: Optional[str] = None
    cnh_validade: Optional[datetime.date] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    foto_url: Optional[str] = None
    cpf_anexo_url: Optional[str] = None
    rg_anexo_url: Optional[str] = None
    cnh_anexo_url: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = True
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None


class MotoristaUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    cnh_numero: Optional[str] = None
    cnh_categoria: Optional[str] = None
    cnh_validade: Optional[datetime.date] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    foto_url: Optional[str] = None
    cpf_anexo_url: Optional[str] = None
    rg_anexo_url: Optional[str] = None
    cnh_anexo_url: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None


class MotoristaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    data_nascimento: Optional[datetime.date] = None
    cnh_numero: Optional[str] = None
    cnh_categoria: Optional[str] = None
    cnh_validade: Optional[datetime.date] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    foto_url: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Manutenções ───────────────────────────────────────────────────────────────

class ManutencaoIn(BaseModel):
    veiculo_id: uuid.UUID
    tipo: str
    data: datetime.date
    servico: str
    status: Optional[str] = "Agendada"
    km: Optional[int] = None
    custo: Optional[decimal.Decimal] = None
    proxima_km: Optional[int] = None
    proxima_data: Optional[datetime.date] = None
    observacoes: Optional[str] = None


class ManutencaoUpdate(BaseModel):
    tipo: Optional[str] = None
    data: Optional[datetime.date] = None
    servico: Optional[str] = None
    status: Optional[str] = None
    km: Optional[int] = None
    custo: Optional[decimal.Decimal] = None
    proxima_km: Optional[int] = None
    proxima_data: Optional[datetime.date] = None
    observacoes: Optional[str] = None


class ManutencaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    tipo: str
    data: datetime.date
    servico: str
    status: str
    km: Optional[int] = None
    custo: Optional[decimal.Decimal] = None
    proxima_km: Optional[int] = None
    proxima_data: Optional[datetime.date] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Checklists ────────────────────────────────────────────────────────────────

class ChecklistIn(BaseModel):
    veiculo_id: uuid.UUID
    data: datetime.date
    status_geral: Optional[str] = "Aprovado"
    tipo: Optional[str] = "Pré-uso"
    km: Optional[int] = None
    responsavel: Optional[str] = None
    local_inspecao: Optional[str] = None
    itens_verificados: Optional[list[str]] = None
    observacoes: Optional[str] = None


class ChecklistUpdate(BaseModel):
    data: Optional[datetime.date] = None
    status_geral: Optional[str] = None
    tipo: Optional[str] = None
    km: Optional[int] = None
    responsavel: Optional[str] = None
    local_inspecao: Optional[str] = None
    itens_verificados: Optional[list[str]] = None
    observacoes: Optional[str] = None


class ChecklistOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    data: datetime.date
    status_geral: str
    tipo: Optional[str] = None
    km: Optional[int] = None
    responsavel: Optional[str] = None
    local_inspecao: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Custos ────────────────────────────────────────────────────────────────────

class CustoIn(BaseModel):
    veiculo_id: uuid.UUID
    categoria: str
    data: datetime.date
    valor: decimal.Decimal
    fornecedor: Optional[str] = None
    observacoes: Optional[str] = None


class CustoUpdate(BaseModel):
    categoria: Optional[str] = None
    data: Optional[datetime.date] = None
    valor: Optional[decimal.Decimal] = None
    fornecedor: Optional[str] = None
    observacoes: Optional[str] = None


class CustoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    categoria: str
    data: datetime.date
    valor: decimal.Decimal
    fornecedor: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Documentos ────────────────────────────────────────────────────────────────

class DocumentoIn(BaseModel):
    veiculo_id: uuid.UUID
    tipo: Optional[str] = "Licenciamento"
    vencimento: datetime.date
    numero: Optional[str] = None
    observacoes: Optional[str] = None
    anexo_url: Optional[str] = None
    arquivo_url: Optional[str] = None


class DocumentoUpdate(BaseModel):
    tipo: Optional[str] = None
    vencimento: Optional[datetime.date] = None
    numero: Optional[str] = None
    observacoes: Optional[str] = None
    anexo_url: Optional[str] = None
    arquivo_url: Optional[str] = None


class DocumentoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    tipo: str
    vencimento: datetime.date
    numero: Optional[str] = None
    observacoes: Optional[str] = None
    anexo_url: Optional[str] = None
    arquivo_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Ocorrências ───────────────────────────────────────────────────────────────

class OcorrenciaIn(BaseModel):
    veiculo_id: uuid.UUID
    tipo: str
    data: datetime.date
    descricao: str
    status: Optional[str] = "Aberta"
    local_ocorrencia: Optional[str] = None
    custo_estimado: Optional[decimal.Decimal] = None
    responsavel: Optional[str] = None
    prazo: Optional[datetime.date] = None


class OcorrenciaUpdate(BaseModel):
    tipo: Optional[str] = None
    data: Optional[datetime.date] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    local_ocorrencia: Optional[str] = None
    custo_estimado: Optional[decimal.Decimal] = None
    responsavel: Optional[str] = None
    prazo: Optional[datetime.date] = None


class OcorrenciaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    tipo: str
    data: datetime.date
    descricao: str
    status: str
    local_ocorrencia: Optional[str] = None
    custo_estimado: Optional[decimal.Decimal] = None
    responsavel: Optional[str] = None
    prazo: Optional[datetime.date] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Utilizações ───────────────────────────────────────────────────────────────

class UtilizacaoIn(BaseModel):
    veiculo_id: uuid.UUID
    data: datetime.date
    km_inicio: int
    local_utilizacao: Optional[str] = None
    motorista: Optional[str] = None
    km_fim: Optional[int] = None
    finalidade: Optional[str] = None
    observacoes: Optional[str] = None
    codigo: Optional[str] = None
    data_saida: Optional[datetime.date] = None
    hora_saida: Optional[datetime.time] = None
    previsao_retorno: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.date] = None
    hora_retorno: Optional[datetime.time] = None
    status: Optional[str] = None
    km_rodados: Optional[int] = None
    numero_movimentacao: Optional[str] = None


class UtilizacaoUpdate(BaseModel):
    data: Optional[datetime.date] = None
    km_inicio: Optional[int] = None
    local_utilizacao: Optional[str] = None
    motorista: Optional[str] = None
    km_fim: Optional[int] = None
    finalidade: Optional[str] = None
    observacoes: Optional[str] = None
    codigo: Optional[str] = None
    data_saida: Optional[datetime.date] = None
    hora_saida: Optional[datetime.time] = None
    previsao_retorno: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.date] = None
    hora_retorno: Optional[datetime.time] = None
    status: Optional[str] = None
    km_rodados: Optional[int] = None
    numero_movimentacao: Optional[str] = None


class UtilizacaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    veiculo_id: uuid.UUID
    data: datetime.date
    km_inicio: int
    local_utilizacao: Optional[str] = None
    motorista: Optional[str] = None
    km_fim: Optional[int] = None
    finalidade: Optional[str] = None
    observacoes: Optional[str] = None
    codigo: Optional[str] = None
    data_saida: Optional[datetime.date] = None
    hora_saida: Optional[datetime.time] = None
    previsao_retorno: Optional[datetime.datetime] = None
    data_retorno: Optional[datetime.date] = None
    hora_retorno: Optional[datetime.time] = None
    status: Optional[str] = None
    km_rodados: Optional[int] = None
    numero_movimentacao: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
