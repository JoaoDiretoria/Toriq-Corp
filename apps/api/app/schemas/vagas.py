"""Schemas para o módulo Vagas e Candidaturas (recrutamento público).

Tabelas GLOBAIS (sem empresa_id).
  - vagas: listagem pública das vagas abertas; escrita admin_vertical.
  - candidaturas: criação pública (candidatar-se); leitura admin_vertical.

Os schemas de entrada públicos (CandidaturaIn) aceitam SOMENTE os campos do
formulário; vaga_id vem do path. UPDATE de vaga não expõe FKs de parentesco.
"""
import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, EmailStr


# ── Vagas ─────────────────────────────────────────────────────────────────────

class VagaIn(BaseModel):
    """Criação de vaga (admin_vertical)."""
    titulo: str
    descricao: Optional[str] = None
    requisitos: Optional[str] = None
    beneficios: Optional[str] = None
    tipo_contrato: Optional[str] = None
    modalidade: Optional[str] = None
    local: Optional[str] = None
    salario_faixa: Optional[str] = None
    ativa: Optional[bool] = None
    exibir_salario: Optional[bool] = None


class VagaUpdate(BaseModel):
    """Campos mutáveis de uma vaga (admin_vertical)."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    requisitos: Optional[str] = None
    beneficios: Optional[str] = None
    tipo_contrato: Optional[str] = None
    modalidade: Optional[str] = None
    local: Optional[str] = None
    salario_faixa: Optional[str] = None
    ativa: Optional[bool] = None
    exibir_salario: Optional[bool] = None


class VagaOut(BaseModel):
    id: uuid.UUID
    titulo: str
    descricao: Optional[str] = None
    requisitos: Optional[str] = None
    beneficios: Optional[str] = None
    tipo_contrato: Optional[str] = None
    modalidade: Optional[str] = None
    local: Optional[str] = None
    salario_faixa: Optional[str] = None
    ativa: Optional[bool] = None
    exibir_salario: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── Candidaturas ──────────────────────────────────────────────────────────────

class CandidaturaIn(BaseModel):
    """Payload público de candidatura. vaga_id vem do path."""
    nome_completo: str
    email: EmailStr
    data_nascimento: Optional[datetime.date] = None
    telefone: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    grau_escolaridade: Optional[str] = None
    formacoes: Optional[Any] = None
    cursos: Optional[Any] = None
    experiencias: Optional[Any] = None
    sobre_voce: Optional[str] = None
    diferenciais: Optional[str] = None
    observacoes: Optional[str] = None


class CandidaturaOut(BaseModel):
    id: uuid.UUID
    vaga_id: Optional[uuid.UUID] = None
    nome_completo: str
    email: str
    data_nascimento: Optional[datetime.date] = None
    telefone: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    grau_escolaridade: Optional[str] = None
    formacoes: Optional[Any] = None
    cursos: Optional[Any] = None
    experiencias: Optional[Any] = None
    sobre_voce: Optional[str] = None
    diferenciais: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
