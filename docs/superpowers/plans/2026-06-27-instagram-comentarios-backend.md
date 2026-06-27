# Instagram — automação de comentários (Fase 1a: backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o motor de backend que recebe comentários do Instagram (webhook Meta), faz a IA do SDR responder (público e/ou DM) e registra tudo (lead + Conversas), espelhando a fatia WhatsApp sem alterá-la.

**Architecture:** Fatia vertical nova (`vendas_instagram`) reusando por composição: `whatsapp_meta.check_signature/verify_webhook` (assinatura/handshake idênticos), `vendas_pipeline.append_mensagem` (Conversas + SSE), `vendas_sdr.gerar_resposta` (texto da IA) e a fila `sdr_qualificar_lote`. WhatsApp fica intocado. Segredos criptografados em repouso (`esocial_crypto`), tudo escopado por `empresa_id`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, httpx, pytest (Postgres real com rollback por teste), `uv`.

**Spec:** `docs/superpowers/specs/2026-06-27-instagram-comentarios-design.md`

**Convenções herdadas (ler antes de começar):**
- Serviços NÃO commitam; o router commita — **exceção:** handlers de webhook (ponto de entrada) commitam ao final.
- Integrações são `httpx.AsyncClient` stateless; testes mockam via `monkeypatch.setattr(app.integrations.<mod>, "fn", fake)`.
- Multi-tenant estrutural: toda query escopada por `empresa_id`.
- Migrations: id hex hand-authored único; aplicar no DB **dev e de teste** antes de rodar a suíte.
- **Gotcha de teste (CLAUDE.md):** exporte `TEST_DATABASE_URL` (apontando p/ `db-toriq-test`) no shell, senão a suíte roda no DB de dev. Rode `uv run alembic upgrade head` no DB de teste após a migration.

---

## File Structure

**Criar:**
- `apps/api/migrations/versions/e7f8a9b0c1d2_instagram_comentarios.py` — migration (colunas + 2 tabelas)
- `apps/api/app/models/vendas_instagram.py` — models `VendasInstagramGatilhos`, `VendasInstagramComentarios`
- `apps/api/app/integrations/instagram_meta.py` — client Graph (parse + reply + DM + media)
- `apps/api/app/schemas/vendas_instagram.py` — Pydantic (config/gatilho/comentário)
- `apps/api/app/services/vendas_instagram.py` — orquestração (webhook → lead → Conversas → IA → envio)
- `apps/api/app/api/vendas_instagram.py` — router (webhook + config + gatilhos + comentários)
- `apps/api/tests/test_instagram_meta.py` — testes da integração
- `apps/api/tests/test_vendas_instagram.py` — testes do serviço + endpoints

**Modificar:**
- `apps/api/app/models/vendas_disparo.py` — colunas `instagram_*` em `VendasDisparoConfig`
- `apps/api/app/models/vendas.py` — colunas `instagram_user_id`/`instagram_username` em `VendasLeads`
- `apps/api/app/main.py` — import + `include_router` do router novo

---

## Task 1: Migration + models (schema)

**Files:**
- Create: `apps/api/migrations/versions/e7f8a9b0c1d2_instagram_comentarios.py`
- Create: `apps/api/app/models/vendas_instagram.py`
- Modify: `apps/api/app/models/vendas_disparo.py` (classe `VendasDisparoConfig`, após a linha `whatsapp_rate_limit`)
- Modify: `apps/api/app/models/vendas.py` (classe `VendasLeads`, após `ultimo_canal`)

- [ ] **Step 1: Escrever a migration**

Create `apps/api/migrations/versions/e7f8a9b0c1d2_instagram_comentarios.py`:

```python
"""instagram: comentarios (config + leads + gatilhos + comentarios)

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "e7f8a9b0c1d2"
down_revision = "d6e7f8a9b0c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Credenciais Instagram na MESMA config de disparo (igual whatsapp_*).
    op.add_column("vendas_disparo_config", sa.Column("instagram_user_id", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_username", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_token_enc", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_app_secret_enc", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_disparo_config", sa.Column("instagram_verify_token", sa.Text(), nullable=True), schema="public")

    # 2) Identidade Instagram no lead (p/ casar o @ que comentou).
    op.add_column("vendas_leads", sa.Column("instagram_user_id", sa.Text(), nullable=True), schema="public")
    op.add_column("vendas_leads", sa.Column("instagram_username", sa.Text(), nullable=True), schema="public")
    op.create_index("idx_vendas_leads_instagram_user_id", "vendas_leads", ["empresa_id", "instagram_user_id"], schema="public")

    # 3) Gatilhos (regras híbridas: palavra-chave dispara, IA escreve).
    op.create_table(
        "vendas_instagram_gatilhos",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("palavra_chave", sa.Text(), nullable=True),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("responder_publico", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("responder_dm", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("instrucao_ia", sa.Text(), nullable=True),
        sa.Column("resposta_publica_fixa", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_gatilhos_empresa_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_gatilhos_pkey"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_gatilhos_empresa_id", "vendas_instagram_gatilhos", ["empresa_id"], schema="public")

    # 4) Comentarios (idempotencia + historico + alimenta a tela).
    op.create_table(
        "vendas_instagram_comentarios",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("comment_id", sa.Text(), nullable=False),
        sa.Column("media_id", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Text(), nullable=True),
        sa.Column("from_user_id", sa.Text(), nullable=True),
        sa.Column("from_username", sa.Text(), nullable=True),
        sa.Column("texto", sa.Text(), nullable=True),
        sa.Column("lead_id", sa.Uuid(), nullable=True),
        sa.Column("gatilho_id", sa.Uuid(), nullable=True),
        sa.Column("respondido_publico", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("respondido_dm", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resposta_texto", sa.Text(), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["public.empresas.id"], ondelete="CASCADE", name="vendas_instagram_comentarios_empresa_id_fkey"),
        sa.ForeignKeyConstraint(["lead_id"], ["public.vendas_leads.id"], ondelete="SET NULL", name="vendas_instagram_comentarios_lead_id_fkey"),
        sa.ForeignKeyConstraint(["gatilho_id"], ["public.vendas_instagram_gatilhos.id"], ondelete="SET NULL", name="vendas_instagram_comentarios_gatilho_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="vendas_instagram_comentarios_pkey"),
        sa.UniqueConstraint("empresa_id", "comment_id", name="vendas_instagram_comentarios_empresa_comment_key"),
        schema="public",
    )
    op.create_index("idx_vendas_instagram_comentarios_empresa_id", "vendas_instagram_comentarios", ["empresa_id"], schema="public")


def downgrade() -> None:
    op.drop_table("vendas_instagram_comentarios", schema="public")
    op.drop_table("vendas_instagram_gatilhos", schema="public")
    op.drop_index("idx_vendas_leads_instagram_user_id", table_name="vendas_leads", schema="public")
    op.drop_column("vendas_leads", "instagram_username", schema="public")
    op.drop_column("vendas_leads", "instagram_user_id", schema="public")
    for col in ("instagram_verify_token", "instagram_app_secret_enc", "instagram_token_enc", "instagram_username", "instagram_user_id"):
        op.drop_column("vendas_disparo_config", col, schema="public")
```

