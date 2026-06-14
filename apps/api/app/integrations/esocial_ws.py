"""Transporte SOAP + mTLS para os webservices do eSocial (enviar/consultar lote).

Porte do ``esocialService.ts`` legado (axios + https.Agent) para ``httpx`` com
mTLS. O certificado A1 é o **client certificate** do TLS — o `httpx` exige
arquivos, então convertemos o .pfx (em memória) para PEM em **arquivos temporários
0600**, usados durante a chamada e apagados em seguida (decisão de design do spec).

Funções puras (envelope/parsing) são testáveis sem rede; a chamada real só é
homologável em produção-restrita com o A1 ICP-Brasil real.
"""
from __future__ import annotations

import contextlib
import os
import re
import ssl
import tempfile

import httpx
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    pkcs12,
)

_NS_ENVIO = "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0"
_NS_CONSULTA = (
    "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/"
    "retornoProcessamento/v1_0_0"
)


def urls(ambiente: str) -> dict[str, str]:
    """URLs do eSocial por ambiente: '1' produção, '2' produção-restrita."""
    prod = ambiente == "1"
    base = "webservices.esocial.gov.br" if prod else "webservices.producaorestrita.esocial.gov.br"
    return {
        "envio": f"https://{base}/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc",
        "consulta": f"https://{base}/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc",
    }


def montar_envelope_envio(lote_xml: str) -> str:
    """Envelope SOAP 1.2 para EnviarLoteEventos."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">'
        "<soap:Header/><soap:Body>"
        f'<EnviarLoteEventos xmlns="{_NS_ENVIO}"><loteEventos>{lote_xml}</loteEventos>'
        "</EnviarLoteEventos></soap:Body></soap:Envelope>"
    )


def montar_envelope_consulta(protocolo: str) -> str:
    """Envelope SOAP 1.2 para ConsultarLoteEventos."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">'
        "<soap:Header/><soap:Body>"
        f'<ConsultarLoteEventos xmlns="{_NS_CONSULTA}">'
        f"<consulta><protocoloEnvio>{protocolo}</protocoloEnvio></consulta>"
        "</ConsultarLoteEventos></soap:Body></soap:Envelope>"
    )


def extrair_protocolo(resp: str) -> str:
    m = re.search(r"<protocoloEnvio>([^<]+)</protocoloEnvio>", resp)
    return m.group(1) if m else ""


def extrair_status(resp: str) -> str:
    m = re.search(r"<cdResposta>([^<]+)</cdResposta>", resp)
    return m.group(1) if m else "DESCONHECIDO"


def extrair_eventos(resp: str) -> list[dict]:
    """Extrai eventos processados (id, status, descrição) da resposta SOAP."""
    regex = re.compile(
        r'<evento[^>]*Id="([^"]+)"[^>]*>.*?<cdResposta>([^<]+)</cdResposta>'
        r".*?<descResposta>([^<]*)</descResposta>",
        re.DOTALL,
    )
    return [
        {"id": m.group(1), "status": m.group(2), "descricao": m.group(3)}
        for m in regex.finditer(resp)
    ]


@contextlib.contextmanager
def _pem_temporario(pfx_bytes: bytes, senha: str):
    """Converte o .pfx em PEM (cert+key) em arquivos temporários 0600.

    Yields ``(cert_path, key_path)``. Apaga os arquivos ao sair (em qualquer caso).
    O .pfx descriptografado só existe nesses temporários durante a chamada TLS.
    """
    key, cert, chain = pkcs12.load_key_and_certificates(pfx_bytes, senha.encode())
    cert_pem = cert.public_bytes(Encoding.PEM)
    for extra in chain or []:
        cert_pem += extra.public_bytes(Encoding.PEM)
    key_pem = key.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption())

    paths: list[str] = []
    try:
        for conteudo in (cert_pem, key_pem):
            fd, caminho = tempfile.mkstemp(suffix=".pem")
            os.chmod(caminho, 0o600)
            with os.fdopen(fd, "wb") as fh:
                fh.write(conteudo)
            paths.append(caminho)
        yield paths[0], paths[1]
    finally:
        for caminho in paths:
            with contextlib.suppress(OSError):
                os.unlink(caminho)


async def _post_soap(url: str, envelope: str, pfx_bytes: bytes, senha: str) -> str:
    """POST SOAP com mTLS (client cert = A1). Devolve o corpo da resposta."""
    with _pem_temporario(pfx_bytes, senha) as (cert_path, key_path):
        ctx = ssl.create_default_context()
        ctx.load_cert_chain(certfile=cert_path, keyfile=key_path)
        async with httpx.AsyncClient(verify=ctx, timeout=60.0) as client:
            r = await client.post(
                url,
                content=envelope.encode("utf-8"),
                headers={"Content-Type": "application/soap+xml; charset=utf-8"},
            )
            r.raise_for_status()
            return r.text


async def enviar_lote(ambiente: str, lote_xml: str, pfx_bytes: bytes, senha: str) -> dict:
    """Envia o lote ao eSocial. Devolve {success, protocolo, error}."""
    try:
        resp = await _post_soap(
            urls(ambiente)["envio"], montar_envelope_envio(lote_xml), pfx_bytes, senha
        )
        return {"success": True, "protocolo": extrair_protocolo(resp), "raw": resp}
    except Exception as exc:  # rede/SOAP fault/TLS — nunca derruba o caller.
        return {"success": False, "error": str(exc)}


async def consultar_lote(ambiente: str, protocolo: str, pfx_bytes: bytes, senha: str) -> dict:
    """Consulta o processamento de um lote. Devolve {success, status, eventos, error}."""
    try:
        resp = await _post_soap(
            urls(ambiente)["consulta"],
            montar_envelope_consulta(protocolo),
            pfx_bytes,
            senha,
        )
        return {
            "success": True,
            "status": extrair_status(resp),
            "eventos": extrair_eventos(resp),
            "raw": resp,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
