"""Schemas do módulo Funil/Comercial avançado.

Cobre:
- automacoes (empresa_id; valida funil_id/etapa_id)
- automacoes_execucoes (filha de automacoes, escopada via automacao)
- funis_configuracoes (escopada via funis.empresa_id)
- funil_negocio_configuracoes (empresa_id)
- comercial_funil (empresa_id NULLABLE — escrita sempre carimba empresa_id)
- propostas_comerciais_treinamentos / _servicos_sst / _vertical365 (empresa_id; valida card_id)
- atividades_unificadas (VIEW — somente leitura)

Regra de segurança: schemas de UPDATE NÃO contêm FKs de parentesco
(funil_id / etapa_id / card_id / automacao_id / empresa_id). FKs só na criação,
e sempre validadas contra o empresa_id do usuário no router.
"""
import datetime
import decimal
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ═══════════════════════════════════════════════════════════════════════════════
# Automações
# ═══════════════════════════════════════════════════════════════════════════════

class AutomacaoIn(BaseModel):
    nome: str
    tipo: str
    gatilho: str
    acao_config: Optional[dict] = None
    ativo: Optional[bool] = None
    descricao: Optional[str] = None
    funil_id: Optional[uuid.UUID] = None
    etapa_id: Optional[uuid.UUID] = None
    dias_parado: Optional[int] = None
    agendamento_data_hora: Optional[datetime.datetime] = None


class AutomacaoUpdateIn(BaseModel):
    # Sem FKs de parentesco (funil_id / etapa_id) — alteração de vínculo não é
    # permitida via update simples para evitar FK-injection cross-tenant.
    nome: Optional[str] = None
    tipo: Optional[str] = None
    gatilho: Optional[str] = None
    acao_config: Optional[dict] = None
    ativo: Optional[bool] = None
    descricao: Optional[str] = None
    dias_parado: Optional[int] = None
    agendamento_data_hora: Optional[datetime.datetime] = None


class AutomacaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    tipo: str
    gatilho: str
    acao_config: dict
    ativo: bool
    executado: bool
    descricao: Optional[str]
    funil_id: Optional[uuid.UUID]
    etapa_id: Optional[uuid.UUID]
    dias_parado: Optional[int]
    agendamento_data_hora: Optional[datetime.datetime]
    ultima_execucao: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── Execuções (filhas de automacoes) ──────────────────────────────────────────

class AutomacaoExecucaoIn(BaseModel):
    # automacao_id e empresa_id vêm do path/contexto, nunca do payload.
    card_id: uuid.UUID
    executar_em: datetime.datetime
    executado: Optional[bool] = None
    executado_em: Optional[datetime.datetime] = None
    erro: Optional[str] = None


class AutomacaoExecucaoUpdateIn(BaseModel):
    executar_em: Optional[datetime.datetime] = None
    executado: Optional[bool] = None
    executado_em: Optional[datetime.datetime] = None
    erro: Optional[str] = None


class AutomacaoExecucaoOut(BaseModel):
    id: uuid.UUID
    automacao_id: uuid.UUID
    card_id: uuid.UUID
    empresa_id: uuid.UUID
    executar_em: datetime.datetime
    executado: bool
    executado_em: Optional[datetime.datetime]
    erro: Optional[str]
    created_at: datetime.datetime
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Configurações do funil (funis_configuracoes — escopada via funil)
# ═══════════════════════════════════════════════════════════════════════════════

class FunilConfiguracaoIn(BaseModel):
    # funil_id vem do path; empresa_id é carimbado no router.
    titulo_pagina: Optional[str] = None
    descricao_pagina: Optional[str] = None
    modo_visualizacao: Optional[str] = None
    dashboard_visivel: Optional[bool] = None
    dashboard_tipo: Optional[str] = None
    dashboard_metricas: Optional[Any] = None
    botao_adicionar_visivel: Optional[bool] = None
    botao_adicionar_texto: Optional[str] = None
    card_campos_visiveis: Optional[Any] = None
    card_mostrar_valor: Optional[bool] = None
    card_mostrar_cliente: Optional[bool] = None
    card_mostrar_data: Optional[bool] = None
    card_mostrar_responsavel: Optional[bool] = None
    card_mostrar_etiquetas: Optional[bool] = None
    card_mostrar_categoria: Optional[bool] = None
    card_mostrar_status: Optional[bool] = None
    card_mostrar_status_atividade: Optional[bool] = None
    cards_ordenacao: Optional[str] = None
    formulario_campos: Optional[Any] = None
    acoes_especiais: Optional[Any] = None


class FunilConfiguracaoOut(BaseModel):
    id: uuid.UUID
    funil_id: uuid.UUID
    empresa_id: Optional[uuid.UUID]
    titulo_pagina: Optional[str]
    descricao_pagina: Optional[str]
    modo_visualizacao: Optional[str]
    dashboard_visivel: Optional[bool]
    dashboard_tipo: Optional[str]
    dashboard_metricas: Optional[Any]
    botao_adicionar_visivel: Optional[bool]
    botao_adicionar_texto: Optional[str]
    card_campos_visiveis: Optional[Any]
    card_mostrar_valor: Optional[bool]
    cards_ordenacao: Optional[str]
    formulario_campos: Optional[Any]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Configurações de negócio do funil (funil_negocio_configuracoes — empresa_id)
# ═══════════════════════════════════════════════════════════════════════════════

