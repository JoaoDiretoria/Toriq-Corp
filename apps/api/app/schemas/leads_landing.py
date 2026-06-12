"""Schemas para o módulo Leads da Landing Page.

Tabela GLOBAL (sem empresa_id). Captura de formulário de contato público.
O schema de entrada (`LeadIn`) aceita SOMENTE os campos do formulário —
nunca aceita empresa_id/role/flags de admin.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr


class LeadIn(BaseModel):
    """Payload público do formulário de contato da landing page."""
    nome: str
    empresa: str
    email: EmailStr
    telefone: str
    segmento: Optional[str] = None
    mensagem: Optional[str] = None
    cnpj: Optional[str] = None


class LeadOut(BaseModel):
    id: uuid.UUID
    nome: str
    empresa: str
    email: str
    telefone: str
    segmento: Optional[str] = None
    mensagem: Optional[str] = None
    cnpj: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
