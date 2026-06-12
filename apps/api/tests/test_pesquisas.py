"""Testes auto-contidos para o módulo Pesquisas de Opinião.

Padrão idêntico ao test_blog.py:
  - Tabelas vêm do schema introspectado (sem DDL no teste)
  - PesquisasOpiniao é GLOBAL — sem empresa_id
  - Leitura é pública; criação/edição/deleção exige admin_vertical
  - Votação exige qualquer usuário autenticado

Cobertura:
  - CRUD de pesquisas (admin_vertical)
  - CRUD de opções (admin_vertical)
  - Votação (usuário autenticado)
  - Resultado agregado (público)
  - Proteção de votos com opcao_id de outra pesquisa (404)
  - Endpoints de escrita retornam 403 para não-admin
  - Endpoints exigem autenticação onde aplicável (401)
"""
import uuid

import pytest

from app.models.generated import Empresas

# As tabelas pesquisas_opiniao / pesquisas_opcoes / pesquisas_votos já existem no
# banco de teste (schema introspectado em app/models/generated.py). Sem DDL aqui.


@pytest.fixture
async def pclient(db_session, client):
    from app.main import app
    from app.api.pesquisas import router as pesquisas_router

    already = any(getattr(r, "path", "").startswith("/pesquisas") for r in app.routes)
    if not already:
        app.include_router(pesquisas_router)
    return client


# ── Helpers de autenticação ───────────────────────────────────────────────────

async def _login_admin(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ToriqHQ", tipo="vertical_on")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "admin-pesq@toriq.com",
            "password": "segredo123",
            "nome": "Admin",
            "role": "admin_vertical",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "admin-pesq@toriq.com", "password": "segredo123"}
    )
    assert r.status_code == 200, f"Login admin falhou: {r.text}"
    return emp


