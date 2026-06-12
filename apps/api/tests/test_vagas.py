"""Testes auto-contidos para o módulo Vagas e Candidaturas.

Padrão self-contained (igual ao test_blog.py / test_pesquisas.py):
  - Tabelas vêm do schema introspectado (sem DDL no teste)
  - vagas e candidaturas são GLOBAIS — sem empresa_id
  - GET de vagas é público; escrita exige admin_vertical
  - POST de candidatura é público (valida que a vaga existe)
  - GET de candidaturas exige admin_vertical

Cobertura:
  - Listagem pública de vagas ativas (sem cookie)
  - Vaga inativa não aparece na listagem pública
  - Criação/edição de vaga exige admin (403 para não-admin, 401 sem auth)
  - Candidatura pública (sem cookie) → 201
  - Candidatura em vaga inexistente → 404
  - Listagem de candidaturas admin-gated (401/403)
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.models.generated import Empresas

# As tabelas vagas / candidaturas já existem no banco de teste (schema
# introspectado em app/models/generated.py). Sem DDL aqui.


@pytest.fixture
async def vclient(db_session, client):
    from app.main import app
    from app.api.vagas import router as vagas_router

    already = any(getattr(r, "path", "").startswith("/vagas") for r in app.routes)
    if not already:
        app.include_router(vagas_router)
    return client


async def _login_admin(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ToriqHQ", tipo="vertical_on")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "admin-vagas@toriq.com",
            "password": "segredo123",
            "nome": "Admin",
            "role": "admin_vertical",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "admin-vagas@toriq.com", "password": "segredo123"}
    )
    assert r.status_code == 200, r.text


async def _login_regular(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ClienteX", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "user-vagas@x.com",
            "password": "segredo123",
            "nome": "User",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "user-vagas@x.com", "password": "segredo123"}
    )
    assert r.status_code == 200, r.text


# ── Testes: Vagas ──────────────────────────────────────────────────────────────

async def test_listar_vagas_publico_sem_cookie(vclient, db_session):
    """Listagem de vagas ativas é pública; vaga inativa não aparece."""
    from app.main import app

    await _login_admin(vclient, db_session)
    # Vaga ativa
    va = await vclient.post("/vagas", json={"titulo": "Dev Backend", "ativa": True})
    assert va.status_code == 201, va.text
    vaga_ativa_id = va.json()["id"]
    # Vaga inativa
    vi = await vclient.post("/vagas", json={"titulo": "Vaga Fechada", "ativa": False})
    assert vi.status_code == 201, vi.text
    vaga_inativa_id = vi.json()["id"]

    # GET público sem cookie
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/vagas")
        assert r.status_code == 200, r.text
        ids = [v["id"] for v in r.json()]
        assert vaga_ativa_id in ids
        assert vaga_inativa_id not in ids, "vaga inativa não deve aparecer no feed público"


async def test_criar_vaga_requer_admin(vclient, db_session):
    await _login_regular(vclient, db_session)
    r = await vclient.post("/vagas", json={"titulo": "Hack"})
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}: {r.text}"


async def test_criar_vaga_requer_auth(vclient):
    r = await vclient.post("/vagas", json={"titulo": "Anon"})
    assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}"


async def test_admin_atualiza_vaga(vclient, db_session):
    await _login_admin(vclient, db_session)
    vid = (await vclient.post("/vagas", json={"titulo": "Dev", "ativa": True})).json()["id"]
    r = await vclient.put(f"/vagas/{vid}", json={"ativa": False, "local": "Remoto"})
    assert r.status_code == 200, r.text
    assert r.json()["ativa"] is False
    assert r.json()["local"] == "Remoto"


# ── Testes: Candidaturas ───────────────────────────────────────────────────────

async def test_candidatar_publico_sem_cookie(vclient, db_session):
    """Candidatura é pública; valida que a vaga existe."""
    from app.main import app

    await _login_admin(vclient, db_session)
    vid = (await vclient.post("/vagas", json={"titulo": "Vaga Aberta", "ativa": True})).json()["id"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            f"/vagas/{vid}/candidaturas",
            json={
                "nome_completo": "Ana Candidata",
                "email": "ana@cand.com",
                "telefone": "11988887777",
                "sobre_voce": "Profissional experiente",
            },
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["vaga_id"] == vid
        assert data["email"] == "ana@cand.com"
        assert data["nome_completo"] == "Ana Candidata"


async def test_candidatar_vaga_inexistente_404(vclient):
    """Candidatura para vaga inexistente deve retornar 404."""
    from app.main import app

    _ = vclient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            f"/vagas/{uuid.uuid4()}/candidaturas",
            json={"nome_completo": "Ninguém", "email": "x@x.com"},
        )
        assert r.status_code == 404, f"esperado 404, recebeu {r.status_code}: {r.text}"


async def test_listar_candidaturas_sem_auth_401(vclient, db_session):
    await _login_admin(vclient, db_session)
    vid = (await vclient.post("/vagas", json={"titulo": "V", "ativa": True})).json()["id"]

    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"/vagas/{vid}/candidaturas")
        assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}"


async def test_listar_candidaturas_regular_403(vclient, db_session):
    await _login_admin(vclient, db_session)
    vid = (await vclient.post("/vagas", json={"titulo": "V2", "ativa": True})).json()["id"]

    await _login_regular(vclient, db_session)
    r = await vclient.get(f"/vagas/{vid}/candidaturas")
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}"


async def test_admin_lista_candidaturas(vclient, db_session):
    """Candidatura pública aparece na listagem do admin."""
    from app.main import app

    await _login_admin(vclient, db_session)
    vid = (await vclient.post("/vagas", json={"titulo": "Vaga Lista", "ativa": True})).json()["id"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post(
            f"/vagas/{vid}/candidaturas",
            json={"nome_completo": "Bia", "email": "bia@cand.com"},
        )

    r = await vclient.get(f"/vagas/{vid}/candidaturas")
    assert r.status_code == 200, r.text
    emails = [c["email"] for c in r.json()]
    assert "bia@cand.com" in emails

    # Listagem global
    r2 = await vclient.get("/vagas/candidaturas/todas")
    assert r2.status_code == 200, r2.text
    assert any(c["email"] == "bia@cand.com" for c in r2.json())
