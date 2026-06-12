import uuid

from app.models.generated import Empresas as Empresa
from tests.helpers import login_as


async def test_bootstrap_e_mover(client, db_session):
    await login_as(client, db_session, email="cr@cr.com")

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
    await login_as(client, db_session, email="cr@cr.com")
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


async def _setup_two_empresas(client, db_session):
    """Helper: cria duas empresas, cada uma com bootstrap de colunas.

    Retorna (emp_a_cols, emp_b_cols) — listas de colunas de cada empresa.
    """
    emp_a = Empresa(id=uuid.uuid4(), nome="CR-Sec-A", tipo="sst")
    emp_b = Empresa(id=uuid.uuid4(), nome="CR-Sec-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await client.post("/auth/login", json={"email": email, "password": "segredo123"})

    await _reg_login("cr-sec-a@test.com", emp_a.id)
    await client.post("/financeiro/contas-receber/bootstrap-colunas")
    cols_a = (await client.get("/financeiro/contas-receber/colunas")).json()

    await _reg_login("cr-sec-b@test.com", emp_b.id)
    await client.post("/financeiro/contas-receber/bootstrap-colunas")
    cols_b = (await client.get("/financeiro/contas-receber/colunas")).json()

    return cols_a, cols_b, _reg_login, emp_a, emp_b


async def test_criar_conta_rejeita_coluna_de_outra_empresa(client, db_session):
    """POST /financeiro/contas-receber com coluna_id de outra empresa deve retornar 404."""
    cols_a, cols_b, _reg_login, emp_a, emp_b = await _setup_two_empresas(client, db_session)
    coluna_a_id = cols_a[0]["id"]

    # Logado como empresa B, tenta criar conta usando coluna da empresa A
    resp = await client.post(
        "/financeiro/contas-receber",
        json={"coluna_id": coluna_a_id, "cliente_nome": "Ataque", "numero": "X-001", "valor": 0},
    )
    assert resp.status_code == 404, f"esperado 404, recebeu {resp.status_code}: {resp.text}"


async def test_mover_rejeita_coluna_destino_de_outra_empresa(client, db_session):
    """POST /{conta_id}/mover com coluna_destino_id de outra empresa deve retornar 404."""
    cols_a, cols_b, _reg_login, emp_a, emp_b = await _setup_two_empresas(client, db_session)

    # Empresa B: criar conta em coluna própria
    conta_b_resp = await client.post(
        "/financeiro/contas-receber",
        json={"coluna_id": cols_b[0]["id"], "cliente_nome": "B-Cliente", "numero": "B-001", "valor": 50},
    )
    assert conta_b_resp.status_code == 201, conta_b_resp.text
    conta_b = conta_b_resp.json()

    # Tenta mover para coluna da empresa A → 404
    resp = await client.post(
        f"/financeiro/contas-receber/{conta_b['id']}/mover",
        json={"coluna_destino_id": cols_a[0]["id"]},
    )
    assert resp.status_code == 404, f"esperado 404, recebeu {resp.status_code}: {resp.text}"

    # Mover para coluna da própria empresa B deve funcionar
    resp_ok = await client.post(
        f"/financeiro/contas-receber/{conta_b['id']}/mover",
        json={"coluna_destino_id": cols_b[1]["id"]},
    )
    assert resp_ok.status_code == 200, f"mover legítimo falhou: {resp_ok.text}"
