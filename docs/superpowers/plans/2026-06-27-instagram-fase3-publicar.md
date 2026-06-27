# Instagram Fase 3 — publicar posts (imagem/vídeo/carrossel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar agora um post no Instagram (imagem, vídeo/Reel ou carrossel) a partir do dashboard, com a mídia hospedada no RustFS e a publicação processada por fila com status visível.

**Architecture:** Endpoint multipart sobe a(s) mídia(s) no RustFS (URL pública), cria uma linha `vendas_instagram_publicacoes` (status processando) e enfileira `instagram_publicar`. O job cria container(s) na Graph (poll de vídeo até FINISHED) e publica, atualizando a linha. Front: dialog de upload + lista de publicações com status.

**Tech Stack:** FastAPI (UploadFile/multipart), SQLAlchemy async, Alembic, fila Redis com fallback inline, boto3/RustFS; React+TS.

**Spec:** `docs/superpowers/specs/2026-06-27-instagram-fase3-publicar-design.md`

**Convenções:** backend de `apps/api`; serviço de fila commita; auth de teste por cookie. Já estamos na branch `feature/instagram-posts-publicacao`. Aplicar migration no DB de dev.

---

## Task 1: Model + migration + bucket

**Files:**
- Create: `apps/api/migrations/versions/a9b0c1d2e3f4_instagram_publicacoes.py`
- Modify: `apps/api/app/models/vendas_instagram.py` (novo model)
- Modify: `apps/api/app/models/__init__.py` (já importa `vendas_instagram` — nada a fazer; confirme)
- Modify: `apps/api/app/api/storage.py` (add bucket `instagram-media` à allowlist)

- [ ] **Step 1: Confirmar head + id único**

Run (de `apps/api`): `uv run alembic heads` → deve ser `f8a9b0c1d2e3`. Confirme que `a9b0c1d2e3f4` não existe: `grep -r a9b0c1d2e3f4 migrations/versions` → vazio (senão escolha outro hex de 12).

- [ ] **Step 2: Model**

In `apps/api/app/models/vendas_instagram.py`, adicione (após `VendasInstagramComentarios`):

```python
class VendasInstagramPublicacoes(Base):
    __tablename__ = "vendas_instagram_publicacoes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_instagram_publicacoes_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_instagram_publicacoes_pkey"),
        Index("idx_vendas_instagram_publicacoes_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)  # IMAGE | REELS | CAROUSEL
    caption: Mapped[Optional[str]] = mapped_column(Text)
    midias: Mapped[Optional[list]] = mapped_column(JSONB)  # [{"url":..,"tipo":"image|video"}]
    status: Mapped[str] = mapped_column(Text, server_default=text("'processando'"))
    creation_id: Mapped[Optional[str]] = mapped_column(Text)
    ig_media_id: Mapped[Optional[str]] = mapped_column(Text)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
```
Garanta o import de `JSONB` no topo do arquivo: `from sqlalchemy.dialects.postgresql import JSONB`.

- [ ] **Step 3: Migration**

Create `apps/api/migrations/versions/a9b0c1d2e3f4_instagram_publicacoes.py`:

```python
"""instagram: tabela de publicacoes

Revision ID: a9b0c1d2e3f4
Revises: f8a9b0c1d2e3
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas_instagram_publicacoes",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("midias", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'processando'"), nullable=False),
        sa.Column("creation_id", sa.Text(), nullable=True),
        sa.Column("ig_media_id", sa.Text(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_publicacoes_empresa_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_publicacoes_pkey"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_publicacoes_empresa_id", "vendas_instagram_publicacoes", ["empresa_id"], schema="public")


def downgrade() -> None:
    op.drop_table("vendas_instagram_publicacoes", schema="public")
```

- [ ] **Step 4: Bucket na allowlist**

In `apps/api/app/api/storage.py`, no set `ALLOWED_BUCKETS`, adicione `"instagram-media",`. (Dependência ops: o bucket precisa existir no RustFS e ter leitura pública para a Meta buscar a mídia.)

