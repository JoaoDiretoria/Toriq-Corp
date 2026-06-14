"""Testes da geração + assinatura XMLDSig dos eventos eSocial SST.

Sem rede e sem cert real: gera os 3 eventos (estrutura) e valida o round-trip de
assinatura (assinar→verificar) com um .pfx self-signed. A aceitação real pelo
eSocial só é validável em homologação com o A1 ICP-Brasil.
"""
import datetime

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID
from lxml import etree
from signxml import XMLVerifier

from app.core.xml_signer import assinar_evento
from app.services.esocial_eventos import (
    EsocialConfig,
    gerar_evento,
    gerar_id_evento,
    gerar_s2210,
    gerar_s2220,
    gerar_s2240,
    montar_lote,
)

CFG = EsocialConfig(ambiente="2", tipo_inscricao="1", nr_inscricao="12345678000199")


def _cert_pfx(senha: str = "s"):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    agora = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "EMP:123")]))
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AC")]))
        .public_key(key.public_key())
        .serial_number(1)
        .not_valid_before(agora - datetime.timedelta(days=1))
        .not_valid_after(agora + datetime.timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    pfx = pkcs12.serialize_key_and_certificates(
        b"t", key, cert, None, BestAvailableEncryption(senha.encode())
    )
    return pfx, cert


def test_id_evento_formato():
    eid = gerar_id_evento("1", "12345678000199")
    assert eid.startswith("ID1")
    assert len(eid) == 36  # ID + 1 + 14 + 14(carimbo) + 5(seq) + ... formato eSocial


def test_s2210_estrutura():
    dados = {
        "cpfTrabalhador": "12345678901", "codCateg": "101", "dtAcid": "2026-06-10",
        "tpAcid": "1", "tpCat": "1", "indCatObito": "N", "indComunPolicia": "N",
        "codSitGeradora": "999001", "iniciatCAT": "1", "tpLocal": "1",
        "codParteAting": "750100", "lateralidade": "1", "codAgntCausador": "301015",
        "dtAtendimento": "2026-06-10", "indInternacao": "N", "durTrat": "5",
        "indAfast": "N", "dscLesao": "10", "codCID": "S600", "nmEmit": "Dr X",
        "ideOC": "1", "nrOC": "12345",
    }
    xml = gerar_s2210(CFG, dados)
    root = etree.fromstring(xml.encode())
    assert root.tag.endswith("eSocial")
    assert "evtCAT" in xml
    assert "evtCAT/v_S_01_02_00" in xml
    assert root[0].get("Id").startswith("ID1")
    assert "<codCID>S600</codCID>" in xml
    # tag opcional vazia não é emitida.
    assert "<hrAcid" not in xml


def test_s2220_exames():
    dados = {
        "cpfTrabalhador": "12345678901", "codCateg": "101", "dtAso": "2026-06-01",
        "tpAso": "0", "resAso": "1",
        "exames": [
            {"dtExm": "2026-05-30", "procRealizado": "0101", "ordExame": "1"},
            {"dtExm": "2026-05-30", "procRealizado": "0202", "ordExame": "1"},
        ],
        "nmMed": "Dra Y", "nrCRM": "99999", "ufCRM": "SP",
    }
    xml = gerar_s2220(CFG, dados)
    assert "evtMonit" in xml
    assert xml.count("<exame>") == 2
    assert "<nrCRM>99999</nrCRM>" in xml


def test_s2240_agentes():
    dados = {
        "cpfTrabalhador": "12345678901", "codCateg": "101", "dtIniCondicao": "2026-01-01",
        "codAmb": "1", "localAmb": "1", "dscSetor": "Producao", "dscAtivDes": "Operacao",
        "agentesNocivos": [{"codAgNoc": "01.01.001", "utilizEPI": "1", "epiEficaz": "S"}],
        "cpfResp": "98765432100", "nmResp": "Eng Z", "ideOC": "9", "nrOC": "111",
    }
    xml = gerar_s2240(CFG, dados)
    assert "evtExpRisco" in xml
    assert "<codAgNoc>01.01.001</codAgNoc>" in xml
    assert "<utilizEPI>1</utilizEPI>" in xml
    assert "<epiEficaz>S</epiEficaz>" in xml


def test_assinatura_round_trip():
    pfx, cert = _cert_pfx()
    dados = {
        "cpfTrabalhador": "12345678901", "codCateg": "101", "dtAso": "2026-06-01",
        "tpAso": "0", "resAso": "1", "exames": [], "nmMed": "M", "nrCRM": "1", "ufCRM": "SP",
    }
    xml = gerar_evento("S-2220", CFG, dados)
    assinado = assinar_evento(xml, pfx, "s")
    assert "Signature" in assinado
    # verifica a assinatura com o cert.
    XMLVerifier().verify(etree.fromstring(assinado.encode()), x509_cert=cert)


def test_montar_lote():
    pfx, _ = _cert_pfx()
    dados = {
        "cpfTrabalhador": "12345678901", "codCateg": "101", "dtAso": "2026-06-01",
        "tpAso": "0", "resAso": "1", "exames": [], "nmMed": "M", "nrCRM": "1", "ufCRM": "SP",
    }
    assinado = assinar_evento(gerar_s2220(CFG, dados), pfx, "s")
    lote = montar_lote(CFG, [assinado])
    assert "envioLoteEventos" in lote
    assert 'grupo="2"' in lote
    assert "<eventos>" in lote and "<evento Id=" in lote
    assert "ideTransmissor" in lote
