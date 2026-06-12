"""Testes TDD para a fábrica make_kanban_router."""
import uuid

import pytest
from pydantic import BaseModel
from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.api.kanban_factory import make_kanban_router
from app.core.db import Base
from tests.helpers import login_as


# ── Modelos de teste (SQLite-friendly, sem server_default PostgreSQL-specific) ──

class _KColuna(Base):
    __tablename__ = "_kcol"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class _KCard(Base):
    __tablename__ = "_kcard"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class _KMov(Base):
    __tablename__ = "_kmov"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_origem_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True)
    coluna_destino_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True)


# ── Schemas de teste ─────────────────────────────────────────────────────────

class CardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID


class CardUpdate(BaseModel):
    titulo: str | None = None


class CardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    model_config = {"from_attributes": True}


class ColIn(BaseModel):
    nome: str
    ordem: int = 0


class ColOut(BaseModel):
    id: uuid.UUID
    nome: str
    ordem: int
    model_config = {"from_attributes": True}


# ── Fixture: cria tabelas de teste + registra router ─────────────────────────

@pytest.fixture
async def kclient(db_session, client):
    for t in (_KColuna.__table__, _KCard.__table__, _KMov.__table__):
        async with db_session.bind.begin() as conn:
            await conn.run_sync(t.create)
    from app.main import app
    app.include_router(
        make_kanban_router(
            card_model=_KCard,
            coluna_model=_KColuna,
            mov_model=_KMov,
            card_in=CardIn,
            card_update=CardUpdate,
            card_out=CardOut,
            coluna_in=ColIn,
            coluna_out=ColOut,
            prefix="/k",
            tags=["k"],
            default_colunas=["A", "B"],
        )
    )
    return client


# ── Testes ────────────────────────────────────────────────────────────────────

