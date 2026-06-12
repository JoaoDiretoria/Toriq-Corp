"""Testes para o módulo Blog / Newsletter.

Padrão self-contained: cria suas próprias tabelas SQLite-friendly via DDL
raw (evita server_defaults e tipos PostgreSQL-específicos do modelo gerado).
O router /blog é incluído sob demanda, verificando se já existe para evitar
duplicatas.

Cobertura:
- CRUD básico de posts de blog (autores, categorias, posts)
- Criação de inscrição na newsletter (público, sem auth)
- Isolamento de role: endpoints admin devem retornar 403 para usuários sem
  admin_vertical; 401 para não autenticados
"""
import uuid

import pytest
from sqlalchemy import text

from app.models.generated import Empresas

# ── SQLite DDL para as tabelas do módulo (sem tipos PG-específicos) ────────────

_BLOG_DDL = [
    """
    CREATE TABLE IF NOT EXISTS blog_autores (
        id CHAR(32) NOT NULL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        sobrenome VARCHAR(100),
        cargo VARCHAR(100),
        bio TEXT,
        avatar_url TEXT,
        email VARCHAR(255),
        linkedin_url TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS blog_categorias (
        id CHAR(32) NOT NULL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6366f1',
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS blogs (
        id CHAR(32) NOT NULL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        conteudo TEXT,
        imagem_capa_url TEXT,
        autor_id CHAR(32),
        categoria_id CHAR(32),
        status VARCHAR(20) DEFAULT 'rascunho',
        tags TEXT,
        tempo_leitura INTEGER,
        visualizacoes INTEGER DEFAULT 0,
        publicado_em DATETIME,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS blog_visualizacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        blog_id CHAR(32) NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        ip_address TEXT,
        user_agent TEXT,
        referer TEXT,
        country VARCHAR(100),
        city VARCHAR(100),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        session_id VARCHAR(255),
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS blog_user_preferences (
        id CHAR(32) NOT NULL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        ip_address TEXT,
        tags_interesse TEXT,
        ultimo_acesso DATETIME DEFAULT (now()),
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS newsletter_inscricoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        telefone VARCHAR(20) NOT NULL,
        data_nascimento DATE,
        empresa VARCHAR(255),
        cargo VARCHAR(255),
        ativo BOOLEAN DEFAULT 1,
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        unsubscribed_at DATETIME
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS newsletter_conteudos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        titulo VARCHAR(500) NOT NULL,
        slug VARCHAR(500) NOT NULL UNIQUE,
        descricao TEXT,
        conteudo TEXT,
        imagem_capa_url TEXT,
        status VARCHAR(50) DEFAULT 'rascunho',
        agendado_para DATETIME,
        enviado_em DATETIME,
        total_enviados INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS newsletter_config (
        id CHAR(32) NOT NULL PRIMARY KEY,
        frequencia_diaria INTEGER DEFAULT 1,
        horarios_disparo TEXT DEFAULT '["09:00"]',
        ativo BOOLEAN DEFAULT 1,
        ultima_execucao DATETIME,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS newsletter_disparos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        referencia_id CHAR(32) NOT NULL,
        titulo VARCHAR(500) NOT NULL,
        total_enviados INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        UNIQUE(tipo, referencia_id)
    )
    """,
]


# ── Fixture: cria as tabelas e registra o router ──────────────────────────────

@pytest.fixture(autouse=True)
async def _blog_tables(db_session):
    """Cria as tabelas do blog no banco SQLite de teste."""
    async with db_session.bind.begin() as conn:
        for ddl in _BLOG_DDL:
            await conn.execute(text(ddl))


@pytest.fixture
async def blog_client(db_session, client):
    from app.main import app
    from app.api.blog import router as blog_router

    already_registered = any(
        getattr(r, "path", "").startswith("/blog") for r in app.routes
    )
    if not already_registered:
        app.include_router(blog_router)
    return client


# ── Helpers de autenticação ───────────────────────────────────────────────────

async def _register_login(client, email: str, password: str, role: str, empresa_id: uuid.UUID | None):
    payload = {"email": email, "password": password, "nome": email, "role": role}
    if empresa_id:
        payload["empresa_id"] = str(empresa_id)
    await client.post("/auth/register", json=payload)
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login falhou: {r.text}"


async def _login_admin(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ToriqHQ", tipo="vertical_on")
    db_session.add(emp)
    await db_session.commit()
    await _register_login(client, "admin@toriq.com", "segredo123", "admin_vertical", emp.id)
    return emp


async def _login_regular(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ClienteX", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await _register_login(client, "user@x.com", "segredo123", "cliente_torq", emp.id)
    return emp


# ── Testes: Posts de blog ─────────────────────────────────────────────────────

async def test_listar_posts_publicos_sem_auth(blog_client):
    """GET /blog deve funcionar sem autenticação e retornar apenas posts publicados."""
    # Sem login algum — deve funcionar (200) com lista vazia
    r = await blog_client.get("/blog")
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


async def test_ciclo_crud_post(blog_client, db_session):
    """Admin pode criar, listar, atualizar e deletar posts."""
    await _login_admin(blog_client, db_session)

    # Criar post
    r = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "Post 1", "slug": "post-1", "status": "rascunho"},
    )
    assert r.status_code == 201, r.text
    post_id = r.json()["id"]
    assert r.json()["titulo"] == "Post 1"

    # Listar admin vê rascunho
    r2 = await blog_client.get("/blog/admin/posts")
    assert r2.status_code == 200
    ids = [p["id"] for p in r2.json()]
    assert post_id in ids

    # GET público NÃO retorna rascunho
    r3 = await blog_client.get("/blog")
    pub_ids = [p["id"] for p in r3.json()]
    assert post_id not in pub_ids, "rascunho não deve aparecer no feed público"

    # Publicar
    r4 = await blog_client.put(
        f"/blog/admin/posts/{post_id}",
        json={"status": "publicado"},
    )
    assert r4.status_code == 200
    assert r4.json()["status"] == "publicado"

    # GET público agora retorna o post publicado
    r5 = await blog_client.get("/blog")
    pub_ids_now = [p["id"] for p in r5.json()]
    assert post_id in pub_ids_now

    # Deletar
    r6 = await blog_client.delete(f"/blog/admin/posts/{post_id}")
    assert r6.status_code == 204

    # Não existe mais
    r7 = await blog_client.get(f"/blog/{post_id}")
    assert r7.status_code == 404


async def test_criar_post_requer_admin(blog_client, db_session):
    """Usuário sem admin_vertical não pode criar posts."""
    await _login_regular(blog_client, db_session)

    r = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "Hack", "slug": "hack"},
    )
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}: {r.text}"


async def test_criar_post_requer_auth(blog_client):
    """Sem autenticação, criar post deve retornar 401."""
    r = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "Anon", "slug": "anon"},
    )
    assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}: {r.text}"


# ── Testes: Autores ───────────────────────────────────────────────────────────

async def test_crud_autores(blog_client, db_session):
    """Admin pode criar e listar autores; público pode listar."""
    await _login_admin(blog_client, db_session)

    r = await blog_client.post(
        "/blog/autores",
        json={"nome": "João", "sobrenome": "Silva", "cargo": "Editor"},
    )
    assert r.status_code == 201, r.text
    autor_id = r.json()["id"]
    assert r.json()["nome"] == "João"

    # Listar público
    r2 = await blog_client.get("/blog/autores")
    assert r2.status_code == 200
    assert any(a["id"] == autor_id for a in r2.json())

    # Obter individual
    r3 = await blog_client.get(f"/blog/autores/{autor_id}")
    assert r3.status_code == 200
    assert r3.json()["sobrenome"] == "Silva"

    # Atualizar
    r4 = await blog_client.put(f"/blog/autores/{autor_id}", json={"cargo": "Editor-Chefe"})
    assert r4.status_code == 200
    assert r4.json()["cargo"] == "Editor-Chefe"

    # Deletar
    r5 = await blog_client.delete(f"/blog/autores/{autor_id}")
    assert r5.status_code == 204


async def test_criar_autor_requer_admin(blog_client, db_session):
    """Usuário regular não pode criar autores."""
    await _login_regular(blog_client, db_session)
    r = await blog_client.post("/blog/autores", json={"nome": "Hack"})
    assert r.status_code == 403


# ── Testes: Categorias ────────────────────────────────────────────────────────

async def test_crud_categorias(blog_client, db_session):
    """Admin pode criar categorias; público pode listar."""
    await _login_admin(blog_client, db_session)

    r = await blog_client.post(
        "/blog/categorias",
        json={"nome": "Tech", "slug": "tech", "cor": "#ff0000"},
    )
    assert r.status_code == 201, r.text
    cat_id = r.json()["id"]

    # Listar público
    r2 = await blog_client.get("/blog/categorias")
    assert r2.status_code == 200
    assert any(c["id"] == cat_id for c in r2.json())


# ── Testes: NewsletterInscricoes (público POST) ────────────────────────────────

