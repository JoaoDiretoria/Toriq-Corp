"""Schemas de tipos_empresa — catálogo GLOBAL (sem empresa_id)."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


class TipoEmpresaOut(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


class TipoEmpresaIn(BaseModel):
    nome: str
    descricao: Optional[str] = None


class TipoEmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
