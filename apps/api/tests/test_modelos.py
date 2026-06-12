"""Testes para o módulo Modelos / Templates.

Executa contra a base de dados Postgres de teste real (todas as 174 tabelas já
existem). Não cria DDL nem monkey-patcha modelos. Usa rollback transacional por
teste via conftest.

Cobertura:
- CRUD completo de ModelosAtividade (tenant-scoped)
- CRUD completo de ModelosPropostaComercial (tenant-scoped, created_by injetado)
- CRUD completo de PropostasModelos (tenant-scoped, created_by injetado)
- Isolamento cross-tenant em todas as entidades
- Rejeição de recursos de outra empresa (404)
"""
import uuid

import pytest

from app.main import app
from app.api.modelos import router as modelos_router
from tests.helpers import login_as


# ── Fixture: registra o router no app de teste (uma única vez) ────────────────

@pytest.fixture(autouse=True)
async def _register_router():
    """Inclui o router de modelos no app e garante que as rotas específicas
    (/modelos/atividades, /modelos/propostas*, etc.) ficam ANTES da rota
    paramétrica /modelos/{modelo_id} do contratos_router na tabela de roteamento.

    Isso é necessário porque contratos.py registra /modelos/{modelo_id} (uuid)
    ANTES deste router ser carregado. FastAPI tenta rotas em ordem de inserção,
    então sem esse reordenamento "/modelos/atividades" seria capturada por
    /modelos/{modelo_id} resultando em 422.
    """
    already_registered = any(
        getattr(r, "path", "").startswith("/modelos/atividades") for r in app.routes
    )
    if not already_registered:
        app.include_router(modelos_router)

    # Reordena: move as rotas literais /modelos/<str> para antes das rotas
    # paramétrica /modelos/{modelo_id} do contratos_router.
    routes = list(app.routes)
    literal_modelos = [
        r for r in routes
        if getattr(r, "path", "").startswith("/modelos/")
        and not getattr(r, "path", "").startswith("/modelos/{")
    ]
    # Encontra o índice da primeira rota /modelos/{modelo_id} (contratos)
    first_param_idx = next(
        (i for i, r in enumerate(routes) if getattr(r, "path", "") == "/modelos/{modelo_id}"),
        None,
    )
    if first_param_idx is not None and literal_modelos:
        # Verifica se as rotas literais já estão antes das paramétricas
        first_literal_idx = min(routes.index(r) for r in literal_modelos)
        if first_literal_idx > first_param_idx:
            # Remove as rotas literais da posição atual
            for r in literal_modelos:
                routes.remove(r)
            # Re-insere antes da primeira rota paramétrica
            for i, r in enumerate(literal_modelos):
                routes.insert(first_param_idx + i, r)
            # Substitui a lista de rotas do app
            app.routes[:] = routes


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _login(client, db_session, email: str) -> uuid.UUID:
    """Cria empresa nova, registra usuário e faz login. Retorna empresa_id."""
    return await login_as(client, db_session, email=email)


# ════════════════════════════════════════════════════════════════════════════════
# MODELOS DE ATIVIDADE
# ════════════════════════════════════════════════════════════════════════════════

async def test_modelos_atividade_requer_auth(client):
    """Rotas de modelos de atividade exigem autenticação."""
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        assert (await anon.get("/modelos/atividades")).status_code == 401
        assert (await anon.post("/modelos/atividades", json={})).status_code == 401


async def test_modelos_atividade_crud(client, db_session):
    """Ciclo completo: criar, listar, obter, atualizar, deletar ModelosAtividade."""
    await _login(client, db_session, "ma-crud@test.com")

    # Criar
    resp = await client.post(
        "/modelos/atividades",
        json={"nome": "Modelo Visita Técnica", "descricao": "Modelo padrão de visita técnica"},
    )
    assert resp.status_code == 201, resp.text
    obj = resp.json()
    assert obj["nome"] == "Modelo Visita Técnica"
    assert obj["descricao"] == "Modelo padrão de visita técnica"
    assert "empresa_id" in obj
    oid = obj["id"]

    # Listar
    lista = (await client.get("/modelos/atividades")).json()
    assert any(x["id"] == oid for x in lista)

    # Obter por ID
    got = (await client.get(f"/modelos/atividades/{oid}")).json()
    assert got["id"] == oid
    assert got["nome"] == "Modelo Visita Técnica"

    # Atualizar
    upd = (
        await client.put(
            f"/modelos/atividades/{oid}",
            json={"nome": "Modelo Visita Técnica Atualizado"},
        )
    ).json()
    assert upd["nome"] == "Modelo Visita Técnica Atualizado"
    assert upd["descricao"] == "Modelo padrão de visita técnica"

    # Deletar
    del_resp = await client.delete(f"/modelos/atividades/{oid}")
    assert del_resp.status_code == 204

    # Confirmar deleção
    nf = await client.get(f"/modelos/atividades/{oid}")
    assert nf.status_code == 404


