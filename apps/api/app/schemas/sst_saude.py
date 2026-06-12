"""Schemas Pydantic para o módulo SST Saúde Ocupacional.

Cobre três entidades:
  - SaudeOcupacional   → empresa_id (TenantRepository)
  - ProfissionaisSaude → empresa_id (TenantRepository) + cliente_id validado
  - SinistrosColaborador → sem empresa_id (CRUD simples, sem tenant)
"""
import datetime
import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# ── SaudeOcupacional ─────────────────────────────────────────────────────────

class SaudeOcupacionalBase(BaseModel):
    colaborador_nome: str
    tipo_exame: str  # admissional | periodico | demissional | retorno_trabalho
    data_exame: datetime.date
    validade_dias: Decimal = Decimal("365")
    aso_arquivo_url: Optional[str] = None
    observacoes: Optional[str] = None


class SaudeOcupacionalCreate(SaudeOcupacionalBase):
    pass


class SaudeOcupacionalUpdate(BaseModel):
    """UPDATE: exclui campos de parentesco/tenant."""
    colaborador_nome: Optional[str] = None
    tipo_exame: Optional[str] = None
    data_exame: Optional[datetime.date] = None
    validade_dias: Optional[Decimal] = None
    aso_arquivo_url: Optional[str] = None
    observacoes: Optional[str] = None


class SaudeOcupacionalOut(SaudeOcupacionalBase):
    id: uuid.UUID
    empresa_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# ── ProfissionaisSaude ───────────────────────────────────────────────────────

class ProfissionaisSaudeBase(BaseModel):
    nome: str
    especialidade: str
    cpf: Optional[str] = None
    conselho: Optional[str] = None
    nr_conselho: Optional[str] = None
    uf_conselho: Optional[str] = None
    certificado_digital_url: Optional[str] = None
    senha_certificado: Optional[str] = None
    rubrica_url: Optional[str] = None


class ProfissionaisSaudeCreate(ProfissionaisSaudeBase):
    """CREATE: inclui cliente_id (FK validada contra empresa do usuário)."""
    cliente_id: Optional[uuid.UUID] = None


class ProfissionaisSaudeUpdate(BaseModel):
    """UPDATE: exclui empresa_id e cliente_id (parentesco/tenant)."""
    nome: Optional[str] = None
    especialidade: Optional[str] = None
    cpf: Optional[str] = None
    conselho: Optional[str] = None
    nr_conselho: Optional[str] = None
    uf_conselho: Optional[str] = None
    certificado_digital_url: Optional[str] = None
    senha_certificado: Optional[str] = None
    rubrica_url: Optional[str] = None


class ProfissionaisSaudeOut(BaseModel):
    """OUTPUT schema — exclui campos sensíveis (senha_certificado, certificado_digital_url)."""
    id: uuid.UUID
    empresa_id: uuid.UUID
    cliente_id: Optional[uuid.UUID] = None
    nome: str
    especialidade: str
    cpf: Optional[str] = None
    conselho: Optional[str] = None
    nr_conselho: Optional[str] = None
    uf_conselho: Optional[str] = None
    rubrica_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── SinistrosColaborador ─────────────────────────────────────────────────────
# Esta tabela NÃO possui empresa_id — é vinculada a turmas de treinamento.

class SinistrosColaboradorBase(BaseModel):
    turma_colaborador_id: uuid.UUID
    turma_id: uuid.UUID
    tipo_sinistro_id: uuid.UUID
    acao: Optional[str] = "reprovacao"
    descricao: Optional[str] = None
    registrado_por: Optional[uuid.UUID] = None


class SinistrosColaboradorCreate(SinistrosColaboradorBase):
    pass


class SinistrosColaboradorUpdate(BaseModel):
    """UPDATE: exclui turma_colaborador_id / turma_id / tipo_sinistro_id (parentesco)."""
    acao: Optional[str] = None
    descricao: Optional[str] = None


class SinistrosColaboradorOut(SinistrosColaboradorBase):
    id: uuid.UUID
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
