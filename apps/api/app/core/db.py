from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# O Postgres do EasyPanel é exposto sem SSL (sslmode=disable). Com asyncpg, o SSL
# NÃO se configura pela query string da URL — passa-se por connect_args.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    connect_args={"ssl": False},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
