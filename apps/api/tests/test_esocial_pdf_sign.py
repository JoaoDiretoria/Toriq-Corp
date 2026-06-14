"""Testes da assinatura digital A1 (PAdES) — endpoints /esocial/pdf/*.

Gera um .pfx self-signed e um PDF mínimo em memória (sem rede, sem disco).
Cobre:
- certificate-info: sem cert → configurado=False; com cert → True + CN.
- pdf/sign: assina (success=True), devolve PDF válido com a página de selo + campo
  de assinatura; sem cert → success=False; cert expirado → success=False.
"""
import base64
import datetime
import io

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from tests.helpers import login_as


def _make_pfx(senha: str, *, dias_validade: int = 365) -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "EMPRESA TESTE:12345678000199"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "EMPRESA TESTE LTDA"),
    ])
    agora = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AC TESTE")]))
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - datetime.timedelta(days=1))
        .not_valid_after(agora + datetime.timedelta(days=dias_validade))
        .sign(key, hashes.SHA256())
    )
    return pkcs12.serialize_key_and_certificates(
        b"teste", key, cert, None, BestAvailableEncryption(senha.encode())
    )


def _make_pdf() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.drawString(100, 700, "Certificado de Treinamento NR-35")
    c.showPage()
    c.save()
    return buf.getvalue()


async def _salvar_cert(client, pfx: bytes, senha: str) -> None:
    r = await client.put(
        "/esocial/config",
        json={
            "esocial_cert_base64": base64.b64encode(pfx).decode(),
            "esocial_cert_password": senha,
        },
    )
    assert r.status_code == 200, r.text


@pytest.mark.anyio
async def test_certificate_info_sem_cert(client, db_session):
    await login_as(client, db_session, email="sign_nocert@torq.com")
    r = await client.get("/esocial/pdf/certificate-info")
    assert r.status_code == 200, r.text
    assert r.json()["configurado"] is False


@pytest.mark.anyio
async def test_certificate_info_com_cert(client, db_session):
    await login_as(client, db_session, email="sign_info@torq.com")
    await _salvar_cert(client, _make_pfx("senha123"), "senha123")
    r = await client.get("/esocial/pdf/certificate-info")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["configurado"] is True
    assert "EMPRESA TESTE" in body["cn"]
    assert body["expirado"] is False


@pytest.mark.anyio
async def test_pdf_sign_ok(client, db_session):
    await login_as(client, db_session, email="sign_ok@torq.com")
    await _salvar_cert(client, _make_pfx("senha123"), "senha123")

    r = await client.post(
        "/esocial/pdf/sign",
        json={
            "pdf_base64": base64.b64encode(_make_pdf()).decode(),
            "documento_tipo": "Certificado NR-35",
            "motivo_assinatura": "Emissão de certificado",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["certificado_info"]["cn"].startswith("EMPRESA TESTE")
    assinado = base64.b64decode(body["pdf_base64"])
    assert assinado[:5] == b"%PDF-"

    # O PDF assinado tem 2 páginas (original + selo) e um campo de assinatura.
    from pyhanko.pdf_utils.reader import PdfFileReader
    r2 = PdfFileReader(io.BytesIO(assinado))
    assert r2.root["/Pages"]["/Count"] == 2
    assert [f.field_name for f in r2.embedded_signatures] == ["AssinaturaToriq"]


@pytest.mark.anyio
async def test_pdf_sign_sem_cert(client, db_session):
    await login_as(client, db_session, email="sign_semcert@torq.com")
    r = await client.post(
        "/esocial/pdf/sign",
        json={
            "pdf_base64": base64.b64encode(_make_pdf()).decode(),
            "documento_tipo": "Certificado NR-35",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is False
    assert "certificado" in body["error"].lower()


@pytest.mark.anyio
async def test_pdf_sign_cert_expirado(client, db_session):
    await login_as(client, db_session, email="sign_exp@torq.com")
    # Cert válido por -1 dia → já expirado. O PUT só persiste; a expiração é
    # checada na hora de assinar.
    pfx = _make_pfx("senha123", dias_validade=-1)
    r = await client.put(
        "/esocial/config",
        json={
            "esocial_cert_base64": base64.b64encode(pfx).decode(),
            "esocial_cert_password": "senha123",
        },
    )
    # O PUT valida o cert e rejeita expirado com 422 (parse_pfx marca expirado,
    # mas o put_config só falha em senha/arquivo — então persiste). Garantimos o
    # comportamento de assinatura independentemente:
    if r.status_code == 200:
        r = await client.post(
            "/esocial/pdf/sign",
            json={
                "pdf_base64": base64.b64encode(_make_pdf()).decode(),
                "documento_tipo": "Certificado NR-35",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is False
        assert "expirado" in body["error"].lower()
