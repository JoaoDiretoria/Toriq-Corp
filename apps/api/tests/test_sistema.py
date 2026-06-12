"""Testes auto-contidos do módulo /sistema.

O banco de teste é PostgreSQL real (db-toriq-test) com todas as tabelas do
generated.py presentes — então usamos as tabelas reais diretamente, como
tests/test_financeiro_cadastros.py. O router é registrado sob demanda (idempotente).

Cobertura:
- access_logs   : POST registra (autoria = usuário logado) + GET isola por empresa
- system_updates: leitura autenticada; escrita exige admin_vertical (403 p/ regular)
- user_update_views: marca update visto, idempotente, isolado por usuário
- import_queue  : CRUD + isolamento por empresa
- google_oauth  : status sem expor tokens + revogar (próprio tenant)
- cbo_ocupacoes : leitura + busca por q
- sla_config    : GET cria default + PUT upsert por empresa
"""
import uuid

import pytest
from sqlalchemy import delete, text

from app.models import generated as m
from tests.helpers import login_as


@pytest.fixture
async def sclient(client):
    from app.main import app
    from app.api.sistema import router as sistema_router

    already = any(getattr(r, "path", "").startswith("/sistema") for r in app.routes)
    if not already:
        app.include_router(sistema_router)
    return client


# ── auth ──────────────────────────────────────────────────────────────────────

async def test_sistema_requer_auth(sclient):
    assert (await sclient.get("/sistema/access-logs")).status_code == 401
    assert (await sclient.get("/sistema/system-updates")).status_code == 401
    assert (await sclient.get("/sistema/import-queue")).status_code == 401
    assert (await sclient.get("/sistema/google-oauth/status")).status_code == 401
    assert (await sclient.get("/sistema/cbo")).status_code == 401
    assert (await sclient.get("/sistema/sla-config")).status_code == 401


# ── access_logs ─────────────────────────────────────────────────────────────

