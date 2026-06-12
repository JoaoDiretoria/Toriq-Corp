import uuid

from tests.helpers import login_as


async def test_me_returns_user_profile_empresa(client, db_session):
    """GET /auth/me devolve usuário + perfil + empresa da sessão atual."""
    empresa_id = await login_as(
        client, db_session, role="cliente_torq", email="me@test.com", nome="Mel"
    )

    resp = await client.get("/auth/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == "me@test.com"
    assert body["profile"]["nome"] == "Mel"
    assert body["profile"]["role"] == "cliente_torq"
    assert body["empresa"]["id"] == str(empresa_id)
    # Não vaza campos sensíveis da empresa (certificado/senha A1).
    assert "certificado_a1_base64" not in body["empresa"]
    assert "certificado_a1_senha" not in body["empresa"]


async def test_me_unauthenticated_401(client):
    """Sem cookie de acesso, /auth/me responde 401."""
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


async def test_register_then_login_sets_cookies(client, db_session):
    from app.models.generated import Empresas as Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()

    reg = await client.post(
        "/auth/register",
        json={
            "email": "a@a.com",
            "password": "segredo123",
            "nome": "Ana",
            "role": "cliente_torq",
            "empresa_id": str(empresa.id),
        },
    )
    assert reg.status_code == 201
    assert reg.json()["email"] == "a@a.com"

    login = await client.post(
        "/auth/login", json={"email": "a@a.com", "password": "segredo123"}
    )
    assert login.status_code == 200
    assert "access_token" in login.cookies
    assert "refresh_token" in login.cookies


async def test_login_wrong_password_401(client, db_session):
    from app.models.generated import Empresas as Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "b@b.com", "password": "certa123", "nome": "Bia",
            "role": "instrutor", "empresa_id": str(empresa.id),
        },
    )
    resp = await client.post("/auth/login", json={"email": "b@b.com", "password": "errada"})
    assert resp.status_code == 401