- [ ] **Step 5: Aplicar + smoke**

Run (de `apps/api`):
```bash
uv run alembic upgrade head
uv run python -c "from app.models.vendas_instagram import VendasInstagramPublicacoes; print('ok', VendasInstagramPublicacoes.__tablename__)"
```
Expected: `Running upgrade f8a9b0c1d2e3 -> a9b0c1d2e3f4` e `ok vendas_instagram_publicacoes`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/migrations/versions/a9b0c1d2e3f4_instagram_publicacoes.py apps/api/app/models/vendas_instagram.py apps/api/app/api/storage.py
git commit -m "feat(instagram): schema de publicacoes + bucket instagram-media"
```

---

## Task 2: Integração — containers + publish

**Files:**
- Modify: `apps/api/app/integrations/instagram_meta.py`
- Test: `apps/api/tests/test_instagram_meta.py` (append)

- [ ] **Step 1: Testes (falhando)**

Append em `apps/api/tests/test_instagram_meta.py`:

```python
@pytest.mark.asyncio
async def test_criar_container_imagem(monkeypatch):
    capt = {}
    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"id": "cre1"}
    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, params, json=None):
            capt["url"] = url; capt["params"] = params; return _Resp()
    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    cid = await ig.criar_container(token="t", ig_user_id="ig1", image_url="http://x/a.jpg", caption="oi")
    assert cid == "cre1"
    assert capt["url"].endswith("/ig1/media")
    assert capt["params"]["image_url"] == "http://x/a.jpg"
    assert capt["params"]["caption"] == "oi"