- [ ] **Step 2: Adicionar colunas no model `VendasDisparoConfig`**

In `apps/api/app/models/vendas_disparo.py`, logo após `whatsapp_rate_limit` (linha ~79), antes de `created_at`:

```python
    # Instagram (Fase IG-1 — Graph API, comment-to-DM). Token/app_secret cripto.
    instagram_user_id: Mapped[Optional[str]] = mapped_column(Text)
    instagram_username: Mapped[Optional[str]] = mapped_column(Text)
    instagram_token_enc: Mapped[Optional[str]] = mapped_column(Text)
    instagram_app_secret_enc: Mapped[Optional[str]] = mapped_column(Text)
    instagram_verify_token: Mapped[Optional[str]] = mapped_column(Text)
```

- [ ] **Step 3: Adicionar colunas no model `VendasLeads`**

In `apps/api/app/models/vendas.py`, logo após o bloco `ultimo_canal` (linha ~118):

```python
    # Identidade Instagram (Fase IG-1) — casa o @ que comentou com o lead.
    instagram_user_id: Mapped[Optional[str]] = mapped_column(Text)
    instagram_username: Mapped[Optional[str]] = mapped_column(Text)
```

- [ ] **Step 4: Criar os models novos**

Create `apps/api/app/models/vendas_instagram.py`:

```python
"""Models do canal Instagram (Fase IG-1) — gatilhos + comentários.

Tabelas novas (migration e7f8a9b0c1d2). Base compartilhado, schema public,
tenant por empresa_id. As credenciais do IG ficam em vendas_disparo_config
(colunas instagram_*), igual ao WhatsApp.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Index,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasInstagramGatilhos(Base):
    __tablename__ = "vendas_instagram_gatilhos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_instagram_gatilhos_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_instagram_gatilhos_pkey"),
        Index("idx_vendas_instagram_gatilhos_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    palavra_chave: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    responder_publico: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    responder_dm: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    instrucao_ia: Mapped[Optional[str]] = mapped_column(Text)
    resposta_publica_fixa: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasInstagramComentarios(Base):
    __tablename__ = "vendas_instagram_comentarios"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_instagram_comentarios_empresa_id_fkey",
        ),
        ForeignKeyConstraint(
            ["lead_id"], ["public.vendas_leads.id"],
            ondelete="SET NULL", name="vendas_instagram_comentarios_lead_id_fkey",
        ),
        ForeignKeyConstraint(
            ["gatilho_id"], ["public.vendas_instagram_gatilhos.id"],
            ondelete="SET NULL", name="vendas_instagram_comentarios_gatilho_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_instagram_comentarios_pkey"),
        UniqueConstraint(
            "empresa_id", "comment_id",
            name="vendas_instagram_comentarios_empresa_comment_key",
        ),
        Index("idx_vendas_instagram_comentarios_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    comment_id: Mapped[str] = mapped_column(Text, nullable=False)
    media_id: Mapped[Optional[str]] = mapped_column(Text)
    parent_id: Mapped[Optional[str]] = mapped_column(Text)
    from_user_id: Mapped[Optional[str]] = mapped_column(Text)
    from_username: Mapped[Optional[str]] = mapped_column(Text)
    texto: Mapped[Optional[str]] = mapped_column(Text)
    lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    gatilho_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    respondido_publico: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    respondido_dm: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    resposta_texto: Mapped[Optional[str]] = mapped_column(Text)
    erro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
```

- [ ] **Step 5: Aplicar a migration nos DBs dev e de teste**

Run (de `apps/api/`):
```bash
uv run alembic upgrade head
$env:TEST_DATABASE_URL="postgresql+asyncpg://<user>:<pass>@<host>/db-toriq-test"; uv run alembic upgrade head
```
Expected: `Running upgrade d6e7f8a9b0c1 -> e7f8a9b0c1d2` (em ambos). Sem erro de revisão duplicada.

- [ ] **Step 6: Teste-fumaça do schema (tabela existe + model importa)**

Create `apps/api/tests/test_vendas_instagram.py` (início — será expandido nas tasks seguintes):

```python
import uuid

import pytest

from app.models.vendas_instagram import VendasInstagramGatilhos
from tests.helpers import login_as


@pytest.mark.asyncio
async def test_gatilho_model_insere(db_session):
    """A tabela existe (migration aplicada) e o model insere/consulta."""
    from sqlalchemy import select
    from app.models.generated import Empresas

    emp = await db_session.scalar(select(Empresas).limit(1))
    assert emp is not None, "precisa de ao menos 1 empresa no DB de teste"

    g = VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=emp.id, palavra_chave="preco",
        responder_publico=True, responder_dm=True,
    )
    db_session.add(g)
    await db_session.flush()
    achado = await db_session.scalar(
        select(VendasInstagramGatilhos).where(VendasInstagramGatilhos.id == g.id)
    )
    assert achado is not None
    assert achado.responder_dm is True
```

- [ ] **Step 7: Rodar o teste**

Run: `uv run pytest tests/test_vendas_instagram.py::test_gatilho_model_insere -v`
Expected: PASS.

> Se falhar com "relation ... does not exist", a migration não foi aplicada no DB que a suíte usa — confira `TEST_DATABASE_URL` (CLAUDE.md).

- [ ] **Step 8: Commit**

```bash
git add apps/api/migrations/versions/e7f8a9b0c1d2_instagram_comentarios.py apps/api/app/models/vendas_instagram.py apps/api/app/models/vendas_disparo.py apps/api/app/models/vendas.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): schema — config IG, identidade no lead, gatilhos e comentarios"
```

---

## Task 2: Integração `instagram_meta.py` (Graph client)

**Files:**
- Create: `apps/api/app/integrations/instagram_meta.py`
- Test: `apps/api/tests/test_instagram_meta.py`

- [ ] **Step 1: Escrever os testes (falhando)**

