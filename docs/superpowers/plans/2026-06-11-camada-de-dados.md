# Camada de Dados (Introspecção das 172 tabelas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer o schema `public` (172 tabelas) do Supabase para o backend Python como models SQLAlchemy e recriá-lo no `db-toriq-corp` **sem triggers/funções**, mais um inventário classificado dos 229 triggers + 108 funções que guiará o porte da lógica para Python (Fatia 3).

**Architecture:** Geramos os models com `sqlacodegen --schemas public` a partir do Supabase (session pooler). Pós-processamos o arquivo gerado: rebind ao `Base` do app, religação das 39 FKs que apontavam para `auth.users` → nossa `public.users`, e reconciliação do enum de papéis (`app_role`, 6 valores). Recriamos o schema no `db-toriq-corp` via Alembic baseline *squashado* (o banco está vazio, pré-lançamento). `metadata.create_all`/autogenerate por natureza só cria tabelas/FKs/índices/enums — nunca triggers/funções, então o "banco novo nasce sem lógica" é automático. Por fim, dumpamos e classificamos triggers/funções num doc de inventário.

**Tech Stack:** sqlacodegen, SQLAlchemy 2.0, Alembic, psycopg (sync, p/ sqlacodegen) + asyncpg (runtime), pytest. Supabase via session pooler `aws-1-us-east-2.pooler.supabase.com:5432` (user `postgres.bsvtgdtsbrjdwdnpirzb`).

**Pré-requisitos:**
- Tasks do Plano 1 (Fundação) concluídas: `apps/api` com `users`/`empresas`/`notas`, auth, RBAC, 14 testes verdes.
- Connection string do Supabase disponível (fornecida pelo usuário; vai só no `.env`, nunca no git).
- Trabalhar na branch `feature/migracao-backend-python`. Rodar tudo de `apps/api` com `uv run`.

**Fatos do schema (já levantados):**
- 172 tabelas BASE, 302 FKs, 2 views, **39 FKs apontam para `auth.users.id`** (religar p/ `users.id`).
- Enums: `app_role` (admin_vertical, empresa_sst, cliente_final, empresa_parceira, instrutor, cliente_torq) e `tipo_empresa` (vertical_on, sst, cliente_final, empresa_parceira, lead).
- 3 objetos sem PK viram `Table` no sqlacodegen: views `atividades_unificadas`, `blog_trending`, e o junction `cross_selling_card_etiquetas`.
- 229 triggers + 108 funções (descartados do schema; viram inventário).

**Decisões de reconciliação (tomadas no discovery desta fatia):**
1. A `public.users` (credenciais, criada no Plano 1) é mantida e vira o alvo das 39 FKs que apontavam para `auth.users`.
2. `profiles` (introspectada) é o perfil de negócio do usuário; `profiles.id` passa a referenciar `users.id`.
3. O enum de papéis do app passa a ser `app_role` (6 valores reais); o `user_role` (5 valores, inventado no Plano 1) é **substituído** por `app_role`. `UserRole` no código é redefinido com os 6 valores.
4. `empresas`: a versão introspectada (mais completa) substitui a `empresa.py` mínima do Plano 1.
5. A tabela demo `notas` (e seu endpoint) é **removida** — existiu só para provar o isolamento na Fatia 1. O `TenantRepository` permanece (será usado pelos módulos reais).

---

### Task 1: Tooling de introspecção + conexão ao Supabase

**Files:**
- Modify: `apps/api/pyproject.toml` (adicionar deps de dev)
- Modify: `apps/api/.env` (adicionar `SUPABASE_DB_URL` — NÃO commitar)
- Create: `apps/api/scripts/__init__.py`
- Create: `apps/api/scripts/introspect.py` (wrapper de geração)

- [ ] **Step 1: Adicionar deps de dev**

Run (de `apps/api`):
```bash
uv add --dev sqlacodegen "psycopg[binary]"
```

- [ ] **Step 2: Adicionar a URL do Supabase ao `.env` (gitignored)**