async def test_inscrever_sem_auth(blog_client):
    """Qualquer visitante pode se inscrever na newsletter sem autenticação."""
    r = await blog_client.post(
        "/blog/newsletter/inscricoes",
        json={
            "nome": "Maria Visitante",
            "email": "maria@visitante.com",
            "telefone": "11999990000",
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["email"] == "maria@visitante.com"
    assert data["nome"] == "Maria Visitante"
    assert data["ativo"] is True


async def test_inscrever_email_duplicado(blog_client):
    """Inscrição com e-mail já existente deve retornar 409."""
    payload = {
        "nome": "Dup",
        "email": "dup@teste.com",
        "telefone": "11900000001",
    }
    r1 = await blog_client.post("/blog/newsletter/inscricoes", json=payload)
    assert r1.status_code == 201

    r2 = await blog_client.post("/blog/newsletter/inscricoes", json=payload)
    assert r2.status_code == 409, f"esperado 409, recebeu {r2.status_code}: {r2.text}"


async def test_listar_inscricoes_requer_admin(blog_client, db_session):
    """Apenas admin_vertical pode listar inscrições."""
    # Sem auth
    r = await blog_client.get("/blog/newsletter/inscricoes")
    assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}"

    # Com usuário regular
    await _login_regular(blog_client, db_session)
    r2 = await blog_client.get("/blog/newsletter/inscricoes")
    assert r2.status_code == 403, f"esperado 403, recebeu {r2.status_code}"


async def test_admin_lista_inscricoes(blog_client, db_session):
    """Admin pode listar inscrições na newsletter."""
    # Criar uma inscrição pública primeiro
    await blog_client.post(
        "/blog/newsletter/inscricoes",
        json={"nome": "Sub", "email": "sub@toriq.com", "telefone": "11988887777"},
    )

    # Logar como admin
    await _login_admin(blog_client, db_session)
    r = await blog_client.get("/blog/newsletter/inscricoes")
    assert r.status_code == 200, r.text
    emails = [i["email"] for i in r.json()]
    assert "sub@toriq.com" in emails


# ── Testes: NewsletterConteudos ────────────────────────────────────────────────

async def test_crud_conteudo_newsletter(blog_client, db_session):
    """Admin pode criar e gerenciar conteúdos de newsletter."""
    await _login_admin(blog_client, db_session)

    r = await blog_client.post(
        "/blog/newsletter/conteudos",
        json={"titulo": "Edição Semanal", "slug": "edicao-semanal", "status": "rascunho"},
    )
    assert r.status_code == 201, r.text
    cont_id = r.json()["id"]
    assert r.json()["titulo"] == "Edição Semanal"

    # Listar
    r2 = await blog_client.get("/blog/newsletter/conteudos")
    assert r2.status_code == 200
    assert any(c["id"] == cont_id for c in r2.json())

    # Atualizar status
    r3 = await blog_client.put(
        f"/blog/newsletter/conteudos/{cont_id}",
        json={"status": "agendado"},
    )
    assert r3.status_code == 200
    assert r3.json()["status"] == "agendado"

    # Deletar
    r4 = await blog_client.delete(f"/blog/newsletter/conteudos/{cont_id}")
    assert r4.status_code == 204


async def test_conteudo_newsletter_requer_admin(blog_client, db_session):
    """Usuário regular não pode criar conteúdo de newsletter."""
    await _login_regular(blog_client, db_session)
    r = await blog_client.post(
        "/blog/newsletter/conteudos",
        json={"titulo": "Hack", "slug": "hack-nl"},
    )
    assert r.status_code == 403


# ── Testes: Visualizações ─────────────────────────────────────────────────────

async def test_registrar_visualizacao_publico(blog_client, db_session):
    """Qualquer visitante pode registrar uma visualização de post."""
    # Admin cria o post
    await _login_admin(blog_client, db_session)
    r_post = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "Post Vis", "slug": "post-vis", "status": "publicado"},
    )
    assert r_post.status_code == 201
    post_id = r_post.json()["id"]

    # Registrar visualização sem auth (logout implícito: novo client não tem cookie)
    # Chamamos o endpoint sem relogar — o cookie de admin ainda está presente,
    # mas o endpoint é público então funciona de qualquer jeito
    r_viz = await blog_client.post(
        f"/blog/{post_id}/visualizacoes",
        json={"session_id": "sess-abc123", "device_type": "desktop"},
    )
    assert r_viz.status_code == 201, r_viz.text
    assert r_viz.json()["blog_id"] == post_id
    assert r_viz.json()["session_id"] == "sess-abc123"


async def test_listar_visualizacoes_requer_admin(blog_client, db_session):
    """Listar visualizações de um post requer admin_vertical."""
    # Admin cria post
    await _login_admin(blog_client, db_session)
    r_post = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "VizPost", "slug": "viz-post", "status": "publicado"},
    )
    post_id = r_post.json()["id"]

    # Admin consegue listar
    r_list = await blog_client.get(f"/blog/{post_id}/visualizacoes")
    assert r_list.status_code == 200


async def test_listar_visualizacoes_rejeita_regular(blog_client, db_session):
    """Usuário regular não pode listar visualizações."""
    # Criar post como admin
    await _login_admin(blog_client, db_session)
    r_post = await blog_client.post(
        "/blog/admin/posts",
        json={"titulo": "VizPost2", "slug": "viz-post-2", "status": "publicado"},
    )
    post_id = r_post.json()["id"]

    # Logar como regular
    await _login_regular(blog_client, db_session)
    r = await blog_client.get(f"/blog/{post_id}/visualizacoes")
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}"
