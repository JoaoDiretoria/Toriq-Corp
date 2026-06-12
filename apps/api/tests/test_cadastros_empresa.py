"""Testes auto-contidos para os cadastros escopados por empresa.

Cobre as três tabelas novas (empresa_contatos, categorias_clientes_empresa,
origens_contato), todas com tenant via `empresa_id`:
- criação e leitura,
- isolamento por tenant na listagem,
- acesso cross-tenant (um tenant não enxerga / não acessa dado de outro).

O router de cadastros_empresa não é registrado em main.py; estes testes o
incluem no app de teste (mesmo padrão de test_kanban_factory).
"""
import uuid

import pytest

from tests.helpers import login_as


def _ensure_router():
    """Registra o router de cadastros_empresa no app de teste (idempotente)."""
    from app.api.cadastros_empresa import router as cad_router
    from app.main import app

    already = any(r.path.startswith("/cadastros/empresa-contatos") for r in app.routes)
    if not already:
        app.include_router(cad_router)


@pytest.fixture
def cadclient(client):
    _ensure_router()
    return client


# ── empresa_contatos ──────────────────────────────────────────────────────────

async def test_empresa_contato_crud(cadclient, db_session):
    await login_as(cadclient, db_session, email="ec@ec.com")

    r = await cadclient.post(
        "/cadastros/empresa-contatos",
        json={"nome": "João Silva", "email": "joao@x.com", "principal": True},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nome"] == "João Silva"
    assert data["principal"] is True
    assert "empresa_id" in data

    lista = await cadclient.get("/cadastros/empresa-contatos")
    assert lista.status_code == 200
    assert any(c["nome"] == "João Silva" for c in lista.json())


async def test_empresa_contato_isolamento(cadclient, db_session):
    """Tenant B não enxerga contato criado pelo tenant A na listagem."""
    _ensure_router()

    emp_a = await login_as(cadclient, db_session, email="eca@a.com")
    r = await cadclient.post(
        "/cadastros/empresa-contatos", json={"nome": "Contato A"}
    )
    assert r.status_code == 201, r.text
    contato_a_id = r.json()["id"]

    # Tenant B (nova empresa) — não deve ver o contato de A
    await login_as(cadclient, db_session, email="ecb@b.com")
    lista_b = (await cadclient.get("/cadastros/empresa-contatos")).json()
    ids_b = [c["id"] for c in lista_b]
    assert contato_a_id not in ids_b

    # E não consegue obter o recurso de A diretamente → 404
    resp = await cadclient.get(f"/cadastros/empresa-contatos/{contato_a_id}")
    assert resp.status_code == 404

    # Sanidade: emp_a foi de fato uma empresa distinta
    assert emp_a is not None


# ── categorias_clientes_empresa ───────────────────────────────────────────────

async def test_categoria_cliente_empresa_crud(cadclient, db_session):
    await login_as(cadclient, db_session, email="cat@cat.com")

    r = await cadclient.post(
        "/cadastros/categorias-clientes-empresa",
        json={"nome": "VIP", "cor": "#ff0000"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["nome"] == "VIP"
    assert r.json()["cor"] == "#ff0000"

    lista = await cadclient.get("/cadastros/categorias-clientes-empresa")
    assert lista.status_code == 200
    assert any(c["nome"] == "VIP" for c in lista.json())


async def test_categoria_cliente_empresa_cross_tenant(cadclient, db_session):
    _ensure_router()

    await login_as(cadclient, db_session, email="cata@a.com")
    r = await cadclient.post(
        "/cadastros/categorias-clientes-empresa", json={"nome": "Cat-A"}
    )
    cat_a_id = r.json()["id"]

    await login_as(cadclient, db_session, email="catb@b.com")
    # B não vê na listagem
    lista_b = (await cadclient.get("/cadastros/categorias-clientes-empresa")).json()
    assert cat_a_id not in [c["id"] for c in lista_b]
    # B não atualiza recurso de A
    upd = await cadclient.put(
        f"/cadastros/categorias-clientes-empresa/{cat_a_id}",
        json={"nome": "hackeado"},
    )
    assert upd.status_code == 404
    # B não deleta recurso de A
    dele = await cadclient.delete(
        f"/cadastros/categorias-clientes-empresa/{cat_a_id}"
    )
    assert dele.status_code == 404


# ── origens_contato ───────────────────────────────────────────────────────────

async def test_origem_contato_crud(cadclient, db_session):
    await login_as(cadclient, db_session, email="org@org.com")

    r = await cadclient.post(
        "/cadastros/origens-contato",
        json={"nome": "Indicação", "descricao": "via cliente"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["nome"] == "Indicação"

    lista = await cadclient.get("/cadastros/origens-contato")
    assert lista.status_code == 200
    assert any(o["nome"] == "Indicação" for o in lista.json())


async def test_origem_contato_isolamento(cadclient, db_session):
    _ensure_router()

    await login_as(cadclient, db_session, email="orga@a.com")
    r = await cadclient.post(
        "/cadastros/origens-contato", json={"nome": "Google"}
    )
    origem_a_id = r.json()["id"]

    await login_as(cadclient, db_session, email="orgb@b.com")
    lista_b = (await cadclient.get("/cadastros/origens-contato")).json()
    assert origem_a_id not in [o["id"] for o in lista_b]

    resp = await cadclient.get(f"/cadastros/origens-contato/{origem_a_id}")
    assert resp.status_code == 404


# ── auth ──────────────────────────────────────────────────────────────────────

async def test_cadastros_requer_auth(cadclient):
    """Sem login → 401 em todas as rotas de listagem."""
    assert (await cadclient.get("/cadastros/empresa-contatos")).status_code == 401
    assert (
        await cadclient.get("/cadastros/categorias-clientes-empresa")
    ).status_code == 401
    assert (await cadclient.get("/cadastros/origens-contato")).status_code == 401
