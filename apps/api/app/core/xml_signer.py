"""Assinatura XMLDSig (enveloped) de eventos eSocial com certificado A1.

O eSocial exige assinatura **enveloped** sobre o elemento do evento (atributo
``Id``), com:
- Canonicalização **C14N 1.0** (``REC-xml-c14n-20010315``),
- ``SignatureMethod`` RSA-SHA256,
- ``DigestMethod`` SHA-256,
- ``KeyInfo``/``X509Data`` com o certificado.

Porte do ``assinarXML`` legado (node-forge + XML manual) para ``signxml``, que
gera a estrutura ``ds:Signature`` correta e aceita chave/cert do ``cryptography``.

NOTA de homologação: a aceitação real pelo eSocial só é validável em
produção-restrita com o **certificado A1 real** (cadeia ICP-Brasil). Os testes
unitários verificam o round-trip assinar→verificar (signxml), não a aceitação
pelo governo.
"""
from __future__ import annotations

from cryptography.hazmat.primitives.serialization import pkcs12
from lxml import etree
from signxml import XMLSigner
from signxml.algorithms import (
    CanonicalizationMethod,
    DigestAlgorithm,
    SignatureMethod,
)


def _signer() -> XMLSigner:
    """XMLSigner configurado como o eSocial exige (enveloped, C14N 1.0, RSA-SHA256)."""
    return XMLSigner(
        signature_algorithm=SignatureMethod.RSA_SHA256,
        digest_algorithm=DigestAlgorithm.SHA256,
        c14n_algorithm=CanonicalizationMethod.CANONICAL_XML_1_0,
    )


def assinar_evento(xml_str: str, pfx_bytes: bytes, senha: str) -> str:
    """Assina (enveloped) um XML de evento eSocial e devolve a string assinada.

    O elemento de evento (``evtCAT``/``evtMonit``/``evtExpRisco``) deve ter o
    atributo ``Id`` — a ``Reference`` aponta para ``#<Id>``. A ``ds:Signature``
    fica como último filho do elemento raiz ``eSocial`` (padrão enveloped do
    eSocial).

    Levanta ValueError em .pfx/senha inválidos.
    """
    try:
        key, cert, _chain = pkcs12.load_key_and_certificates(pfx_bytes, senha.encode())
    except (ValueError, TypeError) as exc:
        raise ValueError(
            "Falha ao ler certificado: senha incorreta ou arquivo PFX inválido."
        ) from exc
    if key is None or cert is None:
        raise ValueError("Certificado ou chave privada não encontrados no PFX.")

    root = etree.fromstring(xml_str.encode("utf-8"))
    # Acha o elemento de evento (filho direto do <eSocial> que tem @Id).
    evento = next((el for el in root if el.get("Id")), None)
    reference_uri = "#" + evento.get("Id") if evento is not None else None

    assinado = _signer().sign(
        root,
        key=key,
        cert=[cert],
        reference_uri=reference_uri,
        id_attribute="Id",
    )
    return etree.tostring(assinado, encoding="unicode")