async def _login_regular(client, db_session):
    emp = Empresas(id=uuid.uuid4(), nome="ClienteX", tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "user-pesq@x.com",
            "password": "segredo123",
            "nome": "User",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    r = await client.post(
        "/auth/login", json={"email": "user-pesq@x.com", "password": "segredo123"}
    )
    assert r.status_code == 200, f"Login user falhou: {r.text}"
    return emp


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_criar_pesquisa_e_opcoes(pclient, db_session):
    """Admin cria pesquisa, adiciona opções e lista ambas."""
    await _login_admin(pclient, db_session)

    r = await pclient.post(
        "/pesquisas",
        json={"titulo": "NPS Toriq", "slug": "nps-toriq"},
    )
    assert r.status_code == 201, r.text
    pesquisa = r.json()
    assert pesquisa["titulo"] == "NPS Toriq"
    assert pesquisa["slug"] == "nps-toriq"
    assert pesquisa["status"] == "rascunho"
    pid = pesquisa["id"]

    # A pesquisa é global — sem empresa_id no payload
    assert "empresa_id" not in pesquisa

    r1 = await pclient.post(
        f"/pesquisas/{pid}/opcoes",
        json={"texto": "Sim", "ordem": 0},
    )
    assert r1.status_code == 201, r1.text
    opcao1 = r1.json()
    assert opcao1["texto"] == "Sim"
    assert opcao1["pesquisa_id"] == pid

    r2 = await pclient.post(
        f"/pesquisas/{pid}/opcoes",
        json={"texto": "Não", "ordem": 1},
    )
    assert r2.status_code == 201, r2.text

    lista = (await pclient.get(f"/pesquisas/{pid}/opcoes")).json()
    assert len(lista) == 2
    textos = [op["texto"] for op in lista]
    assert "Sim" in textos
    assert "Não" in textos


async def test_listar_pesquisas_publico(pclient, db_session):
    """Listagem de pesquisas é pública (sem autenticação)."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    await _login_admin(pclient, db_session)
    await pclient.post("/pesquisas", json={"titulo": "Publica", "slug": "publica-1"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/pesquisas")
        assert r.status_code == 200
        assert any(p["slug"] == "publica-1" for p in r.json())


async def test_registrar_voto(pclient, db_session):
    """Usuário autenticado registra voto e verifica campos retornados."""
    await _login_admin(pclient, db_session)

    r = await pclient.post(
        "/pesquisas",
        json={"titulo": "Satisfação", "slug": "satisfacao-v"},
    )
    pid = r.json()["id"]

    op_r = await pclient.post(
        f"/pesquisas/{pid}/opcoes",
        json={"texto": "Muito satisfeito", "ordem": 0},
    )
    oid = op_r.json()["id"]

    # Vota como usuário regular
    await _login_regular(pclient, db_session)
    voto_r = await pclient.post(
        f"/pesquisas/{pid}/votar",
        json={
            "opcao_id": oid,
            "session_id": "sess-abc-123",
            "nome": "João",
        },
    )
    assert voto_r.status_code == 201, voto_r.text
    voto = voto_r.json()
    assert voto["pesquisa_id"] == pid
    assert voto["opcao_id"] == oid
    assert voto["session_id"] == "sess-abc-123"
    assert voto["nome"] == "João"


async def test_resultados_pesquisa(pclient, db_session):
    """Lista resultados com contagens por opção."""
    await _login_admin(pclient, db_session)

    r = await pclient.post(
        "/pesquisas",
        json={"titulo": "Produto Favorito", "slug": "produto-favorito-r"},
    )
    pid = r.json()["id"]

    op_a = (await pclient.post(
        f"/pesquisas/{pid}/opcoes", json={"texto": "Produto A", "ordem": 0}
    )).json()["id"]
    op_b = (await pclient.post(
        f"/pesquisas/{pid}/opcoes", json={"texto": "Produto B", "ordem": 1}
    )).json()["id"]

    # Dois votos para A, um para B
    await pclient.post(f"/pesquisas/{pid}/votar", json={"opcao_id": op_a, "session_id": "s1"})
    await pclient.post(f"/pesquisas/{pid}/votar", json={"opcao_id": op_a, "session_id": "s2"})
    await pclient.post(f"/pesquisas/{pid}/votar", json={"opcao_id": op_b, "session_id": "s3"})

    res = (await pclient.get(f"/pesquisas/{pid}/resultados")).json()
    assert res["total_votos"] == 3

    votos_por_texto = {op["texto"]: op["votos"] for op in res["opcoes"]}
    assert votos_por_texto["Produto A"] == 2
    assert votos_por_texto["Produto B"] == 1


async def test_escrita_exige_admin(pclient, db_session):
    """POST/PUT/DELETE em pesquisas retorna 403 para usuário sem admin_vertical."""
    await _login_regular(pclient, db_session)

    r = await pclient.post("/pesquisas", json={"titulo": "X", "slug": "x-403"})
    assert r.status_code == 403, f"esperado 403, recebeu {r.status_code}: {r.text}"


async def test_voto_opcao_de_outra_pesquisa_rejeitado(pclient, db_session):
    """Voto com opcao_id de outra pesquisa deve retornar 404."""
    await _login_admin(pclient, db_session)

    pid1 = (await pclient.post(
        "/pesquisas", json={"titulo": "P1-inj", "slug": "p1-inj"}
    )).json()["id"]
    oid1 = (await pclient.post(
        f"/pesquisas/{pid1}/opcoes", json={"texto": "Opt-P1", "ordem": 0}
    )).json()["id"]

    pid2 = (await pclient.post(
        "/pesquisas", json={"titulo": "P2-inj", "slug": "p2-inj"}
    )).json()["id"]

    # Tenta votar em p2 com opcao de p1
    r = await pclient.post(
        f"/pesquisas/{pid2}/votar",
        json={"opcao_id": oid1, "session_id": "inj-sess"},
    )
    assert r.status_code == 404, (
        f"deveria rejeitar opcao_id de outra pesquisa, recebeu {r.status_code}: {r.text}"
    )


async def test_votar_sem_autenticacao_retorna_401(pclient):
    """Endpoint de votação exige autenticação."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            f"/pesquisas/{uuid.uuid4()}/votar",
            json={"opcao_id": str(uuid.uuid4()), "session_id": "anon"},
        )
        assert r.status_code == 401, f"esperado 401, recebeu {r.status_code}"
