from __future__ import annotations

import uuid
from typing import Any, Generic, Protocol, TypeVar

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache


class TenantModel(Protocol):
    id: uuid.UUID
    empresa_id: uuid.UUID


T = TypeVar("T", bound=TenantModel)


class TenantRepository(Generic[T]):
    """Repository base que SEMPRE filtra por empresa_id (substitui o RLS).

    O isolamento é estrutural: todo método aplica o filtro de tenant; nenhum
    expõe query sem ele. `add`/`update` forçam o empresa_id do construtor.

    Cache (Redis, com fallback gracioso):
    - ``list_cached``/``get_cached`` são variantes *read-through* para os endpoints
      de LEITURA. Guardam dicts serializados (coluna→valor) por empresa, TTL curto.
    - ``get``/``list`` crus continuam SEM cache: o caminho de escrita (``update``)
      usa ``get`` internamente e muta o objeto ORM — cachear ali quebraria o write.
    - ``add``/``update``/``delete`` invalidam o namespace da tabela+empresa após o
      commit, então no fluxo normal a mudança aparece imediatamente. O TTL é a rede
      de segurança para escritas que escapam pelo SQL direto dos serviços.
    """

    model: type[T]

    def __init__(self, db: AsyncSession, empresa_id: uuid.UUID):
        self.db = db
        self.empresa_id = empresa_id

    # ── Cache helpers ─────────────────────────────────────────────────────────

    def _cache_ns(self) -> str:
        """Namespace de cache da tabela+empresa: ``<tabela>:<empresa_id>``."""
        return f"{self.model.__tablename__}:{self.empresa_id}"

    def _serialize(self, obj: T) -> dict:
        """Serializa uma linha ORM em dict de colunas (JSON-able após default=str)."""
        return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}

    async def _invalidate_cache(self) -> None:
        """Limpa todas as chaves (list + get) da tabela+empresa. Best-effort."""
        await cache.delete_prefixo(self._cache_ns())

    # ── Leitura crua (ORM, SEM cache) ──────────────────────────────────────────

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

    # ── Leitura cacheada (dicts, para endpoints de leitura) ─────────────────────

    async def list_cached(self) -> list[dict]:
        """Lista (tenant-scoped) servida do cache; em miss, consulta e cacheia."""
        async def factory() -> list[dict]:
            return [self._serialize(o) for o in await self.list()]

        result = await cache.get_or_set(
            f"{self._cache_ns()}:list", ttl=None, factory=factory
        )
        return result or []

    async def get_cached(self, id_: uuid.UUID) -> dict | None:
        """Item por id (tenant-scoped) servido do cache; em miss, consulta e cacheia."""
        chave = f"{self._cache_ns()}:get:{id_}"
        cached: Any = await cache.get(chave)
        if cached is not None:
            return cached
        obj = await self.get(id_)
        if obj is None:
            return None
        dados = self._serialize(obj)
        await cache.set(chave, dados, ttl=None)
        return dados

    # ── Escrita (invalida o cache da tabela+empresa) ────────────────────────────

    async def add(self, **fields) -> T:
        # Some generated models rely on server_default (gen_random_uuid()) for id
        # without a Python-side default.  Supply one explicitly so the ORM always
        # has a value — this is safe in both PostgreSQL and SQLite test environments.
        if "id" not in fields:
            id_col = self.model.__table__.c["id"]
            if id_col.default is None:
                fields = {"id": uuid.uuid4(), **fields}
        obj = self.model(empresa_id=self.empresa_id, **fields)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        await self._invalidate_cache()
        return obj

    async def update(self, id_: uuid.UUID, **fields) -> T | None:
        obj = await self.get(id_)
        if obj is None:
            return None
        for k, v in fields.items():
            setattr(obj, k, v)
        await self.db.commit()
        await self.db.refresh(obj)
        await self._invalidate_cache()
        return obj

    async def delete(self, id_: uuid.UUID) -> bool:
        result = await self.db.execute(
            sa_delete(self.model).where(
                self.model.id == id_, self.model.empresa_id == self.empresa_id
            )
        )
        await self.db.commit()
        if result.rowcount > 0:
            await self._invalidate_cache()
        return result.rowcount > 0

    async def count(self) -> int:
        return await self.db.scalar(
            select(func.count()).select_from(self.model).where(
                self.model.empresa_id == self.empresa_id
            )
        )