Acrescentar a `apps/api/.env` (a senha real foi fornecida; confirmar antes que `.env` está gitignored com `git check-ignore apps/api/.env`):
```
SUPABASE_DB_URL=postgresql+psycopg://postgres.bsvtgdtsbrjdwdnpirzb:<SENHA_SUPABASE>@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

- [ ] **Step 3: Criar script wrapper de introspecção**

`apps/api/scripts/__init__.py` (vazio).

`apps/api/scripts/introspect.py`:
```python
"""Gera os models SQLAlchemy do schema public do Supabase.

Uso: uv run python -m scripts.introspect
Lê SUPABASE_DB_URL do ambiente/.env e escreve app/models/generated.py.
"""
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

OUT = Path(__file__).resolve().parent.parent / "app" / "models" / "generated.py"


def main() -> int:
    load_dotenv()
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        print("SUPABASE_DB_URL ausente no .env", file=sys.stderr)
        return 1
    cmd = ["sqlacodegen", "--schemas", "public", "--outfile", str(OUT), url]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
```

> `python-dotenv` já é dependência transitiva via pydantic-settings; se `import dotenv`
> falhar, rode `uv add python-dotenv`.

- [ ] **Step 4: Verificar conexão**

Run:
```bash
uv run python -c "import os; from dotenv import load_dotenv; load_dotenv(); import psycopg; c=psycopg.connect(os.environ['SUPABASE_DB_URL'].replace('+psycopg','')); print('tabelas public:', c.execute(\"select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'\").fetchone()[0])"
```
Expected: `tabelas public: 172`.

- [ ] **Step 5: Commitar (sem o .env)**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/scripts
git commit -m "chore(api): tooling de introspecção (sqlacodegen + script wrapper)"
```

---

### Task 2: Gerar os models do schema public

**Files:**
- Create: `apps/api/app/models/generated.py` (gerado — ~5500 linhas)

- [ ] **Step 1: Gerar**

Run (de `apps/api`):
```bash
uv run python -m scripts.introspect
```
Expected: cria `app/models/generated.py` com ~175 classes + 2 enums (`AppRole`, `TipoEmpresa`) + 3 objetos `Table` (views/junction). Sem erros.

- [ ] **Step 2: Sanidade — contar classes e enums**

Run:
```bash
grep -c "^class " app/models/generated.py
grep -nE "^class (AppRole|TipoEmpresa)\b" app/models/generated.py
```
Expected: ~175 classes; ambos os enums presentes.

- [ ] **Step 3: Commitar o gerado bruto (antes do pós-processamento)**

```bash
git add apps/api/app/models/generated.py
git commit -m "feat(api): models gerados do schema public do Supabase (bruto)"
```
> Commit do bruto separado do pós-processamento facilita revisar o diff do que mudamos.

---

### Task 3: Pós-processar o gerado — Base do app + religar FKs de `auth.users`

**Files:**
- Modify: `apps/api/app/models/generated.py`
- Create: `apps/api/scripts/postprocess_generated.py`

- [ ] **Step 1: Escrever o script de pós-processamento**

`apps/api/scripts/postprocess_generated.py`:
```python
"""Pós-processa app/models/generated.py após a geração:
1. Rebind: usa o Base do app (app.core.db) em vez do Base local gerado.
2. Religa as 39 FKs de 'auth.users.id' para 'users.id' (nossa tabela de credenciais).
3. Remove o comentario/schema 'auth' caso reste alguma referencia.
"""
from pathlib import Path

GEN = Path(__file__).resolve().parent.parent / "app" / "models" / "generated.py"


def main() -> None:
    src = GEN.read_text(encoding="utf-8")

    # 2. Religar FKs cross-schema: auth.users -> public.users
    src = src.replace("['auth.users.id']", "['users.id']")

    # 1. Rebind do Base: remover a definição local e importar do app
    src = src.replace(
        "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship",
        "from sqlalchemy.orm import Mapped, mapped_column, relationship\n"
        "from app.core.db import Base",
    )
    src = src.replace("class Base(DeclarativeBase):\n    pass\n\n\n", "")

    GEN.write_text(src, encoding="utf-8")
    # Verificações
    assert "auth.users" not in src, "ainda há referência a auth.users"
    assert "from app.core.db import Base" in src, "rebind do Base falhou"
    assert "class Base(DeclarativeBase)" not in src, "Base local não removido"
    print("pós-processamento OK")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar e verificar**

Run:
```bash
uv run python -m scripts.postprocess_generated
grep -c "auth.users" app/models/generated.py
```
Expected: imprime `pós-processamento OK`; o `grep` retorna `0`.

- [ ] **Step 3: Confirmar que o módulo importa**

Run:
```bash
uv run python -c "import app.models.generated; print('import OK')"
```
Expected: `import OK` (sem erros de sintaxe/import). Se houver erro de tipo não importado
ou de relacionamento ambíguo, corrija pontualmente e re-rode.

- [ ] **Step 4: Commitar**

```bash
git add apps/api/app/models/generated.py apps/api/scripts/postprocess_generated.py
git commit -m "refactor(api): rebind do Base e religação das FKs auth.users -> users"
```

---

### Task 4: Reconciliar os models do Plano 1 com o schema introspectado

**Files:**
- Delete: `apps/api/app/models/empresa.py` (substituído pela versão introspectada)
- Delete: `apps/api/app/models/nota.py` (tabela demo, não mais necessária)
- Delete: `apps/api/app/api/notas.py`, `apps/api/app/schemas/nota.py`, `apps/api/tests/test_tenant_isolation.py`
- Modify: `apps/api/app/models/user.py` (enum app_role; FK p/ empresas mantida)
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/main.py` (remover router de notas)

