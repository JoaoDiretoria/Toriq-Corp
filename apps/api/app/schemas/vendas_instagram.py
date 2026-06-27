"""Schemas Pydantic do canal Instagram (Fase IG-1).

UPDATE omite FKs do pai (anti mass-assignment); segredos nunca são serializados
de volta (a API devolve ``*_set`` + máscara).
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Config (credenciais IG, na vendas_disparo_config) ──────────────────────────
class InstagramConfigUpdate(BaseModel):
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_verify_token: Optional[str] = None
    instagram_token: Optional[str] = None
    instagram_app_secret: Optional[str] = None
    clear_instagram_token: Optional[bool] = None
    clear_instagram_app_secret: Optional[bool] = None


class InstagramConfigPublic(BaseModel):
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_verify_token: Optional[str] = None
    instagram_token_set: bool = False
    instagram_token_masked: Optional[str] = None
    instagram_app_secret_set: bool = False


# ── Gatilhos ───────────────────────────────────────────────────────────────────
class GatilhoCreate(BaseModel):
    palavra_chave: Optional[str] = None
    ativo: bool = True
    responder_publico: bool = True
    responder_dm: bool = False
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None


class GatilhoUpdate(BaseModel):
    palavra_chave: Optional[str] = None
    ativo: Optional[bool] = None
    responder_publico: Optional[bool] = None
    responder_dm: Optional[bool] = None
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None


class GatilhoPublic(BaseModel):
    id: uuid.UUID
    palavra_chave: Optional[str] = None
    ativo: bool
    responder_publico: bool
    responder_dm: bool
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Comentários (leitura) ──────────────────────────────────────────────────────
class ComentarioPublic(BaseModel):
    id: uuid.UUID
    comment_id: str
    media_id: Optional[str] = None
    from_username: Optional[str] = None
    texto: Optional[str] = None
    lead_id: Optional[uuid.UUID] = None
    respondido_publico: bool
    respondido_dm: bool
    resposta_texto: Optional[str] = None
    erro: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── Posts (galeria — list_media) ───────────────────────────────────────────────
class PostPublic(BaseModel):
    id: str
    caption: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    permalink: Optional[str] = None
    timestamp: Optional[str] = None
    comments_count: Optional[int] = None


# ── Stats do canal ──────────────────────────────────────────────────────────────
class InstagramStats(BaseModel):
    comentarios: int
    respondidos: int
    leads: int
    erros: int


# ── Fase 2: comentários de um post + resposta manual ───────────────────────────
class ComentarioIG(BaseModel):
    id: Optional[str] = None
    text: Optional[str] = None
    username: Optional[str] = None
    timestamp: Optional[str] = None


class RespostaManual(BaseModel):
    texto: str
    publico: bool = True
    dm: bool = False
    from_username: Optional[str] = None


class RespostaManualResult(BaseModel):
    ok: bool
    respondido_publico: bool
    respondido_dm: bool
