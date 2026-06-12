# Módulo SST — Sub-módulo 1: Cadastros base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar os cadastros base do módulo SST (Segurança e Saúde do Trabalho): clientes SST (com contatos e unidades), colaboradores (com cargos e setores), e riscos/perigos — como endpoints CRUD isolados por empresa, reaproveitando a fábrica `make_crud_router` e o padrão de tabela-filha (parent-scoped).

**Architecture:** Entidades de topo (têm `empresa_id`) via `make_crud_router`: `ClientesSst`,
`Colaboradores`, `Cargos`, `Setores`, `Riscos`, `Perigos`, `GruposClientes`,
`CategoriasClientes`. Filhas (contatos/unidades de cliente) via endpoints aninhados
parent-scoped (padrão `_get_*_scoped` do funil/contratos). Aplicar os **padrões de segurança
consolidados**: UPDATE schemas sem FKs de parentesco; validar FKs do payload contra o tenant.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, pytest async.

**Pré-requisitos:** Toriq Corp concluído (fábricas `make_crud_router`/`make_kanban_router`,
`TenantRepository`). Branch `feature/migracao-backend-python`. Rodar de `apps/api` com `uv run`.
Ler colunas reais em `generated.py`.

**Models (classes):** `ClientesSst`, `ClienteContatos`, `UnidadesClientes`, `CategoriasClientes`,
`GruposClientes`, `Colaboradores`, `Cargos`, `Setores`, `Riscos`, `Perigos`.

> **Fora de escopo (sub-módulos SST seguintes):** EPI/Equipamentos (`Equipamentos*`), Saúde
> Ocupacional (`SaudeOcupacional`, `ProfissionaisSaude`, `SinistrosColaborador`),
> `ColaboradoresTemporarios`, `SetorPermissoes`, CBO (referência global).

---

### Task 1: Entidades de topo via fábrica (clientes, colaboradores, cargos, setores, riscos, perigos, grupos, categorias)

**Files:**
- Create: `apps/api/app/schemas/sst_cadastros.py`
- Create: `apps/api/app/api/sst_cadastros.py`
- Modify: `apps/api/app/main.py`, `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_sst_cadastros.py`

> Para cada model, ler as colunas reais em `generated.py`. Confirmar que cada um tem
> `empresa_id` (se algum NÃO tiver — ex.: `CategoriasClientes` pode ser global — tratar como
> read-only/global, sem TenantRepository, e anotar). `In` schema: NOT NULL sem default + úteis;
> `Out`: id + campos relevantes; UPDATE: sem FKs de parentesco.

- [ ] **Step 1: Schemas** — In/Out (e Update onde houver FK) para as 8 entidades de topo.

- [ ] **Step 2: Routers via fábrica** — `apps/api/app/api/sst_cadastros.py`:
```python
from fastapi import APIRouter

from app.api.crud_factory import make_crud_router
from app.models import generated as m
from app.schemas import sst_cadastros as s

router = APIRouter(prefix="/sst")

router.include_router(make_crud_router(
    model=m.ClientesSst, create_schema=s.ClienteIn, update_schema=s.ClienteUpdate,
    read_schema=s.ClienteOut, prefix="/clientes", tags=["sst-clientes"]))
router.include_router(make_crud_router(
    model=m.Colaboradores, create_schema=s.ColaboradorIn, update_schema=s.ColaboradorUpdate,
    read_schema=s.ColaboradorOut, prefix="/colaboradores", tags=["sst-colaboradores"]))
# ... Cargos (/cargos), Setores (/setores), Riscos (/riscos), Perigos (/perigos),
#     GruposClientes (/grupos-clientes), CategoriasClientes (/categorias-clientes).
```
Incluir `router` no `main.py`.

> Se `make_crud_router`'s create precisar validar um FK ao tenant (ex.: `colaborador.cargo_id`
> ou `colaborador.setor_id` apontando para outra empresa), seguir o padrão consolidado: a
> fábrica genérica NÃO valida FKs; para entidades com FK a outra tabela tenant-owned (ex.:
> Colaboradores → Cargos/Setores), criar um POST explícito que valida esses FKs contra a
> empresa antes de criar. Identificar quais entidades têm FKs assim e protegê-las.

- [ ] **Step 3: conftest + teste de fumaça** — registrar as tabelas no SQLite de teste; testar
CRUD de `clientes` e `colaboradores` + isolamento (cliente de outra empresa inacessível).

`apps/api/tests/test_sst_cadastros.py`:
```python
import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "sst@sst.com", "password": "segredo123",
        "nome": "S", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "sst@sst.com", "password": "segredo123"})


async def test_cliente_crud(client, db_session):
    await _login(client, db_session)
    r = await client.post("/sst/clientes", json={"nome": "Cliente A"})
    assert r.status_code == 201
    assert (await client.get("/sst/clientes")).json()[0]["nome"] == "Cliente A"
```
> Ajustar payloads aos NOT NULL reais (ex.: `clientes_sst` pode exigir `cnpj`/`razao_social`).

- [ ] **Step 4: Rodar + commit**

Run: `uv run pytest tests/test_sst_cadastros.py -v` → PASS.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): SST cadastros base (clientes, colaboradores, cargos, setores, riscos, perigos)"
```

---

### Task 2: Filhas de cliente (contatos, unidades) parent-scoped

**Files:** modificar `schemas/sst_cadastros.py`, `api/sst_cadastros.py`, conftest, `tests/test_sst_cadastros.py`.

> `ClienteContatos` e `UnidadesClientes` são filhas de `ClientesSst` (via `cliente_id` →
> `clientes_sst.empresa_id`). Padrão `_get_cliente_scoped` (valida cliente pertence à empresa).

- [ ] **Step 1: Teste** — adicionar contato a um cliente, listar; contato de cliente de outra
empresa inacessível (404).

- [ ] **Step 2: Implementar** endpoints aninhados:
  - `GET/POST /sst/clientes/{id}/contatos`, `PUT/DELETE /sst/clientes/{id}/contatos/{contato_id}`.
  - `GET/POST /sst/clientes/{id}/unidades`, idem.
  Todos validando que o cliente pertence à `empresa_id` do JWT; `cliente_id` derivado do PATH,
  nunca do body.

- [ ] **Step 3: Rodar suíte inteira + commit**

Run: `uv run pytest -q` → tudo verde.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): SST — contatos e unidades de cliente (parent-scoped)"
```

---

## Validação final

- [ ] Entidades de topo (clientes, colaboradores, cargos, setores, riscos, perigos, grupos,
  categorias) com CRUD isolado por empresa.
- [ ] FKs do payload validados ao tenant onde aplicável (ex.: colaborador→cargo/setor).
- [ ] Filhas de cliente (contatos, unidades) parent-scoped, com isolamento (404 cross-empresa).
- [ ] Suíte verde.

## Próximos sub-módulos SST

2. **EPI/Equipamentos** (`Equipamentos*` + movimentações — inventário/kanban).
3. **Saúde Ocupacional** (`SaudeOcupacional`, `ProfissionaisSaude`, `SinistrosColaborador`).
Depois: Treinamentos, Frota, White Label; Fatias 0/4/5/6.
