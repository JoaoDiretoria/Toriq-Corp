"""Schemas Pydantic para o módulo TREINAMENTOS.

Cobre:
  - CatalogoTreinamentos   → empresa_id (TenantRepository / make_crud_router)
  - Treinamentos           → empresa_id (TenantRepository / make_crud_router)
  - TurmasTreinamento      → empresa_id; FKs validadas no create
  - TurmasTreinamentoAulas → filha de turmas_treinamento (escope via turma_id)
  - TurmaColaboradores     → filha de turmas_treinamento; valida colaborador_id
  - ColaboradoresTreinamentos      → filha de colaboradores; valida treinamento_id
  - ColaboradoresTreinamentosDatas → filha de colaboradores_treinamentos
  - ColaboradoresCertificados      → filha de colaboradores

REGRA DE SEGURANÇA: schemas de UPDATE NUNCA carregam FKs de parentesco/tenant;
as FKs do payload são validadas contra o empresa_id do usuário na criação.
"""
import datetime
import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# ── CatalogoTreinamentos ──────────────────────────────────────────────────────

class CatalogoTreinamentoBase(BaseModel):
    nome: str
    norma: str
    validade: Optional[str] = None
    ch_formacao: Optional[Decimal] = None
    ch_formacao_obrigatoria: Optional[bool] = None
    ch_reciclagem: Optional[Decimal] = None
    ch_reciclagem_obrigatoria: Optional[bool] = None


class CatalogoTreinamentoCreate(CatalogoTreinamentoBase):
    pass


class CatalogoTreinamentoUpdate(BaseModel):
    """UPDATE: sem empresa_id (tenant)."""
    nome: Optional[str] = None
    norma: Optional[str] = None
    validade: Optional[str] = None
    ch_formacao: Optional[Decimal] = None
    ch_formacao_obrigatoria: Optional[bool] = None
    ch_reciclagem: Optional[Decimal] = None
    ch_reciclagem_obrigatoria: Optional[bool] = None


class CatalogoTreinamentoOut(CatalogoTreinamentoBase):
    id: uuid.UUID
    empresa_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── Treinamentos ──────────────────────────────────────────────────────────────

class TreinamentoBase(BaseModel):
    nome_treinamento: str
    instrutor: str
    participantes: str
    data_realizacao: datetime.date
    validade_meses: Optional[int] = None


class TreinamentoCreate(TreinamentoBase):
    pass


class TreinamentoUpdate(BaseModel):
    """UPDATE: sem empresa_id (tenant)."""
    nome_treinamento: Optional[str] = None
    instrutor: Optional[str] = None
    participantes: Optional[str] = None
    data_realizacao: Optional[datetime.date] = None
    validade_meses: Optional[int] = None


class TreinamentoOut(TreinamentoBase):
    id: uuid.UUID
    empresa_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TurmasTreinamento ─────────────────────────────────────────────────────────

class TurmaTreinamentoCreate(BaseModel):
    """CREATE: inclui FKs validadas contra o tenant do usuário."""
    numero_turma: int
    cliente_id: uuid.UUID
    treinamento_id: uuid.UUID
    tipo_treinamento: str
    codigo_turma: Optional[str] = None
    carga_horaria_total: Optional[Decimal] = None
    instrutor_id: Optional[uuid.UUID] = None
    quantidade_participantes: Optional[int] = None
    status: Optional[str] = None
    validado: Optional[bool] = None
    observacoes: Optional[str] = None


class TurmaTreinamentoUpdate(BaseModel):
    """UPDATE: exclui empresa_id e FKs de parentesco (cliente_id/treinamento_id/instrutor_id)."""
    numero_turma: Optional[int] = None
    tipo_treinamento: Optional[str] = None
    codigo_turma: Optional[str] = None
    carga_horaria_total: Optional[Decimal] = None
    quantidade_participantes: Optional[int] = None
    status: Optional[str] = None
    validado: Optional[bool] = None
    observacoes: Optional[str] = None


class TurmaTreinamentoOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    numero_turma: int
    cliente_id: uuid.UUID
    treinamento_id: uuid.UUID
    tipo_treinamento: str
    codigo_turma: Optional[str] = None
    carga_horaria_total: Optional[Decimal] = None
    instrutor_id: Optional[uuid.UUID] = None
    quantidade_participantes: Optional[int] = None
    status: Optional[str] = None
    validado: Optional[bool] = None
    observacoes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TurmasTreinamentoAulas (filha de turmas_treinamento) ──────────────────────

