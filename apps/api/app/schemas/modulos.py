"""Schemas dos módulos do sistema.

  Tabela                  | Tenant            | Acesso
  ------------------------|-------------------|---------------------------------
  modulos                 | GLOBAL (catálogo) | leitura auth, escrita admin
  empresas_modulos        | empresa_id        | TenantRepository
  empresas_modulos_telas  | filha de e_modulos| escopo via pai (valida empresa)
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Modulos (catálogo global) ─────────────────────────────────────────────────

class ModuloIn(BaseModel):
    nome: str
    rota: str
    descricao: Optional[str] = None
    icone: Optional[str] = None


class ModuloUpdate(BaseModel):
    nome: Optional[str] = None
    rota: Optional[str] = None
    descricao: Optional[str] = None
    icone: Optional[str] = None


class ModuloOut(BaseModel):
    id: uuid.UUID
    nome: str
    rota: str
    descricao: Optional[str] = None
    icone: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EmpresasModulos (empresa↔módulo, flag ativo) ──────────────────────────────

class EmpresaModuloIn(BaseModel):
    modulo_id: uuid.UUID
    ativo: bool = True


class EmpresaModuloUpdate(BaseModel):
    """Update NÃO permite trocar modulo_id (re-parenteamento) — só `ativo`."""
    ativo: Optional[bool] = None


class EmpresaModuloOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    modulo_id: uuid.UUID
    ativo: bool
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── EmpresasModulosTelas (filha de empresas_modulos) ──────────────────────────

class EmpresaModuloTelaIn(BaseModel):
    tela_id: str
    ativo: bool = True


class EmpresaModuloTelaUpdate(BaseModel):
    """Update NÃO inclui empresa_id/modulo_id/tela_id (anti re-parenteamento)."""
    ativo: Optional[bool] = None


class EmpresaModuloTelaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    modulo_id: uuid.UUID
    tela_id: str
    ativo: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
