"""Testes auto-contidos para o módulo Notificações.

Padrão: cria as tabelas necessárias no motor SQLite em memória fornecido por
conftest, registra o router em app.main.app e exercita os endpoints via cliente
ASGI — identicamente ao padrão em test_kanban_factory.py.
"""
import datetime
import uuid

import pytest
from sqlalchemy import Boolean, DateTime, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from tests.helpers import login_as


# ── Modelos SQLite-friendly para o teste ──────────────────────────────────────
# Os modelos gerados têm server_default PostgreSQL-específico (::text, JSONB,
# ARRAY CHECK) que o SQLite não aceita.  Replicamos somente os campos relevantes
# para os testes, sem nenhum server_default PG-específico.

class _Notificacao(Base):
    __tablename__ = "_notif_notificacoes"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, default="info")
    categoria: Mapped[str] = mapped_column(Text, nullable=False, default="sistema")
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    usuario_nome: Mapped[str | None] = mapped_column(Text, nullable=True)
    modulo: Mapped[str | None] = mapped_column(Text, nullable=True)
    tela: Mapped[str | None] = mapped_column(Text, nullable=True)
    referencia_tipo: Mapped[str | None] = mapped_column(Text, nullable=True)
    referencia_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    lida: Mapped[bool | None] = mapped_column(Boolean, default=False)
    lida_em: Mapped[datetime.datetime | None] = mapped_column(DateTime(True), nullable=True)
    lida_por: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    referencia_dados: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(True), nullable=True)
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(True), nullable=True)


class _NotifConfig(Base):
    __tablename__ = "_notif_config"
    tabela: Mapped[str] = mapped_column(Text, primary_key=True)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    modulo: Mapped[str | None] = mapped_column(Text, nullable=True)
    tela: Mapped[str | None] = mapped_column(Text, nullable=True)
    campo_nome: Mapped[str | None] = mapped_column(Text, nullable=True, default="nome")
    ativo: Mapped[bool | None] = mapped_column(Boolean, default=True)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def notif_client(db_session, client):
    """Cria tabelas de teste e registra o router de notificações."""
    for t in (_Notificacao.__table__, _NotifConfig.__table__):
        async with db_session.bind.begin() as conn:
            await conn.run_sync(t.create)

    # Monkey-patch: substitui os modelos gerados pelos modelos SQLite do teste
    import app.models.generated as gen_models
    import app.services.notificacoes as svc
    import app.api.notificacoes as notif_api

    _orig_notif = gen_models.Notificacoes
    _orig_config = gen_models.NotificacaoConfig
    _orig_repo_model = notif_api._NotifRepo.model

    gen_models.Notificacoes = _Notificacao
    gen_models.NotificacaoConfig = _NotifConfig
    notif_api.m.Notificacoes = _Notificacao
    notif_api.m.NotificacaoConfig = _NotifConfig
    # Patch the class attribute so TenantRepository.get/delete/list use the test model
    notif_api._NotifRepo.model = _Notificacao
    svc.m.Notificacoes = _Notificacao

    # Registra o router no app apenas uma vez
    from app.main import app as _app
    prefix_exists = any(
        getattr(r, "path", "").startswith("/notificacoes") for r in _app.routes
    )
    if not prefix_exists:
        _app.include_router(notif_api.router)

    yield client

    # Restaura modelos e repo originais
    gen_models.Notificacoes = _orig_notif
    gen_models.NotificacaoConfig = _orig_config
    notif_api.m.Notificacoes = _orig_notif
    notif_api.m.NotificacaoConfig = _orig_config
    notif_api._NotifRepo.model = _orig_repo_model
    svc.m.Notificacoes = _orig_notif


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _login(client, db_session, email: str = "n@n.com") -> uuid.UUID:
    """Registra e autentica um usuário; retorna o empresa_id criado."""
    return await login_as(client, db_session, email=email)


async def _seed_notif(db_session, empresa_id: uuid.UUID, titulo: str = "Teste") -> uuid.UUID:
    """Insere diretamente uma notificação na sessão de teste."""
    notif = _Notificacao(
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
    from app.models.generated import Empresas as Empresa
    outra = Empresa(id=uuid.uuid4(), nome="Outra", tipo="sst")
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
    from app.models.generated import Empresas as Empresa

    # Empresa A
    emp_a = await _login(notif_client, db_session, email="iso-a@n.com")
    notif_a_id = await _seed_notif(db_session, emp_a, "Notif A")

    # Empresa B faz login
    emp_b_obj = Empresa(id=uuid.uuid4(), nome="IsoB", tipo="sst")
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
    """Unit test: criar_notificacao insere uma linha na sessão (usa modelos SQLite)."""
    from app.models.generated import Empresas as Empresa
    import app.services.notificacoes as svc

    emp = Empresa(id=uuid.uuid4(), nome="SvcEmp", tipo="sst")
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
