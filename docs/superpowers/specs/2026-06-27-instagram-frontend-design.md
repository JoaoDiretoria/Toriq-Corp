# Instagram — frontend do canal (Fase 1b)

**Data:** 2026-06-27
**Módulo:** Vendas → Canal Instagram (UI)
**Status:** aprovado (Abordagem A — uma seção com abas, espelha `SdrInteligente`)

## Problema

A Fase 1a entregou o **motor de backend** do canal Instagram (webhook de comentários → IA responde público/DM → lead + Conversas), já na `main`. Falta a **interface**: o usuário precisa conectar a conta, criar os gatilhos (palavra-chave → IA), ver os comentários recebidos e ver as próprias postagens — tudo de dentro do sistema. Esta é a Fase 1b.

## Decisões (brainstorming)

1. **Estrutura:** uma seção "Instagram" no dashboard de Vendas com **abas**, espelhando `SdrInteligente` (container com header + badge de status + cards de stats + Tabs). Não criar várias entradas de menu.
2. **Abas:** **Comentários** (padrão) · **Posts** · **Gatilhos** · **Conexão**. Se não conectado, abre na aba **Conexão**.
3. **Posts no 1b:** sim — galeria simples usando o `list_media` já existente (visão rica com comentários por post fica pra Fase 2).
4. **Cards de stats:** sim — exige endpoint novo `GET /vendas/instagram/stats`.
5. Seguir o padrão do front: client por-feature (`vendasInstagramApi`), shadcn/ui, `toast` (sonner), auth por cookie via `@/integrations/api/client`.

## Escopo

**Backend (2 endpoints finos, acréscimo à fatia já mergeada):**
- `GET /vendas/instagram/posts` — chama `instagram_meta.list_media` com as credenciais da empresa; `require_admin`. Sem credenciais (`instagram_user_id`/token) → 400 com mensagem clara (a UI traduz em "conecte o Instagram").
- `GET /vendas/instagram/stats` — contagens escopadas por `empresa_id` a partir de `vendas_instagram_comentarios` + leads IG. `require_admin`.

**Frontend:** client `vendasInstagram.ts` + 5 componentes + fiação da seção nos 6 arquivos.

## Arquitetura

### 1. Backend — endpoints novos em `app/api/vendas_instagram.py`

- `GET /vendas/instagram/posts` → `s.PostPublic[]`:
  - Carrega `VendasDisparoConfig` da empresa; se sem `instagram_user_id` ou `instagram_token_enc` → `HTTPException(400, "configure o Instagram")`.
  - Decripta o token, chama `instagram_meta.list_media(token=..., ig_user_id=...)`, devolve a lista (`id, caption, media_type, media_url, permalink, timestamp, comments_count`). `InstagramError` → `HTTPException(502, str(e))`.
- `GET /vendas/instagram/stats` → `s.InstagramStats`:
  - `comentarios`: `count(vendas_instagram_comentarios)` da empresa.
  - `respondidos`: count onde `respondido_publico OR respondido_dm`.
  - `leads`: `count(vendas_leads)` da empresa com `instagram_user_id IS NOT NULL`.
  - `erros`: count onde `erro IS NOT NULL`.
- Schemas novos em `app/schemas/vendas_instagram.py`: `PostPublic`, `InstagramStats`.
- Testes em `tests/test_vendas_instagram.py`: stats (contagens corretas, escopo por empresa), posts (mock de `list_media`; 400 sem config).

### 2. Frontend — client `src/integrations/api/vendasInstagram.ts`

Objeto `vendasInstagramApi` (espelha `vendasSdrApi`) sobre `api.get/put/post/del`:
- `getConfig()` / `saveConfig(data)` → `/vendas/instagram/config`
- `listGatilhos()` / `createGatilho(d)` / `updateGatilho(id,d)` / `deleteGatilho(id)` → `/vendas/instagram/gatilhos`
- `listComentarios(limit?)` → `/vendas/instagram/comentarios`
- `listPosts()` → `/vendas/instagram/posts`
- `getStats()` → `/vendas/instagram/stats`

Interfaces TS snake_case: `InstagramConfigPublic`, `InstagramConfigUpdate`, `Gatilho`, `GatilhoInput`, `Comentario`, `Post`, `InstagramStats`. Segredos nunca voltam em claro (só `*_set` + `*_masked`).

