# Toriq Corp — Sub-módulo 2: Financeiro (Contas a Pagar/Receber + Jobs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Entregar Contas a Pagar e Contas a Receber (CRUD + kanban: colunas, reorder, movimentações, atividades) e portar para Python, como **jobs agendados (APScheduler)**, duas lógicas que hoje vivem fora do backend: (1) geração de **contas recorrentes** mensais (hoje um edge function) e (2) **automação de colunas por data** (hoje um `useEffect` no front que move cards para "Vencidos"/"Cobrança").

**Architecture:** Reaproveita a fábrica `make_crud_router` e o `TenantRepository` do Sub-1 para o CRUD básico, com endpoints customizados para operações de kanban (reorder em lote, mover entre colunas com registro de movimentação, bootstrap de colunas padrão). Um `AsyncIOScheduler` (APScheduler) sobe no lifespan da API e registra jobs idempotentes; cada job também é exposto como **endpoint de trigger manual** (preserva os botões do front). A lógica de negócio dos jobs fica em serviços testáveis (`app/services/`), separada do agendamento.

**Tech Stack:** FastAPI (lifespan), APScheduler (AsyncIOScheduler), SQLAlchemy async, Pydantic v2, pytest async. Models já existem em `app/models/generated.py`.

**Pré-requisitos:** Sub-1 concluído (`make_crud_router`, `TenantRepository` CRUD). Branch `feature/migracao-backend-python`. Rodar de `apps/api` com `uv run`.

**Tabelas:** `contas_receber`, `contas_receber_colunas`, `contas_receber_atividades`, `contas_receber_movimentacoes`, `contas_pagar`, `contas_pagar_colunas`, `contas_pagar_atividades`, `contas_pagar_movimentacoes`. (Classes: `ContasReceber`, `ContasReceberColunas`, etc.)

> Antes de escrever schemas, conferir as colunas reais de cada model em `generated.py`. Não inventar colunas.

---

### Task 1: Infra de agendamento (APScheduler no lifespan)

**Files:**
- Modify: `apps/api/pyproject.toml` (dep `apscheduler`)
- Create: `apps/api/app/jobs/__init__.py`
- Create: `apps/api/app/jobs/scheduler.py`
- Modify: `apps/api/app/main.py` (lifespan: start/stop scheduler)
- Create: `apps/api/tests/test_scheduler.py`

- [ ] **Step 1: Adicionar dep**

Run: `uv add apscheduler`

- [ ] **Step 2: Teste (TDD)**

`apps/api/tests/test_scheduler.py`:
```python
from app.jobs.scheduler import build_scheduler


def test_build_scheduler_registers_jobs():
    sched = build_scheduler()
    ids = {j.id for j in sched.get_jobs()}
    assert "contas_recorrentes_mensal" in ids
    assert "automacao_colunas_diaria" in ids
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar**

`apps/api/app/jobs/__init__.py` (vazio).

`apps/api/app/jobs/scheduler.py`:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


def build_scheduler() -> AsyncIOScheduler:
    """Cria o scheduler e registra os jobs (sem iniciá-lo).

    Os callables são importados tardiamente para evitar ciclos de import.
    """
    from app.jobs.tasks import job_automacao_colunas, job_contas_recorrentes

    sched = AsyncIOScheduler(timezone="America/Sao_Paulo")
    # Dia 1 de cada mês, 00:10 — gera as contas recorrentes do mês.
    sched.add_job(
        job_contas_recorrentes, CronTrigger(day=1, hour=0, minute=10),
        id="contas_recorrentes_mensal", replace_existing=True,
    )
    # Todo dia 00:05 — move cards de CP/CR por data (vencidos, cobrança, etc.).
    sched.add_job(
        job_automacao_colunas, CronTrigger(hour=0, minute=5),
        id="automacao_colunas_diaria", replace_existing=True,
    )
    return sched
```

