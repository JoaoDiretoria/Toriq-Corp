"""Token assinado para definição/recuperação de senha (sem tabela).

Reusa a criptografia Fernet de ``esocial_crypto`` (chave
``INTEGRATION_ENCRYPTION_KEY``). O token carrega o ``user_id`` + timestamp e é
à prova de adulteração; expira por TTL (24h por padrão). Mesma ideia do
``state`` do OAuth do Google.
"""
from __future__ import annotations

import time
import uuid

from app.core.esocial_crypto import decrypt_secret, encrypt_secret

_TTL_PADRAO = 86400  # 24h
_PREFIXO = "reset"


def gerar_token_senha(user_id: uuid.UUID) -> str:
    """Gera um token opaco para o usuário definir/redefinir a senha."""
    return encrypt_secret(f"{_PREFIXO}|{user_id}|{int(time.time())}")


def ler_token_senha(token: str, ttl_segundos: int = _TTL_PADRAO) -> uuid.UUID:
    """Valida o token e devolve o ``user_id``. ValueError se inválido/expirado."""
    try:
        prefixo, uid, ts = decrypt_secret(token).split("|", 2)
        user_id = uuid.UUID(uid)
        criado = int(ts)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("token inválido") from exc
    if prefixo != _PREFIXO:
        raise ValueError("token inválido")
    if time.time() - criado > ttl_segundos:
        raise ValueError("token expirado")
    return user_id
