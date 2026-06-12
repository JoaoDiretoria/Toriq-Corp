"""Testes auto-contidos para as sub-tabelas de FINANCEIRO.

As tabelas reais já existem no banco de teste (Postgres); a fixture apenas
registra os routers no app (sem editar main.py). O isolamento transacional do
conftest desfaz tudo ao final de cada teste.

Cobertura:
  - financeiro_contas            → CRUD + isolamento por tenant
  - modelos_atividade            → CRUD + isolamento por tenant
  - contas_pagar_atividades      → criação escopada + 404 cross-tenant
  - contas_pagar_atividades_anexos → criação escopada via atividade
  - contas_pagar_movimentacoes   → append-only escopado por conta
"""
import uuid

import pytest

from app.api.financeiro_extras import (
    anexos_router,
    atividades_router,
    cp_movimentacoes_router,
    financeiro_contas_router,
    modelos_atividade_router,
)
from tests.helpers import login_as


@pytest.fixture
async def fin_client(client):
    from app.main import app

    routers = [
        financeiro_contas_router,
        modelos_atividade_router,
        atividades_router,
        anexos_router,
        cp_movimentacoes_router,
    ]
    existing = {getattr(rt, "path", None) for rt in app.routes}
    for r in routers:
        # Registra apenas se nenhuma das rotas do router já estiver no app.
        router_paths = {r.prefix + rt.path for rt in r.routes}
        if not (router_paths & existing):
            app.include_router(r)
            existing |= router_paths
    return client


# ── helper: cria uma conta a pagar real e retorna seu id ─────────────────────

async def _criar_conta_pagar(db_session, empresa_id: uuid.UUID) -> uuid.UUID:
    from app.models import generated as m

    coluna_id = uuid.uuid4()
    db_session.add(
        m.ContasPagarColunas(id=coluna_id, empresa_id=empresa_id, nome="A Pagar", ordem=0)
    )
    conta_id = uuid.uuid4()
    db_session.add(
        m.ContasPagar(
            id=conta_id,
            empresa_id=empresa_id,
            coluna_id=coluna_id,
            numero="CP-001",
            fornecedor_nome="Fornecedor X",
        )
    )
    await db_session.commit()
    return conta_id


# ── financeiro_contas (empresa_id direto) ────────────────────────────────────

async def test_financeiro_contas_crud(fin_client, db_session):
    await login_as(fin_client, db_session, email="fc1@test.com")

    r = await fin_client.post(
        "/financeiro/contas",
        json={
            "tipo": "pagar",
            "descricao": "Aluguel",
            "valor": "1500.00",
            "vencimento": "2026-07-10",
        },
    )
    assert r.status_code == 201, r.text
    conta = r.json()
    assert conta["descricao"] == "Aluguel"
    assert conta["status"] == "pendente"
    conta_id = conta["id"]

    # listar
    r = await fin_client.get("/financeiro/contas")
    assert r.status_code == 200
    assert any(c["id"] == conta_id for c in r.json())

    # obter
    r = await fin_client.get(f"/financeiro/contas/{conta_id}")
    assert r.status_code == 200

    # atualizar (sem FKs de parentesco)
    r = await fin_client.put(
        f"/financeiro/contas/{conta_id}", json={"status": "pago"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "pago"

    # deletar
    r = await fin_client.delete(f"/financeiro/contas/{conta_id}")
    assert r.status_code == 204
    assert (await fin_client.get(f"/financeiro/contas/{conta_id}")).status_code == 404


async def test_financeiro_contas_isolamento(fin_client, db_session):
    await login_as(fin_client, db_session, email="fc_a@test.com")
    r = await fin_client.post(
        "/financeiro/contas",
        json={"tipo": "receber", "descricao": "Venda A", "valor": "10",
              "vencimento": "2026-07-01"},
    )
    assert r.status_code == 201
    conta_a = r.json()["id"]

    # empresa B
    await login_as(fin_client, db_session, email="fc_b@test.com")
    r = await fin_client.get("/financeiro/contas")
    assert conta_a not in [c["id"] for c in r.json()]
    assert (await fin_client.get(f"/financeiro/contas/{conta_a}")).status_code == 404


# ── modelos_atividade (empresa_id direto) ────────────────────────────────────

async def test_modelos_atividade_crud_e_isolamento(fin_client, db_session):
    await login_as(fin_client, db_session, email="ma_a@test.com")
    r = await fin_client.post(
        "/financeiro/modelos-atividade",
        json={"nome": "Cobrança", "descricao": "Modelo de cobrança"},
    )
    assert r.status_code == 201, r.text
    modelo_a = r.json()["id"]

    r = await fin_client.put(
        f"/financeiro/modelos-atividade/{modelo_a}", json={"nome": "Cobrança v2"}
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Cobrança v2"

    # empresa B não enxerga
    await login_as(fin_client, db_session, email="ma_b@test.com")
    r = await fin_client.get("/financeiro/modelos-atividade")
    assert modelo_a not in [x["id"] for x in r.json()]
    assert (
        await fin_client.get(f"/financeiro/modelos-atividade/{modelo_a}")
    ).status_code == 404


# ── contas_pagar_atividades (filha de contas_pagar) ──────────────────────────

async def test_atividades_crud_escopado(fin_client, db_session):
    empresa_id = await login_as(fin_client, db_session, email="at1@test.com")
    conta_id = await _criar_conta_pagar(db_session, empresa_id)

    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_id}/atividades",
        json={"tipo": "ligacao", "descricao": "Ligar para fornecedor"},
    )
    assert r.status_code == 201, r.text
    atividade = r.json()
    assert atividade["conta_id"] == str(conta_id)
    atividade_id = atividade["id"]

    # listar
    r = await fin_client.get(f"/financeiro/contas-pagar/{conta_id}/atividades")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # atualizar
    r = await fin_client.put(
        f"/financeiro/contas-pagar/{conta_id}/atividades/{atividade_id}",
        json={"status": "concluida"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "concluida"

    # deletar
    r = await fin_client.delete(
        f"/financeiro/contas-pagar/{conta_id}/atividades/{atividade_id}"
    )
    assert r.status_code == 204


async def test_atividades_404_cross_tenant(fin_client, db_session):
    # Empresa A cria conta
    empresa_a = await login_as(fin_client, db_session, email="at_a@test.com")
    conta_a = await _criar_conta_pagar(db_session, empresa_a)

    # Empresa B tenta criar atividade na conta da empresa A → 404
    await login_as(fin_client, db_session, email="at_b@test.com")
    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_a}/atividades",
        json={"tipo": "x", "descricao": "ataque"},
    )
    assert r.status_code == 404, r.text

    # E também não consegue listar
    r = await fin_client.get(f"/financeiro/contas-pagar/{conta_a}/atividades")
    assert r.status_code == 404


# ── contas_pagar_atividades_anexos (filha de atividade) ──────────────────────

async def test_anexos_escopado_via_atividade(fin_client, db_session):
    empresa_id = await login_as(fin_client, db_session, email="anx1@test.com")
    conta_id = await _criar_conta_pagar(db_session, empresa_id)

    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_id}/atividades",
        json={"tipo": "doc", "descricao": "Anexar boleto"},
    )
    atividade_id = r.json()["id"]

    r = await fin_client.post(
        f"/financeiro/contas-pagar/atividades/{atividade_id}/anexos",
        json={
            "nome_arquivo": "boleto.pdf",
            "url": "https://x/boleto.pdf",
            "storage_path": "anexos/boleto.pdf",
        },
    )
    assert r.status_code == 201, r.text
    anexo = r.json()
    assert anexo["atividade_id"] == atividade_id
    anexo_id = anexo["id"]

    r = await fin_client.get(
        f"/financeiro/contas-pagar/atividades/{atividade_id}/anexos"
    )
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await fin_client.delete(
        f"/financeiro/contas-pagar/atividades/{atividade_id}/anexos/{anexo_id}"
    )
    assert r.status_code == 204


