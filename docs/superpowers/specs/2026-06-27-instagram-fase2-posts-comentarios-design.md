# Instagram — Fase 2: posts com comentários + resposta inline

**Data:** 2026-06-27
**Módulo:** Vendas (Toriq Prospecção) → Automação Instagram
**Status:** aprovado

## Problema

A aba **Posts** (Fase 1b) mostra a galeria, mas é só leitura: não dá para ver os comentários de um post nem responder manualmente dali. A Fase 2 transforma o post numa visão de trabalho: abrir um post → ver seus comentários (ao vivo, da Graph API) → responder na hora (público e/ou DM) pelo dashboard. A resposta automática por gatilho/IA (Fase 1a) continua valendo em paralelo.

## Escopo

- **Backend:** listar comentários de um post (Graph) + endpoint de resposta manual a um comentário (reusa os envios já prontos).
- **Frontend:** painel/modal de detalhe do post na aba Posts, com lista de comentários + caixa de resposta.

## Arquitetura

### 1. Integração (`app/integrations/instagram_meta.py`)

- `list_comentarios(*, token, media_id) -> list[dict]` — `GET {BASE}/{V}/{media_id}/comments?fields=id,text,username,timestamp,replies&access_token=...`. Devolve `[{id, text, username, timestamp}]` (tolerante; ignora ausências). `InstagramError` em falha HTTP.
- `reply_public` / `send_private_reply` — **já existem** (Fase 1a), reaproveitados.

### 2. Endpoints (`app/api/vendas_instagram.py`)

- `GET /vendas/instagram/posts/{media_id}/comentarios` (`require_admin`) — carrega config da empresa; sem credenciais → 400; chama `list_comentarios`; `InstagramError` → 502. Devolve `list[ComentarioIG]` (schema `{id, text, username, timestamp}`).
- `POST /vendas/instagram/comentarios/{comment_id}/responder` (`require_admin`, body `RespostaManual {texto, publico, dm}`):
  - Valida empresa + config (token + `instagram_user_id`). Sem isso → 400.
  - Se `publico` → `reply_public(token, comment_id, texto)`.
  - Se `dm` → `send_private_reply(token, ig_user_id, comment_id, texto)`.
  - **Registra/atualiza** a linha em `vendas_instagram_comentarios` casando por `comment_id` (cria se não existir, com `from_username`/`texto` se vierem do payload opcional; senão só marca `respondido_*` + `resposta_texto`). Mantém o histórico unificado com as respostas automáticas.
  - `InstagramError` → 502 com a mensagem.
- Schemas novos em `app/schemas/vendas_instagram.py`: `ComentarioIG`, `RespostaManual`, `RespostaManualResult {ok, respondido_publico, respondido_dm}`.

### 3. Frontend (`src/components/admin/vendas/instagram/`)

- **`InstagramPosts.tsx`** — cada card de post fica clicável; ao clicar, abre **`InstagramPostDetalhe.tsx`** (Dialog).
- **`InstagramPostDetalhe.tsx`** (novo): recebe o `post`; busca `vendasInstagramApi.listComentariosPost(media_id)`; lista os comentários; cada um tem uma caixa de resposta com toggle **Público / DM** e botão Enviar → `vendasInstagramApi.responderComentario(comment_id, {texto, publico, dm})`; on success, marca o item como respondido (badge) e `toast`.
- **Client** (`vendasInstagram.ts`): `listComentariosPost(mediaId)`, `responderComentario(commentId, payload)`.

## Erros & estados
- Não conectado / sem credenciais → 400 (UI: "conecte o Instagram").
- Graph falhou → 502 (UI: "erro ao carregar/responder", botão tentar de novo).
- Loading via Skeleton; empty-state quando o post não tem comentários.
- Envio: desabilita o botão durante o request; `toast` sucesso/erro.

## Testes
- Backend (`tests/test_vendas_instagram.py`): `list_comentarios` parse (mock httpx); `GET .../comentarios` (mock `list_comentarios`; 400 sem config); `POST .../responder` (mock `reply_public`/`send_private_reply`; grava em `vendas_instagram_comentarios`; público-only, dm-only, ambos; 400 sem config).
- Frontend: gate `npm run build` + `npm run lint`.

## Fora de escopo
- Paginação de comentários (cursor da Graph) — Fase futura se necessário.
- Threads/replies aninhados (só comentários de 1º nível).
- Excluir/ocultar comentário.

## Reuso
- `reply_public`/`send_private_reply` (Fase 1a), `vendas_instagram_comentarios` (Fase 1a), padrão de endpoint/`_require_empresa`/`_config_public`, e a aba Posts (Fase 1b).
