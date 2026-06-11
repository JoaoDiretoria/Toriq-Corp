# Migração para Backend Próprio (Python) — Design

- **Data:** 2026-06-11
- **Status:** Aprovado (discovery concluído)
- **Autor:** Discovery conduzido via brainstorming
- **Projeto:** TORIQ — plataforma SaaS multi-tenant de gestão SST / empresarial

## 1. Objetivo

Migrar a aplicação TORIQ de uma arquitetura **frontend-direto-no-Supabase** para uma
arquitetura de **backend próprio em Python**, dentro de um **monorepo**, eliminando
**100% a dependência do Supabase** (auth, banco, storage e edge functions) e passando a
**assinar a própria autenticação via JWT**.

### Estado atual (verificado em 2026-06-11)

- **Frontend:** Vite + React + TypeScript, fala **direto** com o Postgres do Supabase.
  - `supabase.from(...)` (acesso a dados a partir do navegador) em **136 arquivos**.
  - `supabase.auth` em **14 arquivos**.
- **Backend hoje:** Supabase (Postgres 17 + RLS) + **7 Edge Functions** + um serviço
  `backend-esocial` em Node/TS.
- **Banco:** projeto `Torq Corp` (`bsvtgdtsbrjdwdnpirzb`), 150+ tabelas, 229 migrations.
- **Dados reais:** praticamente nenhum — **pré-lançamento confirmado via MCP**:
  - 3 usuários (auth), último signup 2026-03-16
  - 2 empresas, 3 profiles, **0 colaboradores**
  - Maior tabela: `access_logs` (348 linhas de log); dados de negócio só seed/teste.

A ausência de dados reais é a premissa que viabiliza um **cutover big-bang** sem risco e
sem plano de migração de dados.

## 2. Decisões-âncora

| # | Decisão | Escolha | Razão |
|---|---|---|---|
| 1 | Escopo da saída | Sair **100%** do Supabase (auth + banco + storage + functions) | Independência total de vendor |
| 2 | Estratégia de transição | **Big bang** | Banco vazio → sem risco de downtime/perda |
| 3 | Hospedagem | **VPS única** com Docker Compose | Barato, sob controle; sem dados a migrar |
| 4 | Monorepo | **pnpm workspaces + Turborepo** (poliglota) | Versiona front+back juntos; orquestra o lado JS |
| 5 | Backend | **FastAPI + SQLAlchemy 2.0 + Alembic**, deps via `uv` | Async, OpenAPI automático, Pydantic; padrão Python maduro |
| 6 | Sessão | **JWT próprio**, access (15min) + refresh em **cookie httpOnly**, argon2 | Imune a XSS; padrão pro de SaaS |
| 7 | Multi-tenancy | Filtro `empresa_id` **estrutural** no repository base | Substitui o RLS; isolamento não confiado à memória do dev |
| 8 | Storage | **MinIO** (S3-compatível) na VPS, via `@aws-sdk`/`boto3` | Troca para R2/S3 no futuro sem mudar código |
| 9 | eSocial | **Reescrito em Python** dentro da API | Stack única |
| 10 | Tipos front↔back | OpenAPI → `packages/api-client` (TS gerado) | Type-safety de ponta a ponta cruzando linguagens |
| 11 | Schema inicial | **Introspectar** o schema do Supabase | Reaproveita 150+ tabelas já modeladas |

## 3. Arquitetura-alvo

### 3.1 Estrutura do monorepo

```
toriq/
├─ apps/
│  ├─ web/        → front React/Vite atual (pnpm) — consome a API
│  └─ api/        → FastAPI + SQLAlchemy + Alembic (uv)
│                   inclui o módulo eSocial (reescrito em Python)
├─ packages/
│  ├─ api-client/ → client TS gerado da OpenAPI (front importa daqui)
│  └─ config/     → eslint/tsconfig compartilhados (lado JS)
├─ docker-compose.yml   → postgres + api + minio + web
├─ turbo.json    → orquestra o lado JS
└─ pnpm-workspace.yaml
```

Observações:
- `packages/database` (Prisma) **não existe** — no padrão Python, os models SQLAlchemy e
  as migrations Alembic vivem dentro de `apps/api`.
- O Turborepo orquestra apenas o lado JS (build/lint/dev da `web` e do `api-client`); o
  `apps/api` Python gerencia as próprias dependências com `uv`.
- A `web` continua sendo buildada pelo Vite e servida pelo Nginx existente; muda apenas a
  origem dos dados: de `supabase.from()` para chamadas HTTP à API.

### 3.2 Infraestrutura (VPS gerenciada por EasyPanel)

A VPS roda **EasyPanel** (PaaS sobre Docker). Serviços:
- **postgres** — `db-toriq-corp` já provisionado no EasyPanel (Postgres 17), exposto numa
  porta pública para acesso da API local e de produção. **Banco único** (dev e prod usam o
  mesmo). Credenciais só no `.env` (gitignored).
- **api** — FastAPI (uvicorn/gunicorn), Alembic nas migrations; deploy como serviço EasyPanel.
- **minio** — storage S3-compatível (via docker-compose local; vira serviço EasyPanel em prod).
- **web** — build estático servido por Nginx (em produção).

