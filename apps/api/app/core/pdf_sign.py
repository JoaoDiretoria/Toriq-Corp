"""Assinatura digital de PDF com certificado A1 ICP-Brasil (PAdES).

Porte fiel do serviço legado (Node ``@signpdf`` + ``node-forge`` + ``pdf-lib``)
para Python:

1. Lê o ``.pfx`` (PKCS#12) — chave privada + certificado.
2. Anexa uma **página de selo visual** ao PDF (dados do documento + do
   certificado + aviso legal), como o legado fazia com ``pdf-lib``.
3. Aplica a **assinatura criptográfica PAdES/CMS** sobre o PDF resultante,
   usando ``pyhanko`` (equivalente Python do ``@signpdf``).

Diferenças em relação ao legado (melhorias):
- O ``.pfx`` descriptografado NUNCA toca o disco: o signer do pyhanko é montado
  em memória via ``asn1crypto`` (o legado recriava um .p12 temporário).
- A página de selo estampa o **hash SHA-256 real** do documento (o legado
  estampava um placeholder aleatório).

Levanta ``ValueError`` (mensagem amigável) em certificado expirado/ inválido —
o endpoint traduz para ``success=false`` sem derrubar com 500.
"""
from __future__ import annotations

import datetime
import hashlib
import io

import asn1crypto.keys
import asn1crypto.x509
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    pkcs12,
)
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers
from pyhanko.sign.signers import PdfSignatureMetadata, PdfSigner
from pyhanko_certvalidator.registry import SimpleCertificateStore
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.core.esocial_cert import parse_pfx


def _carregar_signer(pfx_bytes: bytes, senha: str):
    """Monta um ``SimpleSigner`` do pyhanko a partir do .pfx, em memória.

    Devolve ``(signer, cert_info_dict)``. Levanta ValueError em senha/arquivo
    inválido (via ``cryptography``).
    """
    senha_bytes = senha.encode() if senha is not None else None
    try:
        key, cert, add_certs = pkcs12.load_key_and_certificates(pfx_bytes, senha_bytes)
    except (ValueError, TypeError) as exc:
        raise ValueError(
            "Falha ao ler certificado: senha incorreta ou arquivo PFX inválido."
        ) from exc
    if cert is None or key is None:
        raise ValueError("Certificado ou chave privada não encontrados no PFX.")

    signing_cert = asn1crypto.x509.Certificate.load(cert.public_bytes(Encoding.DER))
    signing_key = asn1crypto.keys.PrivateKeyInfo.load(
        key.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption())
    )
    registry = SimpleCertificateStore()
    # Registra a cadeia adicional (intermediárias da AC) se houver.
    for extra in add_certs or []:
        registry.register(
            asn1crypto.x509.Certificate.load(extra.public_bytes(Encoding.DER))
        )

    signer = signers.SimpleSigner(
        signing_cert=signing_cert,
        signing_key=signing_key,
        cert_registry=registry,
    )
    return signer, parse_pfx(pfx_bytes, senha)


def _fmt_data(d) -> str:
    if isinstance(d, (datetime.date, datetime.datetime)):
        return d.strftime("%d/%m/%Y")
    return str(d or "")


