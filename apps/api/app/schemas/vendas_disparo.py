"""Schemas Pydantic para o módulo Toriq Vendas — FASE 2 (Disparo em Massa — Email).

snake_case batendo com os models/colunas do backend. Escopo: configuração do provedor
de email (SMTP, senha criptografada) + templates + campanhas + mensagens (tracking) +
lista de supressão (opt-out LGPD). Tenant SEMPRE por user.empresa_id (carimbado no router).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Config ──────────────────────────────────────────────────────────────────

class DisparoConfigUpdate(BaseModel):
    email_provider: Optional[str] = None
    email_remetente: Optional[str] = None
    email_remetente_nome: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    email_rate_limit: Optional[int] = None
    clear_smtp_password: Optional[bool] = None


class DisparoConfigPublic(BaseModel):
    email_provider: Optional[str] = None
    email_remetente: Optional[str] = None
    email_remetente_nome: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    email_rate_limit: Optional[int] = None
    smtp_password_set: bool = False
    smtp_password_masked: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ── Templates ─────────────────────────────────────────────────────────────────

class TemplateIn(BaseModel):
    nome: str
    canal: str = "email"
    assunto: Optional[str] = None
    conteudo: str
    categoria: Optional[str] = None
    meta_template_name: Optional[str] = None


class TemplateUpdate(BaseModel):
    nome: Optional[str] = None
    canal: Optional[str] = None
    assunto: Optional[str] = None
    conteudo: Optional[str] = None
    categoria: Optional[str] = None
    meta_template_name: Optional[str] = None


class TemplateOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    canal: str
    assunto: Optional[str]
    conteudo: str
    categoria: Optional[str]
    meta_template_name: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


# ── Campanhas ───────────────────────────────────────────────────────────────

class CampanhaIn(BaseModel):
    nome: str
    template_id: Optional[uuid.UUID] = None
    canal: str = "email"
    segmento_id: Optional[uuid.UUID] = None
    lead_ids: Optional[list[uuid.UUID]] = None
    agendada_para: Optional[datetime.datetime] = None


class CampanhaUpdate(BaseModel):
    nome: Optional[str] = None
    template_id: Optional[uuid.UUID] = None
    canal: Optional[str] = None
    segmento_id: Optional[uuid.UUID] = None
    lead_ids: Optional[list[uuid.UUID]] = None
    agendada_para: Optional[datetime.datetime] = None
    status: Optional[str] = None


class CampanhaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    template_id: Optional[uuid.UUID]
    canal: str
    segmento_id: Optional[uuid.UUID]
    lead_ids: Optional[list]
    agendada_para: Optional[datetime.datetime]
    status: str
    total_destinatarios: int
    total_enviados: int
    total_erros: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    started_at: Optional[datetime.datetime]
    finished_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


class EnviarCampanhaOut(BaseModel):
    campanha_id: uuid.UUID
    status: str
    total_destinatarios: int
    enviados: int
    suprimidos: int
    erros: int


# ── Mensagens ─────────────────────────────────────────────────────────────────

class MensagemOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    campanha_id: uuid.UUID
    lead_id: Optional[uuid.UUID]
    canal: Optional[str]
    destinatario: Optional[str]
    status: str
    provider_id: Optional[str]
    erro: Optional[str]
    enviado_em: Optional[datetime.datetime]
    entregue_em: Optional[datetime.datetime]
    lido_em: Optional[datetime.datetime]
    respondeu_em: Optional[datetime.datetime]
    created_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)


# ── Supressão ─────────────────────────────────────────────────────────────────

class SupressaoIn(BaseModel):
    tipo: str
    valor: str
    motivo: Optional[str] = None


class SupressaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    tipo: str
    valor: str
    motivo: Optional[str]
    created_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)
