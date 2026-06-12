"""Testes para o módulo Frota.

Self-contained: registra o router no app — sem editar conftest.py ou qualquer
arquivo existente. As tabelas Frota já existem no schema real do banco de teste.

Cobertura:
- CRUD completo de veículos (top-level tenant-scoped)
- CRUD de manutenções (child com validação de veiculo_id)
- Isolamento cross-tenant (empresa B não vê dados de empresa A)
- Rejeição de veiculo_id de outra empresa no create de manutenção (FK injection)
"""
import uuid
import datetime

import pytest

from app.api.frota import router as frota_router
from tests.helpers import login_as

# ── Fixture: registra router ──────────────────────────────────────────────────

@pytest.fixture
async def frota_client(client):
    from app.main import app
    prefix_exists = any(r.path.startswith("/frota") for r in app.routes)
    if not prefix_exists:
        app.include_router(frota_router)

    return client


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _criar_empresa_e_login(db_session, client, email: str, nome: str = "Empresa"):
    empresa_id = await login_as(client, db_session, email=email, nome=nome)
    # Return a proxy so callers can access .id
    class _Emp:
        id = empresa_id
    return _Emp()


# ── Testes de veículos (top-level) ────────────────────────────────────────────

async def test_frota_requer_auth(frota_client):
    """Todas as rotas frota devem retornar 401 sem autenticação."""
    assert (await frota_client.get("/frota/veiculos")).status_code == 401
    assert (await frota_client.get("/frota/motoristas")).status_code == 401
    assert (await frota_client.get("/frota/manutencoes")).status_code == 401


async def test_veiculos_crud_completo(frota_client, db_session):
    """Ciclo completo: criar, listar, obter, atualizar, deletar veículo."""
    await _criar_empresa_e_login(db_session, frota_client, "veiculo@test.com")

    # Criar
    resp = await frota_client.post(
        "/frota/veiculos",
        json={"placa": "ABC1234", "marca": "Ford", "modelo": "Ranger", "ano": "2022"},
    )
    assert resp.status_code == 201, resp.text
    v = resp.json()
    assert v["placa"] == "ABC1234"
    assert v["marca"] == "Ford"
    veiculo_id = v["id"]

    # Listar
    lista = (await frota_client.get("/frota/veiculos")).json()
    assert any(x["id"] == veiculo_id for x in lista)

    # Obter por ID
    got = (await frota_client.get(f"/frota/veiculos/{veiculo_id}")).json()
    assert got["id"] == veiculo_id

    # Atualizar
    upd = (
        await frota_client.put(
            f"/frota/veiculos/{veiculo_id}",
            json={"km_atual": 5000, "ativo": False},
        )
    ).json()
    assert upd["km_atual"] == 5000
    assert upd["ativo"] is False

    # Deletar
    del_resp = await frota_client.delete(f"/frota/veiculos/{veiculo_id}")
    assert del_resp.status_code == 204

    # Confirmar que sumiu
    assert (await frota_client.get(f"/frota/veiculos/{veiculo_id}")).status_code == 404


async def test_veiculo_nao_encontrado(frota_client, db_session):
    """GET/PUT/DELETE de veículo inexistente retorna 404."""
    await _criar_empresa_e_login(db_session, frota_client, "notfound@test.com")
    fake_id = str(uuid.uuid4())
    assert (await frota_client.get(f"/frota/veiculos/{fake_id}")).status_code == 404
    assert (
        await frota_client.put(f"/frota/veiculos/{fake_id}", json={"placa": "XXX"})
    ).status_code == 404
    assert (await frota_client.delete(f"/frota/veiculos/{fake_id}")).status_code == 404


# ── Testes de manutenções (child com validação de FK) ─────────────────────────

async def test_manutencoes_crud_completo(frota_client, db_session):
    """Ciclo completo de manutenção associada a um veículo próprio."""
    await _criar_empresa_e_login(db_session, frota_client, "manut@test.com")

    # Criar veículo
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "MAN0001", "marca": "VW"}
    )
    assert v_resp.status_code == 201
    veiculo_id = v_resp.json()["id"]

    # Criar manutenção
    m_resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_id,
            "tipo": "Preventiva",
            "data": "2024-03-15",
            "servico": "Troca de óleo",
        },
    )
    assert m_resp.status_code == 201, m_resp.text
    m = m_resp.json()
    assert m["tipo"] == "Preventiva"
    assert m["veiculo_id"] == veiculo_id
    manut_id = m["id"]

    # Listar
    lista = (await frota_client.get("/frota/manutencoes")).json()
    assert any(x["id"] == manut_id for x in lista)

    # Atualizar (sem veiculo_id no payload — segurança)
    upd = (
        await frota_client.put(
            f"/frota/manutencoes/{manut_id}",
            json={"status": "Concluída", "km": 12000},
        )
    ).json()
    assert upd["status"] == "Concluída"
    assert upd["km"] == 12000

    # Deletar
    del_resp = await frota_client.delete(f"/frota/manutencoes/{manut_id}")
    assert del_resp.status_code == 204


