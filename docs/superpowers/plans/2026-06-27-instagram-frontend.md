# Automação Instagram (Fase 1b: frontend + rename do módulo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tela "Automação Instagram" (4 abas: Comentários, Posts, Gatilhos, Conexão) dentro do módulo de Vendas, ligar os endpoints `posts`/`stats` no backend, e renomear o módulo de exibição "Toriq Vendas" → "Toriq Prospecção".

**Architecture:** Frontend espelha `SdrInteligente` (container + StatCards + Tabs) e `SdrConfig` (mascaramento de segredo). Client por-feature `vendasInstagram.ts` espelha `vendasSdr.ts`. Backend acrescenta 2 endpoints finos ao router já existente (`/vendas/instagram/posts` via `list_media`, `/vendas/instagram/stats` via counts). Rename do módulo é cosmético: muda `modulos.nome` no banco (migration) + strings/mapas no front; o id interno `toriq_vendas` NÃO muda.

**Tech Stack:** React 18 + TS + Vite, shadcn/ui (`@/components/ui/*`), TanStack-style fetch manual via `@/integrations/api/client`, `sonner` toast, lucide-react. Backend: FastAPI, SQLAlchemy async, Alembic, pytest.

**Spec:** `docs/superpowers/specs/2026-06-27-instagram-frontend-design.md`

**Convenções:**
- Front sem unit test — **gate = `npm run build`** (de `C:\Users\lukas\Desktop\TORIQ\Toric corp`, Node 20+) + `npm run lint`. Verificar só os arquivos tocados (NÃO usar `tsc` full-repo, que tem erros pré-existentes).
- Backend: rodar de `apps/api`; `uv run pytest ...`; serviços não commitam, router commita.
- Caminhos absolutos ao criar/editar; confira o cwd do shell antes de `git`.

---

## File Structure

**Backend — criar:**
- `apps/api/migrations/versions/f8a9b0c1d2e3_rename_modulo_prospeccao.py` — UPDATE `modulos.nome`.

**Backend — modificar:**
- `apps/api/app/schemas/vendas_instagram.py` — add `PostPublic`, `InstagramStats`.
- `apps/api/app/api/vendas_instagram.py` — add `GET /instagram/posts`, `GET /instagram/stats`.
- `apps/api/tests/test_vendas_instagram.py` — add testes de stats/posts.

**Frontend — criar:**
- `src/integrations/api/vendasInstagram.ts` — client.
- `src/components/admin/vendas/instagram/AutomacaoInstagram.tsx` — container (export `AutomacaoInstagram`).
- `src/components/admin/vendas/instagram/InstagramComentarios.tsx`
- `src/components/admin/vendas/instagram/InstagramPosts.tsx`
- `src/components/admin/vendas/instagram/InstagramGatilhos.tsx`
- `src/components/admin/vendas/instagram/InstagramConexao.tsx`

**Frontend — modificar (fiação + rename):**
- `src/config/modulosTelas.ts`, `src/hooks/usePermissoes.tsx`, `src/hooks/useModulosAtivos.tsx`,
  `src/components/admin/AdminSidebar.tsx`, `src/components/sst/SSTSidebar.tsx`,
  `src/pages/AdminDashboard.tsx`, `src/pages/SSTDashboard.tsx`,
  `src/components/admin/vendas/uso/PainelUso.tsx`.

---

## Task 1: Backend — migration de rename do módulo

**Files:**
- Create: `apps/api/migrations/versions/f8a9b0c1d2e3_rename_modulo_prospeccao.py`

- [ ] **Step 1: Confirmar head e id único**

Run (de `apps/api`): `uv run alembic heads`
Expected: `e7f8a9b0c1d2 (head)`. Se for outro, use-o como `down_revision`. Confirme que `f8a9b0c1d2e3` não existe ainda: `grep -r f8a9b0c1d2e3 migrations/versions` → vazio. Se existir, escolha outro hex de 12 e ajuste todas as ocorrências abaixo.

- [ ] **Step 2: Escrever a migration**

Create `apps/api/migrations/versions/f8a9b0c1d2e3_rename_modulo_prospeccao.py`:

```python
"""rename modulo: Toriq Vendas -> Toriq Prospeccao

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MODULO_ID = "b5c6d7e8-f9a0-4b1c-8d2e-000000000005"


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE public.modulos SET nome = 'Toriq Prospecção' WHERE id = :id"
        ).bindparams(id=_MODULO_ID)
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE public.modulos SET nome = 'Toriq Vendas' WHERE id = :id"
        ).bindparams(id=_MODULO_ID)
    )
```

- [ ] **Step 3: Aplicar e verificar**

