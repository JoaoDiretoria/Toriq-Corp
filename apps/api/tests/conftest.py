import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.db import get_db
from app.core.config import settings
from app.main import app

# TEST_DATABASE_URL é lido do .env via pydantic-settings (Settings já carregou o .env).
# Preferimos a variável dedicada de teste; se ausente, usamos a URL principal.
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", settings.database_url)


@pytest.fixture(autouse=True)
def _open_register_for_tests():
    """A suíte cria usuários via /auth/register (helper login_as), então o
    cadastro precisa estar aberto por padrão nos testes. O teste dedicado de
    gating (test_register_gating) sobrescreve isto pontualmente."""
    original = settings.open_register
    settings.open_register = True
    yield
    settings.open_register = original


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(
        TEST_DB_URL,
        connect_args={"ssl": False},
        poolclass=pool.NullPool,
    )
    yield eng
    await eng.dispose()


@pytest.fixture
async def db_session(engine):
    """
    Fixture de sessão com rollback transacional.

    Cada teste recebe uma AsyncSession amarrada a uma conexão/transação aberta.
    O app faz commits (que viram savepoint-releases), mas o rollback final
    desfaz TUDO — o banco de teste fica limpo após cada teste.
    """
    conn = await engine.connect()
    trans = await conn.begin()
    session = AsyncSession(
        bind=conn,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()


@pytest.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
