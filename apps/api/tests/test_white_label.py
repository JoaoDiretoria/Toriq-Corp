"""Testes auto-contidos para o módulo White Label.

Cobre:
- GET /white-label/config         → retorna/cria config para a empresa logada
- PUT /white-label/config         → atualiza config da própria empresa
- GET /white-label/modulos        → catálogo global (todos os usuários autenticados)
- GET /white-label/empresa-modulos → lista módulos vinculados à empresa
- POST /white-label/empresa-modulos → vincula módulo
- PUT /white-label/empresa-modulos/{id_} → atualiza vínculo
- DELETE /white-label/empresa-modulos/{id_} → remove vínculo
- GET /white-label/empresa-modulos-telas → lista telas
- POST /white-label/empresa-modulos-telas → vincula tela
- PUT /white-label/empresa-modulos-telas/{id_} → atualiza tela
- DELETE /white-label/empresa-modulos-telas/{id_} → remove tela
- Isolamento cross-tenant: empresa B não pode ler/editar config da empresa A
"""
import uuid

import pytest
from sqlalchemy import text

from tests.helpers import login_as

from app.api.white_label import router as wl_router


# ── Fixture: inclui router no app ─────────────────────────────────────────────

@pytest.fixture
async def wl_client(db_session, client):
    """Registra o router do módulo White Label no app (schema já existe no banco de teste)."""
    from app.main import app
    prefix_exists = any(r.path.startswith("/white-label") for r in app.routes)
    if not prefix_exists:
        app.include_router(wl_router)

    return client


# ── helpers ───────────────────────────────────────────────────────────────────

