"""Testes auto-contidos do módulo Treinamentos — instrutores, empresas
parceiras, datas indisponíveis (filha), reconhecimento facial config e anexos
de card do funil.

As tabelas já existem no banco de teste (treinamentos.py). Os routers ainda não
estão montados no main.py — montamos via fixture autouse abaixo.

Cobre:
- CRUD básico de cada recurso
- Isolamento por tenant (empresa_id E empresa_sst_id)
- 404 cross-tenant
- Validação de FK (empresa_parceira_id) contra o tenant no create de instrutor
"""
import uuid

import pytest
from sqlalchemy import text

from tests.helpers import login_as


# ── Montagem dos routers no app de teste ──────────────────────────────────────

@pytest.fixture(autouse=True, scope="module")
def _mount_routers():
    from app.main import app
    from app.api.instrutores import (
        instrutores_router,
        parceiras_router,
        recon_facial_router,
        anexos_router,
    )

    def _has(prefix: str) -> bool:
        return any(getattr(r, "path", "").startswith(prefix) for r in app.routes)

    if not _has("/treinamentos/instrutores"):
        app.include_router(instrutores_router)
    if not _has("/treinamentos/empresas-parceiras"):
        app.include_router(parceiras_router)
    if not _has("/treinamentos/reconhecimento-facial-config"):
        app.include_router(recon_facial_router)
    # anexos compartilham o prefixo /funil/cards com outros módulos; checamos
    # especificamente pela rota de anexos.
    has_anexos = any(
        any(getattr(rt, "path", "").endswith("/anexos") for rt in getattr(r, "routes", []))
        for r in app.routes
    )
    if not has_anexos:
        app.include_router(anexos_router)
    yield


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _login(client, db_session, email):
    """Login; retorna empresa_id (== empresa_sst_id do tenant)."""
    return await login_as(client, db_session, email=email, role="cliente_torq")


async def _make_card(client, db_session, empresa_id, suffix):
    """Cria setor + funil + etapa + card; retorna card_id."""
    setor_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :eid, :nome)"),
        {"id": str(setor_id), "eid": str(empresa_id), "nome": f"Setor{suffix}"},
    )
    await db_session.commit()

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
    return card_r.json()["id"]


# ══════════════════════════════════════════════════════════════════════════════
# Instrutores — CRUD (tenant empresa_id)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_instrutor_crud(client, db_session):
    await _login(client, db_session, "inst1@t.com")

    r = await client.post(
        "/treinamentos/instrutores",
        json={"nome": "Carlos", "cpf_cnpj": "111.222.333-44", "email": "c@t.com"},
    )
    assert r.status_code == 201, r.text
    inst_id = r.json()["id"]

    r = await client.get("/treinamentos/instrutores")
    assert r.status_code == 200
    assert any(i["nome"] == "Carlos" for i in r.json())

    r = await client.get(f"/treinamentos/instrutores/{inst_id}")
    assert r.status_code == 200
    assert r.json()["email"] == "c@t.com"

    r = await client.put(
        f"/treinamentos/instrutores/{inst_id}", json={"telefone": "9999"}
    )
    assert r.status_code == 200
    assert r.json()["telefone"] == "9999"

    r = await client.delete(f"/treinamentos/instrutores/{inst_id}")
    assert r.status_code == 204
    r = await client.get(f"/treinamentos/instrutores/{inst_id}")
    assert r.status_code == 404


@pytest.mark.anyio
async def test_instrutor_cross_tenant_404(client, db_session):
    await _login(client, db_session, "inst_a@t.com")
    r = await client.post(
        "/treinamentos/instrutores",
        json={"nome": "Inst A", "cpf_cnpj": "1", "email": "a@t.com"},
    )
    assert r.status_code == 201
    inst_a = r.json()["id"]

    await _login(client, db_session, "inst_b@t.com")
    assert (await client.get(f"/treinamentos/instrutores/{inst_a}")).status_code == 404
    assert (
        await client.put(
            f"/treinamentos/instrutores/{inst_a}", json={"nome": "Hack"}
        )
    ).status_code == 404
    assert (await client.delete(f"/treinamentos/instrutores/{inst_a}")).status_code == 404

    # empresa B não vê o instrutor de A na listagem
    lista = (await client.get("/treinamentos/instrutores")).json()
    assert inst_a not in [i["id"] for i in lista]


