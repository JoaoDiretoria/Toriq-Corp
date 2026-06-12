"""Schemas para o módulo Notificações."""
import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel


# ── Notificacoes ──────────────────────────────────────────────────────────────

class NotificacaoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    tipo: str
    categoria: str
    titulo: str
    mensagem: str
    usuario_id: Optional[uuid.UUID] = None
    usuario_nome: Optional[str] = None
    modulo: Optional[str] = None
    tela: Optional[str] = None
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[uuid.UUID] = None
    referencia_dados: Optional[Any] = None
    lida: Optional[bool] = None
    lida_em: Optional[datetime.datetime] = None
    lida_por: Optional[uuid.UUID] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


class MarcarLidaIn(BaseModel):
    """Payload para marcar notificação como lida — informa quem leu."""
    lida_por: Optional[uuid.UUID] = None  # FK para users; None = anônimo/sistema


# ── NotificacaoConfig ─────────────────────────────────────────────────────────

class NotificacaoConfigOut(BaseModel):
    tabela: str
    titulo: str
    categoria: str
    modulo: Optional[str] = None
    tela: Optional[str] = None
    campo_nome: Optional[str] = None
    ativo: Optional[bool] = None
    model_config = {"from_attributes": True}


class NotificacaoConfigUpdateIn(BaseModel):
    """Campos mutáveis de NotificacaoConfig (tabela/titulo/categoria são
    chave/estáveis e não são atualizáveis via API)."""
    modulo: Optional[str] = None
    tela: Optional[str] = None
    campo_nome: Optional[str] = None
    ativo: Optional[bool] = None
