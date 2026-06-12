"""Fatia 0: cadastro gated (/auth/register) + seed do 1º admin."""
from sqlalchemy import select, update

from app.core.config import settings
from app.models.user import User, UserRole
from app.seed_admin import seed_admin
from tests.helpers import login_as


async def test_register_fechado_bloqueia_anonimo(client, db_session):
    """Com open_register=False, anônimo não cadastra (403)."""
    settings.open_register = False  # restaurado pelo fixture autouse
    r = await client.post(
        "/auth/register",
        json={"email": "anon@x.com", "password": "senhaForte123",
              "nome": "Anon", "role": "admin_vertical"},
    )
    assert r.status_code == 403, r.text


async def test_register_fechado_permite_admin_vertical(client, db_session):
    """admin_vertical autenticado cadastra mesmo com open_register=False."""
    # cria/loga um admin_vertical enquanto o cadastro ainda está aberto (fixture)
    await login_as(client, db_session, role="admin_vertical", email="chefe@reg.com")
    settings.open_register = False
    r = await client.post(
        "/auth/register",
        json={"email": "novo@reg.com", "password": "senhaForte123",
              "nome": "Novo", "role": "instrutor"},
    )
    assert r.status_code == 201, r.text


async def test_register_fechado_cliente_torq_nao_cadastra(client, db_session):
    """cliente_torq autenticado NÃO basta — só admin_vertical (403)."""
    await login_as(client, db_session, role="cliente_torq", email="dono@reg.com")
    settings.open_register = False
    r = await client.post(
        "/auth/register",
        json={"email": "x@reg.com", "password": "senhaForte123",
              "nome": "X", "role": "instrutor"},
    )
    assert r.status_code == 403, r.text


async def test_seed_cria_primeiro_admin_e_loga(client, db_session):
    """seed cria o admin_vertical; ele consegue logar com a senha do seed.

    O DB de teste pode já ter admin_vertical pré-existente (a suíte roda sobre o
    banco real). Neutralizamos esses dentro da transação (revertida ao fim) para
    exercitar o caminho de CRIAÇÃO do seed sem tocar dados reais.
    """
    await db_session.execute(
        update(User)
        .where(User.role == UserRole.admin_vertical)
        .values(role=UserRole.instrutor)
    )

    created, msg = await seed_admin(
        db_session, "seed@toriq.com", "senhaSeed123", "Seed Admin"
    )
    assert created is True, msg

    user = await db_session.scalar(select(User).where(User.email == "seed@toriq.com"))
    assert user is not None and user.role == UserRole.admin_vertical

    login = await client.post(
        "/auth/login", json={"email": "seed@toriq.com", "password": "senhaSeed123"}
    )
    assert login.status_code == 200, login.text


async def test_seed_idempotente(client, db_session):
    """Com um admin_vertical já existente, o seed não cria outro."""
    await login_as(client, db_session, role="admin_vertical", email="ja@admin.com")
    created, msg = await seed_admin(
        db_session, "outro@toriq.com", "senhaSeed123", "Outro"
    )
    assert created is False
    assert "já existe" in msg
    # o e-mail proposto não foi criado
    dup = await db_session.scalar(select(User).where(User.email == "outro@toriq.com"))
    assert dup is None