Run (de `apps/api`):
```bash
uv run alembic upgrade head
uv run python -c "import asyncio; from sqlalchemy import text; from app.core.db import SessionLocal
async def m():
    async with SessionLocal() as db:
        r = await db.execute(text(\"select nome from public.modulos where id='b5c6d7e8-f9a0-4b1c-8d2e-000000000005'\"))
        print(r.scalar())
asyncio.run(m())"
```
Expected: imprime `Toriq Prospecção`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/versions/f8a9b0c1d2e3_rename_modulo_prospeccao.py
git commit -m "feat(modulos): renomeia modulo de exibicao Toriq Vendas -> Toriq Prospeccao (id inalterado)"
```

---

## Task 2: Backend — endpoints `posts` + `stats`

**Files:**
- Modify: `apps/api/app/schemas/vendas_instagram.py` (append)
- Modify: `apps/api/app/api/vendas_instagram.py` (add 2 rotas + imports)
- Test: `apps/api/tests/test_vendas_instagram.py` (append)

- [ ] **Step 1: Escrever os testes (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
@pytest.mark.asyncio
async def test_stats_conta_por_empresa(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_stats@test.com", empresa_id=eid)
    db_session.add_all([
        VendasInstagramComentarios(id=uuid.uuid4(), empresa_id=eid, comment_id="cs1", respondido_publico=True),
        VendasInstagramComentarios(id=uuid.uuid4(), empresa_id=eid, comment_id="cs2", erro="boom"),
    ])
    db_session.add(VendasLeads(id=uuid.uuid4(), empresa_id=eid, instagram_user_id="us1"))
    await db_session.commit()

    r = await client.get("/vendas/instagram/stats")
    assert r.status_code == 200
    b = r.json()
    assert b["comentarios"] == 2
    assert b["respondidos"] == 1
    assert b["erros"] == 1
    assert b["leads"] == 1


@pytest.mark.asyncio
async def test_posts_sem_config_400(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_posts1@test.com", empresa_id=eid)
    r = await client.get("/vendas/instagram/posts")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_posts_lista_com_config(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod

    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_posts2@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    async def _fake_list_media(*, token, ig_user_id):
        return [{
            "id": "p1", "caption": "oi", "comments_count": 3,
            "media_url": "http://x/p.jpg", "permalink": "http://insta/p1",
            "media_type": "IMAGE", "timestamp": "2026-01-01",
        }]
    monkeypatch.setattr(router_mod.instagram_meta, "list_media", _fake_list_media)

    r = await client.get("/vendas/instagram/posts")
    assert r.status_code == 200
    body = r.json()
    assert body[0]["id"] == "p1"
    assert body[0]["comments_count"] == 3
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "stats or posts" -v`
Expected: FAIL (404 — rotas não existem).

- [ ] **Step 3: Schemas**

Append em `apps/api/app/schemas/vendas_instagram.py`:

```python
# ── Posts (galeria — list_media) ───────────────────────────────────────────────
class PostPublic(BaseModel):
    id: str
    caption: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    permalink: Optional[str] = None
    timestamp: Optional[str] = None
    comments_count: Optional[int] = None


# ── Stats do canal ──────────────────────────────────────────────────────────────
class InstagramStats(BaseModel):
    comentarios: int
    respondidos: int
    leads: int
    erros: int
```

- [ ] **Step 4: Endpoints**

In `apps/api/app/api/vendas_instagram.py`, garanta os imports no topo (alguns já existem):
```python
from sqlalchemy import func, or_, select
from app.models.vendas import VendasLeads
```
Adicione as rotas (após o `GET /instagram/comentarios`):

```python
# ── Stats ───────────────────────────────────────────────────────────────────────
@router.get("/instagram/stats", response_model=s.InstagramStats)
async def get_stats(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    comentarios = await db.scalar(
        select(func.count()).select_from(VendasInstagramComentarios).where(
            VendasInstagramComentarios.empresa_id == empresa_id
        )
    ) or 0
    respondidos = await db.scalar(
        select(func.count()).select_from(VendasInstagramComentarios).where(
            VendasInstagramComentarios.empresa_id == empresa_id,
            or_(
                VendasInstagramComentarios.respondido_publico.is_(True),
                VendasInstagramComentarios.respondido_dm.is_(True),
            ),
        )
    ) or 0
    erros = await db.scalar(
        select(func.count()).select_from(VendasInstagramComentarios).where(
            VendasInstagramComentarios.empresa_id == empresa_id,
            VendasInstagramComentarios.erro.isnot(None),
        )
    ) or 0
    leads = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.instagram_user_id.isnot(None),
        )
    ) or 0
    return s.InstagramStats(
        comentarios=comentarios, respondidos=respondidos, leads=leads, erros=erros
    )


# ── Posts (galeria via list_media) ──────────────────────────────────────────────
@router.get("/instagram/posts", response_model=list[s.PostPublic])
async def listar_posts(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "configure o Instagram (conta + token) para ver os posts",
        )
    token = decrypt_secret(config.instagram_token_enc)
    try:
        posts = await instagram_meta.list_media(
            token=token, ig_user_id=config.instagram_user_id
        )
    except instagram_meta.InstagramError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    campos = ("id", "caption", "media_type", "media_url", "permalink", "timestamp", "comments_count")
    return [s.PostPublic(**{k: p.get(k) for k in campos}) for p in posts]
```

