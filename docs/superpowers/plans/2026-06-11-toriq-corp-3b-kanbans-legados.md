# Toriq Corp — Sub-módulo 3b: Kanbans legados (fábrica de kanban)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar os 4 kanbans legados do Toriq Corp — **Closer, Prospecção, Pós-Venda, Cross-Selling** — criando antes uma **fábrica `make_kanban_router`** que generaliza o padrão de kanban (cards CRUD + colunas CRUD + mover com histórico + reorder + bootstrap de colunas). Cada kanban vira ~schemas + 1 chamada à fábrica.

**Architecture:** Os 4 kanbans compartilham a convenção: `<prefix>_cards` (empresa_id, coluna_id, titulo, ordem, arquivado + campos próprios), `<prefix>_colunas` (empresa_id, nome, ordem), `<prefix>_card_movimentacoes` (card_id, coluna_origem_id, coluna_destino_id, tipo, descricao). A fábrica recebe os 3 models + schemas + colunas padrão e produz o router. Reaproveita `TenantRepository` e o estilo do `app/api/contas_receber.py`.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, pytest async.

**Pré-requisitos:** Toriq Corp sub-1..4 concluídos. Branch `feature/migracao-backend-python`. Rodar de `apps/api` com `uv run`. Ler colunas reais em `generated.py`.

**Models (classes):** `CloserCards`/`CloserColunas`/`CloserCardMovimentacoes`,
`ProspeccaoCards`/`ProspeccaoColunas`/`ProspeccaoCardMovimentacoes`,
`PosVendaCards`/`PosVendaColunas`/`PosVendaCardMovimentacoes`,
`CrossSellingCards`/`CrossSellingColunas`/`CrossSellingCardMovimentacoes`.

> **Fora de escopo (sub-3c):** atividades e etiquetas dos kanbans legados, automações de
> funil (`executar_automacoes_*`), notificações (`notify_*_created`), e a integração
> Closer → Contas a Receber.

---

### Task 1: Fábrica `make_kanban_router`

**Files:**
- Create: `apps/api/app/api/kanban_factory.py`
- Create: `apps/api/tests/test_kanban_factory.py`

- [ ] **Step 1: Teste (TDD)** — com models de teste `_KCard`/`_KColuna`/`_KMov`, exercitar o
ciclo: bootstrap colunas → criar card → listar → mover (verifica coluna_id + 1 movimentação)
→ reorder → delete; e 401 sem auth; e isolamento (card de outra empresa inacessível).

`apps/api/tests/test_kanban_factory.py`:
```python
import uuid

import pytest
from pydantic import BaseModel
from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.api.kanban_factory import make_kanban_router
from app.core.db import Base


class _KColuna(Base):
    __tablename__ = "_kcol"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class _KCard(Base):
    __tablename__ = "_kcard"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class _KMov(Base):
    __tablename__ = "_kmov"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_origem_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True)
    coluna_destino_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True)


class CardIn(BaseModel):
    titulo: str
    coluna_id: uuid.UUID


class CardUpdate(BaseModel):
    titulo: str | None = None


class CardOut(BaseModel):
    id: uuid.UUID
    titulo: str
    coluna_id: uuid.UUID
    model_config = {"from_attributes": True}


class ColIn(BaseModel):
    nome: str
    ordem: int = 0


class ColOut(BaseModel):
    id: uuid.UUID
    nome: str
    ordem: int
    model_config = {"from_attributes": True}


@pytest.fixture
async def kclient(db_session, client):
    for t in (_KColuna.__table__, _KCard.__table__, _KMov.__table__):
        async with db_session.bind.begin() as conn:
            await conn.run_sync(t.create)
    from app.main import app
    app.include_router(make_kanban_router(
        card_model=_KCard, coluna_model=_KColuna, mov_model=_KMov,
        card_in=CardIn, card_update=CardUpdate, card_out=CardOut,
        coluna_in=ColIn, coluna_out=ColOut, prefix="/k", tags=["k"],
        default_colunas=["A", "B"],
    ))
    return client


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "k@k.com", "password": "segredo123",
        "nome": "K", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "k@k.com", "password": "segredo123"})


async def test_kanban_ciclo(kclient, db_session):
    await _login(kclient, db_session)
    assert (await kclient.post("/k/bootstrap-colunas")).json()["criadas"] == 2
    cols = (await kclient.get("/k/colunas")).json()
    card = (await kclient.post("/k", json={"titulo": "X", "coluna_id": cols[0]["id"]})).json()
    moved = await kclient.post(f"/k/{card['id']}/mover", json={"coluna_destino_id": cols[1]["id"]})
    assert moved.json()["coluna_id"] == cols[1]["id"]
    assert (await kclient.delete(f"/k/{card['id']}")).status_code == 204


async def test_kanban_requer_auth(kclient):
    assert (await kclient.get("/k")).status_code == 401
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar a fábrica**

`apps/api/app/api/kanban_factory.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

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


