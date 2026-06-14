"""Testes dos endpoints de transmissão eSocial (/esocial/eventos, /esocial/lotes).

A chamada de rede ao eSocial é SEMPRE mockada (monkeypatch em
``app.api.esocial.esocial_ws``) — nenhum teste bate nos webservices reais.
A homologação real depende do A1 ICP-Brasil em produção-restrita.

DEPENDE da migration f0c1d2e3a4b5 (tabela esocial_eventos_log) aplicada.
"""
import base64
import datetime

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID

from app.api import esocial as esocial_api
from tests.helpers import login_as

_S2220 = {
    "cpfTrabalhador": "12345678901", "codCateg": "101", "dtAso": "2026-06-01",
    "tpAso": "0", "resAso": "1", "exames": [], "nmMed": "M", "nrCRM": "1", "ufCRM": "SP",
}


def _pfx(senha="s"):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    agora = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "EMP")]))
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AC")]))
        .public_key(key.public_key()).serial_number(1)
        .not_valid_before(agora - datetime.timedelta(days=1))
        .not_valid_after(agora + datetime.timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    return pkcs12.serialize_key_and_certificates(b"t", key, cert, None, BestAvailableEncryption(senha.encode()))


async def _config_completa(client):
    """Configura inscrição + ambiente + certificado A1 (self-signed)."""
    r = await client.put("/esocial/config", json={
        "esocial_tipo_inscricao": "1",
        "esocial_nr_inscricao": "12345678000199",
        "esocial_ambiente": "2",
        "esocial_cert_base64": base64.b64encode(_pfx("s")).decode(),
        "esocial_cert_password": "s",
    })
    assert r.status_code == 200, r.text


@pytest.mark.anyio
async def test_enviar_evento_sem_config(client, db_session):
    await login_as(client, db_session, email="tx_nocfg@torq.com")
    r = await client.post("/esocial/eventos/S-2220/enviar", json={"dados": _S2220})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is False
    assert "inscri" in body["error"].lower() or "certificado" in body["error"].lower()


@pytest.mark.anyio
async def test_enviar_tipo_invalido_400(client, db_session):
    await login_as(client, db_session, email="tx_badtipo@torq.com")
    r = await client.post("/esocial/eventos/S-9999/enviar", json={"dados": {}})
    assert r.status_code == 400, r.text


@pytest.mark.anyio
async def test_enviar_evento_registra_log(client, db_session, monkeypatch):
    await login_as(client, db_session, email="tx_ok@torq.com")
    await _config_completa(client)

    async def fake_enviar(ambiente, lote_xml, pfx_bytes, senha):
        assert "<eSocial" in lote_xml and "evtMonit" in lote_xml
        return {"success": True, "protocolo": "1.2.202606.0000777"}

    monkeypatch.setattr(esocial_api.esocial_ws, "enviar_lote", fake_enviar)

    r = await client.post("/esocial/eventos/S-2220/enviar", json={"dados": _S2220})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["protocolo"] == "1.2.202606.0000777"
    assert body["id_log"]

    # Consta no log.
    r = await client.get("/esocial/eventos")
    eventos = r.json()
    assert any(e["protocolo"] == "1.2.202606.0000777" and e["tipo"] == "S-2220" for e in eventos)


@pytest.mark.anyio
async def test_consultar_lote_atualiza_status(client, db_session, monkeypatch):
    await login_as(client, db_session, email="tx_consulta@torq.com")
    await _config_completa(client)

    async def fake_enviar(*a, **k):
        return {"success": True, "protocolo": "1.2.PROTO.1"}

    async def fake_consultar(ambiente, protocolo, pfx_bytes, senha):
        return {"success": True, "status": "201", "eventos": [{"id": "ID1", "status": "201", "descricao": "ok"}]}

    monkeypatch.setattr(esocial_api.esocial_ws, "enviar_lote", fake_enviar)
    monkeypatch.setattr(esocial_api.esocial_ws, "consultar_lote", fake_consultar)

    await client.post("/esocial/eventos/S-2220/enviar", json={"dados": _S2220})
    r = await client.get("/esocial/lotes/1.2.PROTO.1")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["status"] == "201"
    assert body["eventos"][0]["id"] == "ID1"
