"""Testes do módulo Funil/Comercial avançado.

Cobre automações (+execuções), funis_configuracoes, funil_negocio_configuracoes,
comercial_funil, propostas comerciais (3 variantes) e atividades_unificadas (view).

Testes auto-contidos: montam o router no app uma vez por módulo, usam login_as +
as tabelas reais do test DB, e verificam isolamento por tenant + 404 cross-tenant.
"""
import uuid

import pytest
from sqlalchemy import text

from app.api.funil_comercial import router as fc_router
from app.main import app
from tests.helpers import login_as


@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(
        getattr(r, "path", "").startswith("/funil-comercial/automacoes")
        for r in app.routes
    )
    if not already:
        app.include_router(fc_router)
    yield


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _login(client, db_session, email):
    return await login_as(client, db_session, email=email, role="cliente_torq")


async def _criar_setor(db_session, empresa_id, suffix):
    setor_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_id), "eid": str(empresa_id), "nome": f"Setor{suffix}"},
    )
    await db_session.commit()
    return setor_id


async def _criar_funil_etapa_card(client, suffix, setor_id):
    """Cria funil + etapa + card via API. Retorna (funil_id, etapa_id, card_id)."""
    funil_r = await client.post(
        "/funil/funis",
        json={"nome": f"Funil {suffix}", "tipo": "negocio", "setor_id": str(setor_id)},
    )
    assert funil_r.status_code == 201, funil_r.text
    funil_id = funil_r.json()["id"]

    etapa_r = await client.post(
        "/funil/etapas",
        json={"funil_id": funil_id, "nome": "Etapa 1", "ordem": 0},
    )
    assert etapa_r.status_code == 201, etapa_r.text
    etapa_id = etapa_r.json()["id"]

    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": f"Card {suffix}"},
    )
    assert card_r.status_code == 201, card_r.text
    card_id = card_r.json()["id"]
    return funil_id, etapa_id, card_id


# ═══════════════════════════════════════════════════════════════════════════════
# Automações
# ═══════════════════════════════════════════════════════════════════════════════

