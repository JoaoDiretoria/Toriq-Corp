"""Testes auto-contidos para as sub-tabelas de EPI / EQUIPAMENTOS.

As tabelas reais já existem no banco de teste (Postgres); a fixture apenas
registra os routers no app (sem editar main.py).

Cobertura:
  - equipamentos_modelos_atividade        → CRUD + isolamento por tenant
  - equipamentos_movimentacoes_historico  → append-only escopado + 404 cross-tenant
"""
import uuid

import pytest

from app.api.equipamentos_extras import (
    epi_modelos_atividade_router,
    historico_router,
)
from tests.helpers import login_as


@pytest.fixture
async def epi_extras_client(client):
    from app.main import app

    existing = {getattr(rt, "path", None) for rt in app.routes}
    for r in (epi_modelos_atividade_router, historico_router):
        router_paths = {r.prefix + rt.path for rt in r.routes}
        if not (router_paths & existing):
            app.include_router(r)
            existing |= router_paths
    return client


async def _criar_movimentacao(db_session, empresa_id: uuid.UUID) -> uuid.UUID:
    from app.models import generated as m

    mov_id = uuid.uuid4()
    db_session.add(
        m.EquipamentosMovimentacoes(id=mov_id, empresa_id=empresa_id, tipo="saida")
    )
    await db_session.commit()
    return mov_id


# ── equipamentos_modelos_atividade (empresa_id direto) ───────────────────────

async def test_modelos_atividade_epi_crud_e_isolamento(epi_extras_client, db_session):
    await login_as(epi_extras_client, db_session, email="ema_a@test.com")

    r = await epi_extras_client.post(
        "/sst/epi/modelos-atividade",
        json={"tipo": "checklist", "nome": "Checklist EPI",
              "itens": [{"item": "capacete"}]},
    )
    assert r.status_code == 201, r.text
    modelo_a = r.json()
    assert modelo_a["tipo"] == "checklist"
    modelo_a_id = modelo_a["id"]

    # atualizar (UPDATE sem FK de parentesco)
    r = await epi_extras_client.put(
        f"/sst/epi/modelos-atividade/{modelo_a_id}", json={"nome": "Checklist v2"}
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Checklist v2"

    # empresa B não enxerga
    await login_as(epi_extras_client, db_session, email="ema_b@test.com")
    r = await epi_extras_client.get("/sst/epi/modelos-atividade")
    assert modelo_a_id not in [x["id"] for x in r.json()]
    assert (
        await epi_extras_client.get(f"/sst/epi/modelos-atividade/{modelo_a_id}")
    ).status_code == 404


# ── equipamentos_movimentacoes_historico (filha, append-only) ────────────────

async def test_historico_append_only_escopado(epi_extras_client, db_session):
    empresa_id = await login_as(epi_extras_client, db_session, email="hist1@test.com")
    mov_id = await _criar_movimentacao(db_session, empresa_id)

    r = await epi_extras_client.post(
        f"/sst/epi/movimentacoes/{mov_id}/historico",
        json={"tipo": "status", "descricao": "Movimentação criada",
              "status_novo": "demanda"},
    )
    assert r.status_code == 201, r.text
    hist = r.json()
    assert hist["movimentacao_id"] == str(mov_id)
    hist_id = hist["id"]

    r = await epi_extras_client.get(f"/sst/epi/movimentacoes/{mov_id}/historico")
    assert r.status_code == 200
    assert any(h["id"] == hist_id for h in r.json())

    r = await epi_extras_client.get(
        f"/sst/epi/movimentacoes/{mov_id}/historico/{hist_id}"
    )
    assert r.status_code == 200

    # append-only: não há PUT/DELETE
    assert (
        await epi_extras_client.put(
            f"/sst/epi/movimentacoes/{mov_id}/historico/{hist_id}", json={}
        )
    ).status_code == 405


async def test_historico_404_cross_tenant(epi_extras_client, db_session):
    # Empresa A cria movimentação
    empresa_a = await login_as(epi_extras_client, db_session, email="hist_a@test.com")
    mov_a = await _criar_movimentacao(db_session, empresa_a)

    # Empresa B tenta registrar histórico na movimentação da A → 404
    await login_as(epi_extras_client, db_session, email="hist_b@test.com")
    r = await epi_extras_client.post(
        f"/sst/epi/movimentacoes/{mov_a}/historico",
        json={"tipo": "x", "descricao": "ataque"},
    )
    assert r.status_code == 404, r.text

    r = await epi_extras_client.get(f"/sst/epi/movimentacoes/{mov_a}/historico")
    assert r.status_code == 404


# ── auth ─────────────────────────────────────────────────────────────────────

async def test_requer_autenticacao(epi_extras_client):
    assert (
        await epi_extras_client.get("/sst/epi/modelos-atividade")
    ).status_code == 401
    fake = uuid.uuid4()
    assert (
        await epi_extras_client.get(f"/sst/epi/movimentacoes/{fake}/historico")
    ).status_code == 401
