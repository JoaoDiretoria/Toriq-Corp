# Instagram — automação de comentários (estilo ManyChat)

**Data:** 2026-06-27
**Módulo:** Vendas → Canal Instagram
**Status:** aprovado (Abordagem A — espelhar a fatia WhatsApp)

## Problema

O usuário quer um canal Instagram no Vendas no estilo ManyChat: quando alguém
comenta num post/reel, **o agent (IA do SDR) responde** — publicamente sob o
comentário e/ou por DM (comment-to-DM) — e tudo fica visível no sistema
(comentários recebidos + Conversas + funil). Também quer, em fases futuras, **ver
todos os posts** e **publicar posts** pelo sistema.

O ManyChat é apenas um intermediário da **Graph API da Meta** — a mesma API que o
`whatsapp_meta.py` já usa. ~70% da infraestrutura necessária já existe na fatia
WhatsApp (webhook receiver + HMAC + handshake), no SDR (IA que escreve/qualifica)
e nas Conversas (inbox + SSE). Esta spec cobre **só a Fase 1** (automação de
comentários). Fases 2 (ver posts) e 3 (publicar) terão specs próprias.

## Decisões travadas (brainstorming)

1. **Resposta:** pública **e** DM (comment-to-DM). Publicar posts → Fase 3.
2. **Motor:** **híbrido** — palavra-chave (ou "qualquer comentário") decide SE
   responde; a **IA do SDR escreve** o texto.
3. **Quem comenta vira lead:** cada `@` casa com (ou cria) um `vendas_leads` e
   entra no funil + Conversas + SDR existentes.
4. **Conexão:** colar credenciais manual agora (igual WhatsApp); OAuth depois.
5. **Sem mexer no WhatsApp** que já funciona — reuso por composição.

## Escopo (Fase 1)

- Receber webhook de `comments`, validar (HMAC), descobrir empresa, parsear.
- **Anti-loop** (ignora comentário do próprio `@`) + **idempotência** (dedup por
  `comment_id`).
- Casar/criar lead pela identidade IG; registrar o comentário na thread de
  Conversas (`canal='instagram'`); enfileirar qualificação do lead.
- **Gating híbrido:** se o comentário casa com um gatilho ativo → IA escreve →
  envia resposta pública e/ou DM.
- UI mínima: tela de **config** (credenciais), CRUD de **gatilhos**, lista de
  **comentários recebidos**.

## Arquitetura (Abordagem A)

Fatia vertical nova espelhando `vendas_whatsapp.*`, reusando o que já existe.
Convenções do repo: integrações stateless; serviço não commita (router commita),
**exceto** o handler de webhook, que é ponto de entrada e commita ao final.

```
Meta (webhook field "comments")
   │  POST /vendas/instagram/webhook   (público, HMAC X-Hub-Signature-256)
   ▼
app/api/vendas_instagram.py
   │   descobre empresa: entry[].id == instagram_user_id
   │   valida assinatura: reusa check_signature() de whatsapp_meta (idêntica)
   ▼
app/services/vendas_instagram.py  (processar_comentarios_webhook — commita)
   │  1. anti-loop: from_id == config.instagram_user_id → ignora
   │  2. dedup: comment_id já em vendas_instagram_comentarios → ignora
   │  3. acha/cria lead por instagram_user_id (escopado por empresa)
   │  4. append_mensagem(canal='instagram', sender_type='lead')  ← Conversas+SSE
   │  5. gating: casa_gatilho(texto) → resposta_publica_fixa OU IA escreve
   │  6. envia: instagram_meta.reply_public / send_private_reply
   │  7. grava vendas_instagram_comentarios (respondido_*, resposta_texto, erro)
   │  8. enqueue("sdr_qualificar_lote", {lead_id})  ← qualificação reusada
   ▼
app/integrations/instagram_meta.py  (NOVO)
```

### 1. Integração (`app/integrations/instagram_meta.py` — NOVO)

Estilo igual `whatsapp_meta.py`: `httpx.AsyncClient` stateless, erro de domínio
`InstagramError`. Base/versão reusam a Graph API (`graph.facebook.com`, `v21.0`).

- `parse_webhook(payload) -> list[dict]` — percorre `entry[].changes[]` com
  `field == "comments"`, devolve por comentário:
  `{comment_id, media_id, parent_id, from_id, from_username, texto, timestamp}`.
  Tolerante (campos faltando nunca explodem), igual ao parse do WhatsApp.
- `reply_public(*, token, comment_id, message) -> str` —
  `POST {BASE}/{V}/{comment_id}/replies` com Bearer; retorna o id da resposta.
