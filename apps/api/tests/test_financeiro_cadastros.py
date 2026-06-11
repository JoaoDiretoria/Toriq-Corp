import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": "f@f.com", "password": "segredo123",
        "nome": "F", "role": "cliente_torq", "empresa_id": str(emp.id),
    })
    await client.post("/auth/login", json={"email": "f@f.com", "password": "segredo123"})
    return emp


async def test_fornecedor_crud_e_isolamento(client, db_session):
    await _login(client, db_session)
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