Create `apps/api/tests/test_instagram_meta.py`:

```python
import httpx
import pytest

from app.integrations import instagram_meta as ig


def test_parse_webhook_extrai_comentario():
    payload = {
        "entry": [
            {
                "id": "17841400000000000",
                "changes": [
                    {
                        "field": "comments",
                        "value": {
                            "id": "comment_1",
                            "parent_id": None,
                            "media": {"id": "media_9"},
                            "from": {"id": "user_5", "username": "fulano"},
                            "text": "qual o PRECO?",
                            "timestamp": "1700000000",
                        },
                    }
                ],
            }
        ]
    }
    out = ig.parse_webhook(payload)
    assert len(out) == 1
    c = out[0]
    assert c["comment_id"] == "comment_1"
    assert c["media_id"] == "media_9"
    assert c["from_id"] == "user_5"
    assert c["from_username"] == "fulano"
    assert c["texto"] == "qual o PRECO?"


def test_parse_webhook_tolerante_a_campos_faltando():
    assert ig.parse_webhook({}) == []
    assert ig.parse_webhook({"entry": [{"changes": [{"field": "comments", "value": {}}]}]})[0]["comment_id"] is None
    # Ignora changes que não são de comentário.
    assert ig.parse_webhook({"entry": [{"changes": [{"field": "mentions", "value": {"id": "x"}}]}]}) == []


@pytest.mark.asyncio
async def test_reply_public_monta_post(monkeypatch):
    capturado = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"id": "reply_99"}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            capturado["url"] = url
            capturado["json"] = json
            capturado["headers"] = headers
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    rid = await ig.reply_public(token="tok", comment_id="comment_1", message="oi!")
    assert rid == "reply_99"
    assert capturado["url"].endswith("/comment_1/replies")
    assert capturado["json"] == {"message": "oi!"}
    assert capturado["headers"]["Authorization"] == "Bearer tok"


@pytest.mark.asyncio
async def test_send_private_reply_monta_payload(monkeypatch):
    capturado = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"message_id": "mid_1"}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            capturado["url"] = url
            capturado["json"] = json
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    mid = await ig.send_private_reply(token="tok", ig_user_id="ig_1", comment_id="comment_1", message="no direct!")
    assert mid == "mid_1"
    assert capturado["url"].endswith("/ig_1/messages")
    assert capturado["json"]["recipient"] == {"comment_id": "comment_1"}
    assert capturado["json"]["message"] == {"text": "no direct!"}


@pytest.mark.asyncio
async def test_reply_public_erro_http_vira_InstagramError(monkeypatch):
    class _Resp:
        status_code = 400
        text = "bad"
        def raise_for_status(self):
            raise httpx.HTTPStatusError("bad", request=None, response=self)
        def json(self): return {}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    with pytest.raises(ig.InstagramError):
        await ig.reply_public(token="tok", comment_id="c", message="x")
```

- [ ] **Step 2: Rodar os testes p/ ver falhar**

Run: `uv run pytest tests/test_instagram_meta.py -v`
Expected: FAIL com `ModuleNotFoundError: app.integrations.instagram_meta`.

- [ ] **Step 3: Implementar a integração**

Create `apps/api/app/integrations/instagram_meta.py`:

```python
"""Integração com a Graph API da Meta para Instagram (Fase IG-1).

Mesma Graph API do WhatsApp (graph.facebook.com), produto Instagram: webhook do
campo ``comments``, resposta pública sob o comentário, private reply (DM amarrado
ao comentário) e listagem de mídia (posts). Reusa o handshake e a validação de
assinatura HMAC de ``whatsapp_meta`` (são genéricos de webhook Meta).

Estilo: igual a ``whatsapp_meta.py`` — ``httpx.AsyncClient`` stateless, erros HTTP
viram ``InstagramError``.
"""
from __future__ import annotations

import httpx

# Reusa versão/base e os helpers de webhook (idênticos entre canais Meta).
from app.integrations.whatsapp_meta import (  # noqa: F401
    BASE,
    GRAPH_VERSION,
    check_signature,
    verify_webhook,
)

_TIMEOUT = 30.0


class InstagramError(Exception):
    """Erro ao falar com a Graph API (Instagram) — HTTP ou resposta inesperada."""


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — parsing dos comentários (tolerante)
# ═══════════════════════════════════════════════════════════════════════════════

def parse_webhook(payload: dict) -> list[dict]:
    """Extrai os comentários do payload do webhook (campo ``comments``).

    Retorna lista de ``{comment_id, media_id, parent_id, from_id, from_username,
    texto, timestamp}``. Totalmente tolerante: campos faltando viram None e
    ``changes`` de outros campos (mentions, etc.) são ignorados.
    """
    out: list[dict] = []
    if not isinstance(payload, dict):
        return out
    for entry in payload.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            if not isinstance(change, dict) or change.get("field") != "comments":
                continue
            v = change.get("value")
            if not isinstance(v, dict):
                continue
            frm = v.get("from") if isinstance(v.get("from"), dict) else {}
            media = v.get("media") if isinstance(v.get("media"), dict) else {}
            out.append(
                {
                    "comment_id": v.get("id"),
                    "media_id": media.get("id"),
                    "parent_id": v.get("parent_id"),
                    "from_id": frm.get("id"),
                    "from_username": frm.get("username"),
                    "texto": v.get("text"),
                    "timestamp": v.get("timestamp"),
                }
            )
    return out


# ═══════════════════════════════════════════════════════════════════════════════
# Envio — resposta pública e private reply (DM)
# ═══════════════════════════════════════════════════════════════════════════════

async def _post(url: str, token: str, payload: dict, *, contexto: str) -> dict:
    """POST autenticado (Bearer); centraliza o tratamento de erro."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha ({contexto}): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede ({contexto}): {e}") from e
        return resp.json()


async def reply_public(*, token: str, comment_id: str, message: str) -> str:
    """Responde PUBLICAMENTE sob um comentário. Retorna o id da resposta."""
    url = f"{BASE}/{GRAPH_VERSION}/{comment_id}/replies"
    data = await _post(url, token, {"message": message}, contexto="reply_public")
    return data.get("id") or ""


async def send_private_reply(
    *, token: str, ig_user_id: str, comment_id: str, message: str
) -> str:
    """Manda um DM (private reply) amarrado ao comentário (comment-to-DM).

    NÃO depende da janela de 24h: 1 por comentário, até 7 dias. Retorna o
    message_id.
    """
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/messages"
    payload = {"recipient": {"comment_id": comment_id}, "message": {"text": message}}
    data = await _post(url, token, payload, contexto="private_reply")
    return data.get("message_id") or data.get("id") or ""


# ═══════════════════════════════════════════════════════════════════════════════
# Leitura — listar mídia (posts). Uso pleno é Fase 2; aqui p/ contagem na tela.
# ═══════════════════════════════════════════════════════════════════════════════

async def list_media(*, token: str, ig_user_id: str) -> list[dict]:
    """Lista os posts do usuário IG (id, caption, media_url, permalink, etc.)."""
    url = f"{BASE}/{GRAPH_VERSION}/{ig_user_id}/media"
    params = {
        "fields": "id,caption,media_type,media_url,permalink,timestamp,comments_count",
        "access_token": token,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.get(url, params=params)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise InstagramError(
                f"Falha (list_media): HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise InstagramError(f"Erro de rede (list_media): {e}") from e
        data = resp.json()
    return data.get("data") or []
```