- [ ] **Step 5: Rodar p/ ver passar + regressão do arquivo**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: PASS (todos — os 11 anteriores + stats/posts).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/schemas/vendas_instagram.py apps/api/app/api/vendas_instagram.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): endpoints GET /posts (list_media) e GET /stats"
```

---

## Task 3: Frontend — client `vendasInstagram.ts`

**Files:**
- Create: `src/integrations/api/vendasInstagram.ts`

- [ ] **Step 1: Escrever o client**

Create `src/integrations/api/vendasInstagram.ts`:

```typescript
/**
 * Client de Vendas — Automação Instagram (canal IG estilo ManyChat).
 * Bate com o backend FastAPI (`/vendas/instagram/*`, snake_case). Usa o client
 * interno `@/integrations/api/client` (cookie httpOnly + refresh em 401).
 * Segredos (token, app_secret) nunca voltam em claro — só `*_set` + `*_masked`.
 */
import { api } from "@/integrations/api/client";

export interface InstagramConfigPublic {
  instagram_user_id: string | null;
  instagram_username: string | null;
  instagram_verify_token: string | null;
  instagram_token_set: boolean;
  instagram_token_masked: string | null;
  instagram_app_secret_set: boolean;
}

export interface InstagramConfigUpdate {
  instagram_user_id?: string | null;
  instagram_username?: string | null;
  instagram_verify_token?: string | null;
  instagram_token?: string | null;
  instagram_app_secret?: string | null;
  clear_instagram_token?: boolean | null;
  clear_instagram_app_secret?: boolean | null;
}

export interface Gatilho {
  id: string;
  palavra_chave: string | null;
  ativo: boolean;
  responder_publico: boolean;
  responder_dm: boolean;
  instrucao_ia: string | null;
  resposta_publica_fixa: string | null;
}

export interface GatilhoInput {
  palavra_chave?: string | null;
  ativo?: boolean;
  responder_publico?: boolean;
  responder_dm?: boolean;
  instrucao_ia?: string | null;
  resposta_publica_fixa?: string | null;
}

export interface Comentario {
  id: string;
  comment_id: string;
  media_id: string | null;
  from_username: string | null;
  texto: string | null;
  lead_id: string | null;
  respondido_publico: boolean;
  respondido_dm: boolean;
  resposta_texto: string | null;
  erro: string | null;
  created_at: string | null;
}

export interface Post {
  id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  permalink: string | null;
  timestamp: string | null;
  comments_count: number | null;
}

export interface InstagramStats {
  comentarios: number;
  respondidos: number;
  leads: number;
  erros: number;
}

export const vendasInstagramApi = {
  getConfig: () => api.get<InstagramConfigPublic>("/vendas/instagram/config"),
  saveConfig: (data: InstagramConfigUpdate) =>
    api.put<InstagramConfigPublic>("/vendas/instagram/config", data),

  getStats: () => api.get<InstagramStats>("/vendas/instagram/stats"),

  listGatilhos: () => api.get<Gatilho[]>("/vendas/instagram/gatilhos"),
  createGatilho: (data: GatilhoInput) =>
    api.post<Gatilho>("/vendas/instagram/gatilhos", data),
  updateGatilho: (id: string, data: GatilhoInput) =>
    api.put<Gatilho>(`/vendas/instagram/gatilhos/${id}`, data),
  deleteGatilho: (id: string) =>
    api.del<void>(`/vendas/instagram/gatilhos/${id}`),

  listComentarios: (limit = 50) =>
    api.get<Comentario[]>(`/vendas/instagram/comentarios?limit=${limit}`),

  listPosts: () => api.get<Post[]>("/vendas/instagram/posts"),
};
```

> Confirme em `src/integrations/api/client.ts` os nomes dos métodos (`get/post/put/del`). Se o delete for `delete` em vez de `del`, ajuste. (O CLAUDE.md cita `get/post/put/patch/del`.)

- [ ] **Step 2: Verificar build**

Run (de repo root): `npm run build`
Expected: build OK (sem erro de import/sintaxe no arquivo novo).

- [ ] **Step 3: Commit**

```bash
git add src/integrations/api/vendasInstagram.ts
git commit -m "feat(instagram-ui): client vendasInstagram (config, gatilhos, comentarios, posts, stats)"
```

---

## Task 4: Frontend — telas de leitura (container + Comentários + Posts)

**Files:**
- Create: `src/components/admin/vendas/instagram/AutomacaoInstagram.tsx`
- Create: `src/components/admin/vendas/instagram/InstagramComentarios.tsx`
- Create: `src/components/admin/vendas/instagram/InstagramPosts.tsx`

- [ ] **Step 1: `InstagramComentarios.tsx`**

Create `src/components/admin/vendas/instagram/InstagramComentarios.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Comentario } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageCircle, CheckCircle2, Send, AlertTriangle } from 'lucide-react';

