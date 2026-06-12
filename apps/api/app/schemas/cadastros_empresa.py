"""Schemas para cadastros simples escopados por empresa.

Tabelas cobertas (todas com coluna de tenant `empresa_id`):
- empresa_contatos
- categorias_clientes_empresa
- origens_contato

Os schemas de entrada NÃO expõem `empresa_id` — o tenant é sempre derivado
do usuário autenticado (forçado pelo TenantRepository).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── EmpresaContatos (empresa_contatos) ────────────────────────────────────────

class EmpresaContatoIn(BaseModel):
    nome: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = False


class EmpresaContatoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── CategoriasClientesEmpresa (categorias_clientes_empresa) ───────────────────

class CategoriaClienteEmpresaIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = True


class CategoriaClienteEmpresaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── OrigensContato (origens_contato) ──────────────────────────────────────────

class OrigemContatoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = True


class OrigemContatoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
