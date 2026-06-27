# Instagram Fase 2 — posts com comentários + resposta inline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir um post na aba Posts, listar seus comentários (Graph API ao vivo) e responder manualmente (público e/ou DM) pelo dashboard.

**Architecture:** Acrescenta `list_comentarios` ao client Graph já existente + 2 endpoints no router Instagram (listar comentários de um post; responder manualmente, reusando `reply_public`/`send_private_reply`). Front: modal de detalhe do post com caixa de resposta.

**Tech Stack:** FastAPI, SQLAlchemy async, pytest; React+TS, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-27-instagram-fase2-posts-comentarios-design.md`

**Convenções:** backend de `apps/api` (`uv run pytest`); front gate = `npm run build`+`npm run lint` (só arquivos tocados). Auth de teste por cookie (`login_as` retorna empresa_id). Já estamos na branch `feature/instagram-posts-publicacao`.

---

## Task 1: Integração `list_comentarios`

**Files:**
- Modify: `apps/api/app/integrations/instagram_meta.py`
- Test: `apps/api/tests/test_instagram_meta.py` (append)

- [ ] **Step 1: Teste (falhando)**

Append em `apps/api/tests/test_instagram_meta.py`:

```python
@pytest.mark.asyncio
async def test_list_comentarios_parse(monkeypatch):
    capt = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"data": [
            {"id": "c1", "text": "oi", "username": "fulano", "timestamp": "2026-01-01"},
            {"id": "c2"},
        ]}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url, params):
            capt["url"] = url; capt["params"] = params
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    out = await ig.list_comentarios(token="tok", media_id="m1")
    assert capt["url"].endswith("/m1/comments")
    assert capt["params"]["access_token"] == "tok"
    assert out[0] == {"id": "c1", "text": "oi", "username": "fulano", "timestamp": "2026-01-01"}
    assert out[1] == {"id": "c2", "text": None, "username": None, "timestamp": None}
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_instagram_meta.py::test_list_comentarios_parse -v`
Expected: FAIL (`AttributeError: ... list_comentarios`).

- [ ] **Step 3: Implementar**

In `apps/api/app/integrations/instagram_meta.py`, após `list_media`:

```python
async def list_comentarios(*, token: str, media_id: str) -> list[dict]:
    """Lista os comentários de uma mídia (post). Tolerante a campos ausentes."""
    url = f"{BASE}/{GRAPH_VERSION}/{media_id}/comments"
    params = {"fields": "id,text,username,timestamp", "access_token": token}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.get(url, params=params)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha (list_comentarios): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede (list_comentarios): {e}") from e
        data = resp.json()
    out: list[dict] = []
    for c in data.get("data") or []:
        if not isinstance(c, dict):
            continue
        out.append({
            "id": c.get("id"),
            "text": c.get("text"),
            "username": c.get("username"),
            "timestamp": c.get("timestamp"),
        })
    return out
```

- [ ] **Step 4: Rodar p/ ver passar**

Run: `uv run pytest tests/test_instagram_meta.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/integrations/instagram_meta.py apps/api/tests/test_instagram_meta.py
git commit -m "feat(instagram): list_comentarios (comentarios de um post via Graph)"
```

---

## Task 2: Endpoints — listar comentários do post + responder manual

**Files:**
- Modify: `apps/api/app/schemas/vendas_instagram.py` (append)
- Modify: `apps/api/app/api/vendas_instagram.py` (2 rotas)
- Test: `apps/api/tests/test_vendas_instagram.py` (append)

- [ ] **Step 1: Testes (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
@pytest.mark.asyncio
async def test_listar_comentarios_post(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc1@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    async def _fake(*, token, media_id):
        return [{"id": "c1", "text": "oi", "username": "f", "timestamp": "t"}]
    monkeypatch.setattr(router_mod.instagram_meta, "list_comentarios", _fake)

    r = await client.get("/vendas/instagram/posts/m1/comentarios")
    assert r.status_code == 200
    assert r.json()[0]["id"] == "c1"


@pytest.mark.asyncio
async def test_responder_comentario_publico_e_dm(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod
    from app.models.vendas_instagram import VendasInstagramComentarios
    from sqlalchemy import select

    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc2@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="igself", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    enviados = {"pub": [], "dm": []}
    async def _pub(*, token, comment_id, message): enviados["pub"].append((comment_id, message)); return "r"
    async def _dm(*, token, ig_user_id, comment_id, message): enviados["dm"].append((comment_id, message)); return "m"
    monkeypatch.setattr(router_mod.instagram_meta, "reply_public", _pub)
    monkeypatch.setattr(router_mod.instagram_meta, "send_private_reply", _dm)

    r = await client.post("/vendas/instagram/comentarios/cX/responder",
                          json={"texto": "valeu!", "publico": True, "dm": True})
    assert r.status_code == 200
    assert enviados["pub"] == [("cX", "valeu!")]
    assert enviados["dm"] == [("cX", "valeu!")]
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(
        VendasInstagramComentarios.empresa_id == eid,
        VendasInstagramComentarios.comment_id == "cX",
    ))
    assert reg is not None and reg.respondido_publico is True and reg.respondido_dm is True


@pytest.mark.asyncio
async def test_responder_sem_config_400(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc3@test.com", empresa_id=eid)
    r = await client.post("/vendas/instagram/comentarios/cY/responder",
                          json={"texto": "x", "publico": True, "dm": False})
    assert r.status_code == 400
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "comentarios_post or responder" -v`
Expected: FAIL (404).

