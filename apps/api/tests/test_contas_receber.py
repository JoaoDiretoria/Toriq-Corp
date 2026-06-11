import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa

    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "cr@cr.com",
            "password": "segredo123",
            "nome": "CR",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    await client.post("/auth/login", json={"email": "cr@cr.com", "password": "segredo123"})
    return emp


async def test_bootstrap_e_mover(client, db_session):
    await _login(client, db_session)

    # Bootstrap deve criar 5 colunas padrão
    boot = await client.post("/financeiro/contas-receber/bootstrap-colunas")
    assert boot.status_code == 201, boot.text
    assert boot.json()["criadas"] == 5

    # Rodar bootstrap de novo não duplica
    boot2 = await client.post("/financeiro/contas-receber/bootstrap-colunas")
    assert boot2.json()["criadas"] == 0

    # Listar colunas
    cols_resp = await client.get("/financeiro/contas-receber/colunas")
    assert cols_resp.status_code == 200
    cols = cols_resp.json()
    assert len(cols) == 5
    c0 = cols[0]["id"]
    c1 = cols[1]["id"]

    # Criar conta
    conta_resp = await client.post(
        "/financeiro/contas-receber",
        json={"coluna_id": c0, "cliente_nome": "Cliente Teste", "numero": "CR-001", "valor": 150},
    )
    assert conta_resp.status_code == 201, conta_resp.text
    conta = conta_resp.json()
    assert conta["coluna_id"] == c0

    # Mover para outra coluna
    moved = await client.post(
        f"/financeiro/contas-receber/{conta['id']}/mover",
        json={"coluna_destino_id": c1, "justificativa": "teste de movimentação"},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == c1

    # Não deve encontrar conta de outra empresa
    conta_id = conta["id"]
    get_resp = await client.get(f"/financeiro/contas-receber/{conta_id}")
    assert get_resp.status_code == 200


async def test_reorder(client, db_session):
    await _login(client, db_session)
    await client.post("/financeiro/contas-receber/bootstrap-colunas")

    cols = (await client.get("/financeiro/contas-receber/colunas")).json()
    c0 = cols[0]["id"]

    # Criar duas contas
    r1 = await client.post(
        "/financeiro/contas-receber",
        json={"coluna_id": c0, "numero": "001", "cliente_nome": "C1", "ordem": 0},
    )
    r2 = await client.post(
        "/financeiro/contas-receber",
        json={"coluna_id": c0, "numero": "002", "cliente_nome": "C2", "ordem": 1},
    )
    id1 = r1.json()["id"]
    id2 = r2.json()["id"]

    # Reordenar
    resp = await client.patch(
        "/financeiro/contas-receber/reorder",
        json=[{"id": id1, "ordem": 10}, {"id": id2, "ordem": 5}],
    )
    assert resp.status_code == 204

    # Verificar nova ordem
    updated1 = (await client.get(f"/financeiro/contas-receber/{id1}")).json()
    updated2 = (await client.get(f"/financeiro/contas-receber/{id2}")).json()
    assert updated1["ordem"] == 10
    assert updated2["ordem"] == 5