def _pagina_selo(dados: dict, cert_info: dict, doc_hash: str) -> bytes:
    """Gera (reportlab) uma página A4 de selo de assinatura — espelha o legado."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    largura, altura = A4
    margem = 20 * mm
    y = altura - margem

    c.setFillColorRGB(0.1, 0.3, 0.6)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margem, y, "PÁGINA DE ASSINATURA DIGITAL")
    y -= 18

    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.setFont("Helvetica", 9)
    c.drawString(
        margem, y,
        "Documento assinado digitalmente conforme MP 2.200-2/2001 e Portaria 211/2019",
    )
    y -= 22
    c.setStrokeColorRGB(0.2, 0.4, 0.7)
    c.line(margem, y, largura - margem, y)
    y -= 26

    def secao(titulo: str) -> None:
        nonlocal y
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margem, y, titulo)
        y -= 18

    def linha(label: str, valor: str) -> None:
        nonlocal y
        c.setFillColorRGB(0.3, 0.3, 0.3)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margem, y, label)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica", 10)
        c.drawString(margem + 90, y, (valor or "")[:80])
        y -= 15

    secao("INFORMAÇÕES DO DOCUMENTO")
    linha("Tipo:", dados.get("documento_tipo", ""))
    linha("Empresa:", dados.get("nome_empresa", ""))
    if dados.get("cnpj"):
        linha("CNPJ:", dados["cnpj"])
    linha("Local:", dados.get("local", "Brasil"))
    if dados.get("documento_id"):
        linha("ID Documento:", dados["documento_id"])
    y -= 12

    secao("ASSINATURA DIGITAL ICP-Brasil")
    linha("Assinado por:", cert_info.get("cn", ""))
    linha("Organização:", cert_info.get("o") or cert_info.get("ou") or "")
    linha("Emissor:", cert_info.get("emissor", ""))
    linha("Serial:", str(cert_info.get("serial_number", ""))[:32])
    linha("Data:", datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
    if dados.get("razao"):
        linha("Razão:", dados["razao"])
    linha("Válido até:", _fmt_data(cert_info.get("valido_ate")))
    y -= 12

    secao("INFORMAÇÕES TÉCNICAS")
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margem, y, "Hash SHA-256 do documento:")
    y -= 12
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.setFont("Helvetica", 7)
    # quebra o hash em duas linhas para caber
    c.drawString(margem, y, doc_hash[:64])
    y -= 16
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(margem, y, "Padrão: PAdES (PDF Advanced Electronic Signature) — ICP-Brasil")
    y -= 30

    # Aviso legal.
    c.setFillColorRGB(0.95, 0.97, 1)
    c.setStrokeColorRGB(0.7, 0.8, 0.9)
    c.rect(margem, y - 44, largura - 2 * margem, 56, fill=1, stroke=1)
    c.setFillColorRGB(0.2, 0.3, 0.5)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margem + 8, y, "AVISO LEGAL")
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.setFont("Helvetica", 8)
    c.drawString(
        margem + 8, y - 14,
        "Este documento foi assinado digitalmente com certificado ICP-Brasil, conforme MP 2.200-2/2001.",
    )
    c.drawString(
        margem + 8, y - 26,
        "A assinatura digital garante autenticidade, integridade e validade jurídica ao documento.",
    )

    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.setFont("Helvetica", 8)
    c.drawString(
        margem, 15 * mm,
        f"Documento gerado em {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
    )
    c.showPage()
    c.save()
    return buf.getvalue()


def _anexar_pagina(pdf_bytes: bytes, pagina_bytes: bytes) -> bytes:
    """Anexa a página de selo ao final do PDF original (pypdf)."""
    writer = PdfWriter()
    for pagina in PdfReader(io.BytesIO(pdf_bytes)).pages:
        writer.add_page(pagina)
    for pagina in PdfReader(io.BytesIO(pagina_bytes)).pages:
        writer.add_page(pagina)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _assinar_cms(pdf_bytes: bytes, signer, razao: str) -> bytes:
    """Aplica a assinatura PAdES/CMS sobre o PDF (pyhanko)."""
    writer = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes))
    meta = PdfSignatureMetadata(
        field_name="AssinaturaToriq",
        reason=razao or "Assinatura digital",
        location="Brasil",
    )
    out = io.BytesIO()
    PdfSigner(meta, signer=signer).sign_pdf(writer, output=out)
    return out.getvalue()


def assinar_pdf(pdf_bytes: bytes, pfx_bytes: bytes, senha: str, dados: dict) -> tuple[bytes, dict]:
    """Assina ``pdf_bytes`` com o certificado A1 e devolve ``(pdf_assinado, cert_info)``.

    Fluxo (fiel ao legado): valida validade → anexa página de selo → assina CMS.
    Levanta ValueError em certificado expirado/ inválido.
    """
    signer, cert_info = _carregar_signer(pfx_bytes, senha)
    if cert_info.get("expirado"):
        raise ValueError("Certificado expirado — não é possível assinar.")

    doc_hash = hashlib.sha256(pdf_bytes).hexdigest()
    com_selo = _anexar_pagina(pdf_bytes, _pagina_selo(dados, cert_info, doc_hash))
    assinado = _assinar_cms(com_selo, signer, dados.get("razao", ""))
    return assinado, cert_info