async def test_modelos_atividade_nao_encontrado(client, db_session):
    """GET/PUT/DELETE de id inexistente retornam 404."""
    await _login(client, db_session, "ma-nf@test.com")
    fake = str(uuid.uuid4())

    assert (await client.get(f"/modelos/atividades/{fake}")).status_code == 404
    assert (
        await client.put(f"/modelos/atividades/{fake}", json={"nome": "X"})
    ).status_code == 404
    assert (await client.delete(f"/modelos/atividades/{fake}")).status_code == 404


async def test_modelos_atividade_isolamento_cross_tenant(client, db_session):
    """Empresa B não pode ver nem modificar ModelosAtividade de empresa A."""
    # Empresa A cria modelo
    await _login(client, db_session, "ma-iso-a@test.com")
    resp_a = await client.post(
        "/modelos/atividades",
        json={"nome": "Modelo Empresa A", "descricao": "desc"},
    )
    assert resp_a.status_code == 201, resp_a.text
    oid_a = resp_a.json()["id"]

    # Empresa B faz login
    await _login(client, db_session, "ma-iso-b@test.com")

    # B não deve ver modelo de A na listagem
    lista_b = (await client.get("/modelos/atividades")).json()
    assert oid_a not in [x["id"] for x in lista_b], "modelo de A visível para B!"

    # B não deve obter diretamente o modelo de A
    assert (await client.get(f"/modelos/atividades/{oid_a}")).status_code == 404

    # B não deve atualizar modelo de A
    assert (
        await client.put(f"/modelos/atividades/{oid_a}", json={"nome": "hack"})
    ).status_code == 404

    # B não deve deletar modelo de A
    assert (await client.delete(f"/modelos/atividades/{oid_a}")).status_code == 404


# ════════════════════════════════════════════════════════════════════════════════
# MODELOS DE PROPOSTA COMERCIAL
# ════════════════════════════════════════════════════════════════════════════════

async def test_modelos_proposta_comercial_requer_auth(client):
    """Rotas de proposta comercial exigem autenticação."""
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        assert (await anon.get("/modelos/propostas-comerciais")).status_code == 401


async def test_modelos_proposta_comercial_crud(client, db_session):
    """Ciclo completo de ModelosPropostaComercial."""
    await _login(client, db_session, "mpc-crud@test.com")

    # Criar — apenas nome obrigatório
    resp = await client.post(
        "/modelos/propostas-comerciais",
        json={
            "nome": "Modelo Proposta Padrão",
            "tipo_orcamento": "treinamento_normativo",
            "titulo": "Proposta Comercial",
            "descricao": "Descrição do modelo padrão",
        },
    )
    assert resp.status_code == 201, resp.text
    obj = resp.json()
    assert obj["nome"] == "Modelo Proposta Padrão"
    assert obj["tipo_orcamento"] == "treinamento_normativo"
    assert obj["titulo"] == "Proposta Comercial"
    assert "empresa_id" in obj
    # created_by deve ser injetado pelo router
    assert obj["created_by"] is not None
    oid = obj["id"]

    # Listar
    lista = (await client.get("/modelos/propostas-comerciais")).json()
    assert any(x["id"] == oid for x in lista)

    # Obter por ID
    got = (await client.get(f"/modelos/propostas-comerciais/{oid}")).json()
    assert got["id"] == oid

    # Atualizar — UPDATE schema não expõe empresa_id nem created_by
    upd = (
        await client.put(
            f"/modelos/propostas-comerciais/{oid}",
            json={"nome": "Modelo Proposta Atualizado", "descricao": "Nova descrição"},
        )
    ).json()
    assert upd["nome"] == "Modelo Proposta Atualizado"
    assert upd["descricao"] == "Nova descrição"

    # Deletar
    del_resp = await client.delete(f"/modelos/propostas-comerciais/{oid}")
    assert del_resp.status_code == 204

    # Confirmar deleção
    nf = await client.get(f"/modelos/propostas-comerciais/{oid}")
    assert nf.status_code == 404


async def test_modelos_proposta_comercial_campos_opcionais(client, db_session):
    """Criação com campos de conteúdo opcionais."""
    await _login(client, db_session, "mpc-op@test.com")

    resp = await client.post(
        "/modelos/propostas-comerciais",
        json={
            "nome": "Modelo Completo",
            "dores": "Falta de conformidade com normas",
            "solucoes": "Treinamentos especializados",
            "diferenciais": "Equipe certificada",
            "planos_selecionados": ["basico", "avancado"],
        },
    )
    assert resp.status_code == 201, resp.text
    obj = resp.json()
    assert obj["dores"] == "Falta de conformidade com normas"
    assert obj["planos_selecionados"] == ["basico", "avancado"]


