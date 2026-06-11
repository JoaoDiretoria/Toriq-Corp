import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": "d@d.com", "password": "segredo123", "nome": "D",
        "role": "cliente_torq", "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": "d@d.com", "password": "segredo123"})


async def test_refresh_emite_novo_access(client, db_session):
    await _login(client, db_session)
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


async def test_logout_limpa_cookies(client, db_session):
    await _login(client, db_session)
    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
    # cookie de access esvaziado
    assert client.cookies.get("access_token", "") == ""
