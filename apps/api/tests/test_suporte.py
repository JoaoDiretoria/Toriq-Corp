"""Testes para o módulo Tickets/Suporte.

Self-contained: registra o router em app.main.app — seguindo exatamente o
padrão de tests/test_kanban_factory.py. As tabelas já fazem parte do schema
real do banco de teste (Postgres).

Cobertura:
1. test_suporte_requer_auth          — rotas retornam 401 sem autenticação
2. test_criar_ticket                 — POST /suporte/tickets cria ticket
3. test_listar_tickets               — GET /suporte/tickets lista tickets da empresa
4. test_adicionar_comentario         — POST /suporte/tickets/{id}/comentarios
5. test_listar_comentarios           — GET  /suporte/tickets/{id}/comentarios
6. test_cross_tenant_isolamento      — empresa B não acessa ticket de empresa A (404)
7. test_sla_config_upsert            — GET + PUT /suporte/sla-config
"""
import uuid

import pytest

from tests.helpers import login_as


async def _ensure_router():
    """Registra o router de suporte em app.main.app (idempotente)."""
    from app.main import app
    prefix_exists = any(r.path.startswith("/suporte") for r in app.routes)
    if not prefix_exists:
        from app.api.suporte import router as suporte_router
        app.include_router(suporte_router)


# ── Fixture: registra router ──────────────────────────────────────────────────

@pytest.fixture
async def sclient(db_session, client):
    """Fixture auto-setup: router de suporte registrado."""
    await _ensure_router()
    return client


# ── Helpers de autenticação ───────────────────────────────────────────────────

async def _criar_empresa_e_logar(client, db_session, email: str, nome_empresa: str = "Empresa Teste"):
    # Note: suporte tests historically used "senha123" — kept for isolation consistency
    return await login_as(
        client, db_session, email=email, password="senha123", nome=f"Usuario {email}"
    )


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_suporte_requer_auth(sclient):
    """Rotas devem retornar 401 sem autenticação."""
    assert (await sclient.get("/suporte/tickets")).status_code == 401
    assert (await sclient.post("/suporte/tickets", json={})).status_code == 401
    assert (await sclient.get("/suporte/sla-config")).status_code == 401


async def test_criar_ticket(sclient, db_session):
    """POST /suporte/tickets cria ticket com empresa_solicitante_id correto."""
    await _criar_empresa_e_logar(sclient, db_session, "criador@test.com", "EmpresaCriar")

    payload = {
        "tipo": "bug",
        "titulo": "Erro na tela principal",
        "descricao": "O sistema exibe erro 500 ao acessar o dashboard.",
        "prioridade": "alta",
    }
    resp = await sclient.post("/suporte/tickets", json=payload)
    assert resp.status_code == 201, resp.text

    data = resp.json()
    assert data["titulo"] == "Erro na tela principal"
    assert data["tipo"] == "bug"
    assert data["prioridade"] == "alta"
    assert data["status"] == "aberto"
    assert data["empresa_solicitante_id"] is not None


async def test_listar_tickets(sclient, db_session):
    """GET /suporte/tickets lista apenas tickets da empresa autenticada."""
    await _criar_empresa_e_logar(sclient, db_session, "listador@test.com", "EmpresaListar")

    # Cria 2 tickets
    for i in range(2):
        await sclient.post(
            "/suporte/tickets",
            json={
                "tipo": "duvida",
                "titulo": f"Duvida {i}",
                "descricao": f"Descricao da duvida {i}.",
            },
        )

    resp = await sclient.get("/suporte/tickets")
    assert resp.status_code == 200, resp.text
    tickets = resp.json()
    assert len(tickets) >= 2
    assert all(t["tipo"] == "duvida" for t in tickets)


async def test_adicionar_comentario(sclient, db_session):
    """POST /suporte/tickets/{id}/comentarios adiciona comentário ao ticket."""
    await _criar_empresa_e_logar(sclient, db_session, "comentador@test.com", "EmpresaComent")

    # Cria ticket
    r = await sclient.post(
        "/suporte/tickets",
        json={
            "tipo": "sugestao",
            "titulo": "Melhoria de UX",
            "descricao": "Seria legal ter um botao de exportar.",
        },
    )
    assert r.status_code == 201, r.text
    ticket_id = r.json()["id"]

    # Adiciona comentário
    resp = await sclient.post(
        f"/suporte/tickets/{ticket_id}/comentarios",
        json={"conteudo": "Vamos verificar isso na proxima sprint."},
    )
    assert resp.status_code == 201, resp.text

    cdata = resp.json()
    assert cdata["conteudo"] == "Vamos verificar isso na proxima sprint."
    assert cdata["ticket_id"] == ticket_id
    assert cdata["interno"] is False