- [ ] **Step 1: Remover a tabela demo `notas` e seus consumidores**

Run:
```bash
git rm apps/api/app/models/nota.py apps/api/app/api/notas.py apps/api/app/schemas/nota.py apps/api/tests/test_tenant_isolation.py
```
Editar `apps/api/app/main.py`: remover a linha `from app.api.notas import router as notas_router` e a linha `app.include_router(notas_router)`.

> O `app/repositories/base.py` (TenantRepository) **permanece** — será usado pelos módulos reais. A prova de isolamento já foi feita; o teste demo sai junto com a tabela demo.

- [ ] **Step 2: Redefinir `UserRole` para o enum real `app_role`**

`apps/api/app/models/user.py` — substituir a classe `UserRole` e o tipo da coluna:
```python
class UserRole(str, enum.Enum):
    admin_vertical = "admin_vertical"
    empresa_sst = "empresa_sst"
    cliente_final = "cliente_final"
    empresa_parceira = "empresa_parceira"
    instrutor = "instrutor"
    cliente_torq = "cliente_torq"
```
E a coluna `role` passa a usar o enum nomeado `app_role` (reaproveitando o tipo do banco):
```python
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="app_role", create_type=False), nullable=False
    )
```
> `create_type=False`: o tipo `app_role` será criado pela migração baseline (Task 5), não
> pelo `create_table` de `users`, evitando `DuplicateObject`.

- [ ] **Step 3: Remover `empresa.py` do Plano 1 (a versão introspectada vence)**

Run:
```bash
git rm apps/api/app/models/empresa.py
```

- [ ] **Step 4: Atualizar `app/models/__init__.py`**

`apps/api/app/models/__init__.py`:
```python
from app.core.db import Base
from app.models import generated  # noqa: F401  (registra as 172 tabelas no metadata)
from app.models.user import User, UserRole

__all__ = ["Base", "User", "UserRole", "generated"]
```
> `Empresa` agora vem de `generated` (não mais de um módulo próprio). Onde o código importava
> `from app.models.empresa import Empresa`, passa a importar `from app.models.generated import Empresas`
> (nome da classe gerada). Ajustar `app/models/user.py` se ele importava `Empresa`.

- [ ] **Step 5: Verificar que tudo importa**

Run:
```bash
uv run python -c "import app.models; import app.main; print('OK')"
```
Expected: `OK`. Corrigir imports quebrados (ex.: `Empresa` → `Empresas`) até passar.

- [ ] **Step 6: Commitar**

```bash
git add -A apps/api/app apps/api/tests
git commit -m "refactor(api): reconcilia models do Plano 1 com schema introspectado (app_role, remove demo notas)"
```

---

### Task 5: Recriar o schema no `db-toriq-corp` (baseline squashado)

**Files:**
- Delete: `apps/api/migrations/versions/9252a270dc77_baseline_empresas_users_notas.py`
- Create: nova migração baseline (autogenerada)

> O `db-toriq-corp` está vazio (pré-lançamento). Resetamos o schema public e geramos UMA
> baseline com tudo (172 tabelas introspectadas + `users` + enums), em vez de empilhar uma
> migração de diff gigante sobre a baseline mínima do Plano 1.