async def test_access_log_registra_e_isola(sclient, db_session):
    await login_as(sclient, db_session, email="log-a@a.com")
    r = await sclient.post(
        "/sistema/access-logs",
        json={"acao": "login", "modulo": "auth", "descricao": "entrou"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["acao"] == "login"
    # Autoria preenchida do usuário logado, não do payload
    assert data["user_email"] == "log-a@a.com"
    assert data["user_id"] is not None

    lista = await sclient.get("/sistema/access-logs")
    assert lista.status_code == 200
    acoes = [x["acao"] for x in lista.json()]
    assert "login" in acoes

    # Outra empresa não vê o log
    await login_as(sclient, db_session, email="log-b@b.com")
    lista_b = await sclient.get("/sistema/access-logs")
    assert lista_b.status_code == 200
    assert all(x["user_email"] != "log-a@a.com" for x in lista_b.json())


# ── system_updates (GLOBAL) ──────────────────────────────────────────────────

async def test_system_update_escrita_requer_admin(sclient, db_session):
    # Usuário regular pode LER mas não ESCREVER
    await login_as(sclient, db_session, email="su-reg@x.com", role="cliente_torq")
    assert (await sclient.get("/sistema/system-updates")).status_code == 200

    r = await sclient.post(
        "/sistema/system-updates",
        json={"version": f"v-{uuid.uuid4().hex[:8]}", "title": "Hack"},
    )
    assert r.status_code == 403, r.text


async def test_system_update_admin_crud(sclient, db_session):
    await login_as(sclient, db_session, email="su-admin@x.com", role="admin_vertical")
    ver = f"v-{uuid.uuid4().hex[:8]}"
    r = await sclient.post(
        "/sistema/system-updates",
        json={"version": ver, "title": "Release", "is_active": True},
    )
    assert r.status_code == 201, r.text
    upd_id = r.json()["id"]
    assert r.json()["version"] == ver

    # Aparece na listagem autenticada
    lst = await sclient.get("/sistema/system-updates")
    assert any(u["id"] == upd_id for u in lst.json())

    # Update + delete
    r2 = await sclient.put(
        f"/sistema/system-updates/{upd_id}", json={"title": "Release v2"}
    )
    assert r2.status_code == 200
    assert r2.json()["title"] == "Release v2"

    r3 = await sclient.delete(f"/sistema/system-updates/{upd_id}")
    assert r3.status_code == 204
    assert (await sclient.get(f"/sistema/system-updates/{upd_id}")).status_code == 404


# ── user_update_views (por usuário) ──────────────────────────────────────────

async def test_marcar_update_visto_idempotente_e_isolado(sclient, db_session):
    # admin cria um update global
    await login_as(sclient, db_session, email="uv-admin@x.com", role="admin_vertical")
    ver = f"v-{uuid.uuid4().hex[:8]}"
    upd_id = (
        await sclient.post(
            "/sistema/system-updates", json={"version": ver, "title": "Novidade"}
        )
    ).json()["id"]

    # usuário A marca como visto duas vezes (idempotente)
    await login_as(sclient, db_session, email="uv-a@a.com")
    r1 = await sclient.post(f"/sistema/system-updates/{upd_id}/visto")
    assert r1.status_code == 201, r1.text
    r2 = await sclient.post(f"/sistema/system-updates/{upd_id}/visto")
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]  # mesmo registro

    minhas = await sclient.get("/sistema/system-updates/views/me")
    assert any(v["update_id"] == upd_id for v in minhas.json())

    # usuário B não vê a view de A
    await login_as(sclient, db_session, email="uv-b@b.com")
    minhas_b = await sclient.get("/sistema/system-updates/views/me")
    assert all(v["update_id"] != upd_id for v in minhas_b.json())


async def test_marcar_update_inexistente_404(sclient, db_session):
    await login_as(sclient, db_session, email="uv-404@x.com")
    r = await sclient.post(f"/sistema/system-updates/{uuid.uuid4()}/visto")
    assert r.status_code == 404


# ── import_queue ─────────────────────────────────────────────────────────────

async def test_import_queue_crud_e_isolamento(sclient, db_session):
    await login_as(sclient, db_session, email="imp-a@a.com")
    r = await sclient.post(
        "/sistema/import-queue",
        json={"tipo": "empresas", "total_rows": 10, "data": [{"x": 1}]},
    )
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["tipo"] == "empresas"
    assert item["total_rows"] == 10
    assert item["user_id"] is not None
    item_id = item["id"]

    # update de progresso
    r2 = await sclient.put(
        f"/sistema/import-queue/{item_id}",
        json={"status": "completed", "processed_rows": 10, "success_count": 10},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "completed"

    # empresa B não enxerga nem deleta
    await login_as(sclient, db_session, email="imp-b@b.com")
    assert all(
        x["id"] != item_id for x in (await sclient.get("/sistema/import-queue")).json()
    )
    assert (await sclient.delete(f"/sistema/import-queue/{item_id}")).status_code == 404


# ── google_oauth_tokens (sensível) ───────────────────────────────────────────

async def test_google_oauth_status_nunca_expoe_token(sclient, db_session):
    await login_as(sclient, db_session, email="goa@a.com")

    # Sem conexão
    r0 = await sclient.get("/sistema/google-oauth/status")
    assert r0.status_code == 200
    assert r0.json()["conectado"] is False

    # Salva tokens
    r1 = await sclient.put(
        "/sistema/google-oauth/tokens",
        json={
            "access_token": "SECRET_ACCESS",
            "refresh_token": "SECRET_REFRESH",
            "google_email": "g@gmail.com",
            "scope": "calendar",
        },
    )
    assert r1.status_code == 200, r1.text
    body = r1.json()
    assert body["conectado"] is True
    assert body["google_email"] == "g@gmail.com"
    # Tokens NUNCA na resposta
    assert "access_token" not in body
    assert "refresh_token" not in body

    r2 = await sclient.get("/sistema/google-oauth/status")
    assert "access_token" not in r2.json()
    assert "refresh_token" not in r2.json()

    # Revogar
    r3 = await sclient.delete("/sistema/google-oauth/tokens")
    assert r3.status_code == 204
    assert (await sclient.get("/sistema/google-oauth/status")).json()["conectado"] is False


# ── cbo_ocupacoes (global, leitura) ──────────────────────────────────────────

async def test_cbo_busca(sclient, db_session):
    # Insere uma ocupação de referência
    codigo = f"99{uuid.uuid4().int % 100000:05d}"
    db_session.add(
        m.CboOcupacoes(
            codigo=codigo,
            codigo_formatado=codigo,
            descricao="ENGENHEIRO DE TESTES SST",
        )
    )
    await db_session.commit()
    try:
        await login_as(sclient, db_session, email="cbo@a.com")
        r = await sclient.get("/sistema/cbo", params={"q": "ENGENHEIRO DE TESTES"})
        assert r.status_code == 200, r.text
        assert any("ENGENHEIRO DE TESTES" in c["descricao"] for c in r.json())

        r2 = await sclient.get("/sistema/cbo", params={"q": codigo})
        assert any(c["codigo"] == codigo for c in r2.json())
    finally:
        await db_session.execute(
            delete(m.CboOcupacoes).where(m.CboOcupacoes.codigo == codigo)
        )
        await db_session.commit()


# ── tickets_sla_config (empresa, singleton) ──────────────────────────────────

async def test_sla_config_default_e_upsert(sclient, db_session):
    await login_as(sclient, db_session, email="sla-a@a.com")

    # GET cria default
    r = await sclient.get("/sistema/sla-config")
    assert r.status_code == 200, r.text
    assert r.json()["prioridade_critica_horas"] == 4

    # PUT atualiza
    r2 = await sclient.put(
        "/sistema/sla-config", json={"prioridade_critica_horas": 2}
    )
    assert r2.status_code == 200
    assert r2.json()["prioridade_critica_horas"] == 2

    # Persistiu
    assert (await sclient.get("/sistema/sla-config")).json()["prioridade_critica_horas"] == 2
