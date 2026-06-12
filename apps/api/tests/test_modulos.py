"""Testes do módulo Modulos — catálogo global, empresas_modulos e telas."""
import uuid

import pytest

from app.api.modulos import router as modulos_router
from app.main import app
from tests.helpers import login_as


@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(getattr(r, "path", "") == "/modulos" for r in app.routes)
    if not already:
        app.include_router(modulos_router)
    yield


async def _criar_modulo(client, db_session, *, nome):
    """Cria um módulo global como admin_vertical e retorna seu id."""
    await login_as(
        client, db_session, email=f"adm_{nome}@m.com", role="admin_vertical"
    )
    r = await client.post("/modulos", json={"nome": nome, "rota": f"/{nome}"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


# ── Modulos (catálogo global) ─────────────────────────────────────────────────

async def test_modulo_crud_global(client, db_session):
    mod_id = await _criar_modulo(client, db_session, nome="financeiro")

    # Leitura autenticada (qualquer usuário)
    await login_as(client, db_session, email="leitor@m.com", role="cliente_torq")
    lista = await client.get("/modulos")
    assert lista.status_code == 200
    assert any(item["id"] == mod_id for item in lista.json())

    get_r = await client.get(f"/modulos/{mod_id}")
    assert get_r.status_code == 200
    assert get_r.json()["nome"] == "financeiro"


async def test_escrita_modulo_requer_admin(client, db_session):
    """Usuário comum não pode criar módulo global → 403."""
    await login_as(client, db_session, email="naoadm@m.com", role="cliente_torq")
    r = await client.post("/modulos", json={"nome": "x", "rota": "/x"})
    assert r.status_code == 403, r.text


# ── EmpresasModulos (tenant) ──────────────────────────────────────────────────

async def test_empresa_modulo_crud_e_isolamento(client, db_session):
    mod_id = await _criar_modulo(client, db_session, nome="crm")

    # Empresa A vincula o módulo
    empresa_a = await login_as(client, db_session, email="em_a@m.com", role="cliente_torq")
    r = await client.post(
        "/empresas-modulos", json={"modulo_id": mod_id, "ativo": True}
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_a)
    assert body["ativo"] is True

    lista_a = await client.get("/empresas-modulos")
    assert lista_a.status_code == 200
    assert len(lista_a.json()) == 1

    # Empresa B não vê o vínculo da empresa A
    await login_as(client, db_session, email="em_b@m.com", role="cliente_torq")
    lista_b = await client.get("/empresas-modulos")
    assert lista_b.status_code == 200
    assert lista_b.json() == []


# ── EmpresasModulosTelas (filha de empresas_modulos) ──────────────────────────

async def test_telas_crud_via_pai(client, db_session):
    mod_id = await _criar_modulo(client, db_session, nome="estoque")

    empresa_a = await login_as(client, db_session, email="tela_a@m.com", role="cliente_torq")
    em_r = await client.post(
        "/empresas-modulos", json={"modulo_id": mod_id, "ativo": True}
    )
    assert em_r.status_code == 201, em_r.text
    em_id = em_r.json()["id"]

    # Criar tela
    tela_r = await client.post(
        f"/empresas-modulos/{em_id}/telas",
        json={"tela_id": "dashboard", "ativo": True},
    )
    assert tela_r.status_code == 201, tela_r.text
    tela = tela_r.json()
    assert tela["tela_id"] == "dashboard"
    assert tela["empresa_id"] == str(empresa_a)
    tela_pk = tela["id"]

    # Listar
    lista = await client.get(f"/empresas-modulos/{em_id}/telas")
    assert lista.status_code == 200
    assert len(lista.json()) == 1

    # Atualizar
    upd = await client.put(
        f"/empresas-modulos/{em_id}/telas/{tela_pk}", json={"ativo": False}
    )
    assert upd.status_code == 200
    assert upd.json()["ativo"] is False

    # Deletar
    dele = await client.delete(f"/empresas-modulos/{em_id}/telas/{tela_pk}")
    assert dele.status_code == 204


async def test_telas_cross_tenant_retorna_404(client, db_session):
    """Empresa B não acessa telas do vínculo da empresa A."""
    mod_id = await _criar_modulo(client, db_session, nome="rh")

    await login_as(client, db_session, email="tela_ca@m.com", role="cliente_torq")
    em_r = await client.post(
        "/empresas-modulos", json={"modulo_id": mod_id, "ativo": True}
    )
    em_id = em_r.json()["id"]

    # Empresa B
    await login_as(client, db_session, email="tela_cb@m.com", role="cliente_torq")
    r = await client.get(f"/empresas-modulos/{em_id}/telas")
    assert r.status_code == 404, r.text
