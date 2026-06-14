"""Testes da integração Google Agenda/Meet.

Cobre o que dá para validar sem falar com o Google de verdade:
- state OAuth: round-trip (assinar→verificar) e rejeição de state inválido;
- build_auth_url monta a URL de consentimento com as credenciais;
- sincronização é no-op quando a empresa não tem token (degradação graciosa);
- endpoint /iniciar responde 503 quando o app Google não está configurado.

Nenhum teste abre socket para o Google.
"""
import types
import uuid

import pytest

from app.integrations import google_calendar as gcal
from app.services import google_calendar as gsvc
from tests.helpers import login_as


def test_state_roundtrip():
    empresa_id = uuid.uuid4()
    state = gsvc.assinar_state(empresa_id)
    assert gsvc.verificar_state(state) == empresa_id


def test_state_invalido_levanta():
    with pytest.raises(ValueError):
        gsvc.verificar_state("isto-nao-e-um-state-valido")


def test_build_auth_url_com_credenciais(monkeypatch):
    monkeypatch.setattr(gcal.settings, "google_client_id", "cid.apps.googleusercontent.com")
    monkeypatch.setattr(gcal.settings, "google_client_secret", "secret")
    monkeypatch.setattr(
        gcal.settings, "google_redirect_uri", "https://api.x/sistema/google-oauth/callback"
    )
    url = gcal.build_auth_url("STATE123")
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "state=STATE123" in url
    assert "access_type=offline" in url
    assert "calendar.events" in url


def test_build_auth_url_sem_credenciais(monkeypatch):
    monkeypatch.setattr(gcal.settings, "google_client_id", None)
    with pytest.raises(gcal.GoogleNotConfigured):
        gcal.build_auth_url("x")


@pytest.mark.anyio
async def test_sincronizar_criar_sem_token_e_noop(db_session):
    """Empresa sem conexão Google → sincronizar_criar retorna False e não mexe
    no evento (não tenta falar com o Google)."""
    empresa_id = uuid.uuid4()
    evento = types.SimpleNamespace(
        id=uuid.uuid4(),
        titulo="Reunião",
        data_inicio=None,
        data_fim=None,
        descricao=None,
        local=None,
        cliente_email=None,
        google_event_id=None,
        meet_link=None,
    )
    ok = await gsvc.sincronizar_criar(db_session, empresa_id=empresa_id, evento=evento)
    assert ok is False
    assert evento.google_event_id is None
    assert evento.meet_link is None


@pytest.mark.anyio
async def test_iniciar_oauth_sem_config_503(client, db_session, monkeypatch):
    """Sem credenciais do app Google, /iniciar responde 503 (não 500)."""
    monkeypatch.setattr(gcal.settings, "google_client_id", None)
    await login_as(client, db_session, email="goauth_iniciar@torq.com")
    r = await client.get("/sistema/google-oauth/iniciar")
    assert r.status_code == 503, r.text