# ── Testes de isolamento cross-tenant ─────────────────────────────────────────

async def test_isolamento_cross_tenant_veiculos(frota_client, db_session):
    """Empresa B não pode ver veículo de empresa A."""
    from app.models.generated import Empresas

    emp_a = Empresas(id=uuid.uuid4(), nome="Iso-A", tipo="sst")
    emp_b = Empresas(id=uuid.uuid4(), nome="Iso-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await frota_client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await frota_client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A cria veículo
    await _reg_login("iso-a@test.com", emp_a.id)
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "ISO1111", "marca": "Toyota"}
    )
    assert v_resp.status_code == 201
    veiculo_a_id = v_resp.json()["id"]

    # Empresa B loga e tenta listar — não deve ver veículo de A
    await _reg_login("iso-b@test.com", emp_b.id)
    lista_b = (await frota_client.get("/frota/veiculos")).json()
    ids_b = [x["id"] for x in lista_b]
    assert veiculo_a_id not in ids_b, "veículo de empresa A visível para empresa B!"

    # Empresa B não pode obter diretamente o veículo de A
    r = await frota_client.get(f"/frota/veiculos/{veiculo_a_id}")
    assert r.status_code == 404, f"esperado 404, recebeu {r.status_code}"

    # Empresa B não pode deletar veículo de A
    r = await frota_client.delete(f"/frota/veiculos/{veiculo_a_id}")
    assert r.status_code == 404


# ── Teste de validação de payload FK (veiculo_id cross-tenant) ────────────────

async def test_manutencao_rejeita_veiculo_de_outra_empresa(frota_client, db_session):
    """Criar manutenção com veiculo_id de outra empresa deve retornar 404."""
    from app.models.generated import Empresas

    emp_a = Empresas(id=uuid.uuid4(), nome="FK-A", tipo="sst")
    emp_b = Empresas(id=uuid.uuid4(), nome="FK-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await frota_client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await frota_client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A cria veículo
    await _reg_login("fk-a@test.com", emp_a.id)
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "FK1001"}
    )
    assert v_resp.status_code == 201
    veiculo_a_id = v_resp.json()["id"]

    # Empresa B tenta criar manutenção apontando para veículo de empresa A
    await _reg_login("fk-b@test.com", emp_b.id)
    resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_a_id,
            "tipo": "Preventiva",
            "data": "2024-06-01",
            "servico": "Ataque FK",
        },
    )
    assert resp.status_code == 404, (
        f"esperado 404 (veiculo de outra empresa), recebeu {resp.status_code}: {resp.text}"
    )


async def test_manutencao_com_veiculo_proprio_funciona(frota_client, db_session):
    """Criar manutenção com veiculo_id próprio deve funcionar normalmente."""
    await _criar_empresa_e_login(db_session, frota_client, "proprio@test.com")

    v_resp = await frota_client.post("/frota/veiculos", json={"placa": "OWN9999"})
    assert v_resp.status_code == 201
    veiculo_id = v_resp.json()["id"]

    resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_id,
            "tipo": "Corretiva",
            "data": "2024-07-20",
            "servico": "Reparo motor",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["veiculo_id"] == veiculo_id


async def test_motoristas_crud(frota_client, db_session):
    """CRUD básico de motoristas."""
    await _criar_empresa_e_login(db_session, frota_client, "motorista@test.com")

    # Criar
    resp = await frota_client.post(
        "/frota/motoristas",
        json={"nome": "João Silva", "cnh_categoria": "B", "telefone": "11999999999"},
    )
    assert resp.status_code == 201, resp.text
    m = resp.json()
    assert m["nome"] == "João Silva"
    motorista_id = m["id"]

    # Listar
    lista = (await frota_client.get("/frota/motoristas")).json()
    assert any(x["id"] == motorista_id for x in lista)

    # Atualizar
    upd = (
        await frota_client.put(
            f"/frota/motoristas/{motorista_id}",
            json={"ativo": False},
        )
    ).json()
    assert upd["ativo"] is False

    # Deletar
    del_resp = await frota_client.delete(f"/frota/motoristas/{motorista_id}")
    assert del_resp.status_code == 204
