"""Testes auto-contidos das RPCs portadas (app/api/rpcs.py).

Banco de teste = Postgres real com o schema do generated.py. O router é
registrado sob demanda (idempotente), assim como nos demais testes.

Cobertura:
- GET  /white-label/me   : sst resolve a própria empresa; cliente_final resolve
                           via clientes_sst; admin_vertical → null
- POST /sistema/system-updates/register : cria versão nova (desativa anteriores);
                           idempotente na 2ª chamada; não-admin → 403
- GET  /blog/trending    : retorna 200 (lista) e respeita o limit
"""
import uuid

import pytest

from app.models import generated as m
from tests.helpers import login_as


@pytest.fixture
async def rpc_client(db_session, client):
    """Registra o rpcs_router.

    No main.py real, rpcs_router DEVE ser incluído ANTES de blog_router e
    white_label_router (ver nota em app/api/rpcs.py), pois /blog/trending e
    /white-label/me precisam ter precedência sobre rotas dinâmicas como
    /blog/{id_}. Como blog_router/white_label_router já estão registrados na
    app de teste, movemos as rotas do rpcs_router para o início da lista para
    reproduzir essa precedência.
    """
    from app.main import app
    from app.api.rpcs import router as rpcs_router

    already = any(
        getattr(r, "path", "") == "/white-label/me" for r in app.routes
    )
    if not already:
        app.include_router(rpcs_router)
        rpc_paths = {getattr(r, "path", "") for r in rpcs_router.routes}
        rpc_routes = [r for r in app.router.routes if getattr(r, "path", "") in rpc_paths]
        for r in rpc_routes:
            app.router.routes.remove(r)
        app.router.routes[0:0] = rpc_routes
    return client


# ── auth ──────────────────────────────────────────────────────────────────────

async def test_white_label_me_requer_auth(rpc_client):
    assert (await rpc_client.get("/white-label/me")).status_code == 401


# ── RPC 1: /white-label/me ────────────────────────────────────────────────────

async def test_white_label_me_sst_resolve_propria_empresa(rpc_client, db_session):
    # login_as cria uma empresa tipo 'sst' e um profile role 'empresa_sst'
    empresa_id = await login_as(
        rpc_client, db_session, role="empresa_sst", email="wl-sst@a.com"
    )
    # Cria config white-label para essa empresa
    cfg = m.WhiteLabelConfig(
        id=uuid.uuid4(), empresa_id=empresa_id, title="Empresa SST X"
    )
    db_session.add(cfg)
    await db_session.commit()

    r = await rpc_client.get("/white-label/me")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["empresa_sst_id"] == str(empresa_id)
    assert data["config"] is not None
    assert data["config"]["title"] == "Empresa SST X"
    # snake_case preservado
    assert "primary_color" in data["config"]


async def test_white_label_me_sst_sem_config(rpc_client, db_session):
    empresa_id = await login_as(
        rpc_client, db_session, role="empresa_sst", email="wl-noconfig@a.com"
    )
    r = await rpc_client.get("/white-label/me")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["empresa_sst_id"] == str(empresa_id)
    assert data["config"] is None


async def test_white_label_me_cliente_final_resolve_via_clientes_sst(
    rpc_client, db_session
):
    # Empresa SST pai (dona da config)
    sst_id = uuid.uuid4()
    db_session.add(m.Empresas(id=sst_id, nome="SST Pai", tipo="sst"))
    # Empresa do cliente final
    cliente_emp_id = uuid.uuid4()
    db_session.add(
        m.Empresas(id=cliente_emp_id, nome="Cliente Final", tipo="cliente_final")
    )
    await db_session.commit()

    # Vínculo clientes_sst: cliente_empresa_id -> empresa_sst_id
    db_session.add(
        m.ClientesSst(
            id=uuid.uuid4(),
            empresa_sst_id=sst_id,
            cliente_empresa_id=cliente_emp_id,
            nome="Cliente Final",
        )
    )
    # Config white-label pertence à empresa SST pai
    db_session.add(
        m.WhiteLabelConfig(id=uuid.uuid4(), empresa_id=sst_id, title="Tema do SST Pai")
    )
    await db_session.commit()

    # Usuário cliente_final vinculado à empresa do cliente
    await login_as(
        rpc_client,
        db_session,
        role="cliente_final",
        email="wl-cf@a.com",
        empresa_id=cliente_emp_id,
    )

    r = await rpc_client.get("/white-label/me")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["empresa_sst_id"] == str(sst_id)
    assert data["config"] is not None
    assert data["config"]["title"] == "Tema do SST Pai"


