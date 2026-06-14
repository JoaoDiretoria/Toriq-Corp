"""Emails transacionais do sistema (renderiza templates + envia via Resend).

- Carrega os templates de ``app/templates/email/*.html`` (empacotados no backend,
  então sempre presentes na imagem de produção).
- Renderiza placeholders estilo Supabase: ``{{ .Chave }}`` (e também ``{{ Chave }}``).
- Envia pelo Resend e registra cada envio em ``email_envios`` (o webhook do
  Resend atualiza o status depois).

Tudo é BEST-EFFORT: se o Resend não estiver configurado ou falhar, a função
retorna sem levantar — a ação que disparou o email (criar usuário, etc.) nunca
quebra por causa do email.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.resend_email import (
    ResendError,
    ResendNotConfigured,
    enviar_resend,
)
from app.models.email_envios import EmailEnvios

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"
# {{ .Chave }} ou {{ Chave }} (ponto opcional, espaços tolerados).
_PLACEHOLDER_RE = re.compile(r"\{\{\s*\.?(\w+)\s*\}\}")

_cache: dict[str, str] = {}


def _carregar_template(nome: str) -> str:
    if nome not in _cache:
        caminho = _TEMPLATES_DIR / f"{nome}.html"
        _cache[nome] = caminho.read_text(encoding="utf-8")
    return _cache[nome]


def renderizar(nome: str, variaveis: dict) -> str:
    """Renderiza o template ``nome`` substituindo ``{{ .Chave }}``."""
    html = _carregar_template(nome)
    vars_ = variaveis or {}

    def _sub(m: re.Match[str]) -> str:
        valor = vars_.get(m.group(1))
        return "" if valor is None else str(valor)

    return _PLACEHOLDER_RE.sub(_sub, html)


async def enviar(
    db: AsyncSession,
    *,
    to: str,
    template: str,
    assunto: str,
    variaveis: dict,
    empresa_id: Optional[uuid.UUID] = None,
) -> Optional[str]:
    """Renderiza, envia pelo Resend e registra em email_envios. Best-effort.

    Retorna o resend_id em caso de envio; None se não configurado/falhou.
    """
    html = renderizar(template, variaveis)
    try:
        resend_id = await enviar_resend(to=to, subject=assunto, html=html)
    except ResendNotConfigured:
        return None  # envio desligado — não registra tentativa
    except ResendError as exc:
        db.add(
            EmailEnvios(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                to_email=to,
                assunto=assunto,
                template=template,
                resend_id=None,
                status="erro",
                erro=str(exc)[:1000],
            )
        )
        await db.commit()
        return None

    db.add(
        EmailEnvios(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            to_email=to,
            assunto=assunto,
            template=template,
            resend_id=resend_id,
            status="enviado",
        )
    )
    await db.commit()
    return resend_id


# ── Helpers por tipo de email ─────────────────────────────────────────────────

async def enviar_convite(
    db: AsyncSession, *, to: str, link: str, empresa_id: Optional[uuid.UUID] = None
) -> Optional[str]:
    """Convite de novo usuário (botão 'Definir Minha Senha')."""
    return await enviar(
        db,
        to=to,
        template="invite-user",
        assunto="Você foi convidado para o Toriq",
        variaveis={"Email": to, "ConfirmationURL": link},
        empresa_id=empresa_id,
    )


async def enviar_reset_senha(
    db: AsyncSession, *, to: str, link: str, empresa_id: Optional[uuid.UUID] = None
) -> Optional[str]:
    """Redefinição de senha (botão 'Redefinir Minha Senha')."""
    return await enviar(
        db,
        to=to,
        template="reset-password",
        assunto="Redefinição de senha — Toriq",
        variaveis={"Email": to, "ConfirmationURL": link},
        empresa_id=empresa_id,
    )