> Pré-requisito: confirme que `whatsapp_meta.py` expõe `BASE` e `GRAPH_VERSION` no nível do módulo (expõe — linhas 32-33). Importá-los mantém os dois canais na mesma versão da Graph API.

- [ ] **Step 4: Rodar os testes p/ ver passar**

Run: `uv run pytest tests/test_instagram_meta.py -v`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/integrations/instagram_meta.py apps/api/tests/test_instagram_meta.py
git commit -m "feat(instagram): client Graph — parse comments, reply publico, private reply, list_media"
```

---

## Task 3: Schemas Pydantic

**Files:**
- Create: `apps/api/app/schemas/vendas_instagram.py`

(Sem teste dedicado — schemas são exercitados pelos testes de endpoint da Task 5.)

- [ ] **Step 1: Escrever os schemas**

Create `apps/api/app/schemas/vendas_instagram.py`:

```python
"""Schemas Pydantic do canal Instagram (Fase IG-1).

UPDATE omite FKs do pai (anti mass-assignment); segredos nunca são serializados
de volta (a API devolve ``*_set`` + máscara).
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel


# ── Config (credenciais IG, na vendas_disparo_config) ──────────────────────────
class InstagramConfigUpdate(BaseModel):
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_verify_token: Optional[str] = None
    instagram_token: Optional[str] = None
    instagram_app_secret: Optional[str] = None
    clear_instagram_token: Optional[bool] = None
    clear_instagram_app_secret: Optional[bool] = None


class InstagramConfigPublic(BaseModel):
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_verify_token: Optional[str] = None
    instagram_token_set: bool = False
    instagram_token_masked: Optional[str] = None
    instagram_app_secret_set: bool = False


# ── Gatilhos ───────────────────────────────────────────────────────────────────
class GatilhoCreate(BaseModel):
    palavra_chave: Optional[str] = None
    ativo: bool = True
    responder_publico: bool = True
    responder_dm: bool = False
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None


class GatilhoUpdate(BaseModel):
    palavra_chave: Optional[str] = None
    ativo: Optional[bool] = None
    responder_publico: Optional[bool] = None
    responder_dm: Optional[bool] = None
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None


class GatilhoPublic(BaseModel):
    id: uuid.UUID
    palavra_chave: Optional[str] = None
    ativo: bool
    responder_publico: bool
    responder_dm: bool
    instrucao_ia: Optional[str] = None
    resposta_publica_fixa: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Comentários (leitura) ──────────────────────────────────────────────────────
class ComentarioPublic(BaseModel):
    id: uuid.UUID
    comment_id: str
    media_id: Optional[str] = None
    from_username: Optional[str] = None
    texto: Optional[str] = None
    lead_id: Optional[uuid.UUID] = None
    respondido_publico: bool
    respondido_dm: bool
    resposta_texto: Optional[str] = None
    erro: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Verificar que importa**

Run: `uv run python -c "import app.schemas.vendas_instagram as s; print(s.GatilhoPublic.model_fields.keys())"`
Expected: imprime as chaves do schema, sem erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/schemas/vendas_instagram.py
git commit -m "feat(instagram): schemas Pydantic (config, gatilho, comentario)"
```

---

## Task 4: Serviço `vendas_instagram.py` (orquestração do webhook)

**Files:**
- Create: `apps/api/app/services/vendas_instagram.py`
- Test: `apps/api/tests/test_vendas_instagram.py` (adiciona testes)

- [ ] **Step 1: Escrever os testes do serviço (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
import datetime

from sqlalchemy import select

from app.models.generated import Empresas
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
)


async def _empresa_id(db_session):
    return (await db_session.scalar(select(Empresas).limit(1))).id


async def _config_ig(db_session, empresa_id, *, user_id="ig_self"):
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=empresa_id, instagram_user_id=user_id,
    )
    db_session.add(cfg)
    await db_session.flush()
    return cfg


def _comentario(**over):
    base = {
        "comment_id": "c1", "media_id": "m1", "parent_id": None,
        "from_id": "user_visitante", "from_username": "visitante",
        "texto": "qual o preco?", "timestamp": "1700000000",
    }
    base.update(over)
    return base


@pytest.mark.asyncio
async def test_anti_loop_ignora_comentario_proprio(db_session, monkeypatch):
    """Comentário cujo from_id == instagram_user_id é ignorado (não vira lead)."""
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid, user_id="ig_self")

    n = await svc.processar_comentarios_webhook(
        db_session, empresa_id=eid, comentarios=[_comentario(from_id="ig_self")]
    )
    assert n == 0
    leads = (await db_session.scalars(select(VendasLeads).where(VendasLeads.empresa_id == eid))).all()
    assert all(l.instagram_user_id != "ig_self" for l in leads)


@pytest.mark.asyncio
async def test_idempotencia_pula_comment_repetido(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    monkeypatch.setattr(svc, "_responder", _fake_responder())

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])
    # 2ª vez com o mesmo comment_id: não duplica.
    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    regs = (await db_session.scalars(
        select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid)
    )).all()
    assert len(regs) == 1


@pytest.mark.asyncio
async def test_cria_lead_e_registra_em_conversas(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    chamadas = _fake_responder()
    monkeypatch.setattr(svc, "_responder", chamadas)

    appended = {}
    async def _fake_append(db, **kw):
        appended.update(kw)
    monkeypatch.setattr(svc, "append_mensagem", _fake_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    lead = await db_session.scalar(
        select(VendasLeads).where(
            VendasLeads.empresa_id == eid,
            VendasLeads.instagram_user_id == "user_visitante",
        )
    )
    assert lead is not None
    assert lead.instagram_username == "visitante"
    assert lead.ultimo_canal == "instagram"
    assert appended["canal"] == "instagram"
    assert appended["sender_type"] == "lead"


@pytest.mark.asyncio
async def test_gatilho_dispara_resposta_publica_e_dm(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    cfg = await _config_ig(db_session, eid)
    db_session.add(VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=eid, palavra_chave="preco",
        responder_publico=True, responder_dm=True,
    ))
    await db_session.flush()

    enviados = {"publico": [], "dm": []}
    async def _fake_reply_public(*, token, comment_id, message):
        enviados["publico"].append((comment_id, message)); return "r1"
    async def _fake_private(*, token, ig_user_id, comment_id, message):
        enviados["dm"].append((comment_id, message)); return "m1"
    monkeypatch.setattr(svc.instagram_meta, "reply_public", _fake_reply_public)
    monkeypatch.setattr(svc.instagram_meta, "send_private_reply", _fake_private)

    async def _fake_gerar(db, *, empresa_id, lead_id, mensagem):
        return "Claro! Te explico 👇"
    monkeypatch.setattr(svc.vendas_sdr, "gerar_resposta", _fake_gerar)

    async def _noop_append(db, **kw): pass
    monkeypatch.setattr(svc, "append_mensagem", _noop_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario(texto="qual o PRECO?")])

    assert enviados["publico"] == [("c1", "Claro! Te explico 👇")]
    assert enviados["dm"] == [("c1", "Claro! Te explico 👇")]
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid))
    assert reg.respondido_publico is True
    assert reg.respondido_dm is True


@pytest.mark.asyncio
async def test_sem_gatilho_nao_responde_mas_registra(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    # nenhum gatilho cadastrado
    enviou = {"n": 0}
    async def _fake_reply_public(**kw): enviou["n"] += 1; return "r"
    monkeypatch.setattr(svc.instagram_meta, "reply_public", _fake_reply_public)
    async def _noop_append(db, **kw): pass
    monkeypatch.setattr(svc, "append_mensagem", _noop_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    assert enviou["n"] == 0
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid))
    assert reg is not None
    assert reg.respondido_publico is False


def _fake_responder():
    async def _fn(db, *, config, lead, gatilho, comentario, registro):
        return None
    return _fn
```

> Nota: alguns testes monkeypatcham `svc._responder` (caminho default), outros
> testam o `_responder` real mockando `instagram_meta`/`vendas_sdr`. Mantenha os
> dois para isolar orquestração (lead/Conversas) do envio.

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: FAIL com `ModuleNotFoundError: app.services.vendas_instagram`.

- [ ] **Step 3: Implementar o serviço**

Create `apps/api/app/services/vendas_instagram.py`:

```python
"""Toriq Vendas — canal Instagram (Fase IG-1): serviço de orquestração.