async def test_white_label_me_admin_vertical_retorna_null(rpc_client, db_session):
    # empresa tipo vertical_on + profile admin_vertical
    vert_id = uuid.uuid4()
    db_session.add(m.Empresas(id=vert_id, nome="HQ", tipo="vertical_on"))
    await db_session.commit()
    await login_as(
        rpc_client,
        db_session,
        role="admin_vertical",
        email="wl-admin@a.com",
        empresa_id=vert_id,
    )

    r = await rpc_client.get("/white-label/me")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["empresa_sst_id"] is None
    assert data["config"] is None


# ── RPC 2: /sistema/system-updates/register ───────────────────────────────────

async def test_register_cria_versao_e_desativa_anteriores(rpc_client, db_session):
    # Pré-existe um update ativo (versão antiga)
    antigo_id = uuid.uuid4()
    db_session.add(
        m.SystemUpdates(
            id=antigo_id, version="0.9.0", title="Antigo", is_active=True
        )
    )
    await db_session.commit()

    await login_as(
        rpc_client, db_session, role="admin_vertical", email="reg-admin@a.com"
    )

    r = await rpc_client.post(
        "/sistema/system-updates/register",
        json={
            "version": "1.0.0",
            "title": "Lançamento 1.0",
            "description": "Primeira versão estável",
            "changelog": ["feature A", "fix B"],
        },
    )
    assert r.status_code == 201, r.text
    novo = r.json()
    assert novo["version"] == "1.0.0"
    assert novo["is_active"] is True

    # O antigo foi desativado
    antigo = await db_session.get(m.SystemUpdates, antigo_id)
    await db_session.refresh(antigo)
    assert antigo.is_active is False


async def test_register_idempotente(rpc_client, db_session):
    await login_as(
        rpc_client, db_session, role="admin_vertical", email="reg-idem@a.com"
    )
    body = {"version": "2.0.0", "title": "V2"}

    r1 = await rpc_client.post("/sistema/system-updates/register", json=body)
    assert r1.status_code == 201, r1.text
    id1 = r1.json()["id"]

    # 2ª chamada com a mesma versão retorna o existente (mesmo id)
    r2 = await rpc_client.post(
        "/sistema/system-updates/register",
        json={"version": "2.0.0", "title": "V2 - alterado"},
    )
    assert r2.status_code == 201, r2.text
    assert r2.json()["id"] == id1
    # Título não foi alterado (idempotente)
    assert r2.json()["title"] == "V2"


async def test_register_nao_admin_403(rpc_client, db_session):
    await login_as(
        rpc_client, db_session, role="cliente_torq", email="reg-naoadmin@a.com"
    )
    r = await rpc_client.post(
        "/sistema/system-updates/register",
        json={"version": "3.0.0", "title": "Nope"},
    )
    assert r.status_code == 403, r.text


# ── RPC 3: /blog/trending ─────────────────────────────────────────────────────

async def test_blog_trending_publico_lista(rpc_client, db_session):
    # Cria alguns posts publicados com visualizações
    posts = []
    for i in range(3):
        b = m.Blogs(
            id=uuid.uuid4(),
            titulo=f"Post {i}",
            slug=f"post-trending-{uuid.uuid4().hex[:8]}",
            status="publicado",
        )
        posts.append(b)
        db_session.add(b)
    await db_session.commit()

    # Post 0 com 3 views, post 1 com 1 view, post 2 com 0
    for _ in range(3):
        db_session.add(m.BlogVisualizacoes(id=uuid.uuid4(), blog_id=posts[0].id))
    db_session.add(m.BlogVisualizacoes(id=uuid.uuid4(), blog_id=posts[1].id))
    await db_session.commit()

    # Público — sem autenticação
    r = await rpc_client.get("/blog/trending")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    slugs = [p.slug for p in posts]
    nossos = [d for d in data if d["slug"] in slugs]
    # O post com mais views deve aparecer antes do com menos
    ids_ordenados = [d["id"] for d in nossos]
    assert ids_ordenados.index(str(posts[0].id)) < ids_ordenados.index(
        str(posts[1].id)
    )


async def test_blog_trending_respeita_limit(rpc_client, db_session):
    for i in range(5):
        db_session.add(
            m.Blogs(
                id=uuid.uuid4(),
                titulo=f"Limit Post {i}",
                slug=f"limit-post-{uuid.uuid4().hex[:8]}",
                status="publicado",
            )
        )
    await db_session.commit()

    r = await rpc_client.get("/blog/trending?limit=2")
    assert r.status_code == 200, r.text
    assert len(r.json()) <= 2
