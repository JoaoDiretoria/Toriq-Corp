from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# SSL do banco é configurável e LIGADO por padrão (settings.db_ssl=True).
# Com asyncpg o SSL não vai na query string da URL — passa-se por connect_args.
# DB_SSL=false só deve ser usado quando o Postgres genuinamente não termina TLS
# (ex.: dev local), e é um risco quando o banco está exposto na internet.
connect_args = {} if settings.db_ssl else {"ssl": False}
engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    connect_args=connect_args,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