@pytest.mark.asyncio
async def test_status_e_publicar(monkeypatch):
    seq = {"calls": 0}
    class _Resp:
        def __init__(self, body): self._b = body
        def raise_for_status(self): pass
        def json(self): return self._b
    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url, params): return _Resp({"status_code": "FINISHED"})
        async def post(self, url, params, json=None): return _Resp({"id": "pub1"})
    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    st = await ig.status_container(token="t", creation_id="cre1")
    assert st == "FINISHED"
    mid = await ig.publicar_container(token="t", ig_user_id="ig1", creation_id="cre1")
    assert mid == "pub1"
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_instagram_meta.py -k "container or status_e_publicar" -v`
Expected: FAIL.

- [ ] **Step 3: Implementar**

In `apps/api/app/integrations/instagram_meta.py`, após `list_comentarios`:

```python
async def _post_params(url: str, token: str, params: dict, *, contexto: str) -> dict:
    """POST com params na query (padrão do Content Publishing) + Bearer."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(url, params=params, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha ({contexto}): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede ({contexto}): {e}") from e
        return resp.json()


async def criar_container(
    *, token: str, ig_user_id: str,
    image_url: str | None = None, video_url: str | None = None,
    media_type: str | None = None, caption: str | None = None,
    is_carousel_item: bool = False, children: list[str] | None = None,
) -> str:
    """Cria um container de mídia. Retorna o creation_id."""
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/media"
    params: dict = {}
    if image_url:
        params["image_url"] = image_url
    if video_url:
        params["video_url"] = video_url
    if media_type:
        params["media_type"] = media_type
    if caption is not None:
        params["caption"] = caption
    if is_carousel_item:
        params["is_carousel_item"] = "true"
    if children:
        params["children"] = ",".join(children)
    data = await _post_params(url, token, params, contexto="criar_container")
    return data.get("id") or ""


async def status_container(*, token: str, creation_id: str) -> str:
    """Status de processamento do container (FINISHED|IN_PROGRESS|ERROR|...)."""
    url = f"{BASE}/{GRAPH_VERSION}/{creation_id}"
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.get(url, params={"fields": "status_code"})
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha (status_container): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede (status_container): {e}") from e
        return (resp.json() or {}).get("status_code") or ""


async def publicar_container(*, token: str, ig_user_id: str, creation_id: str) -> str:
    """Publica um container pronto. Retorna o ig_media_id."""
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/media_publish"
    data = await _post_params(url, token, {"creation_id": creation_id}, contexto="publicar_container")
    return data.get("id") or ""
```

- [ ] **Step 4: Rodar p/ ver passar**

Run: `uv run pytest tests/test_instagram_meta.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/integrations/instagram_meta.py apps/api/tests/test_instagram_meta.py
git commit -m "feat(instagram): criar_container/status_container/publicar_container (Content Publishing)"
```

---

## Task 3: Service + fila

**Files:**
- Modify: `apps/api/app/services/vendas_instagram.py`
- Modify: `apps/api/app/jobs/queue_handlers.py`
- Test: `apps/api/tests/test_vendas_instagram.py` (append)

- [ ] **Step 1: Testes (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
@pytest.mark.asyncio
async def test_executar_publicacao_imagem(db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.services import vendas_instagram as svc
    from app.models.vendas_instagram import VendasInstagramPublicacoes

    eid = await _empresa_id(db_session)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    pub = VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=eid, tipo="IMAGE", caption="oi",
        midias=[{"url": "http://x/a.jpg", "tipo": "image"}],
    )
    db_session.add(pub)
    await db_session.commit()

    async def _crc(**kw): return "cre1"
    async def _pub(**kw): return "media1"
    monkeypatch.setattr(svc.instagram_meta, "criar_container", _crc)
    monkeypatch.setattr(svc.instagram_meta, "publicar_container", _pub)

    await svc.executar_publicacao(db_session, publicacao_id=pub.id)
    await db_session.refresh(pub)
    assert pub.status == "publicado"
    assert pub.ig_media_id == "media1"


@pytest.mark.asyncio
async def test_executar_publicacao_video_poll(db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.services import vendas_instagram as svc
    from app.models.vendas_instagram import VendasInstagramPublicacoes

    eid = await _empresa_id(db_session)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    pub = VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=eid, tipo="REELS",
        midias=[{"url": "http://x/v.mp4", "tipo": "video"}],
    )
    db_session.add(pub)
    await db_session.commit()

    estados = iter(["IN_PROGRESS", "FINISHED"])
    async def _crc(**kw): return "cre1"
    async def _st(**kw): return next(estados)
    async def _pub(**kw): return "media2"
    monkeypatch.setattr(svc.instagram_meta, "criar_container", _crc)
    monkeypatch.setattr(svc.instagram_meta, "status_container", _st)
    monkeypatch.setattr(svc.instagram_meta, "publicar_container", _pub)
    monkeypatch.setattr(svc, "_POLL_SLEEP", 0)  # não dormir no teste

    await svc.executar_publicacao(db_session, publicacao_id=pub.id)
    await db_session.refresh(pub)
    assert pub.status == "publicado" and pub.ig_media_id == "media2"


@pytest.mark.asyncio
async def test_executar_publicacao_erro(db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.services import vendas_instagram as svc
    from app.models.vendas_instagram import VendasInstagramPublicacoes

    eid = await _empresa_id(db_session)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    pub = VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=eid, tipo="IMAGE",
        midias=[{"url": "http://x/a.jpg", "tipo": "image"}],
    )
    db_session.add(pub)
    await db_session.commit()

    async def _boom(**kw): raise svc.instagram_meta.InstagramError("falhou")
    monkeypatch.setattr(svc.instagram_meta, "criar_container", _boom)

    await svc.executar_publicacao(db_session, publicacao_id=pub.id)
    await db_session.refresh(pub)
    assert pub.status == "erro" and "falhou" in (pub.erro or "")
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "executar_publicacao" -v`
Expected: FAIL.

- [ ] **Step 3: Implementar o serviço**

In `apps/api/app/services/vendas_instagram.py`, adicione (imports de `asyncio` no topo; `VendasInstagramPublicacoes` do model):

```python
import asyncio
from app.models.vendas_instagram import VendasInstagramPublicacoes

_POLL_SLEEP = 5.0       # s entre polls de vídeo
_POLL_MAX = 24          # ~2 min


async def iniciar_publicacao(
    db: AsyncSession, *, empresa_id: uuid.UUID, tipo: str, caption: str | None, midias: list[dict]
) -> VendasInstagramPublicacoes:
    """Cria a linha de publicação (status processando). NÃO chama a Meta (o router
    commita e enfileira)."""
    pub = VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=empresa_id, tipo=tipo,
        caption=caption, midias=midias, status="processando",
    )
    db.add(pub)
    await db.flush()
    return pub


async def _aguardar_container(token: str, creation_id: str) -> None:
    """Faz poll do container até FINISHED. ERROR/timeout → InstagramError."""
    for _ in range(_POLL_MAX):
        st = await instagram_meta.status_container(token=token, creation_id=creation_id)
        if st == "FINISHED":
            return
        if st == "ERROR":
            raise instagram_meta.InstagramError("processamento da mídia falhou (ERROR)")
        if _POLL_SLEEP:
            await asyncio.sleep(_POLL_SLEEP)
    raise instagram_meta.InstagramError("timeout aguardando processamento da mídia")


async def executar_publicacao(db: AsyncSession, *, publicacao_id: uuid.UUID) -> None:
    """Handler da fila 'instagram_publicar'. Cria container(s), publica e atualiza a
    linha. Idempotente (pula se já publicado). COMMITA ao final."""
    pub = await db.get(VendasInstagramPublicacoes, publicacao_id)
    if pub is None or pub.status == "publicado":
        return
    config = await _carregar_config(db, pub.empresa_id)
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        pub.status = "erro"
        pub.erro = "Instagram não configurado"
        await db.commit()
        return

    token = decrypt_secret(config.instagram_token_enc)
    ig_id = config.instagram_user_id
    midias = pub.midias or []
    try:
        if pub.tipo == "CAROUSEL":
            filhos: list[str] = []
            for m in midias:
                kw = {"image_url": m["url"]} if m.get("tipo") == "image" else {"video_url": m["url"]}
                cid = await instagram_meta.criar_container(
                    token=token, ig_user_id=ig_id, is_carousel_item=True, **kw
                )
                if m.get("tipo") == "video":
                    await _aguardar_container(token, cid)
                filhos.append(cid)
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, media_type="CAROUSEL",
                children=filhos, caption=pub.caption,
            )
        elif pub.tipo == "REELS":
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, media_type="REELS",
                video_url=midias[0]["url"], caption=pub.caption,
            )
            await _aguardar_container(token, creation_id)
        else:  # IMAGE
            creation_id = await instagram_meta.criar_container(
                token=token, ig_user_id=ig_id, image_url=midias[0]["url"], caption=pub.caption,
            )

        pub.creation_id = creation_id
        media_id = await instagram_meta.publicar_container(
            token=token, ig_user_id=ig_id, creation_id=creation_id
        )
        pub.ig_media_id = media_id
        pub.status = "publicado"
        pub.erro = None
    except instagram_meta.InstagramError as exc:
        pub.status = "erro"
        pub.erro = str(exc)

    await db.commit()
```

- [ ] **Step 4: Handler da fila**

In `apps/api/app/jobs/queue_handlers.py`, adicione:

```python
@register("instagram_publicar")
async def _instagram_publicar(payload: dict) -> None:
    """Publica um post do Instagram (container -> poll -> publish) fora do request."""
    pid = payload.get("publicacao_id")
    if not pid:
        return
    from app.core.db import SessionLocal
    from app.services.vendas_instagram import executar_publicacao

    async with SessionLocal() as db:
        await executar_publicacao(db, publicacao_id=uuid.UUID(str(pid)))
```

- [ ] **Step 5: Rodar p/ ver passar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "executar_publicacao" -v`
Expected: PASS (imagem, vídeo-poll, erro).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/vendas_instagram.py apps/api/app/jobs/queue_handlers.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): servico de publicacao (container+poll+publish) + handler de fila"
```

---

## Task 4: Endpoints — publicar (multipart) + listar publicações

**Files:**
- Modify: `apps/api/app/schemas/vendas_instagram.py` (append)
- Modify: `apps/api/app/api/vendas_instagram.py` (2 rotas + imports)
- Test: `apps/api/tests/test_vendas_instagram.py` (append)

- [ ] **Step 1: Testes (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
@pytest.mark.asyncio
async def test_publicar_imagem_enfileira(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod
    from app.models.vendas_instagram import VendasInstagramPublicacoes
    from sqlalchemy import select

    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pub1@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    monkeypatch.setattr(router_mod.storage_service, "upload",
                        lambda **kw: "http://public/instagram-media/x.jpg")
    enq = {}
    async def _enq(nome, payload): enq["nome"] = nome; enq["payload"] = payload
    monkeypatch.setattr(router_mod.queue, "enqueue", _enq)

    files = {"files": ("a.jpg", b"\xff\xd8\xff", "image/jpeg")}
    r = await client.post("/vendas/instagram/publicar", data={"caption": "oi"}, files=files)
    assert r.status_code == 201
    body = r.json()
    assert body["tipo"] == "IMAGE" and body["status"] == "processando"
    assert enq["nome"] == "instagram_publicar"
    pub = await db_session.scalar(select(VendasInstagramPublicacoes).where(
        VendasInstagramPublicacoes.empresa_id == eid))
    assert pub is not None and pub.midias[0]["url"].endswith("x.jpg")


@pytest.mark.asyncio
async def test_publicar_sem_config_400(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pub2@test.com", empresa_id=eid)
    files = {"files": ("a.jpg", b"\xff\xd8\xff", "image/jpeg")}
    r = await client.post("/vendas/instagram/publicar", data={"caption": "x"}, files=files)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_listar_publicacoes(client, db_session):
    from app.models.vendas_instagram import VendasInstagramPublicacoes
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pub3@test.com", empresa_id=eid)
    db_session.add(VendasInstagramPublicacoes(
        id=uuid.uuid4(), empresa_id=eid, tipo="IMAGE", status="publicado",
        ig_media_id="m1", midias=[{"url": "u", "tipo": "image"}]))
    await db_session.commit()
    r = await client.get("/vendas/instagram/publicacoes")
    assert r.status_code == 200
    assert r.json()[0]["status"] == "publicado"
```

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "publicar or publicacoes" -v`
Expected: FAIL (404).

- [ ] **Step 3: Schemas**

Append em `apps/api/app/schemas/vendas_instagram.py`:

```python
# ── Fase 3: publicações ─────────────────────────────────────────────────────────
class PublicacaoPublic(BaseModel):
    id: uuid.UUID
    tipo: str
    caption: Optional[str] = None
    midias: Optional[list] = None
    status: str
    ig_media_id: Optional[str] = None
    erro: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Endpoints**

In `apps/api/app/api/vendas_instagram.py`, garanta imports no topo:
```python
import uuid
from fastapi import File, Form, UploadFile
from app.core.storage import storage_service
from app.core.queue import queue
from app.models.vendas_instagram import VendasInstagramPublicacoes
```
Constantes + rotas (após as de comentários):

```python
_IG_IMAGE_MIME = {"image/jpeg", "image/png"}
_IG_VIDEO_MIME = {"video/mp4", "video/quicktime"}
_IG_BUCKET = "instagram-media"


def _tipo_midia(content_type: str) -> str | None:
    if content_type in _IG_IMAGE_MIME:
        return "image"
    if content_type in _IG_VIDEO_MIME:
        return "video"
    return None


@router.post("/instagram/publicar", response_model=s.PublicacaoPublic, status_code=201)
async def publicar(
    files: list[UploadFile] = File(...),
    caption: str = Form(""),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    config = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if config is None or not config.instagram_user_id or not config.instagram_token_enc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "configure o Instagram")
    if not files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "nenhuma mídia enviada")
    if len(files) > 10:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "carrossel aceita no máximo 10 mídias")

    midias: list[dict] = []
    for f in files:
        ct = f.content_type or ""
        tipo = _tipo_midia(ct)
        if tipo is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"tipo não suportado: {ct}")
        data = await f.read()
        ext = (f.filename or "midia").split(".")[-1][:5]
        key = f"{empresa_id}/{uuid.uuid4()}.{ext}"
        url = storage_service.upload(bucket=_IG_BUCKET, key=key, data=data, content_type=ct)
        midias.append({"url": url, "tipo": tipo})

    if len(midias) >= 2:
        tipo_pub = "CAROUSEL"
    elif midias[0]["tipo"] == "video":
        tipo_pub = "REELS"
    else:
        tipo_pub = "IMAGE"

    from app.services import vendas_instagram as svc
    pub = await svc.iniciar_publicacao(
        db, empresa_id=empresa_id, tipo=tipo_pub, caption=caption or None, midias=midias
    )
    await db.commit()
    await db.refresh(pub)
    await queue.enqueue("instagram_publicar", {"publicacao_id": str(pub.id)})
    return pub


@router.get("/instagram/publicacoes", response_model=list[s.PublicacaoPublic])
async def listar_publicacoes(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
):
    empresa_id = _require_empresa(user)
    rows = (await db.scalars(
        select(VendasInstagramPublicacoes)
        .where(VendasInstagramPublicacoes.empresa_id == empresa_id)
        .order_by(VendasInstagramPublicacoes.created_at.desc())
        .limit(limit)
    )).all()
    return rows
```

> Nota: o teste mocka `router_mod.storage_service.upload` e `router_mod.queue.enqueue` — por isso ambos são importados no namespace do módulo do router.

- [ ] **Step 5: Rodar p/ ver passar + arquivo inteiro**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: PASS (todos).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/schemas/vendas_instagram.py apps/api/app/api/vendas_instagram.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): endpoints publicar (multipart->storage->fila) e listar publicacoes"
```

---

## Task 5: Frontend — dialog publicar + lista de publicações

**Files:**
- Modify: `src/integrations/api/vendasInstagram.ts` (tipos + 2 fns)
- Create: `src/components/admin/vendas/instagram/InstagramPublicar.tsx`
- Modify: `src/components/admin/vendas/instagram/InstagramPosts.tsx` (botão "Publicar post" + lista de publicações)

- [ ] **Step 1: Client**

Em `src/integrations/api/vendasInstagram.ts`, adicione:

```typescript
export interface Publicacao {
  id: string;
  tipo: string;
  caption: string | null;
  midias: { url: string; tipo: string }[] | null;
  status: string;
  ig_media_id: string | null;
  erro: string | null;
  created_at: string | null;
}
```
E no objeto `vendasInstagramApi`:
```typescript
  publicar: (form: FormData) =>
    api.post<Publicacao>("/vendas/instagram/publicar", form),
  listPublicacoes: () => api.get<Publicacao[]>("/vendas/instagram/publicacoes"),
```
> Confirme em `client.ts` que `api.post` aceita `FormData` sem forçar `Content-Type: application/json` (o browser precisa setar o boundary do multipart). Se o client serializa tudo como JSON, adicione um caminho que detecte `FormData` e NÃO faça `JSON.stringify` nem set do header — ajuste mínimo no `client.ts`, preservando o comportamento atual para objetos normais.

- [ ] **Step 2: `InstagramPublicar.tsx`**

Create `src/components/admin/vendas/instagram/InstagramPublicar.tsx`:

```tsx
import { useState } from 'react';
import { vendasInstagramApi } from '@/integrations/api/vendasInstagram';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

export function InstagramPublicar({ open, onOpenChange, onPublicado }: {
  open: boolean; onOpenChange: (v: boolean) => void; onPublicado?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setFiles([]); setCaption(''); };

  const submit = async () => {
    if (files.length === 0) { toast.error('Escolha ao menos 1 mídia'); return; }
    setSending(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('caption', caption);
      await vendasInstagramApi.publicar(form);
      toast.success('Publicação enviada — acompanhe o status');
      reset();
      onOpenChange(false);
      onPublicado?.();
    } catch (err: any) { toast.error(err?.message || 'Erro ao publicar'); }
    finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Publicar post</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ig-files">Mídias (1 = foto/reel · 2+ = carrossel)</Label>
            <input id="ig-files" type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" multiple
                   onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                   className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground" />
            {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ig-cap">Legenda</Label>
            <Textarea id="ig-cap" value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Escreva a legenda…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending}>{sending ? 'Enviando…' : 'Publicar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Botão + lista em `InstagramPosts.tsx`**

Em `src/components/admin/vendas/instagram/InstagramPosts.tsx`:
- importe `useState`/`useEffect`/`useCallback` (se faltar), `import { InstagramPublicar } from './InstagramPublicar';`, `import { vendasInstagramApi, type Post, type Publicacao } from '@/integrations/api/vendasInstagram';`, e ícones `Plus`.
- estado: `const [pubOpen, setPubOpen] = useState(false);` e `const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);`
- função `fetchPublicacoes` que chama `vendasInstagramApi.listPublicacoes()` (catch → []); chame no `useEffect` inicial.
- no topo do render (antes da grid), um cabeçalho com botão: `<div className="flex justify-between items-center"><h3 className="text-sm font-medium">Suas postagens</h3><Button size="sm" onClick={() => setPubOpen(true)}><Plus className="h-4 w-4 mr-2" />Publicar post</Button></div>`
- se `publicacoes.length > 0`, renderize uma lista compacta com `status` (badge: processando/publicado/erro) e `erro` quando houver, com botão "atualizar" chamando `fetchPublicacoes`.
- ao final do componente: `<InstagramPublicar open={pubOpen} onOpenChange={setPubOpen} onPublicado={fetchPublicacoes} />`

- [ ] **Step 4: Build + lint**

Run (repo root): `npm run build` e `npm run lint`
Expected: build OK; lint sem erros novos. Ajuste qualquer prop/import que o build apontar.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/api/vendasInstagram.ts src/components/admin/vendas/instagram/InstagramPublicar.tsx src/components/admin/vendas/instagram/InstagramPosts.tsx
git commit -m "feat(instagram-ui): publicar post (upload de midia) + lista de publicacoes com status"
```

---

## Self-Review
- **Spec coverage:** model+migration+bucket (T1); criar/status/publicar container (T2); iniciar/executar_publicacao + poll de vídeo + fila + idempotência (T3); POST multipart→storage→fila + GET publicacoes + auto-detecção de tipo + limites (T4); dialog upload + lista de status (T5). ✅
- **Placeholders:** nenhum; as notas (FormData no client; bucket público) são checagens concretas.
- **Type consistency:** `criar_container(image_url/video_url/media_type/caption/is_carousel_item/children)` usado igual no serviço; `executar_publicacao(publicacao_id=)` casa com o handler; `iniciar_publicacao(empresa_id,tipo,caption,midias)` casa com o endpoint; `PublicacaoPublic`/`Publicacao` (front) batem.

## Riscos / checagens
1. **`api.post` com FormData** — confirmar no `client.ts` que não força JSON (senão o multipart quebra). Ajuste mínimo se preciso.
2. **Bucket `instagram-media` público no RustFS** — sem leitura pública, a Meta não busca a mídia → status `erro`. Dependência ops.
3. **`instagram_content_publish`** no App Review (externo).
4. Poll de vídeo: `_POLL_SLEEP`/`_POLL_MAX` (~2 min). Mockados a 0 no teste.

## Fora de escopo
Agendamento, editar/excluir post publicado, SSE de status, cover/alt-text de Reels.
