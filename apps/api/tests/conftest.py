import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base, get_db
from app.main import app

# Tables used by the unit test suite (public schema mapped to None for SQLite).
_TEST_TABLES = ["users", "public.empresas"]


def _register_sqlite_functions(dbapi_conn, _connection_record):
    """Register PostgreSQL functions that SQLite lacks, for the test suite."""
    dbapi_conn.create_function(
        "now", 0, lambda: datetime.datetime.now(datetime.UTC).isoformat(" ")
    )


@pytest.fixture
async def db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        execution_options={"schema_translate_map": {"public": None}},
    )
    event.listen(engine.sync_engine, "connect", _register_sqlite_functions)

    def _create(conn):
        tables = [Base.metadata.tables[name] for name in _TEST_TABLES]
        Base.metadata.create_all(conn, tables=tables)

    async with engine.begin() as conn:
        await conn.run_sync(_create)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with maker() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
