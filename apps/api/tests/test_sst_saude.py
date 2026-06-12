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

from tests.helpers import login_as


# ── Fixture: registra router ──────────────────────────────────────────────────

@pytest.fixture
async def saude_client(db_session, client):
    """Registra o router SST Saúde na app (schema já provisionado pelo banco de teste)."""
    from app.main import app
    from app.api.sst_saude import router as saude_router

    prefix_exists = any(r.path.startswith("/sst/saude") for r in app.routes)
    if not prefix_exists:
        app.include_router(saude_router)

    return client


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _criar_empresa_e_login(client, db_session, email: str, nome: str = "Empresa"):
    empresa_id = await login_as(client, db_session, email=email, nome=nome)
    # Return a proxy so callers can access .id (used for _criar_cliente_sst)
    class _Emp:
        id = empresa_id
    return _Emp()


async def _criar_cliente_sst(db_session, empresa_id: uuid.UUID) -> uuid.UUID:
    """Insere um ClientesSst associado à empresa."""
    cliente_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO clientes_sst (id, empresa_sst_id, nome, created_at, updated_at) "
            "VALUES (:id, :emp, 'Cliente Teste', now(), now())"
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


async def test_profissional_nao_expoe_senha_certificado(saude_client, db_session):
    """[SECURITY] senha_certificado e certificado_digital_url NÃO devem aparecer na resposta GET."""
    await _criar_empresa_e_login(saude_client, db_session, "prof_sec@test.com", "SecEmp")

    # Criar profissional com senha_certificado
    resp = await saude_client.post(
        "/sst/saude/profissionais",
        json={
            "nome": "Dr. Seguro",
            "especialidade": "Medicina do Trabalho",
            "senha_certificado": "senhasupersecreta",
            "certificado_digital_url": "https://storage/cert.pfx",
        },
    )
    assert resp.status_code == 201, resp.text
    pid = resp.json()["id"]

    # Verificar GET individual — campos sensíveis não devem aparecer
    resp = await saude_client.get(f"/sst/saude/profissionais/{pid}")
    assert resp.status_code == 200
    body = resp.json()
    assert "senha_certificado" not in body, "senha_certificado exposta na resposta GET!"
    assert "certificado_digital_url" not in body, "certificado_digital_url exposto na resposta GET!"

    # Verificar lista — campos sensíveis não devem aparecer em nenhum item
    resp = await saude_client.get("/sst/saude/profissionais")
    assert resp.status_code == 200
    for item in resp.json():
        assert "senha_certificado" not in item, "senha_certificado exposta na listagem!"
        assert "certificado_digital_url" not in item, "certificado_digital_url exposta na listagem!"


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


# ── Testes: SinistrosColaborador — endpoints REMOVIDOS por segurança ──────────
#
# Os endpoints /sst/saude/sinistros foram removidos pois sinistros_colaborador
# não possui empresa_id e seus campos turma_id / turma_colaborador_id são UUIDs
# sem FK declarada para nenhuma tabela com empresa_id no modelo gerado.
# Expô-los implicaria IDOR cross-tenant irresolvível neste módulo.
# TODO: sinistros precisam de scoping via turma (Treinamentos)


async def test_sinistros_endpoints_removidos(saude_client, db_session):
    """[SECURITY] Endpoints /sst/saude/sinistros devem estar ausentes (404/405) após remoção por IDOR."""
    await _criar_empresa_e_login(saude_client, db_session, "sin_rm@test.com", "SinRmEmp")

    # Nenhum dos endpoints deve existir no router
    resp = await saude_client.get("/sst/saude/sinistros")
    assert resp.status_code == 404, (
        f"GET /sinistros deveria retornar 404 (endpoint removido), retornou {resp.status_code}"
    )

    resp = await saude_client.post(
        "/sst/saude/sinistros",
        json={"turma_colaborador_id": str(uuid.uuid4()), "turma_id": str(uuid.uuid4()),
              "tipo_sinistro_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404, (
        f"POST /sinistros deveria retornar 404 (endpoint removido), retornou {resp.status_code}"
    )

    fake_id = uuid.uuid4()
    resp = await saude_client.get(f"/sst/saude/sinistros/{fake_id}")
    assert resp.status_code == 404

    resp = await saude_client.put(f"/sst/saude/sinistros/{fake_id}", json={"descricao": "x"})
    assert resp.status_code == 404

    resp = await saude_client.delete(f"/sst/saude/sinistros/{fake_id}")
    assert resp.status_code == 404
