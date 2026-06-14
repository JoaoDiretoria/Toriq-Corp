import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.repositories.base import TenantRepository


def make_crud_router(*, model, create_schema, update_schema, read_schema, prefix, tags):
    router = APIRouter(prefix=prefix, tags=tags)

    class _Repo(TenantRepository):
        pass

    _Repo.model = model

    def get_repo(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> _Repo:
        if user.empresa_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
        return _Repo(db, user.empresa_id)

    @router.get("", response_model=list[read_schema])
    async def listar(repo: _Repo = Depends(get_repo)):
        # Leitura cacheada (Redis, TTL curto + invalidação no write). Devolve dicts
        # de colunas que o response_model valida igual a um objeto ORM.
        return await repo.list_cached()

    @router.get("/{id_}", response_model=read_schema)
    async def obter(id_: uuid.UUID, repo: _Repo = Depends(get_repo)):
        obj = await repo.get_cached(id_)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
        return obj

    @router.post("", response_model=read_schema, status_code=status.HTTP_201_CREATED)
    async def criar(payload: create_schema, repo: _Repo = Depends(get_repo)):
        return await repo.add(**payload.model_dump(exclude_unset=True))

    @router.put("/{id_}", response_model=read_schema)
    async def atualizar(id_: uuid.UUID, payload: update_schema, repo: _Repo = Depends(get_repo)):
        obj = await repo.update(id_, **payload.model_dump(exclude_unset=True))
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
        return obj

    @router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
    async def remover(id_: uuid.UUID, repo: _Repo = Depends(get_repo)):
        if not await repo.delete(id_):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")

    return router
