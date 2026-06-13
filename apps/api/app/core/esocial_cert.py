"""Parsing do certificado A1 (.pfx / PKCS#12) do eSocial.

Substitui o caminho legado (node-forge) por
``cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates``,
que devolve (private_key, certificate, additional_certs) numa só chamada.

Campos expostos (mesmo conjunto do legado):
  cn, ou, o, serial_number, valido_de (date), valido_ate (date), emissor, expirado

Em senha errada ou pfx inválido, levanta ``ValueError`` com mensagem amigável —
o caller (endpoint) traduz isso para success=false sem derrubar com 500.
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass

from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509 import Certificate
from cryptography.x509.oid import NameOID


@dataclass
class CertificadoInfo:
    cn: str
    ou: str
    o: str
    serial_number: str
    valido_de: datetime.date
    valido_ate: datetime.date
    emissor: str
    expirado: bool

    def to_dict(self) -> dict:
        return {
            "cn": self.cn,
            "ou": self.ou,
            "o": self.o,
            "serial_number": self.serial_number,
            "valido_de": self.valido_de,
            "valido_ate": self.valido_ate,
            "emissor": self.emissor,
            "expirado": self.expirado,
        }


def _attr(cert_name, oid) -> str:
    """Primeiro atributo do Name pelo OID, ou string vazia (espelha o `|| ''` legado)."""
    attrs = cert_name.get_attributes_for_oid(oid)
    if not attrs:
        return ""
    return attrs[0].value or ""


def parse_pfx(pfx_bytes: bytes, senha: str) -> dict:
    """Parseia um .pfx e devolve os metadados do certificado como dict.

    Args:
        pfx_bytes: conteúdo binário do arquivo .pfx (PKCS#12).
        senha:     senha do .pfx.

    Returns:
        dict com cn, ou, o, serial_number, valido_de (date), valido_ate (date),
        emissor, expirado (bool).

    Raises:
        ValueError: senha errada, arquivo inválido ou sem certificado.
    """
    senha_bytes = senha.encode() if senha is not None else None
    try:
        _key, cert, _add = pkcs12.load_key_and_certificates(pfx_bytes, senha_bytes)
    except (ValueError, TypeError) as exc:
        # cryptography levanta ValueError("Invalid password or PKCS12 data").
        # O legado/openssl não distingue senha errada de arquivo corrompido.
        raise ValueError(
            "Falha ao ler certificado: senha incorreta ou arquivo PFX inválido."
        ) from exc

    if cert is None:
        raise ValueError("Certificado não encontrado no arquivo PFX.")

    cert_obj: Certificate = cert

    cn = _attr(cert_obj.subject, NameOID.COMMON_NAME)
    ou = _attr(cert_obj.subject, NameOID.ORGANIZATIONAL_UNIT_NAME)
    o = _attr(cert_obj.subject, NameOID.ORGANIZATION_NAME)
    emissor = _attr(cert_obj.issuer, NameOID.COMMON_NAME)

    valido_de = cert_obj.not_valid_before_utc.date()
    valido_ate = cert_obj.not_valid_after_utc.date()
    expirado = valido_ate < datetime.date.today()

    info = CertificadoInfo(
        cn=cn,
        ou=ou,
        o=o,
        serial_number=str(cert_obj.serial_number),
        valido_de=valido_de,
        valido_ate=valido_ate,
        emissor=emissor,
        expirado=expirado,
    )
    return info.to_dict()
