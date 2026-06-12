"""Schemas para o módulo Pesquisas — pesquisas de opinião, opções e votos."""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── PesquisasOpiniao ──────────────────────────────────────────────────────────

class PesquisaIn(BaseModel):
    """Payload de criação de pesquisa.

    empresa_id é injetado pelo router (derivado do token JWT).
    slug é obrigatório e deve ser único.
    """
    titulo: str
    slug: str
    descricao: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    status: Optional[str] = None          # default 'rascunho' no DB
    tipo: Optional[str] = None             # default 'multipla_escolha' no DB
    permite_multiplas_respostas: Optional[bool] = None
    anonima: Optional[bool] = None
    data_inicio: Optional[datetime.datetime] = None
    data_fim: Optional[datetime.datetime] = None


class PesquisaUpdate(BaseModel):
    """Campos mutáveis de uma pesquisa — parentage/tenant FKs excluídos."""
    titulo: Optional[str] = None
    slug: Optional[str] = None
    descricao: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    status: Optional[str] = None
    tipo: Optional[str] = None
    permite_multiplas_respostas: Optional[bool] = None
    anonima: Optional[bool] = None
    data_inicio: Optional[datetime.datetime] = None
    data_fim: Optional[datetime.datetime] = None


class PesquisaOut(BaseModel):
    id: uuid.UUID
    titulo: str
    slug: str
    descricao: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    status: Optional[str] = None
    tipo: Optional[str] = None
    permite_multiplas_respostas: Optional[bool] = None
    anonima: Optional[bool] = None
    data_inicio: Optional[datetime.datetime] = None
    data_fim: Optional[datetime.datetime] = None
    total_votos: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── PesquisasOpcoes ───────────────────────────────────────────────────────────

class OpcaoIn(BaseModel):
    """Payload de criação de opção.

    pesquisa_id é derivado do path (/pesquisas/{pesquisa_id}/opcoes).
    """
    texto: str
    ordem: Optional[int] = None
    cor: Optional[str] = None


class OpcaoUpdate(BaseModel):
    """Campos mutáveis de uma opção — pesquisa_id excluído."""
    texto: Optional[str] = None
    ordem: Optional[int] = None
    cor: Optional[str] = None


class OpcaoOut(BaseModel):
    id: uuid.UUID
    pesquisa_id: uuid.UUID
    texto: str
    ordem: Optional[int] = None
    votos: Optional[int] = None
    cor: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── PesquisasVotos — Votação ──────────────────────────────────────────────────

class VotoIn(BaseModel):
    """Payload de registro de voto.

    pesquisa_id é derivado do path (/pesquisas/{pesquisa_id}/votar).
    opcao_id é validado contra a pesquisa no handler.
    session_id identifica o votante (obrigatório; único por pesquisa).
    """
    opcao_id: uuid.UUID
    session_id: str
    resposta_texto: Optional[str] = None
    nome: Optional[str] = None
    email: Optional[str] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    telefone: Optional[str] = None


class VotoOut(BaseModel):
    id: uuid.UUID
    pesquisa_id: uuid.UUID
    opcao_id: Optional[uuid.UUID] = None
    session_id: str
    resposta_texto: Optional[str] = None
    nome: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── Resultado de Pesquisa ─────────────────────────────────────────────────────

class ResultadoOpcao(BaseModel):
    """Opção com contagem de votos para exibição de resultados."""
    id: uuid.UUID
    texto: str
    ordem: Optional[int] = None
    cor: Optional[str] = None
    votos: int = 0

    model_config = {"from_attributes": True}


class ResultadoPesquisa(BaseModel):
    """Resultado agregado de uma pesquisa."""
    pesquisa: PesquisaOut
    opcoes: list[ResultadoOpcao]
    total_votos: int
