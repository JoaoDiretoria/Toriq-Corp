# Role `suporte` + Dashboard Ops/Observabilidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a role de sistema `suporte` (staff interno TORIQ, visão global) e um dashboard dedicado `/ops` com painéis de health, banco de dados, Redis/filas/scheduler, tickets cross-tenant, gestão global de usuários (com impersonação auditada) e Sentry (SDK + link-out).

**Architecture:** Backend FastAPI ganha um router `/ops` (read-only para observabilidade; escrita só na gestão de usuários) guardado por `require_ops` (`admin_vertical` ou `suporte`), com lógica pesada em `app/services/ops.py`. Sentry é inicializado no `create_app()` só se `SENTRY_DSN` existir. Frontend ganha uma página `SuporteDashboard` espelhando o padrão `AdminDashboard`, com sidebar própria e painéis que consomem `/ops/*` via o client `api`.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async (asyncpg), Alembic, Redis (redis.asyncio), APScheduler, pytest (real Postgres com rollback transacional) · React 18 + TypeScript, react-router-dom, shadcn/ui, lucide-react.

---

## Convenções deste plano

- **Backend tests:** rodar de `apps/api/`. Comando padrão: `uv run pytest tests/<arquivo>::<teste> -v`.
- **Login nos testes:** `conftest.py` liga `open_register=True`, então criamos usuários via `POST /auth/register` e logamos via `POST /auth/login` (o `AsyncClient` guarda os cookies). Sem `TURNSTILE_SECRET_KEY`, o captcha é pulado.
- **Migrações:** head atual = `e9b0c1d2f3a4`. Toda migração nova encadeia a partir do head anterior. Após criar migração, aplicar com `uv run alembic upgrade head` (no banco principal e no de teste, se `TEST_DATABASE_URL` apontar para outro).
- **Frontend "test":** o repo não tem runner de teste de front; a verificação de cada tarefa de front é `npm run build` (typecheck + bundle) passando, mais a checagem manual descrita.
- **Commits:** um commit pequeno por tarefa.

---

## File Structure

**Backend — criar:**
- `apps/api/migrations/versions/f0c1a2b3c4d5_role_suporte_enum.py` — `ALTER TYPE app_role ADD VALUE 'suporte'`.
- `apps/api/migrations/versions/a1d2e3f4a5b6_ops_audit_log.py` — tabela `ops_audit_log`.
- `apps/api/app/models/ops_audit.py` — modelo `OpsAuditLog`.
- `apps/api/app/schemas/ops.py` — schemas Pydantic de todos os endpoints `/ops`.
- `apps/api/app/services/ops.py` — lógica (health, db, redis, tickets, usuários, auditoria).
- `apps/api/app/api/ops.py` — router `/ops`.
- `apps/api/tests/test_ops.py` — testes do subsistema.

**Backend — modificar:**
- `apps/api/app/models/user.py` — adicionar `suporte` ao enum.
- `apps/api/app/api/deps.py` — `require_ops`.
- `apps/api/app/core/tokens.py` — `create_token` aceita `imp_by`.
- `apps/api/app/api/auth.py` — `_set_auth_cookies`/`refresh` propagam `imp_by`.
- `apps/api/app/core/config.py` — `sentry_dsn`, `sentry_environment`, `sentry_org`, `sentry_project`.
- `apps/api/app/main.py` — init Sentry + `started_at` + incluir `ops_router`.
- `apps/api/pyproject.toml` — dep `sentry-sdk[fastapi]`.

**Frontend — criar:**
- `src/pages/SuporteDashboard.tsx` — página container.
- `src/components/suporte/SuporteSidebar.tsx` — navegação.
- `src/components/suporte/OpsVisaoGeral.tsx`
- `src/components/suporte/OpsBancoDados.tsx`
- `src/components/suporte/OpsRedisFilas.tsx`
- `src/components/suporte/OpsTickets.tsx`
- `src/components/suporte/OpsUsuarios.tsx`
- `src/components/suporte/OpsSentry.tsx`
- `src/components/suporte/OpsAuditoria.tsx`
- `src/integrations/api/ops.ts` — wrapper tipado dos endpoints `/ops`.

**Frontend — modificar:**
- `src/hooks/useAuth.tsx` — `'suporte'` no union de role.
- `src/pages/Auth.tsx` — redirect pós-login de `suporte` → `/ops`.
- `src/App.tsx` — rota `/ops`.
- `src/components/admin/AdminSidebar.tsx` — link para `/ops` (acesso do admin).

---

# FASE 1 — Fundação: role, guard, Sentry, shell do dashboard, health

### Task 1: Adicionar role `suporte` ao enum (Python + Postgres)

**Files:**
- Modify: `apps/api/app/models/user.py:13-19`
- Create: `apps/api/migrations/versions/f0c1a2b3c4d5_role_suporte_enum.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_ops.py` com um helper de login e o primeiro teste:

```python
"""Testes do subsistema Ops/Suporte (role suporte + dashboard /ops)."""
import pytest

pytestmark = pytest.mark.anyio


async def _register_login(client, email: str, role: str, empresa_id: str | None = None):
    """Registra (open_register ligado nos testes) e loga; cookies ficam no client."""
    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Senha123!",
            "nome": f"User {role}",
            "role": role,
            "empresa_id": empresa_id,
        },
    )
    r = await client.post("/auth/login", json={"email": email, "password": "Senha123!"})
    assert r.status_code == 200, r.text


async def test_suporte_role_pode_registrar_e_logar(client):
    # Só passa se o enum app_role já tiver o valor 'suporte' (migração aplicada).
    await _register_login(client, "sup1@toriq.test", "suporte")
    r = await client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "sup1@toriq.test"
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `uv run pytest tests/test_ops.py::test_suporte_role_pode_registrar_e_logar -v`
Expected: FAIL — o registro com role `suporte` quebra (valor inexistente no enum Python e/ou no tipo `app_role`).

- [ ] **Step 3: Adicionar o valor ao enum Python**

Em `apps/api/app/models/user.py`, dentro de `class UserRole`:

```python
class UserRole(str, enum.Enum):
    admin_vertical = "admin_vertical"
    empresa_sst = "empresa_sst"
    cliente_final = "cliente_final"
    empresa_parceira = "empresa_parceira"
    instrutor = "instrutor"
    cliente_torq = "cliente_torq"
    suporte = "suporte"
```

- [ ] **Step 4: Criar a migração do enum Postgres**

Criar `apps/api/migrations/versions/f0c1a2b3c4d5_role_suporte_enum.py`:

```python
"""Adiciona o valor 'suporte' ao enum app_role (role de staff interno).

Aditiva. PG 12+ permite ADD VALUE dentro de transação (o valor só não pode ser
USADO na mesma transação — aqui só adicionamos).

Revision ID: f0c1a2b3c4d5
Revises: e9b0c1d2f3a4
Create Date: 2026-06-14 17:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f0c1a2b3c4d5"
down_revision: Union[str, None] = "e9b0c1d2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'suporte'")


def downgrade() -> None:
    # Postgres não suporta remover valor de enum sem recriar o tipo. No-op
    # intencional: reverter exigiria recriar app_role e reescrever a coluna.
    pass
```

- [ ] **Step 5: Aplicar a migração**

Run: `uv run alembic upgrade head`
Expected: aplica `f0c1a2b3c4d5`. Se o banco de teste for separado (`TEST_DATABASE_URL`), aplicar nele também:
`TEST_DATABASE_URL=... uv run alembic upgrade head` (ou apontar a `DATABASE_URL` para o banco de teste ao migrar).

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `uv run pytest tests/test_ops.py::test_suporte_role_pode_registrar_e_logar -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/models/user.py apps/api/migrations/versions/f0c1a2b3c4d5_role_suporte_enum.py apps/api/tests/test_ops.py
git commit -m "feat(ops): adiciona role suporte ao enum app_role"
```

---

### Task 2: Guard `require_ops`

**Files:**
- Modify: `apps/api/app/api/deps.py:55-61`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_require_ops_bloqueia_nao_ops(client):
    # cliente_final não pode acessar /ops/health (403).
    await _register_login(client, "cli@toriq.test", "cliente_final")
    r = await client.get("/ops/health")
    assert r.status_code == 403


async def test_require_ops_permite_suporte(client):
    await _register_login(client, "sup2@toriq.test", "suporte")
    r = await client.get("/ops/health")
    assert r.status_code == 200
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py -k require_ops -v`
Expected: FAIL — `/ops/health` ainda não existe (404).

- [ ] **Step 3: Adicionar o guard**

Em `apps/api/app/api/deps.py`, ao final do arquivo (após `require_role`):

```python
# Guard do dashboard de suporte/observabilidade (/ops): staff interno TORIQ.
# admin_vertical (superadmin) também acessa. Use como dependência em todo /ops.
require_ops = require_role(UserRole.admin_vertical, UserRole.suporte)
```

(Os endpoints `/ops/health` chegam na Task 5; estes testes passam ao final da Task 5.)

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/api/deps.py apps/api/tests/test_ops.py
git commit -m "feat(ops): guard require_ops (admin_vertical|suporte)"
```

---

### Task 3: Schema de health

**Files:**
- Create: `apps/api/app/schemas/ops.py`

- [ ] **Step 1: Criar os schemas de health**

Criar `apps/api/app/schemas/ops.py`:

```python
"""Schemas Pydantic do dashboard Ops/Suporte (/ops)."""
from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class DependenciaStatus(BaseModel):
    nome: str
    ok: bool
    detalhe: str | None = None


class HealthOut(BaseModel):
    status: str  # "ok" | "degradado"
    versao: str
    uptime_segundos: int
    dependencias: list[DependenciaStatus]
    fila_profundidade: int | None = None
    scheduler_jobs: int | None = None
```

- [ ] **Step 2: Verificar import**

Run: `uv run python -c "import app.schemas.ops"`
Expected: sem erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/schemas/ops.py
git commit -m "feat(ops): schemas de health"
```

---

### Task 4: Serviço de health

**Files:**
- Create: `apps/api/app/services/ops.py`

- [ ] **Step 1: Criar o serviço com a função de health**

Criar `apps/api/app/services/ops.py`:

```python
"""Lógica do dashboard Ops/Suporte: health, banco, redis, tickets, usuários, auditoria.

Tudo aqui é read-only, exceto as funções de gestão de usuários/auditoria.
Acesso ao Redis é feito pelos clients de app.core.cache / app.core.queue.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.config import settings
from app.core.queue import queue


async def _db_ok(db: AsyncSession) -> tuple[bool, str | None]:
    try:
        await db.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


async def _redis_ok() -> tuple[bool, str | None]:
    client = cache._get_client()
    if client is None:
        return False, "Redis desligado (REDIS_URL ausente)"
    try:
        await client.ping()
        return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


async def fila_profundidade() -> int | None:
    """Nº de jobs aguardando na lista Redis da fila. None se sem Redis."""
    client = queue._get_client()
    if client is None:
        return None
    try:
        return int(await client.llen(f"{settings.cache_prefix}:queue"))
    except Exception:  # pragma: no cover
        return None


async def montar_health(db: AsyncSession) -> dict:
    db_ok, db_detalhe = await _db_ok(db)
    redis_ok, redis_detalhe = await _redis_ok()
    deps = [
        {"nome": "postgres", "ok": db_ok, "detalhe": db_detalhe},
        {"nome": "redis", "ok": redis_ok, "detalhe": redis_detalhe},
    ]
    # Redis é opcional (degradação graciosa): não derruba o status geral.
    status = "ok" if db_ok else "degradado"
    return {
        "status": status,
        "dependencias": deps,
        "fila_profundidade": await fila_profundidade(),
    }
```

- [ ] **Step 2: Verificar import**

Run: `uv run python -c "import app.services.ops"`
Expected: sem erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/services/ops.py
git commit -m "feat(ops): serviço de health"
```

---

### Task 5: Router `/ops` + `GET /ops/health` + registrar `started_at`

**Files:**
- Create: `apps/api/app/api/ops.py`
- Modify: `apps/api/app/main.py:92-115` (lifespan: `started_at`), `apps/api/app/main.py` (import + include do router)
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_health_estrutura(client):
    await _register_login(client, "sup3@toriq.test", "suporte")
    r = await client.get("/ops/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in ("ok", "degradado")
    assert "versao" in body and "uptime_segundos" in body
    nomes = {d["nome"] for d in body["dependencias"]}
    assert {"postgres", "redis"} <= nomes
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py::test_health_estrutura -v`
Expected: FAIL (404).

- [ ] **Step 3: Criar o router**

Criar `apps/api/app/api/ops.py`:

```python
"""Router do dashboard Ops/Suporte (/ops). Guard: require_ops."""
from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ops
from app.core.db import get_db
from app.models.user import User
from app.schemas.ops import HealthOut
from app.services import ops as ops_service

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/health", response_model=HealthOut)
async def health(
    request: Request,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> HealthOut:
    base = await ops_service.montar_health(db)

    started_at = getattr(request.app.state, "started_at", None)
    if started_at is not None:
        uptime = int(
            (datetime.datetime.now(tz=datetime.timezone.utc) - started_at).total_seconds()
        )
    else:
        uptime = 0

    scheduler = getattr(request.app.state, "scheduler", None)
    jobs = len(scheduler.get_jobs()) if scheduler is not None else None

    return HealthOut(
        status=base["status"],
        versao=request.app.version,
        uptime_segundos=uptime,
        dependencias=base["dependencias"],
        fila_profundidade=base["fila_profundidade"],
        scheduler_jobs=jobs,
    )
```

- [ ] **Step 4: Registrar `started_at` no lifespan**

Em `apps/api/app/main.py`, dentro de `lifespan`, logo após `scheduler.start()` (linha ~98):

```python
    scheduler = build_scheduler()
    scheduler.start()
    app.state.scheduler = scheduler
    import datetime as _dt
    app.state.started_at = _dt.datetime.now(tz=_dt.timezone.utc)
```

- [ ] **Step 5: Incluir o router**

Em `apps/api/app/main.py`, junto aos outros imports de router (após a linha `from app.api.health import router as health_router`):

```python
from app.api.ops import router as ops_router
```

E dentro de `create_app()`, após `app.include_router(health_router)`:

```python
    # Dashboard Ops/Suporte (observabilidade + gestão global) — guard require_ops
    app.include_router(ops_router)
```

- [ ] **Step 6: Rodar os testes da fase**

Run: `uv run pytest tests/test_ops.py -v`
Expected: PASS — incluindo `test_require_ops_*` da Task 2 e `test_health_estrutura`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/api/ops.py apps/api/app/main.py apps/api/tests/test_ops.py
git commit -m "feat(ops): router /ops + GET /ops/health"
```

---

### Task 6: Sentry (dependência + config + init)

**Files:**
- Modify: `apps/api/pyproject.toml:6-23`, `apps/api/app/core/config.py`, `apps/api/app/main.py` (`create_app`)

- [ ] **Step 1: Adicionar a dependência de runtime**

Em `apps/api/pyproject.toml`, dentro de `[project].dependencies` (NÃO em dev — o Docker usa `uv sync --frozen --no-dev`), adicionar a última linha:

```toml
    "redis>=5.2",
    "sentry-sdk[fastapi]>=2.20",
]
```

- [ ] **Step 2: Sincronizar o lock**

Run: `uv sync`
Expected: instala `sentry-sdk`.

- [ ] **Step 3: Adicionar config**

Em `apps/api/app/core/config.py`, antes da `@property cors_origins_list` (após o bloco do Redis, linha ~70):

```python
    # Sentry (observabilidade de erros). OPCIONAL: sem SENTRY_DSN o SDK não
    # inicializa (degradação graciosa). org/project são usados só para montar a
    # URL de link-out no dashboard /ops (não há chamada à API do Sentry no v1).
    sentry_dsn: str | None = None
    sentry_environment: str = "production"
    sentry_org: str | None = None
    sentry_project: str | None = None
```

- [ ] **Step 4: Inicializar no create_app**

Em `apps/api/app/main.py`, no início de `create_app()` (antes de `app = FastAPI(...)`):

```python
def create_app() -> FastAPI:
    # Sentry: só inicializa se houver DSN (degrade gracioso, igual ao Redis).
    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment,
            traces_sample_rate=0.0,
        )
    app = FastAPI(title="TORIQ API", version="0.1.0", lifespan=lifespan)
```

- [ ] **Step 5: Verificar que a app sobe sem DSN**

Run: `uv run python -c "from app.main import app; print(app.title)"`
Expected: imprime `TORIQ API` (sem DSN, Sentry não inicializa, nada quebra).

- [ ] **Step 6: Rodar a suíte para garantir que nada regrediu**

Run: `uv run pytest tests/test_ops.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/app/core/config.py apps/api/app/main.py
git commit -m "feat(ops): integra sentry-sdk (init condicional ao SENTRY_DSN)"
```

---

### Task 7: Frontend — role no useAuth + redirect + rota `/ops`

**Files:**
- Modify: `src/hooks/useAuth.tsx:40`, `src/pages/Auth.tsx:78-95`, `src/App.tsx`

- [ ] **Step 1: Adicionar `suporte` ao union de role**

Em `src/hooks/useAuth.tsx`, na interface `Profile` (linha 40):

```typescript
  role: 'admin_vertical' | 'cliente_torq' | 'cliente_final' | 'empresa_parceira' | 'instrutor' | 'suporte';
```

- [ ] **Step 2: Redirect pós-login**

Em `src/pages/Auth.tsx`, dentro do `useEffect` de redirecionamento (após o ramo `admin_vertical`, linha ~82):

```typescript
      if (profile.role === 'admin_vertical') {
        navigate('/admin', { replace: true });
      } else if (profile.role === 'suporte') {
        navigate('/ops', { replace: true });
      } else if (profile.role === 'cliente_torq') {
```

- [ ] **Step 3: Importar e registrar a rota**

Em `src/App.tsx`, junto aos imports de páginas (após `import AdminDashboard from "./pages/AdminDashboard";`):

```typescript
import SuporteDashboard from "./pages/SuporteDashboard";
```

E nas `<Routes>`, logo após a rota `/admin` (linha ~79):

```tsx
            <Route path="/ops" element={<RequireSenhaAlterada><SuporteDashboard /></RequireSenhaAlterada>} />
```

(O componente `SuporteDashboard` é criado na Task 8; o build só fechará após a Task 8.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAuth.tsx src/pages/Auth.tsx src/App.tsx
git commit -m "feat(ops): role suporte no front + redirect + rota /ops"
```

---

### Task 8: Frontend — Sidebar + página shell do dashboard Ops

**Files:**
- Create: `src/components/suporte/SuporteSidebar.tsx`, `src/pages/SuporteDashboard.tsx`

- [ ] **Step 1: Criar a sidebar**

Criar `src/components/suporte/SuporteSidebar.tsx`:

```tsx
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Activity, Database, Server, Headphones, Users, Bug, ScrollText,
  LogOut, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type OpsSection =
  | 'visao-geral' | 'banco' | 'redis' | 'tickets' | 'usuarios' | 'sentry' | 'auditoria';

interface NavItem { id: OpsSection; label: string; icon: LucideIcon; }

const NAV_ITEMS: NavItem[] = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Activity },
  { id: 'banco', label: 'Banco de Dados', icon: Database },
  { id: 'redis', label: 'Redis & Filas', icon: Server },
  { id: 'tickets', label: 'Tickets', icon: Headphones },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'sentry', label: 'Sentry / Erros', icon: Bug },
  { id: 'auditoria', label: 'Auditoria', icon: ScrollText },
];

