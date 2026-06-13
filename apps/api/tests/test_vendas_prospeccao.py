"""Testes do módulo Toriq Vendas — FASE 1 (Prospecção via Apify).

A rede da Apify é SEMPRE mockada via monkeypatch (substituímos os métodos async
de ApifyClient por fakes). Nenhum teste faz chamada HTTP real.

Cobre:
- PUT + GET /vendas/config: token mascarado, nunca vaza o segredo em claro.
- /vendas/scraping/start: cria job (status mapeado do run).
- /vendas/scraping/status: sincroniza status + total_captados.
- /vendas/scraping/results: normaliza + dedupe + importa em vendas_leads com
  origem='prospeccao'.
- /vendas/jobs: listagem empresa-scoped.
- /vendas/jobs/{id}/cancel: aborta run e marca aborted.
- Cross-tenant: empresa B não enxerga/acessa job da empresa A.

NOTA (integrador): os testes de /scraping/results exigem a coluna ``job_id`` em
``vendas_leads`` (migration fase1). Rode a migration ANTES de rodar a suíte.
"""
import uuid

import pytest

from app.integrations import apify as apify_mod
from tests.helpers import login_as


# ───────────────────────────────────────────────────────────────────────────────
# Fakes de rede da Apify (substituem os métodos async de ApifyClient).
# ───────────────────────────────────────────────────────────────────────────────

def _patch_apify(
    monkeypatch,
    *,
    run=None,
    get_run=None,
    dataset_items=None,
    abort=None,
):
    """Substitui os métodos de rede de ApifyClient por fakes async."""
    run = run or {
        "id": "run_123",
        "status": "RUNNING",
        "defaultDatasetId": "ds_123",
    }
    get_run = get_run or {
        "id": "run_123",
        "status": "SUCCEEDED",
        "defaultDatasetId": "ds_123",
        "stats": {"itemCount": 2},
    }
    dataset_items = dataset_items if dataset_items is not None else []
    abort = abort or {"id": "run_123", "status": "ABORTED"}

    async def fake_run_actor(self, actor_id, run_input):
        return run

    async def fake_get_run(self, run_id):
        return get_run

    async def fake_get_dataset_items(self, dataset_id, limit=1000):
        return dataset_items

    async def fake_abort_run(self, run_id):
        return abort

    monkeypatch.setattr(apify_mod.ApifyClient, "run_actor", fake_run_actor)
    monkeypatch.setattr(apify_mod.ApifyClient, "get_run", fake_get_run)
    monkeypatch.setattr(
        apify_mod.ApifyClient, "get_dataset_items", fake_get_dataset_items
    )
    monkeypatch.setattr(apify_mod.ApifyClient, "abort_run", fake_abort_run)


async def _set_token(client, token="apify_token_supersecreto_abcd"):
    r = await client.put("/vendas/config", json={"apify_token": token})
    assert r.status_code == 200, r.text
    return r.json()


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_config_get_vazia(client, db_session):
    await login_as(client, db_session, email="prosp_cfg_vazia@torq.com")
    r = await client.get("/vendas/config")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["apify_token_set"] is False
    assert body["apify_token_masked"] is None
    assert body["actors"] is None


@pytest.mark.anyio
async def test_config_put_get_mascara_token(client, db_session):
    await login_as(client, db_session, email="prosp_cfg@torq.com")

    token = "apify_token_supersecreto_abcd"
    r = await client.put(
        "/vendas/config",
        json={"apify_token": token, "actors": {"google": "org~meu-actor"}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["apify_token_set"] is True
    # Mascarado: nunca o token em claro, mas termina nos 4 últimos chars.
    assert body["apify_token_masked"] != token
    assert body["apify_token_masked"].endswith("abcd")
    assert token not in body["apify_token_masked"]
    assert body["actors"] == {"google": "org~meu-actor"}

    # GET reflete o mesmo (sem vazar segredo).
    r = await client.get("/vendas/config")
    body = r.json()
    assert body["apify_token_set"] is True
    assert token not in (body["apify_token_masked"] or "")

    # Limpar token.
    r = await client.put("/vendas/config", json={"clear_apify_token": True})
    assert r.status_code == 200
    body = r.json()
    assert body["apify_token_set"] is False
    assert body["apify_token_masked"] is None
    # actors permanece.
    assert body["actors"] == {"google": "org~meu-actor"}


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPING — start
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_scraping_start_sem_token_400(client, db_session):
    await login_as(client, db_session, email="prosp_start_notoken@torq.com")
    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "google", "parametros": {"termo": "padaria", "max": 5}},
    )
    assert r.status_code == 400, r.text


@pytest.mark.anyio
async def test_scraping_start_cria_job(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_start@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)

    r = await client.post(
        "/vendas/scraping/start",
        json={
            "plataforma": "google",
            "parametros": {"termo": "padaria", "cidade": "SP", "max": 5},
            "tag_nome": "Prospecção SP",
        },
    )
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["plataforma"] == "google"
    assert job["apify_run_id"] == "run_123"
    assert job["apify_dataset_id"] == "ds_123"
    assert job["status"] == "running"  # RUNNING → running
    assert job["tag_id"] is not None

    # Tag foi criada (get-or-create).
    r = await client.get("/vendas/tags")
    assert any(t["nome"] == "Prospecção SP" for t in r.json())


