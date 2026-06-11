import uuid

from fastapi import Depends

from app.api.deps import CurrentUser, get_current_user
from app.main import app


@app.get("/whoami")
async def whoami(user: CurrentUser = Depends(get_current_user)):
    return {"id": str(user.id), "empresa_id": str(user.empresa_id), "role": user.role.value}


async def _seed_and_login(client, db_session, role="cliente_torq"):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": "c@c.com", "password": "segredo123", "nome": "Cau",
        "role": role, "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": "c@c.com", "password": "segredo123"})
    return empresa


async def test_whoami_with_cookie(client, db_session):
    empresa = await _seed_and_login(client, db_session)
    resp = await client.get("/whoami")
    assert resp.status_code == 200
    assert resp.json()["empresa_id"] == str(empresa.id)


async def test_whoami_without_cookie_401(client):
    resp = await client.get("/whoami")
    assert resp.status_code == 401
