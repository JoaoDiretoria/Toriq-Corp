# Design: Role `suporte` + Dashboard Ops/Observabilidade

**Data:** 2026-06-14
**Status:** Aprovado (brainstorming) — pronto para plano de implementação

## Contexto e objetivo

Criar uma nova role de sistema, `suporte`, que é **staff interno TORIQ com visão global**
(privilégio tipo "ops", sem tenant-scoping). Essa role acessa um dashboard dedicado de
observabilidade e suporte que reúne, num só lugar:

- Visão geral / health do sistema
- Banco de dados (tabelas, contagens, tamanhos, conexões)
- Redis: filas, caches e jobs do scheduler
- Tickets de suporte cross-tenant (todas as empresas) + métricas
- Gestão global de usuários (buscar, editar, resetar senha, trocar role/empresa, impersonar)
- Sentry (SDK instrumentado + link-out)

Acesso restrito a `suporte` **e** `admin_vertical` (superadmin).

### Estado atual do sistema (descoberto na exploração)

- **Roles** em `apps/api/app/models/user.py` (`UserRole` enum): `admin_vertical`, `cliente_torq`,
  `cliente_final`, `empresa_sst`, `empresa_parceira`, `instrutor`. **Não existe `suporte`.**
- **Guard** `require_role(*roles)` em `apps/api/app/api/deps.py`. JWT (cookie httpOnly) embute `role`.
- **Frontend**: cada role tem sua própria página-dashboard; sidebar de `NAV_GROUPS` hardcoded;
  cliente de API `api.get/post/patch/del` em `src/integrations/api/client.ts`; auth via
  `src/hooks/useAuth.tsx`. Roteamento em `src/App.tsx`.
- **Redis cache** (`apps/api/app/core/cache.py`) e **fila custom em lista Redis**
  (`apps/api/app/core/queue.py`) já existem e permitem introspecção (scan de chaves, TTL, `LLEN`).
- **Scheduler** APScheduler com 6 jobs em `apps/api/app/jobs/scheduler.py`.
- **Banco** Postgres async (asyncpg) + Alembic em `apps/api/app/core/db.py` + `migrations/`.
  Inspector e catálogo `pg_*` disponíveis para stats.
- **Tickets** já existem completos (`apps/api/app/api/suporte.py`, tabelas `tickets_suporte`,
  `tickets_sla_config`, `tickets_suporte_comentarios`, `tickets_suporte_anexos`), porém
  tenant-scoped por `empresa_solicitante_id`.
- **Sentry NÃO está integrado** (sem SDK, sem DSN).
- **Métricas/observability**: só existe `/health` trivial.

## Princípios de segurança

1. **Observabilidade é read-only.** Endpoints que expõem banco e Redis nunca permitem mutação
   (sem DROP, sem DELETE de chaves) no v1. Visualização e ação ficam separadas.
2. **Impersonação é auditável por construção.** Emite-se um JWT curto para o usuário-alvo
   carregando a claim `imp_by` (id do operador real), de modo que toda ação permaneça rastreável.
3. **Todos os endpoints `/ops` exigem `admin_vertical` ou `suporte`.**
4. **Não escalar privilégio.** Reutiliza a proteção de `admin_users` (só `admin_vertical` pode
   promover alguém a `admin_vertical`). **Impersonar `admin_vertical` é bloqueado.**

## Arquitetura

Abordagem escolhida: **dashboard Ops/Suporte dedicado** (espelha o padrão de um dashboard por role),
em vez de embutir no `AdminDashboard` existente (evita misturar privilégios e poluir a tela do admin).

### Backend

#### 1. Role e guard
- Adicionar `suporte = "suporte"` ao enum `UserRole` em `apps/api/app/models/user.py`.
- Em `apps/api/app/api/deps.py`, helper de conveniência:
  ```python
  require_ops = require_role(UserRole.admin_vertical, UserRole.suporte)
  ```
  aplicado em todos os endpoints `/ops`.

#### 2. Router `apps/api/app/api/ops.py` (prefixo `/ops`, tags `["ops"]`) + serviço `apps/api/app/services/ops.py`

