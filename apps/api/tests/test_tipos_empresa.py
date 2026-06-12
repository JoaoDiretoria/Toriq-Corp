"""Testes do catálogo global tipos_empresa."""
from tests.helpers import login_as


async def test_crud_admin_e_leitura_aberta(client, db_session):
    # admin_vertical cria
    await login_as(client, db_session, email="adm_te@e.com", role="admin_vertical")
    c = await client.post("/tipos-empresa", json={"nome": "Indústria", "descricao": "X"})
    assert c.status_code == 201, c.text
    tid = c.json()["id"]

    # qualquer autenticado lê
    await login_as(client, db_session, email="comum_te@e.com", role="cliente_torq")
    lst = await client.get("/tipos-empresa")
    assert lst.status_code == 200
    assert any(t["id"] == tid for t in lst.json())

    # comum NÃO escreve
    assert (await client.post("/tipos-empresa", json={"nome": "Y"})).status_code == 403
    assert (await client.put(f"/tipos-empresa/{tid}", json={"nome": "Z"})).status_code == 403
    assert (await client.delete(f"/tipos-empresa/{tid}")).status_code == 403

    # admin atualiza e remove
    await login_as(client, db_session, email="adm_te2@e.com", role="admin_vertical")
    u = await client.put(f"/tipos-empresa/{tid}", json={"nome": "Comércio"})
    assert u.status_code == 200 and u.json()["nome"] == "Comércio"
    assert (await client.delete(f"/tipos-empresa/{tid}")).status_code == 204
