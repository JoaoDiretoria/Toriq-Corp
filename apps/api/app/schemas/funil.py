"""Schemas para o módulo Funil / CRM genérico."""
import datetime
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Funis ─────────────────────────────────────────────────────────────────────

class FunilIn(BaseModel):
    nome: str
    tipo: str  # 'negocio' | 'fluxo_trabalho'
    setor_id: uuid.UUID
    descricao: Optional[str] = None
    ativo: bool = True
    ordem: int = 0


class FunilOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    setor_id: uuid.UUID
    nome: str
    tipo: str
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    ordem: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Etapas ────────────────────────────────────────────────────────────────────

class EtapaIn(BaseModel):
    funil_id: uuid.UUID
    nome: str
    ordem: int = 0
    cor: Optional[str] = None
    descricao: Optional[str] = None
    trancada: bool = False
    ativo: bool = True


class EtapaOut(BaseModel):
    id: uuid.UUID
    funil_id: uuid.UUID
    nome: str
    ordem: int
    trancada: bool
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Funis Configurações ───────────────────────────────────────────────────────

class ConfiguracaoOut(BaseModel):
    id: uuid.UUID
    funil_id: uuid.UUID
    empresa_id: Optional[uuid.UUID] = None
    modo_visualizacao: Optional[str] = None
    card_mostrar_valor: Optional[bool] = None
    card_mostrar_cliente: Optional[bool] = None
    card_mostrar_data: Optional[bool] = None
    card_mostrar_responsavel: Optional[bool] = None
    card_mostrar_etiquetas: Optional[bool] = None
    dashboard_visivel: Optional[bool] = None
    botao_adicionar_visivel: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Cards ─────────────────────────────────────────────────────────────────────

class CardIn(BaseModel):
    funil_id: uuid.UUID
    etapa_id: uuid.UUID
    titulo: str
    descricao: Optional[str] = None
    valor: decimal.Decimal = decimal.Decimal("0")
    cliente_id: Optional[uuid.UUID] = None
    responsavel_id: Optional[uuid.UUID] = None
    data_previsao: Optional[datetime.date] = None
    prioridade: Optional[str] = None
    ordem: int = 0


class CardOut(BaseModel):
    id: uuid.UUID
    funil_id: uuid.UUID
    etapa_id: uuid.UUID
    titulo: str
    descricao: Optional[str] = None
    valor: Optional[decimal.Decimal] = None
    cliente_id: Optional[uuid.UUID] = None
    responsavel_id: Optional[uuid.UUID] = None
    data_previsao: Optional[datetime.date] = None
    data_conclusao: Optional[datetime.date] = None
    prioridade: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None
    status_negocio: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── Kanban helpers ────────────────────────────────────────────────────────────

class ReorderItem(BaseModel):
    id: uuid.UUID
    ordem: int


class MoverEtapaIn(BaseModel):
    etapa_destino_id: uuid.UUID
    justificativa: Optional[str] = None


# ── Etiquetas ─────────────────────────────────────────────────────────────────

class EtiquetaIn(BaseModel):
    nome: str
    cor: str = "#F59E0B"


class EtiquetaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cor: str
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


class AssociarEtiquetaIn(BaseModel):
    etiqueta_id: uuid.UUID


# ── Atividades ────────────────────────────────────────────────────────────────

class AtividadeIn(BaseModel):
    tipo: str = "tarefa"
    descricao: str
    status: str = "a_realizar"
    prazo: Optional[datetime.date] = None
    horario: Optional[str] = None


class AtividadeOut(BaseModel):
    id: uuid.UUID
    card_id: uuid.UUID
    tipo: str
    descricao: str
    status: str
    prazo: Optional[datetime.date] = None
    horario: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
