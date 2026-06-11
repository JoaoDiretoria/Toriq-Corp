import uuid

import pytest

from app.core.tokens import create_token, decode_token, TokenError


def test_roundtrip_access_token():
    uid = str(uuid.uuid4())
    token = create_token(subject=uid, token_type="access", empresa_id="e1", role="admin_vertical")
    payload = decode_token(token)
    assert payload["sub"] == uid
    assert payload["type"] == "access"
    assert payload["empresa_id"] == "e1"
    assert payload["role"] == "admin_vertical"


def test_tampered_token_raises():
    token = create_token(subject="x", token_type="access", empresa_id=None, role="instrutor")
    with pytest.raises(TokenError):
        decode_token(token + "tamper")