@pytest.mark.anyio
async def test_scraping_start_plataforma_invalida_400(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_start_inval@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)

    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "plataforma_inexistente", "parametros": {}},
    )
    assert r.status_code == 400, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPING — status
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_scraping_status_atualiza(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_status@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)

    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "google", "parametros": {"termo": "x", "max": 5}},
    )
    job_id = r.json()["id"]
    assert r.json()["status"] == "running"

    # get_run fake devolve SUCCEEDED + itemCount=2.
    r = await client.post("/vendas/scraping/status", json={"job_id": job_id})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["job_id"] == job_id
    assert body["status"] == "succeeded"
    assert body["total_captados"] == 2


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPING — results (normaliza + dedupe + importa)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_scraping_results_importa_e_dedupe(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_results@torq.com")
    await _set_token(client)

    # Dataset do Google Maps: 2 únicos + 1 duplicado (mesmo telefone).
    items = [
        {"title": "Padaria A", "phone": "(11) 1111-1111", "city": "SP", "state": "SP", "totalScore": 4.5},
        {"title": "Padaria B", "phone": "(11) 2222-2222", "city": "RJ", "state": "RJ"},
        {"title": "Padaria A dup", "phoneUnformatted": "1111111111", "city": "SP"},
    ]
    _patch_apify(
        monkeypatch,
        run={"id": "run_r", "status": "RUNNING", "defaultDatasetId": "ds_r"},
        get_run={"id": "run_r", "status": "SUCCEEDED", "defaultDatasetId": "ds_r", "stats": {"itemCount": 3}},
        dataset_items=items,
    )

    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "google", "parametros": {"termo": "padaria", "max": 5}},
    )
    job_id = r.json()["id"]

    # Sincroniza para status=succeeded.
    r = await client.post("/vendas/scraping/status", json={"job_id": job_id})
    assert r.json()["status"] == "succeeded"

    # Importa resultados.
    r = await client.post("/vendas/scraping/results", json={"job_id": job_id})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    # "Padaria A" e "Padaria A dup" têm o mesmo telefone (11 1111111) → 1 dup.
    assert body["inseridos"] == 2
    assert body["duplicados"] == 1

    # Viraram leads com origem='prospeccao'.
    r = await client.get("/vendas/leads")
    leads = r.json()["items"]
    assert r.json()["total"] == 2
    assert all(lead["origem"] == "prospeccao" for lead in leads)
    nomes = {lead["empresa_nome"] for lead in leads}
    assert nomes == {"Padaria A", "Padaria B"}

    # Job atualizado: imported + contadores.
    r = await client.get("/vendas/jobs")
    job = next(j for j in r.json() if j["id"] == job_id)
    assert job["status"] == "imported"
    assert job["total_importados"] == 2
    assert job["total_duplicados"] == 1


@pytest.mark.anyio
async def test_scraping_results_409_se_nao_concluido(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_results_409@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)

    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "google", "parametros": {"termo": "x", "max": 5}},
    )
    job_id = r.json()["id"]  # status running

    r = await client.post("/vendas/scraping/results", json={"job_id": job_id})
    assert r.status_code == 409, r.text

    # force=True ignora o status (dataset vazio → 0 leads).
    r = await client.post(
        "/vendas/scraping/results", json={"job_id": job_id, "force": True}
    )
    assert r.status_code == 200, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# JOBS — list + cancel
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_jobs_list_e_cancel(client, db_session, monkeypatch):
    await login_as(client, db_session, email="prosp_jobs@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)

    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "instagram", "parametros": {"termo": "x", "max": 5}},
    )
    job_id = r.json()["id"]

    r = await client.get("/vendas/jobs")
    assert r.status_code == 200
    assert any(j["id"] == job_id for j in r.json())

    # Cancel (job em running → abort_run + status aborted).
    r = await client.post(f"/vendas/jobs/{job_id}/cancel")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "aborted"
    assert body["finished_at"] is not None

    # Cancel de job inexistente → 404.
    r = await client.post(f"/vendas/jobs/{uuid.uuid4()}/cancel")
    assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant_jobs(client, db_session, monkeypatch):
    # Empresa A cria um job.
    await login_as(client, db_session, email="prosp_tenant_a@torq.com")
    await _set_token(client)
    _patch_apify(monkeypatch)
    r = await client.post(
        "/vendas/scraping/start",
        json={"plataforma": "google", "parametros": {"termo": "x", "max": 5}},
    )
    job_a = r.json()["id"]

    # Empresa B (nova) não enxerga nem acessa o job de A.
    await login_as(client, db_session, email="prosp_tenant_b@torq.com")

    r = await client.get("/vendas/jobs")
    assert all(j["id"] != job_a for j in r.json())

    r = await client.post("/vendas/scraping/status", json={"job_id": job_a})
    assert r.status_code == 404

    r = await client.post("/vendas/scraping/results", json={"job_id": job_a, "force": True})
    assert r.status_code == 404

    r = await client.post(f"/vendas/jobs/{job_a}/cancel")
    assert r.status_code == 404

    # B também não vê config de A.
    r = await client.get("/vendas/config")
    assert r.json()["apify_token_set"] is False


@pytest.mark.anyio
async def test_sem_empresa_403(client, db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    email = "prosp_sem_empresa@torq.com"
    user = User(
        id=uuid.uuid4(),
        email=email,
        senha_hash=hash_password("segredo123"),
        nome="Sem Empresa",
        role=UserRole.admin_vertical,
        empresa_id=None,
        ativo=True,
    )
    db_session.add(user)
    await db_session.commit()

    r = await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/config")
    assert r.status_code == 403
