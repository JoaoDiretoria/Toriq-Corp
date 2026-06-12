"""Schemas para o módulo de Tickets/Suporte.

Tabelas cobertas:
- tickets_suporte            (tenant via empresa_solicitante_id)
- tickets_sla_config         (tenant via empresa_id — 1 row per empresa)
- tickets_suporte_comentarios (child de ticket_id)
- tickets_suporte_anexos      (child de ticket_id)
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── TicketsSlaConfig ──────────────────────────────────────────────────────────

class SlaConfigIn(BaseModel):
    prioridade_baixa_horas: int = 72
    prioridade_media_horas: int = 48
    prioridade_alta_horas: int = 24
    prioridade_critica_horas: int = 4


class SlaConfigUpdate(BaseModel):
    prioridade_baixa_horas: Optional[int] = None
    prioridade_media_horas: Optional[int] = None
    prioridade_alta_horas: Optional[int] = None
    prioridade_critica_horas: Optional[int] = None


class SlaConfigOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    prioridade_baixa_horas: int
    prioridade_media_horas: int
    prioridade_alta_horas: int
    prioridade_critica_horas: int
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TicketsSuporte ────────────────────────────────────────────────────────────

class TicketIn(BaseModel):
    """Payload de criação de ticket.

    - empresa_solicitante_id: injetado pelo endpoint (= user.empresa_id).
    - solicitante_id / solicitante_nome: preenchidos pelo endpoint a partir do
      usuário autenticado (não aceitos no body para evitar spoofing).
    - Campos opcionais refletem nullable do modelo gerado.
    """
    tipo: str  # bug | duvida | sugestao | problema_tecnico | financeiro | outro
    titulo: str
    descricao: str
    prioridade: str = "media"          # baixa | media | alta | critica
    impacto_operacional: str = "nenhum"  # nenhum | baixo | medio | alto | critico
    categoria: Optional[str] = None    # sistema | treinamento | financeiro | comercial | epi | frota | cadastro | integracao | outro
    empresa_destino_id: Optional[uuid.UUID] = None  # qual empresa atende o ticket
    tela_origem: Optional[str] = None
    url_origem: Optional[str] = None
    navegador: Optional[str] = None
    modulo: Optional[str] = None
    tela: Optional[str] = None
    role_solicitante: Optional[str] = None


class TicketUpdate(BaseModel):
    """Atualização de ticket — exclui parentage/tenant FKs."""
    tipo: Optional[str] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    prioridade: Optional[str] = None
    impacto_operacional: Optional[str] = None
    status: Optional[str] = None       # aberto | em_andamento | aguardando_resposta | resolvido | fechado
    categoria: Optional[str] = None
    atendente_id: Optional[uuid.UUID] = None
    atendente_nome: Optional[str] = None
    resolucao: Optional[str] = None
    resolvido_em: Optional[datetime.datetime] = None
    tela_origem: Optional[str] = None
    url_origem: Optional[str] = None
    navegador: Optional[str] = None
    modulo: Optional[str] = None
    tela: Optional[str] = None
    role_solicitante: Optional[str] = None


class TicketOut(BaseModel):
    id: uuid.UUID
    solicitante_id: uuid.UUID
    solicitante_nome: str
    solicitante_email: Optional[str] = None
    empresa_solicitante_id: Optional[uuid.UUID] = None
    empresa_destino_id: Optional[uuid.UUID] = None
    tipo: str
    titulo: str
    descricao: str
    status: str
    prioridade: str
    impacto_operacional: str
    categoria: Optional[str] = None
    atendente_id: Optional[uuid.UUID] = None
    atendente_nome: Optional[str] = None
    resolucao: Optional[str] = None
    resolvido_em: Optional[datetime.datetime] = None
    tela_origem: Optional[str] = None
    url_origem: Optional[str] = None
    navegador: Optional[str] = None
    modulo: Optional[str] = None
    tela: Optional[str] = None
    role_solicitante: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TicketsSuporteComentarios ─────────────────────────────────────────────────

class ComentarioIn(BaseModel):
    """Payload de criação de comentário.

    - ticket_id: derivado do PATH, nunca do body.
    - autor_id / autor_nome: preenchidos pelo endpoint a partir do usuário
      autenticado.
    """
    conteudo: str
    interno: bool = False


class ComentarioUpdate(BaseModel):
    conteudo: Optional[str] = None
    interno: Optional[bool] = None


class ComentarioOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    autor_id: uuid.UUID
    autor_nome: str
    conteudo: str
    interno: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TicketsSuporteAnexos ──────────────────────────────────────────────────────

class AnexoIn(BaseModel):
    """Payload de criação de anexo.

    - ticket_id: derivado do PATH, nunca do body.
    """
    nome_arquivo: str
    url: str
    tamanho_bytes: Optional[int] = None
    tipo_mime: Optional[str] = None


class AnexoOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    nome_arquivo: str
    url: str
    tamanho_bytes: Optional[int] = None
    tipo_mime: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
