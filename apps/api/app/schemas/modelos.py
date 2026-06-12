"""Schemas para o módulo Modelos / Templates.

Cobertura:
  - ModelosAtividade  (modelos_atividade)
  - ModelosPropostaComercial  (modelos_proposta_comercial)
  - PropostasModelos  (propostas_modelos)
"""
import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ── ModelosAtividade ──────────────────────────────────────────────────────────

class ModeloAtividadeIn(BaseModel):
    """Payload de criação de modelo de atividade.

    empresa_id é injetado pelo router; created_at/updated_at são server_default.
    """
    nome: str
    descricao: str


class ModeloAtividadeUpdate(BaseModel):
    """Payload de atualização — não expõe empresa_id."""
    nome: Optional[str] = None
    descricao: Optional[str] = None


class ModeloAtividadeOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: str
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── ModelosPropostaComercial ──────────────────────────────────────────────────

class ModeloPropostaComercialIn(BaseModel):
    """Payload de criação de modelo de proposta comercial.

    empresa_id é injetado pelo router; created_by é definido pelo router
    a partir do usuário autenticado.
    """
    nome: str
    tipo_orcamento: Optional[str] = None
    titulo: Optional[str] = None
    titulo_modulo: Optional[str] = None
    titulo_dores: Optional[str] = None
    titulo_solucoes: Optional[str] = None
    titulo_diferenciais: Optional[str] = None
    titulo_investimento: Optional[str] = None
    titulo_pagamento: Optional[str] = None
    titulo_infos: Optional[str] = None
    titulo_passos: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    publico: Optional[str] = None
    dores: Optional[str] = None
    solucoes: Optional[str] = None
    diferenciais: Optional[str] = None
    pagamento: Optional[str] = None
    infos: Optional[str] = None
    passos: Optional[str] = None
    planos_selecionados: Optional[list[str]] = None


class ModeloPropostaComercialUpdate(BaseModel):
    """Payload de atualização — não expõe empresa_id nem created_by."""
    nome: Optional[str] = None
    tipo_orcamento: Optional[str] = None
    titulo: Optional[str] = None
    titulo_modulo: Optional[str] = None
    titulo_dores: Optional[str] = None
    titulo_solucoes: Optional[str] = None
    titulo_diferenciais: Optional[str] = None
    titulo_investimento: Optional[str] = None
    titulo_pagamento: Optional[str] = None
    titulo_infos: Optional[str] = None
    titulo_passos: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    publico: Optional[str] = None
    dores: Optional[str] = None
    solucoes: Optional[str] = None
    diferenciais: Optional[str] = None
    pagamento: Optional[str] = None
    infos: Optional[str] = None
    passos: Optional[str] = None
    planos_selecionados: Optional[list[str]] = None


class ModeloPropostaComercialOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    tipo_orcamento: Optional[str] = None
    titulo: Optional[str] = None
    titulo_modulo: Optional[str] = None
    titulo_dores: Optional[str] = None
    titulo_solucoes: Optional[str] = None
    titulo_diferenciais: Optional[str] = None
    titulo_investimento: Optional[str] = None
    titulo_pagamento: Optional[str] = None
    titulo_infos: Optional[str] = None
    titulo_passos: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    publico: Optional[str] = None
    dores: Optional[str] = None
    solucoes: Optional[str] = None
    diferenciais: Optional[str] = None
    pagamento: Optional[str] = None
    infos: Optional[str] = None
    passos: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    planos_selecionados: Optional[list[str]] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── PropostasModelos ──────────────────────────────────────────────────────────

class PropostaModeloIn(BaseModel):
    """Payload de criação de modelo de proposta (builder).

    empresa_id é injetado pelo router; created_by é definido pelo router.
    blocos é um array JSON (JSONB com server_default '[]'), header e
    global_styles são objetos JSON — ambos aceitos como Any para máxima
    flexibilidade.
    """
    titulo: str
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None


class PropostaModeloUpdate(BaseModel):
    """Payload de atualização — não expõe empresa_id nem created_by."""
    titulo: Optional[str] = None
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None


class PropostaModeloOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    titulo: str
    blocos: Optional[Any] = None
    header: Optional[Any] = None
    global_styles: Optional[Any] = None
    created_by: Optional[uuid.UUID] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