def make_kanban_router(*, card_model, coluna_model, mov_model, card_in, card_update,
                       card_out, coluna_in, coluna_out, prefix, tags, default_colunas):
    router = APIRouter(prefix=prefix, tags=tags)

    class _CardRepo(TenantRepository):
        model = card_model

    def repo(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        if user.empresa_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
        return _CardRepo(db, user.empresa_id)

    # Rotas específicas ANTES do CRUD de cards (evita /{id} capturar /colunas etc.)
    router.include_router(make_crud_router(
        model=coluna_model, create_schema=coluna_in, update_schema=coluna_in,
        read_schema=coluna_out, prefix="/colunas", tags=tags,
    ))

    @router.post("/bootstrap-colunas", status_code=status.HTTP_201_CREATED)
    async def bootstrap(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        if user.empresa_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
        existe = await db.scalar(select(coluna_model).where(coluna_model.empresa_id == user.empresa_id))
        if existe:
            return {"criadas": 0}
        for i, nome in enumerate(default_colunas):
            db.add(coluna_model(empresa_id=user.empresa_id, nome=nome, ordem=i))
        await db.commit()
        return {"criadas": len(default_colunas)}

    @router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
    async def reorder(itens: list[_ReorderItem], r: _CardRepo = Depends(repo)):
        for it in itens:
            await r.update(it.id, ordem=it.ordem)

    @router.post("/{card_id}/mover", response_model=card_out)
    async def mover(card_id: uuid.UUID, body: _MoverIn,
                    r: _CardRepo = Depends(repo), db: AsyncSession = Depends(get_db)):
        card = await r.get(card_id)
        if card is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "card não encontrado")
        origem = card.coluna_id
        card = await r.update(card_id, coluna_id=body.coluna_destino_id)
        db.add(mov_model(empresa_id=r.empresa_id, card_id=card_id,
                         coluna_origem_id=origem, coluna_destino_id=body.coluna_destino_id))
        await db.commit()
        return card

    # CRUD de cards via fábrica (com update schema sem FKs de parentesco — anti mass-assignment)
    router.include_router(make_crud_router(
        model=card_model, create_schema=card_in, update_schema=card_update,
        read_schema=card_out, prefix="", tags=tags,
    ))
    return router
```
> Se `mov_model` exigir colunas NOT NULL adicionais (ex.: `tipo`, `descricao`), o implementador
> deve preenchê-las com defaults sensatos (ex.: `tipo='mudanca_coluna'`, `descricao='Movido'`).
> A `make_crud_router` de cards usa `card_update` (SEM `coluna_id`/FKs) — parentesco só muda via `/mover`.

- [ ] **Step 4: Rodar e ver passar** → 2 passed.

- [ ] **Step 5: Commitar**
```bash
git add apps/api/app/api/kanban_factory.py apps/api/tests/test_kanban_factory.py
git commit -m "feat(api): fábrica make_kanban_router (cards/colunas/mover/reorder/bootstrap)"
```

---

### Task 2: Aplicar a fábrica aos 4 kanbans legados

**Files:**
- Create: `apps/api/app/schemas/kanbans_legados.py`
- Create: `apps/api/app/api/kanbans_legados.py`
- Modify: `apps/api/app/main.py`, `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_kanbans_legados.py`

> Ler colunas reais de cada `<Prefix>Cards`/`Colunas`/`CardMovimentacoes`. Card In deve conter
> os NOT NULL sem default (ex.: `titulo`, `coluna_id`); Card Update SEM `coluna_id`/FKs de
> parentesco. Closer tem muitos campos (valores, dados JSONB) — incluir os úteis em Out.

- [ ] **Step 1: Schemas** — para cada prefixo: `<Prefix>CardIn`, `<Prefix>CardUpdate`,
`<Prefix>CardOut`, `ColunaIn`, `ColunaOut` (colunas compartilham nome/ordem; pode ser um par só
reutilizado se forem idênticas).

- [ ] **Step 2: Routers** — `apps/api/app/api/kanbans_legados.py`:
```python
from fastapi import APIRouter

from app.api.kanban_factory import make_kanban_router
from app.models import generated as m
from app.schemas import kanbans_legados as s

router = APIRouter(prefix="/kanban", tags=["kanbans-legados"])

router.include_router(make_kanban_router(
    card_model=m.CloserCards, coluna_model=m.CloserColunas, mov_model=m.CloserCardMovimentacoes,
    card_in=s.CloserCardIn, card_update=s.CloserCardUpdate, card_out=s.CloserCardOut,
    coluna_in=s.ColunaIn, coluna_out=s.ColunaOut, prefix="/closer", tags=["closer"],
    default_colunas=["Novo", "Em Negociação", "Proposta", "Ganho", "Perdido"],
))
# ... repetir para prospeccao, pos_venda, cross_selling com seus models/colunas padrão.
```
Incluir `router` no `main.py`.

- [ ] **Step 3: conftest + teste (closer como representante)** — registrar as tabelas de closer
no SQLite de teste; testar bootstrap → criar card → mover → listar, e isolamento cross-empresa.

`apps/api/tests/test_kanbans_legados.py`:
```python
import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "cl@cl.com", "password": "segredo123",
        "nome": "CL", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "cl@cl.com", "password": "segredo123"})


async def test_closer_kanban(client, db_session):
    await _login(client, db_session)
    assert (await client.post("/kanban/closer/bootstrap-colunas")).json()["criadas"] == 5
    cols = (await client.get("/kanban/closer/colunas")).json()
    card = (await client.post("/kanban/closer",
            json={"titulo": "Lead X", "coluna_id": cols[0]["id"]})).json()
    moved = await client.post(f"/kanban/closer/{card['id']}/mover",
            json={"coluna_destino_id": cols[1]["id"]})
    assert moved.json()["coluna_id"] == cols[1]["id"]
```

- [ ] **Step 4: Rodar suíte inteira + commit**

Run: `uv run pytest -q` → tudo verde.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): kanbans legados (closer/prospeccao/pos-venda/cross-selling) via fábrica"
```

---

## Validação final

- [ ] `make_kanban_router` testada (ciclo + auth + isolamento).
- [ ] Os 4 kanbans legados expostos sob `/kanban/<prefixo>/*`.
- [ ] Suíte verde.

## Próximos (sub-3c e além)

- **Sub-3c:** atividades/etiquetas dos kanbans, automações de funil (`executar_automacoes_*` no
  scheduler), notificações `notify_*_created`, integração Closer → Contas a Receber.
- Depois: módulos SST, Treinamentos, Frota, White Label; Fatias 0/4/5/6.
