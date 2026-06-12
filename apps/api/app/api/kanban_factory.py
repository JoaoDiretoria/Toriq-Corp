"""Fábrica de routers de kanban: cards CRUD + colunas CRUD + mover + reorder + bootstrap."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.repositories.base import TenantRepository


class _MoverIn(BaseModel):
    coluna_destino_id: uuid.UUID
    justificativa: str | None = None


class _ReorderItem(BaseModel):
    id: uuid.UUID
    ordem: int


def make_kanban_router(
    *,
    card_model,
    coluna_model,
    mov_model,
    card_in,
    card_update,
    card_out,
    coluna_in,
    coluna_out,
    prefix: str,
    tags: list[str],
    default_colunas: list[str],
):
    """Cria um APIRouter completo de kanban.

    Estrutura gerada:
      GET/POST {prefix}/           — listar/criar cards
      GET/PUT/DELETE {prefix}/{id} — obter/atualizar/excluir card
      POST {prefix}/{id}/mover     — mover card entre colunas (registra movimentação)
      PATCH {prefix}/reorder       — reordenar cards em lote
      POST {prefix}/bootstrap-colunas — criar colunas padrão
      GET/POST/PUT/DELETE {prefix}/colunas/* — CRUD de colunas

    Segurança:
    - Todas as rotas exigem autenticação (get_current_user).
    - TenantRepository garante que cada operação é filtrada pelo empresa_id do usuário.
    - card_update NÃO deve conter coluna_id nem FKs de parentesco (anti mass-assignment).
    - /mover valida que o card pertence à empresa via TenantRepository.get antes de mover.

    Movimentações:
    - Os modelos de movimentação dos 4 kanbans legados NÃO possuem empresa_id.
    - Eles exigem: card_id (NOT NULL), tipo (NOT NULL, alguns têm server_default),
      descricao (NOT NULL).
    - A fábrica introspeta as colunas do mov_model e só seta os campos que existem:
      card_id, empresa_id (se existir), tipo (se existir), descricao (se existir),
      coluna_origem_id (se existir), coluna_destino_id (se existir).
    - Isso torna a fábrica robusta a variações entre kanbans.
    """
    router = APIRouter(prefix=prefix, tags=tags)

    # Inspeciona colunas do modelo de movimentação uma única vez
    _mov_columns: set[str] = {c.key for c in mov_model.__table__.columns}

    class _CardRepo(TenantRepository):
        model = card_model

    def _repo(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> _CardRepo:
        if user.empresa_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
        return _CardRepo(db, user.empresa_id)

    # ── Colunas CRUD ──────────────────────────────────────────────────────────
    # Registrado primeiro para que /colunas não seja capturado por /{id_}
    router.include_router(
        make_crud_router(
            model=coluna_model,
            create_schema=coluna_in,
            update_schema=coluna_in,
            read_schema=coluna_out,
            prefix="/colunas",
            tags=tags,
        )
    )

    # ── Bootstrap de colunas ──────────────────────────────────────────────────
    @router.post("/bootstrap-colunas", status_code=status.HTTP_201_CREATED)
    async def bootstrap_colunas(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        """Cria as colunas padrão se a empresa ainda não tiver nenhuma."""
        if user.empresa_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
        existe = await db.scalar(
            select(coluna_model).where(coluna_model.empresa_id == user.empresa_id)
        )
        if existe:
            return {"criadas": 0}
        for i, nome in enumerate(default_colunas):
            db.add(coluna_model(id=uuid.uuid4(), empresa_id=user.empresa_id, nome=nome, ordem=i))
        await db.commit()
        return {"criadas": len(default_colunas)}

    # ── Reorder ───────────────────────────────────────────────────────────────
    @router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
    async def reorder(
        itens: list[_ReorderItem],
        r: _CardRepo = Depends(_repo),
    ):
        """Reordena múltiplos cards em lote (tenant-scoped)."""
        for it in itens:
            await r.update(it.id, ordem=it.ordem)

    # ── Mover card entre colunas ──────────────────────────────────────────────
    @router.post("/{card_id}/mover", response_model=card_out)
    async def mover(
        card_id: uuid.UUID,
        body: _MoverIn,
        r: _CardRepo = Depends(_repo),
        db: AsyncSession = Depends(get_db),
    ):
        """Move um card para outra coluna e registra movimentação (tenant-scoped).

        Segurança: usa TenantRepository.get para garantir que card_id pertence
        à empresa do usuário autenticado antes de qualquer modificação.
        """
        card = await r.get(card_id)
        if card is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "card não encontrado")

        origem = card.coluna_id
        card = await r.update(card_id, coluna_id=body.coluna_destino_id)

        # Monta o registro de movimentação somente com os campos que o modelo possui.
        # Os 4 kanbans legados NÃO têm empresa_id nas movimentações.
        descricao = body.justificativa or "Movido para outra coluna"
        mov_fields: dict = {"id": uuid.uuid4(), "card_id": card_id}
        if "empresa_id" in _mov_columns:
            mov_fields["empresa_id"] = r.empresa_id
        if "tipo" in _mov_columns:
            mov_fields["tipo"] = "mudanca_coluna"
        if "descricao" in _mov_columns:
            mov_fields["descricao"] = descricao
        if "coluna_origem_id" in _mov_columns:
            mov_fields["coluna_origem_id"] = origem
        if "coluna_destino_id" in _mov_columns:
            mov_fields["coluna_destino_id"] = body.coluna_destino_id

        db.add(mov_model(**mov_fields))
        await db.commit()
        return card

    # ── Cards CRUD — inlined para evitar prefix="" vazio no include_router ────
    # FastAPI não aceita include_router com prefix="" e rotas com path="".
    # A solução é definir as rotas de cards diretamente no router principal.
    # card_update NÃO inclui coluna_id/FKs de parentesco (anti mass-assignment).

    @router.get("", response_model=list[card_out])
    async def listar_cards(r: _CardRepo = Depends(_repo)):
        return await r.list()

    @router.post("", response_model=card_out, status_code=status.HTTP_201_CREATED)
    async def criar_card(payload: card_in, r: _CardRepo = Depends(_repo)):
        return await r.add(**payload.model_dump(exclude_unset=True))

    @router.get("/{id_}", response_model=card_out)
    async def obter_card(id_: uuid.UUID, r: _CardRepo = Depends(_repo)):
        obj = await r.get(id_)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
        return obj

    @router.put("/{id_}", response_model=card_out)
    async def atualizar_card(
        id_: uuid.UUID, payload: card_update, r: _CardRepo = Depends(_repo)
    ):
        obj = await r.update(id_, **payload.model_dump(exclude_unset=True))
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
        return obj

    @router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
    async def remover_card(id_: uuid.UUID, r: _CardRepo = Depends(_repo)):
        if not await r.delete(id_):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")

    return router