class TurmaAulaBase(BaseModel):
    data: datetime.date
    hora_inicio: datetime.time
    hora_fim: datetime.time
    horas: Optional[Decimal] = None


class TurmaAulaCreate(TurmaAulaBase):
    pass


class TurmaAulaUpdate(BaseModel):
    """UPDATE: sem turma_id (parentesco)."""
    data: Optional[datetime.date] = None
    hora_inicio: Optional[datetime.time] = None
    hora_fim: Optional[datetime.time] = None
    horas: Optional[Decimal] = None


class TurmaAulaOut(TurmaAulaBase):
    id: uuid.UUID
    turma_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── TurmaColaboradores (filha de turmas_treinamento) ──────────────────────────

class TurmaColaboradorCreate(BaseModel):
    """CREATE: colaborador_id validado contra o tenant do usuário."""
    colaborador_id: uuid.UUID
    resultado: Optional[str] = None
    nota_pos_teste: Optional[Decimal] = None


class TurmaColaboradorUpdate(BaseModel):
    """UPDATE: exclui turma_id e colaborador_id (parentesco)."""
    resultado: Optional[str] = None
    nota_pos_teste: Optional[Decimal] = None


class TurmaColaboradorOut(BaseModel):
    id: uuid.UUID
    turma_id: uuid.UUID
    colaborador_id: uuid.UUID
    resultado: Optional[str] = None
    nota_pos_teste: Optional[Decimal] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── ColaboradoresTreinamentos (filha de colaboradores) ────────────────────────

class ColaboradorTreinamentoCreate(BaseModel):
    """CREATE: treinamento_id validado contra o tenant do usuário."""
    treinamento_id: uuid.UUID
    status: Optional[str] = None
    data_realizacao: Optional[datetime.date] = None


class ColaboradorTreinamentoUpdate(BaseModel):
    """UPDATE: exclui colaborador_id e treinamento_id (parentesco)."""
    status: Optional[str] = None
    data_realizacao: Optional[datetime.date] = None


class ColaboradorTreinamentoOut(BaseModel):
    id: uuid.UUID
    colaborador_id: uuid.UUID
    treinamento_id: uuid.UUID
    status: Optional[str] = None
    data_realizacao: Optional[datetime.date] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── ColaboradoresTreinamentosDatas (filha de colaboradores_treinamentos) ──────

class ColaboradorTreinamentoDataBase(BaseModel):
    data: datetime.date
    inicio: Optional[datetime.time] = None
    fim: Optional[datetime.time] = None
    horas: Optional[Decimal] = None


class ColaboradorTreinamentoDataCreate(ColaboradorTreinamentoDataBase):
    pass


class ColaboradorTreinamentoDataUpdate(BaseModel):
    """UPDATE: sem colaborador_treinamento_id (parentesco)."""
    data: Optional[datetime.date] = None
    inicio: Optional[datetime.time] = None
    fim: Optional[datetime.time] = None
    horas: Optional[Decimal] = None


class ColaboradorTreinamentoDataOut(ColaboradorTreinamentoDataBase):
    id: uuid.UUID
    colaborador_treinamento_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── ColaboradoresCertificados (filha de colaboradores) ────────────────────────

class ColaboradorCertificadoBase(BaseModel):
    nome: Optional[str] = None
    arquivo_url: Optional[str] = None
    arquivo_path: Optional[str] = None
    data_emissao: Optional[datetime.date] = None
    data_validade: Optional[datetime.date] = None
    observacoes: Optional[str] = None
    turma_id: Optional[uuid.UUID] = None


class ColaboradorCertificadoCreate(ColaboradorCertificadoBase):
    pass


class ColaboradorCertificadoUpdate(BaseModel):
    """UPDATE: sem colaborador_id (parentesco). turma_id é opcional e editável."""
    nome: Optional[str] = None
    arquivo_url: Optional[str] = None
    arquivo_path: Optional[str] = None
    data_emissao: Optional[datetime.date] = None
    data_validade: Optional[datetime.date] = None
    observacoes: Optional[str] = None
    turma_id: Optional[uuid.UUID] = None


class ColaboradorCertificadoOut(ColaboradorCertificadoBase):
    id: uuid.UUID
    colaborador_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
