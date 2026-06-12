"""Schemas Pydantic para o módulo Produtos/Serviços (catálogo)."""
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── CategoriasProdutos ────────────────────────────────────────────────────────

class CategoriaProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: bool = True


class CategoriaProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    cor: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── ClassificacoesProdutos ────────────────────────────────────────────────────

class ClassificacaoProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True


class ClassificacaoProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── NaturezasProdutos ─────────────────────────────────────────────────────────

class NaturezaProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True


class NaturezaProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── TiposProdutos ─────────────────────────────────────────────────────────────

class TipoProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True


class TipoProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── TiposServico ──────────────────────────────────────────────────────────────

class TipoServicoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ativo: bool = True


class TipoServicoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── Servicos ──────────────────────────────────────────────────────────────────

class ServicoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    tipo: Optional[str] = None
    preco: Optional[decimal.Decimal] = None
    unidade: Optional[str] = None
    duracao_estimada: Optional[str] = None
    ativo: bool = True
    destaque: bool = False
    ordem: int = 0


class ServicoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    tipo: Optional[str] = None
    preco: Optional[decimal.Decimal] = None
    unidade: Optional[str] = None
    duracao_estimada: Optional[str] = None
    ativo: Optional[bool] = None
    destaque: Optional[bool] = None
    ordem: Optional[int] = None


class ServicoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    categoria: Optional[str]
    tipo: Optional[str]
    preco: Optional[decimal.Decimal]
    unidade: Optional[str]
    duracao_estimada: Optional[str]
    ativo: Optional[bool]
    destaque: Optional[bool]
    ordem: Optional[int]
    model_config = {"from_attributes": True}


# ── ProdutosServicos ──────────────────────────────────────────────────────────

class ProdutoServicoIn(BaseModel):
    nome: str
    colaboradores_por_turma: int = 30
    # FKs para tabelas tenant — validados no endpoint
    categoria_id: Optional[uuid.UUID] = None
    classificacao_id: Optional[uuid.UUID] = None
    natureza_id: Optional[uuid.UUID] = None
    tipo_id: Optional[uuid.UUID] = None
    tipo_servico_id: Optional[uuid.UUID] = None
    # FK para FormasCobranca (tenant) — validada no endpoint
    forma_cobranca_id: Optional[uuid.UUID] = None
    codigo: Optional[str] = None
    preco: Optional[decimal.Decimal] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    ativo: bool = True
    forma_cobranca: Optional[str] = None
    carga_horaria: Optional[int] = None
    ch_formacao: Optional[int] = None
    ch_reciclagem: Optional[int] = None
    classificacao: Optional[str] = None
    categoria_plano: Optional[str] = None
    norma: Optional[str] = None


class ProdutoServicoUpdate(BaseModel):
    nome: Optional[str] = None
    colaboradores_por_turma: Optional[int] = None
    categoria_id: Optional[uuid.UUID] = None
    classificacao_id: Optional[uuid.UUID] = None
    natureza_id: Optional[uuid.UUID] = None
    tipo_id: Optional[uuid.UUID] = None
    tipo_servico_id: Optional[uuid.UUID] = None
    forma_cobranca_id: Optional[uuid.UUID] = None
    codigo: Optional[str] = None
    preco: Optional[decimal.Decimal] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    ativo: Optional[bool] = None
    forma_cobranca: Optional[str] = None
    carga_horaria: Optional[int] = None
    ch_formacao: Optional[int] = None
    ch_reciclagem: Optional[int] = None
    classificacao: Optional[str] = None
    categoria_plano: Optional[str] = None
    norma: Optional[str] = None


class ProdutoServicoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    colaboradores_por_turma: int
    categoria_id: Optional[uuid.UUID]
    classificacao_id: Optional[uuid.UUID]
    natureza_id: Optional[uuid.UUID]
    tipo_id: Optional[uuid.UUID]
    tipo_servico_id: Optional[uuid.UUID]
    forma_cobranca_id: Optional[uuid.UUID]
    codigo: Optional[str]
    preco: Optional[decimal.Decimal]
    descricao: Optional[str]
    tipo: Optional[str]
    ativo: Optional[bool]
    forma_cobranca: Optional[str]
    carga_horaria: Optional[int]
    ch_formacao: Optional[int]
    ch_reciclagem: Optional[int]
    classificacao: Optional[str]
    categoria_plano: Optional[str]
    norma: Optional[str]
    model_config = {"from_attributes": True}


# ── PlanosProdutos ────────────────────────────────────────────────────────────

class PlanoProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ordem: int = 0
    ativo: bool = True


class PlanoProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    cor: Optional[str]
    ordem: Optional[int]
    ativo: Optional[bool]
    model_config = {"from_attributes": True}


# ── PacotesProdutos ───────────────────────────────────────────────────────────

class PacoteProdutoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco_total: Optional[decimal.Decimal] = None
    preco_fixo: Optional[decimal.Decimal] = None
    desconto_percentual: Optional[decimal.Decimal] = None
    ativo: bool = True
    forma_cobranca: Optional[str] = None


class PacoteProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco_total: Optional[decimal.Decimal] = None
    preco_fixo: Optional[decimal.Decimal] = None
    desconto_percentual: Optional[decimal.Decimal] = None
    ativo: Optional[bool] = None
    forma_cobranca: Optional[str] = None


class PacoteProdutoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str]
    preco_total: Optional[decimal.Decimal]
    preco_fixo: Optional[decimal.Decimal]
    desconto_percentual: Optional[decimal.Decimal]
    ativo: Optional[bool]
    forma_cobranca: Optional[str]
    model_config = {"from_attributes": True}


# ── PacotesProdutosItens ──────────────────────────────────────────────────────

class PacoteItemIn(BaseModel):
    produto_id: uuid.UUID  # FK para ProdutosServicos — validado no endpoint
    quantidade: int = 1


class PacoteItemUpdate(BaseModel):
    quantidade: Optional[int] = None


class PacoteItemOut(BaseModel):
    id: uuid.UUID
    pacote_id: uuid.UUID
    produto_id: uuid.UUID
    quantidade: Optional[int]
    model_config = {"from_attributes": True}
