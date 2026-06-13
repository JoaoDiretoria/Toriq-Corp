"""Testes para o módulo SST — normas regulamentadoras (tenant-scoped).

Cobre:
- CRUD completo via make_crud_router (/sst/normas-regulamentadoras)
- Isolamento cross-tenant: norma de outra empresa → 404
"""
import uuid

import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client, db_session, email: str, password: str = "segredo123"):
    """Cria empresa + usuário e faz login; retorna empresa_id."""
    from app.models.generated import Empresas as Empresa

    emp = Empresa(id=uuid.uuid4(), nome="Emp-" + email, tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    r = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nome": "Usuário SST",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    assert r.status_code in (200, 201), r.text

    r = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert r.status_code in (200, 201), r.text
    return emp.id


# ── CRUD ──────────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_normas_crud(client, db_session):
    await _register_and_login(client, db_session, "normas@sst.com")

    # Criar
    r = await client.post(
        "/sst/normas-regulamentadoras",
        json={"nr": "NR-35", "descricao": "Trabalho em altura"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nr"] == "NR-35"
    assert data["descricao"] == "Trabalho em altura"
    norma_id = data["id"]

    # Listar
    r = await client.get("/sst/normas-regulamentadoras")
    assert r.status_code == 200
    assert any(n["nr"] == "NR-35" for n in r.json())

    # Obter
    r = await client.get(f"/sst/normas-regulamentadoras/{norma_id}")
    assert r.status_code == 200
    assert r.json()["nr"] == "NR-35"

    # Atualizar
    r = await client.put(
        f"/sst/normas-regulamentadoras/{norma_id}",
        json={"descricao": "Trabalho em altura (atualizado)"},
    )
    assert r.status_code == 200
    assert r.json()["descricao"] == "Trabalho em altura (atualizado)"
    assert r.json()["nr"] == "NR-35"

    # Deletar
    r = await client.delete(f"/sst/normas-regulamentadoras/{norma_id}")
    assert r.status_code == 204

    r = await client.get(f"/sst/normas-regulamentadoras/{norma_id}")
    assert r.status_code == 404


# ── Isolamento cross-tenant ───────────────────────────────────────────────────

@pytest.mark.anyio
async def test_normas_cross_tenant_404(client, db_session):
    """Empresa A não deve conseguir acessar norma da Empresa B."""
    # Empresa A cria sua norma
    await _register_and_login(client, db_session, "normas_a@sst.com")
    r = await client.post(
        "/sst/normas-regulamentadoras",
        json={"nr": "NR-10"},
    )
    assert r.status_code == 201
    norma_a_id = r.json()["id"]

    # Empresa B faz login
    await _register_and_login(client, db_session, "normas_b@sst.com")

    # Empresa B não vê a norma da Empresa A
    r = await client.get(f"/sst/normas-regulamentadoras/{norma_a_id}")
    assert r.status_code == 404

    # Empresa B não atualiza a norma da Empresa A
    r = await client.put(
        f"/sst/normas-regulamentadoras/{norma_a_id}",
        json={"nr": "Hackeado"},
    )
    assert r.status_code == 404

    # Empresa B não deleta a norma da Empresa A
    r = await client.delete(f"/sst/normas-regulamentadoras/{norma_a_id}")
    assert r.status_code == 404

    # A lista da Empresa B não inclui a norma da Empresa A
    r = await client.get("/sst/normas-regulamentadoras")
    assert r.status_code == 200
    assert all(n["id"] != norma_a_id for n in r.json())