Ponto de entrada: ``processar_comentarios_webhook`` (chamado pelo router do
webhook). Para cada comentário recebido:
  1. anti-loop: ignora comentário do próprio @ (senão responde a si mesmo ∞);
  2. idempotência: pula comment_id já registrado;
  3. acha/cria o lead pela identidade IG (escopado por empresa);
  4. registra na thread de Conversas (canal='instagram') — reusa append_mensagem;
  5. gating híbrido: se casa um gatilho ativo, a IA do SDR escreve e enviamos
     resposta pública e/ou DM;
  6. enfileira a qualificação do lead (reusa 'sdr_qualificar_lote').

Convenção: este é um ponto de entrada de webhook → COMMITA ao final. (Reusa
``append_mensagem`` e ``gerar_resposta``, que também commitam internamente — ok,
vira um commit por comentário, igual ao inbound de WhatsApp.)
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret
from app.integrations import instagram_meta
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
)
from app.services import vendas_sdr
from app.services.vendas_pipeline import append_mensagem


async def _carregar_config(db: AsyncSession, empresa_id: uuid.UUID) -> VendasDisparoConfig | None:
    return await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )


async def _achar_ou_criar_lead(
    db: AsyncSession, *, empresa_id: uuid.UUID, from_id: str, from_username: str | None
) -> VendasLeads:
    """Casa o lead por instagram_user_id (escopo empresa); senão cria um novo."""
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.instagram_user_id == from_id,
        )
    )
    if lead is not None:
        return lead
    lead = VendasLeads(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome=(f"@{from_username}" if from_username else "Instagram"),
        instagram_user_id=from_id,
        instagram_username=from_username,
        origem="instagram",
        ultimo_canal="instagram",
    )
    db.add(lead)
    await db.flush()
    return lead


def _casar_gatilho(
    texto: str | None, gatilhos: list[VendasInstagramGatilhos]
) -> VendasInstagramGatilhos | None:
    """Match case-insensitive por substring. Gatilho com palavra_chave vazia
    ('qualquer comentário') é avaliado por último, como fallback."""
    txt = (texto or "").lower()
    coringa: VendasInstagramGatilhos | None = None
    for g in gatilhos:
        chave = (g.palavra_chave or "").strip().lower()
        if not chave:
            coringa = coringa or g
            continue
        if chave in txt:
            return g
    return coringa


async def _responder(
    db: AsyncSession,
    *,
    config: VendasDisparoConfig,
    lead: VendasLeads,
    gatilho: VendasInstagramGatilhos,
    comentario: dict,
    registro: VendasInstagramComentarios,
) -> None:
    """Gera (IA) e envia a resposta conforme o gatilho. Tolerante: falha de envio
    grava ``erro`` no registro e não derruba o webhook."""
    token = decrypt_secret(config.instagram_token_enc) if config.instagram_token_enc else ""
    comment_id = comentario.get("comment_id") or ""

    precisa_ia = bool(gatilho.responder_dm) or (
        gatilho.responder_publico and not gatilho.resposta_publica_fixa
    )
    texto_ia = ""
    if precisa_ia:
        mensagem = comentario.get("texto") or ""
        if gatilho.instrucao_ia:
            mensagem = f"{mensagem}\n\n[Instrução para a resposta: {gatilho.instrucao_ia}]"
        try:
            texto_ia = await vendas_sdr.gerar_resposta(
                db, empresa_id=lead.empresa_id, lead_id=lead.id, mensagem=mensagem
            )
        except (ValueError, Exception):  # SDR sem config / falha de IA → segue sem IA
            texto_ia = ""

    texto_publico = gatilho.resposta_publica_fixa or texto_ia
    registro.gatilho_id = gatilho.id
    registro.resposta_texto = texto_ia or texto_publico or None

    if gatilho.responder_publico and texto_publico and comment_id:
        try:
            await instagram_meta.reply_public(
                token=token, comment_id=comment_id, message=texto_publico
            )
            registro.respondido_publico = True
        except instagram_meta.InstagramError as exc:
            registro.erro = (registro.erro or "") + f"[publico] {exc} "

    if gatilho.responder_dm and texto_ia and comment_id:
        try:
            await instagram_meta.send_private_reply(
                token=token,
                ig_user_id=config.instagram_user_id or "",
                comment_id=comment_id,
                message=texto_ia,
            )
            registro.respondido_dm = True
        except instagram_meta.InstagramError as exc:
            registro.erro = (registro.erro or "") + f"[dm] {exc} "


async def processar_comentarios_webhook(
    db: AsyncSession, *, empresa_id: uuid.UUID, comentarios: list[dict]
) -> int:
    """Processa comentários inbound. COMMITA ao final. Retorna quantos viraram
    registro novo (após anti-loop + dedup)."""
    config = await _carregar_config(db, empresa_id)
    self_id = (config.instagram_user_id if config else None) or None

    gatilhos = (
        await db.scalars(
            select(VendasInstagramGatilhos).where(
                VendasInstagramGatilhos.empresa_id == empresa_id,
                VendasInstagramGatilhos.ativo.is_(True),
            )
        )
    ).all()

    processados = 0
    for c in comentarios or []:
        comment_id = c.get("comment_id")
        from_id = c.get("from_id")
        if not comment_id or not from_id:
            continue
        # 1) anti-loop
        if self_id and from_id == self_id:
            continue
        # 2) idempotência
        existe = await db.scalar(
            select(VendasInstagramComentarios).where(
                VendasInstagramComentarios.empresa_id == empresa_id,
                VendasInstagramComentarios.comment_id == comment_id,
            )
        )
        if existe is not None:
            continue

        # 3) lead
        lead = await _achar_ou_criar_lead(
            db, empresa_id=empresa_id, from_id=from_id,
            from_username=c.get("from_username"),
        )

        # registro do comentário (idempotência + histórico)
        registro = VendasInstagramComentarios(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            comment_id=comment_id,
            media_id=c.get("media_id"),
            parent_id=c.get("parent_id"),
            from_user_id=from_id,
            from_username=c.get("from_username"),
            texto=c.get("texto"),
            lead_id=lead.id,
        )
        db.add(registro)

        # 4) Conversas (inbox + SSE)
        try:
            await append_mensagem(
                db, empresa_id=empresa_id, lead_id=lead.id,
                sender_type="lead", conteudo=c.get("texto") or "",
                canal="instagram",
            )
        except Exception:  # pragma: no cover - espelho best-effort
            await db.rollback()

        # 5) gating + resposta
        if config is not None:
            gatilho = _casar_gatilho(c.get("texto"), gatilhos)
            if gatilho is not None:
                await _responder(
                    db, config=config, lead=lead, gatilho=gatilho,
                    comentario=c, registro=registro,
                )

        # 6) qualificação assíncrona (reusa a fila existente)
        from app.core.queue import queue

        await queue.enqueue(
            "sdr_qualificar_lote",
            {"empresa_id": str(empresa_id), "lead_ids": [str(lead.id)]},
        )

        processados += 1

    await db.commit()
    return processados
```

> **Detalhe de transação:** `append_mensagem` e `gerar_resposta` commitam por
> conta própria. O `registro` é adicionado à sessão **antes** desses commits e os
> campos `respondido_*`/`erro` são setados no objeto carregado — o `await
> db.commit()` final persiste. Se na execução um teste mostrar que o `registro`
> não persistiu os flags, troque a ordem para setar os flags e dar `db.flush()`
> antes de `append_mensagem` (o objeto continua tracked). Verifique pelos testes
> `test_gatilho_dispara_resposta_publica_e_dm`.

- [ ] **Step 4: Rodar os testes do serviço**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: PASS (todos os testes de serviço + o smoke da Task 1).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/vendas_instagram.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): servico — webhook->lead->Conversas->gating->IA->envio (anti-loop + idempotencia)"
```

---

## Task 5: Router `vendas_instagram.py` + registro no `main.py`

**Files:**
- Create: `apps/api/app/api/vendas_instagram.py`
- Modify: `apps/api/app/main.py` (import perto da linha 100; `include_router` perto da 192)
- Test: `apps/api/tests/test_vendas_instagram.py` (adiciona testes de endpoint)

- [ ] **Step 1: Escrever os testes de endpoint (falhando)**

Append em `apps/api/tests/test_vendas_instagram.py`:

```python
@pytest.mark.asyncio
async def test_webhook_get_handshake(client, db_session):
    eid = await _empresa_id(db_session)
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_verify_token="vtok", instagram_user_id="ig_self",
    )
    db_session.add(cfg)
    await db_session.commit()

    r = await client.get(
        "/vendas/instagram/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": "vtok", "hub.challenge": "12345"},
    )
    assert r.status_code == 200
    assert r.text == "12345"

    r2 = await client.get(
        "/vendas/instagram/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "x"},
    )
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_webhook_post_assinatura_invalida_403(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    eid = await _empresa_id(db_session)
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid, instagram_user_id="ig_self",
        instagram_app_secret_enc=encrypt_secret("segredo"),
    )
    db_session.add(cfg)
    await db_session.commit()

    payload = {"entry": [{"id": "ig_self", "changes": [{"field": "comments", "value": {"id": "c1"}}]}]}
    r = await client.post(
        "/vendas/instagram/webhook", json=payload,
        headers={"X-Hub-Signature-256": "sha256=errado"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_gatilhos_crud(client, db_session):
    eid = await _empresa_id(db_session)
    headers = await login_as(client, db_session, role="cliente_torq", empresa_id=eid)

    r = await client.post("/vendas/instagram/gatilhos", headers=headers, json={
        "palavra_chave": "preco", "responder_publico": True, "responder_dm": True,
        "instrucao_ia": "mande a tabela",
    })
    assert r.status_code == 201
    gid = r.json()["id"]

    r = await client.get("/vendas/instagram/gatilhos", headers=headers)
    assert r.status_code == 200
    assert any(g["id"] == gid for g in r.json())

    r = await client.put(f"/vendas/instagram/gatilhos/{gid}", headers=headers, json={"ativo": False})
    assert r.status_code == 200
    assert r.json()["ativo"] is False

    r = await client.delete(f"/vendas/instagram/gatilhos/{gid}", headers=headers)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_config_mascara_segredo(client, db_session):
    eid = await _empresa_id(db_session)
    headers = await login_as(client, db_session, role="cliente_torq", empresa_id=eid)

    r = await client.put("/vendas/instagram/config", headers=headers, json={
        "instagram_user_id": "ig_1", "instagram_token": "TOKENSECRETO123",
        "instagram_app_secret": "APPSECRET",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["instagram_user_id"] == "ig_1"
    assert body["instagram_token_set"] is True
    assert "TOKENSECRETO123" not in str(body)   # nunca serializa o segredo
    assert body["instagram_token_masked"].endswith("123")
    assert body["instagram_app_secret_set"] is True
```

