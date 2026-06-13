"""Testes do módulo Toriq Vendas — FASE 0 (leads + tags + segmentos + import).

Cobre:
- CRUD de leads (criar/listar/atualizar/deletar em lote) + dedupe na criação.
- Import em lote com dedupe (dentro do lote e contra o banco).
- Filtros de listagem (status, busca, cidade, plataforma, tag_ids).
- CRUD de tags + add/remove de tags em lote.
- CRUD de segmentos + listagem aplicando filtros salvos.
- Isolamento cross-tenant (404 / não vaza entre empresas).
- 403 quando usuário sem empresa.
"""
import uuid

import pytest

from tests.helpers import login_as


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS — CRUD + dedupe
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_leads_crud(client, db_session):
    await login_as(client, db_session, email="vendas_crud@torq.com")

    # Criar
    r = await client.post(
        "/vendas/leads",
        json={
            "nome": "João",
            "empresa_nome": "Padaria do João",
            "telefone": "(11) 99999-1234",
            "email": "joao@padaria.com",
            "cidade": "São Paulo",
            "plataforma": "maps",
        },
    )
    assert r.status_code == 201, r.text
    lead = r.json()
    assert lead["nome"] == "João"
    assert lead["status"] == "novo"
    assert lead["dedupe_key"] == "tel:11999991234"
    lead_id = lead["id"]

    # Listar
    r = await client.get("/vendas/leads")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["id"] == lead_id

    # Atualizar (PATCH status)
    r = await client.patch(f"/vendas/leads/{lead_id}", json={"status": "contatado"})
    assert r.status_code == 200
    assert r.json()["status"] == "contatado"

    # Deletar em lote
    r = await client.request("DELETE", "/vendas/leads", json={"ids": [lead_id]})
    assert r.status_code == 204

    r = await client.get("/vendas/leads")
    assert r.json()["total"] == 0


@pytest.mark.anyio
async def test_lead_dedupe_na_criacao(client, db_session):
    await login_as(client, db_session, email="vendas_dedupe@torq.com")

    r = await client.post(
        "/vendas/leads",
        json={"nome": "A", "telefone": "11-98888-0000"},
    )
    assert r.status_code == 201

    # Mesmo telefone (formato diferente) → 409 duplicado.
    r = await client.post(
        "/vendas/leads",
        json={"nome": "B", "telefone": "(11) 98888 0000"},
    )
    assert r.status_code == 409, r.text

    # Email idêntico (case/trim) → 409.
    r = await client.post("/vendas/leads", json={"nome": "C", "email": "x@y.com"})
    assert r.status_code == 201
    r = await client.post("/vendas/leads", json={"nome": "D", "email": "  X@Y.COM "})
    assert r.status_code == 409


@pytest.mark.anyio
async def test_leads_filtros(client, db_session):
    await login_as(client, db_session, email="vendas_filtros@torq.com")

    await client.post("/vendas/leads", json={
        "nome": "Alpha", "telefone": "111", "cidade": "Rio", "plataforma": "maps", "status": "novo",
    })
    await client.post("/vendas/leads", json={
        "nome": "Beta", "telefone": "222", "cidade": "SP", "plataforma": "instagram", "status": "contatado",
    })

    # filtro por status
    r = await client.get("/vendas/leads", params={"status": "contatado"})
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nome"] == "Beta"

    # filtro por cidade
    r = await client.get("/vendas/leads", params={"cidade": "Rio"})
    assert r.json()["total"] == 1

    # filtro por plataforma
    r = await client.get("/vendas/leads", params={"plataforma": "instagram"})
    assert r.json()["total"] == 1

    # busca por nome
    r = await client.get("/vendas/leads", params={"busca": "alph"})
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nome"] == "Alpha"


