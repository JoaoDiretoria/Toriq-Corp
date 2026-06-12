"""Testes das configurações por empresa (tenant via empresa_id)."""
import pytest

from app.api.empresa_settings import router as settings_router
from app.main import app
from tests.helpers import login_as


@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(getattr(r, "path", "") == "/configuracoes-empresa" for r in app.routes)
    if not already:
        app.include_router(settings_router)
    yield


async def test_configuracoes_empresa_crud_e_isolamento(client, db_session):
    empresa_a = await login_as(client, db_session, email="ce_a@cfg.com")
    r = await client.post(
        "/configuracoes-empresa", json={"tema": "dark", "cor_primaria": "#000000"}
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_a)
    assert body["tema"] == "dark"

    lista_a = await client.get("/configuracoes-empresa")
    assert lista_a.status_code == 200
    assert len(lista_a.json()) == 1

    # Empresa B não vê config da empresa A
    await login_as(client, db_session, email="ce_b@cfg.com")
    lista_b = await client.get("/configuracoes-empresa")
    assert lista_b.status_code == 200
    assert lista_b.json() == []


async def test_empresa_configuracoes_crud(client, db_session):
    empresa_id = await login_as(client, db_session, email="ec_cfg@cfg.com")
    r = await client.post(
        "/empresa-configuracoes",
        json={"idioma": "en-US", "notif_email": False, "sessao_timeout": 60},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_id)
    assert body["idioma"] == "en-US"
    assert body["notif_email"] is False

    lista = await client.get("/empresa-configuracoes")
    assert len(lista.json()) == 1


async def test_informacoes_empresa_crud(client, db_session):
    empresa_id = await login_as(client, db_session, email="ie_cfg@cfg.com")
    r = await client.post(
        "/informacoes-empresa",
        json={"missao": "Servir bem", "diretor_tecnico_nome": "Dr. House"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_id)
    assert body["missao"] == "Servir bem"

    info_id = body["id"]
    upd = await client.put(
        f"/informacoes-empresa/{info_id}", json={"visao": "Ser referência"}
    )
    assert upd.status_code == 200
    assert upd.json()["visao"] == "Ser referência"
