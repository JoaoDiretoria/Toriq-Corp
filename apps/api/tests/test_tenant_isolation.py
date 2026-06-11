import uuid


async def _empresa_e_login(client, db_session, email):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": email, "password": "segredo123", "nome": "U",
        "role": "cliente_torq", "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    return empresa


async def test_usuario_so_ve_notas_da_propria_empresa(client, db_session):
    # Empresa A cria uma nota
    await _empresa_e_login(client, db_session, "a@a.com")
    created = await client.post("/notas", json={"texto": "segredo da A"})
    assert created.status_code == 201

    # Mesma empresa enxerga a nota
    listed = await client.get("/notas")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    # Empresa B loga (sobrescreve cookies) e NÃO deve ver a nota da A
    await _empresa_e_login(client, db_session, "b@b.com")
    listed_b = await client.get("/notas")
    assert listed_b.status_code == 200
    assert listed_b.json() == []
