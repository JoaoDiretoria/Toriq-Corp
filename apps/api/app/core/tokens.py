from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    pass


def create_token(
    *,
    subject: str,
    token_type: TokenType,
    empresa_id: str | None,
    role: str,
    imp_by: str | None = None,
) -> str:
    ttl = (
        settings.jwt_access_ttl_seconds
        if token_type == "access"
        else settings.jwt_refresh_ttl_seconds
    )
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "empresa_id": empresa_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    if imp_by is not None:
        payload["imp_by"] = imp_by
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc
