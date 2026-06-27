# Instagram — Fase 3: publicar posts (imagem / vídeo / carrossel)

**Data:** 2026-06-27
**Módulo:** Vendas (Toriq Prospecção) → Automação Instagram
**Status:** aprovado

## Problema

Falta publicar conteúdo pelo sistema. A Fase 3 permite **publicar agora** (sem agendamento) um post no Instagram a partir do dashboard: imagem única, vídeo/Reel ou carrossel. A mídia é hospedada no RustFS (URL pública que a Meta busca) e publicada via Content Publishing API.

## Decisões (brainstorming)
1. **Só publicar agora** (sem agendamento/scheduler).
2. **Tipos:** imagem única, vídeo/Reel, carrossel (2+ mídias). Tipo **auto-detectado**: 1 imagem→IMAGE, 1 vídeo→REELS, 2+→CAROUSEL.
3. **Fila + tabela de status:** vídeo é assíncrono na Meta (poll até `FINISHED`) e carrossel são várias chamadas encadeadas; publicar dentro do request estouraria timeout e esconderia falhas parciais. Por isso: enfileira + acompanha por status.

## Arquitetura

### 1. Content Publishing API (resumo dos fluxos)
- **Imagem:** `POST /{ig}/media` `{image_url, caption}` → `creation_id` → `POST /{ig}/media_publish` `{creation_id}`.
- **Vídeo/Reel:** `POST /{ig}/media` `{media_type: REELS, video_url, caption}` → `creation_id`; **poll** `GET /{creation_id}?fields=status_code` até `FINISHED` (≠ `IN_PROGRESS`); então `media_publish`.
- **Carrossel:** para cada item `POST /{ig}/media` `{image_url|video_url, is_carousel_item: true}` → child ids (vídeos-filho também precisam de poll); depois `POST /{ig}/media` `{media_type: CAROUSEL, children: id1,id2,..., caption}` → `creation_id` → `media_publish`.
- Limite Meta: ~25 posts/24h, 2–10 itens no carrossel.

### 2. Storage da mídia
- Upload do(s) arquivo(s) para o RustFS via `storage_service.upload(bucket, key, data, content_type)` → **URL pública** (`_public_url`). Bucket dedicado (allowlist em `app/api/storage.py`), key `instagram/{empresa_id}/{uuid}.{ext}`.
- **Dependência:** o bucket precisa de leitura pública (Meta busca a URL sem auth). Documentar; se não público, a publicação falha com erro claro.

### 3. Integração (`app/integrations/instagram_meta.py` — novas funções)
- `criar_container(*, token, ig_user_id, image_url=None, video_url=None, media_type=None, caption=None, is_carousel_item=False, children=None) -> str` (creation_id). Monta o POST conforme os params.
- `status_container(*, token, creation_id) -> str` (status_code: `FINISHED`/`IN_PROGRESS`/`ERROR`).
- `publicar_container(*, token, ig_user_id, creation_id) -> str` (ig_media_id).
- Erros → `InstagramError`.

### 4. Model + migration
- `vendas_instagram_publicacoes`: `id, empresa_id (FK CASCADE), tipo (IMAGE|REELS|CAROUSEL), caption, midias (JSONB: [{url, tipo}]), status (processando|publicado|erro, default processando), creation_id, ig_media_id, erro, created_at, updated_at`. Índice por empresa_id. Registrar o model em `app/models/__init__.py`.
- Migration Alembic (id hex novo, verificar head).

### 5. Service (`app/services/vendas_instagram.py`)
- `iniciar_publicacao(db, *, empresa_id, tipo, midias) -> VendasInstagramPublicacoes` — cria a linha (status processando) com as URLs já no storage; **não** chama a Meta (o router commita e enfileira). Caption incluída.
- `executar_publicacao(db, *, publicacao_id)` — handler da fila (`instagram_publicar`): carrega a linha + config; cria container(s) conforme o tipo; faz poll de vídeo (com limite de tentativas/espera — ex.: até ~20 tentativas × 5s; estourou → erro); publica; grava `ig_media_id` + status `publicado`. Qualquer `InstagramError`/timeout → status `erro` + mensagem. Commita (entry-point de fila). **Idempotente**: pula se já `publicado`.

### 6. Endpoints (`app/api/vendas_instagram.py`)
- `POST /vendas/instagram/publicar` (`require_admin`, **multipart**: `files[]` + `caption` + opcional `tipo`):
  - Valida config (token + ig_user_id). Sem isso → 400.
  - Detecta o tipo pelas mídias (1 img→IMAGE, 1 vid→REELS, 2+→CAROUSEL); valida count (carrossel 2–10) e content-type.
  - Sobe cada arquivo no RustFS → URLs públicas.
  - `iniciar_publicacao(...)` → commit → `queue.enqueue("instagram_publicar", {publicacao_id})`.
  - Retorna a publicação (status processando) — o front acompanha.
- `GET /vendas/instagram/publicacoes` (`require_admin`) — lista as publicações da empresa (status), ordenado desc.
- Schemas: `PublicacaoPublic`, e a resposta do POST.

### 7. Fila (`app/jobs/queue_handlers.py`)
- `@register("instagram_publicar")` → abre `SessionLocal`, chama `executar_publicacao`. Idempotente.

### 8. Frontend
- **`InstagramPosts.tsx`** — botão "Publicar post" no topo → abre **`InstagramPublicar.tsx`** (Dialog): input de arquivos (1+; aceita imagem/vídeo), preview, legenda, botão Publicar → `vendasInstagramApi.publicar(formData)`; ao enviar, fecha e mostra a publicação na lista.
- **Lista de Publicações**: uma seção (no detalhe da aba Posts ou um bloco acima da galeria) que lista `vendasInstagramApi.listPublicacoes()` com status (processando/publicado/erro). Botão "atualizar" (sem SSE nesta fase).
- **Client** (`vendasInstagram.ts`): `publicar(formData: FormData)` (POST multipart), `listPublicacoes()`.

## Erros & estados
- Sem config → 400. Bucket não-público / Graph falhou / vídeo timeout → status `erro` na linha + mensagem visível.
- Carrossel inválido (contagem) / tipo de arquivo não suportado → 400 no POST.
- UI: "processando…" com spinner; "publicado" (link pro post); "erro" (mensagem + botão tentar de novo que re-enfileira).

## Testes
- Backend: `criar_container`/`status_container`/`publicar_container` (mock httpx — montagem de payload + parse). `executar_publicacao` (mock das 3 funções: imagem feliz; vídeo com poll IN_PROGRESS→FINISHED; carrossel; erro→status erro). `POST /publicar` (mock storage.upload + enqueue; detecção de tipo; 400 sem config; multipart). `GET /publicacoes`.
- Frontend: gate `npm run build` + `npm run lint`.

## Fora de escopo
- Agendamento/scheduler; edição/exclusão de post publicado; rascunhos; SSE de status; alt-text/cover de Reels; tags de produto.

## Dependências externas
- Bucket RustFS com **leitura pública** (Meta busca a mídia).
- App Review da Meta com **`instagram_content_publish`** (além das permissões da Fase 1a).

## Reuso
- `storage_service` (core), padrão de fila (`sdr_qualificar_lote`/webhook), `instagram_meta` (Fase 1a), `VendasDisparoConfig` (credenciais), padrão de model/migration/endpoint da fatia Instagram.
