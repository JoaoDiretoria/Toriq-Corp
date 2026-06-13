"""Schemas do eSocial Fase A (snake_case em tudo).

Regra de tenant: nenhum schema de entrada aceita `empresa_id` — o escopo é
SEMPRE o `user.empresa_id` do usuário autenticado.

Segredos (client_secret, .pfx, senha do .pfx) NUNCA são devolvidos: a visão
pública só expõe flags de presença `has_*` (e nada de máscara para o cert).
"""
import datetime
import uuid
from typing import Literal, Optional

from pydantic import BaseModel


# ── 1) validate-certificate ───────────────────────────────────────────────────

class ValidateCertificateIn(BaseModel):
    pfx_base64: str
    senha: str


class CertificadoDetalhe(BaseModel):
    cn: str
    ou: str
    o: str
    serial_number: str
    valido_de: datetime.date
    valido_ate: datetime.date
    emissor: str
    expirado: bool


class ValidateCertificateOut(BaseModel):
    success: bool
    valido: bool
    mensagem: str
    certificado: Optional[CertificadoDetalhe] = None


# ── 2/3) visão pública da config (GET / retorno do PUT) ────────────────────────

class EsocialConfigPublic(BaseModel):
    empresa_id: Optional[uuid.UUID] = None
    govbr_client_id: Optional[str] = None
    govbr_environment: Optional[str] = None
    has_govbr_client_secret: bool = False
    has_esocial_cert: bool = False
    has_esocial_cert_password: bool = False
    esocial_tipo_inscricao: Optional[str] = None
    esocial_nr_inscricao: Optional[str] = None
    esocial_ambiente: Optional[str] = None
    certificado_alias: Optional[str] = None
    certificado_cn: Optional[str] = None
    certificado_valido_ate: Optional[datetime.date] = None
    updated_at: Optional[datetime.datetime] = None


# ── 3) PUT /esocial/config ─────────────────────────────────────────────────────

class EsocialConfigUpdate(BaseModel):
    govbr_client_id: Optional[str] = None
    govbr_client_secret: Optional[str] = None
    govbr_redirect_uri: Optional[str] = None
    # Os 3 campos abaixo têm CHECK constraint no banco — validamos aqui para
    # devolver 422 amigável em vez de IntegrityError 500.
    govbr_environment: Optional[Literal["staging", "production"]] = None
    esocial_cert_base64: Optional[str] = None
    esocial_cert_password: Optional[str] = None
    esocial_tipo_inscricao: Optional[Literal["1", "2", "3", "4", "5", "6"]] = None
    esocial_nr_inscricao: Optional[str] = None
    esocial_ambiente: Optional[Literal["1", "2"]] = None
    certificado_alias: Optional[str] = None

    clear_govbr_client_secret: bool = False
    clear_esocial_cert: bool = False
    clear_esocial_cert_password: bool = False
