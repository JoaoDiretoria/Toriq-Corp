"""Schemas do módulo Empresas (raiz do tenant).

ATENÇÃO de segurança: o schema de saída NÃO expõe os campos sensíveis do
certificado A1 (certificado_a1_base64, certificado_a1_senha, etc).
O schema de update NÃO inclui `id`/`tipo`/`created_at` (anti mass-assignment).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


class EmpresaOut(BaseModel):
    id: uuid.UUID
    nome: str
    tipo: str
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    possui_gestao_treinamentos: Optional[bool] = None
    logo_url: Optional[str] = None
    porte: Optional[str] = None
    site: Optional[str] = None
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    # NOTA: campos certificado_a1_* deliberadamente OMITIDOS (sensíveis).
    model_config = {"from_attributes": True}


# Valores válidos do enum tipo_empresa. CLIENT_TIPOS = os que um cliente_torq
# (SST) pode criar como sub-tenant; sst/vertical_on são privilégio de admin_vertical.
TIPOS_EMPRESA = ("vertical_on", "sst", "cliente_final", "empresa_parceira", "lead")
CLIENT_TIPOS = ("cliente_final", "empresa_parceira", "lead")


class EmpresaCreate(BaseModel):
    """Criação de empresa (raiz de tenant).

    `tipo` é validado contra o enum e contra o papel do ator no router
    (cliente_torq só cria sub-tenants). Campos de certificado A1 ficam de fora.
    """
    nome: str
    tipo: str
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    possui_gestao_treinamentos: Optional[bool] = None
    logo_url: Optional[str] = None
    porte: Optional[str] = None
    site: Optional[str] = None
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None


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


class EmpresaContatoIn(BaseModel):
    nome: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = None


class EmpresaContatoUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    principal: Optional[bool] = None


class EmpresaUpdate(BaseModel):
    """Atualização da própria empresa (apenas admin da empresa).

    `id`, `tipo` e timestamps excluídos. Campos de certificado A1 excluídos
    (não devem ser definidos por este endpoint genérico).
    """
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    possui_gestao_treinamentos: Optional[bool] = None
    logo_url: Optional[str] = None
    porte: Optional[str] = None
    site: Optional[str] = None
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
