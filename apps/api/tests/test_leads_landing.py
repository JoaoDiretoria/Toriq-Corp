"""Testes auto-contidos para o módulo Leads da Landing Page.

Padrão self-contained (igual ao test_blog.py / test_pesquisas.py):
  - Cria a tabela via DDL SQLite-friendly (sem server_defaults PG-específicos)
  - leads_landing é GLOBAL — sem empresa_id
  - POST é público (sem auth); leitura/gestão exige admin_vertical

Cobertura:
  - Criação pública (sem cookie) → 201
  - Listagem admin-gated → 401 sem auth, 403 para não-admin, 200 para admin
  - Payload público não aceita campos extras de admin
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.models.generated import Empresas

_DDL = """
CREATE TABLE IF NOT EXISTS leads_landing (
    id CHAR(32) NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    empresa TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    segmento TEXT,
    mensagem TEXT,
    cnpj TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
)
"""


@pytest.fixture(autouse=True)
async def _leads_tables(db_session):
    conn = await db_session.connection()
    await conn.execute(text(_DDL))


@pytest.fixture
async def lclient(db_session, client):
    from app.main import app
    from app.api.leads_landing import router as leads_router

    already = any(getattr(r, "path", "").startswith("/leads-landing") for r in app.routes)
    if not already:
        app.include_router(leads_router)
    return client


async def _login_admin(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ToriqHQ", tipo="vertical_on")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "admin-leads@toriq.com",
            "password": "segredo123",
            "nome": "Admin",
            "role": "admin_vertical",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "admin-leads@toriq.com", "password": "segredo123"}
    )
    assert r.status_code == 200, r.text


async def _login_regular(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ClienteX", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "user-leads@x.com",
            "password": "segredo123",
            "nome": "User",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "user-leads@x.com", "password": "segredo123"}
    )
    assert r.status_code == 200, r.text


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_criar_lead_publico_sem_cookie(lclient):
    """Qualquer visitante pode enviar o formulário de contato sem autenticação."""
    from app.main import app

    # Garante que o router está registrado mas usa um client SEM cookie.
    _ = lclient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/leads-landing",
            json={
                "nome": "Maria Visitante",
                "empresa": "Acme Ltda",
                "email": "maria@acme.com",
                "telefone": "11999990000",
                "segmento": "Indústria",
                "mensagem": "Quero saber mais",
            },
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["email"] == "maria@acme.com"
        assert data["empresa"] == "Acme Ltda"
        assert "id" in data


async def test_payload_publico_ignora_campos_extras(lclient):
    """Campos não declarados (ex.: empresa_id) são ignorados pelo schema restrito."""
    from app.main import app

    _ = lclient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/leads-landing",
            json={
                "nome": "Hacker",
                "empresa": "Evil",
                "email": "h@evil.com",
                "telefone": "11900000000",
                "empresa_id": str(uuid.uuid4()),  # campo extra — deve ser ignorado
                "role": "admin_vertical",
            },
        )
        assert r.status_code == 201, r.text
        assert "empresa_id" not in r.json()
        assert "role" not in r.json()


async def test_listar_sem_auth_retorna_401(lclient):
    r = await lclient.get("/leads-landing")
    assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}"


async def test_listar_regular_retorna_403(lclient, db_session):
    await _login_regular(lclient, db_session)
    r = await lclient.get("/leads-landing")
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}"


async def test_admin_lista_leads(lclient, db_session):
    """Lead criado publicamente aparece na listagem do admin."""
    from app.main import app

    # Criação pública
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post(
            "/leads-landing",
            json={
                "nome": "Lead Visível",
                "empresa": "VisCorp",
                "email": "lead@viscorp.com",
                "telefone": "11911112222",
            },
        )

    await _login_admin(lclient, db_session)
    r = await lclient.get("/leads-landing")
    assert r.status_code == 200, r.text
    emails = [x["email"] for x in r.json()]
    assert "lead@viscorp.com" in emails
