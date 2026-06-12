# Toriq Corp — Sub-módulo 3: Funil / CRM genérico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar o **funil comercial genérico** do Toriq Corp: funis configuráveis, etapas, cards (kanban com mover/reorder/histórico), etiquetas e atividades — incluindo a lógica do trigger `criar_configuracao_funil_padrao` (ao criar um funil, criar automaticamente sua `funis_configuracoes` com defaults conforme o tipo).

**Architecture:** Reaproveita `make_crud_router`, `TenantRepository` e o padrão de kanban (mover/reorder/movimentações) do sub-2. O único pedaço novo de lógica é o **efeito de criação de funil** (cria a config padrão), implementado como serviço chamado no endpoint de criação — substituindo o trigger de banco.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, pytest async. Models em `app/models/generated.py`.

**Pré-requisitos:** Sub-1 e Sub-2 concluídos. Branch `feature/migracao-backend-python`. Rodar de `apps/api` com `uv run`. Ler colunas reais em `generated.py` antes dos schemas.

**Tabelas:** `funis`, `funil_etapas`, `funil_cards`, `funis_configuracoes`, `funil_etiquetas`,
`funil_card_etiquetas`, `funil_card_atividades`, `funil_card_movimentacoes`.
(Classes: `Funis`, `FunilEtapas`, `FunilCards`, `FunisConfiguracoes`, etc.)

**Fora de escopo (sub-3b/c):** automações (`automacoes`, `automacoes_execucoes` + workers
`executar_automacoes_*`), kanbans legados (`prospeccao_*`, `closer_*`, `pos_venda_*`,
`cross_selling_*`), `comercial_funil`.

---

### Task 1: Funis + etapas (CRUD) + criação de config padrão

**Files:**
- Create: `apps/api/app/schemas/funil.py`
- Create: `apps/api/app/services/funil.py`
- Create: `apps/api/app/api/funil.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/conftest.py` (tabelas de teste)
- Create: `apps/api/tests/test_funil.py`

> Ler colunas reais de `Funis`, `FunilEtapas`, `FunisConfiguracoes` em `generated.py`. A
> `funis` tem `tipo` ('negocio' | 'fluxo_trabalho') e pertence a um `setor_id`. A config
> default depende do `tipo`.

- [ ] **Step 1: Schemas** — `FunilIn`/`FunilOut` (nome, tipo, setor_id, ...), `EtapaIn`/`EtapaOut`
(nome, cor, ordem, ativo, funil_id), `ConfiguracaoOut`.

- [ ] **Step 2: Serviço de config padrão (porta de `criar_configuracao_funil_padrao`)**

`apps/api/app/services/funil.py`:
```python
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def criar_configuracao_padrao(db: AsyncSession, funil: "m.Funis") -> "m.FunisConfiguracoes":
    """Ao criar um funil, cria sua configuração padrão conforme o tipo.

    Porta o trigger `criar_configuracao_funil_padrao`: funis 'negocio' exibem valor e
    métricas de negócio; 'fluxo_trabalho' ocultam valor.
    """
    is_negocio = funil.tipo == "negocio"
    cfg = m.FunisConfiguracoes(
        id=uuid.uuid4(),
        funil_id=funil.id,
        modo_visualizacao="kanban",
        exibir_valor=is_negocio,
    )
    db.add(cfg)
    await db.flush()
    return cfg
```
> Ajustar aos campos REAIS de `FunisConfiguracoes` (ex.: `dashboard_metricas`,
> `campos_visiveis`). Preencher os NOT NULL com defaults sensatos por tipo.

- [ ] **Step 3: Teste (TDD)** — criar funil 'negocio' deve criar 1 config com `exibir_valor=True`.

`apps/api/tests/test_funil.py`:
```python
import uuid


async def _login(client, db_session):
    from app.models.generated import Empresas as Empresa
    emp = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(emp); await db_session.commit()
    await client.post("/auth/register", json={"email": "fu@fu.com", "password": "segredo123",
        "nome": "FU", "role": "cliente_torq", "empresa_id": str(emp.id)})
    await client.post("/auth/login", json={"email": "fu@fu.com", "password": "segredo123"})


async def test_criar_funil_cria_config_padrao(client, db_session):
    await _login(client, db_session)
    r = await client.post("/funil/funis", json={"nome": "Vendas", "tipo": "negocio"})
    assert r.status_code == 201
    fid = r.json()["id"]
    cfg = await client.get(f"/funil/funis/{fid}/configuracao")
    assert cfg.status_code == 200
    assert cfg.json()["exibir_valor"] is True
```

