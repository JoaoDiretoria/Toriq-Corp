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


# ── Conta a Receber ───────────────────────────────────────────────────────────
class ContaReceberIn(BaseModel):
    coluna_id: uuid.UUID
    numero: str = ""
    cliente_nome: str = "—"
    valor: decimal.Decimal = decimal.Decimal("0")
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime.date] = None
    status_recebimento: Optional[str] = None
    ordem: int = 0


class ContaReceberOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    coluna_id: uuid.UUID
    numero: str
    cliente_nome: str
    valor: decimal.Decimal
    valor_pago: decimal.Decimal
    ordem: int
    arquivado: bool
    status_recebimento: Optional[str] = None
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
