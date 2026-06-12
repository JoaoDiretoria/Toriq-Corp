"""Schemas de setor_permissoes (filha de setores).

Regra legada CRÍTICA preservada no router: lista vazia significa "libera tudo";
o GET de listagem retorna [] normalmente (nunca 404) quando não há registros.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


class SetorPermissaoIn(BaseModel):
    modulo_id: str
    pagina_id: str
    grupo_acesso: Optional[str] = None
    visualizar: bool = False
    editar: bool = False
    criar: bool = False


class SetorPermissaoUpdate(BaseModel):
    """Update NÃO inclui setor_id (anti re-parenteamento cross-tenant)."""
    modulo_id: Optional[str] = None
    pagina_id: Optional[str] = None
    grupo_acesso: Optional[str] = None
    visualizar: Optional[bool] = None
    editar: Optional[bool] = None
    criar: Optional[bool] = None


class SetorPermissaoOut(BaseModel):
    id: uuid.UUID
    setor_id: uuid.UUID
    modulo_id: str
    pagina_id: str
    grupo_acesso: Optional[str] = None
    visualizar: Optional[bool] = None
    editar: Optional[bool] = None
    criar: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
