import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa

    emp = Empresa(id=uuid.uuid4(), nome="EP", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "cp@cp.com",
            "password": "segredo123",
            "nome": "CP",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    await client.post("/auth/login", json={"email": "cp@cp.com", "password": "segredo123"})
    return emp


async def test_bootstrap_e_mover(client, db_session):
    await _login(client, db_session)

    # Bootstrap deve criar 4 colunas padrão (inclui "Pagamentos Recorrentes")
    boot = await client.post("/financeiro/contas-pagar/bootstrap-colunas")
    assert boot.status_code == 201, boot.text
    assert boot.json()["criadas"] == 4

    # Rodar bootstrap de novo não duplica
    boot2 = await client.post("/financeiro/contas-pagar/bootstrap-colunas")
    assert boot2.json()["criadas"] == 0

    # Listar colunas e verificar que "Pagamentos Recorrentes" está presente
    cols_resp = await client.get("/financeiro/contas-pagar/colunas")
    assert cols_resp.status_code == 200
    cols = cols_resp.json()
    assert len(cols) == 4
    nomes = [c["nome"] for c in cols]
    assert "Pagamentos Recorrentes" in nomes, f"colunas: {nomes}"
    c0 = cols[0]["id"]
    c1 = cols[1]["id"]

    # Criar conta
    conta_resp = await client.post(
        "/financeiro/contas-pagar",
        json={"coluna_id": c0, "fornecedor_nome": "Fornecedor X", "numero": "CP-001", "valor": 200},
    )
    assert conta_resp.status_code == 201, conta_resp.text
    conta = conta_resp.json()
    assert conta["coluna_id"] == c0

    # Mover para outra coluna
    moved = await client.post(
        f"/financeiro/contas-pagar/{conta['id']}/mover",
        json={"coluna_destino_id": c1, "justificativa": "pagamento autorizado"},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == c1


async def test_reorder(client, db_session):
    await _login(client, db_session)
    await client.post("/financeiro/contas-pagar/bootstrap-colunas")

    cols = (await client.get("/financeiro/contas-pagar/colunas")).json()
    c0 = cols[0]["id"]

    # Criar duas contas
    r1 = await client.post(
        "/financeiro/contas-pagar",
        json={"coluna_id": c0, "numero": "001", "fornecedor_nome": "F1", "ordem": 0},
    )
    r2 = await client.post(
        "/financeiro/contas-pagar",
        json={"coluna_id": c0, "numero": "002", "fornecedor_nome": "F2", "ordem": 1},
    )
    id1 = r1.json()["id"]
    id2 = r2.json()["id"]

    # Reordenar
    resp = await client.patch(
        "/financeiro/contas-pagar/reorder",
        json=[{"id": id1, "ordem": 20}, {"id": id2, "ordem": 10}],
    )
    assert resp.status_code == 204

    # Verificar nova ordem
    updated1 = (await client.get(f"/financeiro/contas-pagar/{id1}")).json()
    updated2 = (await client.get(f"/financeiro/contas-pagar/{id2}")).json()
    assert updated1["ordem"] == 20
    assert updated2["ordem"] == 10
