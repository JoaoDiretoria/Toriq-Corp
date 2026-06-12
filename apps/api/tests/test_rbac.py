import uuid

from fastapi import Depends

from app.api.deps import require_role
from app.main import app
from app.models.user import UserRole


@app.get("/admin-only", dependencies=[Depends(require_role(UserRole.admin_vertical))])
async def admin_only():
    return {"ok": True}


async def _register_login(client, db_session, role):
    from app.models.generated import Empresas as Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": f"{role}@x.com", "password": "segredo123", "nome": "U",
        "role": role, "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": f"{role}@x.com", "password": "segredo123"})


async def test_admin_allowed(client, db_session):
    await _register_login(client, db_session, "admin_vertical")
    resp = await client.get("/admin-only")
    assert resp.status_code == 200


async def test_non_admin_forbidden(client, db_session):
    await _register_login(client, db_session, "instrutor")
    resp = await client.get("/admin-only")
    assert resp.status_code == 403