export function InstagramComentarios() {
  const [items, setItems] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasInstagramApi.listComentarios(100);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[InstagramComentarios] erro:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><MessageCircle className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum comentário ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Quando alguém comentar nos seus posts, os comentários e as respostas do agente aparecem aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>@usuário</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Resposta do agente</TableHead>
              <TableHead className="w-44">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.from_username ? `@${c.from_username}` : '—'}</TableCell>
                <TableCell className="max-w-xs truncate" title={c.texto ?? ''}>{c.texto || '—'}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground" title={c.resposta_texto ?? ''}>{c.resposta_texto || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.respondido_publico && <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />Público</Badge>}
                    {c.respondido_dm && <Badge className="bg-blue-600 hover:bg-blue-700 gap-1"><Send className="h-3 w-3" />DM</Badge>}
                    {c.erro && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Erro</Badge>}
                    {!c.respondido_publico && !c.respondido_dm && !c.erro && <Badge variant="secondary">Sem resposta</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `InstagramPosts.tsx`**

Create `src/components/admin/vendas/instagram/InstagramPosts.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Post } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, MessageCircle, ExternalLink, Link2Off } from 'lucide-react';

export function InstagramPosts({ onGoToConexao }: { onGoToConexao?: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoConectado, setNaoConectado] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setNaoConectado(false);
    try {
      const data = await vendasInstagramApi.listPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // 400 = não conectado; demais = erro genérico.
      if (err?.status === 400) setNaoConectado(true);
      console.error('[InstagramPosts] erro:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>;
  }

  if (naoConectado) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Link2Off className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Instagram não conectado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">Conecte sua conta na aba Conexão para ver suas postagens aqui.</p>
          {onGoToConexao && <Button onClick={onGoToConexao}>Ir para Conexão</Button>}
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum post encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">Publique algo no Instagram para vê-lo aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {posts.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          {p.media_url ? (
            <img src={p.media_url} alt={p.caption ?? 'post'} className="aspect-square w-full object-cover" loading="lazy" />
          ) : (
            <div className="aspect-square w-full bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
          )}
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{p.caption || '—'}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" />{p.comments_count ?? 0}</span>
              {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

> Confirme que o client (`@/integrations/api/client`) expõe `err.status` no erro lançado em respostas não-2xx. Se ele lançar outro formato (ex.: `err.response?.status` ou mensagem), ajuste a checagem `err?.status === 400` para o formato real — leia `src/integrations/api/client.ts` antes.

- [ ] **Step 3: `AutomacaoInstagram.tsx` (container)**

Create `src/components/admin/vendas/instagram/AutomacaoInstagram.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { vendasInstagramApi, type InstagramStats } from '@/integrations/api/vendasInstagram';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Instagram, MessageCircle, Image as ImageIcon, Zap, Settings2,
  CheckCircle2, AlertTriangle, Users, Send,
} from 'lucide-react';
import { InstagramComentarios } from './InstagramComentarios';
import { InstagramPosts } from './InstagramPosts';
import { InstagramGatilhos } from './InstagramGatilhos';
import { InstagramConexao } from './InstagramConexao';

