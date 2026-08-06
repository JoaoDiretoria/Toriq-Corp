# TORIQ Corp — Plataforma SST + Gestão Empresarial

Plataforma multi-tenant de **SST (Saúde e Segurança do Trabalho)** + **gestão empresarial/CRM**.
Em **migração** de uma arquitetura *frontend-direto-no-Supabase* para um **backend próprio em Python (FastAPI)**.

> **Status (2026-06-12):** Backend novo **em produção** em `https://api.toriqcorp.com.br`
> (125 endpoints GET validados, 350 testes verdes). Front em migração incremental e **invisível**
> (auth + dashboard já no backend novo; demais telas em andamento).

---

## Índice
1. [Arquitetura e stack](#arquitetura-e-stack)
2. [Estrutura do repositório](#estrutura-do-repositório)
3. [Banco de dados](#banco-de-dados)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Como rodar localmente](#como-rodar-localmente)
6. [Deploy (EasyPanel)](#deploy-easypanel)
7. [Manual das APIs](#manual-das-apis)
8. [Autenticação e multi-tenancy](#autenticação-e-multi-tenancy)
9. [Testes](#testes)
10. [O que falta migrar (front)](#o-que-falta-migrar-front)
11. [O que falta para terminar o desenvolvimento](#o-que-falta-para-terminar-o-desenvolvimento)

---

## Arquitetura e stack

| Camada | Tecnologia |
|---|---|
| **Backend (API)** | **Python 3.12** · **FastAPI** · **SQLAlchemy 2.0** (async/asyncpg) · **Alembic** (migrations) · gerenciado por **`uv`** |
| **Auth** | JWT próprio (access 15 min + refresh 14 dias) em **cookie httpOnly** · senhas com **argon2** (passlib) |
| **Jobs** | **APScheduler** (in-process, no lifespan do FastAPI) — recorrências, automações de funil |
| **Storage** | **RustFS** (S3-compatível) via **boto3** |
| **Banco** | **PostgreSQL** (`db-toriq-corp`) |
| **Frontend** | **Vite + React + TypeScript** + shadcn/ui · TanStack Query · React Router |
| **Tipos front↔back** | **OpenAPI → TypeScript** (`schema.d.ts` gerado) |
| **Infra** | **EasyPanel** na VPS (`69.62.89.220`) — Postgres + RustFS + serviços Docker |

### Módulo Chat Meta (WhatsApp)

O Super Admin possui o módulo **Chat WhatsApp**, integrado ao backend NestJS isolado do fluxo legado de disparos. Ele inclui:

- conexão da conta pelo Meta Embedded Signup;
- acompanhamento do status e da qualidade da conta;
- inbox responsiva com busca, paginação, não lidas e atualização periódica;
- histórico e envio de mensagens dentro da janela de atendimento de 24 horas;
- bloqueio orientado da composição fora da janela, preparando o fluxo futuro de templates.

Para ativar em produção, configure as variáveis `VITE_CHAT_API_URL`, `VITE_META_APP_ID`,
`VITE_META_CONFIG_ID` e `VITE_META_API_VERSION` descritas abaixo. A autenticação atual do front usa
cookie httpOnly do FastAPI, enquanto o serviço Chat Meta valida JWT Supabase; portanto, a publicação
exige uma ponte de autenticação server-side ou a unificação do guard no backend. Nunca exponha tokens
de serviço ou bearer tokens em variáveis `VITE_*`.

**Por que FastAPI:** isolamento de tenant estrutural no repositório base (substitui o RLS do Supabase),
JWT próprio para assinar tudo, e portabilidade da lógica que hoje vive no front/triggers para Python.

---

## Estrutura do repositório

```
Toriq corp/
├── apps/
│   └── api/                      # 🟢 BACKEND FastAPI (Python)
│       ├── app/
│       │   ├── api/              # routers (endpoints) por módulo
│       │   ├── core/             # config, db, security, tokens, storage
│       │   ├── models/           # SQLAlchemy: generated.py (introspectado) + treinamentos.py + user.py
│       │   ├── repositories/     # TenantRepository (isolamento por empresa_id)
│       │   ├── schemas/          # Pydantic (entrada/saída)
│       │   ├── services/         # lógica reutilizável (automações, white-label, notificações)
│       │   ├── jobs/             # APScheduler (scheduler + tasks)
│       │   └── main.py           # wiring de todos os routers
│       ├── migrations/           # Alembic
│       ├── tests/                # 350 testes (Postgres de teste, rollback por teste)
│       ├── Dockerfile            # build do backend (contexto = RAIZ do repo)
│       ├── pyproject.toml        # deps (uv)
│       └── .env                  # credenciais (GITIGNORED)
│
├── src/                          # FRONTEND React/Vite (na raiz, legado em migração)
│   ├── integrations/api/         # 🟢 client novo: client.ts, auth.ts, schema.d.ts (gerado)
│   ├── hooks/useAuth.tsx         # 🟢 auth migrado para o backend novo
│   ├── components/ · pages/      # telas (em migração)
│   └── lib/accessLog.ts          # 🟢 migrado
│
├── docs/legacy-esocial-reference/ # 📚 fonte TS do antigo backend-esocial (referência p/ reescrever — Fatia 4)
├── docs/superpowers/             # specs, planos, mapas da migração
├── Dockerfile                    # build do FRONT (Vite → nginx)
├── package.json                  # deps do front
└── README.md
```

---

## Banco de dados

- **Postgres** `db-toriq-corp` na VPS (`69.62.89.220:5432`, user `toriq_corp`).
- **188 tabelas**: 175 introspectadas do schema original + **13 criadas do zero** (cluster Treinamentos,
  instrutores, empresas_parceiras, certificados, anexos).
- **Sem triggers/funções no banco** — toda a lógica (229 triggers + 108 funções do legado) é portada
  para **Python** (services + jobs).
- **Migrations:** Alembic. No deploy, o container roda **`alembic upgrade head` automaticamente** antes
  do uvicorn. Banco de teste separado: `db-toriq-test`.

```bash
# rodar migrations manualmente (apps/api)
uv run alembic upgrade head
uv run alembic history          # ver histórico
uv run alembic revision -m "x"  # nova migration
```

---

## Variáveis de ambiente

### Backend (`apps/api/.env` em dev · env vars do container em produção)

| Variável | Obrigatória | Descrição | Exemplo (produção) |
|---|---|---|---|
| `DATABASE_URL` | ✅ | URL async do Postgres (driver `asyncpg`) | `postgresql+asyncpg://toriq_corp:SENHA@db-toriq-corp:5432/db-toriq-corp` |
| `JWT_SECRET` | ✅ | Segredo para assinar os JWT (forte, aleatório) | `<64+ chars aleatórios>` |
| `JWT_ACCESS_TTL_SECONDS` | — | TTL do access token (default 900 = 15 min) | `900` |
| `JWT_REFRESH_TTL_SECONDS` | — | TTL do refresh token (default 1209600 = 14 dias) | `1209600` |
| `COOKIE_SECURE` | — | `true` em produção (HTTPS); `false` só em dev local HTTP | `true` |
| `DB_SSL` | — | `true` = exige TLS no Postgres; `false` em rede interna/dev | `false` |
| `S3_ENDPOINT_URL` | p/ storage | Endpoint do RustFS (**hostname interno** em produção) | `http://rustfs:9000` |
| `S3_ACCESS_KEY` | p/ storage | Access key do RustFS | `rustfsadmin` |
| `S3_SECRET_KEY` | p/ storage | Secret key do RustFS | `<secret>` |
| `S3_REGION` | — | Região S3 (default `us-east-1`) | `us-east-1` |
| `S3_PUBLIC_BASE_URL` | — | Base pública opcional (CDN/proxy) p/ URLs de arquivo | — |
| `CORS_ORIGINS` | ✅* | Origens permitidas (separadas por vírgula) — domínios do front | `https://toriqcorp.com.br,https://www.toriqcorp.com.br` |
| `OPEN_REGISTER` | — | `false` (default, seguro): `/auth/register` exige admin_vertical. `true` só p/ bootstrap/testes | `false` |
| `SUPABASE_DB_URL` | só dev | URL do Supabase original (introspecção/port de RPCs) — **não usar em produção** | — |
| `TEST_DATABASE_URL` | só teste | Banco de teste (`db-toriq-test`) | `postgresql+asyncpg://...@.../db-toriq-test` |
| `SEED_ADMIN_EMAIL` | seed | E-mail do 1º admin (usado só pelo `python -m app.seed_admin`) | `admin@toriqcorp.com.br` |
| `SEED_ADMIN_PASSWORD` | seed | Senha do 1º admin (≥ 8 chars) | `<senha forte>` |
| `SEED_ADMIN_NOME` | — | Nome do 1º admin (default `Admin`) | `Admin` |

> ⚠️ Sem `S3_*` configurado, os endpoints `/storage/*` respondem **503** (o resto funciona normal).
> Em produção, use **hostnames internos** (`db-toriq-corp`, `rustfs`) — mais rápido e não sai pra internet.
> ⚠️ `.env` é **gitignored**. Cada variável em **uma linha** (`CHAVE=valor`).

> **Bootstrap do 1º admin (Fatia 0):** em produção `OPEN_REGISTER=false`, então
> `/auth/register` é restrito a `admin_vertical`. Crie o primeiro admin via seed
> (idempotente) — depois dele, todos os outros usuários são criados logado:
> ```
> SEED_ADMIN_EMAIL=admin@toriqcorp.com.br SEED_ADMIN_PASSWORD='<senha forte>' \
>   uv run python -m app.seed_admin
> ```

### Frontend (`.env` na raiz · build-args do Vite)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL pública da API nova (ex.: `https://api.toriqcorp.com.br`). **Queimada no bundle em build-time** — em produção precisa apontar pra API real, senão cai no default `http://localhost:8000`. |
| `VITE_CHAT_API_URL` | URL pública do serviço NestJS do Chat Meta. Se omitida, usa `VITE_API_URL` e pressupõe gateway para `/api/chat/*`. |
| `VITE_META_APP_ID` / `VITE_META_CONFIG_ID` | Identificadores públicos do app e da configuração de Embedded Signup usados para conectar o WhatsApp no Super Admin. |
| `VITE_META_API_VERSION` | Versão da Graph API usada ao inicializar o SDK da Meta (ex.: `v25.0`). Deve acompanhar `META_API_VERSION` do backend. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` | Legado (telas ainda não migradas). Sai no cutover. |
| `VITE_TURNSTILE_SITE_KEY` | Captcha Cloudflare Turnstile (widget de login). |
| `VITE_ESOCIAL_BACKEND_URL` / `VITE_ESOCIAL_CONFIG_API_KEY` | Backend eSocial (Fatia 4). |

---

## Como rodar localmente

**Pré-requisitos:** [`uv`](https://docs.astral.sh/uv/) (Python), Node 20+ (front).

### Backend
```bash
cd apps/api
# uv instala o Python 3.12 fixado + deps automaticamente
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
#  → API em http://localhost:8000
#  → Swagger interativo em http://localhost:8000/docs
#  → OpenAPI JSON em http://localhost:8000/openapi.json
```

### Frontend
```bash
npm install
npm run dev          # → http://localhost:8080
npm run gen:api      # regenera src/integrations/api/schema.d.ts a partir do OpenAPI (API tem que estar no ar)
npm run build        # build de produção
```

---

## Deploy (EasyPanel)

### Backend (serviço `toriq_corp_back`)
- **Fonte:** Git · Ramo `main`
- **Construção:** Dockerfile · Arquivo `apps/api/Dockerfile`
- **Caminho de Build:** `/` (raiz) — o Dockerfile builda a partir da raiz (`COPY apps/api/...`)
- **Porta:** `8000`
- **Variáveis de ambiente:** ver tabela acima (com `db-toriq-corp:5432` e `rustfs:9000` internos)
- O container roda **`alembic upgrade head && uvicorn`** no start (migrations automáticas).
- **Domínio:** servir num **subdomínio de `toriqcorp.com.br`** (ex.: `api.toriqcorp.com.br`) para o
  cookie httpOnly `SameSite=lax` funcionar entre front e API.

### Frontend (serviço `toriq_corp_front`)
- Dockerfile da raiz (Vite → nginx, porta 80). Build-arg `VITE_API_URL=https://api.toriqcorp.com.br`.

---

## Manual das APIs

Base URL produção: `https://api.toriqcorp.com.br` · **Swagger completo em `/docs`**.
Padrão REST: `GET` lista · `GET /{id}` detalha · `POST` cria · `PUT /{id}` atualiza · `DELETE /{id}` remove.
Quase tudo exige autenticação (cookie). Payloads e respostas tipados — ver `/docs`.

### 🔐 Autenticação (`/auth`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login; grava cookies httpOnly (access + refresh). Body: `{email, password}` |
| GET | `/auth/me` | Sessão atual: `{user, profile, empresa}` (restaura sessão no front) |
| POST | `/auth/refresh` | Renova o access token a partir do refresh cookie |
| POST | `/auth/logout` | Limpa os cookies |
| POST | `/auth/register` | Cria usuário (⚠️ hoje aberto — virar admin-gated antes do deploy real) |
| POST | `/auth/change-password` | Troca de senha (valida a atual) |
| POST | `/auth/first-access-password` | Troca forçada no 1º acesso (sem a senha atual; só com `senha_alterada=false`) |

### 👤 Gestão de usuários (`/admin/users`) — admin
CRUD de usuários (admin_vertical: todas as empresas; cliente_torq: só a própria, sem criar admin).
Soft-delete, senha temporária via `secrets`, reset de senha. `senha_hash` nunca é serializada.

### 💰 Financeiro
- `/financeiro/cadastros/*` — fornecedores, centros-custo, condições/formas de pagamento e cobrança, contas bancárias, plano de despesas/receitas.
- `/contas-pagar` · `/contas-receber` — kanban (cards + colunas + `/mover` + `/reorder`), atividades, movimentações.
- `/financeiro/contas` · `/financeiro/modelos-atividade` — extras.

### 📊 Funil / CRM
- `/funil` — funis, etapas, cards, etiquetas, atividades. **Motor de automações** dispara em mover/criar/ganhar/perder (gatilhos `negocio_chegar_etapa`, `negocio_ganho/perdido`).
- `/funil/cards/*` — orçamentos, propostas, comparações; `/funil/cards/{id}/anexos`.
- `/funil-comercial` — automações, configurações, propostas comerciais (treinamentos/SST/vertical365).
- `/kanban/{closer,prospeccao,pos_venda,cross_selling}` — kanbans legados.

### 📄 Contratos e modelos
`/contratos` (+cláusulas, módulos; numeração `TQ-{ano}-{seq}`) · `/modelos` (templates de atividade/proposta).

### 🦺 SST
`/sst/*` (cargos, clientes, colaboradores, setores, grupos, perigos, riscos, categorias) ·
`/sst/saude/*` (exames, profissionais de saúde/segurança) · `/sst/epi/*` (equipamentos, kits, movimentações, etc.).

### 🎓 Treinamentos
`/treinamentos/*` (catálogo, turmas + aulas, turma-colaboradores, colaboradores-treinamentos + datas, certificados) ·
`/treinamentos/instrutores` (+datas indisponíveis) · `/treinamentos/empresas-parceiras` · `/treinamentos/reconhecimento-facial-config`.

### 🚚 Frota
`/frota/*` — veículos, motoristas, manutenções, checklists, custos, documentos, ocorrências, utilizações.

### 📦 Produtos/Serviços
`/produtos/*` — catálogo, categorias, classificações, naturezas, pacotes, planos, serviços, tipos.

### 🏢 Empresa / Plataforma
`/empresas` (+`/empresas/me`) · `/modulos` (global) · `/empresas-modulos` (+telas) ·
`/setores/{id}/permissoes` (regra legada: lista vazia = libera tudo) · `/cadastros/*` (contatos, categorias, origens) ·
configurações de empresa.

### 🎨 White Label · 📰 Conteúdo
`/white-label` (config) · `/white-label/me` (resolve a empresa SST pai → tema) ·
`/blog` (+`/blog/trending`) · `/pesquisas` · newsletter — conteúdo global.

### 🔔 Operação
`/notificacoes` · `/suporte` (tickets) · `/agenda` (eventos, compartilhamentos) ·
`/sistema/access-logs` · `/sistema/system-updates` (+`/register`) · `/sistema/import-queue` · `/sistema/cbo-ocupacoes`.

### 📁 Storage (`/storage`)
`POST /storage/{bucket}/upload` (multipart; allowlist de buckets; key prefixada por empresa; MIME validado) ·
`DELETE /storage/{bucket}/{key}` · `GET /storage/{bucket}/{key}/url` (presigned). Isolado por tenant.

### 🌐 Públicos (sem auth)
`POST /leads-landing` · `GET /vagas` + `POST /vagas/{id}/candidaturas` · `GET /blog/trending` · health `GET /health`.

---

## Autenticação e multi-tenancy

- **JWT em cookie httpOnly** (`access_token` em `/`, `refresh_token` em `/auth`). O front usa
  `credentials: 'include'`; o client faz **refresh automático no 401**.
- **RBAC** via `require_role` com 6 papéis: `admin_vertical`, `cliente_torq`, `cliente_final`,
  `empresa_parceira`, `instrutor`.
- **Multi-tenancy estrutural:** o `TenantRepository` filtra **toda** query por `empresa_id` (ou
  `empresa_sst_id` em tabelas como `clientes_sst`/`empresas_parceiras`). Tabelas-filhas são escopadas
  via o pai (JOIN validando o tenant). Substitui o RLS do Supabase.
- **Padrões de segurança** (auditados): schemas de UPDATE sem FKs de parentesco (anti mass-assignment);
  validação de FKs do payload contra o tenant do JWT; segredos nunca serializados.

---

## Testes

```bash
cd apps/api
uv run pytest                 # 350 testes (Postgres de teste, rollback transacional por teste)
uv run pytest tests/test_x.py # um arquivo
```
- Rodam contra `db-toriq-test` (mesmas tabelas reais), com rollback por teste (banco limpo sempre).
- Cobrem CRUD, isolamento cross-tenant, regras de segurança, motor de automações, etc.
- **Smoke test de produção:** 125/125 endpoints GET respondem 200, zero erros 5xx.

---

## O que falta migrar (front)

A migração é **invisível** (mesma UI; só troca `supabase.from()` → client novo).

**Estado (2026-06-12): essencialmente concluída.** Os hooks-keystone (`useAuth`,
`useModulosAtivos`, `usePermissoes`, `useEmpresaMode`, `useHierarquia`,
`useNotificacoes`) e as ~127 telas restantes foram migrados — **zero chamadas
`supabase.` de código** no `src/`. O diretório `integrations/supabase/` e a
dependência `@supabase/supabase-js` foram **removidos** na limpeza pós-cutover
(`864515a`). Guia/contrato da esteira em `docs/migracao-front-esteira.md`.

**Degradações conhecidas (sem endpoint equivalente — degradam graciosamente):**
- **Realtime** (notificações, kanban, tickets) → **polling**/recarga nos GETs (sem push no backend novo).
- **Envio de newsletter** (`functions.invoke('send-newsletter')`) → sem endpoint; ação fica no-op até criar.
- **Recomendações de blog** (`blog_user_preferences`) → degrada para "posts recentes".
- **Branding pré-login por empresa arbitrária** (`useEmpresaWhiteLabel`) → revisar (há `/white-label/me`).
- **eSocial / Google Meet** → dependem da Fatia 4 (eSocial em Python).
- **Upload** (fotos/certificados/anexos) → `/storage` (já pronto).

---

## O que falta para terminar o desenvolvimento

> Atualizado em **2026-06-13**. Decisão do produto: o banco novo começa **vazio**
> (cria do zero) — **não há backfill** de dados do Supabase. Isso remove a etapa
> mais cara (e a migração de credenciais) do caminho.

- [x] **Migrar as telas do front** — ✅ esteira concluída: hooks-keystone + ~127 telas
  migradas (116 limpas, 11 parciais que degradam graciosamente), **0 chamadas
  `supabase.` de código**, 0 erros de TypeScript. Guia em `docs/migracao-front-esteira.md`.
- [x] **Fatia 0 (pré-deploy):** ✅ `/auth/register` **admin-gated** (`OPEN_REGISTER=false`)
  + seed do 1º admin (`python -m app.seed_admin`).
- [x] **Realtime → push:** ✅ resolvido com **polling**/recarga (era opcional).
- [ ] **Fechar as lacunas de backend** descobertas pela esteira (ver abaixo) — para
  as telas parciais voltarem a 100%. **11 de ~13 já fechadas** (normas_regulamentadoras
  fechada). Restam: `send-newsletter` (SMTP) e kanbans pontuais.
- [x] **Apontar o serviço de front** (`VITE_API_URL` → `https://api.toriqcorp.com.br`) —
  ✅ **CUTOVER FEITO (2026-06-12):** o front em produção (`toriqcorp.com.br`) já roda
  o build migrado falando com o backend Python; bundle sem Supabase (tree-shaken).
  CORS/cookies cross-subdomínio validados. 1º admin via `app.seed_admin`.
- [x] **Validar paridade** tela-a-tela em produção — ✅ sweep das **25 telas admin** via
  navegador (Playwright) logado como admin. Achados/corrigidos: filtro de tipo escondendo
  empresas (`c41fa67`), tela branca em Estatísticas / `created_at` ausente em `/admin/users`
  (`07a96b0`), loop infinito de carregamento na Agenda (`106f9c4`). Demais telas OK.
- [x] **Captcha** Turnstile no backend — ✅ validado no `/auth/login` (fail-closed quando
  `TURNSTILE_SECRET_KEY` setada). Falta só o **reset de senha por email** (precisa SMTP).
- [ ] **Auth avançado (resta email):** reset de senha por **email** + envio de newsletter —
  ambos dependem de **provedor SMTP** (host/user/senha). Código pode ser feito config-driven.
- [~] **Fatia 4 — eSocial em Python:** reescrevendo o `backend-esocial` (Node descartado;
  fonte preservada em `docs/legacy-esocial-reference/`). 📄 Plano:
  `docs/superpowers/plans/2026-06-13-fatia4-esocial-python.md`.
  - [x] **Fase A** ✅ config + **certificado A1** (`/esocial/*`: validate-certificate,
    GET/PUT /config, DELETE /config/certificado; segredos criptografados; front religado).
    Migration aplicada (`d4e5f6a7b8c9`). 15 testes verdes.
  - [ ] Fase B (assinatura PDF/PAdES), Fase C+ (eventos S-2210/2220/2240 SOAP gov.br +
    assinatura gov.br na nuvem) — exigem o **certificado A1 real** p/ transmitir em homologação.
- [ ] **Rotação de senha do banco + TLS/exposição** (decisão: deixado para o fim do projeto).
- [~] **Limpeza pós-cutover:** ✅ **código** feito — removido `src/integrations/supabase/` +
  dependência `@supabase/supabase-js` + chunk `supabase-vendor` (`864515a`; build sem Supabase).
  Resta: desligar/arquivar o projeto Supabase (infra) e mover o front para `apps/web`.

### Lacunas de backend descobertas pela esteira (backlog)

As telas parciais degradam graciosamente porque dependem de endpoints que ainda
não existem. Para fechá-las, criar no backend (`apps/api`):

**✅ Já fechadas (backend + front religado, com testes):**
- ~~Escrita de empresas (`POST`/`DELETE /empresas`)~~ + ~~`empresa_contatos`~~ — AdminEmpresas.
- ~~`tipos_empresa`~~ (`/tipos-empresa`) — AdminTiposEmpresa.
- ~~`/sst/terceiros`~~ — GestaoTerceiros.
- ~~`origens_contato` / `categorias_clientes_empresa`~~ (`/sst/origens-contato`,
  `/sst/categorias-clientes-empresa`) — SSTClientes.
- ~~**Kanbans legados — atividades, etiquetas e vínculos card↔etiqueta**~~
  (`/kanban/{closer,prospeccao,pos-venda,cross-selling}/{cardId}/atividades`,
  `.../etiquetas`, `.../{cardId}/etiquetas`) — AdminCloser/Prospeccao/PosVenda/CrossSelling.
- ~~**Sinistros**~~ (`/sst/tipos-sinistro`, `/sst/turmas/{id}/sinistros`,
  `/sst/sinistros/{id}/fotos` — escopo via turma→empresa, anti-IDOR) — RegistrarSinistroDialog.
- ~~**Campos estendidos de usuário**~~ (telefone/cpf/endereço/setor/grupo/gestor em
  `/admin/users`, gravados no Profiles) — SSTUsuarios.
- ~~**Catálogo de módulos gravável**~~ (`POST`/`PUT`/`DELETE /white-label/modulos`,
  admin_vertical) — AdminModulos.
- ~~**`blog_user_preferences` / recomendações**~~ (`/blog/recommendations`,
  `/blog/preferences/{sid}`, público) — useBlogAnalytics.
- ~~**Importação de empresas em lote**~~ (religada ao `POST /empresas` +
  `/empresas/{id}/contatos`) — EmpresasImportExport, useImportQueue.
- ~~**`normas_regulamentadoras`**~~ (`/sst/normas-regulamentadoras`, tabela criada na migration
  `c3d4e5f6a7b8`) — AdminCadastrosSST (NormasTab + dropdown de NRs).

**🔴 Restantes (2):**
- **`send-newsletter`** — precisa infra de email/SMTP (parte do "Auth avançado") — newsletter.
- **Degradações pontuais dos kanbans:** movimentações/modelos de prospecção, cópia
  de atividades entre funis (sem endpoint de histórico).

---

### Documentação técnica adicional
Specs, planos e mapas em **`docs/superpowers/`** (ex.: `migracao-front-map.md`,
`automacoes-funil-semantica.md`, planos por fatia). Issue-âncora de status: **GitHub #3**.
