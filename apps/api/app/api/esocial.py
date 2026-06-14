"""Endpoints do eSocial Fase A (integração gov.br + certificado A1).

Tenant: o escopo é SEMPRE `user.empresa_id` — nunca aceitamos empresa_id do
body/query. Se o usuário não tiver empresa → 403. Admin da empresa =
require_role(admin_vertical, cliente_torq).

Há 1 config por empresa (PK = empresa_id em empresa_integracoes_esocial).

Segredos (client_secret, .pfx, senha) ficam criptografados nas colunas `*_enc`
e NUNCA são devolvidos — a visão pública só expõe flags `has_*`.
"""
import asyncio
import base64
import binascii
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_cert import parse_pfx
from app.core.esocial_crypto import decrypt_secret, encrypt_secret
from app.core.pdf_sign import assinar_pdf
from app.models.esocial import EmpresaIntegracoesEsocial
from app.models.generated import Empresas
from app.models.user import User, UserRole
from app.schemas import esocial as s

router = APIRouter(prefix="/esocial", tags=["esocial"])

# Admin da empresa: admin_vertical OU cliente_torq (admin do tenant SST).
_require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _empresa_id(user: User):
    """Escopo de tenant — 403 se o usuário não tem empresa."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _to_public(obj: EmpresaIntegracoesEsocial | None, empresa_id) -> s.EsocialConfigPublic:
    """Monta a visão pública (sem segredos) a partir do registro ou de nulls."""
    if obj is None:
        return s.EsocialConfigPublic(empresa_id=empresa_id)
    return s.EsocialConfigPublic(
        empresa_id=obj.empresa_id,
        govbr_client_id=obj.govbr_client_id,
        govbr_environment=obj.govbr_environment,
        has_govbr_client_secret=bool(obj.govbr_client_secret_enc),
        has_esocial_cert=bool(obj.esocial_cert_base64_enc),
        has_esocial_cert_password=bool(obj.esocial_cert_password_enc),
        esocial_tipo_inscricao=obj.esocial_tipo_inscricao,
        esocial_nr_inscricao=obj.esocial_nr_inscricao,
        esocial_ambiente=obj.esocial_ambiente,
        certificado_alias=obj.certificado_alias,
        certificado_cn=obj.certificado_cn,
        certificado_valido_ate=obj.certificado_valido_ate,
        updated_at=obj.updated_at,
    )


# ── 1) POST /esocial/validate-certificate ─────────────────────────────────────

@router.post("/validate-certificate", response_model=s.ValidateCertificateOut)
async def validate_certificate(
    payload: s.ValidateCertificateIn,
    user: User = Depends(_require_admin),
):
    """Valida um .pfx (base64 + senha) sem persistir nada.

    Erros de senha/arquivo não derrubam com 500 — devolvem success=false com
    mensagem amigável.
    """
    _empresa_id(user)
    try:
        pfx_bytes = base64.b64decode(payload.pfx_base64, validate=True)
    except (binascii.Error, ValueError):
        return s.ValidateCertificateOut(
            success=False,
            valido=False,
            mensagem="Arquivo do certificado inválido (base64 malformado).",
            certificado=None,
        )

    try:
        info = parse_pfx(pfx_bytes, payload.senha)
    except ValueError as exc:
        return s.ValidateCertificateOut(
            success=False, valido=False, mensagem=str(exc), certificado=None
        )

    detalhe = s.CertificadoDetalhe(**info)
    valido = not detalhe.expirado
    mensagem = "Certificado expirado." if detalhe.expirado else "Certificado válido."
    return s.ValidateCertificateOut(
        success=True, valido=valido, mensagem=mensagem, certificado=detalhe
    )


# ── 2) GET /esocial/config ─────────────────────────────────────────────────────

@router.get("/config", response_model=s.EsocialConfigPublic)
async def get_config(
    user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Visão pública (sem segredos). Sem config → objeto com nulls (não 404)."""
    empresa_id = _empresa_id(user)
    obj = await db.scalar(
        select(EmpresaIntegracoesEsocial).where(
            EmpresaIntegracoesEsocial.empresa_id == empresa_id
        )
    )
    return _to_public(obj, empresa_id)


