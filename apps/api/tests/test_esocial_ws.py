"""Testes das partes puras do transporte SOAP/mTLS do eSocial.

A chamada de rede real só é homologável com o A1 ICP-Brasil em produção-restrita;
aqui cobrimos: URLs por ambiente, montagem dos envelopes, parsing das respostas
SOAP (fixtures) e o ciclo de vida do PEM temporário (cria 0600 e apaga).
"""
import datetime
import os

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID

from app.integrations import esocial_ws as ws


def _pfx(senha="s"):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    agora = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "EMP")]))
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AC")]))
        .public_key(key.public_key())
        .serial_number(1)
        .not_valid_before(agora - datetime.timedelta(days=1))
        .not_valid_after(agora + datetime.timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    return pkcs12.serialize_key_and_certificates(b"t", key, cert, None, BestAvailableEncryption(senha.encode()))


def test_urls_por_ambiente():
    assert "producaorestrita" in ws.urls("2")["envio"]
    assert "producaorestrita" not in ws.urls("1")["envio"]
    assert "consultarloteeventos" in ws.urls("1")["consulta"]


def test_envelope_envio():
    env = ws.montar_envelope_envio("<eSocial>LOTE</eSocial>")
    assert "soap:Envelope" in env
    assert "EnviarLoteEventos" in env
    assert "<loteEventos><eSocial>LOTE</eSocial></loteEventos>" in env


def test_envelope_consulta():
    env = ws.montar_envelope_consulta("1.2.202606.0000001")
    assert "ConsultarLoteEventos" in env
    assert "<protocoloEnvio>1.2.202606.0000001</protocoloEnvio>" in env


def test_parsing_respostas():
    resp = (
        "<x><protocoloEnvio>1.2.99</protocoloEnvio><cdResposta>201</cdResposta>"
        '<evento Id="ID1"><cdResposta>201</cdResposta>'
        "<descResposta>Sucesso</descResposta></evento></x>"
    )
    assert ws.extrair_protocolo(resp) == "1.2.99"
    assert ws.extrair_status(resp) == "201"
    eventos = ws.extrair_eventos(resp)
    assert eventos == [{"id": "ID1", "status": "201", "descricao": "Sucesso"}]


def test_parsing_sem_match_defaults():
    assert ws.extrair_protocolo("<vazio/>") == ""
    assert ws.extrair_status("<vazio/>") == "DESCONHECIDO"
    assert ws.extrair_eventos("<vazio/>") == []


def test_pem_temporario_cria_e_apaga():
    pfx = _pfx("s")
    with ws._pem_temporario(pfx, "s") as (cert_path, key_path):
        assert os.path.exists(cert_path) and os.path.exists(key_path)
        assert open(cert_path, "rb").read().startswith(b"-----BEGIN CERTIFICATE-----")
        assert b"PRIVATE KEY" in open(key_path, "rb").read()
        guardados = (cert_path, key_path)
    # Apagados ao sair do context manager.
    assert not os.path.exists(guardados[0])
    assert not os.path.exists(guardados[1])
