"""Schemas Pydantic para o módulo Blog / Newsletter.

Notas de segurança:
- Todas as tabelas de blog e newsletter são GLOBAIS (sem empresa_id).
  Não há filtro de tenant. Leituras são públicas (posts publicados) ou
  restritas a admin_vertical (rascunhos, disparos, config).
- CREATE/UPDATE de conteúdo (posts, autores, categorias, newsletter) são
  restritos a admin_vertical.
- NewsletterInscricoes: POST público (qualquer pessoa pode se inscrever);
  gerenciamento (list, delete, deactivate) restrito a admin_vertical.
- BlogVisualizacoes: POST público anônimo (rastreamento de visualizações);
  leitura restrita a admin_vertical.
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── BlogAutores ───────────────────────────────────────────────────────────────

class AutorIn(BaseModel):
    nome: str
    sobrenome: Optional[str] = None
    cargo: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None


class AutorUpdate(BaseModel):
    nome: Optional[str] = None
    sobrenome: Optional[str] = None
    cargo: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None


class AutorOut(BaseModel):
    id: uuid.UUID
    nome: str
    sobrenome: Optional[str]
    cargo: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    email: Optional[str]
    linkedin_url: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── BlogCategorias ────────────────────────────────────────────────────────────

class CategoriaIn(BaseModel):
    nome: str
    slug: str
    descricao: Optional[str] = None
    cor: Optional[str] = "#6366f1"


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    slug: Optional[str] = None
    descricao: Optional[str] = None
    cor: Optional[str] = None


class CategoriaOut(BaseModel):
    id: uuid.UUID
    nome: str
    slug: str
    descricao: Optional[str]
    cor: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── Blogs ─────────────────────────────────────────────────────────────────────

class BlogIn(BaseModel):
    titulo: str
    slug: str
    descricao: Optional[str] = None
    conteudo: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    # autor_id and categoria_id are optional FKs; accepted on create
    autor_id: Optional[uuid.UUID] = None
    categoria_id: Optional[uuid.UUID] = None
    status: Optional[str] = "rascunho"
    tags: Optional[list[str]] = None
    tempo_leitura: Optional[int] = None
    publicado_em: Optional[datetime.datetime] = None


class BlogUpdate(BaseModel):
    # Excludes slug to prevent silent redirect breaks; admin can set via BlogIn
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    conteudo: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    # Author/category FKs allowed in update but not forced
    autor_id: Optional[uuid.UUID] = None
    categoria_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None
    tempo_leitura: Optional[int] = None
    publicado_em: Optional[datetime.datetime] = None


class BlogOut(BaseModel):
    id: uuid.UUID
    titulo: str
    slug: str
    descricao: Optional[str]
    conteudo: Optional[str]
    imagem_capa_url: Optional[str]
    autor_id: Optional[uuid.UUID]
    categoria_id: Optional[uuid.UUID]
    status: Optional[str]
    tags: Optional[list[str]]
    tempo_leitura: Optional[int]
    visualizacoes: Optional[int]
    publicado_em: Optional[datetime.datetime]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── BlogVisualizacoes ─────────────────────────────────────────────────────────

class VisualizacaoIn(BaseModel):
    """Payload para registrar uma visualização de post (público, anônimo)."""
    user_agent: Optional[str] = None
    referer: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    session_id: Optional[str] = None


class VisualizacaoOut(BaseModel):
    id: uuid.UUID
    blog_id: uuid.UUID
    user_agent: Optional[str]
    referer: Optional[str]
    country: Optional[str]
    city: Optional[str]
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    session_id: Optional[str]
    created_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── NewsletterInscricoes ──────────────────────────────────────────────────────

class InscricaoIn(BaseModel):
    """Inscrição pública na newsletter — qualquer visitante pode usar."""
    nome: str
    email: str
    telefone: str
    empresa: Optional[str] = None
    cargo: Optional[str] = None


class InscricaoUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    ativo: Optional[bool] = None


class InscricaoOut(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    telefone: str
    empresa: Optional[str]
    cargo: Optional[str]
    ativo: Optional[bool]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    unsubscribed_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── NewsletterConteudos ───────────────────────────────────────────────────────

class ConteudoIn(BaseModel):
    titulo: str
    slug: str
    descricao: Optional[str] = None
    conteudo: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    status: Optional[str] = "rascunho"
    agendado_para: Optional[datetime.datetime] = None


class ConteudoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    conteudo: Optional[str] = None
    imagem_capa_url: Optional[str] = None
    status: Optional[str] = None
    agendado_para: Optional[datetime.datetime] = None


class ConteudoOut(BaseModel):
    id: uuid.UUID
    titulo: str
    slug: str
    descricao: Optional[str]
    conteudo: Optional[str]
    imagem_capa_url: Optional[str]
    status: Optional[str]
    agendado_para: Optional[datetime.datetime]
    enviado_em: Optional[datetime.datetime]
    total_enviados: Optional[int]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── NewsletterConfig ──────────────────────────────────────────────────────────

class NewsletterConfigUpdate(BaseModel):
    frequencia_diaria: Optional[int] = None
    horarios_disparo: Optional[list[str]] = None
    ativo: Optional[bool] = None


class NewsletterConfigOut(BaseModel):
    id: uuid.UUID
    frequencia_diaria: Optional[int]
    horarios_disparo: Optional[list[str]]
    ativo: Optional[bool]
    ultima_execucao: Optional[datetime.datetime]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}


# ── NewsletterDisparos ────────────────────────────────────────────────────────

class DisparoOut(BaseModel):
    id: uuid.UUID
    tipo: str
    referencia_id: uuid.UUID
    titulo: str
    total_enviados: Optional[int]
    created_at: Optional[datetime.datetime]
    model_config = {"from_attributes": True}
