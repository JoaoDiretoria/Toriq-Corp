"""Testes para o módulo Frota.

Self-contained: cria as tabelas necessárias com DDL SQLite-compatible no fixture
e registra o router no app — sem editar conftest.py ou qualquer arquivo existente.

Cobertura:
- CRUD completo de veículos (top-level tenant-scoped)
- CRUD de manutenções (child com validação de veiculo_id)
- Isolamento cross-tenant (empresa B não vê dados de empresa A)
- Rejeição de veiculo_id de outra empresa no create de manutenção (FK injection)
"""
import uuid
import datetime

import pytest
from sqlalchemy import text

from app.api.frota import router as frota_router

# ── DDL SQLite-compatible para as tabelas Frota ───────────────────────────────

_FROTA_DDL = [
    """
    CREATE TABLE IF NOT EXISTS frota_veiculos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        placa VARCHAR(10) NOT NULL,
        renavam VARCHAR(20),
        chassi VARCHAR(50),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        ano VARCHAR(20),
        tipo VARCHAR(50) DEFAULT 'Passeio',
        combustivel VARCHAR(50) DEFAULT 'Flex',
        km_atual INTEGER DEFAULT 0,
        gestor_responsavel VARCHAR(255),
        motorista_padrao VARCHAR(255),
        observacoes TEXT,
        ativo BOOLEAN DEFAULT 1,
        checklist_obrigatorio BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_motoristas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cpf TEXT,
        rg TEXT,
        data_nascimento DATE,
        cnh_numero TEXT,
        cnh_categoria TEXT,
        cnh_validade DATE,
        telefone TEXT,
        email TEXT,
        endereco TEXT,
        foto_url TEXT,
        cpf_anexo_url TEXT,
        rg_anexo_url TEXT,
        cnh_anexo_url TEXT,
        observacoes TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        created_by CHAR(32),
        cep TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_manutencoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        data DATE NOT NULL,
        servico VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Agendada',
        km INTEGER,
        custo NUMERIC(12,2) DEFAULT 0,
        proxima_km INTEGER,
        proxima_data DATE,
        observacoes TEXT,
        created_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_checklists (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        status_geral VARCHAR(50) NOT NULL DEFAULT 'Aprovado',
        tipo VARCHAR(50) DEFAULT 'Pre-uso',
        km INTEGER,
        responsavel VARCHAR(255),
        local_inspecao VARCHAR(255),
        observacoes TEXT,
        created_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_custos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        categoria VARCHAR(50) NOT NULL,
        data DATE NOT NULL,
        valor NUMERIC(12,2) NOT NULL,
        fornecedor VARCHAR(255),
        observacoes TEXT,
        created_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_documentos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'Licenciamento',
        vencimento DATE NOT NULL,
        numero VARCHAR(100),
        observacoes TEXT,
        anexo_url TEXT,
        arquivo_url TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_ocorrencias (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        data DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Aberta',
        descricao TEXT NOT NULL,
        local_ocorrencia VARCHAR(255),
        custo_estimado NUMERIC(12,2),
        responsavel VARCHAR(255),
        prazo DATE,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS frota_utilizacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        veiculo_id CHAR(32) NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        km_inicio INTEGER NOT NULL,
        local_utilizacao VARCHAR(255),
        motorista VARCHAR(255),
        km_fim INTEGER DEFAULT 0,
        finalidade VARCHAR(255),
        observacoes TEXT,
        created_at DATETIME DEFAULT (now()),
        created_by CHAR(32),
        codigo VARCHAR(20),
        data_saida DATE,
        hora_saida TIME,
        previsao_retorno DATETIME,
        data_retorno DATE,
        hora_retorno TIME,
        status VARCHAR(20) DEFAULT 'Em uso',
        km_rodados INTEGER DEFAULT 0,
        numero_movimentacao VARCHAR(20),
        funil_card_id CHAR(32)
    )
    """,
]


# ── Fixture: cria tabelas + registra router ───────────────────────────────────

@pytest.fixture
async def frota_client(db_session, client):
    async with db_session.bind.begin() as conn:
        for ddl in _FROTA_DDL:
            await conn.execute(text(ddl))

    from app.main import app
    prefix_exists = any(r.path.startswith("/frota") for r in app.routes)
    if not prefix_exists:
        app.include_router(frota_router)

    return client


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _criar_empresa_e_login(db_session, client, email: str, nome: str = "Empresa"):
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


