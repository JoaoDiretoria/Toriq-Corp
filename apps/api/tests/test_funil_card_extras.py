"""Testes do módulo Funil Card Extras — orçamentos, propostas e comparações."""
import uuid

import pytest

from app.api.funil_card_extras import router as extras_router
from app.main import app


# ── Montar o router no app antes dos testes deste módulo ─────────────────────

@pytest.fixture(autouse=True, scope="module")
def _mount_extras_router():
    """Registra o router de extras no app de teste (uma única vez por módulo)."""
    # Evita registrar duas vezes se o módulo for importado múltiplas vezes
    already = any(
        getattr(r, "path", "").startswith("/funil/cards") and
        any(
            getattr(route, "path", "").endswith("/orcamentos")
            for route in getattr(r, "routes", [])
        )
        for r in app.routes
    )
    if not already:
        app.include_router(extras_router)
    yield


# ── Helper: criar funil + etapa + card ───────────────────────────────────────

async def _setup_card(client, email, suffix, setor_id=None):
    """Cria funil, etapa e card. Retorna (funil_id, etapa_id, card_id)."""
    # criar funil
    if setor_id is None:
        # busca o setor_id inserido via login_as — usamos um setor dummy
        setor_id = uuid.uuid4()

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


# ── Helper: login + setup ─────────────────────────────────────────────────────

async def _login_and_setup(client, db_session, email, suffix):
    from tests.helpers import login_as
    from sqlalchemy import text

    empresa_id = await login_as(client, db_session, email=email, role="cliente_torq")

    # Criar um setor para o funil
    setor_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_id), "eid": str(empresa_id), "nome": f"Setor{suffix}"},
    )
    await db_session.commit()

    _, _, card_id = await _setup_card(client, email, suffix, setor_id)
    return empresa_id, card_id, setor_id


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1 — Orçamentos: CRUD básico
# ═══════════════════════════════════════════════════════════════════════════════