> Confirme a assinatura de `tests.helpers.login_as` (aceita `empresa_id=`?). Se
> não aceitar, use o padrão dos testes vizinhos (`tests/test_vendas_whatsapp.py`)
> para autenticar e descobrir a empresa do usuário logado.

- [ ] **Step 2: Rodar p/ ver falhar**

Run: `uv run pytest tests/test_vendas_instagram.py -k "webhook or gatilhos or config" -v`
Expected: FAIL (404 — rotas não existem ainda).

- [ ] **Step 3: Implementar o router**

Create `apps/api/app/api/vendas_instagram.py`:

```python
"""Toriq Vendas — canal Instagram (Fase IG-1): router.

Webhook PÚBLICO da Meta (handshake + assinatura HMAC) + endpoints autenticados
(config, gatilhos, comentários). Registrar em app/main.py (include_router).
Tenant por user.empresa_id (403 se None). Reusa o handshake/assinatura de
whatsapp_meta via instagram_meta.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, Query, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, encrypt_secret, mask_secret
from app.integrations import instagram_meta
from app.models.user import User, UserRole
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
)
from app.schemas import vendas_instagram as s
from app.services import vendas_instagram as svc

router = APIRouter(prefix="/vendas", tags=["vendas-instagram"])
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise __import__("fastapi").HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ── Webhook (público) ──────────────────────────────────────────────────────────
@router.get("/instagram/webhook")
async def verificar_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    if not hub_verify_token:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.instagram_verify_token == hub_verify_token
        )
    )
    if config is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    challenge = instagram_meta.verify_webhook(
        hub_mode, hub_verify_token, hub_challenge, config.instagram_verify_token
    )
    if challenge is None:
        return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)
    return PlainTextResponse(challenge, status_code=200)


async def _descobrir_config(db: AsyncSession, payload: dict) -> Optional[VendasDisparoConfig]:
    ids: set[str] = set()
    for entry in payload.get("entry") or []:
        if isinstance(entry, dict) and entry.get("id"):
            ids.add(str(entry["id"]))
    if not ids:
        return None
    return await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.instagram_user_id.in_(ids)
        )
    )


@router.post("/instagram/webhook")
async def receber_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db),
):
    raw = await request.body()
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        payload = {}

    config = await _descobrir_config(db, payload)
    if config is None or not config.instagram_app_secret_enc:
        return JSONResponse({"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN)

    app_secret = decrypt_secret(config.instagram_app_secret_enc)
    if not instagram_meta.check_signature(app_secret, raw, x_hub_signature_256):
        return JSONResponse({"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN)

    comentarios = instagram_meta.parse_webhook(payload)
    await svc.processar_comentarios_webhook(
        db, empresa_id=config.empresa_id, comentarios=comentarios
    )
    return JSONResponse({"ok": True}, status_code=200)


# ── Config (autenticado) ───────────────────────────────────────────────────────
def _config_public(obj: Optional[VendasDisparoConfig]) -> s.InstagramConfigPublic:
    if obj is None:
        return s.InstagramConfigPublic()
    masked = None
    if obj.instagram_token_enc:
        masked = mask_secret(decrypt_secret(obj.instagram_token_enc))
    return s.InstagramConfigPublic(
        instagram_user_id=obj.instagram_user_id,
        instagram_username=obj.instagram_username,
        instagram_verify_token=obj.instagram_verify_token,
        instagram_token_set=bool(obj.instagram_token_enc),
        instagram_token_masked=masked,
        instagram_app_secret_set=bool(obj.instagram_app_secret_enc),
    )


@router.get("/instagram/config", response_model=s.InstagramConfigPublic)
async def get_config(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    return _config_public(obj)


@router.put("/instagram/config", response_model=s.InstagramConfigPublic)
async def put_config(
    payload: s.InstagramConfigUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    created = obj is None
    if created:
        obj = VendasDisparoConfig(id=uuid.uuid4(), empresa_id=empresa_id)

    for campo in ("instagram_user_id", "instagram_username", "instagram_verify_token"):
        valor = getattr(payload, campo)
        if valor is not None:
            setattr(obj, campo, valor)

    if payload.clear_instagram_token:
        obj.instagram_token_enc = None
    elif payload.instagram_token is not None:
        obj.instagram_token_enc = encrypt_secret(payload.instagram_token)

    if payload.clear_instagram_app_secret:
        obj.instagram_app_secret_enc = None
    elif payload.instagram_app_secret is not None:
        obj.instagram_app_secret_enc = encrypt_secret(payload.instagram_app_secret)

    obj.updated_at = _now()
    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _config_public(obj)


# ── Gatilhos CRUD ──────────────────────────────────────────────────────────────
async def _get_gatilho(db, gid, empresa_id) -> VendasInstagramGatilhos:
    obj = await db.scalar(
        select(VendasInstagramGatilhos).where(
            VendasInstagramGatilhos.id == gid,
            VendasInstagramGatilhos.empresa_id == empresa_id,
        )
    )
    if obj is None:
        raise __import__("fastapi").HTTPException(status.HTTP_404_NOT_FOUND, "gatilho não encontrado")
    return obj


@router.get("/instagram/gatilhos", response_model=list[s.GatilhoPublic])
async def listar_gatilhos(user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    empresa_id = _require_empresa(user)
    rows = (await db.scalars(
        select(VendasInstagramGatilhos)
        .where(VendasInstagramGatilhos.empresa_id == empresa_id)
        .order_by(VendasInstagramGatilhos.created_at)
    )).all()
    return rows


@router.post("/instagram/gatilhos", response_model=s.GatilhoPublic, status_code=201)
async def criar_gatilho(
    payload: s.GatilhoCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=empresa_id, **payload.model_dump()
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/instagram/gatilhos/{gid}", response_model=s.GatilhoPublic)
async def atualizar_gatilho(
    gid: uuid.UUID,
    payload: s.GatilhoUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_gatilho(db, gid, empresa_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(obj, campo, valor)
    obj.updated_at = _now()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/instagram/gatilhos/{gid}", status_code=204)
async def remover_gatilho(
    gid: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    obj = await _get_gatilho(db, gid, empresa_id)
    await db.delete(obj)
    await db.commit()
    return PlainTextResponse("", status_code=204)


# ── Comentários (leitura p/ a tela) ────────────────────────────────────────────
@router.get("/instagram/comentarios", response_model=list[s.ComentarioPublic])
async def listar_comentarios(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
):
    empresa_id = _require_empresa(user)
    rows = (await db.scalars(
        select(VendasInstagramComentarios)
        .where(VendasInstagramComentarios.empresa_id == empresa_id)
        .order_by(VendasInstagramComentarios.created_at.desc())
        .limit(limit)
    )).all()
    return rows
```