- [ ] **Step 3: Schemas**

Append em `apps/api/app/schemas/vendas_instagram.py`:

```python
# ── Fase 2: comentários de um post + resposta manual ───────────────────────────
class ComentarioIG(BaseModel):
    id: Optional[str] = None
    text: Optional[str] = None
    username: Optional[str] = None
    timestamp: Optional[str] = None


class RespostaManual(BaseModel):
    texto: str
    publico: bool = True
    dm: bool = False
    from_username: Optional[str] = None


class RespostaManualResult(BaseModel):
    ok: bool
    respondido_publico: bool
    respondido_dm: bool
```

- [ ] **Step 4: Endpoints**

In `apps/api/app/api/vendas_instagram.py`, após as rotas de posts/stats:

```python
@router.get("/instagram/posts/{media_id}/comentarios", response_model=list[s.ComentarioIG])
async def listar_comentarios_post(
    media_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "configure o Instagram")
    token = decrypt_secret(config.instagram_token_enc)
    try:
        coments = await instagram_meta.list_comentarios(token=token, media_id=media_id)
    except instagram_meta.InstagramError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    return [s.ComentarioIG(**c) for c in coments]


@router.post(
    "/instagram/comentarios/{comment_id}/responder",
    response_model=s.RespostaManualResult,
)
async def responder_comentario(
    comment_id: str,
    payload: s.RespostaManual,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "configure o Instagram")
    token = decrypt_secret(config.instagram_token_enc)

    reg = await db.scalar(
        select(VendasInstagramComentarios).where(
            VendasInstagramComentarios.empresa_id == empresa_id,
            VendasInstagramComentarios.comment_id == comment_id,
        )
    )
    if reg is None:
        reg = VendasInstagramComentarios(
            id=uuid.uuid4(), empresa_id=empresa_id, comment_id=comment_id,
            from_username=payload.from_username,
        )
        db.add(reg)

    pub_ok = dm_ok = False
    try:
        if payload.publico:
            await instagram_meta.reply_public(token=token, comment_id=comment_id, message=payload.texto)
            reg.respondido_publico = True
            pub_ok = True
        if payload.dm:
            await instagram_meta.send_private_reply(
                token=token, ig_user_id=config.instagram_user_id,
                comment_id=comment_id, message=payload.texto,
            )
            reg.respondido_dm = True
            dm_ok = True
    except instagram_meta.InstagramError as exc:
        reg.erro = str(exc)
        await db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    reg.resposta_texto = payload.texto
    await db.commit()
    return s.RespostaManualResult(ok=True, respondido_publico=pub_ok, respondido_dm=dm_ok)
```

> Garanta os imports no topo do router: `HTTPException`, `decrypt_secret`, `instagram_meta`, `VendasDisparoConfig`, `VendasInstagramComentarios`, `select`, `uuid`, `s` — a maioria já existe; adicione só o que faltar.

- [ ] **Step 5: Rodar p/ ver passar**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: PASS (todos).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/schemas/vendas_instagram.py apps/api/app/api/vendas_instagram.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): listar comentarios de um post + responder manual (publico/DM)"
```

---

## Task 3: Frontend — detalhe do post + resposta inline

**Files:**
- Modify: `src/integrations/api/vendasInstagram.ts` (2 fns + tipos)
- Create: `src/components/admin/vendas/instagram/InstagramPostDetalhe.tsx`
- Modify: `src/components/admin/vendas/instagram/InstagramPosts.tsx` (card clicável → abre detalhe)

- [ ] **Step 1: Client**

Em `src/integrations/api/vendasInstagram.ts`, adicione os tipos e funções:

```typescript
export interface ComentarioIG {
  id: string | null;
  text: string | null;
  username: string | null;
  timestamp: string | null;
}

