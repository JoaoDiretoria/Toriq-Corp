"""Testes TDD para o módulo SST Saúde Ocupacional.

Cobre:
  - CRUD completo de SaudeOcupacional (exames)
  - CRUD completo de ProfissionaisSaude
  - CRUD completo de SinistrosColaborador
  - Isolamento cross-tenant em SaudeOcupacional
  - Validação de payload FK (cliente_id) em ProfissionaisSaude
"""
import uuid
import datetime

import pytest
from sqlalchemy import text

# ── DDL SQLite-compatível para as três tabelas ────────────────────────────────

_SAUDE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS saude_ocupacional (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        colaborador_nome TEXT NOT NULL,
        tipo_exame TEXT NOT NULL,
        data_exame DATE NOT NULL,
        validade_dias NUMERIC NOT NULL DEFAULT 365,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        aso_arquivo_url TEXT,
        observacoes TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS profissionais_saude (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        especialidade VARCHAR(100) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(11),
        conselho VARCHAR(50),
        nr_conselho VARCHAR(50),
        uf_conselho VARCHAR(2),
        certificado_digital_url TEXT,
        senha_certificado TEXT,
        rubrica_url TEXT,
        cliente_id CHAR(32) REFERENCES clientes_sst(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tipos_sinistro (
        id CHAR(32) NOT NULL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        acao_padrao VARCHAR(50) DEFAULT 'reprovacao',
        ativo BOOLEAN DEFAULT 1,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS sinistros_colaborador (
        id CHAR(32) NOT NULL PRIMARY KEY,
        turma_colaborador_id CHAR(32) NOT NULL,
        turma_id CHAR(32) NOT NULL,
        tipo_sinistro_id CHAR(32) NOT NULL REFERENCES tipos_sinistro(id),
        acao VARCHAR(50) DEFAULT 'reprovacao',
        descricao TEXT,
        registrado_por CHAR(32),
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    # sinistro_fotos é carregado via lazy-load pelo relacionamento ORM
    """
    CREATE TABLE IF NOT EXISTS sinistro_fotos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        sinistro_id CHAR(32) NOT NULL REFERENCES sinistros_colaborador(id) ON DELETE CASCADE,
        foto_url TEXT NOT NULL,
        descricao TEXT,
        data_captura DATETIME,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now())
    )
    """,
]


# ── Fixture: cria tabelas + registra router ───────────────────────────────────

@pytest.fixture
async def saude_client(db_session, client):
    """Cria as tabelas SST Saúde e registra o router na app."""
    async with db_session.bind.begin() as conn:
        for ddl in _SAUDE_DDL:
            await conn.execute(text(ddl))

    from app.main import app
    from app.api.sst_saude import router as saude_router

    prefix_exists = any(r.path.startswith("/sst/saude") for r in app.routes)
    if not prefix_exists:
        app.include_router(saude_router)

    return client


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _criar_empresa_e_login(client, db_session, email: str, nome: str = "Empresa"):
    from app.models.generated import Empresas
    emp = Empresas(id=uuid.uuid4(), nome=nome, tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "segredo123",
            "nome": nome,
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    assert r.status_code == 200, r.text
    return emp


async def _criar_cliente_sst(db_session, empresa_id: uuid.UUID) -> uuid.UUID:
    """Insere um ClientesSst associado à empresa."""
    cliente_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO clientes_sst (id, empresa_sst_id, nome, created_at, updated_at) "
            "VALUES (:id, :emp, 'Cliente Teste', datetime('now'), datetime('now'))"
        ),
        {"id": str(cliente_id).replace("-", ""), "emp": str(empresa_id).replace("-", "")},
    )
    await db_session.commit()
    return cliente_id


# ── Testes: SaudeOcupacional (exames) ────────────────────────────────────────

async def test_exames_crud(saude_client, db_session):
    """CRUD completo de exames."""
    await _criar_empresa_e_login(saude_client, db_session, "exame@test.com", "ExameEmp")

    # Criar
    resp = await saude_client.post(
        "/sst/saude/exames",
        json={
            "colaborador_nome": "João Silva",
            "tipo_exame": "admissional",
            "data_exame": "2025-01-15",
            "validade_dias": "365",
        },
    )
    assert resp.status_code == 201, resp.text
    exame = resp.json()
    assert exame["colaborador_nome"] == "João Silva"
    assert exame["tipo_exame"] == "admissional"
    eid = exame["id"]

    # Listar
    resp = await saude_client.get("/sst/saude/exames")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Obter
    resp = await saude_client.get(f"/sst/saude/exames/{eid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == eid

    # Atualizar
    resp = await saude_client.put(
        f"/sst/saude/exames/{eid}",
        json={"observacoes": "Apto"},
    )
    assert resp.status_code == 200
    assert resp.json()["observacoes"] == "Apto"

    # Deletar
    resp = await saude_client.delete(f"/sst/saude/exames/{eid}")
    assert resp.status_code == 204

    # Confirmar remoção
    resp = await saude_client.get(f"/sst/saude/exames/{eid}")
    assert resp.status_code == 404


async def test_exames_requer_auth(saude_client):
    """Rotas de exames requerem autenticação."""
    # Fazer logout explícito chamando endpoint sem token (sem login prévio em nova sessão)
    import httpx
    from httpx import ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/sst/saude/exames")
        assert resp.status_code == 401


# ── Testes: isolamento cross-tenant ─────────────────────────────────────────

async def test_exames_isolamento_cross_tenant(saude_client, db_session):
    """Exame de empresa A não deve ser visível para empresa B."""
    from app.models.generated import Empresas

    # Empresa A
    emp_a = Empresas(id=uuid.uuid4(), nome="EmpA", tipo="sst")
    emp_b = Empresas(id=uuid.uuid4(), nome="EmpB", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email, empresa_id):
        await saude_client.post(
            "/auth/register",
            json={
                "email": email,
                "password": "segredo123",
                "nome": email,
                "role": "cliente_torq",
                "empresa_id": str(empresa_id),
            },
        )
        await saude_client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A cria um exame
    await _reg_login("a_iso@test.com", emp_a.id)
    resp = await saude_client.post(
        "/sst/saude/exames",
        json={
            "colaborador_nome": "Maria A",
            "tipo_exame": "periodico",
            "data_exame": "2025-03-01",
        },
    )
    assert resp.status_code == 201, resp.text
    exame_a_id = resp.json()["id"]

    # Empresa B faz login — não deve ver exame da empresa A
    await _reg_login("b_iso@test.com", emp_b.id)
    lista_b = (await saude_client.get("/sst/saude/exames")).json()
    ids_b = [e["id"] for e in lista_b]
    assert exame_a_id not in ids_b, "Exame de empresa A visível para empresa B!"

    # Empresa B não deve conseguir acessar exame de empresa A diretamente
    resp = await saude_client.get(f"/sst/saude/exames/{exame_a_id}")
    assert resp.status_code == 404


# ── Testes: ProfissionaisSaude ────────────────────────────────────────────────

async def test_profissionais_crud(saude_client, db_session):
    """CRUD completo de profissionais de saúde."""
    await _criar_empresa_e_login(saude_client, db_session, "prof@test.com", "ProfEmp")

    # Criar
    resp = await saude_client.post(
        "/sst/saude/profissionais",
        json={
            "nome": "Dr. Carlos",
            "especialidade": "Medicina do Trabalho",
            "conselho": "CRM",
            "nr_conselho": "12345",
            "uf_conselho": "SP",
        },
    )
    assert resp.status_code == 201, resp.text
    prof = resp.json()
    assert prof["nome"] == "Dr. Carlos"
    pid = prof["id"]

    # Listar
    resp = await saude_client.get("/sst/saude/profissionais")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # Obter
    resp = await saude_client.get(f"/sst/saude/profissionais/{pid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == pid

    # Atualizar (UPDATE schema não inclui cliente_id — campo de parentesco)
    resp = await saude_client.put(
        f"/sst/saude/profissionais/{pid}",
        json={"nr_conselho": "99999"},
    )
    assert resp.status_code == 200
    assert resp.json()["nr_conselho"] == "99999"

    # Deletar
    resp = await saude_client.delete(f"/sst/saude/profissionais/{pid}")
    assert resp.status_code == 204

    resp = await saude_client.get(f"/sst/saude/profissionais/{pid}")
    assert resp.status_code == 404


async def test_profissional_cliente_id_valido(saude_client, db_session):
    """cliente_id pertencente à empresa deve ser aceito no POST."""
    emp = await _criar_empresa_e_login(
        saude_client, db_session, "prof_cli@test.com", "ProfCliEmp"
    )
    cliente_id = await _criar_cliente_sst(db_session, emp.id)

    resp = await saude_client.post(
        "/sst/saude/profissionais",
        json={
            "nome": "Dr. Ana",
            "especialidade": "Enfermagem",
            "cliente_id": str(cliente_id),
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["cliente_id"] == str(cliente_id)


async def test_profissional_cliente_id_invalido_retorna_404(saude_client, db_session):
    """cliente_id de outra empresa deve retornar 404 (segurança FK injection)."""
    from app.models.generated import Empresas

    # Empresa do atacante
    await _criar_empresa_e_login(
        saude_client, db_session, "prof_atk@test.com", "AtkEmp"
    )

    # Empresa vítima com um cliente
    emp_vitima = Empresas(id=uuid.uuid4(), nome="Vitima", tipo="sst")
    db_session.add(emp_vitima)
    await db_session.commit()
    cliente_vitima_id = await _criar_cliente_sst(db_session, emp_vitima.id)

    # Atacante tenta referenciar cliente da empresa vítima
    resp = await saude_client.post(
        "/sst/saude/profissionais",
        json={
            "nome": "Dr. Atacante",
            "especialidade": "Clínica",
            "cliente_id": str(cliente_vitima_id),
        },
    )
    assert resp.status_code == 404, f"Esperado 404, recebeu {resp.status_code}: {resp.text}"


# ── Testes: SinistrosColaborador ──────────────────────────────────────────────

async def _criar_tipo_sinistro(db_session) -> uuid.UUID:
    """Insere um TiposSinistro de lookup."""
    ts_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO tipos_sinistro (id, codigo, nome) VALUES (:id, :cod, :nome)"
        ),
        {"id": str(ts_id).replace("-", ""), "cod": "TST001", "nome": "Tipo Teste"},
    )
    await db_session.commit()
    return ts_id


async def test_sinistros_crud(saude_client, db_session):
    """CRUD completo de sinistros de colaborador."""
    # Apenas autenticação necessária (sem filtro de tenant)
    await _criar_empresa_e_login(saude_client, db_session, "sin@test.com", "SinEmp")
    ts_id = await _criar_tipo_sinistro(db_session)

    turma_id = uuid.uuid4()
    turma_col_id = uuid.uuid4()

    # Criar
    resp = await saude_client.post(
        "/sst/saude/sinistros",
        json={
            "turma_colaborador_id": str(turma_col_id),
            "turma_id": str(turma_id),
            "tipo_sinistro_id": str(ts_id),
            "acao": "reprovacao",
            "descricao": "Falta injustificada",
        },
    )
    assert resp.status_code == 201, resp.text
    sinistro = resp.json()
    assert sinistro["descricao"] == "Falta injustificada"
    sid = sinistro["id"]

    # Listar (sem filtro)
    resp = await saude_client.get("/sst/saude/sinistros")
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json()]
    assert sid in ids

    # Listar filtrado por turma_id
    resp = await saude_client.get(f"/sst/saude/sinistros?turma_id={turma_id}")
    assert resp.status_code == 200
    ids_filtrados = [s["id"] for s in resp.json()]
    assert sid in ids_filtrados

    # Obter
    resp = await saude_client.get(f"/sst/saude/sinistros/{sid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == sid

    # Atualizar (UPDATE schema exclui turma_colaborador_id, turma_id, tipo_sinistro_id)
    resp = await saude_client.put(
        f"/sst/saude/sinistros/{sid}",
        json={"descricao": "Atualizado"},
    )
    assert resp.status_code == 200
    assert resp.json()["descricao"] == "Atualizado"

    # Deletar
    resp = await saude_client.delete(f"/sst/saude/sinistros/{sid}")
    assert resp.status_code == 204

    resp = await saude_client.get(f"/sst/saude/sinistros/{sid}")
    assert resp.status_code == 404


async def test_sinistros_requer_auth(saude_client):
    """Rotas de sinistros requerem autenticação."""
    import httpx
    from httpx import ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/sst/saude/sinistros")
        assert resp.status_code == 401
