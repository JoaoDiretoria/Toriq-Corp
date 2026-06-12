from tests.helpers import login_as


async def test_refresh_emite_novo_access(client, db_session):
    await login_as(client, db_session, email="d@d.com")
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


async def test_logout_limpa_cookies(client, db_session):
    await login_as(client, db_session, email="d@d.com")
    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
    # cookie de access esvaziado
    assert client.cookies.get("access_token", "") == ""