export interface RespostaManualPayload {
  texto: string;
  publico: boolean;
  dm: boolean;
  from_username?: string | null;
}
```
E dentro do objeto `vendasInstagramApi`:
```typescript
  listComentariosPost: (mediaId: string) =>
    api.get<ComentarioIG[]>(`/vendas/instagram/posts/${mediaId}/comentarios`),
  responderComentario: (commentId: string, data: RespostaManualPayload) =>
    api.post<{ ok: boolean; respondido_publico: boolean; respondido_dm: boolean }>(
      `/vendas/instagram/comentarios/${commentId}/responder`, data),
```

- [ ] **Step 2: `InstagramPostDetalhe.tsx`**

Create `src/components/admin/vendas/instagram/InstagramPostDetalhe.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { vendasInstagramApi, type Post, type ComentarioIG } from '@/integrations/api/vendasInstagram';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Send } from 'lucide-react';

export function InstagramPostDetalhe({ post, open, onOpenChange }: {
  post: Post | null; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [comments, setComments] = useState<ComentarioIG[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [modes, setModes] = useState<Record<string, { publico: boolean; dm: boolean }>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const fetchComments = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const data = await vendasInstagramApi.listComentariosPost(post.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[InstagramPostDetalhe] erro:', err);
      toast.error('Erro ao carregar comentários');
      setComments([]);
    } finally { setLoading(false); }
  }, [post]);

  useEffect(() => { if (open && post) fetchComments(); }, [open, post, fetchComments]);

  const modeOf = (id: string) => modes[id] ?? { publico: true, dm: false };

  const responder = async (id: string) => {
    const texto = (drafts[id] || '').trim();
    if (!texto) return;
    const m = modeOf(id);
    if (!m.publico && !m.dm) { toast.error('Escolha público ou DM'); return; }
    setSending(id);
    try {
      await vendasInstagramApi.responderComentario(id, { texto, publico: m.publico, dm: m.dm });
      setDone((d) => ({ ...d, [id]: true }));
      toast.success('Resposta enviada');
    } catch (err: any) { toast.error(err?.message || 'Erro ao responder'); }
    finally { setSending(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Comentários do post</DialogTitle></DialogHeader>
        {post?.caption && <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum comentário neste post.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const id = c.id as string;
              const m = modeOf(id);
              return (
                <div key={id} className="rounded-md border p-3 space-y-2">
                  <div className="text-sm"><span className="font-medium">@{c.username || '—'}</span> <span className="text-muted-foreground">{c.text}</span></div>
                  {done[id] ? (
                    <Badge className="bg-green-600 hover:bg-green-700 gap-1"><Send className="h-3 w-3" />Respondido</Badge>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input value={drafts[id] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} placeholder="Responder…" className="flex-1" />
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={m.publico ? 'default' : 'outline'} onClick={() => setModes((s) => ({ ...s, [id]: { ...m, publico: !m.publico } }))}>Público</Button>
                        <Button type="button" size="sm" variant={m.dm ? 'default' : 'outline'} onClick={() => setModes((s) => ({ ...s, [id]: { ...m, dm: !m.dm } }))}>DM</Button>
                        <Button type="button" size="sm" onClick={() => responder(id)} disabled={sending === id}><Send className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Card clicável em `InstagramPosts.tsx`**

Em `src/components/admin/vendas/instagram/InstagramPosts.tsx`:
- importe `useState` (se ainda não) e `import { InstagramPostDetalhe } from './InstagramPostDetalhe';`
- adicione estado: `const [sel, setSel] = useState<Post | null>(null);`
- no `<Card key={p.id} ...>` adicione `onClick={() => setSel(p)}` e `className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition"`.
- antes do fechamento do componente (no return, após a grid), renderize:
```tsx
      <InstagramPostDetalhe post={sel} open={!!sel} onOpenChange={(v) => !v && setSel(null)} />
```
(Envolva o `return` num fragmento `<>...</>` se necessário para acomodar o Dialog ao lado da grid.)

- [ ] **Step 4: Build + lint**

Run (repo root): `npm run build` e `npm run lint`
Expected: build OK; lint sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/api/vendasInstagram.ts src/components/admin/vendas/instagram/InstagramPostDetalhe.tsx src/components/admin/vendas/instagram/InstagramPosts.tsx
git commit -m "feat(instagram-ui): detalhe do post com comentarios + resposta inline (publico/DM)"
```

---

## Self-Review
- **Spec coverage:** list_comentarios (T1); GET comentarios + POST responder, grava em `vendas_instagram_comentarios` (T2); modal de detalhe + resposta inline público/DM (T3). ✅
- **Placeholders:** nenhum; as notas de import são checagens concretas.
- **Type consistency:** `listComentariosPost`/`responderComentario` (client) batem com os endpoints; `ComentarioIG` igual no back e front; `RespostaManual{texto,publico,dm}` consistente.

## Fora de escopo
Paginação de comentários, replies aninhados, ocultar/excluir comentário.