- [ ] **Step 1: Resetar o schema public do `db-toriq-corp`**

Run (de `apps/api`, usa o DATABASE_URL do .env — o banco NOVO, não o Supabase):
```bash
uv run python -c "
import asyncio, os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
load_dotenv()
async def main():
    e = create_async_engine(os.environ['DATABASE_URL'], connect_args={'ssl': False})
    async with e.begin() as c:
        await c.execute(text('DROP SCHEMA public CASCADE'))
        await c.execute(text('CREATE SCHEMA public'))
    await e.dispose()
    print('schema public resetado')
asyncio.run(main())
"
```
Expected: `schema public resetado`.

- [ ] **Step 2: Remover a baseline antiga e gerar a nova**

Run:
```bash
git rm apps/api/migrations/versions/9252a270dc77_baseline_empresas_users_notas.py
uv run alembic revision --autogenerate -m "baseline: schema public completo + users"
```
Expected: cria uma migração com `op.create_table(...)` para as 172 tabelas + `users`, os
enums `app_role`/`tipo_empresa`, índices e FKs. Pode ser grande (~3000 linhas).

- [ ] **Step 3: Garantir idempotência do enum no downgrade (lição do Plano 1)**

Na nova migração, no fim de `downgrade()`, garantir o drop dos tipos (guarda de dialeto):
```python
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS app_role")
        op.execute("DROP TYPE IF EXISTS tipo_empresa")
```

- [ ] **Step 4: Aplicar e verificar contagem de tabelas**

Run:
```bash
uv run alembic upgrade head
uv run python -c "
import asyncio, os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
load_dotenv()
async def main():
    e = create_async_engine(os.environ['DATABASE_URL'], connect_args={'ssl': False})
    async with e.connect() as c:
        n = await c.scalar(text(\"select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'\"))
        print('tabelas no db-toriq-corp:', n)
    await e.dispose()
asyncio.run(main())
"
```
Expected: `tabelas no db-toriq-corp:` ≥ 173 (172 introspectadas + `users`; views podem ou
não ser recriadas — ver Task 6). Se o `upgrade` falhar, ler o erro (provável: FK para uma
view, ou enum duplicado) e ajustar.

- [ ] **Step 5: Commitar**

```bash
git add apps/api/migrations/versions
git commit -m "feat(api): baseline com schema public completo aplicada no db-toriq-corp"
```

---

### Task 6: Tratar as views e o vínculo `profiles.id → users.id`

**Files:**
- Create: `apps/api/migrations/versions/<nova>_views_e_link_profiles_users.py` (manual)

- [ ] **Step 1: Verificar como as views ficaram**

As views (`atividades_unificadas`, `blog_trending`) viram `Table` sem PK no sqlacodegen e
são criadas como **tabelas vazias** pelo create_all — o que é errado (deveriam ser views).
Run para extrair a definição real das views do Supabase:
```bash
uv run python -c "
import os; from dotenv import load_dotenv; load_dotenv(); import psycopg
c=psycopg.connect(os.environ['SUPABASE_DB_URL'].replace('+psycopg',''))
for v in ['atividades_unificadas','blog_trending']:
    d=c.execute('select pg_get_viewdef(%s::regclass, true)', (f'public.{v}',)).fetchone()[0]
    print(f'--- {v} ---'); print(d)
"
```
Expected: imprime o SQL das 2 views.

- [ ] **Step 2: Criar migração manual: dropar as "tabelas" de view e recriar como views + link profiles**

Run:
```bash
uv run alembic revision -m "views e link profiles->users"
```
Preencher o `upgrade()` da migração criada com (substituir `<DEF_*>` pelas definições do Step 1):
```python
def upgrade() -> None:
    # As views vieram como tabelas vazias do create_all; trocar por views reais.
    op.drop_table("atividades_unificadas")
    op.drop_table("blog_trending")
    op.execute("CREATE VIEW atividades_unificadas AS <DEF_atividades_unificadas>")
    op.execute("CREATE VIEW blog_trending AS <DEF_blog_trending>")
    # Vincular o perfil de negócio à tabela de credenciais.
    op.create_foreign_key(
        "profiles_id_users_fkey", "profiles", "users",
        ["id"], ["id"], ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("profiles_id_users_fkey", "profiles", type_="foreignkey")
    op.execute("DROP VIEW IF EXISTS blog_trending")
    op.execute("DROP VIEW IF EXISTS atividades_unificadas")
    op.create_table("atividades_unificadas")  # placeholder; recriação só p/ simetria
    op.create_table("blog_trending")
```

