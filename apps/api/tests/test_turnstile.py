"""Validação do captcha Turnstile no /auth/login."""
import app.api.auth as auth_mod
from app.core.turnstile import verify_turnstile
from tests.helpers import login_as


async def test_verify_desligado_sem_secret():
    # Sem TURNSTILE_SECRET_KEY (default), a validação é pulada → sempre True.
    assert await verify_turnstile(None) is True
    assert await verify_turnstile("qualquer") is True


async def test_login_valida_captcha_quando_ligado(client, db_session, monkeypatch):
    """Com o captcha ligado (verify mockado), login exige token válido."""
    await login_as(client, db_session, email="cap@e.com", password="segredo123")

    async def fake_verify(token, remoteip=None):
        return token == "good"

    monkeypatch.setattr(auth_mod, "verify_turnstile", fake_verify)

    base = {"email": "cap@e.com", "password": "segredo123"}
    # sem token → 403
    assert (await client.post("/auth/login", json=base)).status_code == 403
    # token errado → 403
    assert (await client.post("/auth/login", json={**base, "captcha_token": "x"})).status_code == 403
    # token certo → 200
    ok = await client.post("/auth/login", json={**base, "captcha_token": "good"})
    assert ok.status_code == 200, ok.text


async def test_login_sem_captcha_quando_desligado(client, db_session):
    """Default (secret não configurada): login funciona sem captcha_token."""
    await login_as(client, db_session, email="nocap@e.com", password="segredo123")
    r = await client.post("/auth/login", json={"email": "nocap@e.com", "password": "segredo123"})
    assert r.status_code == 200, r.text
