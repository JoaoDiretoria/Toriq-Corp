"""Testes do módulo TREINAMENTOS.

Cobre:
  - CRUD de catálogo e treinamentos (empresa_id / TenantRepository)
  - Turmas com validação de FKs (cliente_id, treinamento_id, instrutor_id)
  - Tabelas-filhas escopadas via pai (aulas, colaboradores, certificados, datas)
  - Isolamento por tenant na listagem
  - 404 cross-tenant ao referenciar pai de outra empresa

Auto-contido: monta o router e cria os pré-requisitos (clientes_sst,
colaboradores) diretamente no banco de teste (as tabelas já existem no test DB).
"""
import uuid

import pytest
from sqlalchemy import text

from app.api.treinamentos import router as treinamentos_router
from app.main import app
from tests.helpers import login_as


# ── Monta o router no app antes dos testes deste módulo ──────────────────────

@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(
        getattr(r, "path", "").startswith("/treinamentos/turmas")
        for r in app.routes
    )
    if not already:
        app.include_router(treinamentos_router)
    yield


# ── Helpers para criar pré-requisitos diretamente no banco ───────────────────

async def _criar_cliente_sst(db_session, empresa_id) -> uuid.UUID:
    cid = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO clientes_sst (id, empresa_sst_id, nome) "
            "VALUES (:id, :eid, :nome)"
        ),
        {"id": str(cid), "eid": str(empresa_id), "nome": "Cliente X"},
    )
    await db_session.commit()
    return cid


async def _criar_colaborador(db_session, empresa_id) -> uuid.UUID:
    col_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO colaboradores (id, empresa_id, nome, ativo) "
            "VALUES (:id, :eid, :nome, true)"
        ),
        {"id": str(col_id), "eid": str(empresa_id), "nome": "Colab Y"},
    )
    await db_session.commit()
    return col_id