# ── 3) PUT /esocial/config ─────────────────────────────────────────────────────

@router.put("/config", response_model=s.EsocialConfigPublic)
async def put_config(
    payload: s.EsocialConfigUpdate,
    user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upsert da config do eSocial. Criptografa segredos antes de gravar.

    - Quando `esocial_cert_base64` vier, valida o .pfx (com a senha fornecida) e
      preenche os metadados certificado_*.
    - Flags clear_* apagam o respectivo campo.
    """
    empresa_id = _empresa_id(user)
    data = payload.model_dump(exclude_unset=True)

    obj = await db.scalar(
        select(EmpresaIntegracoesEsocial).where(
            EmpresaIntegracoesEsocial.empresa_id == empresa_id
        )
    )
    created = obj is None
    if created:
        obj = EmpresaIntegracoesEsocial(empresa_id=empresa_id)

    # Campos em plaintext (config, não segredos).
    for field in (
        "govbr_client_id",
        "govbr_redirect_uri",
        "govbr_environment",
        "esocial_tipo_inscricao",
        "esocial_nr_inscricao",
        "esocial_ambiente",
        "certificado_alias",
    ):
        if field in data:
            setattr(obj, field, data[field])

    # gov.br client_secret (segredo).
    if data.get("clear_govbr_client_secret"):
        obj.govbr_client_secret_enc = None
    elif "govbr_client_secret" in data and data["govbr_client_secret"] is not None:
        obj.govbr_client_secret_enc = encrypt_secret(data["govbr_client_secret"])

    # Senha do .pfx (segredo). Pode ser necessária para validar o cert abaixo.
    senha_pfx = data.get("esocial_cert_password")
    if data.get("clear_esocial_cert_password"):
        obj.esocial_cert_password_enc = None
    elif "esocial_cert_password" in data and senha_pfx is not None:
        obj.esocial_cert_password_enc = encrypt_secret(senha_pfx)

    # Certificado .pfx (segredo) + metadados.
    if data.get("clear_esocial_cert"):
        obj.esocial_cert_base64_enc = None
        obj.certificado_cn = None
        obj.certificado_serial = None
        obj.certificado_emissor = None
        obj.certificado_valido_ate = None
    elif "esocial_cert_base64" in data and data["esocial_cert_base64"] is not None:
        cert_b64 = data["esocial_cert_base64"]
        try:
            pfx_bytes = base64.b64decode(cert_b64, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Arquivo do certificado inválido (base64 malformado).",
            )
        if senha_pfx is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Senha do certificado (esocial_cert_password) é obrigatória ao "
                "enviar um novo certificado.",
            )
        try:
            info = parse_pfx(pfx_bytes, senha_pfx)
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
        obj.esocial_cert_base64_enc = encrypt_secret(cert_b64)
        obj.certificado_cn = info["cn"]
        obj.certificado_serial = info["serial_number"]
        obj.certificado_emissor = info["emissor"]
        obj.certificado_valido_ate = info["valido_ate"]

    obj.updated_at = datetime.datetime.now(datetime.timezone.utc)

    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _to_public(obj, empresa_id)


# ── 4) DELETE /esocial/config/certificado ──────────────────────────────────────

@router.delete("/config/certificado", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certificado(
    user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Limpa o certificado, a senha e os metadados. 204 mesmo sem config."""
    empresa_id = _empresa_id(user)
    obj = await db.scalar(
        select(EmpresaIntegracoesEsocial).where(
            EmpresaIntegracoesEsocial.empresa_id == empresa_id
        )
    )
    if obj is None:
        return
    obj.esocial_cert_base64_enc = None
    obj.esocial_cert_password_enc = None
    obj.certificado_cn = None
    obj.certificado_serial = None
    obj.certificado_emissor = None
    obj.certificado_valido_ate = None
    obj.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()


# ── 5) Assinatura digital de PDF (A1 ICP-Brasil) ───────────────────────────────

async def _cert_da_empresa(db: AsyncSession, empresa_id) -> tuple[bytes, str] | None:
    """Devolve ``(pfx_bytes, senha)`` do certificado salvo, ou None se não houver.

    Descriptografa o .pfx (base64) e a senha guardados em repouso.
    """
    obj = await db.scalar(
        select(EmpresaIntegracoesEsocial).where(
            EmpresaIntegracoesEsocial.empresa_id == empresa_id
        )
    )
    if obj is None or not obj.esocial_cert_base64_enc or not obj.esocial_cert_password_enc:
        return None
    cert_b64 = decrypt_secret(obj.esocial_cert_base64_enc)
    senha = decrypt_secret(obj.esocial_cert_password_enc)
    try:
        pfx_bytes = base64.b64decode(cert_b64, validate=True)
    except (binascii.Error, ValueError):
        return None
    return pfx_bytes, senha


@router.get("/pdf/certificate-info", response_model=s.CertificateInfoOut)
async def pdf_certificate_info(
    user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Status do certificado A1 da empresa para assinatura (sem expor segredos)."""
    empresa_id = _empresa_id(user)
    par = await _cert_da_empresa(db, empresa_id)
    if par is None:
        return s.CertificateInfoOut(configurado=False)
    pfx_bytes, senha = par
    try:
        info = parse_pfx(pfx_bytes, senha)
    except ValueError:
        return s.CertificateInfoOut(configurado=False)
    return s.CertificateInfoOut(
        configurado=True,
        cn=info["cn"],
        valido_ate=info["valido_ate"],
        expirado=info["expirado"],
    )


@router.post("/pdf/sign", response_model=s.AssinarPdfOut)
async def pdf_sign(
    payload: s.AssinarPdfIn,
    user: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assina um PDF (base64) com o certificado A1 da empresa (PAdES ICP-Brasil).

    Anexa a página de selo + aplica a assinatura criptográfica. Erros de cert
    (ausente/expirado/senha) viram ``success=false`` — nunca 500.
    """
    empresa_id = _empresa_id(user)
    par = await _cert_da_empresa(db, empresa_id)
    if par is None:
        return s.AssinarPdfOut(
            success=False, error="Nenhum certificado A1 configurado para a empresa."
        )
    pfx_bytes, senha = par

    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64, validate=True)
    except (binascii.Error, ValueError):
        return s.AssinarPdfOut(success=False, error="PDF inválido (base64 malformado).")

    # Dados da empresa para o selo (nome/CNPJ).
    empresa = await db.scalar(select(Empresas).where(Empresas.id == empresa_id))
    dados = {
        "documento_tipo": payload.documento_tipo,
        "nome_empresa": getattr(empresa, "nome", "") if empresa else "",
        "cnpj": getattr(empresa, "cnpj", "") if empresa else "",
        "razao": payload.motivo_assinatura or f"Assinatura de {payload.documento_tipo}",
        "local": "Brasil",
        "documento_id": payload.documento_id,
    }

    try:
        # Assinatura é CPU-bound e o pyhanko (API síncrona) usa asyncio.run()
        # internamente — rodar em thread evita conflito com o event loop e não
        # bloqueia o loop principal.
        assinado, cert_info = await asyncio.to_thread(
            assinar_pdf, pdf_bytes, pfx_bytes, senha, dados
        )
    except ValueError as exc:
        return s.AssinarPdfOut(success=False, error=str(exc))

    return s.AssinarPdfOut(
        success=True,
        pdf_base64=base64.b64encode(assinado).decode(),
        certificado_info=s.CertificadoAssinaturaInfo(
            cn=cert_info["cn"],
            emissor=cert_info["emissor"],
            serial_number=str(cert_info["serial_number"]),
        ),
    )
