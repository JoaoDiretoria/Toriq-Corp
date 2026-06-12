"""Schemas para o módulo Funil Card Extras — orçamentos, propostas e comparações."""
import datetime
import decimal
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ── Orçamentos (funil_card_orcamentos) ────────────────────────────────────────

class OrcamentoIn(BaseModel):
    cliente_nome: Optional[str] = None
    cidade_destino: Optional[str] = None
    estado_destino: Optional[str] = None
    km: Optional[decimal.Decimal] = None
    itens_ouro: Optional[Any] = None
    itens_prata: Optional[Any] = None
    itens_bronze: Optional[Any] = None
    total_ouro: Optional[decimal.Decimal] = None
    total_prata: Optional[decimal.Decimal] = None
    total_bronze: Optional[decimal.Decimal] = None
    config: Optional[Any] = None


class OrcamentoUpdateIn(BaseModel):
    """Payload de atualização — card_id e empresa_id excluídos para evitar
    re-parenteamento cross-tenant."""
    cliente_nome: Optional[str] = None
    cidade_destino: Optional[str] = None
    estado_destino: Optional[str] = None
    km: Optional[decimal.Decimal] = None
    itens_ouro: Optional[Any] = None
    itens_prata: Optional[Any] = None
    itens_bronze: Optional[Any] = None
    total_ouro: Optional[decimal.Decimal] = None
    total_prata: Optional[decimal.Decimal] = None
    total_bronze: Optional[decimal.Decimal] = None
    config: Optional[Any] = None


class OrcamentoOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    empresa_id: uuid.UUID
    cliente_nome: Optional[str] = None
    cidade_destino: Optional[str] = None
    estado_destino: Optional[str] = None
    km: Optional[decimal.Decimal] = None
    itens_ouro: Optional[Any] = None
    itens_prata: Optional[Any] = None
    itens_bronze: Optional[Any] = None
    total_ouro: Optional[decimal.Decimal] = None
    total_prata: Optional[decimal.Decimal] = None
    total_bronze: Optional[decimal.Decimal] = None
    config: Optional[Any] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    created_by: Optional[uuid.UUID] = None
    model_config = {"from_attributes": True}


# ── Orçamentos Serviços SST (funil_card_orcamentos_servicos_sst) ───────────────

class OrcamentoSstIn(BaseModel):
    itens: Optional[Any] = None
    encargos: Optional[Any] = None
    precificacao: Optional[Any] = None
    totais: Optional[Any] = None


class OrcamentoSstUpdateIn(BaseModel):
    itens: Optional[Any] = None
    encargos: Optional[Any] = None
    precificacao: Optional[Any] = None
    totais: Optional[Any] = None


class OrcamentoSstOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    empresa_id: uuid.UUID
    itens: Optional[Any] = None
    encargos: Optional[Any] = None
    precificacao: Optional[Any] = None
    totais: Optional[Any] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    created_by: Optional[uuid.UUID] = None
    model_config = {"from_attributes": True}


# ── Propostas (funil_card_propostas) ──────────────────────────────────────────

class PropostaIn(BaseModel):
    titulo: str
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None
    orcamento_vinculado_tipo: Optional[str] = None
    orcamento_vinculado_id: Optional[uuid.UUID] = None


class PropostaUpdateIn(BaseModel):
    """Payload de atualização — card_id e empresa_id excluídos."""
    titulo: Optional[str] = None
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None
    orcamento_vinculado_tipo: Optional[str] = None
    orcamento_vinculado_id: Optional[uuid.UUID] = None


class PropostaOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    empresa_id: uuid.UUID
    titulo: str
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None
    orcamento_vinculado_tipo: Optional[str] = None
    orcamento_vinculado_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    created_by: Optional[uuid.UUID] = None
    model_config = {"from_attributes": True}


# ── Comparações (funil_card_comparacoes) ──────────────────────────────────────

class ComparacaoIn(BaseModel):
    valor_campo_numerico: Optional[str] = None
    label_treinamentos_inclusos: Optional[str] = None
    label_sistema_gestao_anual: Optional[str] = None
    label_implantacao: Optional[str] = None
    label_total_anual: Optional[str] = None
    label_valor_mensal: Optional[str] = None
    label_campo_numerico: Optional[str] = None
    label_campo_valor: Optional[str] = None
    campo1_treinamento: Optional[str] = None
    campo2_turmas: Optional[str] = None
    campo4_sistema_gestao: Optional[str] = None
    campo5_implantacao: Optional[str] = None
    label_valor_medio: Optional[str] = None
    label_quantidade_turmas: Optional[str] = None
    label_valor_total_turmas: Optional[str] = None
    label_sistema_gestao_mensal: Optional[str] = None
    label_sistema_gestao_anual_avulso: Optional[str] = None
    label_implantacao_avulso: Optional[str] = None
    label_valor_total_investido: Optional[str] = None
    label_pontos_fortes: Optional[str] = None
    texto_pontos_fortes: Optional[str] = None
    label_pontos_desejar: Optional[str] = None
    texto_pontos_desejar: Optional[str] = None


class ComparacaoUpdateIn(BaseModel):
    """Payload de atualização — card_id e empresa_id excluídos."""
    valor_campo_numerico: Optional[str] = None
    label_treinamentos_inclusos: Optional[str] = None
    label_sistema_gestao_anual: Optional[str] = None
    label_implantacao: Optional[str] = None
    label_total_anual: Optional[str] = None
    label_valor_mensal: Optional[str] = None
    label_campo_numerico: Optional[str] = None
    label_campo_valor: Optional[str] = None
    campo1_treinamento: Optional[str] = None
    campo2_turmas: Optional[str] = None
    campo4_sistema_gestao: Optional[str] = None
    campo5_implantacao: Optional[str] = None
    label_valor_medio: Optional[str] = None
    label_quantidade_turmas: Optional[str] = None
    label_valor_total_turmas: Optional[str] = None
    label_sistema_gestao_mensal: Optional[str] = None
    label_sistema_gestao_anual_avulso: Optional[str] = None
    label_implantacao_avulso: Optional[str] = None
    label_valor_total_investido: Optional[str] = None
    label_pontos_fortes: Optional[str] = None
    texto_pontos_fortes: Optional[str] = None
    label_pontos_desejar: Optional[str] = None
    texto_pontos_desejar: Optional[str] = None


class ComparacaoOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    empresa_id: uuid.UUID
    valor_campo_numerico: Optional[str] = None
    label_treinamentos_inclusos: Optional[str] = None
    label_sistema_gestao_anual: Optional[str] = None
    label_implantacao: Optional[str] = None
    label_total_anual: Optional[str] = None
    label_valor_mensal: Optional[str] = None
    label_campo_numerico: Optional[str] = None
    label_campo_valor: Optional[str] = None
    campo1_treinamento: Optional[str] = None
    campo2_turmas: Optional[str] = None
    campo4_sistema_gestao: Optional[str] = None
    campo5_implantacao: Optional[str] = None
    label_valor_medio: Optional[str] = None
    label_quantidade_turmas: Optional[str] = None
    label_valor_total_turmas: Optional[str] = None
    label_sistema_gestao_mensal: Optional[str] = None
    label_sistema_gestao_anual_avulso: Optional[str] = None
    label_implantacao_avulso: Optional[str] = None
    label_valor_total_investido: Optional[str] = None
    label_pontos_fortes: Optional[str] = None
    texto_pontos_fortes: Optional[str] = None
    label_pontos_desejar: Optional[str] = None
    texto_pontos_desejar: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    created_by: Optional[uuid.UUID] = None
    model_config = {"from_attributes": True}
