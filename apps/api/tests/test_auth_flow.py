import uuid


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
