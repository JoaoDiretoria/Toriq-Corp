# Toriq Corp — Sub-módulo 1: Cadastros Financeiros + padrão CRUD tenant-scoped

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os cadastros financeiros do Toriq Corp (fornecedores, formas de pagamento/cobrança, condições de pagamento, centros de custo, contas bancárias, plano de receitas/despesas) como endpoints CRUD isolados por empresa — e, no caminho, criar a **infra reutilizável** (`TenantRepository` com CRUD completo + fábrica de router CRUD) que todos os módulos seguintes vão usar.

**Architecture:** Estendemos o `TenantRepository` (hoje só `list`/`add`) com `get`/`update`/`delete`/`count`, tipado por um `Protocol` `TenantModel` (garante `empresa_id` em tempo de type-check). Criamos `make_crud_router(model, schemas, prefix)` — uma fábrica que produz um `APIRouter` com list/get/create/update/delete, todos tenant-scoped, derivando o `empresa_id` do JWT via `get_current_user`. Cada entidade de cadastro vira ~3 schemas Pydantic + 1 chamada à fábrica. Os models já existem em `app/models/generated.py`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, pytest (SQLite async). Reaproveita `app/repositories/base.py`, `app/api/deps.py` do Plano 1.

**Pré-requisitos:** Fatias 1 e 2 concluídas. Models em `generated.py`. Branch `feature/migracao-backend-python`. Rodar de `apps/api` com `uv run`.

**Entidades deste sub-módulo (todas com `empresa_id`, exceto onde notado):**
`fornecedores`, `formas_pagamento`, `formas_cobranca`, `condicoes_pagamento`, `centros_custo`,
`contas_bancarias`, `plano_receitas`, `plano_despesas`.

> Antes de escrever schemas, o implementador deve conferir as colunas reais de cada tabela em
> `app/models/generated.py` (nomes de classe: `Fornecedores`, `FormasPagamento`, etc.).

---

### Task 1: Estender o `TenantRepository` com CRUD completo + `TenantModel` Protocol

**Files:**
- Modify: `apps/api/app/repositories/base.py`
- Create: `apps/api/tests/test_tenant_repository.py`

- [ ] **Step 1: Escrever os testes (TDD)**

`apps/api/tests/test_tenant_repository.py`:
```python
import uuid

import pytest
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.repositories.base import TenantRepository


class _Widget(Base):
    __tablename__ = "_widgets_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)


class WidgetRepo(TenantRepository[_Widget]):
    model = _Widget


@pytest.fixture
async def repo(db_session):
    e1 = uuid.uuid4()
    async with db_session.bind.begin() as conn:
        await conn.run_sync(_Widget.__table__.create)
    return WidgetRepo(db_session, e1), e1


async def test_add_get_update_delete_scoped(repo):
    r, e1 = repo
    w = await r.add(nome="A")
    got = await r.get(w.id)
    assert got is not None and got.nome == "A"

    updated = await r.update(w.id, nome="B")
    assert updated is not None and updated.nome == "B"

    assert await r.count() == 1
    assert await r.delete(w.id) is True
    assert await r.get(w.id) is None
    assert await r.count() == 0


async def test_get_of_other_tenant_returns_none(repo, db_session):
    r, e1 = repo
    w = await r.add(nome="A")
    other = WidgetRepo(db_session, uuid.uuid4())
    assert await other.get(w.id) is None        # isolamento no get
    assert await other.update(w.id, nome="X") is None  # isolamento no update
    assert await other.delete(w.id) is False    # isolamento no delete
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_tenant_repository.py -v`
Expected: FAIL (métodos `get`/`update`/`delete`/`count` não existem).

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `apps/api/app/repositories/base.py` por:
```python
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_tenant_repository.py -v`
Expected: PASS (2 passed). Tenant isolation no get/update/delete confirmado.

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/repositories/base.py apps/api/tests/test_tenant_repository.py
git commit -m "feat(api): TenantRepository com CRUD completo + Protocol TenantModel"
```

---

### Task 2: Fábrica de router CRUD tenant-scoped (`make_crud_router`)

**Files:**
- Create: `apps/api/app/api/crud_factory.py`
- Create: `apps/api/tests/test_crud_factory.py`

- [ ] **Step 1: Escrever o teste (TDD)**

`apps/api/tests/test_crud_factory.py`:
```python
import uuid

import pytest
from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.api.crud_factory import make_crud_router
from app.core.db import Base


class _Gadget(Base):
    __tablename__ = "_gadgets_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)


class GadgetIn(BaseModel):
    nome: str


class GadgetOut(BaseModel):
    id: uuid.UUID
    nome: str
    model_config = {"from_attributes": True}


@pytest.fixture
async def gadget_client(db_session, client):
    async with db_session.bind.begin() as conn:
        await conn.run_sync(_Gadget.__table__.create)
    from app.main import app
    app.include_router(make_crud_router(
        model=_Gadget, create_schema=GadgetIn, update_schema=GadgetIn,
        read_schema=GadgetOut, prefix="/gadgets", tags=["gadgets"],
    ))
    return client


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "g@g.com", "password": "segredo123",
        "nome": "G", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "g@g.com", "password": "segredo123"})


async def test_crud_factory_full_cycle(gadget_client, db_session):
    await _login(gadget_client, db_session)
    created = await gadget_client.post("/gadgets", json={"nome": "X"})
    assert created.status_code == 201
    gid = created.json()["id"]
    assert (await gadget_client.get("/gadgets")).json()[0]["nome"] == "X"
    assert (await gadget_client.get(f"/gadgets/{gid}")).json()["nome"] == "X"
    upd = await gadget_client.put(f"/gadgets/{gid}", json={"nome": "Y"})
    assert upd.json()["nome"] == "Y"
    assert (await gadget_client.delete(f"/gadgets/{gid}")).status_code == 204
    assert (await gadget_client.get(f"/gadgets/{gid}")).status_code == 404