- [ ] **Step 3: Aplicar e verificar**

Run:
```bash
uv run alembic upgrade head
uv run python -c "
import asyncio, os
from dotenv import load_dotenv; from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
load_dotenv()
async def main():
    e = create_async_engine(os.environ['DATABASE_URL'], connect_args={'ssl': False})
    async with e.connect() as c:
        v = await c.scalar(text(\"select count(*) from information_schema.views where table_schema='public'\"))
        fk = await c.scalar(text(\"select count(*) from information_schema.table_constraints where constraint_name='profiles_id_users_fkey'\"))
        print('views:', v, '| profiles->users fk:', fk)
    await e.dispose()
asyncio.run(main())
"
```
Expected: `views: 2 | profiles->users fk: 1`.

- [ ] **Step 4: Commitar**

```bash
git add apps/api/migrations/versions
git commit -m "feat(api): recria views e vincula profiles.id -> users.id"
```

---

### Task 7: Inventário classificado dos 229 triggers + 108 funções

**Files:**
- Create: `apps/api/scripts/dump_logic_inventory.py`
- Create: `docs/superpowers/inventario-logica-banco.md`

- [ ] **Step 1: Script que extrai triggers e funções do Supabase**

`apps/api/scripts/dump_logic_inventory.py`:
```python
"""Extrai triggers e funções do schema public do Supabase para um inventário markdown."""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

OUT = Path(__file__).resolve().parents[3] / "docs" / "superpowers" / "inventario-logica-banco.md"

TRIGGERS_SQL = """
select c.relname as tabela, t.tgname as trigger,
       pg_get_triggerdef(t.oid) as definicao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and not t.tgisinternal
order by c.relname, t.tgname;
"""

FUNCS_SQL = """
select p.proname as funcao, pg_get_functiondef(p.oid) as definicao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
order by p.proname;
"""


def main() -> None:
    load_dotenv()
    conn = psycopg.connect(os.environ["SUPABASE_DB_URL"].replace("+psycopg", ""))
    triggers = conn.execute(TRIGGERS_SQL).fetchall()
    funcs = conn.execute(FUNCS_SQL).fetchall()

    lines = ["# Inventário da lógica do banco (triggers + funções)\n"]
    lines.append("> Gerado de `scripts/dump_logic_inventory.py`. Cada item deve ser portado")
    lines.append("> para Python na Fatia 3 e marcado aqui (Categoria + Destino).\n")
    lines.append(f"\n## Triggers ({len(triggers)})\n")
    lines.append("| Tabela | Trigger | Categoria | Destino Python | Portado |")
    lines.append("|---|---|---|---|---|")
    for tabela, trig, _ in triggers:
        lines.append(f"| {tabela} | {trig} |  |  | ☐ |")
    lines.append(f"\n## Funções ({len(funcs)})\n")
    lines.append("| Função | Categoria | Destino Python | Portado |")
    lines.append("|---|---|---|---|")
    for nome, _ in funcs:
        lines.append(f"| {nome} |  |  | ☐ |")

    lines.append("\n## Definições completas (referência)\n")
    for tabela, trig, d in triggers:
        lines.append(f"\n### trigger `{trig}` on `{tabela}`\n```sql\n{d}\n```")
    for nome, d in funcs:
        lines.append(f"\n### function `{nome}`\n```sql\n{d}\n```")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"inventário escrito: {OUT} ({len(triggers)} triggers, {len(funcs)} funções)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Gerar o inventário**

Run (de `apps/api`):
```bash
uv run python -m scripts.dump_logic_inventory
```
Expected: `inventário escrito: ... (229 triggers, 108 funções)`.

- [ ] **Step 3: Classificar as categorias óbvias (auditoria, timestamp)**

Editar `docs/superpowers/inventario-logica-banco.md`: preencher a coluna **Categoria** ao
menos para os padrões evidentes pelo nome (ex.: triggers `set_updated_at`/`*_updated_at` →
`timestamp`; `*_audit`/`log_*` → `auditoria`; `*_notif*` → `notificação`; o resto →
`negócio (revisar)`). Não precisa portar nada agora — só classificar para a Fatia 3.

- [ ] **Step 4: Commitar**

```bash
git add apps/api/scripts/dump_logic_inventory.py docs/superpowers/inventario-logica-banco.md
git commit -m "docs(api): inventário classificado dos 229 triggers + 108 funções"
```

---

### Task 8: Testes de invariantes do schema introspectado

**Files:**
- Create: `apps/api/tests/test_schema_introspection.py`

> Não testamos 172 models um a um (inviável). Testamos as **invariantes** que provam que a
> introspecção e a reconciliação deram certo, usando o banco real `db-toriq-corp`.

- [ ] **Step 1: Escrever os testes**

`apps/api/tests/test_schema_introspection.py`:
```python
import os