- `send_private_reply(*, token, ig_user_id, comment_id, message) -> str` —
  `POST {BASE}/{V}/{ig_user_id}/messages` com
  `{"recipient":{"comment_id":...},"message":{"text":...}}` + Bearer. É o
  "private reply" amarrado ao comentário (NÃO depende da janela de 24h; 1 por
  comentário, até 7 dias).
- `list_media(*, token, ig_user_id) -> list[dict]` — `GET {BASE}/{V}/{ig_user_id}/media`
  (campos: id, caption, media_url, permalink, timestamp, comments_count).
  *Já incluído na Fase 1 para a tela poder mostrar a contagem; uso pleno é Fase 2.*
- **Reuso:** `verify_webhook` e `check_signature` são genéricos de webhook Meta —
  importados de `whatsapp_meta` (sem duplicar, sem alterar).

### 2. Router (`app/api/vendas_instagram.py` — NOVO; registrar em `main.py`)

| Rota | Auth | Função |
|---|---|---|
| `GET /vendas/instagram/webhook` | público | handshake (acha empresa por `instagram_verify_token`) |
| `POST /vendas/instagram/webhook` | público (HMAC) | comentários inbound → serviço → commit → `{"ok":true}` |
| `GET /vendas/instagram/config` | `require_role` | credenciais mascaradas + `*_set` |
| `PUT /vendas/instagram/config` | `require_role` | salvar credenciais (cripto em repouso) |
| `GET/POST/PUT/DELETE /vendas/instagram/gatilhos` | `require_role` | CRUD das regras |
| `GET /vendas/instagram/comentarios` | `require_role` | lista p/ a tela (paginada) |

- Descoberta de empresa no POST: `entry[].id` (= IG user id) → `instagram_user_id`.
- HMAC validada contra `instagram_app_secret` (decriptado). Inválida → 403.
- Segue o padrão do `vendas_whatsapp.py`: corpo cru p/ assinatura, tolerante a
  payload não-JSON, sempre 200 quando válido (Meta reenvia se não receber 200).

### 3. Serviço (`app/services/vendas_instagram.py` — NOVO)

- `processar_comentarios_webhook(db, *, empresa_id, comentarios) -> int` —
  orquestra os 8 passos acima; ponto de entrada → **commita**.
- `_achar_ou_criar_lead(db, *, empresa_id, from_id, from_username) -> VendasLeads`
  — casa por `instagram_user_id`; senão cria lead com `nome=@username`,
  `instagram_user_id`, `instagram_username`, `ultimo_canal='instagram'`.
- `_casar_gatilho(texto, gatilhos) -> VendasInstagramGatilhos | None` — match
  case-insensitive por substring; gatilho com `palavra_chave` vazia = "qualquer
  comentário" (avaliado por último, como fallback).
- **Geração do texto:** reusa `vendas_sdr.gerar_resposta(...)` (agnóstico de canal:
  gera + registra em `sdr_interacoes`, **não envia**). A `instrucao_ia` do gatilho
  é injetada no contexto da mensagem enviada à IA. Se o gatilho tem
  `resposta_publica_fixa`, a resposta pública usa o texto fixo (sem IA); o DM,
  quando ligado, usa a IA.
  - **Nota de transação:** `gerar_resposta` **commita internamente**. Como o
    handler processa comentário-a-comentário, isso vira um commit por comentário
    (aceitável e consistente com o inbound de WhatsApp, que já commita no meio do
    fluxo antes de enfileirar o SDR). Se o plano preferir um único commit no fim,
    extrair um `gerar_resposta_sem_commit` aditivo no SDR (não altera o existente).
- **Envio:** `reply_public` e/ou `send_private_reply` conforme as flags do
  gatilho. Tolerante: falha de envio grava `erro` no registro do comentário e não
  derruba o webhook.

### 4. Fila (`app/jobs/queue_handlers.py`)

- Reusa `sdr_qualificar_lote` (já existe) para qualificar o lead recém-criado fora
  do request. Sem handler novo na Fase 1. (A conversa por DM, quando a pessoa
  responde, chega pelo webhook de `messages` — fora do escopo da Fase 1.)

### 5. Modelo de dados (1 migration)

Revisão Alembic com id hex novo (verificar `alembic heads` antes). Aplicar no DB
de teste antes de rodar a suíte.

**`vendas_disparo_config` (colunas novas):**
`instagram_user_id`, `instagram_username`, `instagram_token_enc`,
`instagram_app_secret_enc`, `instagram_verify_token`. (Padrão idêntico às colunas
`whatsapp_*`; segredos nunca serializados → API devolve `*_set`.)

