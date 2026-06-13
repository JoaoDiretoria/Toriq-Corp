"""Testes do eSocial Fase A.

Inclui:
  - Testes de UNIDADE PUROS (sem banco) que geram um .pfx self-signed em memória
    (cryptography) e validam parse_pfx + encrypt/decrypt/mask. Marcadores no nome:
    "pfx", "cert", "crypto" — rode só esses com:
        uv run pytest tests/test_esocial.py -k "pfx or crypto or cert" -p no:cacheprovider
  - Testes de endpoint no estilo dos outros tests/ (fixtures client/db_session).
"""
import base64
import datetime

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

from app.core import esocial_crypto
from app.core.esocial_cert import parse_pfx


# ── Helper: gera um .pfx self-signed em memória ────────────────────────────────

def _make_pfx(
    senha: str,
    *,
    cn: str = "EMPRESA TESTE LTDA:12345678000199",
    ou: str = "RFB e-CNPJ A1",
    o: str = "ICP-Brasil",
    emissor_cn: str = "AC TESTE",
    not_before: datetime.datetime | None = None,
    not_after: datetime.datetime | None = None,
) -> bytes:
    now = datetime.datetime.now(datetime.timezone.utc)
    if not_before is None:
        not_before = now - datetime.timedelta(days=1)
    if not_after is None:
        not_after = now + datetime.timedelta(days=365)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, cn),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, ou),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, o),
    ])
    issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, emissor_cn)])
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(not_before)
        .not_valid_after(not_after)
        .sign(key, hashes.SHA256())
    )
    return pkcs12.serialize_key_and_certificates(
        name=b"alias",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(senha.encode()),
    )


# ── Testes PUROS: parse_pfx (cert) ─────────────────────────────────────────────

def test_pfx_parse_ok():
    pfx = _make_pfx("senha123")
    info = parse_pfx(pfx, "senha123")
    assert info["cn"] == "EMPRESA TESTE LTDA:12345678000199"
    assert info["ou"] == "RFB e-CNPJ A1"
    assert info["o"] == "ICP-Brasil"
    assert info["emissor"] == "AC TESTE"
    assert isinstance(info["valido_de"], datetime.date)
    assert isinstance(info["valido_ate"], datetime.date)
    assert info["expirado"] is False
    assert info["serial_number"].isdigit()


def test_pfx_parse_senha_errada_levanta_valueerror():
    pfx = _make_pfx("certa")
    with pytest.raises(ValueError):
        parse_pfx(pfx, "errada")


def test_pfx_parse_arquivo_invalido_levanta_valueerror():
    with pytest.raises(ValueError):
        parse_pfx(b"isto nao eh um pfx", "qualquer")


def test_cert_expirado_flag():
    now = datetime.datetime.now(datetime.timezone.utc)
    pfx = _make_pfx(
        "senha123",
        not_before=now - datetime.timedelta(days=400),
        not_after=now - datetime.timedelta(days=10),
    )
    info = parse_pfx(pfx, "senha123")
    assert info["expirado"] is True


# ── Testes PUROS: crypto (encrypt/decrypt/mask) ────────────────────────────────

def test_crypto_roundtrip(monkeypatch):
    monkeypatch.setattr(
        esocial_crypto.settings, "integration_encryption_key", "chave-de-teste"
    )
    enc = esocial_crypto.encrypt_secret("segredo-super")
    assert enc != "segredo-super"
    assert esocial_crypto.decrypt_secret(enc) == "segredo-super"


def test_crypto_sem_chave_levanta_no_uso(monkeypatch):
    monkeypatch.setattr(
        esocial_crypto.settings, "integration_encryption_key", None
    )
    with pytest.raises(RuntimeError):
        esocial_crypto.encrypt_secret("x")


def test_crypto_decrypt_passthrough_plaintext(monkeypatch):
    monkeypatch.setattr(
        esocial_crypto.settings, "integration_encryption_key", "chave-de-teste"
    )
    # Valor não-Fernet (legado em claro) deve passar inalterado.
    assert esocial_crypto.decrypt_secret("texto-plano-legado") == "texto-plano-legado"