async def test_criar_e_listar_orcamento(client, db_session):
    """Criar orçamento no card e listá-lo."""
    empresa_id, card_id, _ = await _login_and_setup(
        client, db_session, "orc1@orc.com", "orc1"
    )

    # Criar orçamento
    r = await client.post(
        f"/funil/cards/{card_id}/orcamentos",
        json={"cliente_nome": "Acme Ltda", "cidade_destino": "SP"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["cliente_nome"] == "Acme Ltda"
    assert body["card_id"] == card_id
    assert body["empresa_id"] == str(empresa_id)
    orc_id = body["id"]

    # Listar
    list_r = await client.get(f"/funil/cards/{card_id}/orcamentos")
    assert list_r.status_code == 200, list_r.text
    itens = list_r.json()
    assert len(itens) == 1
    assert itens[0]["id"] == orc_id


async def test_obter_atualizar_remover_orcamento(client, db_session):
    """GET, PUT e DELETE de orçamento."""
    _, card_id, _ = await _login_and_setup(
        client, db_session, "orc2@orc.com", "orc2"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/orcamentos",
        json={"cliente_nome": "Beta Corp"},
    )
    assert r.status_code == 201, r.text
    orc_id = r.json()["id"]

    # GET
    get_r = await client.get(f"/funil/cards/{card_id}/orcamentos/{orc_id}")
    assert get_r.status_code == 200
    assert get_r.json()["cliente_nome"] == "Beta Corp"

    # PUT
    put_r = await client.put(
        f"/funil/cards/{card_id}/orcamentos/{orc_id}",
        json={"cliente_nome": "Beta Corp Atualizado"},
    )
    assert put_r.status_code == 200
    assert put_r.json()["cliente_nome"] == "Beta Corp Atualizado"

    # DELETE
    del_r = await client.delete(f"/funil/cards/{card_id}/orcamentos/{orc_id}")
    assert del_r.status_code == 204

    # Verificar remoção
    list_r = await client.get(f"/funil/cards/{card_id}/orcamentos")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2 — Propostas: CRUD básico
# ═══════════════════════════════════════════════════════════════════════════════

async def test_criar_e_listar_proposta(client, db_session):
    """Criar proposta no card e listá-la."""
    empresa_id, card_id, _ = await _login_and_setup(
        client, db_session, "prop1@prop.com", "prop1"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/propostas",
        json={"titulo": "Proposta Comercial 2025"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["titulo"] == "Proposta Comercial 2025"
    assert body["card_id"] == card_id
    prop_id = body["id"]

    # Listar
    list_r = await client.get(f"/funil/cards/{card_id}/propostas")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1
    assert list_r.json()[0]["id"] == prop_id


async def test_atualizar_e_remover_proposta(client, db_session):
    """PUT e DELETE de proposta."""
    _, card_id, _ = await _login_and_setup(
        client, db_session, "prop2@prop.com", "prop2"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/propostas",
        json={"titulo": "Proposta Original"},
    )
    assert r.status_code == 201, r.text
    prop_id = r.json()["id"]

    # PUT
    put_r = await client.put(
        f"/funil/cards/{card_id}/propostas/{prop_id}",
        json={"titulo": "Proposta Atualizada", "orcamento_vinculado_tipo": "treinamento"},
    )
    assert put_r.status_code == 200
    assert put_r.json()["titulo"] == "Proposta Atualizada"
    assert put_r.json()["orcamento_vinculado_tipo"] == "treinamento"

    # DELETE
    del_r = await client.delete(f"/funil/cards/{card_id}/propostas/{prop_id}")
    assert del_r.status_code == 204

    list_r = await client.get(f"/funil/cards/{card_id}/propostas")
    assert len(list_r.json()) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 3 — Comparações: CRUD básico
# ═══════════════════════════════════════════════════════════════════════════════

async def test_criar_e_listar_comparacao(client, db_session):
    """Criar comparação no card e listá-la."""
    empresa_id, card_id, _ = await _login_and_setup(
        client, db_session, "cmp1@cmp.com", "cmp1"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/comparacoes",
        json={"campo1_treinamento": "Treinamento NR-10", "campo2_turmas": "3"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["campo1_treinamento"] == "Treinamento NR-10"
    assert body["card_id"] == card_id
    cmp_id = body["id"]

    list_r = await client.get(f"/funil/cards/{card_id}/comparacoes")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1
    assert list_r.json()[0]["id"] == cmp_id


async def test_atualizar_e_remover_comparacao(client, db_session):
    """PUT e DELETE de comparação."""
    _, card_id, _ = await _login_and_setup(
        client, db_session, "cmp2@cmp.com", "cmp2"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/comparacoes",
        json={"campo1_treinamento": "NR-35"},
    )
    assert r.status_code == 201, r.text
    cmp_id = r.json()["id"]

    # PUT
    put_r = await client.put(
        f"/funil/cards/{card_id}/comparacoes/{cmp_id}",
        json={"campo1_treinamento": "NR-35 Atualizado", "texto_pontos_fortes": "Economia"},
    )
    assert put_r.status_code == 200
    assert put_r.json()["campo1_treinamento"] == "NR-35 Atualizado"
    assert put_r.json()["texto_pontos_fortes"] == "Economia"

    # DELETE
    del_r = await client.delete(f"/funil/cards/{card_id}/comparacoes/{cmp_id}")
    assert del_r.status_code == 204

    list_r = await client.get(f"/funil/cards/{card_id}/comparacoes")
    assert len(list_r.json()) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 4 — Isolamento cross-tenant
# ═══════════════════════════════════════════════════════════════════════════════

async def test_orcamento_cross_tenant_retorna_404(client, db_session):
    """Empresa B não deve acessar orçamento em card da empresa A."""
    from tests.helpers import login_as
    from sqlalchemy import text

    # Empresa A: criar card + orçamento
    empresa_a_id = await login_as(client, db_session, email="ct_a@ct.com", role="cliente_torq")
    setor_a_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_a_id), "eid": str(empresa_a_id), "nome": "SetorA"},
    )
    await db_session.commit()
    _, _, card_a_id = await _setup_card(client, "ct_a@ct.com", "cta", setor_a_id)

    r = await client.post(
        f"/funil/cards/{card_a_id}/orcamentos",
        json={"cliente_nome": "Privado A"},
    )
    assert r.status_code == 201, r.text

    # Empresa B: logar
    empresa_b_id = await login_as(client, db_session, email="ct_b@ct.com", role="cliente_torq")

    # Tentar listar os orçamentos do card da empresa A → 404
    list_r = await client.get(f"/funil/cards/{card_a_id}/orcamentos")
    assert list_r.status_code == 404, (
        f"esperado 404, obtido {list_r.status_code}: {list_r.text}"
    )


async def test_proposta_cross_tenant_retorna_404(client, db_session):
    """Empresa B não deve acessar proposta em card da empresa A."""
    from tests.helpers import login_as
    from sqlalchemy import text

    # Empresa A
    empresa_a_id = await login_as(client, db_session, email="pct_a@pct.com", role="cliente_torq")
    setor_a_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_a_id), "eid": str(empresa_a_id), "nome": "SetorPA"},
    )
    await db_session.commit()
    _, _, card_a_id = await _setup_card(client, "pct_a@pct.com", "pcta", setor_a_id)
    await client.post(
        f"/funil/cards/{card_a_id}/propostas",
        json={"titulo": "Proposta Privada A"},
    )

    # Empresa B
    await login_as(client, db_session, email="pct_b@pct.com", role="cliente_torq")
    list_r = await client.get(f"/funil/cards/{card_a_id}/propostas")
    assert list_r.status_code == 404, (
        f"esperado 404, obtido {list_r.status_code}: {list_r.text}"
    )


async def test_comparacao_cross_tenant_retorna_404(client, db_session):
    """Empresa B não deve acessar comparação em card da empresa A."""
    from tests.helpers import login_as
    from sqlalchemy import text

    # Empresa A
    empresa_a_id = await login_as(client, db_session, email="cct_a@cct.com", role="cliente_torq")
    setor_a_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_a_id), "eid": str(empresa_a_id), "nome": "SetorCA"},
    )
    await db_session.commit()
    _, _, card_a_id = await _setup_card(client, "cct_a@cct.com", "ccta", setor_a_id)
    await client.post(
        f"/funil/cards/{card_a_id}/comparacoes",
        json={"campo1_treinamento": "NR-33"},
    )

    # Empresa B
    await login_as(client, db_session, email="cct_b@cct.com", role="cliente_torq")
    list_r = await client.get(f"/funil/cards/{card_a_id}/comparacoes")
    assert list_r.status_code == 404, (
        f"esperado 404, obtido {list_r.status_code}: {list_r.text}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 5 — Orçamentos SST: CRUD básico
# ═══════════════════════════════════════════════════════════════════════════════

async def test_criar_e_listar_orcamento_sst(client, db_session):
    """Criar orçamento SST no card e listá-lo."""
    empresa_id, card_id, _ = await _login_and_setup(
        client, db_session, "sst1@sst.com", "sst1"
    )

    r = await client.post(
        f"/funil/cards/{card_id}/orcamentos-sst",
        json={"itens": [{"nome": "PCMSO", "valor": 1500}]},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["card_id"] == card_id
    sst_id = body["id"]

    list_r = await client.get(f"/funil/cards/{card_id}/orcamentos-sst")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1
    assert list_r.json()[0]["id"] == sst_id