Read-only, exceto a seção de usuários:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/ops/health` | Agrega: ping Postgres, ping Redis, profundidade da fila, scheduler vivo, uptime, versão |
| GET | `/ops/database/tables` | Tabelas com nº de linhas, tamanho (catálogo `pg_*`), maiores tabelas, stats do pool |
| GET | `/ops/redis/overview` | `INFO` (memória, clients, hits/misses), `LLEN` da fila, contagem de chaves por prefixo |
| GET | `/ops/redis/keys?prefix=&cursor=` | Listagem paginada de chaves com TTL (read-only) |
| GET | `/ops/scheduler/jobs` | Os 6 jobs com último/próximo run |
| GET | `/ops/tickets` | Tickets cross-tenant (todas as empresas) com filtros |
| GET | `/ops/tickets/metrics` | Abertos por status/prioridade, violações de SLA |
| GET | `/ops/sentry` | Status da config (DSN setado?, URL org/project) para link-out |
| GET | `/ops/audit` | Lista o log de auditoria |

A lógica pesada (queries no catálogo Postgres, acesso direto ao Redis via `cache._get_client()` e ao
client da fila) fica em `app/services/ops.py`. O router só valida, injeta deps e serializa
(schemas Pydantic em `apps/api/app/schemas/ops.py`).

#### 3. Usuários (global, com escrita)
Reaproveita a lógica de `apps/api/app/api/admin_users.py` removendo o tenant-scope:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/ops/users` | Busca global (nome/email/empresa/role) |
| GET | `/ops/users/{id}` | Detalhe do perfil |
| PATCH | `/ops/users/{id}` | Editar perfil (nome, email, telefone), ativar/desativar |
| POST | `/ops/users/{id}/reset-senha` | Disparar reset de senha (reusa fluxo existente) |
| PATCH | `/ops/users/{id}/role` | Trocar role (com proteção contra escalonar p/ admin_vertical) |
| PATCH | `/ops/users/{id}/empresa` | Mover de empresa |
| POST | `/ops/users/{id}/impersonate` | Emite JWT curto p/ o alvo com claim `imp_by`; bloqueia alvo `admin_vertical` |

#### 4. Auditoria (nova tabela + migração Alembic)
- Tabela `ops_audit_log`: `id`, `actor_id`, `action`, `target_user_id` (nullable),
  `details` (JSON), `ip`, `created_at`.
- Toda ação sensível grava registro: impersonate, troca de role, mudança de empresa,
  reset de senha, ativar/desativar.
- Exposta em `GET /ops/audit`.

#### 5. Sentry
- Adicionar `sentry-sdk[fastapi]` em `[project].dependencies` do `pyproject.toml`
  (**runtime, não dev** — o Dockerfile usa `uv sync --frozen --no-dev`; dep de runtime fora de
  `[project].dependencies` quebra prod).
- Novos campos em `apps/api/app/core/config.py`: `sentry_dsn` (opcional), `sentry_environment`,
  e slugs `sentry_org` / `sentry_project` para montar a URL de link-out.
- Init no `create_app()` (`apps/api/app/main.py`) somente se `SENTRY_DSN` estiver presente
  (degradação graciosa, igual ao padrão do Redis).

### Frontend

- `src/hooks/useAuth.tsx`: adicionar `'suporte'` ao union de `role`.
- `src/App.tsx`: pós-login, role `suporte` redireciona para `/ops`; rota `/ops` →
  `SuporteDashboard`, guardada para `suporte` **ou** `admin_vertical`. Item no `AdminSidebar`
  apontando para `/ops` (acesso do admin).
- `src/pages/SuporteDashboard.tsx` + `src/components/suporte/SuporteSidebar.tsx`
  (espelham o padrão do `AdminDashboard` / `AdminSidebar`: estado `activeSection` + switch).
- Painéis em `src/components/suporte/`:
  - `OpsVisaoGeral.tsx` — cards de health/pulso do sistema
  - `OpsBancoDados.tsx` — tabela de tabelas + contagens/tamanhos + pool
  - `OpsRedisFilas.tsx` — fila, caches por prefixo + TTL, scheduler
  - `OpsTickets.tsx` — lista cross-tenant + métricas
  - `OpsUsuarios.tsx` — busca, diálogo de edição, reset, role/empresa, botão impersonar
  - `OpsSentry.tsx` — status + botão de link-out
  - `OpsAuditoria.tsx` — log de auditoria
- Todas as chamadas via `api.get/post/patch` de `src/integrations/api/client.ts`.
- **Impersonação (UX):** botão → diálogo de confirmação → troca de sessão → **banner fixo
  "Você está impersonando X — sair"** que reverte para a sessão do operador.

## Estratégia de testes

- **Backend (pytest, seguindo `apps/api/tests`):**
  - Guard: `403` para role não-ops em endpoints `/ops`.
  - `GET /ops/health` retorna estrutura esperada.
  - DB stats e Redis overview (com fakes/skip se Redis ausente, seguindo padrão de degradação).
  - Tickets cross-tenant trazem tickets de empresas diferentes.
  - Edição de usuário e troca de role respeitam a proteção anti-escalonamento.
  - Impersonação emite token com `imp_by` e grava registro em `ops_audit_log`.
- **Frontend:** smoke test do guard de rota (role errada não acessa `/ops`).

## Ordem de construção (dentro deste spec)

1. Role + guard + shell do dashboard + `/ops/health` + `OpsVisaoGeral`
2. Banco (`/ops/database/*`) + Redis/Filas/Scheduler (`/ops/redis/*`, `/ops/scheduler/jobs`)
3. Tickets cross-tenant (`/ops/tickets*`)
4. Usuários + auditoria + impersonação (`/ops/users/*`, `/ops/audit`, tabela `ops_audit_log`)
5. Sentry (SDK + `/ops/sentry` + link-out)

## Fora de escopo (fase 2)

- Painel Sentry puxando issues via API do Sentry (por ora só link-out).
- Mutação de infra pelo dashboard (deletar chaves Redis, rodar migrações, etc.).
- Métricas com Prometheus/StatsD e séries temporais históricas.
- Tooling avançado de tickets (responder/atribuir ticket pelo painel ops) além de visualização.
