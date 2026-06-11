"""Testes do módulo Contratos — Tasks 1 e 2.

Task 1: numeração sequencial TQ-{ano}-{seq:04d} + CRUD contratos/modelos.
Task 2: cláusulas e módulos (de contrato e de modelo), tenant-scoped (cross-tenant → 404).
"""
import uuid
from datetime import datetime, timezone


# ── Helper de login ───────────────────────────────────────────────────────────

async def _login(client, db_session, email="ct@ct.com", suffix=""):
    from app.models.generated import Empresas as Empresa

    emp = Empresa(id=uuid.uuid4(), nome=f"E{suffix}", tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "segredo123",
            "nome": f"CT{suffix}",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    resp = await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    assert resp.status_code == 200, f"login falhou: {resp.text}"
    return emp


# ════════════════════════════════════════════════════════════════════════════════
# TASK 1 — Numeração sequencial + CRUD contratos e modelos
# ════════════════════════════════════════════════════════════════════════════════

async def test_numeracao_sequencial(client, db_session):
    """Primeiro contrato: TQ-{ano}-0001, segundo: TQ-{ano}-0002."""
    await _login(client, db_session)
    ano = datetime.now(tz=timezone.utc).year

    r1 = await client.post("/contratos", json={"tipo": "cliente"})
    assert r1.status_code == 201, r1.text
    assert r1.json()["numero"] == f"TQ-{ano}-0001"

    r2 = await client.post("/contratos", json={"tipo": "cliente"})
    assert r2.status_code == 201, r2.text
    assert r2.json()["numero"] == f"TQ-{ano}-0002"


async def test_criar_contrato_status_default_rascunho(client, db_session):
    """Contrato criado sem status explícito deve ter status 'rascunho'."""
    await _login(client, db_session, email="st@st.com", suffix="st")

    r = await client.post("/contratos", json={"tipo": "cliente"})
    assert r.status_code == 201, r.text
    body = r.json()
    # status deve ser 'rascunho' (server_default no DB / conftest DDL)
    assert body["status"] == "rascunho"
    assert body["tipo"] == "cliente"
    assert "numero" in body
    assert body["numero"].startswith("TQ-")


async def test_criar_contrato_campos_opcionais(client, db_session):
    """Contrato com campos financeiros e dados do cliente."""
    await _login(client, db_session, email="op@op.com", suffix="op")

    r = await client.post(
        "/contratos",
        json={
            "tipo": "cliente",
            "razao_social": "Empresa XYZ Ltda",
            "cnpj": "12.345.678/0001-90",
            "valor_avista": "5000.00",
            "valor_mensal": "500.00",
            "status": "rascunho",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["razao_social"] == "Empresa XYZ Ltda"
    assert body["cnpj"] == "12.345.678/0001-90"
    assert float(body["valor_avista"]) == 5000.0
    assert float(body["valor_mensal"]) == 500.0


async def test_listar_contratos(client, db_session):
    """GET /contratos retorna lista dos contratos da empresa."""
    await _login(client, db_session, email="ls@ls.com", suffix="ls")

    await client.post("/contratos", json={"tipo": "cliente"})
    await client.post("/contratos", json={"tipo": "parceiro"})

    r = await client.get("/contratos")
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) == 2


async def test_obter_contrato(client, db_session):
    """GET /contratos/{id} retorna o contrato pelo id."""
    await _login(client, db_session, email="ob@ob.com", suffix="ob")

    r_create = await client.post("/contratos", json={"tipo": "cliente"})
    assert r_create.status_code == 201
    cid = r_create.json()["id"]

    r = await client.get(f"/contratos/{cid}")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == cid


async def test_atualizar_contrato(client, db_session):
    """PUT /contratos/{id} atualiza os campos do contrato."""
    await _login(client, db_session, email="up@up.com", suffix="up")

    r_create = await client.post("/contratos", json={"tipo": "cliente"})
    cid = r_create.json()["id"]

    r = await client.put(
        f"/contratos/{cid}",
        json={"status": "enviado", "razao_social": "Nova Empresa SA"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "enviado"
    assert body["razao_social"] == "Nova Empresa SA"


async def test_deletar_contrato(client, db_session):
    """DELETE /contratos/{id} remove o contrato; GET seguinte retorna 404."""
    await _login(client, db_session, email="dl@dl.com", suffix="dl")

    r_create = await client.post("/contratos", json={"tipo": "cliente"})
    cid = r_create.json()["id"]

    r_del = await client.delete(f"/contratos/{cid}")
    assert r_del.status_code == 204

    r_get = await client.get(f"/contratos/{cid}")
    assert r_get.status_code == 404


async def test_contrato_isolamento_entre_empresas(client, db_session):
    """Contrato de uma empresa não é visível para outra empresa."""
    emp1 = await _login(client, db_session, email="e1@e1.com", suffix="e1")

    r = await client.post("/contratos", json={"tipo": "cliente"})
    cid = r.json()["id"]

    # Login como segunda empresa
    await _login(client, db_session, email="e2@e2.com", suffix="e2")

    r_get = await client.get(f"/contratos/{cid}")
    assert r_get.status_code == 404, "contrato de outra empresa não deve ser visível"

    r_list = await client.get("/contratos")
    ids_e2 = [x["id"] for x in r_list.json()]
    assert cid not in ids_e2, "contrato da empresa 1 não deve aparecer para empresa 2"


# ── CRUD de Modelos de Contrato ───────────────────────────────────────────────

async def test_crud_modelos_contrato(client, db_session):
    """CRUD completo de modelos de contrato."""
    await _login(client, db_session, email="mo@mo.com", suffix="mo")

    # Criar
    r_create = await client.post(
        "/modelos",
        json={"nome": "Modelo Padrão", "tipo": "cliente", "descricao": "Desc"},
    )
    assert r_create.status_code == 201, r_create.text
    body = r_create.json()
    mid = body["id"]
    assert body["nome"] == "Modelo Padrão"
    assert body["tipo"] == "cliente"

    # Listar
    r_list = await client.get("/modelos")
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # Obter
    r_get = await client.get(f"/modelos/{mid}")
    assert r_get.status_code == 200
    assert r_get.json()["id"] == mid

    # Atualizar
    r_put = await client.put(f"/modelos/{mid}", json={"nome": "Modelo Atualizado"})
    assert r_put.status_code == 200
    assert r_put.json()["nome"] == "Modelo Atualizado"

    # Deletar
    r_del = await client.delete(f"/modelos/{mid}")
    assert r_del.status_code == 204

    r_get2 = await client.get(f"/modelos/{mid}")
    assert r_get2.status_code == 404


# ════════════════════════════════════════════════════════════════════════════════
# TASK 2 — Cláusulas e módulos (de contrato e de modelo), tenant-scoped
# ════════════════════════════════════════════════════════════════════════════════

async def test_clausulas_contrato_crud(client, db_session):
    """CRUD completo de cláusulas de contrato."""
    await _login(client, db_session, email="cl@cl.com", suffix="cl")

    r_c = await client.post("/contratos", json={"tipo": "cliente"})
    cid = r_c.json()["id"]

    # Criar cláusula
    r_post = await client.post(
        f"/contratos/{cid}/clausulas",
        json={"numero": 1, "titulo": "Objeto", "conteudo": "O objeto é..."},
    )
    assert r_post.status_code == 201, r_post.text
    body = r_post.json()
    claus_id = body["id"]
    assert body["contrato_id"] == cid
    assert body["titulo"] == "Objeto"
    assert body["conteudo"] == "O objeto é..."
    assert body["numero"] == 1
    assert body["ordem"] == 0

    # Listar
    r_list = await client.get(f"/contratos/{cid}/clausulas")
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # Atualizar
    r_put = await client.put(
        f"/contratos/{cid}/clausulas/{claus_id}",
        json={"titulo": "Objeto Atualizado", "ordem": 1},
    )
    assert r_put.status_code == 200
    assert r_put.json()["titulo"] == "Objeto Atualizado"
    assert r_put.json()["ordem"] == 1

    # Deletar
    r_del = await client.delete(f"/contratos/{cid}/clausulas/{claus_id}")
    assert r_del.status_code == 204

    r_list2 = await client.get(f"/contratos/{cid}/clausulas")
    assert len(r_list2.json()) == 0


async def test_clausulas_contrato_cross_tenant_404(client, db_session):
    """Cláusula de contrato de outra empresa retorna 404 (não vaza dados)."""
    emp1 = await _login(client, db_session, email="ct1@ct.com", suffix="ct1")

    r_c = await client.post("/contratos", json={"tipo": "cliente"})
    cid_emp1 = r_c.json()["id"]

    await client.post(
        f"/contratos/{cid_emp1}/clausulas",
        json={"numero": 1, "titulo": "Cláusula 1", "conteudo": "Conteúdo 1"},
    )

    # Login como empresa 2
    await _login(client, db_session, email="ct2@ct.com", suffix="ct2")

    # Tentar acessar cláusulas do contrato da empresa 1 → 404
    r = await client.get(f"/contratos/{cid_emp1}/clausulas")
    assert r.status_code == 404, (
        f"empresa 2 não deve acessar cláusulas da empresa 1 — status: {r.status_code}"
    )


async def test_modulos_contrato_crud(client, db_session):
    """CRUD completo de módulos de contrato."""
    await _login(client, db_session, email="mc@mc.com", suffix="mc")

    r_c = await client.post("/contratos", json={"tipo": "cliente"})
    cid = r_c.json()["id"]

    # Criar módulo
    r_post = await client.post(
        f"/contratos/{cid}/modulos",
        json={"nome": "Módulo SST", "ordem": 1, "descricao": "Segurança do trabalho"},
    )
    assert r_post.status_code == 201, r_post.text
    body = r_post.json()
    mod_id = body["id"]
    assert body["contrato_id"] == cid
    assert body["nome"] == "Módulo SST"
    assert body["ordem"] == 1

    # Listar
    r_list = await client.get(f"/contratos/{cid}/modulos")
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # Atualizar
    r_put = await client.put(
        f"/contratos/{cid}/modulos/{mod_id}",
        json={"nome": "Módulo SST Atualizado"},
    )
    assert r_put.status_code == 200
    assert r_put.json()["nome"] == "Módulo SST Atualizado"

    # Deletar
    r_del = await client.delete(f"/contratos/{cid}/modulos/{mod_id}")
    assert r_del.status_code == 204

    r_list2 = await client.get(f"/contratos/{cid}/modulos")
    assert len(r_list2.json()) == 0


async def test_modulos_contrato_cross_tenant_404(client, db_session):
    """Módulos de contrato de outra empresa retornam 404."""
    await _login(client, db_session, email="mc1@mc.com", suffix="mc1")

    r_c = await client.post("/contratos", json={"tipo": "cliente"})
    cid_emp1 = r_c.json()["id"]

    # Login como empresa 2
    await _login(client, db_session, email="mc2@mc.com", suffix="mc2")

    r = await client.get(f"/contratos/{cid_emp1}/modulos")
    assert r.status_code == 404, (
        f"empresa 2 não deve acessar módulos da empresa 1 — status: {r.status_code}"
    )


async def test_clausulas_modelo_crud(client, db_session):
    """CRUD completo de cláusulas de modelo de contrato."""
    await _login(client, db_session, email="cm@cm.com", suffix="cm")

    r_m = await client.post(
        "/modelos",
        json={"nome": "Modelo Teste", "tipo": "cliente"},
    )
    mid = r_m.json()["id"]

    # Criar cláusula de modelo
    r_post = await client.post(
        f"/modelos/{mid}/clausulas",
        json={"numero": 1, "titulo": "Cláusula Padrão", "conteudo": "Conteúdo padrão"},
    )
    assert r_post.status_code == 201, r_post.text
    body = r_post.json()
    claus_id = body["id"]
    assert body["modelo_id"] == mid
    assert body["titulo"] == "Cláusula Padrão"
    assert body["numero"] == 1

    # Listar
    r_list = await client.get(f"/modelos/{mid}/clausulas")
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # Atualizar
    r_put = await client.put(
        f"/modelos/{mid}/clausulas/{claus_id}",
        json={"titulo": "Cláusula Atualizada"},
    )
    assert r_put.status_code == 200
    assert r_put.json()["titulo"] == "Cláusula Atualizada"

    # Deletar
    r_del = await client.delete(f"/modelos/{mid}/clausulas/{claus_id}")
    assert r_del.status_code == 204

    r_list2 = await client.get(f"/modelos/{mid}/clausulas")
    assert len(r_list2.json()) == 0


async def test_clausulas_modelo_cross_tenant_404(client, db_session):
    """Cláusulas de modelo de outra empresa retornam 404."""
    await _login(client, db_session, email="ml1@ml.com", suffix="ml1")

    r_m = await client.post("/modelos", json={"nome": "Modelo Emp1", "tipo": "cliente"})
    mid_emp1 = r_m.json()["id"]

    # Login como empresa 2
    await _login(client, db_session, email="ml2@ml.com", suffix="ml2")

    r = await client.get(f"/modelos/{mid_emp1}/clausulas")
    assert r.status_code == 404, (
        f"empresa 2 não deve acessar cláusulas do modelo da empresa 1 — status: {r.status_code}"
    )


async def test_modulos_modelo_crud(client, db_session):
    """CRUD completo de módulos de modelo de contrato."""
    await _login(client, db_session, email="mm@mm.com", suffix="mm")

    r_m = await client.post(
        "/modelos",
        json={"nome": "Modelo Módulos", "tipo": "cliente"},
    )
    mid = r_m.json()["id"]

    # Criar módulo de modelo
    r_post = await client.post(
        f"/modelos/{mid}/modulos",
        json={"nome": "Módulo Padrão", "ordem": 0, "descricao": "Desc padrão"},
    )
    assert r_post.status_code == 201, r_post.text
    body = r_post.json()
    mod_id = body["id"]
    assert body["modelo_id"] == mid
    assert body["nome"] == "Módulo Padrão"

    # Listar
    r_list = await client.get(f"/modelos/{mid}/modulos")
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1

    # Atualizar
    r_put = await client.put(
        f"/modelos/{mid}/modulos/{mod_id}",
        json={"nome": "Módulo Atualizado"},
    )
    assert r_put.status_code == 200
    assert r_put.json()["nome"] == "Módulo Atualizado"

    # Deletar
    r_del = await client.delete(f"/modelos/{mid}/modulos/{mod_id}")
    assert r_del.status_code == 204

    r_list2 = await client.get(f"/modelos/{mid}/modulos")
    assert len(r_list2.json()) == 0


async def test_modulos_modelo_cross_tenant_404(client, db_session):
    """Módulos de modelo de outra empresa retornam 404."""
    await _login(client, db_session, email="mm1@mm.com", suffix="mm1")

    r_m = await client.post("/modelos", json={"nome": "Modelo Emp1 Módulos", "tipo": "cliente"})
    mid_emp1 = r_m.json()["id"]

    # Login como empresa 2
    await _login(client, db_session, email="mm2@mm.com", suffix="mm2")

    r = await client.get(f"/modelos/{mid_emp1}/modulos")
    assert r.status_code == 404, (
        f"empresa 2 não deve acessar módulos do modelo da empresa 1 — status: {r.status_code}"
    )