async def test_kanban_ciclo(kclient, db_session):
    """Ciclo completo: bootstrap → criar card → mover → deletar."""
    await login_as(kclient, db_session, email="k@k.com")

    # Bootstrap colunas
    resp = await kclient.post("/k/bootstrap-colunas")
    assert resp.status_code == 201, resp.text
    assert resp.json()["criadas"] == 2

    # Segunda chamada não cria duplicatas
    resp2 = await kclient.post("/k/bootstrap-colunas")
    assert resp2.json()["criadas"] == 0

    # Listar colunas
    cols = (await kclient.get("/k/colunas")).json()
    assert len(cols) == 2

    # Criar card
    card = (
        await kclient.post("/k", json={"titulo": "X", "coluna_id": cols[0]["id"]})
    ).json()
    assert card["titulo"] == "X"
    assert card["coluna_id"] == cols[0]["id"]

    # Listar cards
    lista = (await kclient.get("/k")).json()
    assert len(lista) == 1

    # Mover card — coluna_id deve mudar, movimentação deve ser registrada
    moved = await kclient.post(
        f"/k/{card['id']}/mover",
        json={"coluna_destino_id": cols[1]["id"]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["coluna_id"] == cols[1]["id"]

    # Reorder
    reorder_resp = await kclient.patch(
        "/k/reorder", json=[{"id": card["id"], "ordem": 5}]
    )
    assert reorder_resp.status_code == 204

    # Deletar card
    del_resp = await kclient.delete(f"/k/{card['id']}")
    assert del_resp.status_code == 204


async def test_kanban_requer_auth(kclient):
    """Rotas devem retornar 401 sem autenticação."""
    assert (await kclient.get("/k")).status_code == 401
    assert (await kclient.post("/k/bootstrap-colunas")).status_code == 401
    assert (await kclient.get("/k/colunas")).status_code == 401


async def test_kanban_isolamento(db_session, client):
    """Card de uma empresa não deve ser acessível por outra empresa."""
    from app.models.generated import Empresas as Empresa

    # Garantir que as tabelas foram criadas (podem já existir do outro teste)
    for t in (_KColuna.__table__, _KCard.__table__, _KMov.__table__):
        async with db_session.bind.begin() as conn:
            try:
                await conn.run_sync(t.create)
            except Exception:
                pass  # tabela já existe

    from app.main import app
    # Registrar o router apenas se ainda não estiver registrado
    prefix_exists = any(r.path.startswith("/k") for r in app.routes)
    if not prefix_exists:
        app.include_router(
            make_kanban_router(
                card_model=_KCard,
                coluna_model=_KColuna,
                mov_model=_KMov,
                card_in=CardIn,
                card_update=CardUpdate,
                card_out=CardOut,
                coluna_in=ColIn,
                coluna_out=ColOut,
                prefix="/k",
                tags=["k"],
                default_colunas=["A", "B"],
            )
        )

    # Empresa A
    emp_a = Empresa(id=uuid.uuid4(), nome="A", tipo="sst")
    emp_b = Empresa(id=uuid.uuid4(), nome="B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, empresa_id: uuid.UUID):
        await client.post(
            "/auth/register",
            json={
                "email": email,
                "password": "segredo123",
                "nome": email,
                "role": "cliente_torq",
                "empresa_id": str(empresa_id),
            },
        )
        await client.post(
            "/auth/login", json={"email": email, "password": "segredo123"}
        )

    await _reg_login("a@a.com", emp_a.id)

    # Bootstrap + criar card para empresa A
    await client.post("/k/bootstrap-colunas")
    cols = (await client.get("/k/colunas")).json()
    card_a = (
        await client.post("/k", json={"titulo": "card_a", "coluna_id": cols[0]["id"]})
    ).json()

    # Logar como empresa B
    await _reg_login("b@b.com", emp_b.id)

    # Empresa B não deve ver card de empresa A
    lista_b = (await client.get("/k")).json()
    ids_b = [c["id"] for c in lista_b]
    assert card_a["id"] not in ids_b, "card de empresa A visível para empresa B!"

    # Empresa B não deve conseguir mover card de empresa A
    resp = await client.post(
        f"/k/{card_a['id']}/mover",
        json={"coluna_destino_id": cols[0]["id"]},
    )
    assert resp.status_code == 404


async def test_criar_card_rejeita_coluna_de_outra_empresa(db_session, client):
    """Criar card com coluna_id de outra empresa deve retornar 404 (anti FK-injection)."""
    from app.models.generated import Empresas as Empresa

    # Garante que tabelas existem
    for t in (_KColuna.__table__, _KCard.__table__, _KMov.__table__):
        async with db_session.bind.begin() as conn:
            try:
                await conn.run_sync(t.create)
            except Exception:
                pass  # tabela já existe

    from app.main import app as _app
    prefix_exists = any(r.path.startswith("/k") for r in _app.routes)
    if not prefix_exists:
        _app.include_router(
            make_kanban_router(
                card_model=_KCard,
                coluna_model=_KColuna,
                mov_model=_KMov,
                card_in=CardIn,
                card_update=CardUpdate,
                card_out=CardOut,
                coluna_in=ColIn,
                coluna_out=ColOut,
                prefix="/k",
                tags=["k"],
                default_colunas=["A", "B"],
            )
        )

    # Empresa A e empresa B
    emp_a = Empresa(id=uuid.uuid4(), nome="Sec-A", tipo="sst")
    emp_b = Empresa(id=uuid.uuid4(), nome="Sec-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A: bootstrap e obter coluna
    await _reg_login("sec-a@a.com", emp_a.id)
    await client.post("/k/bootstrap-colunas")
    cols_a = (await client.get("/k/colunas")).json()
    coluna_a_id = cols_a[0]["id"]

    # Empresa B: tenta criar card usando coluna da empresa A → 404
    await _reg_login("sec-b@b.com", emp_b.id)
    await client.post("/k/bootstrap-colunas")  # empresa B tem suas próprias colunas

    resp = await client.post("/k", json={"titulo": "ataque", "coluna_id": coluna_a_id})
    assert resp.status_code == 404, f"esperado 404, recebeu {resp.status_code}: {resp.text}"


async def test_mover_rejeita_coluna_destino_de_outra_empresa(db_session, client):
    """Mover card para coluna_destino_id de outra empresa deve retornar 404 (anti FK-injection)."""
    from app.models.generated import Empresas as Empresa

    # Garante que tabelas existem
    for t in (_KColuna.__table__, _KCard.__table__, _KMov.__table__):
        async with db_session.bind.begin() as conn:
            try:
                await conn.run_sync(t.create)
            except Exception:
                pass

    from app.main import app as _app
    prefix_exists = any(r.path.startswith("/k") for r in _app.routes)
    if not prefix_exists:
        _app.include_router(
            make_kanban_router(
                card_model=_KCard,
                coluna_model=_KColuna,
                mov_model=_KMov,
                card_in=CardIn,
                card_update=CardUpdate,
                card_out=CardOut,
                coluna_in=ColIn,
                coluna_out=ColOut,
                prefix="/k",
                tags=["k"],
                default_colunas=["A", "B"],
            )
        )

    emp_a = Empresa(id=uuid.uuid4(), nome="Mov-A", tipo="sst")
    emp_b = Empresa(id=uuid.uuid4(), nome="Mov-B", tipo="sst")
    db_session.add_all([emp_a, emp_b])
    await db_session.commit()

    async def _reg_login(email: str, emp_id: uuid.UUID):
        await client.post(
            "/auth/register",
            json={"email": email, "password": "segredo123", "nome": email,
                  "role": "cliente_torq", "empresa_id": str(emp_id)},
        )
        await client.post("/auth/login", json={"email": email, "password": "segredo123"})

    # Empresa A: bootstrap, criar card
    await _reg_login("mov-a@a.com", emp_a.id)
    await client.post("/k/bootstrap-colunas")
    cols_a = (await client.get("/k/colunas")).json()
    card_a = (
        await client.post("/k", json={"titulo": "meu card", "coluna_id": cols_a[0]["id"]})
    ).json()

    # Empresa B: bootstrap e obter coluna
    await _reg_login("mov-b@b.com", emp_b.id)
    await client.post("/k/bootstrap-colunas")
    cols_b = (await client.get("/k/colunas")).json()
    coluna_b_id = cols_b[0]["id"]

    # Empresa B tenta mover o card dela própria mas aponta destino para coluna da empresa A
    # Primeiro cria um card da empresa B
    card_b = (
        await client.post("/k", json={"titulo": "card b", "coluna_id": cols_b[0]["id"]})
    ).json()

    resp = await client.post(
        f"/k/{card_b['id']}/mover",
        json={"coluna_destino_id": cols_a[0]["id"]},  # coluna de outra empresa
    )
    assert resp.status_code == 404, f"esperado 404, recebeu {resp.status_code}: {resp.text}"

    # Mover para coluna da própria empresa B ainda deve funcionar
    resp_ok = await client.post(
        f"/k/{card_b['id']}/mover",
        json={"coluna_destino_id": cols_b[1]["id"]},  # coluna válida de empresa B
    )
    assert resp_ok.status_code == 200, f"mover legítimo falhou: {resp_ok.text}"
