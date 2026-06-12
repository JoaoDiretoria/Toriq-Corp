# Toriq Corp — Sub-módulo 4: Contratos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar contratos (com cláusulas e módulos), modelos de contrato (com suas cláusulas/módulos), e a **numeração sequencial por empresa** (`TQ-{ano}-{seq:04d}`, porta da função `generate_contrato_numero`), substituindo a geração client-side que tinha race condition.

**Architecture:** Reaproveita `make_crud_router`/`TenantRepository` para `contratos` e
`modelos_contrato` (têm `empresa_id`). Cláusulas e módulos (de contrato e de modelo) são
tabelas-filhas — escopadas via o pai (padrão `_get_*_scoped` do sub-3). A numeração vira um
serviço que calcula o próximo número por empresa+ano de forma atômica.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, pytest async.

**Pré-requisitos:** Sub-1..3 concluídos. Branch `feature/migracao-backend-python`. Rodar de
`apps/api` com `uv run`. Ler colunas reais em `generated.py`.

**Tabelas:** `contratos`, `contrato_clausulas`, `contrato_modulos`, `modelos_contrato`,
`modelo_clausulas`, `modelo_modulos`.

---

### Task 1: Numeração de contrato + CRUD de contratos e modelos

**Files:**
- Create: `apps/api/app/schemas/contratos.py`
- Create: `apps/api/app/services/contratos.py`
- Create: `apps/api/app/api/contratos.py`
- Modify: `apps/api/app/main.py`, `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_contratos.py`

> Ler colunas reais de `Contratos`, `ModelosContrato` em `generated.py`. `contratos` tem
> `numero`, `status` ('rascunho'/'enviado'/'assinado'/'cancelado'), campos financeiros
> (`valor_avista`, `valor_mensal`, ...), `empresa_id`.

- [ ] **Step 1: Serviço de numeração (porta de `generate_contrato_numero`)**

`apps/api/app/services/contratos.py`:
```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def proximo_numero_contrato(db: AsyncSession, empresa_id: uuid.UUID) -> str:
    """Gera o próximo número de contrato da empresa no ano corrente: TQ-{ano}-{seq:04d}.

    Conta os contratos da empresa no ano e soma 1. Para evitar race em concorrência,
    a chamada deve ocorrer dentro da mesma transação do INSERT do contrato.
    """
    ano = datetime.now(tz=timezone.utc).year
    prefixo = f"TQ-{ano}-"
    qtd = await db.scalar(
        select(func.count()).select_from(m.Contratos).where(
            m.Contratos.empresa_id == empresa_id,
            m.Contratos.numero.like(f"{prefixo}%"),
        )
    )
    return f"{prefixo}{(qtd or 0) + 1:04d}"
```
> Se houver coluna de ano/sequência dedicada no model, usar. `func.count` + `like` é o
> equivalente direto do `MAX+1` antigo, porém sem o race do client-side (roda no servidor,
> numa transação). Para concorrência alta, um índice único em (empresa_id, numero) faz o
> INSERT duplicado falhar — tratar com retry se necessário (não obrigatório no v1).

- [ ] **Step 2: Teste (TDD)** — criar 2 contratos e verificar numeração `TQ-{ano}-0001` e `-0002`.

`apps/api/tests/test_contratos.py`:
```python
import uuid
from datetime import datetime, timezone


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "ct@ct.com", "password": "segredo123",
        "nome": "CT", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "ct@ct.com", "password": "segredo123"})


async def test_numeracao_sequencial(client, db_session):
    await _login(client, db_session)
    ano = datetime.now(tz=timezone.utc).year
    c1 = await client.post("/contratos", json={"titulo": "A"})
    c2 = await client.post("/contratos", json={"titulo": "B"})
    assert c1.json()["numero"] == f"TQ-{ano}-0001"
    assert c2.json()["numero"] == f"TQ-{ano}-0002"
```
> Ajustar o payload aos NOT NULL reais de `contratos` (ex.: `status` default 'rascunho').

- [ ] **Step 3: Implementar router** — `apps/api/app/api/contratos.py`:
  - `POST /contratos`: gera `numero` via serviço e cria (não via fábrica, porque precisa do
    número antes do insert). `status` default 'rascunho'.
  - `GET/PUT/DELETE /contratos[/{id}]` e CRUD de `modelos_contrato` via fábrica (`/modelos`).
  Incluir no `main.py` (rotas específicas antes de `/{id}`).

- [ ] **Step 4: Rodar + commit**

Run: `uv run pytest tests/test_contratos.py -v` → PASS.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): contratos — numeração sequencial TQ-ano-seq + CRUD contratos/modelos"
```

---

### Task 2: Cláusulas e módulos (de contrato e de modelo)

**Files:** modificar `schemas/contratos.py`, `api/contratos.py`, conftest, `tests/test_contratos.py`.

> Tabelas-filhas escopadas via o pai (padrão `_get_scoped` do sub-3): `contrato_clausulas`,
> `contrato_modulos` (via `contrato_id → contratos.empresa_id`); `modelo_clausulas`,
> `modelo_modulos` (via `modelo_id → modelos_contrato.empresa_id`).

- [ ] **Step 1: Teste** — adicionar cláusula a um contrato, listar; verificar que cláusula de
contrato de outra empresa é inacessível (404).

- [ ] **Step 2: Implementar** endpoints aninhados:
  - `GET/POST /contratos/{id}/clausulas`, `PUT/DELETE /contratos/{id}/clausulas/{clausula_id}`.
  - `GET/POST /contratos/{id}/modulos`, idem delete.
  - `GET/POST /modelos/{id}/clausulas` e `/modelos/{id}/modulos`.
  Todos validando que o pai pertence à `empresa_id` do JWT antes de operar.

- [ ] **Step 3: Rodar suíte inteira + commit**

Run: `uv run pytest -q` → tudo verde.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): contratos — cláusulas e módulos (de contrato e de modelo), tenant-scoped"
```

---

## Validação final

- [ ] Numeração sequencial `TQ-{ano}-{seq}` por empresa (testada, sem race do client-side).
- [ ] CRUD de contratos e modelos; cláusulas e módulos aninhados escopados pelo pai.
- [ ] Isolamento cross-empresa nas tabelas-filhas (404).
- [ ] Suíte verde.

## Conclui o núcleo do Toriq Corp (Cadastros, Financeiro, Funil, Contratos).
Pendente do Toriq Corp: **sub-3b** (automações + kanbans legados + Closer→Contas a Receber).
Depois: outros módulos (SST, Treinamentos, Frota, White Label) e Fatias 0/4/5/6.
