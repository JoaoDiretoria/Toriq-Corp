"""Testes para o módulo SST EPI / Equipamentos.

Inclui o router no app, seguindo o padrão de test_kanban_factory.py.
O schema das tabelas já é provido pelo banco de teste Postgres.
"""
import uuid

import pytest

from app.api.sst_epi import router as epi_router


# ── Fixture: registra router ─────────────────────────────────────────────────

@pytest.fixture
async def epi_client(db_session, client):
    from app.main import app
    # Only include if not already registered (test isolation guard)
    prefix_exists = any(r.path.startswith("/sst/epi") for r in app.routes)
    if not prefix_exists:
        app.include_router(epi_router)

    return client


# ── helper: register + login ─────────────────────────────────────────────────

async def _create_empresa_and_login(client, db_session, email: str):
    from app.models.generated import Empresas
    emp = Empresas(id=uuid.uuid4(), nome=f"Empresa-{email}", tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "segredo123",
            "nome": email,
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": email, "password": "segredo123"}
    )
    assert r.status_code == 200, r.text
    return emp


# ── Testes: EquipamentosSst CRUD ─────────────────────────────────────────────

async def test_equipamentos_crud_completo(epi_client, db_session):
    """Ciclo completo: criar → listar → obter → atualizar → deletar."""
    await _create_empresa_and_login(epi_client, db_session, "epi1@test.com")

    # Criar
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Capacete", "codigo": "CAP-001", "categoria": "protecao"},
    )
    assert r.status_code == 201, r.text
    equip = r.json()
    assert equip["nome"] == "Capacete"
    assert equip["codigo"] == "CAP-001"
    assert equip["categoria"] == "protecao"
    equip_id = equip["id"]

    # Listar
    r = await epi_client.get("/sst/epi/equipamentos")
    assert r.status_code == 200
    lista = r.json()
    assert len(lista) == 1
    assert lista[0]["id"] == equip_id

    # Obter
    r = await epi_client.get(f"/sst/epi/equipamentos/{equip_id}")
    assert r.status_code == 200
    assert r.json()["nome"] == "Capacete"

    # Atualizar
    r = await epi_client.put(
        f"/sst/epi/equipamentos/{equip_id}",
        json={"status": "em_uso", "observacoes": "teste atualização"},
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["status"] == "em_uso"
    assert updated["observacoes"] == "teste atualização"

    # Deletar
    r = await epi_client.delete(f"/sst/epi/equipamentos/{equip_id}")
    assert r.status_code == 204

    # Confirmar que foi deletado
    r = await epi_client.get(f"/sst/epi/equipamentos/{equip_id}")
    assert r.status_code == 404


# ── Testes: Categorias CRUD ──────────────────────────────────────────────────

async def test_categorias_crud(epi_client, db_session):
    """CRUD básico de categorias."""
    await _create_empresa_and_login(epi_client, db_session, "epi_cat@test.com")

    # Criar categoria
    r = await epi_client.post(
        "/sst/epi/categorias",
        json={"nome": "EPI"},
    )
    assert r.status_code == 201, r.text
    cat = r.json()
    assert cat["nome"] == "EPI"
    cat_id = cat["id"]

    # Listar
    r = await epi_client.get("/sst/epi/categorias")
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # Atualizar
    r = await epi_client.put(f"/sst/epi/categorias/{cat_id}", json={"nome": "EPC"})
    assert r.status_code == 200
    assert r.json()["nome"] == "EPC"

    # Deletar
    r = await epi_client.delete(f"/sst/epi/categorias/{cat_id}")
    assert r.status_code == 204


# ── Teste: isolamento de tenant ──────────────────────────────────────────────

async def test_isolamento_tenant(epi_client, db_session):
    """Equipamento de empresa A não deve ser visível para empresa B."""
    emp_a = await _create_empresa_and_login(epi_client, db_session, "iso_a@test.com")

    # Empresa A cria equipamento
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Luva-A", "codigo": "LUV-A01", "categoria": "protecao"},
    )
    assert r.status_code == 201
    equip_a_id = r.json()["id"]

    # Empresa B faz login
    await _create_empresa_and_login(epi_client, db_session, "iso_b@test.com")

    # Empresa B lista equipamentos → não deve ver equipamento da empresa A
    r = await epi_client.get("/sst/epi/equipamentos")
    assert r.status_code == 200
    ids = [e["id"] for e in r.json()]
    assert equip_a_id not in ids, "equipamento de empresa A visível para empresa B!"

    # Empresa B não deve conseguir obter o equipamento da empresa A diretamente
    r = await epi_client.get(f"/sst/epi/equipamentos/{equip_a_id}")
    assert r.status_code == 404


# ── Teste: validação de FK cross-tenant em movimentacoes ─────────────────────

async def test_movimentacao_rejeita_equipamento_de_outra_empresa(epi_client, db_session):
    """Criar movimentação com equipamento_id de outra empresa deve retornar 404."""
    # Empresa A cria equipamento
    await _create_empresa_and_login(epi_client, db_session, "mov_a@test.com")
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Bota-A", "codigo": "BOT-A01", "categoria": "calcado"},
    )
    assert r.status_code == 201
    equip_a_id = r.json()["id"]

    # Empresa B faz login e tenta criar movimentação referenciando equipamento da A
    await _create_empresa_and_login(epi_client, db_session, "mov_b@test.com")
    r = await epi_client.post(
        "/sst/epi/movimentacoes",
        json={
            "tipo": "saida",
            "equipamento_id": equip_a_id,
        },
    )
    assert r.status_code == 404, (
        f"esperado 404 (FK cross-tenant), recebeu {r.status_code}: {r.text}"
    )


