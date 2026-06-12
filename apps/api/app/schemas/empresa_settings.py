"""Schemas das configurações por empresa (tenant via empresa_id).

  configuracoes_empresa · empresa_configuracoes · informacoes_empresa

Nenhum schema de create/update inclui `empresa_id` — o TenantRepository força
o empresa_id do usuário autenticado (anti mass-assignment / cross-tenant).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── configuracoes_empresa ─────────────────────────────────────────────────────

class ConfiguracoesEmpresaIn(BaseModel):
    logo_url: Optional[str] = None
    cor_primaria: Optional[str] = None
    cor_secundaria: Optional[str] = None
    tema: Optional[str] = None


class ConfiguracoesEmpresaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    logo_url: Optional[str] = None
    cor_primaria: Optional[str] = None
    cor_secundaria: Optional[str] = None
    tema: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── empresa_configuracoes ─────────────────────────────────────────────────────

class EmpresaConfiguracoesIn(BaseModel):
    nome_fantasia: Optional[str] = None
    idioma: Optional[str] = None
    fuso_horario: Optional[str] = None
    formato_data: Optional[str] = None
    formato_moeda: Optional[str] = None
    notif_email: Optional[bool] = None
    notif_sistema: Optional[bool] = None
    notif_treinamentos: Optional[bool] = None
    notif_vencimentos: Optional[bool] = None
    notif_documentos: Optional[bool] = None
    autenticacao_2fa: Optional[bool] = None
    sessao_timeout: Optional[int] = None
    log_acessos: Optional[bool] = None
    tema: Optional[str] = None
    cor_primaria: Optional[str] = None
    modelo_certificado: Optional[str] = None
    assinatura_digital: Optional[bool] = None
    rodape_padrao: Optional[str] = None


class EmpresaConfiguracoesOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome_fantasia: Optional[str] = None
    idioma: Optional[str] = None
    fuso_horario: Optional[str] = None
    formato_data: Optional[str] = None
    formato_moeda: Optional[str] = None
    notif_email: Optional[bool] = None
    notif_sistema: Optional[bool] = None
    notif_treinamentos: Optional[bool] = None
    notif_vencimentos: Optional[bool] = None
    notif_documentos: Optional[bool] = None
    autenticacao_2fa: Optional[bool] = None
    sessao_timeout: Optional[int] = None
    log_acessos: Optional[bool] = None
    tema: Optional[str] = None
    cor_primaria: Optional[str] = None
    modelo_certificado: Optional[str] = None
    assinatura_digital: Optional[bool] = None
    rodape_padrao: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


# ── informacoes_empresa ───────────────────────────────────────────────────────

class InformacoesEmpresaIn(BaseModel):
    missao: Optional[str] = None
    visao: Optional[str] = None
    valores: Optional[str] = None
    diretor_tecnico_nome: Optional[str] = None
    diretor_tecnico_formacao: Optional[str] = None
    diretor_tecnico_assinatura_url: Optional[str] = None
    diretor_tecnico_registro_tipo: Optional[str] = None
    diretor_tecnico_registro_numero: Optional[str] = None
    diretor_tecnico_registro_estado: Optional[str] = None
    diretor_tecnico_assinatura_tipo: Optional[str] = None
    logo_pequena_url: Optional[str] = None
    logo_grande_url: Optional[str] = None
    moldura_vertical_url: Optional[str] = None
    moldura_horizontal_url: Optional[str] = None


class InformacoesEmpresaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    missao: Optional[str] = None
    visao: Optional[str] = None
    valores: Optional[str] = None
    diretor_tecnico_nome: Optional[str] = None
    diretor_tecnico_formacao: Optional[str] = None
    diretor_tecnico_assinatura_url: Optional[str] = None
    diretor_tecnico_registro_tipo: Optional[str] = None
    diretor_tecnico_registro_numero: Optional[str] = None
    diretor_tecnico_registro_estado: Optional[str] = None
    diretor_tecnico_assinatura_tipo: Optional[str] = None
    logo_pequena_url: Optional[str] = None
    logo_grande_url: Optional[str] = None
    moldura_vertical_url: Optional[str] = None
    moldura_horizontal_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}
