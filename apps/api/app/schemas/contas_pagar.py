import datetime
import decimal
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Coluna ────────────────────────────────────────────────────────────────────
class ColunaIn(BaseModel):
    nome: str
    cor: str = "#6366f1"
    ordem: int = 0


class ColunaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cor: str
    ordem: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── Conta a Pagar ─────────────────────────────────────────────────────────────
class ContaPagarIn(BaseModel):
    coluna_id: uuid.UUID
    numero: str = ""
    fornecedor_nome: str = "—"
    valor: decimal.Decimal = decimal.Decimal("0")
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime.date] = None
    status_pagamento: Optional[str] = None
    ordem: int = 0


class ContaPagarOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    coluna_id: uuid.UUID
    numero: str
    fornecedor_nome: str
    valor: decimal.Decimal
    valor_pago: decimal.Decimal
    ordem: int
    arquivado: bool
    status_pagamento: Optional[str] = None
    data_vencimento: Optional[datetime.date] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


# ── Kanban helpers ────────────────────────────────────────────────────────────
class ReorderItem(BaseModel):
    id: uuid.UUID
    ordem: int


class MoverColunaIn(BaseModel):
    coluna_destino_id: uuid.UUID
    justificativa: Optional[str] = None
