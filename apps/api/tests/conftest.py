import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base, get_db
from app.main import app

# Tables used by the unit test suite (public schema mapped to None for SQLite).
_SIMPLE_TABLES = ["users", "public.empresas"]

# Raw SQLite DDL for generated tables that have PostgreSQL-specific syntax
# (server_default with ::cast, CHECK constraints with ARRAY/::cast) which
# SQLAlchemy cannot emit in SQLite-compatible form automatically.
_CADASTRO_DDL = [
    """
    CREATE TABLE IF NOT EXISTS fornecedores (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        razao_social TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        nome_fantasia TEXT,
        cnpj_cpf TEXT,
        email TEXT,
        telefone TEXT,
        endereco TEXT,
        observacoes TEXT,
        classificacao_despesa_padrao VARCHAR(100),
        descricao_despesa_padrao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS formas_pagamento (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        descricao TEXT,
        taxa_percentual NUMERIC(5,2) DEFAULT 0,
        dias_recebimento INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS formas_cobranca (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        periodicidade INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS condicoes_pagamento (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        parcelas INTEGER NOT NULL DEFAULT 1,
        intervalo_dias INTEGER NOT NULL DEFAULT 30,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT,
        entrada_percentual NUMERIC(5,2) DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS centros_custo (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'ambos',
        ativo BOOLEAN NOT NULL DEFAULT 1,
        descricao TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_bancarias (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        banco TEXT NOT NULL,
        agencia TEXT NOT NULL,
        conta TEXT NOT NULL,
        tipo TEXT NOT NULL,
        saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS plano_receitas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS plano_despesas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
]


def _register_sqlite_functions(dbapi_conn, _connection_record):
    """Register PostgreSQL functions that SQLite lacks, for the test suite."""
    import uuid as _uuid

    dbapi_conn.create_function(
        "now", 0, lambda: datetime.datetime.now(datetime.UTC).isoformat(" ")
    )
    dbapi_conn.create_function(
        "gen_random_uuid", 0, lambda: str(_uuid.uuid4()).replace("-", "")
    )


@pytest.fixture
async def db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        execution_options={"schema_translate_map": {"public": None}},
    )
    event.listen(engine.sync_engine, "connect", _register_sqlite_functions)

    def _create(conn):
        tables = [Base.metadata.tables[name] for name in _SIMPLE_TABLES]
        Base.metadata.create_all(conn, tables=tables)

    async with engine.begin() as conn:
        await conn.run_sync(_create)
        # Create cadastro tables with SQLite-compatible DDL (PostgreSQL-generated
        # models have ::cast server_defaults and ARRAY CHECK constraints that
        # SQLite cannot parse).
        for ddl in _CADASTRO_DDL:
            await conn.execute(text(ddl))

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
