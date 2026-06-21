"""Schemas Pydantic para o módulo Toriq Vendas — FASE 4 (SDR Inteligente — agente Claude).

snake_case batendo com os models/colunas do backend. Escopo: configuração do agente SDR
(provider + api_key criptografada + prompts dinâmicos), qualificação de leads (score 0-100
+ status + notas), conversa (interações usuario/assistente) e estatísticas. Segredos
(api_key) nunca retornam em claro — só mascarados. Tenant SEMPRE por user.empresa_id.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Config ──────────────────────────────────────────────────────────────────

class SdrConfigUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    modelo: Optional[str] = None
    prompt_sistema: Optional[str] = None
    temperatura: Optional[float] = None
    diretrizes: Optional[str] = None
    prompt_qualificacao: Optional[str] = None
    persona: Optional[str] = None
    objetivo: Optional[str] = None
    ativo: Optional[bool] = None
    auto_responder: Optional[bool] = None
    notificar_telefones: Optional[str] = None
    clear_api_key: Optional[bool] = None
    openai_api_key: Optional[str] = None  # Whisper (transcrição de áudio)
    clear_openai_api_key: Optional[bool] = None


class SdrConfigPublic(BaseModel):
    provider: Optional[str] = None
    modelo: Optional[str] = None
    prompt_sistema: Optional[str] = None
    temperatura: Optional[float] = None
    diretrizes: Optional[str] = None
    prompt_qualificacao: Optional[str] = None
    persona: Optional[str] = None
    objetivo: Optional[str] = None
    ativo: bool = False
    auto_responder: bool = False
    notificar_telefones: Optional[str] = None
    api_key_set: bool = False
    api_key_masked: Optional[str] = None
    openai_api_key_set: bool = False
    openai_api_key_masked: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ── Leads ─────────────────────────────────────────────────────────────────────

class SdrLeadOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: Optional[str]
    empresa_nome: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    plataforma: Optional[str]
    cidade: Optional[str]
    estado: Optional[str]
    status: Optional[str]
    sdr_status: Optional[str]
    sdr_score: Optional[int]
    sdr_notas: Optional[str]
    sdr_proximo_followup: Optional[datetime.datetime]
    created_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


class SdrLeadsListOut(BaseModel):
    items: list[SdrLeadOut]
    total: int


class SdrLeadPatch(BaseModel):
    sdr_status: Optional[str] = None
    sdr_notas: Optional[str] = None
    sdr_proximo_followup: Optional[datetime.datetime] = None


# ── Qualificação ──────────────────────────────────────────────────────────────

class QualificarOut(BaseModel):
    lead_id: uuid.UUID
    sdr_score: Optional[int]
    sdr_status: Optional[str]
    sdr_notas: Optional[str]


class QualificarBatchIn(BaseModel):
    lead_ids: list[uuid.UUID]


class QualificarBatchOut(BaseModel):
    qualificados: int
    erros: int


class QualificarBatchAceitoOut(BaseModel):
    """Resposta 202: o lote foi enfileirado para qualificação pela IA fora do
    request (evita timeout em lotes grandes). O front acompanha relendo os leads."""
    enfileirados: int
    status: str = "processando"


# ── Interações / Conversa ───────────────────────────────────────────────────

class InteracaoIn(BaseModel):
    tipo: str
    conteudo: str
    papel: str = "usuario"


class InteracaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    lead_id: uuid.UUID
    papel: Optional[str]
    tipo: Optional[str]
    conteudo: Optional[str]
    meta: Optional[dict]
    created_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


class ResponderIn(BaseModel):
    mensagem: str


class ResponderOut(BaseModel):
    resposta: str


# ── Estatísticas ──────────────────────────────────────────────────────────────

class SdrStatsOut(BaseModel):
    total: int
    por_status: dict
    score_medio: Optional[float]
    followups_pendentes: int
