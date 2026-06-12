"""Testes TDD para o módulo Agenda.

Registra o router em app.main.app antes de executar os cenários. As tabelas de
agenda já fazem parte do schema real do banco de teste.
"""
import uuid

import pytest

from tests.helpers import login_as


# ── Fixture: registra router ──────────────────────────────────────────────────

@pytest.fixture
async def agenda_client(db_session, client):
    """Registra o router de agenda em app.main.app."""
    from app.main import app
    from app.api.agenda import router as agenda_router

    # Registra apenas uma vez
    prefix_exists = any(
        getattr(r, "path", "").startswith("/agenda") for r in app.routes
    )
    if not prefix_exists:
        app.include_router(agenda_router)

    return client


# ── Helpers de autenticação ───────────────────────────────────────────────────

async def _criar_empresa_e_login(client, db_session, email: str, nome: str = "Emp"):
    await login_as(client, db_session, email=email, nome=nome)


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_crud_eventos(agenda_client, db_session):
    """Ciclo completo de CRUD de eventos."""
    c = agenda_client
    await _criar_empresa_e_login(c, db_session, "evento@test.com", "EmpEvento")

    # Criar evento
    payload = {
        "titulo": "Reunião semanal",
        "data_inicio": "2025-01-15T09:00:00",
        "descricao": "Reunião de planejamento",
        "tipo": "reuniao",
        "visibilidade": "empresa",
    }
    resp = await c.post("/agenda/eventos", json=payload)
    assert resp.status_code == 201, resp.text
    evento = resp.json()
    assert evento["titulo"] == "Reunião semanal"
    assert evento["tipo"] == "reuniao"
    assert "empresa_id" in evento
    assert "criado_por" in evento

    evento_id = evento["id"]

    # Listar eventos
    lista = (await c.get("/agenda/eventos")).json()
    assert any(e["id"] == evento_id for e in lista)

    # Obter evento específico
    obj = (await c.get(f"/agenda/eventos/{evento_id}")).json()
    assert obj["titulo"] == "Reunião semanal"

    # Atualizar evento
    upd = await c.put(
        f"/agenda/eventos/{evento_id}",
        json={"titulo": "Reunião semanal (atualizada)", "status": "concluido"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["titulo"] == "Reunião semanal (atualizada)"
    assert upd.json()["status"] == "concluido"

    # Deletar evento
    del_resp = await c.delete(f"/agenda/eventos/{evento_id}")
    assert del_resp.status_code == 204

    # Confirmar que foi removido
    not_found = await c.get(f"/agenda/eventos/{evento_id}")
    assert not_found.status_code == 404


async def test_eventos_requer_auth(agenda_client):
    """Rotas de eventos devem retornar 401 sem autenticação."""
    c = agenda_client
    # Deslogar explicitamente (sem cookie de sessão)
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        assert (await anon.get("/agenda/eventos")).status_code == 401
        assert (await anon.post("/agenda/eventos", json={})).status_code == 401


async def test_isolamento_cross_tenant(agenda_client, db_session):
    """Evento de empresa A não deve ser acessível por empresa B."""
    c = agenda_client

    # Empresa A cria evento
    await _criar_empresa_e_login(c, db_session, "iso-a@test.com", "IsoEmpA")
    resp_a = await c.post(
        "/agenda/eventos",
        json={"titulo": "Evento Empresa A", "data_inicio": "2025-02-01T10:00:00"},
    )
    assert resp_a.status_code == 201, resp_a.text
    evento_a_id = resp_a.json()["id"]

    # Empresa B faz login
    await _criar_empresa_e_login(c, db_session, "iso-b@test.com", "IsoEmpB")

    # Empresa B não deve ver evento de empresa A na listagem
    lista_b = (await c.get("/agenda/eventos")).json()
    ids_b = [e["id"] for e in lista_b]
    assert evento_a_id not in ids_b, "evento de empresa A visível para empresa B!"

    # Empresa B não deve conseguir obter o evento de empresa A diretamente
    resp_get = await c.get(f"/agenda/eventos/{evento_a_id}")
    assert resp_get.status_code == 404, f"esperado 404, obteve {resp_get.status_code}"

    # Empresa B não deve conseguir atualizar evento de empresa A
    resp_put = await c.put(
        f"/agenda/eventos/{evento_a_id}",
        json={"titulo": "Ataque cross-tenant"},
    )
    assert resp_put.status_code == 404

    # Empresa B não deve conseguir deletar evento de empresa A
    resp_del = await c.delete(f"/agenda/eventos/{evento_a_id}")
    assert resp_del.status_code == 404


async def test_criar_compartilhamento(agenda_client, db_session):
    """Criar compartilhamento de evento deve funcionar para evento da própria empresa."""
    c = agenda_client

    await _criar_empresa_e_login(c, db_session, "comp@test.com", "EmpComp")

    # Criar evento
    resp = await c.post(
        "/agenda/eventos",
        json={"titulo": "Evento para compartilhar", "data_inicio": "2025-03-01T08:00:00"},
    )
    assert resp.status_code == 201, resp.text
    evento_id = resp.json()["id"]

    # Criar compartilhamento com um usuário real (profiles row criado pelo login_as helper)
    await login_as(c, db_session, email="comp2@test.com")
    from sqlalchemy import select
    from app.models.user import User
    usuario_destino_obj = await db_session.scalar(select(User).where(User.email == "comp2@test.com"))
    usuario_destino = usuario_destino_obj.id

    # Reconectar como comp@test.com
    await c.post("/auth/login", json={"email": "comp@test.com", "password": "segredo123"})

    comp_resp = await c.post(
        "/agenda/compartilhamentos",
        json={
            "evento_id": evento_id,
            "compartilhado_com": str(usuario_destino),
            "pode_editar": True,
        },
    )
    assert comp_resp.status_code == 201, comp_resp.text
    comp = comp_resp.json()
    assert comp["evento_id"] == evento_id
    assert comp["compartilhado_com"] == str(usuario_destino)
    assert comp["pode_editar"] is True

    # Listar compartilhamentos
    lista = (await c.get("/agenda/compartilhamentos")).json()
    assert any(item["id"] == comp["id"] for item in lista)

    # Listar filtrado por evento
    filtrado = (
        await c.get(f"/agenda/compartilhamentos?evento_id={evento_id}")
    ).json()
    assert all(item["evento_id"] == evento_id for item in filtrado)


async def test_compartilhamento_cross_tenant_rejeitado(agenda_client, db_session):
    """Compartilhar evento de outra empresa deve retornar 404."""
    c = agenda_client

    # Empresa A cria evento
    await _criar_empresa_e_login(c, db_session, "cct-a@test.com", "CCTEmpA")
    resp_a = await c.post(
        "/agenda/eventos",
        json={"titulo": "Evento privado A", "data_inicio": "2025-04-01T09:00:00"},
    )
    assert resp_a.status_code == 201
    evento_a_id = resp_a.json()["id"]

    # Empresa B tenta compartilhar evento de empresa A
    await _criar_empresa_e_login(c, db_session, "cct-b@test.com", "CCTEmpB")
    resp = await c.post(
        "/agenda/compartilhamentos",
        json={
            "evento_id": evento_a_id,
            "compartilhado_com": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 404, (
        f"esperado 404 (cross-tenant), obteve {resp.status_code}: {resp.text}"
    )


async def test_criar_permissao(agenda_client, db_session):
    """Criar permissão de agenda deve funcionar corretamente."""
    c = agenda_client

    await _criar_empresa_e_login(c, db_session, "perm@test.com", "EmpPerm")

    # Criar usuário alvo real (profiles row criado pelo login_as helper)
    await login_as(c, db_session, email="perm-alvo@test.com")
    from sqlalchemy import select
    from app.models.user import User
    usuario_alvo_obj = await db_session.scalar(select(User).where(User.email == "perm-alvo@test.com"))
    usuario_alvo = usuario_alvo_obj.id

    # Reconectar como perm@test.com
    await c.post("/auth/login", json={"email": "perm@test.com", "password": "segredo123"})

    perm_resp = await c.post(
        "/agenda/permissoes",
        json={
            "usuario_id": str(usuario_alvo),
            "pode_criar_eventos": True,
        },
    )
    assert perm_resp.status_code == 201, perm_resp.text
    perm = perm_resp.json()
    assert perm["usuario_id"] == str(usuario_alvo)
    assert perm["pode_criar_eventos"] is True
    assert "empresa_id" in perm
    assert "dono_id" in perm

    # Listar permissões
    lista = (await c.get("/agenda/permissoes")).json()
    assert any(item["id"] == perm["id"] for item in lista)

    # Remover permissão
    del_resp = await c.delete(f"/agenda/permissoes/{perm['id']}")
    assert del_resp.status_code == 204


async def test_permissoes_isolamento_tenant(agenda_client, db_session):
    """Permissões de empresa A não devem aparecer para empresa B."""
    c = agenda_client

    # Empresa A cria permissão com usuário real
    await _criar_empresa_e_login(c, db_session, "permi-a@test.com", "PermIsoA")
    await login_as(c, db_session, email="permi-alvo-a@test.com")
    from sqlalchemy import select
    from app.models.user import User
    usr_alvo_a = await db_session.scalar(select(User).where(User.email == "permi-alvo-a@test.com"))
    await c.post("/auth/login", json={"email": "permi-a@test.com", "password": "segredo123"})

    perm_a = (
        await c.post(
            "/agenda/permissoes",
            json={"usuario_id": str(usr_alvo_a.id), "pode_criar_eventos": False},
        )
    ).json()

    # Empresa B lista permissões
    await _criar_empresa_e_login(c, db_session, "permi-b@test.com", "PermIsoB")
    lista_b = (await c.get("/agenda/permissoes")).json()
    assert perm_a["id"] not in [p["id"] for p in lista_b]
