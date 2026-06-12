from tests.helpers import login_as


async def test_fornecedor_crud_e_isolamento(client, db_session):
    await login_as(client, db_session, email="f@f.com")
    r = await client.post(
        "/financeiro/cadastros/fornecedores",
        json={"razao_social": "ACME LTDA", "cnpj_cpf": "00000000000191"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["razao_social"] == "ACME LTDA"
    assert data["cnpj_cpf"] == "00000000000191"

    lista = await client.get("/financeiro/cadastros/fornecedores")
    assert lista.status_code == 200
    assert lista.json()[0]["razao_social"] == "ACME LTDA"
