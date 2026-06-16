"""Schemas Pydantic para o módulo White Label / Configuração de empresa.

Tabelas cobertas:
- white_label_config  (1-per-empresa, tenant=empresa_id, UniqueConstraint)
- empresas_modulos    (many-per-empresa, tenant=empresa_id)
- empresas_modulos_telas (many-per-empresa, tenant=empresa_id)
- modulos             (global/read-only — sem empresa_id)
"""
import datetime
import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# ── Modulos (catálogo global — leitura para todos; escrita só admin_vertical) ──

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
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ── EmpresasModulos ───────────────────────────────────────────────────────────

class EmpresaModuloIn(BaseModel):
    modulo_id: uuid.UUID
    ativo: bool = True


class EmpresaModuloUpdate(BaseModel):
    ativo: Optional[bool] = None


# ── Administração cross-tenant (super admin) — escopo pelo empresa_id do path ──
# Usados por /empresas/{empresa_id}/modulos*. Diferente do auto-serviço acima, o
# modulo_id vem do path; o corpo carrega só o estado.

class EmpresaModuloAtivoIn(BaseModel):
    ativo: bool = True


class TelasSetIn(BaseModel):
    """Conjunto EXATO de telas ativas de um módulo para a empresa.

    O servidor reconcilia: insere as ausentes, remove as que sumiram, reativa
    as presentes. Substitui o loop client-side de N requests por 1 chamada.
    """
    tela_ids: list[str]


class EmpresaModuloOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    modulo_id: uuid.UUID
    ativo: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ── EmpresasModulosTelas ──────────────────────────────────────────────────────

class EmpresaModuloTelaIn(BaseModel):
    modulo_id: uuid.UUID
    tela_id: str
    ativo: Optional[bool] = True


class EmpresaModuloTelaUpdate(BaseModel):
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


# ── WhiteLabelConfig ──────────────────────────────────────────────────────────
# 1-per-empresa  →  GET (own config) + PUT (upsert own config)
# UPDATE schema excludes empresa_id (never allow tenant FK override).

class WhiteLabelConfigUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    subject: Optional[str] = None
    domain: Optional[str] = None
    font_body: Optional[str] = None
    font_heading: Optional[str] = None
    base_font_size: Optional[int] = None
    font_weight: Optional[int] = None
    line_height: Optional[Decimal] = None
    density: Optional[Decimal] = None
    radius: Optional[int] = None
    card_shadow: Optional[Decimal] = None
    bg_color: Optional[str] = None
    surface_color: Optional[str] = None
    border_color: Optional[str] = None
    text_color: Optional[str] = None
    muted_color: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    link_color: Optional[str] = None
    icon_color: Optional[str] = None
    badge_bg: Optional[str] = None
    success_color: Optional[str] = None
    warning_color: Optional[str] = None
    error_color: Optional[str] = None
    info_color: Optional[str] = None
    button_bg: Optional[str] = None
    button_text: Optional[str] = None
    button_hover: Optional[str] = None
    button_disabled: Optional[str] = None
    empty_tone: Optional[str] = None
    login_bg: Optional[str] = None
    about_text: Optional[str] = None
    email_footer: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    login_image_url: Optional[str] = None
    col_header_bg: Optional[str] = None
    col_header_text: Optional[str] = None
    col_border: Optional[str] = None
    col_shadow: Optional[str] = None
    col_width: Optional[int] = None
    col_auto_width: Optional[bool] = None
    card_bg: Optional[str] = None
    card_border: Optional[str] = None
    card_stripe: Optional[str] = None
    stripe_mode: Optional[int] = None
    card_compact: Optional[bool] = None
    blocked_color: Optional[str] = None
    f_title: Optional[bool] = None
    f_subtitle: Optional[bool] = None
    f_id: Optional[bool] = None
    f_tags: Optional[bool] = None
    f_assignee: Optional[bool] = None
    f_date: Optional[bool] = None
    f_sla: Optional[bool] = None
    f_priority: Optional[bool] = None
    f_points: Optional[bool] = None
    f_labels: Optional[bool] = None
    label_required: Optional[bool] = None
    label_limit: Optional[int] = None
    label_palette: Optional[str] = None
    avatar_shape: Optional[str] = None
    avatar_size: Optional[int] = None
    avatar_photo: Optional[bool] = None
    a_move: Optional[bool] = None
    a_done: Optional[bool] = None
    a_comment: Optional[bool] = None
    a_assign: Optional[bool] = None


class WhiteLabelConfigOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    title: Optional[str] = None
    subtitle: Optional[str] = None
    subject: Optional[str] = None
    domain: Optional[str] = None
    font_body: Optional[str] = None
    font_heading: Optional[str] = None
    base_font_size: Optional[int] = None
    font_weight: Optional[int] = None
    line_height: Optional[Decimal] = None
    density: Optional[Decimal] = None
    radius: Optional[int] = None
    card_shadow: Optional[Decimal] = None
    bg_color: Optional[str] = None
    surface_color: Optional[str] = None
    border_color: Optional[str] = None
    text_color: Optional[str] = None
    muted_color: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    link_color: Optional[str] = None
    icon_color: Optional[str] = None
    badge_bg: Optional[str] = None
    success_color: Optional[str] = None
    warning_color: Optional[str] = None
    error_color: Optional[str] = None
    info_color: Optional[str] = None
    button_bg: Optional[str] = None
    button_text: Optional[str] = None
    button_hover: Optional[str] = None
    button_disabled: Optional[str] = None
    empty_tone: Optional[str] = None
    login_bg: Optional[str] = None
    about_text: Optional[str] = None
    email_footer: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    login_image_url: Optional[str] = None
    col_header_bg: Optional[str] = None
    col_header_text: Optional[str] = None
    col_border: Optional[str] = None
    col_shadow: Optional[str] = None
    col_width: Optional[int] = None
    col_auto_width: Optional[bool] = None
    card_bg: Optional[str] = None
    card_border: Optional[str] = None
    card_stripe: Optional[str] = None
    stripe_mode: Optional[int] = None
    card_compact: Optional[bool] = None
    blocked_color: Optional[str] = None
    f_title: Optional[bool] = None
    f_subtitle: Optional[bool] = None
    f_id: Optional[bool] = None
    f_tags: Optional[bool] = None
    f_assignee: Optional[bool] = None
    f_date: Optional[bool] = None
    f_sla: Optional[bool] = None
    f_priority: Optional[bool] = None
    f_points: Optional[bool] = None
    f_labels: Optional[bool] = None
    label_required: Optional[bool] = None
    label_limit: Optional[int] = None
    label_palette: Optional[str] = None
    avatar_shape: Optional[str] = None
    avatar_size: Optional[int] = None
    avatar_photo: Optional[bool] = None
    a_move: Optional[bool] = None
    a_done: Optional[bool] = None
    a_comment: Optional[bool] = None
    a_assign: Optional[bool] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
