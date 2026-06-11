import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class TenantRepository(Generic[T]):
    """Repository base que SEMPRE filtra por empresa_id.

    O isolamento é estrutural: nenhum método expõe query sem o filtro de tenant,
    substituindo a garantia que o RLS dava no Supabase.
    """

    model: type[T]

    def __init__(self, db: AsyncSession, empresa_id: uuid.UUID):
        self.db = db
        self.empresa_id = empresa_id

    async def list(self) -> list[T]:
        result = await self.db.scalars(
            select(self.model).where(self.model.empresa_id == self.empresa_id)
        )
        return list(result)

    async def add(self, **fields) -> T:
        obj = self.model(empresa_id=self.empresa_id, **fields)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj
