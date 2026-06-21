"""Schemas do canal Evolution (config do servidor + instâncias)."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class ServidorUpdate(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None  # vazio/None = mantém a atual
    webhook_base_url: Optional[str] = None
    limite_padrao_instancias: Optional[int] = None
    ativo: Optional[bool] = None


class ServidorPublic(BaseModel):
    base_url: Optional[str] = None
    webhook_base_url: Optional[str] = None
    limite_padrao_instancias: Optional[int] = None
    ativo: Optional[bool] = None
    api_key_set: bool = False
    api_key_masked: Optional[str] = None


class InstanciaIn(BaseModel):
    nome_exibicao: str
    empresa_id: Optional[uuid.UUID] = None  # só super admin pode informar outra empresa


class InstanciaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome_exibicao: str
    instance_name: str
    numero: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[object] = None


class QRCodeOut(BaseModel):
    base64: Optional[str] = None
    code: Optional[str] = None


class StatusOut(BaseModel):
    status: str


class EnviarIn(BaseModel):
    numero: str
    texto: str


class EnviarMidiaIn(BaseModel):
    numero: str
    mediatype: str  # image | video | document | audio
    media: str  # URL pública ou base64
    mimetype: Optional[str] = None
    filename: Optional[str] = None
    caption: Optional[str] = None


class EnviarOut(BaseModel):
    enviado: bool
    provider_id: Optional[str] = None
    erro: Optional[str] = None
