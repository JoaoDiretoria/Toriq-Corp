"""Integração de envio de email (módulo Toriq Vendas — Fase 2, disparo em massa).

Este módulo encapsula tudo que toca o protocolo de email em si, mantendo o resto
do sistema (serviços, router) agnóstico aos detalhes de SMTP:

- ``EmailError``: erro de domínio levantado em qualquer falha de envio.
- ``render_template``: substitui placeholders ``{{chave}}`` (tolerante a espaços)
  por valores de um dict de variáveis. Usado para assunto e corpo dos templates.
- ``normalizar_supressao``: normaliza um valor (email/telefone) para comparação
  consistente na lista de supressão (opt-out LGPD).
- ``enviar_email``: monta e envia uma mensagem via SMTP. Usa ``smtplib`` dentro
  de ``asyncio.to_thread`` para não bloquear o event loop (sem aiosmtplib, sem
  novas dependências). Retorna o Message-ID.
"""
from __future__ import annotations

import asyncio
import re
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

# Timeout (segundos) das operações SMTP — evita travar indefinidamente.
_SMTP_TIMEOUT = 30

# Regex tolerante para placeholders: captura {{chave}}, {{ chave }}, etc.
# A chave é uma sequência de caracteres "de palavra" (letras, dígitos, _).
_PLACEHOLDER_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")


class EmailError(Exception):
    """Erro ao enviar um email (falha de SMTP, autenticação, rede, etc.)."""


def render_template(texto: str | None, variaveis: dict) -> str:
    """Substitui placeholders ``{{chave}}`` em ``texto`` pelos valores de ``variaveis``.

    - Tolerante a espaços internos: ``{{nome}}`` e ``{{ nome }}`` são equivalentes.
    - Chave ausente em ``variaveis`` (ou valor ``None``) -> substituída por "".
    - ``texto`` ``None`` -> retorna "".

    Usado tanto para o assunto quanto para o corpo dos templates.
    """
    if texto is None:
        return ""
    vars_ = variaveis or {}

    def _sub(match: re.Match[str]) -> str:
        chave = match.group(1)
        valor = vars_.get(chave)
        return "" if valor is None else str(valor)

    return _PLACEHOLDER_RE.sub(_sub, texto)


def normalizar_supressao(tipo: str, valor: str) -> str:
    """Normaliza um valor para a lista de supressão, conforme o ``tipo``.

    - ``"email"``  -> ``valor.strip().lower()``.
    - ``"telefone"`` -> somente dígitos (``re.sub(r"\\D", "", valor)``).
    - qualquer outro -> ``valor.strip()``.
    """
    if valor is None:
        return ""
    if tipo == "email":
        return valor.strip().lower()
    if tipo == "telefone":
        return re.sub(r"\D", "", valor)
    return valor.strip()


async def enviar_email(
    *,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str | None,
    smtp_password: str | None,
    use_tls: bool,
    remetente: str,
    remetente_nome: str | None,
    to: str,
    assunto: str | None,
    html: str,
    text: str | None = None,
) -> str:
    """Envia um email via SMTP e retorna o Message-ID gerado/usado.

    Monta uma ``EmailMessage`` com From (nome opcional via ``formataddr``), To,
    Subject e Message-ID; define o corpo texto (``set_content``) e adiciona o
    HTML como alternativa (``add_alternative``). O envio acontece via ``smtplib``
    dentro de ``asyncio.to_thread`` para não bloquear o event loop.

    Em qualquer falha levanta :class:`EmailError`.
    """
    msg = EmailMessage()
    msg["From"] = formataddr((remetente_nome or "", remetente))
    msg["To"] = to
    msg["Subject"] = assunto or ""
    message_id = make_msgid()
    msg["Message-ID"] = message_id

    # Parte texto (fallback) + alternativa HTML.
    msg.set_content(text or "Esta mensagem requer um cliente compatível com HTML.")
    msg.add_alternative(html, subtype="html")

    def _send() -> None:
        # Função síncrona executada numa thread separada (não bloqueia o loop).
        with smtplib.SMTP(smtp_host, smtp_port, timeout=_SMTP_TIMEOUT) as server:
            if use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)

    try:
        await asyncio.to_thread(_send)
    except Exception as e:  # noqa: BLE001 — qualquer erro vira erro de domínio.
        raise EmailError(str(e)) from e

    return message_id