async def test_crud_requires_auth(gadget_client):
    assert (await gadget_client.get("/gadgets")).status_code == 401
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_crud_factory.py -v`
Expected: FAIL (`app.api.crud_factory` não existe).

- [ ] **Step 3: Implementar a fábrica**

`apps/api/app/api/crud_factory.py`:
```python
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
        return await repo.list()

    @router.get("/{id_}", response_model=read_schema)
    async def obter(id_: uuid.UUID, repo: _Repo = Depends(get_repo)):
        obj = await repo.get(id_)
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_crud_factory.py -v`
Expected: PASS (2 passed) — ciclo CRUD completo + 401 sem auth.

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/api/crud_factory.py apps/api/tests/test_crud_factory.py
git commit -m "feat(api): fábrica de router CRUD tenant-scoped (make_crud_router)"
```

---

### Task 3: Schemas + routers das 8 entidades de cadastro

**Files:**
- Create: `apps/api/app/schemas/financeiro_cadastros.py`
- Create: `apps/api/app/api/financeiro_cadastros.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_financeiro_cadastros.py`

> **Importante:** antes de escrever os schemas, abrir `app/models/generated.py` e copiar as
> colunas reais de cada tabela (`Fornecedores`, `FormasPagamento`, `FormasCobranca`,
> `CondicoesPagamento`, `CentrosCusto`, `ContasBancarias`, `PlanoReceitas`, `PlanoDespesas`).
> Os schemas abaixo mostram o PADRÃO com `fornecedores`; replicar para as demais com as colunas
> reais de cada uma. NÃO inventar colunas — usar as que existem no model.

- [ ] **Step 1: Schemas (padrão com fornecedores; replicar p/ as 8)**

`apps/api/app/schemas/financeiro_cadastros.py` — exemplo do padrão (ajustar campos às colunas reais):
```python
import uuid

from pydantic import BaseModel


class FornecedorIn(BaseModel):
    razao_social: str
    cnpj: str | None = None
    classificacao_despesa_padrao: str | None = None
    ativo: bool = True


class FornecedorOut(BaseModel):
    id: uuid.UUID
    razao_social: str
    cnpj: str | None
    classificacao_despesa_padrao: str | None
    ativo: bool
    model_config = {"from_attributes": True}


# ... replicar In/Out para: FormaPagamento, FormaCobranca, CondicaoPagamento,
# CentroCusto, ContaBancaria, PlanoReceita, PlanoDespesa — com as colunas reais.
```

- [ ] **Step 2: Routers via fábrica**

`apps/api/app/api/financeiro_cadastros.py`:
```python
from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.models import generated as m
from app.schemas import financeiro_cadastros as s

router = APIRouter(prefix="/financeiro/cadastros")

router.include_router(make_crud_router(
    model=m.Fornecedores, create_schema=s.FornecedorIn, update_schema=s.FornecedorIn,
    read_schema=s.FornecedorOut, prefix="/fornecedores", tags=["fornecedores"],
))
# ... repetir o include_router para as 7 demais entidades com seus models/schemas.
```

`apps/api/app/main.py` — incluir o router:
```python
from app.api.financeiro_cadastros import router as fin_cadastros_router
# ...
    app.include_router(fin_cadastros_router)
```

- [ ] **Step 3: Teste de fumaça (fornecedores como representante)**

`apps/api/tests/test_financeiro_cadastros.py`:
```python
import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "f@f.com", "password": "segredo123",
        "nome": "F", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "f@f.com", "password": "segredo123"})
    return emp


async def test_fornecedor_crud_e_isolamento(client, db_session):
    await _login(client, db_session)
    r = await client.post("/financeiro/cadastros/fornecedores",
                          json={"razao_social": "ACME LTDA", "cnpj": "00000000000191"})
    assert r.status_code == 201
    assert (await client.get("/financeiro/cadastros/fornecedores")).json()[0]["razao_social"] == "ACME LTDA"
```
> O conftest cria as tabelas via `Base.metadata.create_all` filtrado; garantir que as 8
> tabelas de cadastro estão incluídas no create do conftest de teste (ou criar todas as
> tabelas do metadata no SQLite de teste). Ajustar o conftest se necessário para registrar
> as tabelas usadas neste teste.

- [ ] **Step 4: Rodar**

Run: `uv run pytest tests/test_financeiro_cadastros.py -v`
Expected: PASS.

- [ ] **Step 5: Suíte inteira + commit**

Run: `uv run pytest -q` (tudo verde).
```bash
git add apps/api/app/schemas/financeiro_cadastros.py apps/api/app/api/financeiro_cadastros.py apps/api/app/main.py apps/api/tests/test_financeiro_cadastros.py
git commit -m "feat(api): cadastros financeiros (8 entidades CRUD via fábrica)"
```

---

## Validação final

- [ ] `TenantRepository` tem list/get/add/update/delete/count, todos tenant-scoped (testado).
- [ ] `make_crud_router` produz CRUD completo com auth + isolamento (testado).
- [ ] As 8 entidades de cadastro têm endpoints sob `/financeiro/cadastros/*`.
- [ ] Suíte verde.

## Próximos sub-módulos do Toriq Corp

2. **Financeiro** (CP/CR + job de recorrência + automação de colunas) — usa esta fábrica + agenda.
3. **Funil / CRM** · 4. **Contratos**. Depois: outros módulos (SST, Treinamentos, Frota, White Label).