async def _criar_empresa(db_session, nome: str = "Empresa") -> uuid.UUID:
    """Creates an empresa and returns its id without logging in."""
    from app.models.generated import Empresas
    emp = Empresas(id=uuid.uuid4(), nome=nome, tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    return emp.id


async def _registrar_e_logar(client, email: str, empresa_id: uuid.UUID):
    await login_as(client, None, email=email, password="senha123", empresa_id=empresa_id)


async def _criar_modulo(db_session) -> str:
    """Insere um módulo global e retorna seu id (str sem hífens)."""
    mid = uuid.uuid4().hex
    await db_session.execute(
        text(
            "INSERT INTO modulos (id, nome, rota, created_at) "
            "VALUES (:id, :nome, :rota, now())"
        ),
        {"id": mid, "nome": "Financeiro", "rota": "/financeiro"},
    )
    await db_session.commit()
    return mid


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_get_config_cria_se_nao_existir(wl_client, db_session):
    """GET /white-label/config deve criar um registro padrão se ainda não existir."""
    emp_id = await _criar_empresa(db_session, "EmpConfig")
    await _registrar_e_logar(wl_client, "config@test.com", emp_id)

    r = await wl_client.get("/white-label/config")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["empresa_id"] == str(emp_id)
    assert "id" in data

    # Segunda chamada deve retornar o mesmo registro (não duplicar)
    r2 = await wl_client.get("/white-label/config")
    assert r2.status_code == 200
    assert r2.json()["id"] == data["id"]


async def test_put_config_atualiza_campos(wl_client, db_session):
    """PUT /white-label/config deve atualizar campos e não permitir mudar empresa_id."""
    emp_id = await _criar_empresa(db_session, "EmpUpdate")
    await _registrar_e_logar(wl_client, "update@test.com", emp_id)

    r = await wl_client.put(
        "/white-label/config",
        json={"title": "Meu Sistema", "primary_color": "#ff0000"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "Meu Sistema"
    assert data["primary_color"] == "#ff0000"
    # empresa_id nunca deve ser alterado
    assert data["empresa_id"] == str(emp_id)


async def test_config_nao_acessivel_sem_auth(wl_client):
    """GET /white-label/config sem autenticação deve retornar 401."""
    # Fazer logout explícito apagando cookies
    wl_client.cookies.clear()
    r = await wl_client.get("/white-label/config")
    assert r.status_code == 401


async def test_listar_modulos_globais(wl_client, db_session):
    """GET /white-label/modulos deve retornar o catálogo global sem filtro de tenant."""
    emp_id = await _criar_empresa(db_session, "EmpMod")
    await _registrar_e_logar(wl_client, "mod@test.com", emp_id)
    await _criar_modulo(db_session)

    r = await wl_client.get("/white-label/modulos")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Deve conter 'nome' e 'rota' (campos obrigatórios)
    assert "nome" in data[0]
    assert "rota" in data[0]


async def test_obter_modulo_por_id(wl_client, db_session):
    """GET /white-label/modulos/{id_} deve retornar o módulo correto."""
    emp_id = await _criar_empresa(db_session, "EmpModId")
    await _registrar_e_logar(wl_client, "modid@test.com", emp_id)
    mid_hex = await _criar_modulo(db_session)

    # Converter hex para UUID com hífens
    mid_uuid = str(uuid.UUID(mid_hex))
    r = await wl_client.get(f"/white-label/modulos/{mid_uuid}")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == mid_uuid


async def test_ciclo_empresa_modulos(wl_client, db_session):
    """POST → GET → PUT → DELETE para /empresa-modulos."""
    emp_id = await _criar_empresa(db_session, "EmpModCiclo")
    await _registrar_e_logar(wl_client, "modciclo@test.com", emp_id)
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    # POST — vincular
    r = await wl_client.post(
        "/white-label/empresa-modulos",
        json={"modulo_id": mid_uuid, "ativo": True},
    )
    assert r.status_code == 201, r.text
    em = r.json()
    assert em["modulo_id"] == mid_uuid
    assert em["ativo"] is True
    em_id = em["id"]

    # GET — listar
    lista = (await wl_client.get("/white-label/empresa-modulos")).json()
    assert any(e["id"] == em_id for e in lista)

    # PUT — desativar
    r2 = await wl_client.put(
        f"/white-label/empresa-modulos/{em_id}",
        json={"ativo": False},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["ativo"] is False

    # DELETE
    r3 = await wl_client.delete(f"/white-label/empresa-modulos/{em_id}")
    assert r3.status_code == 204, r3.text

    # Verificar que foi removido
    lista2 = (await wl_client.get("/white-label/empresa-modulos")).json()
    assert all(e["id"] != em_id for e in lista2)


async def test_ciclo_empresa_modulos_telas(wl_client, db_session):
    """POST → GET → PUT → DELETE para /empresa-modulos-telas."""
    emp_id = await _criar_empresa(db_session, "EmpTelasCiclo")
    await _registrar_e_logar(wl_client, "telas@test.com", emp_id)
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    # POST — vincular tela
    r = await wl_client.post(
        "/white-label/empresa-modulos-telas",
        json={"modulo_id": mid_uuid, "tela_id": "dashboard", "ativo": True},
    )
    assert r.status_code == 201, r.text
    tela = r.json()
    assert tela["tela_id"] == "dashboard"
    tela_id = tela["id"]

    # GET — listar telas
    lista = (await wl_client.get("/white-label/empresa-modulos-telas")).json()
    assert any(t["id"] == tela_id for t in lista)

    # PUT — desativar tela
    r2 = await wl_client.put(
        f"/white-label/empresa-modulos-telas/{tela_id}",
        json={"ativo": False},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["ativo"] is False

    # DELETE
    r3 = await wl_client.delete(f"/white-label/empresa-modulos-telas/{tela_id}")
    assert r3.status_code == 204, r3.text


async def test_isolamento_cross_tenant_config(wl_client, db_session):
    """Empresa B não pode ler ou modificar a config da empresa A."""
    emp_a = await _criar_empresa(db_session, "Iso-A")
    emp_b = await _criar_empresa(db_session, "Iso-B")

    # Empresa A configura
    await _registrar_e_logar(wl_client, "iso-a@test.com", emp_a)
    r = await wl_client.put(
        "/white-label/config",
        json={"title": "Config da Empresa A"},
    )
    assert r.status_code == 200
    config_a_id = r.json()["id"]

    # Empresa B loga
    await _registrar_e_logar(wl_client, "iso-b@test.com", emp_b)

    # Empresa B obtém a SUA config — deve ser um registro diferente
    r2 = await wl_client.get("/white-label/config")
    assert r2.status_code == 200
    data_b = r2.json()
    # empresa_b deve ter seu próprio registro
    assert data_b["empresa_id"] == str(emp_b)
    # id deve ser diferente do da empresa A
    assert data_b["id"] != config_a_id


async def test_isolamento_cross_tenant_empresa_modulos(wl_client, db_session):
    """Empresa B não pode ver, editar ou deletar empresa-modulos da empresa A."""
    emp_a = await _criar_empresa(db_session, "IsoMod-A")
    emp_b = await _criar_empresa(db_session, "IsoMod-B")
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    # Empresa A vincula módulo
    await _registrar_e_logar(wl_client, "iso-mod-a@test.com", emp_a)
    r = await wl_client.post(
        "/white-label/empresa-modulos",
        json={"modulo_id": mid_uuid, "ativo": True},
    )
    assert r.status_code == 201
    em_a_id = r.json()["id"]

    # Empresa B loga
    await _registrar_e_logar(wl_client, "iso-mod-b@test.com", emp_b)

    # Empresa B lista seus módulos — não deve ver o da empresa A
    lista_b = (await wl_client.get("/white-label/empresa-modulos")).json()
    ids_b = [e["id"] for e in lista_b]
    assert em_a_id not in ids_b, "empresa B está vendo módulo da empresa A!"

    # Empresa B tenta editar o registro da empresa A → 404
    r_put = await wl_client.put(
        f"/white-label/empresa-modulos/{em_a_id}",
        json={"ativo": False},
    )
    assert r_put.status_code == 404

    # Empresa B tenta deletar o registro da empresa A → 404
    r_del = await wl_client.delete(f"/white-label/empresa-modulos/{em_a_id}")
    assert r_del.status_code == 404


async def test_nao_autenticado_empresa_modulos(wl_client):
    """Endpoints de empresa-modulos devem exigir autenticação."""
    wl_client.cookies.clear()
    assert (await wl_client.get("/white-label/empresa-modulos")).status_code == 401
    assert (
        await wl_client.post(
            "/white-label/empresa-modulos",
            json={"modulo_id": str(uuid.uuid4()), "ativo": True},
        )
    ).status_code == 401


# ── Testes: catálogo de módulos gravável (admin_vertical) ─────────────────────

async def test_admin_vertical_cria_modulo(wl_client, db_session):
    """admin_vertical pode criar módulo via POST /white-label/modulos (201)."""
    await login_as(
        wl_client,
        db_session,
        role="admin_vertical",
        email="admin-cria@test.com",
    )

    r = await wl_client.post(
        "/white-label/modulos",
        json={"nome": "FinanceiroTest", "rota": "/financeiro-test", "icone": "BarChart3"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nome"] == "FinanceiroTest"
    assert data["rota"] == "/financeiro-test"
    assert data["icone"] == "BarChart3"
    assert "id" in data

    # Limpa o registro criado para não poluir outros testes
    await db_session.execute(
        text("DELETE FROM modulos WHERE id = :id"),
        {"id": data["id"]},
    )
    await db_session.commit()


async def test_admin_vertical_edita_modulo(wl_client, db_session):
    """admin_vertical pode atualizar módulo via PUT /white-label/modulos/{id} (200)."""
    await login_as(
        wl_client,
        db_session,
        role="admin_vertical",
        email="admin-edita@test.com",
    )
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    r = await wl_client.put(
        f"/white-label/modulos/{mid_uuid}",
        json={"nome": "NomeAtualizado", "descricao": "Nova desc"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["nome"] == "NomeAtualizado"
    assert data["descricao"] == "Nova desc"

    # Limpa
    await db_session.execute(
        text("DELETE FROM modulos WHERE id = :id"),
        {"id": mid_uuid},
    )
    await db_session.commit()


async def test_admin_vertical_deleta_modulo(wl_client, db_session):
    """admin_vertical pode deletar módulo via DELETE /white-label/modulos/{id} (204)."""
    await login_as(
        wl_client,
        db_session,
        role="admin_vertical",
        email="admin-deleta@test.com",
    )
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    r = await wl_client.delete(f"/white-label/modulos/{mid_uuid}")
    assert r.status_code == 204, r.text

    # Confirma que sumiu
    r2 = await wl_client.get(f"/white-label/modulos/{mid_uuid}")
    assert r2.status_code == 404


async def test_usuario_comum_nao_pode_criar_modulo(wl_client, db_session):
    """Usuário com role cliente_torq recebe 403 ao tentar POST /white-label/modulos."""
    await login_as(
        wl_client,
        db_session,
        role="cliente_torq",
        email="comum-cria@test.com",
    )

    r = await wl_client.post(
        "/white-label/modulos",
        json={"nome": "Tentativa", "rota": "/tentativa"},
    )
    assert r.status_code == 403, r.text


async def test_usuario_comum_nao_pode_editar_modulo(wl_client, db_session):
    """Usuário com role cliente_torq recebe 403 ao tentar PUT /white-label/modulos/{id}."""
    await login_as(
        wl_client,
        db_session,
        role="cliente_torq",
        email="comum-edita@test.com",
    )
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    r = await wl_client.put(
        f"/white-label/modulos/{mid_uuid}",
        json={"nome": "Tentativa"},
    )
    assert r.status_code == 403, r.text

    # Limpa
    await db_session.execute(
        text("DELETE FROM modulos WHERE id = :id"),
        {"id": mid_uuid},
    )
    await db_session.commit()


async def test_usuario_comum_nao_pode_deletar_modulo(wl_client, db_session):
    """Usuário com role cliente_torq recebe 403 ao tentar DELETE /white-label/modulos/{id}."""
    await login_as(
        wl_client,
        db_session,
        role="cliente_torq",
        email="comum-deleta@test.com",
    )
    mid_hex = await _criar_modulo(db_session)
    mid_uuid = str(uuid.UUID(mid_hex))

    r = await wl_client.delete(f"/white-label/modulos/{mid_uuid}")
    assert r.status_code == 403, r.text

    # Limpa
    await db_session.execute(
        text("DELETE FROM modulos WHERE id = :id"),
        {"id": mid_uuid},
    )
    await db_session.commit()