class FunilNegocioConfiguracaoIn(BaseModel):
    acao_etiquetas: Optional[bool] = None
    acao_encaminhar_card: Optional[bool] = None
    acao_elaborar_orcamento: Optional[bool] = None
    acao_enviar_email: Optional[bool] = None
    calc_treinamento_normativo: Optional[bool] = None
    calc_servicos_sst: Optional[bool] = None
    calc_vertical_365: Optional[bool] = None
    calc_comparacao_vertical_treinamentos: Optional[bool] = None
    campo_valor_ativo: Optional[bool] = None
    campo_valor_obrigatorio: Optional[bool] = None
    campo_status_negocio_ativo: Optional[bool] = None
    campo_status_negocio_obrigatorio: Optional[bool] = None
    campo_cliente_ativo: Optional[bool] = None
    campo_cliente_obrigatorio: Optional[bool] = None
    campo_data_previsao_ativo: Optional[bool] = None
    campo_data_previsao_obrigatorio: Optional[bool] = None
    campo_responsavel_ativo: Optional[bool] = None
    campo_responsavel_obrigatorio: Optional[bool] = None
    campo_descricao_ativo: Optional[bool] = None
    campo_descricao_obrigatorio: Optional[bool] = None
    status_config: Optional[Any] = None


class FunilNegocioConfiguracaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    acao_etiquetas: Optional[bool]
    acao_encaminhar_card: Optional[bool]
    acao_elaborar_orcamento: Optional[bool]
    acao_enviar_email: Optional[bool]
    calc_treinamento_normativo: Optional[bool]
    calc_servicos_sst: Optional[bool]
    calc_vertical_365: Optional[bool]
    campo_valor_ativo: Optional[bool]
    campo_cliente_ativo: Optional[bool]
    status_config: Optional[Any]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Comercial funil (legado — empresa_id NULLABLE)
# ═══════════════════════════════════════════════════════════════════════════════

class ComercialFunilIn(BaseModel):
    nome_lead: str
    etapa: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    valor_estimado: Optional[decimal.Decimal] = None
    observacoes: Optional[str] = None


class ComercialFunilUpdateIn(BaseModel):
    nome_lead: Optional[str] = None
    etapa: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    valor_estimado: Optional[decimal.Decimal] = None
    observacoes: Optional[str] = None


class ComercialFunilOut(BaseModel):
    id: uuid.UUID
    empresa_id: Optional[uuid.UUID]
    nome_lead: str
    etapa: str
    email: Optional[str]
    telefone: Optional[str]
    valor_estimado: Optional[decimal.Decimal]
    observacoes: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Propostas comerciais (3 variantes — empresa_id; card_id opcional validado)
# ═══════════════════════════════════════════════════════════════════════════════

# ── Treinamentos ──────────────────────────────────────────────────────────────

class PropostaTreinamentoIn(BaseModel):
    identificador: str
    status: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modulo: Optional[str] = None
    planos_selecionados: Optional[list[str]] = None
    dados_calculadora: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaTreinamentoUpdateIn(BaseModel):
    # Sem card_id / empresa_id — não se troca o vínculo via update.
    identificador: Optional[str] = None
    status: Optional[str] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modulo: Optional[str] = None
    planos_selecionados: Optional[list[str]] = None
    dados_calculadora: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaTreinamentoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    identificador: str
    status: str
    card_id: Optional[uuid.UUID]
    cliente_id: Optional[uuid.UUID]
    titulo: Optional[str]
    descricao: Optional[str]
    valor_total: Optional[decimal.Decimal]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── Serviços SST ──────────────────────────────────────────────────────────────

class PropostaServicosSstIn(BaseModel):
    identificador: str
    status: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modo_exibicao_valores: Optional[str] = None
    servicos: Optional[str] = None
    dados_orcamento: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaServicosSstUpdateIn(BaseModel):
    identificador: Optional[str] = None
    status: Optional[str] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modo_exibicao_valores: Optional[str] = None
    servicos: Optional[str] = None
    dados_orcamento: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaServicosSstOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    identificador: str
    status: str
    card_id: Optional[uuid.UUID]
    cliente_id: Optional[uuid.UUID]
    titulo: Optional[str]
    modo_exibicao_valores: Optional[str]
    valor_total: Optional[decimal.Decimal]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── Vertical 365 ──────────────────────────────────────────────────────────────

class PropostaVertical365In(BaseModel):
    identificador: str
    status: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modo_exibicao_valores: Optional[str] = None
    modulo: Optional[str] = None
    dados_orcamento: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaVertical365UpdateIn(BaseModel):
    identificador: Optional[str] = None
    status: Optional[str] = None
    cliente_id: Optional[uuid.UUID] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacao: Optional[str] = None
    cliente_empresa: Optional[str] = None
    cliente_cnpj: Optional[str] = None
    cliente_email: Optional[str] = None
    data_proposta: Optional[datetime.date] = None
    validade_dias: Optional[int] = None
    modo_exibicao_valores: Optional[str] = None
    modulo: Optional[str] = None
    dados_orcamento: Optional[dict] = None
    valor_total: Optional[decimal.Decimal] = None


class PropostaVertical365Out(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    identificador: str
    status: str
    card_id: Optional[uuid.UUID]
    cliente_id: Optional[uuid.UUID]
    titulo: Optional[str]
    modo_exibicao_valores: Optional[str]
    valor_total: Optional[decimal.Decimal]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Atividades unificadas (VIEW — somente leitura)
# ═══════════════════════════════════════════════════════════════════════════════

class AtividadeUnificadaOut(BaseModel):
    id: Optional[uuid.UUID]
    card_id: Optional[uuid.UUID]
    tipo: Optional[str]
    descricao: Optional[str]
    prazo: Optional[str]
    horario: Optional[str]
    status: Optional[str]
    criador_id: Optional[uuid.UUID]
    responsavel_id: Optional[uuid.UUID]
    funil_origem: Optional[str]
    funil_nome: Optional[str]
    funil_id: Optional[uuid.UUID]
    empresa_id: Optional[uuid.UUID]
    card_titulo: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}
