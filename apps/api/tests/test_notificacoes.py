"""Testes auto-contidos para o módulo Notificações.

Usa os modelos gerados reais (Notificacoes, NotificacaoConfig) contra o banco
de teste Postgres com rollback transacional por teste.
"""
import datetime
import uuid

import pytest

from app.models.generated import Notificacoes, NotificacaoConfig, Empresas
from tests.helpers import login_as


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def notif_client(db_session, client):
    """Registra o router de notificações no app (idempotente)."""
    import app.api.notificacoes as notif_api
    from app.main import app as _app

    prefix_exists = any(
        getattr(r, "path", "").startswith("/notificacoes") for r in _app.routes
    )
    if not prefix_exists:
        _app.include_router(notif_api.router)

    yield client


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _login(client, db_session, email: str = "n@n.com") -> uuid.UUID:
    """Registra e autentica um usuário; retorna o empresa_id criado."""
    return await login_as(client, db_session, email=email)


async def _seed_notif(db_session, empresa_id: uuid.UUID, titulo: str = "Teste") -> uuid.UUID:
    """Insere diretamente uma notificação na sessão de teste."""
    notif = Notificacoes(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        tipo="info",
        categoria="sistema",
        titulo=titulo,
        mensagem="mensagem de teste",
        lida=False,
    )
    db_session.add(notif)
    await db_session.commit()
    return notif.id


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_listar_notificacoes_scoped_por_empresa(notif_client, db_session):
    """Lista retorna apenas notificações da empresa autenticada."""
    emp_id = await _login(notif_client, db_session, email="list@n.com")

    # Notificação da própria empresa
    notif_id = await _seed_notif(db_session, emp_id, "Minha Notif")

    # Notificação de outra empresa (não deve aparecer)
    outra = Empresas(id=uuid.uuid4(), nome="Outra", tipo="sst")
    db_session.add(outra)
    await db_session.commit()
    await _seed_notif(db_session, outra.id, "Notif Alheia")

    r = await notif_client.get("/notificacoes")
    assert r.status_code == 200, r.text
    ids = [n["id"] for n in r.json()]
    assert str(notif_id) in ids, "notificação própria não apareceu"
    for n in r.json():
        assert n["empresa_id"] == str(emp_id), "notificação de outra empresa vazou"


async def test_marcar_como_lida(notif_client, db_session):
    """PATCH /notificacoes/{id}/lida marca lida=True e registra lida_em."""
    emp_id = await _login(notif_client, db_session, email="lida@n.com")
    notif_id = await _seed_notif(db_session, emp_id, "Para Marcar Lida")

    r = await notif_client.patch(
        f"/notificacoes/{notif_id}/lida",
        json={"lida_por": None},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["lida"] is True
    assert data["lida_em"] is not None


async def test_filtro_nao_lidas(notif_client, db_session):
    """Filtro nao_lidas=true retorna apenas notificações não lidas."""
    emp_id = await _login(notif_client, db_session, email="naolidafilter@n.com")

    id_nao_lida = await _seed_notif(db_session, emp_id, "Nao Lida")
    id_lida = await _seed_notif(db_session, emp_id, "Lida")

    # Marcar segunda como lida
    await notif_client.patch(
        f"/notificacoes/{id_lida}/lida",
        json={"lida_por": None},
    )

    r = await notif_client.get("/notificacoes?nao_lidas=true")
    assert r.status_code == 200, r.text
    ids = [n["id"] for n in r.json()]
    assert str(id_nao_lida) in ids
    assert str(id_lida) not in ids


async def test_cross_tenant_isolation(notif_client, db_session):
    """Empresa B não pode ler nem marcar lida notificação de empresa A."""
    # Empresa A
    emp_a = await _login(notif_client, db_session, email="iso-a@n.com")
    notif_a_id = await _seed_notif(db_session, emp_a, "Notif A")

    # Empresa B faz login
    emp_b_obj = Empresas(id=uuid.uuid4(), nome="IsoB", tipo="sst")
    db_session.add(emp_b_obj)
    await db_session.commit()
    await notif_client.post(
        "/auth/register",
        json={
            "email": "iso-b@n.com",
            "password": "segredo123",
            "nome": "B",
            "role": "cliente_torq",
            "empresa_id": str(emp_b_obj.id),
        },
    )
    await notif_client.post(
        "/auth/login", json={"email": "iso-b@n.com", "password": "segredo123"}
    )

    # B não deve conseguir ler notificação de A
    r_get = await notif_client.get(f"/notificacoes/{notif_a_id}")
    assert r_get.status_code == 404, f"cross-tenant GET vazou: {r_get.status_code}"

    # B não deve conseguir marcar lida notificação de A
    r_patch = await notif_client.patch(
        f"/notificacoes/{notif_a_id}/lida",
        json={"lida_por": None},
    )
    assert r_patch.status_code == 404, f"cross-tenant PATCH vazou: {r_patch.status_code}"


async def test_deletar_notificacao(notif_client, db_session):
    """DELETE remove a notificação e retorna 404 em seguida."""
    emp_id = await _login(notif_client, db_session, email="del@n.com")
    notif_id = await _seed_notif(db_session, emp_id, "Para Deletar")

    r_del = await notif_client.delete(f"/notificacoes/{notif_id}")
    assert r_del.status_code == 204, r_del.text

    r_get = await notif_client.get(f"/notificacoes/{notif_id}")
    assert r_get.status_code == 404


async def test_criar_notificacao_service(notif_client, db_session):
    """Unit test: criar_notificacao insere uma linha na sessão."""
    import app.services.notificacoes as svc

    emp = Empresas(id=uuid.uuid4(), nome="SvcEmp", tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    notif = await svc.criar_notificacao(
        db_session,
        empresa_id=emp.id,
        titulo="Novo treinamento criado",
        mensagem="O treinamento X foi criado.",
        tipo="success",
        categoria="treinamento",
        modulo="treinamentos",
        referencia_tipo="treinamento",
        referencia_id=uuid.uuid4(),
    )

    assert notif.id is not None
    assert notif.empresa_id == emp.id
    assert notif.titulo == "Novo treinamento criado"
    assert notif.tipo == "success"
    assert notif.lida is False


async def test_requer_auth(notif_client):
    """Todas as rotas de notificações exigem autenticação."""
    dummy_id = str(uuid.uuid4())
    assert (await notif_client.get("/notificacoes")).status_code == 401
    assert (await notif_client.get(f"/notificacoes/{dummy_id}")).status_code == 401
    assert (
        await notif_client.patch(
            f"/notificacoes/{dummy_id}/lida", json={"lida_por": None}
        )
    ).status_code == 401
    assert (await notif_client.delete(f"/notificacoes/{dummy_id}")).status_code == 401


async def test_config_patch_requer_admin(notif_client, db_session):
    """A config global de notificações só pode ser alterada por admin_vertical."""
    await _login(notif_client, db_session, email="naoadmin@n.com")  # cliente_torq
    r = await notif_client.patch(
        "/notificacoes/config/contas_pagar", json={"ativo": False}
    )
    assert r.status_code == 403