async def _criar_catalogo(client) -> str:
    r = await client.post(
        "/treinamentos/catalogo",
        json={"nome": "NR-35", "norma": "NR-35"},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


# ═══════════════════════════════════════════════════════════════════════════════
# Catálogo / Treinamentos (CRUD via make_crud_router)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_catalogo_criar_e_listar(client, db_session):
    empresa_id = await login_as(client, db_session, email="cat1@t.com")

    r = await client.post(
        "/treinamentos/catalogo",
        json={"nome": "NR-10", "norma": "NR-10", "validade": "24 meses"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["nome"] == "NR-10"
    assert body["empresa_id"] == str(empresa_id)
    cat_id = body["id"]

    lst = await client.get("/treinamentos/catalogo")
    assert lst.status_code == 200
    assert any(c["id"] == cat_id for c in lst.json())


async def test_treinamento_realizado_crud(client, db_session):
    await login_as(client, db_session, email="trn1@t.com")
    r = await client.post(
        "/treinamentos/treinamentos",
        json={
            "nome_treinamento": "Brigada",
            "instrutor": "João",
            "participantes": "10",
            "data_realizacao": "2026-01-15",
        },
    )
    assert r.status_code == 201, r.text
    tid = r.json()["id"]

    put = await client.put(
        f"/treinamentos/treinamentos/{tid}",
        json={"participantes": "12"},
    )
    assert put.status_code == 200
    assert put.json()["participantes"] == "12"


async def test_catalogo_isolamento_tenant(client, db_session):
    """Catálogo da empresa A não aparece na listagem da empresa B."""
    await login_as(client, db_session, email="iso_a@t.com")
    r = await client.post(
        "/treinamentos/catalogo", json={"nome": "Privado A", "norma": "NR-X"}
    )
    cat_a = r.json()["id"]

    await login_as(client, db_session, email="iso_b@t.com")
    lst = await client.get("/treinamentos/catalogo")
    assert lst.status_code == 200
    assert all(c["id"] != cat_a for c in lst.json())


# ═══════════════════════════════════════════════════════════════════════════════
# Turmas — criação com validação de FKs
# ═══════════════════════════════════════════════════════════════════════════════

async def test_turma_criar_e_listar(client, db_session):
    empresa_id = await login_as(client, db_session, email="turma1@t.com")
    cliente_id = await _criar_cliente_sst(db_session, empresa_id)
    cat_id = await _criar_catalogo(client)

    r = await client.post(
        "/treinamentos/turmas",
        json={
            "numero_turma": 1,
            "cliente_id": str(cliente_id),
            "treinamento_id": cat_id,
            "tipo_treinamento": "formacao",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_id)
    turma_id = body["id"]

    lst = await client.get("/treinamentos/turmas")
    assert lst.status_code == 200
    assert any(t["id"] == turma_id for t in lst.json())


async def test_turma_cliente_de_outro_tenant_404(client, db_session):
    """Criar turma com cliente_id de outra empresa → 404."""
    # Empresa A cria um cliente
    empresa_a = await login_as(client, db_session, email="tva_a@t.com")
    cliente_a = await _criar_cliente_sst(db_session, empresa_a)

    # Empresa B tenta usar o cliente da A
    await login_as(client, db_session, email="tva_b@t.com")
    cat_b = await _criar_catalogo(client)

    r = await client.post(
        "/treinamentos/turmas",
        json={
            "numero_turma": 1,
            "cliente_id": str(cliente_a),
            "treinamento_id": cat_b,
            "tipo_treinamento": "formacao",
        },
    )
    assert r.status_code == 404, r.text


async def test_turma_treinamento_de_outro_tenant_404(client, db_session):
    """Criar turma com treinamento_id (catálogo) de outra empresa → 404."""
    empresa_a = await login_as(client, db_session, email="ttt_a@t.com")
    cat_a = await _criar_catalogo(client)

    empresa_b = await login_as(client, db_session, email="ttt_b@t.com")
    cliente_b = await _criar_cliente_sst(db_session, empresa_b)

    r = await client.post(
        "/treinamentos/turmas",
        json={
            "numero_turma": 1,
            "cliente_id": str(cliente_b),
            "treinamento_id": cat_a,  # catálogo da empresa A
            "tipo_treinamento": "formacao",
        },
    )
    assert r.status_code == 404, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# Turma → Aulas (filha)
# ═══════════════════════════════════════════════════════════════════════════════

async def _setup_turma(client, db_session, email):
    empresa_id = await login_as(client, db_session, email=email)
    cliente_id = await _criar_cliente_sst(db_session, empresa_id)
    cat_id = await _criar_catalogo(client)
    r = await client.post(
        "/treinamentos/turmas",
        json={
            "numero_turma": 1,
            "cliente_id": str(cliente_id),
            "treinamento_id": cat_id,
            "tipo_treinamento": "formacao",
        },
    )
    assert r.status_code == 201, r.text
    return empresa_id, r.json()["id"]


async def test_aula_crud(client, db_session):
    _, turma_id = await _setup_turma(client, db_session, "aula1@t.com")
    r = await client.post(
        f"/treinamentos/turmas/{turma_id}/aulas",
        json={"data": "2026-02-01", "hora_inicio": "08:00", "hora_fim": "12:00"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["turma_id"] == turma_id

    lst = await client.get(f"/treinamentos/turmas/{turma_id}/aulas")
    assert lst.status_code == 200
    assert len(lst.json()) == 1


async def test_aula_cross_tenant_404(client, db_session):
    """Empresa B não acessa aulas de turma da empresa A → 404."""
    _, turma_a = await _setup_turma(client, db_session, "aulx_a@t.com")
    await client.post(
        f"/treinamentos/turmas/{turma_a}/aulas",
        json={"data": "2026-02-01", "hora_inicio": "08:00", "hora_fim": "12:00"},
    )

    await login_as(client, db_session, email="aulx_b@t.com")
    lst = await client.get(f"/treinamentos/turmas/{turma_a}/aulas")
    assert lst.status_code == 404, lst.text


# ═══════════════════════════════════════════════════════════════════════════════
# Turma → Colaboradores (filha; valida colaborador_id)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_turma_colaborador_crud(client, db_session):
    empresa_id, turma_id = await _setup_turma(client, db_session, "tc1@t.com")
    col_id = await _criar_colaborador(db_session, empresa_id)

    r = await client.post(
        f"/treinamentos/turmas/{turma_id}/colaboradores",
        json={"colaborador_id": str(col_id), "resultado": "aprovado"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["colaborador_id"] == str(col_id)

    lst = await client.get(f"/treinamentos/turmas/{turma_id}/colaboradores")
    assert len(lst.json()) == 1


async def test_turma_colaborador_de_outro_tenant_404(client, db_session):
    """colaborador_id de outra empresa → 404."""
    empresa_a, _turma_a = await _setup_turma(client, db_session, "tco_a@t.com")
    col_a = await _criar_colaborador(db_session, empresa_a)

    _empresa_b, turma_b = await _setup_turma(client, db_session, "tco_b@t.com")
    r = await client.post(
        f"/treinamentos/turmas/{turma_b}/colaboradores",
        json={"colaborador_id": str(col_a)},
    )
    assert r.status_code == 404, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# Colaborador → Treinamentos (filha; valida treinamento_id) + Datas
# ═══════════════════════════════════════════════════════════════════════════════

async def test_colaborador_treinamento_e_datas(client, db_session):
    empresa_id = await login_as(client, db_session, email="ctd1@t.com")
    col_id = await _criar_colaborador(db_session, empresa_id)
    cat_id = await _criar_catalogo(client)

    r = await client.post(
        f"/treinamentos/colaboradores/{col_id}/treinamentos",
        json={"treinamento_id": cat_id, "status": "realizado"},
    )
    assert r.status_code == 201, r.text
    ct_id = r.json()["id"]

    # Datas (neta)
    rd = await client.post(
        f"/treinamentos/colaboradores-treinamentos/{ct_id}/datas",
        json={"data": "2026-03-01", "inicio": "09:00", "fim": "11:00"},
    )
    assert rd.status_code == 201, rd.text
    assert rd.json()["colaborador_treinamento_id"] == ct_id

    lst = await client.get(
        f"/treinamentos/colaboradores-treinamentos/{ct_id}/datas"
    )
    assert len(lst.json()) == 1


async def test_colaborador_treinamento_cross_tenant_404(client, db_session):
    """Empresa B não acessa treinamentos de colaborador da empresa A → 404."""
    empresa_a = await login_as(client, db_session, email="ctx_a@t.com")
    col_a = await _criar_colaborador(db_session, empresa_a)

    await login_as(client, db_session, email="ctx_b@t.com")
    lst = await client.get(f"/treinamentos/colaboradores/{col_a}/treinamentos")
    assert lst.status_code == 404, lst.text


# ═══════════════════════════════════════════════════════════════════════════════
# Colaborador → Certificados (filha)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_certificado_crud(client, db_session):
    empresa_id = await login_as(client, db_session, email="cert1@t.com")
    col_id = await _criar_colaborador(db_session, empresa_id)

    r = await client.post(
        f"/treinamentos/colaboradores/{col_id}/certificados",
        json={"nome": "Certificado NR-35", "data_emissao": "2026-01-10"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["colaborador_id"] == str(col_id)

    lst = await client.get(f"/treinamentos/colaboradores/{col_id}/certificados")
    assert len(lst.json()) == 1


async def test_certificado_cross_tenant_404(client, db_session):
    """Empresa B não cria certificado em colaborador da empresa A → 404."""
    empresa_a = await login_as(client, db_session, email="crtx_a@t.com")
    col_a = await _criar_colaborador(db_session, empresa_a)

    await login_as(client, db_session, email="crtx_b@t.com")
    r = await client.post(
        f"/treinamentos/colaboradores/{col_a}/certificados",
        json={"nome": "Hack"},
    )
    assert r.status_code == 404, r.text