> Nota asyncpg: a URL de conexão NÃO usa `?sslmode=disable` (parâmetro do psycopg); o SSL
> é desabilitado via `connect_args={"ssl": False}` no engine SQLAlchemy.

### 3.3 Autenticação e RBAC

- Tabela `users` própria substitui `auth.users` do Supabase.
- Senhas com **argon2** (`passlib`).
- FastAPI emite **access token (15min)** + **refresh token** em **cookies httpOnly**.
  - Atenção a **CSRF** (cookies enviados automaticamente) e **CORS com credenciais**.
- **RBAC:** papéis reais (enum `user_role`: `admin_vertical`, `cliente_torq`,
  `cliente_final`, `empresa_parceira`, `instrutor`; + `grupo_acesso`:
  administrador/gestor/colaborador) viram dependências FastAPI:
  `Depends(require_role(UserRole.admin_vertical))`.
- A lógica hoje em `usePermissoes` / `useTelaPermissoes` / `useHierarquia` (cosmética no
  front) migra para a API, onde passa a ser **autoridade real**.

### 3.4 Multi-tenancy (substituição do RLS) — ponto crítico

- Hoje o **RLS** garante isolamento entre empresas mesmo com acesso direto do front.
- Sem RLS, **toda query precisa filtrar por `empresa_id`**.
- Padrão exigido: um `Depends` injeta o `empresa_id` do JWT; um **repository base** aplica
  o filtro **automaticamente**, de forma **estrutural** — nunca confiado ao dev lembrar de
  escrever `WHERE empresa_id = ?` em cada query.
- **Risco nº 1 da migração:** um único endpoint sem o filtro vaza dados entre clientes.
  O isolamento DEVE ser estrutural e coberto por testes antes de cortar o acesso direto.

### 3.5 Fronteira de tipos (OpenAPI)

Fluxo: FastAPI gera `openapi.json` → `openapi-typescript` gera `packages/api-client` →
o front importa dali. Mudança no back quebra o front em **build time**, não em produção.

## 4. Sequência de construção

Tudo é construído no monorepo; a chave é virada apenas no passo 6 (big bang).

1. **Fundação** — scaffold do monorepo (pnpm + turbo + uv), `docker-compose`
   (postgres + minio), skeleton FastAPI, **introspecção** do schema do Supabase →
   models SQLAlchemy + migration Alembic inicial (removendo RLS, schema `auth` e triggers
   específicos do Supabase).
2. **Núcleo de segurança** — tabela `users`, fluxo JWT em cookie httpOnly, argon2, guards
   de role, **repository base com isolamento por `empresa_id`**. *(Deve estar 100% correto
   e testado antes de seguir.)*
3. **Módulos de negócio** — portar os 7 edge functions + domínios (SST, Toriq Corp/CRM,
   Treinamentos, Frota, White Label) como routers FastAPI; uploads via MinIO.
4. **eSocial** — reescrito em Python (a partir do `backend-esocial` Node atual).
5. **Religar o front** — gerar `packages/api-client`; trocar os **136 arquivos** de
   `supabase.from()` por chamadas à API e os **14** de `supabase.auth` pelo novo fluxo.
   Trabalho mecânico e volumoso, mas guiado pelo TypeScript do client; bom candidato a
   automação/paralelização.
6. **Cutover (big bang)** — subir o compose na VPS, recriar os 2-3 registros de teste,
   apontar o front para a API, desligar o Supabase.

A ordem não é arbitrária: o núcleo de segurança (2) precede os módulos (3) porque o
repository base com isolamento de tenant é a fundação de todo CRUD.

## 5. Riscos e restrições

- **Vazamento entre tenants** (maior risco): mitigado por isolamento estrutural no
  repository base + testes de isolamento obrigatórios.
- **CSRF/CORS** com cookies httpOnly: exige proteção CSRF e CORS com credenciais bem
  configurados.
- **Perda de regra de negócio** ao remover RLS/triggers do Supabase: a introspecção
  preserva tabelas, mas lógica que vivia em triggers/políticas precisa ser reimplementada
  na aplicação — inventariar durante o passo 1.
- **eSocial:** reescrever integração governamental em Python é trabalho não-trivial;
  validar contra o serviço Node atual.
- **Volume do passo 5:** 136 arquivos a reescrever; risco de regressão funcional no front.

## 6. Critérios de sucesso

- Zero dependência de `@supabase/supabase-js` no `apps/web`.
- Autenticação 100% via JWT próprio (cookie httpOnly + refresh) emitido pela API.
- Todos os acessos a dados passam pela API FastAPI (nenhum acesso direto ao banco no front).
- Isolamento multi-tenant garantido estruturalmente e coberto por testes.
- Stack rodando na VPS via `docker-compose up` (postgres + api + minio + web).
- Supabase desligado.

## 7. Fora de escopo (YAGNI por enquanto)

- Redis / cache distribuído, réplicas de leitura, filas distribuídas (sem carga real).
- Migração de dados de produção (não há dados reais).
- App mobile, GraphQL, BI avançado (roadmap futuro, não esta migração).

## 8. Pendências para o plano de implementação

- Inventário das regras de negócio que hoje vivem em **triggers/policies** do Supabase.
- Estratégia de geração e versionamento do `packages/api-client`.
- Definição do provedor da VPS e pipeline de deploy.
- Detalhe do fluxo de refresh token (rotação, revogação, store de refresh tokens).
