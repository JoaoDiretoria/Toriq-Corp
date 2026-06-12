"""Testes de integração para os 4 kanbans legados via fábrica."""
import uuid

import pytest

from tests.helpers import login_as


# ── Closer ────────────────────────────────────────────────────────────────────

async def test_closer_kanban(client, db_session):
    """Bootstrap → criar card → mover → verificar coluna."""
    await login_as(client, db_session, email="closer@test.com")

    resp = await client.post("/kanban/closer/bootstrap-colunas")
    assert resp.status_code == 201, resp.text
    assert resp.json()["criadas"] == 5

    cols = (await client.get("/kanban/closer/colunas")).json()
    assert len(cols) == 5

    card = (
        await client.post(
            "/kanban/closer",
            json={"titulo": "Lead X", "coluna_id": cols[0]["id"]},
        )
    ).json()
    assert card["titulo"] == "Lead X"
    assert card["coluna_id"] == cols[0]["id"]

    moved = await client.post(
        f"/kanban/closer/{card['id']}/mover",
        json={"coluna_destino_id": cols[1]["id"]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == cols[1]["id"]

    # Atualizar título (não inclui coluna_id — anti mass-assignment)
    upd = await client.put(
        f"/kanban/closer/{card['id']}",
        json={"titulo": "Lead Y"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["titulo"] == "Lead Y"

    # Deletar
    del_resp = await client.delete(f"/kanban/closer/{card['id']}")
    assert del_resp.status_code == 204


# ── Prospecção ────────────────────────────────────────────────────────────────

async def test_prospeccao_kanban(client, db_session):
    """Bootstrap → criar card com lead_numero → mover."""
    await login_as(client, db_session, email="prosp@test.com")

    resp = await client.post("/kanban/prospeccao/bootstrap-colunas")
    assert resp.status_code == 201, resp.text
    assert resp.json()["criadas"] == 5

    cols = (await client.get("/kanban/prospeccao/colunas")).json()
    assert len(cols) == 5

    card = (
        await client.post(
            "/kanban/prospeccao",
            json={
                "titulo": "Prospecção ABC",
                "coluna_id": cols[0]["id"],
                "lead_numero": 1,
            },
        )
    ).json()
    assert card["titulo"] == "Prospecção ABC"
    assert card["lead_numero"] == 1

    moved = await client.post(
        f"/kanban/prospeccao/{card['id']}/mover",
        json={"coluna_destino_id": cols[1]["id"]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == cols[1]["id"]


# ── Pós-Venda ─────────────────────────────────────────────────────────────────

async def test_pos_venda_kanban(client, db_session):
    """Bootstrap → criar card → mover."""
    await login_as(client, db_session, email="posvenda@test.com")

    resp = await client.post("/kanban/pos-venda/bootstrap-colunas")
    assert resp.status_code == 201, resp.text
    assert resp.json()["criadas"] == 5

    cols = (await client.get("/kanban/pos-venda/colunas")).json()
    assert len(cols) == 5

    card = (
        await client.post(
            "/kanban/pos-venda",
            json={"titulo": "Cliente PV", "coluna_id": cols[0]["id"]},
        )
    ).json()
    assert card["titulo"] == "Cliente PV"

    moved = await client.post(
        f"/kanban/pos-venda/{card['id']}/mover",
        json={"coluna_destino_id": cols[1]["id"]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == cols[1]["id"]


# ── Cross-Selling ─────────────────────────────────────────────────────────────

async def test_cross_selling_kanban(client, db_session):
    """Bootstrap → criar card → mover."""
    await login_as(client, db_session, email="cross@test.com")

    resp = await client.post("/kanban/cross-selling/bootstrap-colunas")
    assert resp.status_code == 201, resp.text
    assert resp.json()["criadas"] == 5

    cols = (await client.get("/kanban/cross-selling/colunas")).json()
    assert len(cols) == 5

    card = (
        await client.post(
            "/kanban/cross-selling",
            json={"titulo": "Oportunidade CS", "coluna_id": cols[0]["id"]},
        )
    ).json()
    assert card["titulo"] == "Oportunidade CS"

    moved = await client.post(
        f"/kanban/cross-selling/{card['id']}/mover",
        json={"coluna_destino_id": cols[1]["id"]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == cols[1]["id"]


# ── Atividades / Etiquetas / vínculos card↔etiqueta ───────────────────────────

async def test_closer_atividades_etiquetas(client, db_session):
    await login_as(client, db_session, email="ativ@test.com")
    await client.post("/kanban/closer/bootstrap-colunas")
    cols = (await client.get("/kanban/closer/colunas")).json()
    card = (
        await client.post(
            "/kanban/closer", json={"titulo": "Card A", "coluna_id": cols[0]["id"]}
        )
    ).json()
    cid = card["id"]

    # Atividades: criar (com prazo date), listar, atualizar, deletar
    a = await client.post(
        f"/kanban/closer/{cid}/atividades",
        json={"tipo": "ligacao", "descricao": "Ligar", "prazo": "2026-12-31"},
    )
    assert a.status_code == 201, a.text
    aid = a.json()["id"]
    assert a.json()["card_id"] == cid and a.json()["tipo"] == "ligacao"

    lst = await client.get(f"/kanban/closer/{cid}/atividades")
    assert lst.status_code == 200 and any(x["id"] == aid for x in lst.json())

    upd = await client.put(
        f"/kanban/closer/{cid}/atividades/{aid}", json={"concluida": True}
    )
    assert upd.status_code == 200 and upd.json()["concluida"] is True
    assert (await client.delete(f"/kanban/closer/{cid}/atividades/{aid}")).status_code == 204

    # Etiquetas (defs) + vínculo card↔etiqueta
    et = await client.post("/kanban/closer/etiquetas", json={"nome": "Quente", "cor": "#f00"})
    assert et.status_code == 201, et.text
    eid = et.json()["id"]
    assert any(x["id"] == eid for x in (await client.get("/kanban/closer/etiquetas")).json())

    link = await client.post(f"/kanban/closer/{cid}/etiquetas", json={"etiqueta_id": eid})
    assert link.status_code == 201, link.text
    # idempotente: relinkar não duplica
    assert (await client.post(f"/kanban/closer/{cid}/etiquetas", json={"etiqueta_id": eid})).status_code == 201
    links = (await client.get(f"/kanban/closer/{cid}/etiquetas")).json()
    assert len(links) == 1 and links[0]["etiqueta_id"] == eid

    assert (await client.delete(f"/kanban/closer/{cid}/etiquetas/{eid}")).status_code == 204
    assert (await client.get(f"/kanban/closer/{cid}/etiquetas")).json() == []


async def test_atividades_cross_tenant_404(client, db_session):
    """Card de outra empresa → 404 ao listar/criar atividades."""
    import uuid as _uuid
    await login_as(client, db_session, email="ativ_b@test.com", role="cliente_torq")
    fake_card = _uuid.uuid4()
    assert (await client.get(f"/kanban/closer/{fake_card}/atividades")).status_code == 404
    assert (
        await client.post(f"/kanban/closer/{fake_card}/atividades", json={"tipo": "nota"})
    ).status_code == 404


# ── Isolamento cross-empresa ──────────────────────────────────────────────────

async def test_closer_isolamento_cross_empresa(client, db_session):
    """Card de empresa A não deve ser visível para empresa B."""
    from app.models.generated import Empresas as Empresa

    emp_a = Empresa(id=uuid.uuid4(), nome="EmpA", tipo="sst")
    emp_b = Empresa(id=uuid.uuid4(), nome="EmpB", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, empresa_id: uuid.UUID):
        await client.post(
            "/auth/register",
            json={
                "email": email,
                "password": "segredo123",
                "nome": email,
                "role": "cliente_torq",
                "empresa_id": str(empresa_id),
            },
        )
        await client.post(
            "/auth/login", json={"email": email, "password": "segredo123"}
        )

    await _reg_login("iso_a@test.com", emp_a.id)
    await client.post("/kanban/closer/bootstrap-colunas")
    cols_a = (await client.get("/kanban/closer/colunas")).json()
    card_a = (
        await client.post(
            "/kanban/closer",
            json={"titulo": "card_emp_a", "coluna_id": cols_a[0]["id"]},
        )
    ).json()

    await _reg_login("iso_b@test.com", emp_b.id)

    # Empresa B não deve ver card de A
    cards_b = (await client.get("/kanban/closer")).json()
    ids_b = [c["id"] for c in cards_b]
    assert card_a["id"] not in ids_b

    # Empresa B não deve conseguir mover card de A
    resp = await client.post(
        f"/kanban/closer/{card_a['id']}/mover",
        json={"coluna_destino_id": cols_a[0]["id"]},
    )
    assert resp.status_code == 404