- [ ] **Step 4: Router** — `apps/api/app/api/funil.py`: CRUD de funis (POST customizado que chama
`criar_configuracao_padrao` após criar o funil), CRUD de etapas via fábrica
(`prefix="/etapas"`), e `GET /funis/{id}/configuracao`. Incluir no `main.py` (rotas específicas
antes de `/{id}`).

- [ ] **Step 5: Rodar + commit**

Run: `uv run pytest tests/test_funil.py -v` → PASS.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): funil — funis/etapas CRUD + config padrão na criação"
```

---

### Task 2: Cards do funil (kanban: mover, reorder, movimentações)

**Files:**
- Modify: `apps/api/app/schemas/funil.py` (CardIn/CardOut, ReorderItem, MoverIn)
- Modify: `apps/api/app/api/funil.py` (rotas de cards)
- Modify: `apps/api/tests/conftest.py` (tabelas de cards)
- Modify: `apps/api/tests/test_funil.py`

> Reusar o padrão de kanban do sub-2 (`/reorder`, `/{id}/mover` com registro em
> `FunilCardMovimentacoes`). Ler colunas reais de `FunilCards`, `FunilCardMovimentacoes`.
> A `funil_cards` referencia `etapa_id` (não `coluna_id`) e tem `ordem`.

- [ ] **Step 1: Teste** — criar etapa, criar card nela, mover para outra etapa, verificar
`etapa_id` mudou e que há 1 movimentação registrada.

- [ ] **Step 2: Implementar** as rotas de cards: CRUD via fábrica (`prefix="/cards"`),
`PATCH /cards/reorder`, `POST /cards/{id}/mover` (atualiza `etapa_id` + insere
`FunilCardMovimentacoes` com empresa_id derivada do JWT).

- [ ] **Step 3: Rodar + commit**

Run: `uv run pytest tests/test_funil.py -v` → PASS.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): funil — cards CRUD + mover/reorder com histórico"
```

---

### Task 3: Etiquetas e atividades do card

**Files:**
- Modify: `apps/api/app/schemas/funil.py`, `app/api/funil.py`, conftest, `tests/test_funil.py`

> `funil_etiquetas` (por empresa) + `funil_card_etiquetas` (M:N card×etiqueta);
> `funil_card_atividades` (atividades do card).

- [ ] **Step 1: Teste** — criar etiqueta, associá-la a um card, listar etiquetas do card;
criar atividade no card, listá-la.

- [ ] **Step 2: Implementar**:
  - CRUD de `funil_etiquetas` via fábrica (`/etiquetas`).
  - `POST /cards/{id}/etiquetas` (associa) e `GET /cards/{id}/etiquetas` (lista) via
    `funil_card_etiquetas`; `DELETE /cards/{id}/etiquetas/{etiqueta_id}`.
  - CRUD de atividades (`/cards/{id}/atividades`) scoped por empresa+card.

- [ ] **Step 3: Rodar suíte inteira + commit**

Run: `uv run pytest -q` → tudo verde.
```bash
git add -A apps/api/app apps/api/tests
git commit -m "feat(api): funil — etiquetas (M:N) e atividades do card"
```

---

## Validação final

- [ ] Criar funil cria a config padrão conforme o tipo (porta do trigger, testado).
- [ ] Cards: CRUD + mover (com histórico) + reorder, isolados por empresa.
- [ ] Etiquetas (M:N) e atividades funcionando.
- [ ] Suíte verde.

## Próximos

- **Sub-3b:** automações (`automacoes` + `automacoes_execucoes` + workers
  `executar_automacoes_agendadas` / `executar_automacoes_negocio_parado` no scheduler) e
  kanbans legados (`prospeccao_*`, `closer_*`, `pos_venda_*`, `cross_selling_*`) + integração
  Closer → Contas a Receber.
- **Sub-4:** Contratos.
