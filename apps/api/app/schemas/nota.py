import uuid
from datetime import datetime

from pydantic import BaseModel


class NotaIn(BaseModel):
    texto: str


class NotaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    texto: str
    created_at: datetime

    model_config = {"from_attributes": True}