async def test_anexos_404_cross_tenant(fin_client, db_session):
    # Empresa A cria conta + atividade
    empresa_a = await login_as(fin_client, db_session, email="anx_a@test.com")
    conta_a = await _criar_conta_pagar(db_session, empresa_a)
    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_a}/atividades",
        json={"tipo": "doc", "descricao": "atv A"},
    )
    atividade_a = r.json()["id"]

    # Empresa B tenta anexar na atividade da A → 404
    await login_as(fin_client, db_session, email="anx_b@test.com")
    r = await fin_client.post(
        f"/financeiro/contas-pagar/atividades/{atividade_a}/anexos",
        json={"nome_arquivo": "x.pdf", "url": "u", "storage_path": "p"},
    )
    assert r.status_code == 404, r.text


# ── contas_pagar_movimentacoes (append-only, filha de conta) ─────────────────

async def test_movimentacoes_append_only_escopado(fin_client, db_session):
    empresa_id = await login_as(fin_client, db_session, email="mv1@test.com")
    conta_id = await _criar_conta_pagar(db_session, empresa_id)

    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_id}/movimentacoes",
        json={"tipo": "comentario", "descricao": "Criada manualmente"},
    )
    assert r.status_code == 201, r.text
    mov_id = r.json()["id"]

    r = await fin_client.get(f"/financeiro/contas-pagar/{conta_id}/movimentacoes")
    assert r.status_code == 200
    assert any(mv["id"] == mov_id for mv in r.json())

    r = await fin_client.get(
        f"/financeiro/contas-pagar/{conta_id}/movimentacoes/{mov_id}"
    )
    assert r.status_code == 200

    # append-only: não há PUT/DELETE
    assert (
        await fin_client.put(
            f"/financeiro/contas-pagar/{conta_id}/movimentacoes/{mov_id}", json={}
        )
    ).status_code == 405


async def test_movimentacoes_404_cross_tenant(fin_client, db_session):
    empresa_a = await login_as(fin_client, db_session, email="mv_a@test.com")
    conta_a = await _criar_conta_pagar(db_session, empresa_a)

    await login_as(fin_client, db_session, email="mv_b@test.com")
    r = await fin_client.post(
        f"/financeiro/contas-pagar/{conta_a}/movimentacoes",
        json={"tipo": "x", "descricao": "ataque"},
    )
    assert r.status_code == 404, r.text


# ── auth ─────────────────────────────────────────────────────────────────────

async def test_requer_autenticacao(fin_client):
    assert (await fin_client.get("/financeiro/contas")).status_code == 401
    assert (await fin_client.get("/financeiro/modelos-atividade")).status_code == 401