def test_crypto_mask_secret():
    assert esocial_crypto.mask_secret(None) is None
    assert esocial_crypto.mask_secret("abcd") == "****"
    assert esocial_crypto.mask_secret("ab") == "****"
    masked = esocial_crypto.mask_secret("abcdefghij")
    assert masked.endswith("ghij")
    assert masked == "******ghij"


# ── Testes de endpoint (usam fixtures client/db_session, tocam o banco) ────────

@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    from app.api.esocial import router as esocial_router
    from app.main import app

    already = any(getattr(r, "path", "") == "/esocial/config" for r in app.routes)
    if not already:
        app.include_router(esocial_router)
    yield


@pytest.fixture(autouse=True)
def _set_enc_key(monkeypatch):
    from app.core.config import settings as cfg

    monkeypatch.setattr(cfg, "integration_encryption_key", "chave-de-teste-endpoint")
    yield


async def _login_admin(client, db_session, email):
    from tests.helpers import login_as

    return await login_as(client, db_session, role="cliente_torq", email=email)


async def test_get_config_sem_registro_retorna_nulls(client, db_session):
    empresa = await _login_admin(client, db_session, "es_get@es.com")
    r = await client.get("/esocial/config")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa)
    assert body["has_govbr_client_secret"] is False
    assert body["has_esocial_cert"] is False
    assert body["govbr_client_id"] is None


async def test_validate_certificate_ok(client, db_session):
    await _login_admin(client, db_session, "es_val@es.com")
    pfx = _make_pfx("senha123")
    r = await client.post(
        "/esocial/validate-certificate",
        json={"pfx_base64": base64.b64encode(pfx).decode(), "senha": "senha123"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["valido"] is True
    assert body["certificado"]["emissor"] == "AC TESTE"


async def test_validate_certificate_senha_errada_nao_500(client, db_session):
    await _login_admin(client, db_session, "es_val2@es.com")
    pfx = _make_pfx("certa")
    r = await client.post(
        "/esocial/validate-certificate",
        json={"pfx_base64": base64.b64encode(pfx).decode(), "senha": "errada"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is False
    assert body["valido"] is False
    assert body["certificado"] is None


async def test_put_config_upsert_e_segredos_nao_vazam(client, db_session):
    empresa = await _login_admin(client, db_session, "es_put@es.com")
    pfx = _make_pfx("pfxpass")
    r = await client.put(
        "/esocial/config",
        json={
            "govbr_client_id": "cli-123",
            "govbr_client_secret": "super-secret",
            "govbr_environment": "staging",
            "esocial_cert_base64": base64.b64encode(pfx).decode(),
            "esocial_cert_password": "pfxpass",
            "esocial_tipo_inscricao": "1",
            "esocial_nr_inscricao": "12345678000199",
            "esocial_ambiente": "2",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa)
    assert body["govbr_client_id"] == "cli-123"
    assert body["has_govbr_client_secret"] is True
    assert body["has_esocial_cert"] is True
    assert body["has_esocial_cert_password"] is True
    assert body["certificado_cn"] == "EMPRESA TESTE LTDA:12345678000199"
    # Nenhum segredo deve estar presente no JSON.
    assert "govbr_client_secret" not in body
    assert "esocial_cert_base64" not in body
    assert "super-secret" not in r.text


async def test_delete_certificado_limpa_metadados(client, db_session):
    await _login_admin(client, db_session, "es_del@es.com")
    pfx = _make_pfx("pfxpass")
    await client.put(
        "/esocial/config",
        json={
            "esocial_cert_base64": base64.b64encode(pfx).decode(),
            "esocial_cert_password": "pfxpass",
        },
    )
    r = await client.delete("/esocial/config/certificado")
    assert r.status_code == 204, r.text
    g = await client.get("/esocial/config")
    body = g.json()
    assert body["has_esocial_cert"] is False
    assert body["has_esocial_cert_password"] is False
    assert body["certificado_cn"] is None