### 3. Frontend — componentes `src/components/admin/vendas/instagram/`

- **`InstagramCanal.tsx`** (container): header (título + ícone Instagram + badge **Conectado/Não conectado**), card de aviso quando não conectado (botão "Conectar agora" → aba Conexão), **4 StatCards** (Comentários, Respondidos, Leads, Erros — `getStats`), e `Tabs`. Default `comentarios`; se não conectado, default `conexao`. Reusa o `StatCard` no estilo de `SdrInteligente`.
- **`InstagramComentarios.tsx`**: tabela (post id curto, `@usuário`, texto, **status** — badges respondido público/DM/erro, data). Empty-state quando vazio. Reusa `Table`/`Badge`/`Skeleton`.
- **`InstagramPosts.tsx`**: galeria em grid (imagem `media_url`, trecho da legenda, `comments_count`, link `permalink`). Empty/connect-state. Trata 400 (não conectado) mostrando o aviso de conexão.
- **`InstagramGatilhos.tsx`**: lista + `Dialog` de criar/editar (palavra-chave — vazio = "qualquer comentário"; switches responder_publico/responder_dm/ativo; instrução p/ IA; resposta pública fixa opcional). Delete com confirmação.
- **`InstagramConexao.tsx`**: form espelhando o mascaramento do `SdrConfig` (`instagram_user_id`, `instagram_username`, `instagram_verify_token`, `instagram_token` 🔒, `instagram_app_secret` 🔒, com `*_set`/`*_masked` e flags `clear_*`). Mostra a **URL do webhook** (`<API_URL>/vendas/instagram/webhook`) com botão copiar + nota curta de como colar no painel da Meta.

### 4. Fiação da seção `instagram` (6 arquivos — CLAUDE.md)

Adicionar o id de seção `instagram` em: `src/config/modulosTelas.ts`; `src/hooks/usePermissoes.tsx` (`SECAO_PARA_PERMISSAO` + `MODULO_SECOES`); `src/components/admin/AdminSidebar.tsx` (union de tipo + nav); `src/components/sst/SSTSidebar.tsx` (quick-search + sub-item); `src/pages/AdminDashboard.tsx` (`AdminSection` + import + `renderSection` + `getSectionTitle`); `src/pages/SSTDashboard.tsx` (`SECAO_PARA_MODULO` + import + render). A seção pertence ao módulo **Vendas** (mesma permissão das outras telas de Vendas), perto de SDR/Conversas/Disparo. Ícone Instagram (lucide).

## Erros & estados

- **Não conectado:** badge "Não conectado" + card de aviso informativo no topo ("conecte o Instagram para começar a receber comentários"); container abre na aba **Conexão** como nudge. **Comentários e Gatilhos continuam funcionais sem conexão** (dá pra cadastrar gatilhos antes; a lista de comentários só fica vazia). **Só a aba Posts exige credenciais** — sem elas, mostra o aviso de conexão em vez da galeria.
- **Posts 400 (sem credenciais)** / **502 (Graph falhou):** UI mostra mensagem amigável + botão "tentar de novo".
- **Salvar config/gatilho:** `toast` de sucesso/erro; segredos mascarados após salvar.
- Loading via `Skeleton`; empty-states com ícone + texto curto (padrão `SdrInteligente`).

## Testes

- Backend: `tests/test_vendas_instagram.py` — `stats` (contagens + escopo por empresa), `posts` (mock `instagram_meta.list_media`; 400 sem config; 200 com lista).
- Frontend: **sem suíte de unit** (padrão do repo). Gate = `npm run build` (typecheck/integração) + `npm run lint`. Verificar apenas os arquivos tocados.

## Fora de escopo (Fase 2+)

- Visão rica de posts (comentários por post, responder inline a partir do post).
- Publicar/agendar posts (Fase 3).
- OAuth de conexão; conversa por DM pós-resposta (webhook `messages`).
- Cards de stats em tempo real via SSE (por enquanto recarrega ao abrir/salvar).

## Reuso / consistência

- Espelha `SdrInteligente.tsx` (container + Tabs + StatCard) e `SdrConfig.tsx` (mascaramento de segredo).
- Client espelha `vendasSdr.ts`. Backend reusa `instagram_meta.list_media` (Fase 1a) e o `_config_public`/`_require_empresa` já no router.