import pytest
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"), reason="precisa do db-toriq-corp configurado"
)


@pytest.fixture
async def conn():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"ssl": False})
    async with engine.connect() as c:
        yield c
    await engine.dispose()


async def test_todas_as_tabelas_existem(conn):
    n = await conn.scalar(text(
        "select count(*) from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE'"
    ))
    assert n >= 173  # 172 introspectadas + users (credenciais)


async def test_enum_app_role_tem_6_valores(conn):
    vals = await conn.scalar(text(
        "select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid "
        "where t.typname='app_role'"
    ))
    assert vals == 6


async def test_nenhuma_fk_aponta_para_schema_auth(conn):
    # Após a religação, nenhuma FK deve referenciar o schema auth (que não existe mais).
    n = await conn.scalar(text("""
        select count(*) from information_schema.referential_constraints rc
        join information_schema.table_constraints tc
          on tc.constraint_name = rc.unique_constraint_name
        where tc.table_schema = 'auth'
    """))
    assert n == 0


async def test_profiles_referencia_users(conn):
    fk = await conn.scalar(text(
        "select count(*) from information_schema.table_constraints "
        "where constraint_name='profiles_id_users_fkey' and constraint_type='FOREIGN KEY'"
    ))
    assert fk == 1


async def test_zero_triggers_no_banco_novo(conn):
    # O banco novo nasce sem lógica; triggers serão portados para Python.
    n = await conn.scalar(text("""
        select count(*) from pg_trigger t
        join pg_class c on c.oid=t.tgrelid
        join pg_namespace ns on ns.oid=c.relnamespace
        where ns.nspname='public' and not t.tgisinternal
    """))
    assert n == 0
```

- [ ] **Step 2: Rodar**

Run:
```bash
uv run pytest tests/test_schema_introspection.py -v
```
Expected: 5 passed. (Estes testes batem no `db-toriq-corp` real; os demais testes da suíte
continuam em SQLite.)

- [ ] **Step 3: Rodar a suíte inteira**

Run:
```bash
uv run pytest -q
```
Expected: todos passam (os testes do Plano 1 menos o `test_tenant_isolation` removido, mais
estes 5 de introspecção).

- [ ] **Step 4: Commitar**

```bash
git add apps/api/tests/test_schema_introspection.py
git commit -m "test(api): invariantes do schema introspectado (tabelas, enums, FKs, sem triggers)"
```

---

## Validação final

- [ ] `app/models/generated.py` tem ~172 models, importa sem erro, e zero referências a `auth.users`.
- [ ] `db-toriq-corp` tem ≥173 tabelas, 2 views, enums `app_role`/`tipo_empresa`, FK `profiles→users`, e **zero triggers** (lógica vai para Python).
- [ ] `docs/superpowers/inventario-logica-banco.md` lista os 229 triggers + 108 funções, com categorias preenchidas para os padrões óbvios.
- [ ] Suíte de testes verde (SQLite p/ unidade + 5 invariantes contra o banco real).
- [ ] `apps/api/.env` (com `SUPABASE_DB_URL`) nunca commitado.

## Próximos planos

3. **Módulos de negócio** — portar os 7 edge functions + a lógica do inventário, módulo a módulo (SST, Toriq Corp/CRM, Treinamentos, Frota, White Label); storage via RustFS; reusar o `TenantRepository`.
0. **Hardening de auth** (bloqueante de pré-deploy) — fechar o `/auth/register`.
4. eSocial em Python · 5. Religar o front (136 arquivos) · 6. Cutover.
