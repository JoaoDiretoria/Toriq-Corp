"""Testes de setor_permissoes (filha de setores)."""
import uuid

import pytest
from sqlalchemy import text

from app.api.setor_permissoes import router as sp_router
from app.main import app
from tests.helpers import login_as


@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(
        getattr(route, "path", "") == "/setores/{setor_id}/permissoes"
        for route in app.routes
    )
    if not already:
        app.include_router(sp_router)
    yield


async def _criar_setor(db_session, empresa_id, nome):
    setor_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_id), "eid": str(empresa_id), "nome": nome},
    )
    await db_session.commit()
    return setor_id


async def test_lista_vazia_retorna_lista_nao_404(client, db_session):
    """REGRA LEGADA: setor sem permissões → [] (nunca 404)."""
    empresa_id = await login_as(client, db_session, email="sp1@s.com")
    setor_id = await _criar_setor(db_session, empresa_id, "SetorSP1")

    r = await client.get(f"/setores/{setor_id}/permissoes")
    assert r.status_code == 200, r.text
    assert r.json() == []


async def test_criar_e_listar_permissao(client, db_session):
    empresa_id = await login_as(client, db_session, email="sp2@s.com")
    setor_id = await _criar_setor(db_session, empresa_id, "SetorSP2")

    r = await client.post(
        f"/setores/{setor_id}/permissoes",
        json={
            "modulo_id": "financeiro",
            "pagina_id": "contas",
            "visualizar": True,
            "editar": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["setor_id"] == str(setor_id)
    assert body["visualizar"] is True
    perm_id = body["id"]

    lista = await client.get(f"/setores/{setor_id}/permissoes")
    assert lista.status_code == 200
    assert len(lista.json()) == 1
    assert lista.json()[0]["id"] == perm_id


async def test_atualizar_e_remover_permissao(client, db_session):
    empresa_id = await login_as(client, db_session, email="sp3@s.com")
    setor_id = await _criar_setor(db_session, empresa_id, "SetorSP3")

    r = await client.post(
        f"/setores/{setor_id}/permissoes",
        json={"modulo_id": "crm", "pagina_id": "leads"},
    )
    perm_id = r.json()["id"]

    upd = await client.put(
        f"/setores/{setor_id}/permissoes/{perm_id}", json={"criar": True}
    )
    assert upd.status_code == 200
    assert upd.json()["criar"] is True

    dele = await client.delete(f"/setores/{setor_id}/permissoes/{perm_id}")
    assert dele.status_code == 204

    lista = await client.get(f"/setores/{setor_id}/permissoes")
    assert lista.json() == []


async def test_cross_tenant_setor_retorna_404(client, db_session):
    """Empresa B não acessa permissões de setor da empresa A."""
    empresa_a = await login_as(client, db_session, email="sp_a@s.com")
    setor_a = await _criar_setor(db_session, empresa_a, "SetorSPA")
    await client.post(
        f"/setores/{setor_a}/permissoes",
        json={"modulo_id": "x", "pagina_id": "y"},
    )

    # Empresa B
    await login_as(client, db_session, email="sp_b@s.com")
    r = await client.get(f"/setores/{setor_a}/permissoes")
    assert r.status_code == 404, r.text