`apps/api/app/jobs/tasks.py` (stubs por enquanto — implementados nas Tasks 4 e 5):
```python
async def job_contas_recorrentes() -> None:
    from app.services.contas_recorrentes import gerar_contas_recorrentes_todas_empresas
    await gerar_contas_recorrentes_todas_empresas()


async def job_automacao_colunas() -> None:
    from app.services.automacao_colunas import aplicar_automacao_colunas_todas_empresas
    await aplicar_automacao_colunas_todas_empresas()
```

> Os serviços importados serão criados nas Tasks 4–5. Como o import é tardio (dentro da
> função), o `build_scheduler()` e seu teste funcionam antes desses serviços existirem? NÃO —
> `app/jobs/tasks.py` importa os serviços dentro das funções (lazy), então `import app.jobs.tasks`
> não falha. Criar `app/services/__init__.py` vazio agora para o pacote existir.

Criar `apps/api/app/services/__init__.py` (vazio).

`apps/api/app/main.py` — adicionar lifespan que sobe/desce o scheduler:
```python
from contextlib import asynccontextmanager

from app.jobs.scheduler import build_scheduler


@asynccontextmanager
async def lifespan(app):
    scheduler = build_scheduler()
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    app = FastAPI(title="TORIQ API", version="0.1.0", lifespan=lifespan)
    # ... include_routers existentes ...
    return app
```
> O `build_scheduler()` referencia `app.jobs.tasks` que importa serviços ainda inexistentes,
> mas como é lazy, só falharia quando o job DISPARAR (não no boot). Os testes não disparam os
> jobs. Mesmo assim, criar stubs mínimos de serviço nas Tasks 4–5 antes de qualquer disparo real.

- [ ] **Step 5: Rodar e ver passar**

Run: `uv run pytest tests/test_scheduler.py -v` → PASS.
Run: `uv run python -c "import app.main; print('OK')"` → OK (app boota com lifespan).

- [ ] **Step 6: Commitar**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/app/jobs apps/api/app/services/__init__.py apps/api/app/main.py apps/api/tests/test_scheduler.py
git commit -m "feat(api): APScheduler no lifespan + registro dos jobs financeiros"
```

---

### Task 2: Contas a Receber — CRUD + colunas + kanban

**Files:**
- Create: `apps/api/app/schemas/contas_receber.py`
- Create: `apps/api/app/api/contas_receber.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/conftest.py` (registrar as tabelas no SQLite de teste)
- Create: `apps/api/tests/test_contas_receber.py`

> Ler as colunas reais de `ContasReceber`, `ContasReceberColunas`, `ContasReceberMovimentacoes`,
> `ContasReceberAtividades` em `generated.py` e montar os schemas com elas.

- [ ] **Step 1: Schemas (das colunas reais)**

`apps/api/app/schemas/contas_receber.py` — In/Out para conta, coluna, movimentação, atividade
(usar colunas reais; `ContaReceberOut` deve incluir `coluna_id`, `valor`, `status_recebimento`,
`ordem`, datas). Mais:
```python
import uuid

from pydantic import BaseModel


class ReorderItem(BaseModel):
    id: uuid.UUID
    ordem: int


class MoverColunaIn(BaseModel):
    coluna_destino_id: uuid.UUID
    justificativa: str | None = None
```

- [ ] **Step 2: Router — CRUD básico via fábrica + endpoints de kanban**

`apps/api/app/api/contas_receber.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud_factory import make_crud_router
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas import contas_receber as s

router = APIRouter(prefix="/financeiro/contas-receber", tags=["contas-receber"])

# CRUD básico de contas e colunas via fábrica
router.include_router(make_crud_router(
    model=m.ContasReceber, create_schema=s.ContaReceberIn, update_schema=s.ContaReceberIn,
    read_schema=s.ContaReceberOut, prefix="", tags=["contas-receber"],
))
router.include_router(make_crud_router(
    model=m.ContasReceberColunas, create_schema=s.ColunaIn, update_schema=s.ColunaIn,
    read_schema=s.ColunaOut, prefix="/colunas", tags=["contas-receber-colunas"],
))


