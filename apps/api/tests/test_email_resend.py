"""Testes do envio transacional via Resend + recuperação de senha por link.

Sem rede: o Resend não está configurado no ambiente de teste, então o envio
degrada (no-op) e os fluxos seguem. Cobre:
- render dos templates (placeholders estilo Supabase ``{{ .Chave }}``);
- token de senha: round-trip + inválido/expirado;
- assinatura Svix do webhook (válida/ inválida);
- /auth/esqueci-senha: sempre 204 (sem enumeração);
- /auth/definir-senha: token válido troca a senha (login passa com a nova);
- /webhooks/resend: 503 sem segredo configurado.
"""
import base64
import hashlib
import hmac
import json
import time
import uuid

import pytest
from sqlalchemy import select

from app.core.reset_token import gerar_token_senha, ler_token_senha
from app.integrations.resend_email import verificar_assinatura_webhook
from app.models.user import User
from app.services import email_sistema
from tests.helpers import login_as


def test_render_template_substitui_placeholders():
    html = email_sistema.renderizar(
        "invite-user", {"Email": "joao@x.com", "ConfirmationURL": "https://app/definir?token=abc"}
    )
    assert "joao@x.com" in html
    assert "https://app/definir?token=abc" in html
    # Os placeholders Supabase foram resolvidos (não sobra {{ .Email }}).
    assert "{{ .Email }}" not in html
    assert "{{ .ConfirmationURL }}" not in html


def test_token_senha_roundtrip():
    uid = uuid.uuid4()
    token = gerar_token_senha(uid)
    assert ler_token_senha(token) == uid


def test_token_senha_invalido():
    with pytest.raises(ValueError):
        ler_token_senha("nao-e-um-token")


def test_token_senha_expirado():
    uid = uuid.uuid4()
    token = gerar_token_senha(uid)
    with pytest.raises(ValueError):
        ler_token_senha(token, ttl_segundos=-1)  # já expirado


def _assinar_svix(secret_key: bytes, svix_id: str, ts: str, body: bytes) -> str:
    assinado = f"{svix_id}.{ts}.{body.decode()}"
    sig = base64.b64encode(
        hmac.new(secret_key, assinado.encode(), hashlib.sha256).digest()
    ).decode()
    return f"v1,{sig}"


def test_assinatura_webhook_valida_e_invalida():
    key = b"chave-secreta-do-webhook-1234567"
    secret = "whsec_" + base64.b64encode(key).decode()
    body = json.dumps({"type": "email.delivered"}).encode()
    svix_id, ts = "msg_1", str(int(time.time()))
    header = _assinar_svix(key, svix_id, ts, body)

    assert verificar_assinatura_webhook(
        secret=secret, svix_id=svix_id, svix_timestamp=ts,
        svix_signature=header, raw_body=body,
    ) is True
    # Assinatura adulterada → False.
    assert verificar_assinatura_webhook(
        secret=secret, svix_id=svix_id, svix_timestamp=ts,
        svix_signature="v1,assinatura-errada", raw_body=body,
    ) is False


@pytest.mark.anyio
async def test_esqueci_senha_sempre_204(client, db_session):
    # Email inexistente → 204 (sem revelar).
    r = await client.post("/auth/esqueci-senha", json={"email": "ninguem@nao-existe.com"})
    assert r.status_code == 204, r.text
    # Email existente → 204 também (Resend não configurado → no-op, sem crash).
    await login_as(client, db_session, email="reset_alvo@torq.com")
    r = await client.post("/auth/esqueci-senha", json={"email": "reset_alvo@torq.com"})
    assert r.status_code == 204, r.text


@pytest.mark.anyio
async def test_definir_senha_troca_e_loga(client, db_session):
    email = "definir_alvo@torq.com"
    await login_as(client, db_session, email=email)
    await client.post("/auth/logout")
    uid = await db_session.scalar(select(User.id).where(User.email == email))

    token = gerar_token_senha(uid)
    nova = "NovaSenh@123"
    r = await client.post("/auth/definir-senha", json={"token": token, "senha": nova})
    assert r.status_code == 200, r.text

    # A nova senha funciona no login.
    r = await client.post("/auth/login", json={"email": email, "password": nova})
    assert r.status_code == 200, r.text


@pytest.mark.anyio
async def test_definir_senha_token_invalido_400(client, db_session):
    r = await client.post("/auth/definir-senha", json={"token": "lixo", "senha": "OutraSenh@1"})
    assert r.status_code == 400, r.text


@pytest.mark.anyio
async def test_webhook_resend_sem_segredo_503(client, db_session):
    r = await client.post("/webhooks/resend", json={"type": "email.delivered"})
    assert r.status_code == 503, r.text
