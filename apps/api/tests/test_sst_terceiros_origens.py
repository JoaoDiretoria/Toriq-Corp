"""Smoke + isolamento dos CRUDs tenant-scoped: terceiros, origens-contato,
categorias-clientes-empresa (via make_crud_router)."""
from tests.helpers import login_as


async def test_terceiros_crud_e_scoped(client, db_session):
    await login_as(client, db_session, email="terc@e.com", role="cliente_torq")
    c = await client.post(
        "/sst/terceiros",
        json={
            "nome_empresa_terceira": "ACME",
            "responsavel": "Fulano",
            "status_conformidade": "conforme",
            "data_validade_documentos": "2026-12-31",
        },
    )
    assert c.status_code == 201, c.text
    tid = c.json()["id"]
    assert c.json()["empresa_id"]  # carimbado pelo token

    lst = await client.get("/sst/terceiros")
    assert lst.status_code == 200 and any(t["id"] == tid for t in lst.json())

    # outra empresa não enxerga
    await login_as(client, db_session, email="terc2@e.com", role="cliente_torq")
    assert all(t["id"] != tid for t in (await client.get("/sst/terceiros")).json())


async def test_origens_e_categorias_crud(client, db_session):
    await login_as(client, db_session, email="oc@e.com", role="cliente_torq")

    o = await client.post(
        "/sst/origens-contato",
        json={"nome": "Indicação", "cor": "#abc", "ativo": True},
    )
    assert o.status_code == 201, o.text
    assert (await client.get("/sst/origens-contato")).status_code == 200

    cat = await client.post(
        "/sst/categorias-clientes-empresa",
        json={"nome": "Premium", "cor": "#0af", "ativo": True},
    )
    assert cat.status_code == 201, cat.text
    lst = await client.get("/sst/categorias-clientes-empresa")
    assert lst.status_code == 200 and any(x["nome"] == "Premium" for x in lst.json())