# ── Testes de veículos (top-level) ────────────────────────────────────────────

async def test_frota_requer_auth(frota_client):
    """Todas as rotas frota devem retornar 401 sem autenticação."""
    assert (await frota_client.get("/frota/veiculos")).status_code == 401
    assert (await frota_client.get("/frota/motoristas")).status_code == 401
    assert (await frota_client.get("/frota/manutencoes")).status_code == 401


async def test_veiculos_crud_completo(frota_client, db_session):
    """Ciclo completo: criar, listar, obter, atualizar, deletar veículo."""
    await _criar_empresa_e_login(db_session, frota_client, "veiculo@test.com")

    # Criar
    resp = await frota_client.post(
        "/frota/veiculos",
        json={"placa": "ABC1234", "marca": "Ford", "modelo": "Ranger", "ano": "2022"},
    )
    assert resp.status_code == 201, resp.text
    v = resp.json()
    assert v["placa"] == "ABC1234"
    assert v["marca"] == "Ford"
    veiculo_id = v["id"]

    # Listar
    lista = (await frota_client.get("/frota/veiculos")).json()
    assert any(x["id"] == veiculo_id for x in lista)

    # Obter por ID
    got = (await frota_client.get(f"/frota/veiculos/{veiculo_id}")).json()
    assert got["id"] == veiculo_id

    # Atualizar
    upd = (
        await frota_client.put(
            f"/frota/veiculos/{veiculo_id}",
            json={"km_atual": 5000, "ativo": False},
        )
    ).json()
    assert upd["km_atual"] == 5000
    assert upd["ativo"] is False

    # Deletar
    del_resp = await frota_client.delete(f"/frota/veiculos/{veiculo_id}")
    assert del_resp.status_code == 204

    # Confirmar que sumiu
    assert (await frota_client.get(f"/frota/veiculos/{veiculo_id}")).status_code == 404


async def test_veiculo_nao_encontrado(frota_client, db_session):
    """GET/PUT/DELETE de veículo inexistente retorna 404."""
    await _criar_empresa_e_login(db_session, frota_client, "notfound@test.com")
    fake_id = str(uuid.uuid4())
    assert (await frota_client.get(f"/frota/veiculos/{fake_id}")).status_code == 404
    assert (
        await frota_client.put(f"/frota/veiculos/{fake_id}", json={"placa": "XXX"})
    ).status_code == 404
    assert (await frota_client.delete(f"/frota/veiculos/{fake_id}")).status_code == 404


# ── Testes de manutenções (child com validação de FK) ─────────────────────────

async def test_manutencoes_crud_completo(frota_client, db_session):
    """Ciclo completo de manutenção associada a um veículo próprio."""
    await _criar_empresa_e_login(db_session, frota_client, "manut@test.com")

    # Criar veículo
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "MAN0001", "marca": "VW"}
    )
    assert v_resp.status_code == 201
    veiculo_id = v_resp.json()["id"]

    # Criar manutenção
    m_resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_id,
            "tipo": "Preventiva",
            "data": "2024-03-15",
            "servico": "Troca de óleo",
        },
    )
    assert m_resp.status_code == 201, m_resp.text
    m = m_resp.json()
    assert m["tipo"] == "Preventiva"
    assert m["veiculo_id"] == veiculo_id
    manut_id = m["id"]

    # Listar
    lista = (await frota_client.get("/frota/manutencoes")).json()
    assert any(x["id"] == manut_id for x in lista)

    # Atualizar (sem veiculo_id no payload — segurança)
    upd = (
        await frota_client.put(
            f"/frota/manutencoes/{manut_id}",
            json={"status": "Concluída", "km": 12000},
        )
    ).json()
    assert upd["status"] == "Concluída"
    assert upd["km"] == 12000

    # Deletar
    del_resp = await frota_client.delete(f"/frota/manutencoes/{manut_id}")
    assert del_resp.status_code == 204


# ── Testes de isolamento cross-tenant ─────────────────────────────────────────