@pytest.mark.anyio
async def test_instrutor_rejeita_parceira_de_outro_tenant(client, db_session):
    """Criar instrutor com empresa_parceira_id de outro tenant → 404."""
    # Empresa A cria uma parceira
    await _login(client, db_session, "par_a@t.com")
    r = await client.post(
        "/treinamentos/empresas-parceiras", json={"nome": "Parceira A"}
    )
    assert r.status_code == 201
    parceira_a = r.json()["id"]

    # Empresa B tenta usar a parceira de A → 404
    await _login(client, db_session, "par_b@t.com")
    r = await client.post(
        "/treinamentos/instrutores",
        json={
            "nome": "Inst B",
            "cpf_cnpj": "2",
            "email": "b@t.com",
            "empresa_parceira_id": parceira_a,
        },
    )
    assert r.status_code == 404, r.text

    # Com a própria parceira de B → 201
    r = await client.post(
        "/treinamentos/empresas-parceiras", json={"nome": "Parceira B"}
    )
    parceira_b = r.json()["id"]
    r = await client.post(
        "/treinamentos/instrutores",
        json={
            "nome": "Inst B",
            "cpf_cnpj": "2",
            "email": "b@t.com",
            "empresa_parceira_id": parceira_b,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["empresa_parceira_id"] == parceira_b


# ══════════════════════════════════════════════════════════════════════════════
# EmpresasParceiras — CRUD + isolamento empresa_sst_id
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_parceira_crud(client, db_session):
    await _login(client, db_session, "pc1@t.com")

    r = await client.post(
        "/treinamentos/empresas-parceiras",
        json={"nome": "Fornecedor X", "cnpj": "00.000/0001-00"},
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    # carimbou empresa_sst_id corretamente
    assert "empresa_sst_id" in r.json()

    r = await client.get("/treinamentos/empresas-parceiras")
    assert r.status_code == 200
    assert any(p["nome"] == "Fornecedor X" for p in r.json())

    r = await client.put(
        f"/treinamentos/empresas-parceiras/{pid}", json={"nome": "Fornecedor Y"}
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Fornecedor Y"

    r = await client.delete(f"/treinamentos/empresas-parceiras/{pid}")
    assert r.status_code == 204
    assert (
        await client.get(f"/treinamentos/empresas-parceiras/{pid}")
    ).status_code == 404


@pytest.mark.anyio
async def test_parceira_cross_tenant_404(client, db_session):
    """Tenant B não vê/edita parceira do tenant A (isolamento empresa_sst_id)."""
    await _login(client, db_session, "pca@t.com")
    r = await client.post(
        "/treinamentos/empresas-parceiras", json={"nome": "Parceira de A"}
    )
    assert r.status_code == 201
    pa = r.json()["id"]

    await _login(client, db_session, "pcb@t.com")
    assert (
        await client.get(f"/treinamentos/empresas-parceiras/{pa}")
    ).status_code == 404
    assert (
        await client.put(
            f"/treinamentos/empresas-parceiras/{pa}", json={"nome": "Hack"}
        )
    ).status_code == 404
    assert (
        await client.delete(f"/treinamentos/empresas-parceiras/{pa}")
    ).status_code == 404
    lista = (await client.get("/treinamentos/empresas-parceiras")).json()
    assert pa not in [p["id"] for p in lista]


# ══════════════════════════════════════════════════════════════════════════════
# InstrutorDatasIndisponiveis — filha de instrutores
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_datas_indisponiveis_crud(client, db_session):
    await _login(client, db_session, "dt1@t.com")
    r = await client.post(
        "/treinamentos/instrutores",
        json={"nome": "Inst Datas", "cpf_cnpj": "3", "email": "d@t.com"},
    )
    inst_id = r.json()["id"]

    r = await client.post(
        f"/treinamentos/instrutores/{inst_id}/datas",
        json={"data": "2026-07-01", "motivo": "Férias"},
    )
    assert r.status_code == 201, r.text
    data_id = r.json()["id"]

    r = await client.get(f"/treinamentos/instrutores/{inst_id}/datas")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.put(
        f"/treinamentos/instrutores/{inst_id}/datas/{data_id}",
        json={"status": "aprovado"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "aprovado"

    r = await client.delete(f"/treinamentos/instrutores/{inst_id}/datas/{data_id}")
    assert r.status_code == 204


@pytest.mark.anyio
async def test_datas_cross_tenant_404(client, db_session):
    """Tenant B não acessa datas de instrutor do tenant A."""
    await _login(client, db_session, "dta@t.com")
    r = await client.post(
        "/treinamentos/instrutores",
        json={"nome": "Inst A", "cpf_cnpj": "4", "email": "da@t.com"},
    )
    inst_a = r.json()["id"]
    r = await client.post(
        f"/treinamentos/instrutores/{inst_a}/datas",
        json={"data": "2026-08-01"},
    )
    assert r.status_code == 201

    await _login(client, db_session, "dtb@t.com")
    # listar datas do instrutor de A → 404 (instrutor não pertence a B)
    assert (
        await client.get(f"/treinamentos/instrutores/{inst_a}/datas")
    ).status_code == 404
    assert (
        await client.post(
            f"/treinamentos/instrutores/{inst_a}/datas",
            json={"data": "2026-08-02"},
        )
    ).status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# ReconhecimentoFacialConfig — tenant empresa_sst_id
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_recon_facial_crud(client, db_session):
    empresa_id = await _login(client, db_session, "rf1@t.com")

    # cliente_empresa_id é FK para empresas — usamos o próprio tenant como cliente
    r = await client.post(
        "/treinamentos/reconhecimento-facial-config",
        json={"cliente_empresa_id": str(empresa_id), "ativo": True},
    )
    assert r.status_code == 201, r.text
    cfg_id = r.json()["id"]
    assert r.json()["ativo"] is True
    assert "empresa_sst_id" in r.json()

    r = await client.get("/treinamentos/reconhecimento-facial-config")
    assert r.status_code == 200
    assert any(c["id"] == cfg_id for c in r.json())

    r = await client.put(
        f"/treinamentos/reconhecimento-facial-config/{cfg_id}",
        json={"ativo": False},
    )
    assert r.status_code == 200
    assert r.json()["ativo"] is False

    r = await client.delete(f"/treinamentos/reconhecimento-facial-config/{cfg_id}")
    assert r.status_code == 204
    assert (
        await client.get(f"/treinamentos/reconhecimento-facial-config/{cfg_id}")
    ).status_code == 404


@pytest.mark.anyio
async def test_recon_facial_cross_tenant_404(client, db_session):
    """Tenant B não vê/edita config do tenant A (isolamento empresa_sst_id)."""
    empresa_a = await _login(client, db_session, "rfa@t.com")
    r = await client.post(
        "/treinamentos/reconhecimento-facial-config",
        json={"cliente_empresa_id": str(empresa_a)},
    )
    assert r.status_code == 201
    cfg_a = r.json()["id"]

    await _login(client, db_session, "rfb@t.com")
    assert (
        await client.get(f"/treinamentos/reconhecimento-facial-config/{cfg_a}")
    ).status_code == 404
    assert (
        await client.put(
            f"/treinamentos/reconhecimento-facial-config/{cfg_a}",
            json={"ativo": True},
        )
    ).status_code == 404
    assert (
        await client.delete(f"/treinamentos/reconhecimento-facial-config/{cfg_a}")
    ).status_code == 404
    lista = (await client.get("/treinamentos/reconhecimento-facial-config")).json()
    assert cfg_a not in [c["id"] for c in lista]


# ══════════════════════════════════════════════════════════════════════════════
# FunilCardAnexos — filha de funil_cards (escopo via funis.empresa_id)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_anexos_crud(client, db_session):
    empresa_id = await _login(client, db_session, "anx1@t.com")
    card_id = await _make_card(client, db_session, empresa_id, "anx1")

    r = await client.post(
        f"/funil/cards/{card_id}/anexos",
        json={"nome": "doc.pdf", "arquivo_url": "http://x/doc.pdf"},
    )
    assert r.status_code == 201, r.text
    anexo_id = r.json()["id"]
    assert r.json()["nome"] == "doc.pdf"

    r = await client.get(f"/funil/cards/{card_id}/anexos")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.get(f"/funil/cards/{card_id}/anexos/{anexo_id}")
    assert r.status_code == 200

    r = await client.put(
        f"/funil/cards/{card_id}/anexos/{anexo_id}", json={"nome": "doc2.pdf"}
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "doc2.pdf"

    r = await client.delete(f"/funil/cards/{card_id}/anexos/{anexo_id}")
    assert r.status_code == 204
    assert (
        await client.get(f"/funil/cards/{card_id}/anexos/{anexo_id}")
    ).status_code == 404


@pytest.mark.anyio
async def test_anexos_cross_tenant_404(client, db_session):
    """Tenant B não acessa anexos de card do tenant A."""
    empresa_a = await _login(client, db_session, "anxa@t.com")
    card_a = await _make_card(client, db_session, empresa_a, "anxa")
    r = await client.post(
        f"/funil/cards/{card_a}/anexos", json={"nome": "secreto.pdf"}
    )
    assert r.status_code == 201

    await _login(client, db_session, "anxb@t.com")
    assert (await client.get(f"/funil/cards/{card_a}/anexos")).status_code == 404
    assert (
        await client.post(f"/funil/cards/{card_a}/anexos", json={"nome": "hack"})
    ).status_code == 404