interface Props {
  activeSection: OpsSection;
  onSectionChange: (s: OpsSection) => void;
}

export function SuporteSidebar({ activeSection, onSectionChange }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <img
          src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png"
          alt="TORIQ"
          className="h-9 w-auto shrink-0"
        />
        <span className="mt-2 text-xs font-medium text-muted-foreground">Suporte · Ops</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [ ] **Step 2: Criar a página container (com placeholders de painel que viram componentes reais nas próximas tarefas)**

Criar `src/pages/SuporteDashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SuporteSidebar, type OpsSection } from '@/components/suporte/SuporteSidebar';
import { OpsVisaoGeral } from '@/components/suporte/OpsVisaoGeral';
import { OpsBancoDados } from '@/components/suporte/OpsBancoDados';
import { OpsRedisFilas } from '@/components/suporte/OpsRedisFilas';
import { OpsTickets } from '@/components/suporte/OpsTickets';
import { OpsUsuarios } from '@/components/suporte/OpsUsuarios';
import { OpsSentry } from '@/components/suporte/OpsSentry';
import { OpsAuditoria } from '@/components/suporte/OpsAuditoria';

const TITLES: Record<OpsSection, string> = {
  'visao-geral': 'Visão Geral do Sistema',
  banco: 'Banco de Dados',
  redis: 'Redis, Filas & Jobs',
  tickets: 'Tickets de Suporte (Global)',
  usuarios: 'Usuários do Sistema',
  sentry: 'Sentry / Erros',
  auditoria: 'Log de Auditoria',
};

const SuporteDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<OpsSection>('visao-geral');

  // Acesso: apenas suporte e admin_vertical. Demais voltam para /dashboard.
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && profile && profile.role !== 'suporte' && profile.role !== 'admin_vertical') {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!profile || (profile.role !== 'suporte' && profile.role !== 'admin_vertical')) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'visao-geral': return <OpsVisaoGeral />;
      case 'banco': return <OpsBancoDados />;
      case 'redis': return <OpsRedisFilas />;
      case 'tickets': return <OpsTickets />;
      case 'usuarios': return <OpsUsuarios />;
      case 'sentry': return <OpsSentry />;
      case 'auditoria': return <OpsAuditoria />;
      default: return <OpsVisaoGeral />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SuporteSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-auto scrollbar-thin">
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-muted transition-colors" />
                <div className="h-6 w-px bg-border" />
                <h1 className="text-sm font-medium text-muted-foreground">{TITLES[activeSection]}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Toriq</span>
                <span className="text-primary">•</span>
                <span>Suporte</span>
              </div>
            </div>
          </header>
          <div className="p-6">{renderSection()}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SuporteDashboard;
```

> NOTA: este arquivo importa 7 componentes de painel. Para o build fechar nesta tarefa, crie stubs mínimos para os que ainda não existem (todos exceto `OpsVisaoGeral`, feito na Task 9). Cada stub: `export function OpsX() { return <div className="text-sm text-muted-foreground">Em breve.</div>; }` no respectivo arquivo. As tarefas seguintes substituem cada stub pelo conteúdo real.

- [ ] **Step 3: Criar os stubs dos painéis ainda não implementados**

Criar com o conteúdo stub abaixo (um arquivo cada):
`src/components/suporte/OpsBancoDados.tsx`, `OpsRedisFilas.tsx`, `OpsTickets.tsx`, `OpsUsuarios.tsx`, `OpsSentry.tsx`, `OpsAuditoria.tsx`.

Exemplo (`OpsBancoDados.tsx` — replicar trocando o nome da função em cada arquivo):

```tsx
export function OpsBancoDados() {
  return <div className="text-sm text-muted-foreground">Em breve.</div>;
}
```

Nomes das funções por arquivo: `OpsBancoDados`, `OpsRedisFilas`, `OpsTickets`, `OpsUsuarios`, `OpsSentry`, `OpsAuditoria`.

- [ ] **Step 4: Verificar o build (typecheck)**

Run: `npm run build`
Expected: build conclui sem erros de tipo. (`OpsVisaoGeral` vem na próxima tarefa; crie também um stub `OpsVisaoGeral` agora para o build fechar, e substitua na Task 9.)

- [ ] **Step 5: Commit**

```bash
git add src/components/suporte src/pages/SuporteDashboard.tsx
git commit -m "feat(ops): shell do dashboard de suporte (sidebar + página + stubs)"
```

---

### Task 9: Frontend — client tipado `/ops` + painel Visão Geral (health)

**Files:**
- Create: `src/integrations/api/ops.ts`
- Modify (substituir stub): `src/components/suporte/OpsVisaoGeral.tsx`

- [ ] **Step 1: Criar o client tipado com os tipos de health**

Criar `src/integrations/api/ops.ts`:

```typescript
import { api } from './client';

export interface DependenciaStatus { nome: string; ok: boolean; detalhe: string | null; }
export interface HealthOut {
  status: 'ok' | 'degradado';
  versao: string;
  uptime_segundos: number;
  dependencias: DependenciaStatus[];
  fila_profundidade: number | null;
  scheduler_jobs: number | null;
}

export const opsApi = {
  health: () => api.get<HealthOut>('/ops/health'),
};
```

- [ ] **Step 2: Implementar o painel de Visão Geral**

Substituir o conteúdo de `src/components/suporte/OpsVisaoGeral.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { opsApi, type HealthOut } from '@/integrations/api/ops';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export function OpsVisaoGeral() {
  const [health, setHealth] = useState<HealthOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      setHealth(await opsApi.health());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!health) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant={health.status === 'ok' ? 'default' : 'destructive'}>
          {health.status === 'ok' ? 'Sistema saudável' : 'Sistema degradado'}
        </Badge>
        <Button variant="outline" size="sm" onClick={carregar}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Versão</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.versao}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Uptime</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatUptime(health.uptime_segundos)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fila (jobs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.fila_profundidade ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scheduler (jobs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.scheduler_jobs ?? '—'}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Dependências</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {health.dependencias.map((d) => (
            <div key={d.nome} className="flex items-center justify-between border-b border-border/40 py-2 last:border-0">
              <div className="flex items-center gap-2">
                {d.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="font-medium capitalize">{d.nome}</span>
              </div>
              <span className="text-xs text-muted-foreground">{d.detalhe ?? (d.ok ? 'OK' : 'Indisponível')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

> Se `@/components/ui/badge` não existir no projeto, troque o `<Badge>` por um `<span>` com classes equivalentes. Verifique com `ls src/components/ui/badge.tsx` antes.

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 4: Verificação manual**

Subir o backend (`uv run uvicorn app.main:app --reload`) e o front (`npm run dev`), logar como `suporte`, confirmar redirect para `/ops` e o painel Visão Geral mostrando versão/uptime/dependências.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsVisaoGeral.tsx
git commit -m "feat(ops): painel Visão Geral (health)"
```

---

# FASE 2 — Banco de dados + Redis/Filas/Scheduler

### Task 10: Backend — stats de banco

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/services/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_database_tables(client):
    await _register_login(client, "sup4@toriq.test", "suporte")
    r = await client.get("/ops/database/tables")
    assert r.status_code == 200
    body = r.json()
    assert "tabelas" in body and isinstance(body["tabelas"], list)
    # users sempre existe; deve aparecer com contagem >= 0
    nomes = {t["nome"] for t in body["tabelas"]}
    assert "users" in nomes
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py::test_database_tables -v`
Expected: FAIL (404).

- [ ] **Step 3: Schemas de banco**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
class TabelaInfo(BaseModel):
    nome: str
    schema_: str
    linhas: int
    tamanho_bytes: int


class PoolInfo(BaseModel):
    tamanho: int | None = None
    em_uso: int | None = None
    disponiveis: int | None = None
    overflow: int | None = None


class DatabaseOut(BaseModel):
    tabelas: list[TabelaInfo]
    total_tabelas: int
    pool: PoolInfo
```

- [ ] **Step 4: Serviço de banco**

Adicionar em `apps/api/app/services/ops.py`:

```python
from app.core.db import engine

_DB_STATS_SQL = text(
    """
    SELECT schemaname AS schema_, relname AS nome,
           n_live_tup AS linhas,
           pg_total_relation_size(relid) AS tamanho_bytes
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    """
)


async def listar_tabelas(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(_DB_STATS_SQL)).mappings().all()
    return [
        {
            "nome": r["nome"],
            "schema_": r["schema_"],
            "linhas": int(r["linhas"] or 0),
            "tamanho_bytes": int(r["tamanho_bytes"] or 0),
        }
        for r in rows
    ]


def pool_info() -> dict:
    pool = getattr(engine.sync_engine, "pool", None)
    def _safe(attr: str):
        fn = getattr(pool, attr, None)
        try:
            return int(fn()) if callable(fn) else None
        except Exception:
            return None
    return {
        "tamanho": _safe("size"),
        "em_uso": _safe("checkedout"),
        "disponiveis": _safe("checkedin"),
        "overflow": _safe("overflow"),
    }
```

- [ ] **Step 5: Endpoint**

Adicionar em `apps/api/app/api/ops.py` (import do schema no topo e a rota):

```python
from app.schemas.ops import DatabaseOut, HealthOut


@router.get("/database/tables", response_model=DatabaseOut)
async def database_tables(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> DatabaseOut:
    tabelas = await ops_service.listar_tabelas(db)
    return DatabaseOut(
        tabelas=tabelas,
        total_tabelas=len(tabelas),
        pool=ops_service.pool_info(),
    )
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `uv run pytest tests/test_ops.py::test_database_tables -v`
Expected: PASS.

> Nota: nos testes o engine usa `NullPool`, então o `pool` virá com campos `null` — esperado e coberto pelos `Optional` do schema.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/services/ops.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): stats de banco (tabelas, linhas, tamanho, pool)"
```

---

### Task 11: Backend — Redis overview + listagem de chaves + scheduler

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/services/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `tests/test_ops.py`:

```python
async def test_redis_overview_sem_redis(client):
    # Em teste não há REDIS_URL: overview reporta desligado, sem quebrar.
    await _register_login(client, "sup5@toriq.test", "suporte")
    r = await client.get("/ops/redis/overview")
    assert r.status_code == 200
    body = r.json()
    assert body["conectado"] is False


async def test_scheduler_jobs(client):
    await _register_login(client, "sup6@toriq.test", "suporte")
    r = await client.get("/ops/scheduler/jobs")
    assert r.status_code == 200
    assert isinstance(r.json()["jobs"], list)
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py -k "redis_overview or scheduler_jobs" -v`
Expected: FAIL (404).

- [ ] **Step 3: Schemas de Redis/Scheduler**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
class RedisOverviewOut(BaseModel):
    conectado: bool
    memoria_usada: str | None = None
    clientes_conectados: int | None = None
    keyspace_hits: int | None = None
    keyspace_misses: int | None = None
    fila_profundidade: int | None = None
    total_chaves_prefixo: int | None = None


class RedisChave(BaseModel):
    chave: str
    ttl: int  # -1 sem expiração, -2 inexistente


class RedisKeysOut(BaseModel):
    prefixo: str
    chaves: list[RedisChave]
    truncado: bool


class SchedulerJob(BaseModel):
    id: str
    nome: str
    proximo_run: datetime.datetime | None = None


class SchedulerOut(BaseModel):
    rodando: bool
    jobs: list[SchedulerJob]
```

- [ ] **Step 4: Serviço de Redis**

Adicionar em `apps/api/app/services/ops.py`:

```python
async def redis_overview() -> dict:
    client = cache._get_client()
    if client is None:
        return {"conectado": False}
    try:
        info = await client.info()
        depth = await fila_profundidade()
        # Conta chaves do prefixo da app (cap defensivo para não varrer infinito).
        total = 0
        async for _ in client.scan_iter(match=f"{settings.cache_prefix}:*", count=500):
            total += 1
            if total >= 10000:
                break
        return {
            "conectado": True,
            "memoria_usada": info.get("used_memory_human"),
            "clientes_conectados": info.get("connected_clients"),
            "keyspace_hits": info.get("keyspace_hits"),
            "keyspace_misses": info.get("keyspace_misses"),
            "fila_profundidade": depth,
            "total_chaves_prefixo": total,
        }
    except Exception as exc:  # pragma: no cover
        return {"conectado": False, "memoria_usada": None}


async def redis_keys(prefixo: str, limite: int = 200) -> dict:
    client = cache._get_client()
    if client is None:
        return {"prefixo": prefixo, "chaves": [], "truncado": False}
    chaves: list[dict] = []
    truncado = False
    try:
        async for chave in client.scan_iter(match=f"{prefixo}*", count=200):
            if len(chaves) >= limite:
                truncado = True
                break
            ttl = await client.ttl(chave)
            chaves.append({"chave": chave, "ttl": int(ttl)})
    except Exception:  # pragma: no cover
        pass
    return {"prefixo": prefixo, "chaves": chaves, "truncado": truncado}
```

- [ ] **Step 5: Endpoints de Redis e Scheduler**

Adicionar em `apps/api/app/api/ops.py` (ampliar o import de schemas e adicionar as rotas):

```python
from app.schemas.ops import (
    DatabaseOut, HealthOut, RedisKeysOut, RedisOverviewOut, SchedulerOut,
)
from app.core.config import settings


@router.get("/redis/overview", response_model=RedisOverviewOut)
async def redis_overview(_: User = Depends(require_ops)) -> RedisOverviewOut:
    return RedisOverviewOut(**await ops_service.redis_overview())


@router.get("/redis/keys", response_model=RedisKeysOut)
async def redis_keys(
    prefix: str | None = None,
    _: User = Depends(require_ops),
) -> RedisKeysOut:
    prefixo = prefix or f"{settings.cache_prefix}:"
    return RedisKeysOut(**await ops_service.redis_keys(prefixo))


@router.get("/scheduler/jobs", response_model=SchedulerOut)
async def scheduler_jobs(
    request: Request,
    _: User = Depends(require_ops),
) -> SchedulerOut:
    scheduler = getattr(request.app.state, "scheduler", None)
    if scheduler is None:
        return SchedulerOut(rodando=False, jobs=[])
    jobs = [
        {"id": j.id, "nome": j.name or j.id, "proximo_run": j.next_run_time}
        for j in scheduler.get_jobs()
    ]
    return SchedulerOut(rodando=bool(scheduler.running), jobs=jobs)
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `uv run pytest tests/test_ops.py -k "redis or scheduler" -v`
Expected: PASS.

> Nota: no `client` de teste o `lifespan` não roda (ASGITransport não dispara startup por padrão), então `request.app.state.scheduler` pode não existir — o endpoint trata `None` e devolve `rodando=False, jobs=[]`. O teste só exige `jobs` ser lista.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/services/ops.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): redis overview/keys + scheduler jobs"
```

---

### Task 12: Frontend — painel Banco de Dados

**Files:**
- Modify: `src/integrations/api/ops.ts`, `src/components/suporte/OpsBancoDados.tsx`

- [ ] **Step 1: Tipos + método no client**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export interface TabelaInfo { nome: string; schema_: string; linhas: number; tamanho_bytes: number; }
export interface PoolInfo { tamanho: number | null; em_uso: number | null; disponiveis: number | null; overflow: number | null; }
export interface DatabaseOut { tabelas: TabelaInfo[]; total_tabelas: number; pool: PoolInfo; }
```

