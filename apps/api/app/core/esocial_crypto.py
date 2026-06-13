"""Criptografia de segredos do eSocial (Fernet sobre cryptography).

Os campos `*_enc` da tabela `empresa_integracoes_esocial` guardam segredos
(client_secret do gov.br, o .pfx em base64 e a senha do .pfx) criptografados.

A chave Fernet é derivada de ``settings.integration_encryption_key``:

    base64.urlsafe_b64encode(sha256(key.encode()).digest())

Isso transforma qualquer string (a chave configurada via env) numa chave Fernet
válida de 32 bytes url-safe base64. A derivação só acontece quando algo for de
fato criptografar/descriptografar — se a chave não estiver configurada, o erro
é levantado no uso (não no import), para não derrubar a aplicação inteira.

NOTA: Fernet NÃO é wire-compatible com o formato legado `enc:v1:` (AES-GCM).
Para preservar comportamento de dados em plaintext legados, ``decrypt_secret``
faz pass-through de valores que não parecem tokens Fernet.
"""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_fernet() -> Fernet:
    key = settings.integration_encryption_key
    if not key:
        raise RuntimeError(
            "INTEGRATION_ENCRYPTION_KEY não configurada — defina a variável de "
            "ambiente para criptografar/descriptografar segredos do eSocial."
        )
    derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived)


def encrypt_secret(plain: str) -> str:
    """Criptografa um segredo em claro e devolve o token Fernet (str)."""
    f = _get_fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_secret(enc: str) -> str:
    """Descriptografa um token Fernet.

    Pass-through: se o valor não for um token Fernet válido (ex.: dado legado em
    plaintext), devolve-o inalterado em vez de explodir.
    """
    if enc is None:
        return enc  # type: ignore[return-value]
    f = _get_fernet()
    try:
        return f.decrypt(enc.encode()).decode()
    except InvalidToken:
        # Valor não criptografado (legado em claro) — devolve como veio.
        return enc


def mask_secret(v: str | None) -> str | None:
    """Mascara um segredo expondo só os 4 últimos caracteres.

    - None → None
    - len <= 4 → '****'
    - senão → '*' * max(len-4, 4) + 4 últimos chars
    """
    if v is None:
        return None
    if len(v) <= 4:
        return "****"
    return "*" * max(len(v) - 4, 4) + v[-4:]
