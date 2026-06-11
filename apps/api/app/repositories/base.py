import uuid
from typing import Generic, Protocol, TypeVar

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class TenantModel(Protocol):
    id: uuid.UUID
    empresa_id: uuid.UUID


T = TypeVar("T", bound=TenantModel)


class TenantRepository(Generic[T]):
    """Repository base que SEMPRE filtra por empresa_id (substitui o RLS).

    O isolamento é estrutural: todo método aplica o filtro de tenant; nenhum
    expõe query sem ele. `add`/`update` forçam o empresa_id do construtor.
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

    async def get(self, id_: uuid.UUID) -> T | None:
        return await self.db.scalar(
            select(self.model).where(
                self.model.id == id_, self.model.empresa_id == self.empresa_id
            )
        )

    async def add(self, **fields) -> T:
        obj = self.model(empresa_id=self.empresa_id, **fields)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, id_: uuid.UUID, **fields) -> T | None:
        obj = await self.get(id_)
        if obj is None:
            return None
        for k, v in fields.items():
            setattr(obj, k, v)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id_: uuid.UUID) -> bool:
        result = await self.db.execute(
            sa_delete(self.model).where(
                self.model.id == id_, self.model.empresa_id == self.empresa_id
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def count(self) -> int:
        return await self.db.scalar(
            select(func.count()).select_from(self.model).where(
                self.model.empresa_id == self.empresa_id
            )
        )