E dentro do objeto `opsApi`:

```typescript
  database: () => api.get<DatabaseOut>('/ops/database/tables'),
```

- [ ] **Step 2: Implementar o painel**

Substituir `src/components/suporte/OpsBancoDados.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type DatabaseOut } from '@/integrations/api/ops';

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = b / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export function OpsBancoDados() {
  const [data, setData] = useState<DatabaseOut | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    opsApi.database().then(setData).catch((e) =>
      setErro(e instanceof Error ? e.message : 'Falha ao carregar'));
  }, []);

  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!data) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tabelas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.total_tabelas}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pool em uso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.em_uso ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pool disponíveis</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.disponiveis ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overflow</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.overflow ?? '—'}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Tabelas (por nº de linhas)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabela</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead className="text-right">Linhas</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tabelas.map((t) => (
                <TableRow key={`${t.schema_}.${t.nome}`}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{t.schema_}</TableCell>
                  <TableCell className="text-right">{t.linhas.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{fmtBytes(t.tamanho_bytes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` (Expected: sem erros)

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsBancoDados.tsx
git commit -m "feat(ops): painel Banco de Dados"
```

---

### Task 13: Frontend — painel Redis & Filas

**Files:**
- Modify: `src/integrations/api/ops.ts`, `src/components/suporte/OpsRedisFilas.tsx`

- [ ] **Step 1: Tipos + métodos no client**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export interface RedisOverviewOut {
  conectado: boolean; memoria_usada: string | null; clientes_conectados: number | null;
  keyspace_hits: number | null; keyspace_misses: number | null;
  fila_profundidade: number | null; total_chaves_prefixo: number | null;
}
export interface RedisChave { chave: string; ttl: number; }
export interface RedisKeysOut { prefixo: string; chaves: RedisChave[]; truncado: boolean; }
export interface SchedulerJob { id: string; nome: string; proximo_run: string | null; }
export interface SchedulerOut { rodando: boolean; jobs: SchedulerJob[]; }
```

E em `opsApi`:

```typescript
  redisOverview: () => api.get<RedisOverviewOut>('/ops/redis/overview'),
  redisKeys: (prefix?: string) => api.get<RedisKeysOut>(`/ops/redis/keys${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`),
  scheduler: () => api.get<SchedulerOut>('/ops/scheduler/jobs'),
```

- [ ] **Step 2: Implementar o painel**

Substituir `src/components/suporte/OpsRedisFilas.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type RedisOverviewOut, type SchedulerOut, type RedisKeysOut } from '@/integrations/api/ops';

export function OpsRedisFilas() {
  const [ov, setOv] = useState<RedisOverviewOut | null>(null);
  const [sched, setSched] = useState<SchedulerOut | null>(null);
  const [keys, setKeys] = useState<RedisKeysOut | null>(null);

  useEffect(() => {
    opsApi.redisOverview().then(setOv).catch(() => setOv({ conectado: false } as RedisOverviewOut));
    opsApi.scheduler().then(setSched).catch(() => setSched({ rodando: false, jobs: [] }));
    opsApi.redisKeys().then(setKeys).catch(() => setKeys(null));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Redis</CardTitle></CardHeader>
        <CardContent>
          {ov && !ov.conectado ? (
            <p className="text-sm text-muted-foreground">Redis desligado (sem REDIS_URL). Cache recalcula e a fila roda inline.</p>
          ) : ov ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Memória" value={ov.memoria_usada ?? '—'} />
              <Stat label="Clientes" value={String(ov.clientes_conectados ?? '—')} />
              <Stat label="Hits" value={String(ov.keyspace_hits ?? '—')} />
              <Stat label="Misses" value={String(ov.keyspace_misses ?? '—')} />
              <Stat label="Fila" value={String(ov.fila_profundidade ?? '—')} />
              <Stat label="Chaves" value={String(ov.total_chaves_prefixo ?? '—')} />
            </div>
          ) : <div className="animate-pulse text-muted-foreground">Carregando...</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Scheduler (jobs agendados)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Próximo run</TableHead></TableRow></TableHeader>
            <TableBody>
              {(sched?.jobs ?? []).map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.proximo_run ? new Date(j.proximo_run).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {sched && sched.jobs.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-muted-foreground">Nenhum job ativo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {keys && keys.chaves.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Chaves de cache ({keys.prefixo})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Chave</TableHead><TableHead className="text-right">TTL (s)</TableHead></TableRow></TableHeader>
              <TableBody>
                {keys.chaves.map((k) => (
                  <TableRow key={k.chave}>
                    <TableCell className="font-mono text-xs">{k.chave}</TableCell>
                    <TableCell className="text-right">{k.ttl === -1 ? '∞' : k.ttl}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {keys.truncado && <p className="mt-2 text-xs text-muted-foreground">Lista truncada (limite de exibição).</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` (Expected: sem erros)

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsRedisFilas.tsx
git commit -m "feat(ops): painel Redis, Filas e Scheduler"
```

---

# FASE 3 — Tickets cross-tenant

### Task 14: Backend — tickets globais + métricas

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/services/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_tickets_metrics_estrutura(client):
    await _register_login(client, "sup7@toriq.test", "suporte")
    r = await client.get("/ops/tickets/metrics")
    assert r.status_code == 200
    body = r.json()
    assert "por_status" in body and "por_prioridade" in body
    assert "abertos" in body and "sla_violados" in body


async def test_tickets_lista(client):
    await _register_login(client, "sup8@toriq.test", "suporte")
    r = await client.get("/ops/tickets?limit=10")
    assert r.status_code == 200
    assert isinstance(r.json()["tickets"], list)
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py -k tickets -v`
Expected: FAIL (404).

- [ ] **Step 3: Schemas de tickets**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
class TicketResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    titulo: str
    status: str
    prioridade: str
    categoria: str | None = None
    empresa_solicitante_id: uuid.UUID | None = None
    solicitante_nome: str
    created_at: datetime.datetime | None = None
    resolvido_em: datetime.datetime | None = None


class TicketsListOut(BaseModel):
    tickets: list[TicketResumo]
    total: int


class TicketsMetricsOut(BaseModel):
    abertos: int
    sla_violados: int
    por_status: dict[str, int]
    por_prioridade: dict[str, int]
```

- [ ] **Step 4: Serviço de tickets**

Adicionar em `apps/api/app/services/ops.py`:

```python
import datetime as _dt

from sqlalchemy import func, select

from app.models.generated import TicketsSuporte

# SLA padrão (horas) por prioridade para tickets ainda não resolvidos.
# v1 usa thresholds fixos; integração com tickets_sla_config fica para fase 2.
_SLA_HORAS = {"critica": 4, "alta": 24, "media": 72, "baixa": 168}
_STATUS_ABERTOS = ("aberto", "em_andamento", "aguardando_resposta")


async def listar_tickets(
    db: AsyncSession, status: str | None, prioridade: str | None, limite: int
) -> list[TicketsSuporte]:
    stmt = select(TicketsSuporte).order_by(TicketsSuporte.created_at.desc())
    if status:
        stmt = stmt.where(TicketsSuporte.status == status)
    if prioridade:
        stmt = stmt.where(TicketsSuporte.prioridade == prioridade)
    stmt = stmt.limit(limite)
    return list((await db.scalars(stmt)).all())


async def tickets_metrics(db: AsyncSession) -> dict:
    por_status = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(TicketsSuporte.status, func.count()).group_by(TicketsSuporte.status)
            )
        ).all()
    }
    por_prioridade = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(TicketsSuporte.prioridade, func.count()).group_by(TicketsSuporte.prioridade)
            )
        ).all()
    }
    abertos = sum(por_status.get(s, 0) for s in _STATUS_ABERTOS)

    # SLA violados: tickets abertos cuja idade ultrapassa o limite da prioridade.
    agora = _dt.datetime.now(tz=_dt.timezone.utc)
    abertos_rows = (
        await db.execute(
            select(TicketsSuporte.prioridade, TicketsSuporte.created_at).where(
                TicketsSuporte.status.in_(_STATUS_ABERTOS)
            )
        )
    ).all()
    sla_violados = 0
    for prioridade, created_at in abertos_rows:
        if created_at is None:
            continue
        limite_h = _SLA_HORAS.get(prioridade, 72)
        if (agora - created_at) > _dt.timedelta(hours=limite_h):
            sla_violados += 1

    return {
        "abertos": abertos,
        "sla_violados": sla_violados,
        "por_status": por_status,
        "por_prioridade": por_prioridade,
    }
```

- [ ] **Step 5: Endpoints**

Adicionar em `apps/api/app/api/ops.py` (ampliar import e adicionar rotas):

```python
from app.schemas.ops import (
    DatabaseOut, HealthOut, RedisKeysOut, RedisOverviewOut, SchedulerOut,
    TicketsListOut, TicketsMetricsOut, TicketResumo,
)