# ═══════════════════════════════════════════════════════════════════════════════
# IMPORT — dedupe
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_import_com_dedupe(client, db_session):
    await login_as(client, db_session, email="vendas_import@torq.com")

    # Lead pré-existente.
    r = await client.post("/vendas/leads", json={"nome": "Existente", "telefone": "11999990000"})
    assert r.status_code == 201

    payload = {
        "leads": [
            {"nome": "Existente dup", "telefone": "(11) 99999-0000"},  # duplicado no banco
            {"nome": "Novo 1", "telefone": "11888887777"},
            {"nome": "Novo 1 again", "telefone": "11-88888-7777"},     # duplicado dentro do lote
            {"nome": "Sem chave"},                                      # sem dedupe → entra
            {"nome": "Sem chave 2"},                                    # sem dedupe → entra
        ]
    }
    r = await client.post("/vendas/leads/import", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 5
    assert body["duplicados"] == 2
    assert body["inseridos"] == 3

    # 1 (pré-existente) + 3 inseridos = 4
    r = await client.get("/vendas/leads")
    assert r.json()["total"] == 4


# ═══════════════════════════════════════════════════════════════════════════════
# TAGS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_tags_crud_e_atribuicao(client, db_session):
    await login_as(client, db_session, email="vendas_tags@torq.com")

    # Criar tag
    r = await client.post("/vendas/tags", json={"nome": "Quente", "cor": "#ff0000"})
    assert r.status_code == 201, r.text
    tag_id = r.json()["id"]

    # Duplicada → 409
    r = await client.post("/vendas/tags", json={"nome": "Quente"})
    assert r.status_code == 409

    # Listar
    r = await client.get("/vendas/tags")
    assert r.status_code == 200
    assert any(t["id"] == tag_id for t in r.json())

    # Lead para taguear
    r = await client.post("/vendas/leads", json={"nome": "Lead Tag", "telefone": "5551234"})
    lead_id = r.json()["id"]

    # Atribuir tag em lote
    r = await client.post("/vendas/leads/tags", json={"lead_ids": [lead_id], "tag_id": tag_id})
    assert r.status_code == 204

    # Filtrar por tag
    r = await client.get("/vendas/leads", params={"tag_ids": [tag_id]})
    assert r.json()["total"] == 1

    # Remover tag em lote
    r = await client.request(
        "DELETE", "/vendas/leads/tags", json={"lead_ids": [lead_id], "tag_id": tag_id}
    )
    assert r.status_code == 204
    r = await client.get("/vendas/leads", params={"tag_ids": [tag_id]})
    assert r.json()["total"] == 0

    # Deletar tag
    r = await client.delete(f"/vendas/tags/{tag_id}")
    assert r.status_code == 204
    r = await client.delete(f"/vendas/tags/{tag_id}")
    assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENTOS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_segmentos_crud_e_leads(client, db_session):
    await login_as(client, db_session, email="vendas_seg@torq.com")

    # Dois leads com status diferentes
    await client.post("/vendas/leads", json={"nome": "S1", "telefone": "1", "status": "novo"})
    await client.post("/vendas/leads", json={"nome": "S2", "telefone": "2", "status": "ganho"})

    # Criar segmento com filtro status=ganho
    r = await client.post(
        "/vendas/segmentos",
        json={"nome": "Ganhos", "filtros": {"status": "ganho"}, "cor": "#0f0"},
    )
    assert r.status_code == 201, r.text
    seg_id = r.json()["id"]

    # Listar
    r = await client.get("/vendas/segmentos")
    assert any(seg["id"] == seg_id for seg in r.json())

    # Leads do segmento (aplica filtro salvo)
    r = await client.get(f"/vendas/segmentos/{seg_id}/leads")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "S2"

    # Atualizar segmento (muda filtro)
    r = await client.put(
        f"/vendas/segmentos/{seg_id}", json={"filtros": {"status": "novo"}}
    )
    assert r.status_code == 200
    r = await client.get(f"/vendas/segmentos/{seg_id}/leads")
    assert r.json()["items"][0]["nome"] == "S1"

    # Deletar
    r = await client.delete(f"/vendas/segmentos/{seg_id}")
    assert r.status_code == 204
    r = await client.get(f"/vendas/segmentos/{seg_id}/leads")
    assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant_isolamento(client, db_session):
    # Empresa A cria lead + tag + segmento
    await login_as(client, db_session, email="tenant_a@torq.com")
    r = await client.post("/vendas/leads", json={"nome": "A-lead", "telefone": "9991"})
    lead_a = r.json()["id"]
    r = await client.post("/vendas/tags", json={"nome": "TagA"})
    tag_a = r.json()["id"]
    r = await client.post("/vendas/segmentos", json={"nome": "SegA", "filtros": {}})
    seg_a = r.json()["id"]

    # Empresa B faz login (nova empresa)
    await login_as(client, db_session, email="tenant_b@torq.com")

    # B não vê leads de A
    r = await client.get("/vendas/leads")
    assert r.json()["total"] == 0

    # B não atualiza lead de A
    r = await client.patch(f"/vendas/leads/{lead_a}", json={"status": "hack"})
    assert r.status_code == 404

    # B deletar em lote o lead de A não afeta A
    r = await client.request("DELETE", "/vendas/leads", json={"ids": [lead_a]})
    assert r.status_code == 204

    # B não usa tag de A
    r = await client.post("/vendas/leads/tags", json={"lead_ids": [lead_a], "tag_id": tag_a})
    assert r.status_code == 404

    # B não acessa segmento de A
    r = await client.get(f"/vendas/segmentos/{seg_a}/leads")
    assert r.status_code == 404
    r = await client.put(f"/vendas/segmentos/{seg_a}", json={"nome": "x"})
    assert r.status_code == 404
    r = await client.delete(f"/vendas/segmentos/{seg_a}")
    assert r.status_code == 404

    # A ainda enxerga seu lead intacto
    await login_as(client, db_session, email="tenant_a@torq.com")
    r = await client.get("/vendas/leads")
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["id"] == lead_a


# ═══════════════════════════════════════════════════════════════════════════════
# 403 sem empresa
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_sem_empresa_403(client, db_session):
    # admin_vertical sem empresa_id → 403 nas rotas de vendas.
    from app.models.user import User, UserRole
    from app.core.security import hash_password

    email = "admin_sem_empresa@torq.com"
    user = User(
        id=uuid.uuid4(),
        email=email,
        senha_hash=hash_password("segredo123"),
        nome="Admin Sem Empresa",
        role=UserRole.admin_vertical,
        empresa_id=None,
        ativo=True,
    )
    db_session.add(user)
    await db_session.commit()

    r = await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/leads")
    assert r.status_code == 403
