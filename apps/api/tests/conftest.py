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
    # ── Contas a Receber ──────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS contas_receber_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#6366f1',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_receber (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES contas_receber_colunas(id) ON DELETE CASCADE,
        numero TEXT NOT NULL DEFAULT '',
        cliente_nome TEXT NOT NULL DEFAULT '—',
        valor NUMERIC(15,2) NOT NULL DEFAULT 0,
        valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        ordem INTEGER NOT NULL DEFAULT 0,
        arquivado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        cliente_id CHAR(32),
        cliente_cnpj TEXT,
        servico_produto TEXT,
        descricao TEXT,
        data_competencia DATE,
        data_recebimento DATE,
        data_pagamento DATE,
        data_vencimento DATE,
        forma_pagamento TEXT,
        forma_pagamento_id CHAR(32),
        categoria TEXT,
        conta_financeira TEXT,
        conta_financeira_id CHAR(32),
        observacoes TEXT,
        origem TEXT,
        closer_card_id CHAR(32),
        created_by CHAR(32),
        condicao_pagamento TEXT,
        condicao_pagamento_id CHAR(32),
        recorrente BOOLEAN DEFAULT 0,
        nfe_data_programada DATE,
        nfe_hora_programada TEXT,
        origem_card_id CHAR(32),
        origem_kanban VARCHAR(50),
        contato_nome TEXT,
        contato_email TEXT,
        contato_telefone TEXT,
        empresa_nome TEXT,
        empresa_email TEXT,
        empresa_telefone TEXT,
        empresa_endereco TEXT,
        empresa_numero TEXT,
        empresa_complemento TEXT,
        empresa_bairro TEXT,
        empresa_cidade TEXT,
        empresa_estado TEXT,
        empresa_cep TEXT,
        status_recebimento VARCHAR(50) DEFAULT 'previsto'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_receber_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        conta_id CHAR(32) NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32)
    )
    """,
    # ── Contas a Pagar ────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS contas_pagar_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#6366f1',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_pagar (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES contas_pagar_colunas(id) ON DELETE CASCADE,
        numero TEXT NOT NULL DEFAULT '',
        fornecedor_nome TEXT NOT NULL DEFAULT '—',
        valor NUMERIC(15,2) NOT NULL DEFAULT 0,
        valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        ordem INTEGER NOT NULL DEFAULT 0,
        arquivado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        fornecedor_id CHAR(32),
        fornecedor_cnpj TEXT,
        descricao TEXT,
        data_competencia DATE,
        data_vencimento DATE,
        data_pagamento DATE,
        forma_pagamento TEXT,
        forma_pagamento_id CHAR(32),
        categoria TEXT,
        conta_financeira TEXT,
        conta_financeira_id CHAR(32),
        centro_custo TEXT,
        centro_custo_id CHAR(32),
        observacoes TEXT,
        origem TEXT,
        condicao_pagamento TEXT,
        condicao_pagamento_id CHAR(32),
        recorrente BOOLEAN DEFAULT 0,
        created_by CHAR(32),
        status_pagamento VARCHAR(20) DEFAULT 'previsto',
        frequencia_cobranca VARCHAR(20) DEFAULT 'unico',
        tipo_valor_recorrente VARCHAR(20),
        data_pagamento_programado DATE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_pagar_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        conta_id CHAR(32) NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'movimentacao',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32)
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
