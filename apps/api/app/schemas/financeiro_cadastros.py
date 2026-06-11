import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Fornecedores ──────────────────────────────────────────────────────────────
class FornecedorIn(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj_cpf: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    observacoes: Optional[str] = None
    classificacao_despesa_padrao: Optional[str] = None
    descricao_despesa_padrao: Optional[str] = None
    ativo: bool = True


class FornecedorOut(BaseModel):
    id: uuid.UUID
    razao_social: str
    nome_fantasia: Optional[str]
    cnpj_cpf: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    endereco: Optional[str]
    observacoes: Optional[str]
    classificacao_despesa_padrao: Optional[str]
    descricao_despesa_padrao: Optional[str]
    ativo: bool
    model_config = {"from_attributes": True}


# ── FormasPagamento ───────────────────────────────────────────────────────────
class FormaPagamentoIn(BaseModel):
    nome: str
    ativo: bool = True
    descricao: Optional[str] = None
    taxa_percentual: Optional[decimal.Decimal] = None
    dias_recebimento: Optional[int] = None


class FormaPagamentoOut(BaseModel):
    id: uuid.UUID
    nome: str
    ativo: bool
    descricao: Optional[str]
    taxa_percentual: Optional[decimal.Decimal]
    dias_recebimento: Optional[int]
    model_config = {"from_attributes": True}


# ── FormasCobranca ────────────────────────────────────────────────────────────
class FormaCobrancaIn(BaseModel):
    nome: str
    periodicidade: int
    ativo: Optional[bool] = True


class FormaCobrancaOut(BaseModel):
    id: uuid.UUID
    nome: str
    periodicidade: int
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── CondicoesPagamento ────────────────────────────────────────────────────────
class CondicaoPagamentoIn(BaseModel):
    nome: str
    parcelas: int = 1
    intervalo_dias: int = 30
    ativo: bool = True
    descricao: Optional[str] = None
    entrada_percentual: Optional[decimal.Decimal] = None


class CondicaoPagamentoOut(BaseModel):
    id: uuid.UUID
    nome: str
    parcelas: int
    intervalo_dias: int
    ativo: bool
    descricao: Optional[str]
    entrada_percentual: Optional[decimal.Decimal]
    model_config = {"from_attributes": True}


# ── CentrosCusto ──────────────────────────────────────────────────────────────
class CentroCustoIn(BaseModel):
    nome: str
    tipo: str = "ambos"
    ativo: bool = True
    descricao: Optional[str] = None


class CentroCustoOut(BaseModel):
    id: uuid.UUID
    nome: str
    tipo: str
    ativo: bool
    descricao: Optional[str]
    model_config = {"from_attributes": True}


# ── ContasBancarias ───────────────────────────────────────────────────────────
class ContaBancariaIn(BaseModel):
    banco: str
    agencia: str
    conta: str
    tipo: str
    saldo_inicial: decimal.Decimal = decimal.Decimal("0")
    ativo: bool = True
    descricao: Optional[str] = None


class ContaBancariaOut(BaseModel):
    id: uuid.UUID
    banco: str
    agencia: str
    conta: str
    tipo: str
    saldo_inicial: decimal.Decimal
    ativo: bool
    descricao: Optional[str]
    model_config = {"from_attributes": True}


# ── PlanoReceitas ─────────────────────────────────────────────────────────────
class PlanoReceitaIn(BaseModel):
    nome: str
    tipo: str
    ativo: bool = True
    descricao: Optional[str] = None


class PlanoReceitaOut(BaseModel):
    id: uuid.UUID
    nome: str
    tipo: str
    ativo: bool
    descricao: Optional[str]
    model_config = {"from_attributes": True}


# ── PlanoDespesas ─────────────────────────────────────────────────────────────
class PlanoDespesaIn(BaseModel):
    nome: str
    tipo: str
    ativo: bool = True
    descricao: Optional[str] = None


class PlanoDespesaOut(BaseModel):
    id: uuid.UUID
    nome: str
    tipo: str
    ativo: bool
    descricao: Optional[str]
    model_config = {"from_attributes": True}