export function AutomacaoInstagram() {
  const [tab, setTab] = useState('comentarios');
  const [stats, setStats] = useState<InstagramStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [conectado, setConectado] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try { setStats(await vendasInstagramApi.getStats()); }
    catch { setStats(null); }
    finally { setLoadingStats(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await vendasInstagramApi.getConfig();
      setConectado(!!cfg.instagram_user_id && cfg.instagram_token_set);
    } catch { setConectado(false); }
    finally { setLoadingConfig(false); }
  }, []);

  useEffect(() => { fetchStats(); fetchConfig(); }, [fetchStats, fetchConfig]);

  // Se descobriu que não está conectado, abre na aba Conexão (nudge).
  useEffect(() => {
    if (!loadingConfig && !conectado) setTab('conexao');
  }, [loadingConfig, conectado]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Instagram className="h-6 w-6" />Automação Instagram</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Responda comentários automaticamente com IA (público e direct), no estilo ManyChat.
          </p>
        </div>
        {loadingConfig ? <Skeleton className="h-6 w-32" /> : conectado ? (
          <Badge className="bg-green-600 hover:bg-green-700 gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Conectado</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Não conectado</Badge>
        )}
      </div>

      {!loadingConfig && !conectado && (
        <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Instagram não conectado</p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">Conecte sua conta profissional para começar a receber e responder comentários.</p>
              </div>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0" onClick={() => setTab('conexao')}>
              <Settings2 className="h-4 w-4 mr-2" />Conectar agora
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Comentários" value={stats?.comentarios ?? 0} icon={MessageCircle} loading={loadingStats} />
        <StatCard label="Respondidos" value={stats?.respondidos ?? 0} icon={Send} iconClass="text-green-500" loading={loadingStats} />
        <StatCard label="Leads gerados" value={stats?.leads ?? 0} icon={Users} loading={loadingStats} />
        <StatCard label="Erros" value={stats?.erros ?? 0} icon={AlertTriangle} iconClass="text-amber-500" loading={loadingStats} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="comentarios" className="gap-2"><MessageCircle className="h-4 w-4" />Comentários</TabsTrigger>
          <TabsTrigger value="posts" className="gap-2"><ImageIcon className="h-4 w-4" />Posts</TabsTrigger>
          <TabsTrigger value="gatilhos" className="gap-2"><Zap className="h-4 w-4" />Gatilhos</TabsTrigger>
          <TabsTrigger value="conexao" className="gap-2"><Settings2 className="h-4 w-4" />Conexão</TabsTrigger>
        </TabsList>
        <TabsContent value="comentarios" className="mt-4"><InstagramComentarios /></TabsContent>
        <TabsContent value="posts" className="mt-4"><InstagramPosts onGoToConexao={() => setTab('conexao')} /></TabsContent>
        <TabsContent value="gatilhos" className="mt-4"><InstagramGatilhos /></TabsContent>
        <TabsContent value="conexao" className="mt-4"><InstagramConexao onSaved={() => { fetchConfig(); fetchStats(); }} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconClass, loading }: { label: string; value: number | string; icon: any; iconClass?: string; loading: boolean; }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${iconClass ?? 'text-muted-foreground'}`} />
      </CardContent>
    </Card>
  );
}
```

> Este container importa `InstagramGatilhos` e `InstagramConexao` (Task 5). Se você implementar a Task 4 antes da 5, o `npm run build` vai falhar nesses imports — implemente a Task 5 antes de buildar, ou crie stubs temporários. **Recomendado: faça Tasks 4 e 5 e só então rode o build/commit conjunto.** (O subagent-driven executa em ordem; o revisor de build valida após a Task 5.)

- [ ] **Step 4: Commit (sem build ainda — depende da Task 5)**

```bash
git add src/components/admin/vendas/instagram/AutomacaoInstagram.tsx src/components/admin/vendas/instagram/InstagramComentarios.tsx src/components/admin/vendas/instagram/InstagramPosts.tsx
git commit -m "feat(instagram-ui): container AutomacaoInstagram + telas Comentarios e Posts"
```

---

## Task 5: Frontend — telas de CRUD/config (Gatilhos + Conexão)

**Files:**
- Create: `src/components/admin/vendas/instagram/InstagramGatilhos.tsx`
- Create: `src/components/admin/vendas/instagram/InstagramConexao.tsx`

- [ ] **Step 1: `InstagramGatilhos.tsx`**

Create `src/components/admin/vendas/instagram/InstagramGatilhos.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Gatilho, type GatilhoInput } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Zap, Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY: GatilhoInput = {
  palavra_chave: '', ativo: true, responder_publico: true, responder_dm: false,
  instrucao_ia: '', resposta_publica_fixa: '',
};

export function InstagramGatilhos() {
  const [items, setItems] = useState<Gatilho[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gatilho | null>(null);
  const [form, setForm] = useState<GatilhoInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const d = await vendasInstagramApi.listGatilhos(); setItems(Array.isArray(d) ? d : []); }
    catch { toast.error('Erro ao carregar gatilhos'); setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (g: Gatilho) => {
    setEditing(g);
    setForm({
      palavra_chave: g.palavra_chave ?? '', ativo: g.ativo,
      responder_publico: g.responder_publico, responder_dm: g.responder_dm,
      instrucao_ia: g.instrucao_ia ?? '', resposta_publica_fixa: g.resposta_publica_fixa ?? '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await vendasInstagramApi.updateGatilho(editing.id, form);
      else await vendasInstagramApi.createGatilho(form);
      toast.success(editing ? 'Gatilho atualizado' : 'Gatilho criado');
      setOpen(false);
      fetchItems();
    } catch (err: any) { toast.error(err?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (g: Gatilho) => {
    if (!confirm(`Remover o gatilho "${g.palavra_chave || 'qualquer comentário'}"?`)) return;
    try { await vendasInstagramApi.deleteGatilho(g.id); toast.success('Gatilho removido'); fetchItems(); }
    catch (err: any) { toast.error(err?.message || 'Erro ao remover'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">A palavra-chave dispara a resposta; deixe vazio para responder <strong>qualquer comentário</strong>.</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo gatilho</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4"><Zap className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-semibold">Nenhum gatilho</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">Crie um gatilho para o agente responder comentários automaticamente.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{g.palavra_chave || 'Qualquer comentário'}</span>
                    {g.ativo ? <Badge className="bg-green-600 hover:bg-green-700">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                    {g.responder_publico && <Badge variant="outline">Público</Badge>}
                    {g.responder_dm && <Badge variant="outline">DM</Badge>}
                  </div>
                  {g.instrucao_ia && <p className="text-xs text-muted-foreground mt-1 truncate">IA: {g.instrucao_ia}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(g)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar gatilho' : 'Novo gatilho'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="g-kw">Palavra-chave</Label>
              <Input id="g-kw" value={form.palavra_chave ?? ''} onChange={(e) => setForm((f) => ({ ...f, palavra_chave: e.target.value }))} placeholder="ex.: PREÇO (vazio = qualquer comentário)" />
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="g-pub">Responder publicamente</Label><Switch id="g-pub" checked={!!form.responder_publico} onCheckedChange={(v) => setForm((f) => ({ ...f, responder_publico: v }))} /></div>
            <div className="flex items-center justify-between"><Label htmlFor="g-dm">Mandar DM (comment-to-DM)</Label><Switch id="g-dm" checked={!!form.responder_dm} onCheckedChange={(v) => setForm((f) => ({ ...f, responder_dm: v }))} /></div>
            <div className="space-y-2">
              <Label htmlFor="g-ia">Instrução para a IA (opcional)</Label>
              <Textarea id="g-ia" value={form.instrucao_ia ?? ''} onChange={(e) => setForm((f) => ({ ...f, instrucao_ia: e.target.value }))} placeholder="ex.: ofereça a tabela de preços e peça o WhatsApp" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-fixa">Resposta pública fixa (opcional)</Label>
              <Input id="g-fixa" value={form.resposta_publica_fixa ?? ''} onChange={(e) => setForm((f) => ({ ...f, resposta_publica_fixa: e.target.value }))} placeholder="ex.: te chamei no direct! 📩 (vazio = IA escreve)" />
            </div>
            <div className="flex items-center justify-between"><Label htmlFor="g-ativo">Ativo</Label><Switch id="g-ativo" checked={!!form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

> Confirme que existem `@/components/ui/switch`, `@/components/ui/textarea`, `@/components/ui/dialog` (shadcn). Se algum não existir no projeto, gere via shadcn (`npx shadcn@latest add switch textarea dialog`) ou use o equivalente já presente. Leia `src/components/ui/` antes.

- [ ] **Step 2: `InstagramConexao.tsx`** (espelha o mascaramento do `SdrConfig`)

Create `src/components/admin/vendas/instagram/InstagramConexao.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type InstagramConfigUpdate } from '@/integrations/api/vendasInstagram';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle2, Trash2, Copy, KeyRound } from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export function InstagramConexao({ onSaved }: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const [tokenSet, setTokenSet] = useState(false);
  const [tokenMasked, setTokenMasked] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const [appSecretSet, setAppSecretSet] = useState(false);
  const [appSecretInput, setAppSecretInput] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await vendasInstagramApi.getConfig();
      setUserId(cfg.instagram_user_id ?? '');
      setUsername(cfg.instagram_username ?? '');
      setVerifyToken(cfg.instagram_verify_token ?? '');
      setTokenSet(cfg.instagram_token_set);
      setTokenMasked(cfg.instagram_token_masked ?? null);
      setAppSecretSet(cfg.instagram_app_secret_set);
      setTokenInput(''); setAppSecretInput('');
    } catch (err) { console.error('[InstagramConexao] erro:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const webhookUrl = `${API_URL}/vendas/instagram/webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: InstagramConfigUpdate = {
        instagram_user_id: userId.trim() || null,
        instagram_username: username.trim() || null,
        instagram_verify_token: verifyToken.trim() || null,
      };
      if (tokenInput.trim()) payload.instagram_token = tokenInput.trim();
      if (appSecretInput.trim()) payload.instagram_app_secret = appSecretInput.trim();
      await vendasInstagramApi.saveConfig(payload);
      toast.success('Conexão salva');
      await fetchConfig();
      onSaved?.();
    } catch (err: any) { toast.error(err?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleClearToken = async () => {
    setSaving(true);
    try { await vendasInstagramApi.saveConfig({ clear_instagram_token: true }); await fetchConfig(); onSaved?.(); toast.success('Token removido'); }
    catch (err: any) { toast.error(err?.message || 'Erro'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <Card>
      <CardContent className="space-y-5 py-5 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="ig-uid">IG User ID (conta profissional)</Label>
          <Input id="ig-uid" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="17841400000000000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-user">@usuário (exibição)</Label>
          <Input id="ig-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="minhaempresa" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ig-vt">Verify token (handshake do webhook)</Label>
          <Input id="ig-vt" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="um segredo qualquer que você define" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ig-token" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Token de acesso {!tokenSet && '*'}</Label>
          {tokenSet && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" />Token configurado{tokenMasked && <code className="text-xs font-mono text-foreground">{tokenMasked}</code>}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClearToken} disabled={saving}><Trash2 className="h-3.5 w-3.5 mr-1" />Remover</Button>
            </div>
          )}
          <Input id="ig-token" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={tokenSet ? '•••• (deixe em branco para manter)' : 'token de acesso da Página/Instagram'} autoComplete="new-password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ig-secret" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />App secret (valida assinatura do webhook) {!appSecretSet && '*'}</Label>
          {appSecretSet && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />App secret configurado</p>}
          <Input id="ig-secret" type="password" value={appSecretInput} onChange={(e) => setAppSecretInput(e.target.value)} placeholder={appSecretSet ? '•••• (deixe em branco para manter)' : 'app secret do app da Meta'} autoComplete="new-password" />
        </div>

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs">URL do webhook (cole no painel da Meta)</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs font-mono">{webhookUrl}</code>
            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" onClick={() => { navigator.clipboard?.writeText(webhookUrl); toast.success('URL copiada'); }}><Copy className="h-3.5 w-3.5 mr-1" />Copiar</Button>
          </div>
          <p className="text-xs text-muted-foreground">No app da Meta, assine o campo <strong>comments</strong> e use este Verify Token. Segredos ficam criptografados e nunca voltam em claro.</p>
        </div>

        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar conexão'}</Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Build (agora o container resolve todos os imports)**

Run (de repo root): `npm run build`
Expected: build OK. Corrija qualquer erro de import/props de shadcn que aparecer (ajuste para os componentes reais em `src/components/ui/`).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/vendas/instagram/InstagramGatilhos.tsx src/components/admin/vendas/instagram/InstagramConexao.tsx
git commit -m "feat(instagram-ui): telas Gatilhos (CRUD) e Conexao (credenciais + webhook URL)"
```

---

## Task 6: Frontend — fiação da seção + rename do módulo

**Files (modificar):** `src/config/modulosTelas.ts`, `src/hooks/usePermissoes.tsx`, `src/hooks/useModulosAtivos.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/sst/SSTSidebar.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/SSTDashboard.tsx`, `src/components/admin/vendas/uso/PainelUso.tsx`

> Os números de linha abaixo são referência (do estado atual); confirme o contexto antes de inserir. Use os textos-âncora para localizar.

- [ ] **Step 1: `src/config/modulosTelas.ts`**

(a) Importar o ícone `Instagram` no import do lucide (topo do arquivo, junto dos outros ícones).
(b) No mapa nome→id (linha ~30) trocar a chave:
```typescript
// de:
'Toriq Vendas': 'toriq_vendas',
// para:
'Toriq Prospecção': 'toriq_vendas',
```
(c) No objeto do módulo (linha ~79) trocar o nome e adicionar a tela (após `vendas-sdr`):
```typescript
nome: 'Toriq Prospecção',
// ... dentro de telas, após { id: 'vendas-sdr', ... }:
{ id: 'vendas-instagram', nome: 'Automação Instagram', icone: 'Instagram' },
```

- [ ] **Step 2: `src/hooks/usePermissoes.tsx`**

(a) Em `SECAO_PARA_PERMISSAO`, após `'vendas-sdr'` (linha ~56):
```typescript
'vendas-instagram': { modulo_id: 'toriq_vendas', pagina_id: 'vendas_instagram' },
```
(b) No array `MODULO_SECOES['toriq_vendas']` (linhas ~72-75), adicionar `'vendas-instagram'` após `'vendas-sdr'`.

- [ ] **Step 3: `src/hooks/useModulosAtivos.tsx`**

Trocar a chave/valor do nome do módulo (linhas ~24 e ~30):
```typescript
// linha ~24, no mapa nome->id:
'Toriq Prospecção': 'toriq_vendas',
// linha ~30, no mapa id->nomes:
'toriq_vendas': ['Toriq Prospecção'],
```

- [ ] **Step 4: `src/components/admin/AdminSidebar.tsx`**

(a) Importar `Instagram` do lucide-react (junto dos outros ícones, ~linha 50).
(b) No union `AdminSection`, após `| 'vendas-evolution'` (~linha 94): `| 'vendas-instagram'`.
(c) No grupo de nav (label) trocar (linha ~149): `label: 'Toriq Prospecção',`.
(d) Nos `items` do grupo, após `{ id: 'vendas-sdr', ... }` (~linha 156): `{ id: 'vendas-instagram', label: 'Automação Instagram', icon: Instagram },`.

- [ ] **Step 5: `src/components/sst/SSTSidebar.tsx`**

(a) Importar `Instagram` do lucide-react.
(b) No quick-search (após `vendas-sdr`, ~linha 270): `if (telaVisivel('vendas-instagram')) telas.push({ id: 'vendas-instagram', nome: 'Automação Instagram', icone: 'Instagram', categoria: 'Toriq Prospecção' });`
(c) Trocar as `categoria: 'Toriq Vendas'` das linhas 266-274 para `'Toriq Prospecção'` (todas as 9 — use replace-all no bloco).
(d) No label do grupo (linha ~758): `<span>Toriq Prospecção</span>`.
(e) No bloco de sub-itens da sidebar, após o bloco `vendas-sdr` (~linhas 796-803):
```tsx
{telaVisivel('vendas-instagram') && (
  <SidebarMenuSubItem>
    <SidebarMenuSubButton onClick={() => onSectionChange('vendas-instagram')} isActive={activeSection === 'vendas-instagram'} className="cursor-pointer">
      <Instagram className="h-4 w-4" />
      <span>Automação Instagram</span>
    </SidebarMenuSubButton>
  </SidebarMenuSubItem>
)}
```

- [ ] **Step 6: `src/pages/AdminDashboard.tsx`**

(a) Import (após o import de `SdrInteligente`, ~linha 36): `import { AutomacaoInstagram } from '@/components/admin/vendas/instagram/AutomacaoInstagram';`
(b) No type `AdminSection` (~linha 45), após `'vendas-sdr'`: `| 'vendas-instagram'`.
(c) No `renderSection()` switch, após o case `'vendas-sdr'`:
```typescript
case 'vendas-instagram':
  return <AutomacaoInstagram />;
```
(d) No objeto `titles` de `getSectionTitle()`, trocar os 9 prefixos `'Toriq Vendas — ...'` (linhas 191-199) para `'Toriq Prospecção — ...'` e adicionar:
```typescript
'vendas-instagram': 'Toriq Prospecção — Automação Instagram',
```

- [ ] **Step 7: `src/pages/SSTDashboard.tsx`**

(a) Import (após `SdrInteligente`, ~linha 50): `import { AutomacaoInstagram } from '@/components/admin/vendas/instagram/AutomacaoInstagram';`
(b) Em `SECAO_PARA_MODULO` (após `'vendas-sdr'`, ~linha 94): `'vendas-instagram': 'toriq_vendas',`
(c) No `renderSection()`, após o branch `vendas-sdr` (~linha 517):
```typescript
if (activeSection === 'vendas-instagram') {
  return <AutomacaoInstagram />;
}
```

- [ ] **Step 8: `src/components/admin/vendas/uso/PainelUso.tsx`**

Trocar as 2 menções de "Toriq Vendas" no texto (linhas ~176 e ~281) por "Toriq Prospecção".

- [ ] **Step 9: Verificar build + lint + grep de sobra**

Run (de repo root):
```bash
npm run build
npm run lint
```
Expected: build OK; lint sem erros novos nos arquivos tocados.

Confirme que não sobrou nenhum label de UI antigo (deve restar só comentários/docstrings, que não são UI):
```bash
grep -rn "Toriq Vendas" src --include=*.tsx --include=*.ts
```
Expected: apenas ocorrências em comentários/cabeçalhos de client (`vendas.ts`, etc.) e nada que seja um label renderizado ou chave de mapa de módulo.

- [ ] **Step 10: Commit**

```bash
git add src/config/modulosTelas.ts src/hooks/usePermissoes.tsx src/hooks/useModulosAtivos.tsx src/components/admin/AdminSidebar.tsx src/components/sst/SSTSidebar.tsx src/pages/AdminDashboard.tsx src/pages/SSTDashboard.tsx src/components/admin/vendas/uso/PainelUso.tsx
git commit -m "feat(instagram-ui): fia secao Automacao Instagram + renomeia modulo p/ Toriq Prospeccao"
```

---

## Self-Review (preenchido)

**1. Spec coverage:**
- Rename módulo (banco + mapas + labels) → Task 1 (DB) + Task 6 (front). ✅
- Página "Automação Instagram" + 4 abas → Task 4 (container+Comentários+Posts) + Task 5 (Gatilhos+Conexão). ✅
- Endpoints posts/stats + schemas + testes → Task 2. ✅
- Client `vendasInstagram.ts` → Task 3. ✅
- StatCards (comentarios/respondidos/leads/erros) → Task 4 (container) alimentado por Task 2 (stats). ✅
- Conexão mostra URL do webhook + mascaramento → Task 5. ✅
- Só Posts exige conexão; Comentários/Gatilhos funcionam sem → Task 4/5 (Posts trata 400; demais não dependem). ✅
- Fiação nos 6 arquivos (+useModulosAtivos +PainelUso pelo rename) → Task 6. ✅

**2. Placeholder scan:** sem TBD/TODO; código completo em cada componente. As notas "confirme em `client.ts`/`src/components/ui`" são checagens de integração concretas (nomes de método `del` vs `delete`; formato de erro `err.status`; existência de `switch/textarea/dialog`), guiadas pelo build — não placeholders de lógica.

**3. Type/contract consistency:** `vendasInstagramApi` (Task 3) define `Comentario`, `Post`, `Gatilho`, `InstagramStats`, `InstagramConfigPublic/Update` — usados igualzinho nos componentes (Tasks 4/5). Os endpoints (Task 2) devolvem exatamente esses campos (snake_case). Section id `vendas-instagram` / pagina_id `vendas_instagram` consistente entre Task 6 e o backend já mergeado. Componente `AutomacaoInstagram` exportado e importado pelo mesmo nome nos 2 dashboards.

---

## Riscos & checagens guiadas pelo build (não são placeholders)
1. **`api.del` vs `api.delete`** — confirmar em `src/integrations/api/client.ts` (CLAUDE.md cita `del`).
2. **Formato do erro HTTP** (`err.status`) usado em `InstagramPosts` p/ detectar 400 — confirmar no `client.ts`; ajustar se o shape diferir.
3. **Componentes shadcn** `switch`/`textarea`/`dialog` — confirmar em `src/components/ui/`; gerar se faltar.
4. **`VITE_API_URL`** — usado p/ a URL do webhook; default `http://localhost:8000` (CLAUDE.md).
5. Após o rename, a sidebar/títulos devem mostrar "Toriq Prospecção"; validar visualmente que o módulo continua resolvendo permissões (id `toriq_vendas` intacto).

## Fora de escopo (Fase 2+)
- Visão rica de posts (comentários por post, responder inline), publicar posts, OAuth, SSE de stats.
