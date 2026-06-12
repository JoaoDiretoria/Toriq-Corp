import os

import pytest
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"), reason="precisa do db-toriq-corp configurado"
)


@pytest.fixture
async def conn():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"ssl": False})
    async with engine.connect() as c:
        yield c
    await engine.dispose()


async def test_todas_as_tabelas_existem(conn):
    n = await conn.scalar(text(
        "select count(*) from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE'"
    ))
    assert n >= 173  # 172 introspectadas + users (credenciais)


async def test_enum_app_role_tem_6_valores(conn):
    vals = await conn.scalar(text(
        "select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid "
        "where t.typname='app_role'"
    ))
    assert vals == 6


async def test_nenhuma_fk_aponta_para_schema_auth(conn):
    # Após a religação, nenhuma FK deve referenciar o schema auth (que não existe mais).
    n = await conn.scalar(text("""
        select count(*) from information_schema.referential_constraints rc
        join information_schema.table_constraints tc
          on tc.constraint_name = rc.unique_constraint_name
        where tc.table_schema = 'auth'
    """))
    assert n == 0


async def test_profiles_referencia_users(conn):
    fk = await conn.scalar(text(
        "select count(*) from information_schema.table_constraints "
        "where constraint_name='profiles_id_users_fkey' and constraint_type='FOREIGN KEY'"
    ))
    assert fk == 1


async def test_zero_triggers_no_banco_novo(conn):
    # O banco novo nasce sem lógica; triggers serão portados para Python.
    n = await conn.scalar(text("""
        select count(*) from pg_trigger t
        join pg_class c on c.oid=t.tgrelid
        join pg_namespace ns on ns.oid=c.relnamespace
        where ns.nspname='public' and not t.tgisinternal
    """))
    assert n == 0