async def test_modelos_proposta_comercial_isolamento_cross_tenant(client, db_session):
    """Empresa B não pode acessar ModelosPropostaComercial de empresa A."""
    await _login(client, db_session, "mpc-iso-a@test.com")
    resp_a = await client.post(
        "/modelos/propostas-comerciais",
        json={"nome": "Proposta Empresa A"},
    )
    assert resp_a.status_code == 201, resp_a.text
    oid_a = resp_a.json()["id"]

    # Empresa B faz login
    await _login(client, db_session, "mpc-iso-b@test.com")

    lista_b = (await client.get("/modelos/propostas-comerciais")).json()
    assert oid_a not in [x["id"] for x in lista_b]

    assert (await client.get(f"/modelos/propostas-comerciais/{oid_a}")).status_code == 404
    assert (
        await client.put(f"/modelos/propostas-comerciais/{oid_a}", json={"nome": "hack"})
    ).status_code == 404
    assert (await client.delete(f"/modelos/propostas-comerciais/{oid_a}")).status_code == 404


# ════════════════════════════════════════════════════════════════════════════════
# PROPOSTAS MODELOS (builder)
# ════════════════════════════════════════════════════════════════════════════════

async def test_propostas_modelos_requer_auth(client):
    """Rotas de propostas modelos exigem autenticação."""
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        assert (await anon.get("/modelos/propostas")).status_code == 401


async def test_propostas_modelos_crud(client, db_session):
    """Ciclo completo de PropostasModelos."""
    await _login(client, db_session, "pm-crud@test.com")

    # Criar — título obrigatório
    # blocos é array JSON (JSONB), header/global_styles são objetos JSON
    resp = await client.post(
        "/modelos/propostas",
        json={
            "titulo": "Layout Institucional",
            "blocos": [{"tipo": "hero", "conteudo": "Bem-vindo"}],
            "header": {"logo": True, "cor": "#003366"},
            "global_styles": {"fonte": "Inter"},
        },
    )
    assert resp.status_code == 201, resp.text
    obj = resp.json()
    assert obj["titulo"] == "Layout Institucional"
    assert obj["blocos"] == [{"tipo": "hero", "conteudo": "Bem-vindo"}]
    assert obj["header"]["logo"] is True
    assert "empresa_id" in obj
    assert obj["created_by"] is not None
    oid = obj["id"]

    # Listar
    lista = (await client.get("/modelos/propostas")).json()
    assert any(x["id"] == oid for x in lista)

    # Obter por ID
    got = (await client.get(f"/modelos/propostas/{oid}")).json()
    assert got["id"] == oid
    assert got["titulo"] == "Layout Institucional"

    # Atualizar — UPDATE schema não expõe empresa_id nem created_by
    upd = (
        await client.put(
            f"/modelos/propostas/{oid}",
            json={"titulo": "Layout Institucional Atualizado", "global_styles": {"fonte": "Roboto"}},
        )
    ).json()
    assert upd["titulo"] == "Layout Institucional Atualizado"
    assert upd["global_styles"] == {"fonte": "Roboto"}

    # Deletar
    del_resp = await client.delete(f"/modelos/propostas/{oid}")
    assert del_resp.status_code == 204

    # Confirmar deleção
    nf = await client.get(f"/modelos/propostas/{oid}")
    assert nf.status_code == 404


async def test_propostas_modelos_nao_encontrado(client, db_session):
    """GET/PUT/DELETE de id inexistente retornam 404."""
    await _login(client, db_session, "pm-nf@test.com")
    fake = str(uuid.uuid4())

    assert (await client.get(f"/modelos/propostas/{fake}")).status_code == 404
    assert (
        await client.put(f"/modelos/propostas/{fake}", json={"titulo": "X"})
    ).status_code == 404
    assert (await client.delete(f"/modelos/propostas/{fake}")).status_code == 404


async def test_propostas_modelos_isolamento_cross_tenant(client, db_session):
    """Empresa B não pode acessar PropostasModelos de empresa A."""
    await _login(client, db_session, "pm-iso-a@test.com")
    resp_a = await client.post(
        "/modelos/propostas",
        json={"titulo": "Layout Empresa A"},
    )
    assert resp_a.status_code == 201, resp_a.text
    oid_a = resp_a.json()["id"]

    # Empresa B faz login
    await _login(client, db_session, "pm-iso-b@test.com")

    lista_b = (await client.get("/modelos/propostas")).json()
    assert oid_a not in [x["id"] for x in lista_b], "proposta de A visível para B!"

    assert (await client.get(f"/modelos/propostas/{oid_a}")).status_code == 404
    assert (
        await client.put(f"/modelos/propostas/{oid_a}", json={"titulo": "hack"})
    ).status_code == 404
    assert (await client.delete(f"/modelos/propostas/{oid_a}")).status_code == 404


async def test_propostas_modelos_sem_blocos(client, db_session):
    """Criar proposta modelo apenas com título (blocos opcionais)."""
    await _login(client, db_session, "pm-min@test.com")

    resp = await client.post(
        "/modelos/propostas",
        json={"titulo": "Modelo Minimalista"},
    )
    assert resp.status_code == 201, resp.text
    obj = resp.json()
    assert obj["titulo"] == "Modelo Minimalista"
    # blocos/header/global_styles podem ser None ou valor default do DB