> Nota: o `__import__("fastapi").HTTPException` é um atalho para não poluir os
> imports; se preferir, importe `HTTPException` no topo (como em
> `vendas_disparo.py`) e use direto — fica mais legível. Ajuste no momento da
> implementação.

- [ ] **Step 4: Registrar o router no `main.py`**

In `apps/api/app/main.py`, perto da linha 100 (junto dos outros imports `vendas_*`):
```python
from app.api.vendas_instagram import router as vendas_instagram_router
```
E perto da linha 192 (junto do `include_router(vendas_whatsapp_router)`):
```python
    app.include_router(vendas_instagram_router)
```

- [ ] **Step 5: Rodar os testes de endpoint**

Run: `uv run pytest tests/test_vendas_instagram.py -v`
Expected: PASS (todos).

- [ ] **Step 6: Rodar a suíte de Vendas inteira (não quebrou nada)**

Run: `uv run pytest tests/test_vendas_whatsapp.py tests/test_vendas_sdr.py tests/test_vendas_pipeline.py tests/test_instagram_meta.py tests/test_vendas_instagram.py -v`
Expected: PASS (WhatsApp/SDR/pipeline intactos).

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/api/vendas_instagram.py apps/api/app/main.py apps/api/tests/test_vendas_instagram.py
git commit -m "feat(instagram): router — webhook (handshake+HMAC), config, gatilhos CRUD, comentarios"
```

---

## Self-Review (preenchido)

**1. Spec coverage:**
- Webhook comments + HMAC + descoberta de empresa → Task 5 (router) + Task 2 (parse).
- Anti-loop + idempotência → Task 4 (serviço) + testes.
- Lead por identidade IG → Task 1 (colunas) + Task 4 (`_achar_ou_criar_lead`).
- Conversas (`append_mensagem`, canal='instagram') → Task 4.
- Gating híbrido (palavra-chave → IA escreve) → Task 4 (`_casar_gatilho` + `_responder`, reusa `gerar_resposta`).
- Resposta pública e/ou DM → Task 2 (`reply_public`/`send_private_reply`) + Task 4.
- Qualificação reusando `sdr_qualificar_lote` → Task 4 (enqueue).
- Config (mascarada) + Gatilhos CRUD + lista de comentários → Task 3 + Task 5.
- `list_media` (contagem p/ a tela / Fase 2) → Task 2.
- **Frontend (config/gatilhos/comentários + fiação 6 arquivos)** → NÃO coberto aqui de propósito (Fase 1b, plano próprio).

**2. Placeholder scan:** sem TBD/TODO; todo passo de código tem código real. As 2
notas de "ajuste no momento da implementação" (`login_as` assinatura; ordem de
commit do registro; `HTTPException` import) são pontos de verificação concretos
guiados por teste, não placeholders de lógica.

**3. Type consistency:** `processar_comentarios_webhook(db, *, empresa_id, comentarios)`,
`_responder(..., registro=...)`, `instagram_meta.reply_public(token, comment_id, message)`,
`send_private_reply(token, ig_user_id, comment_id, message)`,
`gerar_resposta(db, *, empresa_id, lead_id, mensagem)` — nomes batem entre serviço,
router e testes. Schemas (`InstagramConfigPublic`, `GatilhoPublic`,
`ComentarioPublic`) usados no `response_model` correspondem aos campos dos models.

---

## Fora de escopo (próximos planos)
- **Fase 1b (UI):** tela de config IG, CRUD de gatilhos, lista de comentários +
  fiação da seção "Instagram" nos 6 arquivos do front (CLAUDE.md) + cliente
  `src/integrations/api/vendasInstagram.ts`.
- **Fase 2:** galeria de posts (usa `list_media`) + comentários por post.
- **Fase 3:** publicar/agendar posts (`/media` + `/media_publish`, mídia em S3/RustFS).
- Conversa por DM após resposta (webhook `messages`), OAuth de conexão.

---

## Correções aplicadas na execução (lições p/ a Fase 1b)

Itens que as revisões pegaram e que **devem ser aplicados de cara** quando a Fase 1b (frontend) ou fatias futuras espelharem estes padrões:

1. **Registrar todo model novo em `app/models/__init__.py`.** O `main.py` faz `import app.models` para registrar tudo no `Base.metadata`; um módulo de model não importado lá fica invisível (bug silencioso — nenhum teste quebra). Foi preciso adicionar `from app.models import vendas_instagram  # noqa: F401`. (Task 1)
2. **Tabela com estado mutável precisa de `updated_at`.** `vendas_instagram_comentarios` é atualizada pelo serviço (`respondido_*`, `erro`) — ganhou `updated_at` + índice em `lead_id` (FK consultável). (Task 1)
3. **Nunca `except (ValueError, Exception)` em caminho de negócio.** É redundante e mascara `AttributeError`/`TypeError`. Capture o contrato real: `except (ValueError, LLMError)` (LLMError de `app.integrations.llm`). (Task 4)
4. **Após `db.rollback()` no loop, `continue`.** Senão o resto da iteração opera sobre `registro`/`lead` detached. (Task 4)
5. **Auth de teste é por COOKIE, não header.** `tests.helpers.login_as(...)` **retorna o `empresa_id`** e o `client` guarda o cookie do login; não existe `headers=` de auth. (Task 5)
6. **204 sem corpo + constantes de status.** DELETE usa `status_code=status.HTTP_204_NO_CONTENT` e **não** retorna corpo; POST usa `status.HTTP_201_CREATED`. (Task 5)
7. **Imports no topo** (inclusive `from app.core.queue import queue`), não dentro de loops. (Task 4)