# ── Teste: movimentacao CRUD válida ──────────────────────────────────────────

async def test_movimentacao_crud(epi_client, db_session):
    """Criar e listar movimentação com equipamento da própria empresa."""
    await _create_empresa_and_login(epi_client, db_session, "mov_valid@test.com")

    # Criar equipamento primeiro
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Óculos", "codigo": "OC-001", "categoria": "visual"},
    )
    assert r.status_code == 201
    equip_id = r.json()["id"]

    # Criar movimentação
    r = await epi_client.post(
        "/sst/epi/movimentacoes",
        json={
            "tipo": "saida",
            "equipamento_id": equip_id,
            "quantidade": 2,
            "responsavel_retirada": "João",
        },
    )
    assert r.status_code == 201, r.text
    mov = r.json()
    assert mov["tipo"] == "saida"
    assert mov["equipamento_id"] == equip_id
    mov_id = mov["id"]

    # Listar
    r = await epi_client.get("/sst/epi/movimentacoes")
    assert r.status_code == 200
    assert any(m["id"] == mov_id for m in r.json())

    # Atualizar status
    r = await epi_client.put(
        f"/sst/epi/movimentacoes/{mov_id}",
        json={"status": "retirado"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "retirado"


# ── Teste: kit + kit itens ───────────────────────────────────────────────────

async def test_kit_itens_crud(epi_client, db_session):
    """Criar kit, adicionar item, atualizar quantidade, remover."""
    await _create_empresa_and_login(epi_client, db_session, "kit1@test.com")

    # Criar equipamento
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Cinto", "codigo": "CIN-001", "categoria": "seguranca"},
    )
    assert r.status_code == 201
    equip_id = r.json()["id"]

    # Criar kit
    r = await epi_client.post(
        "/sst/epi/kits",
        json={"nome": "Kit Altura", "codigo": "KIT-ALT-01"},
    )
    assert r.status_code == 201, r.text
    kit_id = r.json()["id"]

    # Adicionar item ao kit
    r = await epi_client.post(
        f"/sst/epi/kits/{kit_id}/itens",
        json={"equipamento_id": equip_id, "quantidade": 1},
    )
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["kit_id"] == kit_id
    assert item["equipamento_id"] == equip_id
    item_id = item["id"]

    # Listar itens
    r = await epi_client.get(f"/sst/epi/kits/{kit_id}/itens")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Atualizar quantidade
    r = await epi_client.put(
        f"/sst/epi/kits/{kit_id}/itens/{item_id}",
        json={"quantidade": 3},
    )
    assert r.status_code == 200
    assert r.json()["quantidade"] == 3

    # Remover item
    r = await epi_client.delete(f"/sst/epi/kits/{kit_id}/itens/{item_id}")
    assert r.status_code == 204

    # Confirmar remoção
    r = await epi_client.get(f"/sst/epi/kits/{kit_id}/itens")
    assert r.status_code == 200
    assert len(r.json()) == 0


# ── Teste: kit item rejeita equipamento de outra empresa ─────────────────────

async def test_kit_item_rejeita_equipamento_de_outra_empresa(epi_client, db_session):
    """Adicionar equipamento de outra empresa a um kit deve retornar 404."""
    # Empresa A cria equipamento
    await _create_empresa_and_login(epi_client, db_session, "kit_sec_a@test.com")
    r = await epi_client.post(
        "/sst/epi/equipamentos",
        json={"nome": "Protetor-A", "codigo": "PROT-A01", "categoria": "auditivo"},
    )
    assert r.status_code == 201
    equip_a_id = r.json()["id"]

    # Empresa B cria kit e tenta adicionar equipamento da A
    await _create_empresa_and_login(epi_client, db_session, "kit_sec_b@test.com")
    r = await epi_client.post(
        "/sst/epi/kits",
        json={"nome": "Kit B", "codigo": "KIT-B01"},
    )
    assert r.status_code == 201
    kit_b_id = r.json()["id"]

    r = await epi_client.post(
        f"/sst/epi/kits/{kit_b_id}/itens",
        json={"equipamento_id": equip_a_id, "quantidade": 1},
    )
    assert r.status_code == 404, (
        f"esperado 404 (FK cross-tenant), recebeu {r.status_code}: {r.text}"
    )


# ── Teste: 401 sem autenticação ──────────────────────────────────────────────

async def test_requer_autenticacao(epi_client):
    """Endpoints protegidos devem retornar 401 sem login."""
    assert (await epi_client.get("/sst/epi/equipamentos")).status_code == 401
    assert (await epi_client.get("/sst/epi/categorias")).status_code == 401
    assert (await epi_client.get("/sst/epi/movimentacoes")).status_code == 401
    assert (await epi_client.get("/sst/epi/kits")).status_code == 401