class _ContaRepo(TenantRepository):
    model = m.ContasReceber


def _repo(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> _ContaRepo:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return _ContaRepo(db, user.empresa_id)


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reordenar(itens: list[s.ReorderItem], repo: _ContaRepo = Depends(_repo)):
    for it in itens:
        await repo.update(it.id, ordem=it.ordem)


@router.post("/{conta_id}/mover", response_model=s.ContaReceberOut)
async def mover(conta_id: uuid.UUID, body: s.MoverColunaIn,
                repo: _ContaRepo = Depends(_repo), db: AsyncSession = Depends(get_db)):
    conta = await repo.get(conta_id)
    if conta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrada")
    origem = conta.coluna_id
    conta = await repo.update(conta_id, coluna_id=body.coluna_destino_id)
    db.add(m.ContasReceberMovimentacoes(
        empresa_id=repo.empresa_id, conta_id=conta_id, tipo="movimentacao",
        coluna_origem_id=origem, coluna_destino_id=body.coluna_destino_id,
        descricao=body.justificativa,
    ))
    await db.commit()
    return conta


@router.post("/bootstrap-colunas", status_code=status.HTTP_201_CREATED)
async def bootstrap_colunas(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Cria as colunas padrão de Contas a Receber se a empresa ainda não tiver nenhuma."""
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    existe = await db.scalar(
        select(m.ContasReceberColunas).where(m.ContasReceberColunas.empresa_id == user.empresa_id)
    )
    if existe:
        return {"criadas": 0}
    padroes = ["A Receber", "Emitir NFe", "Cobrança", "Vencidos", "Recebidas"]
    for i, nome in enumerate(padroes):
        db.add(m.ContasReceberColunas(empresa_id=user.empresa_id, nome=nome, ordem=i))
    await db.commit()
    return {"criadas": len(padroes)}
```
> Ajustar nomes de coluna (`coluna_id`, `ordem`, `tipo`, etc.) aos reais do model. Se
> `ContasReceberMovimentacoes` exigir campos NOT NULL adicionais, preenchê-los.

`apps/api/app/main.py` — incluir o router.

- [ ] **Step 3: conftest + teste**

Registrar as 4 tabelas de CR no SQLite de teste (seguir o padrão já usado no conftest para os
cadastros). `apps/api/tests/test_contas_receber.py`:
```python
import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "cr@cr.com", "password": "segredo123",
        "nome": "CR", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "cr@cr.com", "password": "segredo123"})


async def test_bootstrap_e_mover(client, db_session):
    await _login(client, db_session)
    boot = await client.post("/financeiro/contas-receber/bootstrap-colunas")
    assert boot.json()["criadas"] == 5
    cols = (await client.get("/financeiro/contas-receber/colunas")).json()
    c0 = cols[0]["id"]
    conta = (await client.post("/financeiro/contas-receber",
             json={"valor": 100, "coluna_id": c0, "descricao": "X"})).json()
    moved = await client.post(f"/financeiro/contas-receber/{conta['id']}/mover",
             json={"coluna_destino_id": cols[1]["id"], "justificativa": "teste"})
    assert moved.status_code == 200
    assert moved.json()["coluna_id"] == cols[1]["id"]
```
> Ajustar os campos de `POST /contas-receber` às colunas NOT NULL reais.

- [ ] **Step 4: Rodar + commit**

Run: `uv run pytest tests/test_contas_receber.py -v` → PASS.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): contas a receber — CRUD, colunas, reorder, mover, bootstrap"
```

---

### Task 3: Contas a Pagar — CRUD + colunas + kanban

**Files:** análogos a CR: `app/schemas/contas_pagar.py`, `app/api/contas_pagar.py`, conftest, `tests/test_contas_pagar.py`, `main.py`.

- [ ] **Step 1–4: Replicar o padrão da Task 2 para Contas a Pagar**

Usar os models `ContasPagar`, `ContasPagarColunas`, `ContasPagarMovimentacoes`,
`ContasPagarAtividades` (colunas reais). Colunas padrão de CP:
`["A Pagar", "Pagamentos Recorrentes", "Vencidos", "Pagas"]` (a coluna **"Pagamentos
Recorrentes"** é usada pelo job de recorrência — Task 4). Mesmos endpoints: CRUD, `/colunas`,
`/reorder`, `/{id}/mover`, `/bootstrap-colunas`. Teste análogo. Incluir router no `main.py`.
Commit: `feat(api): contas a pagar — CRUD, colunas, reorder, mover, bootstrap`.

---

### Task 4: Serviço + job de contas recorrentes (porta do edge function)

**Files:**
- Create: `apps/api/app/services/contas_recorrentes.py`
- Modify: `apps/api/app/api/contas_pagar.py` (endpoint de trigger manual)
- Create: `apps/api/tests/test_contas_recorrentes.py`

**Algoritmo (do edge function `gerar-contas-recorrentes`):** para o mês atual, para cada
`ContasPagar` com `frequencia_cobranca='recorrente'`: achar a coluna "Pagamentos Recorrentes"
da empresa; **dedup** por (empresa_id + fornecedor_id + descricao + categoria + mês de
`data_vencimento` + coluna) — se já existe, pular; senão criar nova conta com `numero` por
sequência, `data_vencimento` = mesmo dia (limitado a 28) no mês atual, `valor` = original se
`tipo_valor_recorrente='fixo'` senão 0, `frequencia_cobranca='unico'`, `status_pagamento='previsto'`.

- [ ] **Step 1: Teste (TDD) — idempotência e fixo/variável**

`apps/api/tests/test_contas_recorrentes.py`:
```python
import uuid
from datetime import date

import pytest

from app.services.contas_recorrentes import gerar_contas_recorrentes


@pytest.fixture
async def setup(db_session):
    from app.models.generated import Empresas, ContasPagarColunas, ContasPagar
    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E", tipo="sst"))
    col = ContasPagarColunas(id=uuid.uuid4(), empresa_id=emp, nome="Pagamentos Recorrentes", ordem=1)
    db_session.add(col)
    db_session.add(ContasPagar(id=uuid.uuid4(), empresa_id=emp, coluna_id=col.id,
        descricao="Aluguel", valor=1000, frequencia_cobranca="recorrente",
        tipo_valor_recorrente="fixo", data_vencimento=date(2026, 1, 10)))
    await db_session.commit()
    return db_session, emp


async def test_gera_uma_e_eh_idempotente(setup):
    db, emp = setup
    n1 = await gerar_contas_recorrentes(db, emp, ref=date(2026, 6, 1))
    n2 = await gerar_contas_recorrentes(db, emp, ref=date(2026, 6, 1))
    assert n1 == 1   # criou 1
    assert n2 == 0   # rodar de novo no mesmo mês não duplica
```
> Ajustar os campos NOT NULL reais de `ContasPagar` no setup.

- [ ] **Step 2: Rodar e ver falhar** → `uv run pytest tests/test_contas_recorrentes.py -v` (FAIL: módulo não existe).

- [ ] **Step 3: Implementar o serviço**

`apps/api/app/services/contas_recorrentes.py`:
```python
import uuid
from datetime import date

from sqlalchemy import and_, extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def gerar_contas_recorrentes(db: AsyncSession, empresa_id: uuid.UUID, ref: date) -> int:
    """Gera as contas recorrentes da empresa para o mês de `ref`. Retorna quantas criou.

    Idempotente: deduplica por (fornecedor, descricao, categoria, mês, coluna recorrente).
    """
    col = await db.scalar(select(m.ContasPagarColunas).where(
        m.ContasPagarColunas.empresa_id == empresa_id,
        m.ContasPagarColunas.nome == "Pagamentos Recorrentes",
    ))
    if col is None:
        return 0
    recorrentes = (await db.scalars(select(m.ContasPagar).where(
        m.ContasPagar.empresa_id == empresa_id,
        m.ContasPagar.frequencia_cobranca == "recorrente",
    ))).all()
    criadas = 0
    for tpl in recorrentes:
        dia = min(tpl.data_vencimento.day if tpl.data_vencimento else 1, 28)
        venc = date(ref.year, ref.month, dia)
        existe = await db.scalar(select(m.ContasPagar).where(and_(
            m.ContasPagar.empresa_id == empresa_id,
            m.ContasPagar.coluna_id == col.id,
            m.ContasPagar.descricao == tpl.descricao,
            m.ContasPagar.fornecedor_id == tpl.fornecedor_id,
            extract("year", m.ContasPagar.data_vencimento) == ref.year,
            extract("month", m.ContasPagar.data_vencimento) == ref.month,
        )))
        if existe:
            continue
        valor = tpl.valor if tpl.tipo_valor_recorrente == "fixo" else 0
        db.add(m.ContasPagar(
            id=uuid.uuid4(), empresa_id=empresa_id, coluna_id=col.id,
            descricao=tpl.descricao, fornecedor_id=tpl.fornecedor_id,
            valor=valor, data_vencimento=venc, frequencia_cobranca="unico",
            status_pagamento="previsto",
        ))
        criadas += 1
    await db.commit()
    return criadas


async def gerar_contas_recorrentes_todas_empresas() -> int:
    """Job: roda para todas as empresas que têm contas recorrentes. Usado pelo scheduler."""
    from app.core.db import SessionLocal
    from datetime import date as _date
    total = 0
    async with SessionLocal() as db:
        empresas = (await db.scalars(
            select(m.ContasPagar.empresa_id).where(
                m.ContasPagar.frequencia_cobranca == "recorrente"
            ).distinct()
        )).all()
        for emp in empresas:
            total += await gerar_contas_recorrentes(db, emp, ref=_date.today().replace(day=1))
    return total
```
> Ajustar campos NOT NULL reais; se `categoria` existir no model, incluir na dedup. Se houver
> uma sequence de número, gerar `numero`; senão omitir o campo (deixar default do banco).

- [ ] **Step 4: Endpoint de trigger manual** em `app/api/contas_pagar.py`:
```python
@router.post("/gerar-recorrentes")
async def gerar_recorrentes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import date
    from app.services.contas_recorrentes import gerar_contas_recorrentes
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    n = await gerar_contas_recorrentes(db, user.empresa_id, ref=date.today().replace(day=1))
    return {"criadas": n}
```

- [ ] **Step 5: Rodar + commit**

Run: `uv run pytest tests/test_contas_recorrentes.py -v` → PASS (idempotência confirmada).
```bash
git add apps/api/app/services/contas_recorrentes.py apps/api/app/api/contas_pagar.py apps/api/tests/test_contas_recorrentes.py
git commit -m "feat(api): job + serviço de contas recorrentes (porta idempotente do edge function)"
```

---

### Task 5: Serviço + job de automação de colunas por data

**Files:**
- Create: `apps/api/app/services/automacao_colunas.py`
- Create: `apps/api/tests/test_automacao_colunas.py`

**Lógica (porta do `useEffect` do front):** diariamente, para cada empresa, mover contas a
receber/pagar entre colunas conforme a data: contas com `data_vencimento < hoje` e não
recebidas/pagas → coluna "Vencidos"; (regra mínima viável — replicar só a de "Vencidos" no v1,
deixando as demais — "Cobrança", "Emitir NFe" — como TODO marcado para quando o front for
analisado em detalhe).

- [ ] **Step 1: Teste (TDD)** — criar uma conta a receber vencida fora de "Vencidos" e verificar
que o serviço a move para a coluna "Vencidos".

`apps/api/tests/test_automacao_colunas.py`:
```python
import uuid
from datetime import date, timedelta

import pytest

from app.services.automacao_colunas import aplicar_automacao_colunas


@pytest.fixture
async def setup(db_session):
    from app.models.generated import Empresas, ContasReceberColunas, ContasReceber
    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E", tipo="sst"))
    a = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="A Receber", ordem=0)
    v = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="Vencidos", ordem=3)
    db_session.add_all([a, v])
    db_session.add(ContasReceber(id=uuid.uuid4(), empresa_id=emp, coluna_id=a.id,
        valor=50, descricao="atrasada", status_recebimento="previsto",
        data_vencimento=date.today() - timedelta(days=5)))
    await db_session.commit()
    return db_session, emp, a.id, v.id


async def test_move_vencida_para_coluna_vencidos(setup):
    db, emp, a_id, v_id = setup
    movidas = await aplicar_automacao_colunas(db, emp, hoje=date.today())
    assert movidas == 1
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

`apps/api/app/services/automacao_colunas.py`:
```python
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def aplicar_automacao_colunas(db: AsyncSession, empresa_id: uuid.UUID, hoje: date) -> int:
    """Move contas a receber vencidas (data_vencimento < hoje, não recebidas) para 'Vencidos'.

    v1: apenas a regra de 'Vencidos'. TODO: portar 'Cobrança'/'Emitir NFe' ao analisar o front.
    """
    vencidos = await db.scalar(select(m.ContasReceberColunas).where(
        m.ContasReceberColunas.empresa_id == empresa_id,
        m.ContasReceberColunas.nome == "Vencidos",
    ))
    if vencidos is None:
        return 0
    atrasadas = (await db.scalars(select(m.ContasReceber).where(
        m.ContasReceber.empresa_id == empresa_id,
        m.ContasReceber.status_recebimento != "realizado",
        m.ContasReceber.data_vencimento < hoje,
        m.ContasReceber.coluna_id != vencidos.id,
    ))).all()
    for conta in atrasadas:
        conta.coluna_id = vencidos.id
    await db.commit()
    return len(atrasadas)


async def aplicar_automacao_colunas_todas_empresas() -> int:
    from app.core.db import SessionLocal
    total = 0
    async with SessionLocal() as db:
        empresas = (await db.scalars(select(m.ContasReceber.empresa_id).distinct())).all()
        for emp in empresas:
            total += await aplicar_automacao_colunas(db, emp, hoje=date.today())
    return total
```
> Ajustar nomes de coluna/status reais (`status_recebimento`, valores como `'realizado'`).

- [ ] **Step 4: Rodar + suíte inteira + commit**

Run: `uv run pytest tests/test_automacao_colunas.py -v` → PASS.
Run: `uv run pytest -q` → tudo verde.
```bash
git add apps/api/app/services/automacao_colunas.py apps/api/tests/test_automacao_colunas.py
git commit -m "feat(api): job de automação de colunas por data (regra de vencidos)"
```

---

## Validação final

- [ ] APScheduler sobe no lifespan com 2 jobs registrados (recorrência mensal, automação diária).
- [ ] Contas a Receber e a Pagar: CRUD + colunas + reorder + mover + bootstrap, isolados por empresa.
- [ ] Geração de contas recorrentes idempotente (testada) + trigger manual.
- [ ] Automação de "Vencidos" portada + job diário.
- [ ] Suíte verde.

## Pendências marcadas para depois

- Regras de coluna além de "Vencidos" (Cobrança, Emitir NFe) — exigem leitura detalhada do front.
- Notificações `notify_conta_*_created` (média prioridade) — quando o módulo de notificações for portado.
- Integração Closer → Contas a Receber — virá no sub-módulo Funil/CRM.

## Próximos sub-módulos: 3) Funil/CRM · 4) Contratos.