async def test_listar_comentarios(sclient, db_session):
    """GET /suporte/tickets/{id}/comentarios retorna comentários do ticket."""
    await _criar_empresa_e_logar(sclient, db_session, "listcoment@test.com", "EmpresaListComent")

    # Cria ticket
    r = await sclient.post(
        "/suporte/tickets",
        json={
            "tipo": "problema_tecnico",
            "titulo": "Falha de conexao",
            "descricao": "Sistema cai ao exportar PDF.",
        },
    )
    assert r.status_code == 201
    ticket_id = r.json()["id"]

    # Cria 2 comentários
    for msg in ["Primeira resposta.", "Segunda resposta."]:
        await sclient.post(
            f"/suporte/tickets/{ticket_id}/comentarios",
            json={"conteudo": msg},
        )

    resp = await sclient.get(f"/suporte/tickets/{ticket_id}/comentarios")
    assert resp.status_code == 200, resp.text
    comentarios = resp.json()
    assert len(comentarios) == 2
    conteudos = {c["conteudo"] for c in comentarios}
    assert "Primeira resposta." in conteudos
    assert "Segunda resposta." in conteudos


async def test_cross_tenant_isolamento(sclient, db_session):
    """Empresa B não pode acessar ticket criado pela empresa A (404)."""
    await _criar_empresa_e_logar(
        sclient, db_session, "empresa_a_user@test.com", "EmpresaA-Iso"
    )

    # Empresa A cria ticket
    r = await sclient.post(
        "/suporte/tickets",
        json={
            "tipo": "bug",
            "titulo": "Ticket sigiloso da empresa A",
            "descricao": "So A pode ver isso.",
        },
    )
    assert r.status_code == 201
    ticket_a_id = r.json()["id"]

    # Empresa A lista e vê o ticket
    lista_a = (await sclient.get("/suporte/tickets")).json()
    ids_a = [t["id"] for t in lista_a]
    assert ticket_a_id in ids_a

    # Loga como empresa B
    await _criar_empresa_e_logar(
        sclient, db_session, "empresa_b_user@test.com", "EmpresaB-Iso"
    )

    # Empresa B lista e NÃO vê ticket de A
    lista_b = (await sclient.get("/suporte/tickets")).json()
    ids_b = [t["id"] for t in lista_b]
    assert ticket_a_id not in ids_b, "Ticket da empresa A visivel para empresa B!"

    # Empresa B tenta acessar diretamente o ticket de A → 404
    resp = await sclient.get(f"/suporte/tickets/{ticket_a_id}")
    assert resp.status_code == 404, f"Esperado 404, recebeu {resp.status_code}: {resp.text}"

    # Empresa B tenta adicionar comentário no ticket de A → 404
    resp_c = await sclient.post(
        f"/suporte/tickets/{ticket_a_id}/comentarios",
        json={"conteudo": "Invasao cross-tenant!"},
    )
    assert resp_c.status_code == 404, (
        f"Esperado 404 ao comentar ticket alheio, recebeu {resp_c.status_code}"
    )


async def test_sla_config_upsert(sclient, db_session):
    """GET /suporte/sla-config e PUT /suporte/sla-config (upsert)."""
    await _criar_empresa_e_logar(sclient, db_session, "sla_user@test.com", "EmpresaSLA")

    # Sem config → GET retorna null
    resp = await sclient.get("/suporte/sla-config")
    assert resp.status_code == 200, resp.text
    assert resp.json() is None

    # Cria config via PUT
    resp_put = await sclient.put(
        "/suporte/sla-config",
        json={
            "prioridade_baixa_horas": 96,
            "prioridade_media_horas": 48,
            "prioridade_alta_horas": 24,
            "prioridade_critica_horas": 2,
        },
    )
    assert resp_put.status_code == 200, resp_put.text
    cfg = resp_put.json()
    assert cfg["prioridade_baixa_horas"] == 96
    assert cfg["prioridade_critica_horas"] == 2

    # GET agora retorna a config
    resp_get = await sclient.get("/suporte/sla-config")
    assert resp_get.status_code == 200
    assert resp_get.json()["prioridade_baixa_horas"] == 96

    # PUT idempotente — atualiza valor
    resp_put2 = await sclient.put(
        "/suporte/sla-config",
        json={
            "prioridade_baixa_horas": 120,
            "prioridade_media_horas": 48,
            "prioridade_alta_horas": 24,
            "prioridade_critica_horas": 2,
        },
    )
    assert resp_put2.status_code == 200
    assert resp_put2.json()["prioridade_baixa_horas"] == 120