async def test_isolamento_cross_tenant_veiculos(frota_client, db_session):
    """Empresa B não pode ver veículo de empresa A."""
    from app.models.generated import Empresas

    emp_a = Empresas(id=uuid.uuid4(), nome="Iso-A", tipo="sst")
    emp_b = Empresas(id=uuid.uuid4(), nome="Iso-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await frota_client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await frota_client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A cria veículo
    await _reg_login("iso-a@test.com", emp_a.id)
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "ISO1111", "marca": "Toyota"}
    )
    assert v_resp.status_code == 201
    veiculo_a_id = v_resp.json()["id"]

    # Empresa B loga e tenta listar — não deve ver veículo de A
    await _reg_login("iso-b@test.com", emp_b.id)
    lista_b = (await frota_client.get("/frota/veiculos")).json()
    ids_b = [x["id"] for x in lista_b]
    assert veiculo_a_id not in ids_b, "veículo de empresa A visível para empresa B!"

    # Empresa B não pode obter diretamente o veículo de A
    r = await frota_client.get(f"/frota/veiculos/{veiculo_a_id}")
    assert r.status_code == 404, f"esperado 404, recebeu {r.status_code}"

    # Empresa B não pode deletar veículo de A
    r = await frota_client.delete(f"/frota/veiculos/{veiculo_a_id}")
    assert r.status_code == 404


# ── Teste de validação de payload FK (veiculo_id cross-tenant) ────────────────

async def test_manutencao_rejeita_veiculo_de_outra_empresa(frota_client, db_session):
    """Criar manutenção com veiculo_id de outra empresa deve retornar 404."""
    from app.models.generated import Empresas

    emp_a = Empresas(id=uuid.uuid4(), nome="FK-A", tipo="sst")
    emp_b = Empresas(id=uuid.uuid4(), nome="FK-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await frota_client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await frota_client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A cria veículo
    await _reg_login("fk-a@test.com", emp_a.id)
    v_resp = await frota_client.post(
        "/frota/veiculos", json={"placa": "FK1001"}
    )
    assert v_resp.status_code == 201
    veiculo_a_id = v_resp.json()["id"]

    # Empresa B tenta criar manutenção apontando para veículo de empresa A
    await _reg_login("fk-b@test.com", emp_b.id)
    resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_a_id,
            "tipo": "Preventiva",
            "data": "2024-06-01",
            "servico": "Ataque FK",
        },
    )
    assert resp.status_code == 404, (
        f"esperado 404 (veiculo de outra empresa), recebeu {resp.status_code}: {resp.text}"
    )


async def test_manutencao_com_veiculo_proprio_funciona(frota_client, db_session):
    """Criar manutenção com veiculo_id próprio deve funcionar normalmente."""
    await _criar_empresa_e_login(db_session, frota_client, "proprio@test.com")

    v_resp = await frota_client.post("/frota/veiculos", json={"placa": "OWN9999"})
    assert v_resp.status_code == 201
    veiculo_id = v_resp.json()["id"]

    resp = await frota_client.post(
        "/frota/manutencoes",
        json={
            "veiculo_id": veiculo_id,
            "tipo": "Corretiva",
            "data": "2024-07-20",
            "servico": "Reparo motor",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["veiculo_id"] == veiculo_id


async def test_motoristas_crud(frota_client, db_session):
    """CRUD básico de motoristas."""
    await _criar_empresa_e_login(db_session, frota_client, "motorista@test.com")

    # Criar
    resp = await frota_client.post(
        "/frota/motoristas",
        json={"nome": "João Silva", "cnh_categoria": "B", "telefone": "11999999999"},
    )
    assert resp.status_code == 201, resp.text
    m = resp.json()
    assert m["nome"] == "João Silva"
    motorista_id = m["id"]

    # Listar
    lista = (await frota_client.get("/frota/motoristas")).json()
    assert any(x["id"] == motorista_id for x in lista)

    # Atualizar
    upd = (
        await frota_client.put(
            f"/frota/motoristas/{motorista_id}",
            json={"ativo": False},
        )
    ).json()
    assert upd["ativo"] is False

    # Deletar
    del_resp = await frota_client.delete(f"/frota/motoristas/{motorista_id}")
    assert del_resp.status_code == 204