@router.get("/tickets", response_model=TicketsListOut)
async def tickets(
    status: str | None = None,
    prioridade: str | None = None,
    limit: int = 100,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsListOut:
    rows = await ops_service.listar_tickets(db, status, prioridade, min(limit, 500))
    return TicketsListOut(
        tickets=[TicketResumo.model_validate(t) for t in rows],
        total=len(rows),
    )


@router.get("/tickets/metrics", response_model=TicketsMetricsOut)
async def tickets_metrics(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsMetricsOut:
    return TicketsMetricsOut(**await ops_service.tickets_metrics(db))
```

> Atenção à ordem: `/tickets/metrics` precisa ser registrada (no arquivo) ANTES de qualquer rota `/tickets/{id}` — aqui não há rota com path param, então a ordem entre as duas acima é indiferente.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `uv run pytest tests/test_ops.py -k tickets -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/services/ops.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): tickets cross-tenant + métricas"
```

---

### Task 15: Frontend — painel Tickets

**Files:**
- Modify: `src/integrations/api/ops.ts`, `src/components/suporte/OpsTickets.tsx`

- [ ] **Step 1: Tipos + métodos**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export interface TicketResumo {
  id: string; titulo: string; status: string; prioridade: string;
  categoria: string | null; empresa_solicitante_id: string | null;
  solicitante_nome: string; created_at: string | null; resolvido_em: string | null;
}
export interface TicketsListOut { tickets: TicketResumo[]; total: number; }
export interface TicketsMetricsOut {
  abertos: number; sla_violados: number;
  por_status: Record<string, number>; por_prioridade: Record<string, number>;
}
```

E em `opsApi`:

```typescript
  tickets: (status?: string, prioridade?: string) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (prioridade) qs.set('prioridade', prioridade);
    const s = qs.toString();
    return api.get<TicketsListOut>(`/ops/tickets${s ? `?${s}` : ''}`);
  },
  ticketsMetrics: () => api.get<TicketsMetricsOut>('/ops/tickets/metrics'),
```

- [ ] **Step 2: Implementar o painel**

Substituir `src/components/suporte/OpsTickets.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type TicketsListOut, type TicketsMetricsOut } from '@/integrations/api/ops';

export function OpsTickets() {
  const [metrics, setMetrics] = useState<TicketsMetricsOut | null>(null);
  const [lista, setLista] = useState<TicketsListOut | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    opsApi.ticketsMetrics().then(setMetrics).catch((e) => setErro(String(e)));
    opsApi.tickets().then(setLista).catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <div className="text-destructive">{erro}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Abertos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{metrics?.abertos ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">SLA violados</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{metrics?.sla_violados ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Críticos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{metrics?.por_prioridade?.critica ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resolvidos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{metrics?.por_status?.resolvido ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tickets recentes (todas as empresas)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead><TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead><TableHead>Solicitante</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lista?.tickets ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.titulo}</TableCell>
                  <TableCell>{t.status}</TableCell>
                  <TableCell>{t.prioridade}</TableCell>
                  <TableCell className="text-muted-foreground">{t.solicitante_nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {lista && lista.tickets.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum ticket.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` (Expected: sem erros)

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsTickets.tsx
git commit -m "feat(ops): painel Tickets global"
```

---

# FASE 4 — Usuários + auditoria + impersonação

### Task 16: Backend — modelo + migração `ops_audit_log`

**Files:**
- Create: `apps/api/app/models/ops_audit.py`, `apps/api/migrations/versions/a1d2e3f4a5b6_ops_audit_log.py`

- [ ] **Step 1: Criar o modelo**

Criar `apps/api/app/models/ops_audit.py`:

```python
"""Log de auditoria das ações sensíveis do dashboard Ops/Suporte."""
import datetime
import uuid

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class OpsAuditLog(Base):
    __tablename__ = "ops_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    actor_nome: Mapped[str | None] = mapped_column(Text, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False, index=True)
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
```

- [ ] **Step 2: Garantir que o modelo é registrado em Base.metadata**

Verificar `apps/api/app/models/__init__.py`. Se ele importar submódulos explicitamente, adicionar:

```python
from app.models import ops_audit  # noqa: F401
```

Run: `uv run python -c "from app.models.ops_audit import OpsAuditLog; print(OpsAuditLog.__tablename__)"`
Expected: imprime `ops_audit_log`.

- [ ] **Step 3: Criar a migração**

Criar `apps/api/migrations/versions/a1d2e3f4a5b6_ops_audit_log.py`:

```python
"""Tabela ops_audit_log (auditoria do dashboard de suporte). Aditiva.

Revision ID: a1d2e3f4a5b6
Revises: f0c1a2b3c4d5
Create Date: 2026-06-14 17:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1d2e3f4a5b6"
down_revision: Union[str, None] = "f0c1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ops_audit_log",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("actor_nome", sa.Text(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_user_id", sa.Uuid(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="ops_audit_log_pkey"),
    )
    op.create_index("idx_ops_audit_actor", "ops_audit_log", ["actor_id"])
    op.create_index("idx_ops_audit_action", "ops_audit_log", ["action"])
    op.create_index("idx_ops_audit_created", "ops_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_ops_audit_created", table_name="ops_audit_log")
    op.drop_index("idx_ops_audit_action", table_name="ops_audit_log")
    op.drop_index("idx_ops_audit_actor", table_name="ops_audit_log")
    op.drop_table("ops_audit_log")
```

- [ ] **Step 4: Aplicar a migração**

Run: `uv run alembic upgrade head` (e no banco de teste, conforme convenção)
Expected: cria `ops_audit_log`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/models/ops_audit.py apps/api/app/models/__init__.py apps/api/migrations/versions/a1d2e3f4a5b6_ops_audit_log.py
git commit -m "feat(ops): tabela e modelo ops_audit_log"
```

---

### Task 17: Backend — usuários globais (listar/ver/editar/reset/role/empresa) + auditoria

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/services/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `tests/test_ops.py`:

```python
async def test_ops_lista_usuarios_global(client):
    # cria um alvo de outra "empresa" (sem empresa) e confere que suporte o vê.
    await _register_login(client, "alvo@toriq.test", "cliente_final")
    await client.post("/auth/logout")
    await _register_login(client, "sup9@toriq.test", "suporte")
    r = await client.get("/ops/users?q=alvo")
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()["users"]}
    assert "alvo@toriq.test" in emails


async def test_ops_edita_usuario_e_audita(client):
    await _register_login(client, "alvo2@toriq.test", "cliente_final")
    me = (await client.get("/auth/me")).json()
    alvo_id = me["user"]["id"]
    await client.post("/auth/logout")

    await _register_login(client, "sup10@toriq.test", "suporte")
    r = await client.patch(f"/ops/users/{alvo_id}", json={"nome": "Nome Editado"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Nome Editado"

    # a edição gerou registro de auditoria
    audit = (await client.get("/ops/audit")).json()
    assert any(a["action"] == "update_user" for a in audit["registros"])


async def test_suporte_nao_promove_para_admin(client):
    await _register_login(client, "alvo3@toriq.test", "cliente_final")
    alvo_id = (await client.get("/auth/me")).json()["user"]["id"]
    await client.post("/auth/logout")

    await _register_login(client, "sup11@toriq.test", "suporte")
    r = await client.patch(f"/ops/users/{alvo_id}/role", json={"role": "admin_vertical"})
    assert r.status_code == 403
```

> `/ops/audit` chega na Task 19; o teste `test_ops_edita_usuario_e_audita` só passa após ela. Marque-o como esperado-a-passar ao final da Task 19 (ou rode-o nesse momento).

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py -k "ops_lista_usuarios or edita_usuario or nao_promove" -v`
Expected: FAIL.

- [ ] **Step 3: Schemas de usuários**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
from app.models.user import UserRole


class OpsUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None = None
    ativo: bool
    created_at: datetime.datetime | None = None


class OpsUsersListOut(BaseModel):
    users: list[OpsUserOut]
    total: int


class OpsUserUpdateIn(BaseModel):
    nome: str | None = None
    email: str | None = None
    ativo: bool | None = None


class OpsRoleUpdateIn(BaseModel):
    role: UserRole


class OpsEmpresaUpdateIn(BaseModel):
    empresa_id: uuid.UUID | None = None


class OpsResetSenhaOut(BaseModel):
    ok: bool
    temp_password: str | None = None
```

- [ ] **Step 4: Serviço — auditoria + helpers de usuário**

Adicionar em `apps/api/app/services/ops.py`:

```python
from fastapi import HTTPException, status

from app.models.ops_audit import OpsAuditLog
from app.models.user import User, UserRole
from app.models.generated import Profiles


async def registrar_auditoria(
    db: AsyncSession, actor: User, action: str,
    target_user_id=None, details: dict | None = None, ip: str | None = None,
) -> None:
    db.add(OpsAuditLog(
        actor_id=actor.id,
        actor_nome=getattr(actor, "nome", None),
        action=action,
        target_user_id=target_user_id,
        details=details,
        ip=ip,
    ))


async def get_alvo(db: AsyncSession, actor: User, user_id) -> User:
    """Carrega o usuário-alvo. suporte não pode tocar um admin_vertical
    (anti-neutralização); admin_vertical pode tudo."""
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
    if actor.role == UserRole.suporte and target.role == UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "suporte não pode modificar admin_vertical")
    return target


async def _sync_profile(db: AsyncSession, target: User) -> None:
    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.nome = target.nome
        profile.role = target.role.value
        profile.ativo = target.ativo
        profile.empresa_id = target.empresa_id
```

- [ ] **Step 5: Endpoints de usuários**

Adicionar em `apps/api/app/api/ops.py` (ampliar imports e adicionar rotas). No topo:

```python
from sqlalchemy import or_, select
from app.models.user import User as UserModel, UserRole
from app.models.generated import Profiles
from app.core.security import hash_password
from app.schemas.ops import (
    OpsEmpresaUpdateIn, OpsResetSenhaOut, OpsRoleUpdateIn, OpsUserOut,
    OpsUsersListOut, OpsUserUpdateIn,
)
```

E as rotas:

```python
@router.get("/users", response_model=OpsUsersListOut)
async def list_users(
    q: str | None = None,
    limit: int = 100,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUsersListOut:
    stmt = select(UserModel)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(
            func.lower(UserModel.email).like(like),
            func.lower(UserModel.nome).like(like),
        ))
    stmt = stmt.limit(min(limit, 500))
    rows = list((await db.scalars(stmt)).all())
    return OpsUsersListOut(
        users=[OpsUserOut.model_validate(u) for u in rows], total=len(rows)
    )


@router.get("/users/{user_id}", response_model=OpsUserOut)
async def get_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}", response_model=OpsUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: OpsUserUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    if payload.email is not None and payload.email != target.email:
        existe = await db.scalar(select(UserModel).where(UserModel.email == payload.email))
        if existe is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "email já cadastrado")
        target.email = payload.email
    if payload.nome is not None:
        target.nome = payload.nome
    if payload.ativo is not None:
        target.ativo = payload.ativo
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_user", target_user_id=target.id,
        details=payload.model_dump(exclude_none=True),
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}/role", response_model=OpsUserOut)
async def update_role(
    user_id: uuid.UUID,
    payload: OpsRoleUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    # Só admin_vertical promove para admin_vertical (anti-escalonamento).
    if payload.role == UserRole.admin_vertical and actor.role != UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "apenas admin_vertical promove para admin_vertical")
    antigo = target.role.value
    target.role = payload.role
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_role", target_user_id=target.id,
        details={"de": antigo, "para": payload.role.value},
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}/empresa", response_model=OpsUserOut)
async def update_empresa(
    user_id: uuid.UUID,
    payload: OpsEmpresaUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    antigo = str(target.empresa_id) if target.empresa_id else None
    target.empresa_id = payload.empresa_id
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_empresa", target_user_id=target.id,
        details={"de": antigo, "para": str(payload.empresa_id) if payload.empresa_id else None},
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.post("/users/{user_id}/reset-senha", response_model=OpsResetSenhaOut)
async def reset_senha(
    user_id: uuid.UUID,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsResetSenhaOut:
    import secrets, string
    target = await ops_service.get_alvo(db, actor, user_id)
    alfabeto = string.ascii_letters + string.digits
    temp = "".join(secrets.choice(alfabeto) for _ in range(16))
    target.senha_hash = hash_password(temp)
    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.senha_alterada = False
    await ops_service.registrar_auditoria(
        db, actor, "reset_senha", target_user_id=target.id,
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsResetSenhaOut(ok=True, temp_password=temp)
```

> Garanta que `func`, `uuid` e `status`/`HTTPException` estão importados no topo de `ops.py` (adicionar `from fastapi import APIRouter, Depends, HTTPException, Request, status`, `import uuid`, `from sqlalchemy import func, or_, select`).

- [ ] **Step 6: Rodar e confirmar (exceto o teste de auditoria, que depende da Task 19)**

Run: `uv run pytest tests/test_ops.py -k "ops_lista_usuarios or nao_promove" -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/services/ops.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): gestão global de usuários (editar/role/empresa/reset) auditada"
```

---

### Task 18: Backend — impersonação (token `imp_by`) + parar impersonação

**Files:**
- Modify: `apps/api/app/core/tokens.py`, `apps/api/app/api/auth.py:31-45,127-145`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_impersonar_e_parar(client):
    # alvo a impersonar
    await _register_login(client, "alvoimp@toriq.test", "cliente_final")
    alvo_id = (await client.get("/auth/me")).json()["user"]["id"]
    await client.post("/auth/logout")

    # operador suporte impersona
    await _register_login(client, "supimp@toriq.test", "suporte")
    r = await client.post(f"/ops/users/{alvo_id}/impersonate")
    assert r.status_code == 200
    # agora a sessão é do alvo
    me = (await client.get("/auth/me")).json()
    assert me["user"]["email"] == "alvoimp@toriq.test"

    # parar impersonação volta para o operador
    r2 = await client.post("/ops/stop-impersonate")
    assert r2.status_code == 200
    me2 = (await client.get("/auth/me")).json()
    assert me2["user"]["email"] == "supimp@toriq.test"


async def test_nao_impersona_admin(client):
    await _register_login(client, "adminx@toriq.test", "admin_vertical")
    admin_id = (await client.get("/auth/me")).json()["user"]["id"]
    await client.post("/auth/logout")

    await _register_login(client, "supimp2@toriq.test", "suporte")
    r = await client.post(f"/ops/users/{admin_id}/impersonate")
    assert r.status_code == 403
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py -k "impersonar or impersona_admin" -v`
Expected: FAIL (404).

- [ ] **Step 3: `create_token` aceita `imp_by`**

Em `apps/api/app/core/tokens.py`, alterar `create_token`:

```python
def create_token(
    *,
    subject: str,
    token_type: TokenType,
    empresa_id: str | None,
    role: str,
    imp_by: str | None = None,
) -> str:
    ttl = (
        settings.jwt_access_ttl_seconds
        if token_type == "access"
        else settings.jwt_refresh_ttl_seconds
    )
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "empresa_id": empresa_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    if imp_by is not None:
        payload["imp_by"] = imp_by
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
```

- [ ] **Step 4: `_set_auth_cookies` e `refresh` propagam `imp_by`**

Em `apps/api/app/api/auth.py`, alterar `_set_auth_cookies`:

```python
def _set_auth_cookies(response: Response, user: User, imp_by: str | None = None) -> None:
    empresa_id = str(user.empresa_id) if user.empresa_id else None
    access = create_token(
        subject=str(user.id), token_type="access",
        empresa_id=empresa_id, role=user.role.value, imp_by=imp_by,
    )
    refresh = create_token(
        subject=str(user.id), token_type="refresh",
        empresa_id=empresa_id, role=user.role.value, imp_by=imp_by,
    )
    common = {"httponly": True, "secure": settings.cookie_secure, "samesite": "lax"}
    response.set_cookie("access_token", access,
                        max_age=settings.jwt_access_ttl_seconds, **common)
    response.set_cookie("refresh_token", refresh,
                        max_age=settings.jwt_refresh_ttl_seconds, path="/auth", **common)
```

E no endpoint `refresh`, preservar `imp_by` do token antigo (linha ~144, antes de `_set_auth_cookies(response, user)`):

```python
    _set_auth_cookies(response, user, imp_by=payload.get("imp_by"))
```

- [ ] **Step 5: Endpoints de impersonação**

Adicionar em `apps/api/app/api/ops.py`:

```python
from fastapi import Cookie, Response
from app.core.tokens import TokenError, decode_token
from app.api.auth import _set_auth_cookies


@router.post("/users/{user_id}/impersonate", response_model=OpsUserOut)
async def impersonate(
    user_id: uuid.UUID,
    request: Request,
    response: Response,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await db.get(UserModel, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuário não encontrado")
    if target.role == UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "não é permitido impersonar admin_vertical")
    if not target.ativo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "usuário inativo")
    _set_auth_cookies(response, target, imp_by=str(actor.id))
    await ops_service.registrar_auditoria(
        db, actor, "impersonate", target_user_id=target.id,
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsUserOut.model_validate(target)


@router.post("/stop-impersonate", response_model=OpsUserOut)
async def stop_impersonate(
    request: Request,
    response: Response,
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    # NÃO usa require_ops: a sessão atual é a do ALVO impersonado. A autoridade
    # vem da claim imp_by (id do operador que iniciou a impersonação).
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sem sessão")
    try:
        payload = decode_token(access_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token inválido")
    operador_id = payload.get("imp_by")
    if not operador_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "não há impersonação ativa")
    operador = await db.get(UserModel, uuid.UUID(operador_id))
    if operador is None or not operador.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "operador inválido")
    _set_auth_cookies(response, operador)
    await ops_service.registrar_auditoria(
        db, operador, "stop_impersonate",
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsUserOut.model_validate(operador)
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `uv run pytest tests/test_ops.py -k "impersonar or impersona_admin" -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/core/tokens.py apps/api/app/api/auth.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): impersonação auditada via claim imp_by + stop-impersonate"
```

---

### Task 19: Backend — `GET /ops/audit`

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/services/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py` (o `test_ops_edita_usuario_e_audita` da Task 17)

- [ ] **Step 1: Schema**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
class AuditRegistro(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_id: uuid.UUID
    actor_nome: str | None = None
    action: str
    target_user_id: uuid.UUID | None = None
    details: dict | None = None
    ip: str | None = None
    created_at: datetime.datetime


class AuditListOut(BaseModel):
    registros: list[AuditRegistro]
    total: int
```

- [ ] **Step 2: Serviço**

Adicionar em `apps/api/app/services/ops.py`:

```python
async def listar_auditoria(db: AsyncSession, limite: int = 200) -> list[OpsAuditLog]:
    stmt = select(OpsAuditLog).order_by(OpsAuditLog.created_at.desc()).limit(limite)
    return list((await db.scalars(stmt)).all())
```

- [ ] **Step 3: Endpoint**

Adicionar em `apps/api/app/api/ops.py` (ampliar import e a rota):

```python
from app.schemas.ops import AuditListOut, AuditRegistro


@router.get("/audit", response_model=AuditListOut)
async def audit(
    limit: int = 200,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> AuditListOut:
    rows = await ops_service.listar_auditoria(db, min(limit, 1000))
    return AuditListOut(
        registros=[AuditRegistro.model_validate(r) for r in rows], total=len(rows)
    )
```

- [ ] **Step 4: Rodar a suíte completa de ops**

Run: `uv run pytest tests/test_ops.py -v`
Expected: PASS — incluindo `test_ops_edita_usuario_e_audita`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/services/ops.py apps/api/app/api/ops.py
git commit -m "feat(ops): endpoint de listagem de auditoria"
```

---

### Task 20: Frontend — painel Usuários (busca, editar, reset, role/empresa, impersonar)

**Files:**
- Modify: `src/integrations/api/ops.ts`, `src/components/suporte/OpsUsuarios.tsx`, `src/hooks/useAuth.tsx` (expor `reloadSession`)

- [ ] **Step 1: Tipos + métodos no client**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export type Role = 'admin_vertical' | 'cliente_torq' | 'cliente_final' | 'empresa_parceira' | 'instrutor' | 'suporte';
export interface OpsUser {
  id: string; email: string; nome: string; role: Role;
  empresa_id: string | null; ativo: boolean; created_at: string | null;
}
export interface OpsUsersListOut { users: OpsUser[]; total: number; }
export interface OpsResetSenhaOut { ok: boolean; temp_password: string | null; }
```

E em `opsApi`:

```typescript
  users: (q?: string) => api.get<OpsUsersListOut>(`/ops/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  updateUser: (id: string, body: { nome?: string; email?: string; ativo?: boolean }) =>
    api.patch<OpsUser>(`/ops/users/${id}`, body),
  updateRole: (id: string, role: Role) => api.patch<OpsUser>(`/ops/users/${id}/role`, { role }),
  resetSenha: (id: string) => api.post<OpsResetSenhaOut>(`/ops/users/${id}/reset-senha`),
  impersonate: (id: string) => api.post<OpsUser>(`/ops/users/${id}/impersonate`),
  stopImpersonate: () => api.post<OpsUser>('/ops/stop-impersonate'),
```

- [ ] **Step 2: Implementar o painel**

Substituir `src/components/suporte/OpsUsuarios.tsx`:

```tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { opsApi, type OpsUser } from '@/integrations/api/ops';
import { Search, KeyRound, UserCog, LogIn } from 'lucide-react';

export function OpsUsuarios() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<OpsUser[]>([]);
  const [editando, setEditando] = useState<OpsUser | null>(null);
  const [nome, setNome] = useState('');

  const buscar = async () => {
    try { setUsers((await opsApi.users(q)).users); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na busca'); }
  };

  const abrirEdicao = (u: OpsUser) => { setEditando(u); setNome(u.nome); };

  const salvar = async () => {
    if (!editando) return;
    try {
      const atualizado = await opsApi.updateUser(editando.id, { nome });
      setUsers((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u)));
      setEditando(null);
      toast.success('Usuário atualizado.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar'); }
  };

  const resetar = async (u: OpsUser) => {
    try {
      const r = await opsApi.resetSenha(u.id);
      toast.success(r.temp_password ? `Senha temporária: ${r.temp_password}` : 'Senha resetada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha no reset'); }
  };

  const impersonar = async (u: OpsUser) => {
    try {
      await opsApi.impersonate(u.id);
      localStorage.setItem('ops_impersonando', JSON.stringify({ nome: u.nome, email: u.email }));
      toast.success(`Impersonando ${u.nome}. Recarregando...`);
      window.location.href = '/dashboard';
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao impersonar'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Buscar por nome ou email..." value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }} />
        <Button onClick={buscar}><Search className="mr-2 h-4 w-4" />Buscar</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Email</TableHead>
                <TableHead>Role</TableHead><TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.ativo ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)} title="Editar"><UserCog className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resetar(u)} title="Resetar senha"><KeyRound className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => impersonar(u)} title="Impersonar"><LogIn className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Busque para listar usuários.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ops-nome">Nome</Label>
            <Input id="ops-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

> Decisão de UX (impersonação): após `impersonate`, a sessão (cookie) já é a do alvo. Guardamos um marcador em `localStorage` (`ops_impersonando`) e redirecionamos para `/dashboard` via `window.location.href` (reload completo recarrega o `useAuth` com a nova sessão). O banner de "sair" vem na próxima etapa.

**Decisão para o implementador (escolha de design):** o reset de senha hoje exibe a senha temporária num `toast`. Isso é prático mas expõe a senha na tela. Avalie a alternativa de copiar para a área de transferência e exibir num diálogo com aviso. Implemente a função `resetar()` conforme a política de segurança que preferir (toast simples vs. diálogo+clipboard) — é uma decisão de produto, não há resposta única.

- [ ] **Step 3: Build + commit**

Run: `npm run build` (Expected: sem erros)

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsUsuarios.tsx
git commit -m "feat(ops): painel Usuários (busca, editar, reset, impersonar)"
```

---

### Task 21: Frontend — banner de impersonação global + painel Auditoria

**Files:**
- Create: `src/components/suporte/ImpersonationBanner.tsx`
- Modify: `src/App.tsx` (montar o banner), `src/integrations/api/ops.ts`, `src/components/suporte/OpsAuditoria.tsx`

- [ ] **Step 1: Criar o banner**

Criar `src/components/suporte/ImpersonationBanner.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { opsApi } from '@/integrations/api/ops';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const [info, setInfo] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('ops_impersonando');
    if (raw) { try { setInfo(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  if (!info) return null;

  const sair = async () => {
    try {
      await opsApi.stopImpersonate();
      localStorage.removeItem('ops_impersonando');
      toast.success('Impersonação encerrada.');
      window.location.href = '/ops';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao encerrar');
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <span>Você está impersonando <strong>{info.nome}</strong> ({info.email}).</span>
      <button onClick={sair} className="rounded bg-white/20 px-3 py-1 font-medium hover:bg-white/30">
        Sair da impersonação
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Montar o banner globalmente**

Em `src/App.tsx`, importar e renderizar dentro do `<BrowserRouter>`/`<AuthProvider>`, logo após `<FloatingSupportWidget />`:

```tsx
import { ImpersonationBanner } from "./components/suporte/ImpersonationBanner";
```

```tsx
          <FloatingSupportWidget />
          <ImpersonationBanner />
```

- [ ] **Step 3: Tipos + método de auditoria no client**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export interface AuditRegistro {
  id: string; actor_id: string; actor_nome: string | null; action: string;
  target_user_id: string | null; details: Record<string, unknown> | null;
  ip: string | null; created_at: string;
}
export interface AuditListOut { registros: AuditRegistro[]; total: number; }
```

E em `opsApi`:

```typescript
  audit: () => api.get<AuditListOut>('/ops/audit'),
```

- [ ] **Step 4: Implementar o painel de Auditoria**

Substituir `src/components/suporte/OpsAuditoria.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type AuditRegistro } from '@/integrations/api/ops';

export function OpsAuditoria() {
  const [registros, setRegistros] = useState<AuditRegistro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    opsApi.audit().then((r) => setRegistros(r.registros)).catch((e) =>
      setErro(e instanceof Error ? e.message : 'Falha ao carregar'));
  }, []);

  if (erro) return <div className="text-destructive">{erro}</div>;

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead><TableHead>Operador</TableHead>
              <TableHead>Ação</TableHead><TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead><TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                <TableCell>{r.actor_nome ?? r.actor_id}</TableCell>
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell className="text-muted-foreground">{r.target_user_id ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{r.details ? JSON.stringify(r.details) : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{r.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Sem registros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Build + verificação manual**

Run: `npm run build` (Expected: sem erros)
Manual: impersonar um usuário → banner vermelho aparece no topo em qualquer tela → "Sair da impersonação" volta para `/ops` como operador. Conferir o registro em Auditoria.

- [ ] **Step 6: Commit**

```bash
git add src/components/suporte/ImpersonationBanner.tsx src/App.tsx src/integrations/api/ops.ts src/components/suporte/OpsAuditoria.tsx
git commit -m "feat(ops): banner de impersonação + painel Auditoria"
```

---

# FASE 5 — Sentry (link-out)

### Task 22: Backend — `GET /ops/sentry`

**Files:**
- Modify: `apps/api/app/schemas/ops.py`, `apps/api/app/api/ops.py`
- Test: `apps/api/tests/test_ops.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `tests/test_ops.py`:

```python
async def test_sentry_status(client):
    await _register_login(client, "supsentry@toriq.test", "suporte")
    r = await client.get("/ops/sentry")
    assert r.status_code == 200
    body = r.json()
    assert "configurado" in body
    # sem SENTRY_DSN no ambiente de teste:
    assert body["configurado"] is False
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `uv run pytest tests/test_ops.py::test_sentry_status -v`
Expected: FAIL (404).

- [ ] **Step 3: Schema**

Adicionar em `apps/api/app/schemas/ops.py`:

```python
class SentryStatusOut(BaseModel):
    configurado: bool
    environment: str
    url: str | None = None  # link-out para o projeto no Sentry
```

- [ ] **Step 4: Endpoint**

Adicionar em `apps/api/app/api/ops.py` (ampliar import e a rota):

```python
from app.schemas.ops import SentryStatusOut


@router.get("/sentry", response_model=SentryStatusOut)
async def sentry_status(_: User = Depends(require_ops)) -> SentryStatusOut:
    url = None
    if settings.sentry_org and settings.sentry_project:
        url = f"https://{settings.sentry_org}.sentry.io/projects/{settings.sentry_project}/"
    return SentryStatusOut(
        configurado=bool(settings.sentry_dsn),
        environment=settings.sentry_environment,
        url=url,
    )
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `uv run pytest tests/test_ops.py::test_sentry_status -v`
Expected: PASS.

- [ ] **Step 6: Rodar a suíte completa do projeto (regressão)**

Run: `uv run pytest -q`
Expected: tudo verde (ops + suítes existentes).

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/ops.py apps/api/app/api/ops.py apps/api/tests/test_ops.py
git commit -m "feat(ops): endpoint de status do Sentry (link-out)"
```

---

### Task 23: Frontend — painel Sentry + link no AdminSidebar

**Files:**
- Modify: `src/integrations/api/ops.ts`, `src/components/suporte/OpsSentry.tsx`, `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Tipo + método**

Adicionar em `src/integrations/api/ops.ts`:

```typescript
export interface SentryStatusOut { configurado: boolean; environment: string; url: string | null; }
```

E em `opsApi`:

```typescript
  sentry: () => api.get<SentryStatusOut>('/ops/sentry'),
```

- [ ] **Step 2: Implementar o painel**

Substituir `src/components/suporte/OpsSentry.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { opsApi, type SentryStatusOut } from '@/integrations/api/ops';
import { ExternalLink, Bug } from 'lucide-react';

export function OpsSentry() {
  const [st, setSt] = useState<SentryStatusOut | null>(null);

  useEffect(() => { opsApi.sentry().then(setSt).catch(() => setSt(null)); }, []);

  if (!st) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4" /> Sentry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={st.configurado ? 'default' : 'secondary'}>
            {st.configurado ? 'Configurado' : 'Não configurado'}
          </Badge>
          <span className="text-sm text-muted-foreground">Ambiente: {st.environment}</span>
        </div>
        {st.configurado ? (
          st.url ? (
            <Button asChild>
              <a href={st.url} target="_blank" rel="noreferrer">
                Abrir no Sentry <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              SDK ativo, mas faltam SENTRY_ORG/SENTRY_PROJECT para montar o link.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Defina SENTRY_DSN no backend para ativar a captura de erros. O painel de issues
            (via API do Sentry) está planejado para a fase 2.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

> Se `@/components/ui/badge` não existir, substitua por `<span>` estilizado (cheque com `ls src/components/ui/badge.tsx`).

- [ ] **Step 3: Link de acesso ao /ops no AdminSidebar**

Em `src/components/admin/AdminSidebar.tsx`, dentro de `handleSignOut`/estrutura já existente, adicionar um botão no `SidebarFooter` (antes do botão "Sair", linha ~262) para o admin abrir o dashboard de Ops:

```tsx
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate('/ops')}
        >
          <Headphones className="mr-2 h-4 w-4" />
          Suporte / Ops
        </Button>
```

(`Headphones` e `navigate` já estão importados/instanciados neste arquivo.)

- [ ] **Step 4: Build + verificação manual**

Run: `npm run build` (Expected: sem erros)
Manual: como `admin_vertical`, clicar em "Suporte / Ops" no rodapé da sidebar → abre `/ops`. Painel Sentry mostra "Não configurado" sem DSN.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/api/ops.ts src/components/suporte/OpsSentry.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat(ops): painel Sentry (link-out) + atalho no AdminSidebar"
```

---

## Verificação final (após todas as tarefas)

- [ ] `cd apps/api && uv run pytest -q` → tudo verde.
- [ ] `npm run build` → sem erros de tipo.
- [ ] Manual: logar como `suporte` → cai em `/ops`; navegar pelos 7 painéis; impersonar um `cliente_final` e voltar; conferir que cada ação sensível aparece em Auditoria.
- [ ] Manual: logar como `admin_vertical` → atalho "Suporte / Ops" abre `/ops`; logar como `cliente_final` → acesso a `/ops` redireciona para `/dashboard`.

---

## Notas de segurança (lembretes para o implementador)

- Endpoints de banco/Redis são **read-only**. Não adicionar mutação (DELETE de chave, DROP) sem nova rodada de design.
- `require_ops` em todos os `/ops/*`, **exceto** `/ops/stop-impersonate` (autoridade vem da claim `imp_by` da própria sessão impersonada).
- Impersonação nunca atinge `admin_vertical`; `suporte` não modifica `admin_vertical`.
- A senha temporária do reset trafega na resposta — tratar no front como dado sensível (não logar em telemetria).
