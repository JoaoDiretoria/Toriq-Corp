"""Schemas Pydantic para o módulo Sinistros (tipos / colaborador / fotos)."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── TiposSinistro (global, read-only) ────────────────────────────────────────

class TipoSinistroOut(BaseModel):
    id: uuid.UUID
    codigo: str
    nome: str
    descricao: Optional[str] = None
    acao_padrao: Optional[str] = None
    ativo: Optional[bool] = None
    ordem: Optional[int] = None

    model_config = {"from_attributes": True}


# ── SinistrosColaborador ──────────────────────────────────────────────────────

class SinistroColaboradorIn(BaseModel):
    turma_colaborador_id: uuid.UUID
    tipo_sinistro_id: uuid.UUID
    acao: Optional[str] = "reprovacao"
    descricao: Optional[str] = None


class SinistroColaboradorUpdate(BaseModel):
    tipo_sinistro_id: Optional[uuid.UUID] = None
    acao: Optional[str] = None
    descricao: Optional[str] = None


class SinistroColaboradorOut(BaseModel):
    id: uuid.UUID
    turma_colaborador_id: uuid.UUID
    turma_id: uuid.UUID
    tipo_sinistro_id: uuid.UUID
    acao: Optional[str] = None
    descricao: Optional[str] = None
    registrado_por: Optional[uuid.UUID] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── SinistroFotos ─────────────────────────────────────────────────────────────

class SinistroFotoIn(BaseModel):
    foto_url: str
    descricao: Optional[str] = None
    data_captura: Optional[datetime.datetime] = None
    ordem: Optional[int] = 0


class SinistroFotoOut(BaseModel):
    id: uuid.UUID
    sinistro_id: uuid.UUID
    foto_url: str
    descricao: Optional[str] = None
    data_captura: Optional[datetime.datetime] = None
    ordem: Optional[int] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