**`vendas_leads` (colunas novas):**
`instagram_user_id` (TEXT, indexado p/ matching), `instagram_username` (TEXT).

**`vendas_instagram_gatilhos` (tabela nova):** `id`, `empresa_id` (FK CASCADE),
`palavra_chave` (TEXT, null/vazio = qualquer), `ativo` (bool, default true),
`responder_publico` (bool), `responder_dm` (bool), `instrucao_ia` (TEXT null),
`resposta_publica_fixa` (TEXT null), `created_at`, `updated_at`.

**`vendas_instagram_comentarios` (tabela nova):** `id`, `empresa_id` (FK CASCADE),
`comment_id` (TEXT), `media_id` (TEXT), `parent_id` (TEXT null), `from_user_id`
(TEXT), `from_username` (TEXT), `texto` (TEXT), `lead_id` (FK SET NULL),
`gatilho_id` (FK SET NULL), `respondido_publico` (bool), `respondido_dm` (bool),
`resposta_texto` (TEXT null), `erro` (TEXT null), `created_at`. Unique
`(empresa_id, comment_id)` → idempotência. Índice por `empresa_id`. Também
alimenta a tela de "comentários recebidos" e (Fase 2) a visão por post.

Models em módulo novo `app/models/vendas_instagram.py` importando `Base` de
`app.models.generated`, schema `"public"`. Schemas Pydantic em
`app/schemas/vendas_instagram.py` (UPDATE omite FKs do pai; FKs do payload
validadas contra o tenant do JWT).

### 6. Frontend (Fase 1 mínima)

Nova seção **Instagram** no dashboard de Vendas. Fiar o id da seção nos 6 arquivos
do CLAUDE.md (`modulosTelas.ts`, `usePermissoes.tsx`, `AdminSidebar.tsx`,
`SSTSidebar.tsx`, `AdminDashboard.tsx`, `SSTDashboard.tsx`). Cliente por-feature em
`src/integrations/api/vendasInstagram.ts` (snake_case, espelha os endpoints).

Telas:
- **Config Instagram** — espelha a config do WhatsApp (campos mascarados + `*_set`).
- **Gatilhos** — CRUD: palavra-chave, flags público/DM, instrução p/ IA, resposta
  pública fixa opcional, ativo.
- **Comentários recebidos** — lista (post, `@`, texto, status respondido/erro).

Os comentários também aparecem nas **Conversas** existentes (gravamos lá), sem
tela nova para isso.

## Erros

- HMAC inválida / empresa não encontrada / sem app_secret → 403 (igual WhatsApp).
- Payload não-JSON → tratado como vazio (200).
- Falha de envio (`InstagramError`) → grava `erro` no comentário; webhook segue 200.
- IA sem configuração (`ValueError`) → não responde; comentário fica registrado
  (gating não dispara resposta, mas o lead/Conversa são criados).
- Anti-loop e dedup garantem que reprocessar o mesmo webhook é seguro.

## Testes (TDD, Postgres real + rollback por teste)

- `tests/test_instagram_meta.py`: `parse_webhook` (comentário, sem texto, campos
  faltando), montagem de payload de `reply_public`/`send_private_reply`, erro HTTP
  — mockando `httpx`.
- `tests/test_vendas_instagram.py`: webhook GET (handshake), POST (assinatura
  inválida → 403; válida → processa), anti-loop (comentário do próprio `@`
  ignorado), idempotência (mesmo `comment_id` 2x), criação/casamento de lead,
  gating (casa/não casa palavra-chave; "qualquer comentário"), envio público e DM
  (mock de `instagram_meta`), gravação em Conversas. CRUD de gatilhos + config
  (segredos mascarados). Usa `tests.helpers.login_as`.

## Fora de escopo (Fase 1)

- **Fase 2:** visão rica de posts (galeria + comentários por post, responder
  inline a partir do post).
- **Fase 3:** publicar/agendar posts (`POST /{ig}/media` + `/media_publish`; exige
  hospedar mídia em URL pública via `S3_*`/RustFS; limite ~25 posts/24h).
- **OAuth** "Conectar Instagram" (fica manual por enquanto).
- Conversa por **DM** após a pessoa responder o private reply (webhook `messages`).
- Webhooks de `mentions` / `live_comments`.

## Pré-requisitos externos (Meta) — começar em paralelo ao código

- Conta Instagram **Professional** (Business/Creator) vinculada a uma Página.
- App Review aprovando `instagram_manage_comments` + `instagram_manage_messages`
  (+ `instagram_basic`, `pages_*`). Antes da aprovação, só roda com contas de
  teste/roles do app. **É o gargalo de prazo.**
- Rate limit a respeitar: ~750 private replies/hora.