async def test_automacao_crud_e_validacao_funil(client, db_session):
    empresa_id = await _login(client, db_session, "auto1@fc.com")
    setor_id = await _criar_setor(db_session, empresa_id, "auto1")
    funil_id, etapa_id, _ = await _criar_funil_etapa_card(client, "auto1", setor_id)

    # criar com funil_id + etapa_id válidos
    r = await client.post(
        "/funil-comercial/automacoes",
        json={
            "nome": "Mover ao ganhar",
            "tipo": "mover_etapa",
            "gatilho": "negocio_ganho",
            "funil_id": funil_id,
            "etapa_id": etapa_id,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_id)
    auto_id = body["id"]

    # listar
    lst = await client.get("/funil-comercial/automacoes")
    assert lst.status_code == 200
    assert any(a["id"] == auto_id for a in lst.json())

    # atualizar (sem FKs de parentesco no schema de update)
    put = await client.put(
        f"/funil-comercial/automacoes/{auto_id}",
        json={"nome": "Mover ao ganhar v2", "ativo": False},
    )
    assert put.status_code == 200
    assert put.json()["nome"] == "Mover ao ganhar v2"
    assert put.json()["ativo"] is False

    # deletar
    dl = await client.delete(f"/funil-comercial/automacoes/{auto_id}")
    assert dl.status_code == 204


async def test_automacao_funil_de_outro_tenant_404(client, db_session):
    # Empresa A cria funil
    empresa_a = await _login(client, db_session, "autoA@fc.com")
    setor_a = await _criar_setor(db_session, empresa_a, "autoA")
    funil_a, etapa_a, _ = await _criar_funil_etapa_card(client, "autoA", setor_a)

    # Empresa B tenta criar automação referenciando funil da empresa A → 404
    await _login(client, db_session, "autoB@fc.com")
    r = await client.post(
        "/funil-comercial/automacoes",
        json={
            "nome": "ataque",
            "tipo": "mover_etapa",
            "gatilho": "negocio_ganho",
            "funil_id": funil_a,
        },
    )
    assert r.status_code == 404, r.text


async def test_automacao_isolamento_tenant(client, db_session):
    empresa_a = await _login(client, db_session, "isoA@fc.com")
    r = await client.post(
        "/funil-comercial/automacoes",
        json={"nome": "A", "tipo": "criar_tarefa", "gatilho": "negocio_ganho"},
    )
    assert r.status_code == 201, r.text
    auto_a = r.json()["id"]

    # Empresa B não vê a automação de A
    await _login(client, db_session, "isoB@fc.com")
    lst = await client.get("/funil-comercial/automacoes")
    assert auto_a not in [a["id"] for a in lst.json()]
    # nem acessa diretamente
    assert (await client.get(f"/funil-comercial/automacoes/{auto_a}")).status_code == 404


async def test_automacao_execucao_via_automacao(client, db_session):
    empresa_id = await _login(client, db_session, "exec1@fc.com")
    setor_id = await _criar_setor(db_session, empresa_id, "exec1")
    _, _, card_id = await _criar_funil_etapa_card(client, "exec1", setor_id)

    auto = await client.post(
        "/funil-comercial/automacoes",
        json={"nome": "Auto", "tipo": "criar_tarefa", "gatilho": "negocio_ganho"},
    )
    auto_id = auto.json()["id"]

    # criar execução escopada via automacao (card_id validado)
    ex = await client.post(
        f"/funil-comercial/automacoes/{auto_id}/execucoes",
        json={"card_id": card_id, "executar_em": "2030-01-01T12:00:00Z"},
    )
    assert ex.status_code == 201, ex.text
    ex_id = ex.json()["id"]
    assert ex.json()["empresa_id"] == str(empresa_id)

    lst = await client.get(f"/funil-comercial/automacoes/{auto_id}/execucoes")
    assert lst.status_code == 200
    assert any(e["id"] == ex_id for e in lst.json())


async def test_execucao_card_de_outro_tenant_404(client, db_session):
    # Empresa A cria card
    empresa_a = await _login(client, db_session, "exA@fc.com")
    setor_a = await _criar_setor(db_session, empresa_a, "exA")
    _, _, card_a = await _criar_funil_etapa_card(client, "exA", setor_a)

    # Empresa B cria automação própria e tenta usar card de A → 404
    await _login(client, db_session, "exB@fc.com")
    auto = await client.post(
        "/funil-comercial/automacoes",
        json={"nome": "AutoB", "tipo": "criar_tarefa", "gatilho": "negocio_ganho"},
    )
    auto_b = auto.json()["id"]
    ex = await client.post(
        f"/funil-comercial/automacoes/{auto_b}/execucoes",
        json={"card_id": card_a, "executar_em": "2030-01-01T12:00:00Z"},
    )
    assert ex.status_code == 404, ex.text


# ═══════════════════════════════════════════════════════════════════════════════
# funis_configuracoes (escopada via funil)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_funil_configuracao_upsert_e_get(client, db_session):
    empresa_id = await _login(client, db_session, "cfg1@fc.com")
    setor_id = await _criar_setor(db_session, empresa_id, "cfg1")
    funil_id, _, _ = await _criar_funil_etapa_card(client, "cfg1", setor_id)

    # já existe config padrão criada com o funil → GET funciona
    g = await client.get(f"/funil-comercial/funis/{funil_id}/configuracao")
    assert g.status_code == 200, g.text
    assert g.json()["funil_id"] == funil_id

    # PUT atualiza
    p = await client.put(
        f"/funil-comercial/funis/{funil_id}/configuracao",
        json={"titulo_pagina": "Meu Funil", "modo_visualizacao": "lista"},
    )
    assert p.status_code == 200, p.text
    assert p.json()["titulo_pagina"] == "Meu Funil"
    assert p.json()["modo_visualizacao"] == "lista"


async def test_funil_configuracao_cross_tenant_404(client, db_session):
    empresa_a = await _login(client, db_session, "cfgA@fc.com")
    setor_a = await _criar_setor(db_session, empresa_a, "cfgA")
    funil_a, _, _ = await _criar_funil_etapa_card(client, "cfgA", setor_a)

    await _login(client, db_session, "cfgB@fc.com")
    g = await client.get(f"/funil-comercial/funis/{funil_a}/configuracao")
    assert g.status_code == 404, g.text
    p = await client.put(
        f"/funil-comercial/funis/{funil_a}/configuracao",
        json={"titulo_pagina": "hack"},
    )
    assert p.status_code == 404, p.text


# ═══════════════════════════════════════════════════════════════════════════════
# funil_negocio_configuracoes (empresa_id, CRUD genérico)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_negocio_configuracao_crud_e_isolamento(client, db_session):
    empresa_a = await _login(client, db_session, "negA@fc.com")
    r = await client.post(
        "/funil-comercial/negocio-configuracoes",
        json={"acao_etiquetas": False, "campo_valor_obrigatorio": True},
    )
    assert r.status_code == 201, r.text
    cfg_id = r.json()["id"]
    assert r.json()["empresa_id"] == str(empresa_a)

    # Empresa B não vê
    await _login(client, db_session, "negB@fc.com")
    lst = await client.get("/funil-comercial/negocio-configuracoes")
    assert cfg_id not in [c["id"] for c in lst.json()]
    assert (await client.get(f"/funil-comercial/negocio-configuracoes/{cfg_id}")).status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# comercial_funil (empresa_id nullable)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_comercial_funil_crud_e_isolamento(client, db_session):
    empresa_a = await _login(client, db_session, "comA@fc.com")
    r = await client.post(
        "/funil-comercial/comercial-funil",
        json={"nome_lead": "Lead Acme", "etapa": "lead", "valor_estimado": 5000},
    )
    assert r.status_code == 201, r.text
    item_id = r.json()["id"]
    assert r.json()["empresa_id"] == str(empresa_a)
    assert r.json()["nome_lead"] == "Lead Acme"

    # update
    p = await client.put(
        f"/funil-comercial/comercial-funil/{item_id}",
        json={"etapa": "proposta"},
    )
    assert p.status_code == 200
    assert p.json()["etapa"] == "proposta"

    # Empresa B isolada
    await _login(client, db_session, "comB@fc.com")
    lst = await client.get("/funil-comercial/comercial-funil")
    assert item_id not in [c["id"] for c in lst.json()]
    assert (await client.get(f"/funil-comercial/comercial-funil/{item_id}")).status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# Propostas comerciais (3 variantes)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("sub,extra", [
    ("treinamentos", {"modulo": "NR-35"}),
    ("servicos-sst", {"servicos": "PCMSO"}),
    ("vertical365", {"modulo": "365"}),
])
async def test_proposta_crud_com_card(client, db_session, sub, extra):
    empresa_id = await _login(client, db_session, f"prop-{sub}@fc.com")
    setor_id = await _criar_setor(db_session, empresa_id, f"prop{sub}")
    _, _, card_id = await _criar_funil_etapa_card(client, f"prop{sub}", setor_id)

    payload = {"identificador": f"PROP-{sub}", "card_id": card_id, **extra}
    r = await client.post(f"/funil-comercial/propostas/{sub}", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(empresa_id)
    assert body["card_id"] == card_id
    prop_id = body["id"]

    # listar
    lst = await client.get(f"/funil-comercial/propostas/{sub}")
    assert lst.status_code == 200
    assert any(p["id"] == prop_id for p in lst.json())

    # update (sem card_id no schema)
    p = await client.put(
        f"/funil-comercial/propostas/{sub}/{prop_id}",
        json={"titulo": "Atualizado", "status": "aprovada"},
    )
    assert p.status_code == 200
    assert p.json()["titulo"] == "Atualizado"

    # delete
    assert (await client.delete(f"/funil-comercial/propostas/{sub}/{prop_id}")).status_code == 204


@pytest.mark.parametrize("sub", ["treinamentos", "servicos-sst", "vertical365"])
async def test_proposta_card_de_outro_tenant_404(client, db_session, sub):
    empresa_a = await _login(client, db_session, f"propA-{sub}@fc.com")
    setor_a = await _criar_setor(db_session, empresa_a, f"propA{sub}")
    _, _, card_a = await _criar_funil_etapa_card(client, f"propA{sub}", setor_a)

    await _login(client, db_session, f"propB-{sub}@fc.com")
    r = await client.post(
        f"/funil-comercial/propostas/{sub}",
        json={"identificador": "HACK", "card_id": card_a},
    )
    assert r.status_code == 404, r.text


@pytest.mark.parametrize("sub", ["treinamentos", "servicos-sst", "vertical365"])
async def test_proposta_isolamento_tenant(client, db_session, sub):
    await _login(client, db_session, f"isoPropA-{sub}@fc.com")
    r = await client.post(
        f"/funil-comercial/propostas/{sub}",
        json={"identificador": f"ISO-{sub}"},
    )
    assert r.status_code == 201, r.text
    prop_a = r.json()["id"]

    await _login(client, db_session, f"isoPropB-{sub}@fc.com")
    lst = await client.get(f"/funil-comercial/propostas/{sub}")
    assert prop_a not in [p["id"] for p in lst.json()]
    assert (await client.get(f"/funil-comercial/propostas/{sub}/{prop_a}")).status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# atividades_unificadas (VIEW — somente leitura, filtrada por empresa_id)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_atividades_unificadas_leitura(client, db_session):
    await _login(client, db_session, "ativ1@fc.com")
    r = await client.get("/funil-comercial/atividades-unificadas")
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


async def test_atividades_unificadas_requer_auth(client):
    assert (await client.get("/funil-comercial/atividades-unificadas")).status_code == 401
