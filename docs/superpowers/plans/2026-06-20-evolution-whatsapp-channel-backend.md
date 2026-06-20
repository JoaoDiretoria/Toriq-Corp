# Canal WhatsApp via Evolution API — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um canal de WhatsApp via Evolution API (self-hosted), multi-tenant, paralelo ao Meta, reusando campanhas/SDR/pipeline — backend completo e testável.

**Architecture:** Espelha o padrão do canal Meta (`integrations/` → `services/` → `api/`) com tabelas próprias para N instâncias por empresa. Um servidor Evolution global (config super admin). Campanhas roteiam por `canal=whatsapp_evo`; o SDR responde "channel-aware" lendo `vendas_leads.ultimo_canal`.

**Tech Stack:** Python 3, FastAPI, SQLAlchemy (async), Alembic, httpx, pytest (anyio), PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-06-20-evolution-whatsapp-channel-design.md`

**Escopo deste plano:** somente backend. O frontend (`src/components/admin/vendas/evolution/*` + `src/integrations/api/vendasEvolution.ts`) é um plano separado de follow-up.

**Convenções confirmadas no codebase:**
- Cripto: `app.core.esocial_crypto` → `encrypt_secret`, `decrypt_secret`, `mask_secret`.
- Fila: `app.core.queue.queue.enqueue(nome, payload)`; sem Redis roda inline.
- Auth: `app.api.deps.require_role(UserRole...)`; `user.empresa_id` (None → 403).
- Roles: `admin_vertical` (super admin), `cliente_torq` (empresa).
- Models: `Base` de `app.models.generated`, `{"schema": "public"}`, `mapped_column`.
- Testes: Postgres real + rollback por teste; **aplicar `alembic upgrade head` antes da suíte**. Fixtures `client`, `db_session`; helper `tests.helpers.login_as`. Mock de rede via `monkeypatch` no módulo de integração.
- Head Alembic atual: **`c7d8e9f0a1b2`** (usar como `down_revision`).
- Rodar testes a partir de `apps/api/`.

---

## File Structure

**Criar:**
- `apps/api/app/models/vendas_evolution.py` — 2 models (servidor, instâncias).
- `apps/api/app/integrations/evolution_api.py` — cliente httpx stateless + parsing puro do webhook.
- `apps/api/app/services/vendas_evolution.py` — regra (ciclo de vida, envio, webhook). Não commita (exceto webhook).
- `apps/api/app/schemas/vendas_evolution.py` — Pydantic (config servidor + instâncias, com masking).
- `apps/api/app/api/vendas_evolution.py` — router (config servidor, CRUD instâncias, qrcode/status, enviar, webhook público).
- `apps/api/migrations/versions/e1f2a3b4c5d6_evolution_channel.py` — migration.
- `apps/api/tests/test_evolution_api.py` — testes do parsing puro.
- `apps/api/tests/test_vendas_evolution.py` — testes de serviço + webhook + cross-tenant.

**Modificar:**
- `apps/api/app/models/vendas_disparo.py` — coluna `instancia_id` em `VendasMensagens`.
- `apps/api/app/models/vendas.py` — coluna `ultimo_canal` em `VendasLeads`.
- `apps/api/app/services/vendas_disparo.py` — roteamento `whatsapp_evo` no envio.
- `apps/api/app/services/vendas_sdr.py` — `_enviar_whatsapp_sdr` channel-aware + callers.
- `apps/api/app/main.py` — registrar `vendas_evolution_router`.

---

## Task 1: Models das tabelas Evolution

**Files:**
- Create: `apps/api/app/models/vendas_evolution.py`

- [ ] **Step 1: Escrever o arquivo de models**

```python
"""Models do canal WhatsApp via Evolution API (self-hosted).

Tabelas novas. Usam o Base compartilhado dos models gerados. Tenant por empresa_id.

- vendas_evolution_servidor ... 1 linha global (config do servidor Evolution na VPS):
  base_url + api_key criptografada + URL pública do webhook. Só super admin escreve.
- vendas_evolution_instancias .. N por empresa. Cada instância = 1 conexão de WhatsApp
  (1 número), criada no servidor compartilhado com nome namespeado por empresa.
"""
import datetime
import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class VendasEvolutionServidor(Base):
    __tablename__ = "vendas_evolution_servidor"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="vendas_evolution_servidor_pkey"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    base_url: Mapped[Optional[str]] = mapped_column(Text)
    api_key_enc: Mapped[Optional[str]] = mapped_column(Text)
    webhook_base_url: Mapped[Optional[str]] = mapped_column(Text)
    limite_padrao_instancias: Mapped[Optional[int]] = mapped_column(
        Integer, server_default=text("1")
    )
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )


class VendasEvolutionInstancias(Base):
    __tablename__ = "vendas_evolution_instancias"
    __table_args__ = (
        ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_evolution_instancias_empresa_id_fkey",
        ),
        PrimaryKeyConstraint("id", name="vendas_evolution_instancias_pkey"),
        UniqueConstraint("instance_name", name="vendas_evolution_instancias_name_key"),
        UniqueConstraint(
            "webhook_token", name="vendas_evolution_instancias_webhook_token_key"
        ),
        Index("idx_vendas_evolution_instancias_empresa_id", "empresa_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_exibicao: Mapped[str] = mapped_column(Text, nullable=False)
    instance_name: Mapped[str] = mapped_column(Text, nullable=False)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'criada'")
    )
    instance_token_enc: Mapped[Optional[str]] = mapped_column(Text)
    webhook_token: Mapped[str] = mapped_column(Text, nullable=False)
    criado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(True), server_default=text("now()")
    )
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.models.vendas_evolution import VendasEvolutionServidor, VendasEvolutionInstancias; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/models/vendas_evolution.py
git commit -m "feat(evolution): models de servidor e instancias"
```

---

## Task 2: Colunas novas em models existentes

**Files:**
- Modify: `apps/api/app/models/vendas_disparo.py` (classe `VendasMensagens`)
- Modify: `apps/api/app/models/vendas.py` (classe `VendasLeads`)

- [ ] **Step 1: Adicionar `instancia_id` em `VendasMensagens`**

Em `apps/api/app/models/vendas_disparo.py`, dentro da classe `VendasMensagens`, logo após a linha `canal: Mapped[Optional[str]] = mapped_column(Text)`, inserir:

```python
    instancia_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
```

- [ ] **Step 2: Adicionar `ultimo_canal` em `VendasLeads`**

Primeiro localizar a classe e um campo de texto existente para imitar o estilo:

Run: `cd apps/api && grep -n "class VendasLeads\|telefone\|server_default" app/models/vendas.py | head`

Em `apps/api/app/models/vendas.py`, dentro da classe `VendasLeads`, adicionar uma coluna (ajuste o estilo `Text`/`mapped_column` ao que já existe no arquivo):

```python
    ultimo_canal: Mapped[Optional[str]] = mapped_column(
        Text, server_default=text("'whatsapp'")
    )
```

Se `Text` ou `text` não estiverem importados no topo de `vendas.py`, adicione-os aos imports do SQLAlchemy já presentes (`from sqlalchemy import ... Text, text`).

- [ ] **Step 3: Verificar imports**

Run: `cd apps/api && python -c "from app.models.vendas_disparo import VendasMensagens; from app.models.vendas import VendasLeads; print(VendasMensagens.instancia_id, VendasLeads.ultimo_canal)"`
Expected: imprime duas colunas, sem erro.

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/models/vendas_disparo.py apps/api/app/models/vendas.py
git commit -m "feat(evolution): instancia_id em mensagens e ultimo_canal em leads"
```

---

## Task 3: Migration Alembic

**Files:**
- Create: `apps/api/migrations/versions/e1f2a3b4c5d6_evolution_channel.py`

- [ ] **Step 1: Escrever a migration**

```python
"""canal evolution: servidor, instancias, instancia_id em mensagens, ultimo_canal em leads

Revision ID: e1f2a3b4c5d6
Revises: c7d8e9f0a1b2
Create Date: 2026-06-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas_evolution_servidor",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("api_key_enc", sa.Text(), nullable=True),
        sa.Column("webhook_base_url", sa.Text(), nullable=True),
        sa.Column(
            "limite_padrao_instancias", sa.Integer(),
            server_default=sa.text("1"), nullable=True,
        ),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.PrimaryKeyConstraint("id", name="vendas_evolution_servidor_pkey"),
        schema="public",
    )
    op.create_table(
        "vendas_evolution_instancias",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("empresa_id", sa.Uuid(), nullable=False),
        sa.Column("nome_exibicao", sa.Text(), nullable=False),
        sa.Column("instance_name", sa.Text(), nullable=False),
        sa.Column("numero", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'criada'"), nullable=True),
        sa.Column("instance_token_enc", sa.Text(), nullable=True),
        sa.Column("webhook_token", sa.Text(), nullable=False),
        sa.Column("criado_por", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["empresa_id"], ["public.empresas.id"],
            ondelete="CASCADE", name="vendas_evolution_instancias_empresa_id_fkey",
        ),
        sa.PrimaryKeyConstraint("id", name="vendas_evolution_instancias_pkey"),
        sa.UniqueConstraint("instance_name", name="vendas_evolution_instancias_name_key"),
        sa.UniqueConstraint(
            "webhook_token", name="vendas_evolution_instancias_webhook_token_key"
        ),
        schema="public",
    )
    op.create_index(
        "idx_vendas_evolution_instancias_empresa_id",
        "vendas_evolution_instancias", ["empresa_id"], schema="public",
    )
    op.add_column(
        "vendas_mensagens",
        sa.Column("instancia_id", sa.Uuid(), nullable=True),
        schema="public",
    )
    op.add_column(
        "vendas_leads",
        sa.Column(
            "ultimo_canal", sa.Text(),
            server_default=sa.text("'whatsapp'"), nullable=True,
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("vendas_leads", "ultimo_canal", schema="public")
    op.drop_column("vendas_mensagens", "instancia_id", schema="public")
    op.drop_index(
        "idx_vendas_evolution_instancias_empresa_id",
        table_name="vendas_evolution_instancias", schema="public",
    )
    op.drop_table("vendas_evolution_instancias", schema="public")
    op.drop_table("vendas_evolution_servidor", schema="public")
```

- [ ] **Step 2: Aplicar no banco de teste e de dev**

Run: `cd apps/api && alembic upgrade head`
Expected: aplica `e1f2a3b4c5d6` sem erro. (Confirme que aponta para o banco de teste/dev correto via `DATABASE_URL`/`TEST_DATABASE_URL`.)

- [ ] **Step 3: Verificar reversibilidade**

Run: `cd apps/api && alembic downgrade -1 && alembic upgrade head`
Expected: desce e sobe sem erro.

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/versions/e1f2a3b4c5d6_evolution_channel.py
git commit -m "feat(evolution): migration de servidor/instancias + colunas"
```

---

## Task 4: Cliente de integração (parsing puro primeiro — TDD)

**Files:**
- Create: `apps/api/app/integrations/evolution_api.py`
- Test: `apps/api/tests/test_evolution_api.py`

- [ ] **Step 1: Escrever os testes do parsing puro (falham primeiro)**

```python
"""Testes das funções PURAS do cliente Evolution (sem rede)."""
from app.integrations.evolution_api import (
    map_status,
    normalizar_telefone,
    parse_webhook,
)


def test_normalizar_telefone_remove_sufixo_e_nao_digitos():
    assert normalizar_telefone("5511999990000@s.whatsapp.net") == "5511999990000"
    assert normalizar_telefone("+55 (11) 99999-0000") == "5511999990000"


def test_parse_webhook_inbound_texto():
    payload = {
        "event": "messages.upsert",
        "instance": "emp_abc123_vendas",
        "data": {
            "key": {
                "remoteJid": "5511999990000@s.whatsapp.net",
                "fromMe": False,
                "id": "MSGID1",
            },
            "pushName": "Fulano",
            "message": {"conversation": "olá, tenho interesse"},
            "messageTimestamp": 1700000000,
        },
    }
    out = parse_webhook(payload)
    assert out["instance"] == "emp_abc123_vendas"
    assert len(out["mensagens"]) == 1
    m = out["mensagens"][0]
    assert m["from"] == "5511999990000"
    assert m["texto"] == "olá, tenho interesse"
    assert m["pushName"] == "Fulano"
    assert out["conexao"] is None


def test_parse_webhook_ignora_from_me():
    payload = {
        "event": "messages.upsert",
        "instance": "i",
        "data": {
            "key": {"remoteJid": "551199@s.whatsapp.net", "fromMe": True, "id": "X"},
            "message": {"conversation": "resposta nossa"},
        },
    }
    assert parse_webhook(payload)["mensagens"] == []


def test_parse_webhook_extended_text():
    payload = {
        "event": "messages.upsert",
        "instance": "i",
        "data": {
            "key": {"remoteJid": "551199@s.whatsapp.net", "fromMe": False, "id": "Y"},
            "message": {"extendedTextMessage": {"text": "com link"}},
        },
    }
    assert parse_webhook(payload)["mensagens"][0]["texto"] == "com link"


def test_parse_webhook_connection_update():
    payload = {
        "event": "connection.update",
        "instance": "i",
        "data": {"state": "open"},
    }
    out = parse_webhook(payload)
    assert out["conexao"] == {"state": "open"}
    assert out["mensagens"] == []


def test_parse_webhook_tolerante_a_lixo():
    assert parse_webhook(None) == {
        "mensagens": [], "statuses": [], "conexao": None, "instance": None
    }


def test_map_status():
    assert map_status("DELIVERY_ACK") == "entregue"
    assert map_status("READ") == "lido"
    assert map_status("desconhecido") == "desconhecido"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && pytest tests/test_evolution_api.py -v`
Expected: FAIL com `ModuleNotFoundError: app.integrations.evolution_api`.

- [ ] **Step 3: Escrever o cliente de integração**

```python
"""Integração com a Evolution API (gateway WhatsApp self-hosted, baseado em Baileys).

Canal WhatsApp alternativo ao Meta (app/integrations/whatsapp_meta.py). Aqui só
falamos com a Evolution API instalada na VPS: criar/conectar/encerrar instâncias,
enviar mensagens, configurar webhook — além das funções PURAS de parsing do
webhook (sem rede).

Estilo: igual a whatsapp_meta.py — httpx.AsyncClient stateless (abre/fecha por
chamada); falhas HTTP viram EvolutionError. Header de auth: ``apikey``.

A CONFIRMAR contra a instância do usuário (paths/payloads divergem entre v1/v2):
- /instance/create, /instance/connect/{i}, /instance/connectionState/{i},
  /instance/logout/{i}, /instance/delete/{i}, /webhook/set/{i},
  /message/sendText/{i}.
- Callback: data.key.remoteJid/fromMe/id, data.message.conversation, data.pushName.
"""
from __future__ import annotations

import re

import httpx

_TIMEOUT = 30.0

# Eventos que pedimos a Evolution para nos enviar no webhook.
EVENTOS_PADRAO = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]


class EvolutionError(Exception):
    """Erro ao falar com a Evolution API (HTTP ou resposta inesperada)."""


def _headers(api_key: str) -> dict:
    return {"apikey": api_key, "Content-Type": "application/json"}


def _base(base_url: str) -> str:
    return (base_url or "").rstrip("/")


# ───────────────────────────── HTTP helpers ─────────────────────────────

async def _request(method: str, url: str, api_key: str, *, json=None, contexto: str):
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.request(method, url, json=json, headers=_headers(api_key))
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise EvolutionError(
                f"Falha na Evolution ({contexto}): HTTP "
                f"{e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise EvolutionError(f"Erro de rede na Evolution ({contexto}): {e}") from e
        try:
            return resp.json()
        except ValueError:
            return {}


# ───────────────────────────── Instâncias ─────────────────────────────

async def criar_instancia(*, base_url: str, api_key: str, instance_name: str) -> dict:
    """Cria a instância na Evolution. Retorna o JSON (inclui qrcode quando disponível)."""
    url = f"{_base(base_url)}/instance/create"
    payload = {
        "instanceName": instance_name,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }
    return await _request("POST", url, api_key, json=payload, contexto="criar instancia")


async def definir_webhook(
    *, base_url: str, api_key: str, instance_name: str, webhook_url: str, eventos=None
) -> dict:
    url = f"{_base(base_url)}/webhook/set/{instance_name}"
    payload = {
        "webhook": {
            "enabled": True,
            "url": webhook_url,
            "events": eventos or EVENTOS_PADRAO,
            "base64": True,
        }
    }
    return await _request("POST", url, api_key, json=payload, contexto="definir webhook")


async def conectar_qrcode(*, base_url: str, api_key: str, instance_name: str) -> dict:
    """GET connect → {base64, code/pairingCode}."""
    url = f"{_base(base_url)}/instance/connect/{instance_name}"
    return await _request("GET", url, api_key, contexto="conectar/qrcode")


async def estado_conexao(*, base_url: str, api_key: str, instance_name: str) -> str:
    """Retorna 'open' | 'connecting' | 'close'."""
    url = f"{_base(base_url)}/instance/connectionState/{instance_name}"
    data = await _request("GET", url, api_key, contexto="estado conexao")
    if isinstance(data, dict):
        inst = data.get("instance")
        if isinstance(inst, dict) and inst.get("state"):
            return inst["state"]
        if data.get("state"):
            return data["state"]
    return "close"


async def logout(*, base_url: str, api_key: str, instance_name: str) -> dict:
    url = f"{_base(base_url)}/instance/logout/{instance_name}"
    return await _request("DELETE", url, api_key, contexto="logout")


async def deletar(*, base_url: str, api_key: str, instance_name: str) -> dict:
    url = f"{_base(base_url)}/instance/delete/{instance_name}"
    return await _request("DELETE", url, api_key, contexto="deletar")


# ───────────────────────────── Mensagens ─────────────────────────────

async def enviar_texto(
    *, base_url: str, api_key: str, instance_name: str, numero: str, texto: str
) -> str:
    """Envia texto. Retorna o id da mensagem (key.id) quando presente."""
    url = f"{_base(base_url)}/message/sendText/{instance_name}"
    payload = {"number": numero, "text": texto}
    data = await _request("POST", url, api_key, json=payload, contexto="enviar texto")
    return _extrair_id(data)


def _extrair_id(data) -> str:
    if isinstance(data, dict):
        key = data.get("key")
        if isinstance(key, dict) and key.get("id"):
            return key["id"]
        if data.get("id"):
            return str(data["id"])
    return ""


# ───────────────────────────── Parsing puro do webhook ─────────────────────────────

def normalizar_telefone(valor: str) -> str:
    """Remove sufixo JID (@s.whatsapp.net/@g.us) e tudo que não é dígito."""
    base = (valor or "").split("@")[0]
    return re.sub(r"\D", "", base)


def parse_webhook(payload) -> dict:
    """Extrai inbound/conexão do callback da Evolution. Tolerante a lixo.

    Retorna {"mensagens": [...], "statuses": [...], "conexao": {...}|None,
    "instance": str|None}. Cada mensagem: {wamid, from, pushName, texto, timestamp}.
    """
    out = {"mensagens": [], "statuses": [], "conexao": None, "instance": None}
    if not isinstance(payload, dict):
        return out

    out["instance"] = payload.get("instance")
    evento = (payload.get("event") or "").lower()
    data = payload.get("data")

    if evento == "messages.upsert":
        itens = data if isinstance(data, list) else [data]
        for m in itens:
            if not isinstance(m, dict):
                continue
            key = m.get("key") or {}
            if key.get("fromMe"):
                continue  # ignora as mensagens que NÓS enviamos
            msg = m.get("message") or {}
            texto = msg.get("conversation") or (
                msg.get("extendedTextMessage") or {}
            ).get("text")
            out["mensagens"].append(
                {
                    "wamid": key.get("id"),
                    "from": normalizar_telefone(key.get("remoteJid") or ""),
                    "pushName": m.get("pushName"),
                    "texto": texto,
                    "timestamp": m.get("messageTimestamp"),
                }
            )
    elif evento == "connection.update":
        if isinstance(data, dict):
            out["conexao"] = {"state": data.get("state")}

    return out


def map_status(s: str) -> str:
    """Normaliza status de mensagem da Evolution para nosso vocabulário."""
    mapa = {
        "PENDING": "pendente",
        "SERVER_ACK": "enviado",
        "DELIVERY_ACK": "entregue",
        "READ": "lido",
        "PLAYED": "lido",
    }
    return mapa.get(s, s)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_evolution_api.py -v`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/integrations/evolution_api.py apps/api/tests/test_evolution_api.py
git commit -m "feat(evolution): cliente de integracao + parsing do webhook (TDD)"
```

---

## Task 5: Schemas Pydantic

**Files:**
- Create: `apps/api/app/schemas/vendas_evolution.py`

- [ ] **Step 1: Escrever os schemas**

```python
"""Schemas do canal Evolution (config do servidor + instâncias)."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class ServidorUpdate(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None  # vazio/None = mantém a atual
    webhook_base_url: Optional[str] = None
    limite_padrao_instancias: Optional[int] = None
    ativo: Optional[bool] = None


class ServidorPublic(BaseModel):
    base_url: Optional[str] = None
    webhook_base_url: Optional[str] = None
    limite_padrao_instancias: Optional[int] = None
    ativo: Optional[bool] = None
    api_key_set: bool = False
    api_key_masked: Optional[str] = None


class InstanciaIn(BaseModel):
    nome_exibicao: str
    empresa_id: Optional[uuid.UUID] = None  # só super admin pode informar outra empresa


class InstanciaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    nome_exibicao: str
    instance_name: str
    numero: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[object] = None


class QRCodeOut(BaseModel):
    base64: Optional[str] = None
    code: Optional[str] = None


class StatusOut(BaseModel):
    status: str


class EnviarIn(BaseModel):
    numero: str
    texto: str


class EnviarOut(BaseModel):
    enviado: bool
    provider_id: Optional[str] = None
    erro: Optional[str] = None
```

- [ ] **Step 2: Verificar import**

Run: `cd apps/api && python -c "from app.schemas.vendas_evolution import ServidorPublic, InstanciaOut; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/schemas/vendas_evolution.py
git commit -m "feat(evolution): schemas pydantic"
```

---

## Task 6: Serviço — ciclo de vida, envio, webhook (TDD)

**Files:**
- Create: `apps/api/app/services/vendas_evolution.py`
- Test: `apps/api/tests/test_vendas_evolution.py` (parte 1)

- [ ] **Step 1: Escrever o serviço**

```python
"""Canal WhatsApp via Evolution API — regra de negócio.

Tenant SEMPRE por empresa_id. NÃO commita (quem chama commita), exceto
``processar_webhook`` (ponto de entrada de webhook, commita ao final), seguindo o
padrão de app/services/vendas_whatsapp.py.

Rede delegada a app.integrations.evolution_api; nos testes é mockada por
monkeypatch nesse módulo.
"""
from __future__ import annotations

import datetime
import re
import secrets
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret, encrypt_secret
from app.integrations import evolution_api
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasMensagens
from app.models.vendas_evolution import (
    VendasEvolutionInstancias,
    VendasEvolutionServidor,
)


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "wa"


def gerar_instance_name(empresa_id: uuid.UUID, nome: str) -> str:
    """Namespeado por empresa para não colidir no servidor compartilhado."""
    return f"emp_{str(empresa_id)[:8]}_{_slug(nome)}_{secrets.token_hex(2)}"


# ───────────────────────── Servidor (global) ─────────────────────────

async def get_servidor(db: AsyncSession) -> VendasEvolutionServidor | None:
    return await db.scalar(select(VendasEvolutionServidor).limit(1))


async def salvar_servidor(db: AsyncSession, *, dados) -> VendasEvolutionServidor:
    obj = await get_servidor(db)
    if obj is None:
        obj = VendasEvolutionServidor(id=uuid.uuid4())
        db.add(obj)
    if dados.base_url is not None:
        obj.base_url = dados.base_url
    if dados.webhook_base_url is not None:
        obj.webhook_base_url = dados.webhook_base_url
    if dados.limite_padrao_instancias is not None:
        obj.limite_padrao_instancias = dados.limite_padrao_instancias
    if dados.ativo is not None:
        obj.ativo = dados.ativo
    if dados.api_key:  # só troca se veio uma nova
        obj.api_key_enc = encrypt_secret(dados.api_key)
    obj.updated_at = _now()
    return obj


async def _exigir_servidor(db: AsyncSession) -> tuple[str, str]:
    """Retorna (base_url, api_key) ou levanta ValueError."""
    srv = await get_servidor(db)
    if srv is None or not srv.base_url or not srv.api_key_enc:
        raise ValueError("servidor Evolution não configurado")
    return srv.base_url, decrypt_secret(srv.api_key_enc)


# ───────────────────────── Instâncias ─────────────────────────

async def contar_instancias(db: AsyncSession, empresa_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count(VendasEvolutionInstancias.id)).where(
                VendasEvolutionInstancias.empresa_id == empresa_id
            )
        )
        or 0
    )


async def criar_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, nome_exibicao: str, criado_por=None
) -> VendasEvolutionInstancias:
    """Valida limite, cria na Evolution (com webhook) e persiste. NÃO commita."""
    base_url, api_key = await _exigir_servidor(db)
    srv = await get_servidor(db)
    limite = srv.limite_padrao_instancias or 1
    if await contar_instancias(db, empresa_id) >= limite:
        raise ValueError(f"limite de instâncias atingido ({limite})")

    instance_name = gerar_instance_name(empresa_id, nome_exibicao)
    webhook_token = secrets.token_urlsafe(24)

    await evolution_api.criar_instancia(
        base_url=base_url, api_key=api_key, instance_name=instance_name
    )
    webhook_url = f"{(srv.webhook_base_url or '').rstrip('/')}/vendas/evolution/webhook/{webhook_token}"
    await evolution_api.definir_webhook(
        base_url=base_url, api_key=api_key,
        instance_name=instance_name, webhook_url=webhook_url,
    )

    obj = VendasEvolutionInstancias(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome_exibicao=nome_exibicao,
        instance_name=instance_name,
        status="conectando",
        webhook_token=webhook_token,
        criado_por=criado_por,
    )
    db.add(obj)
    return obj


async def _get_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> VendasEvolutionInstancias | None:
    return await db.scalar(
        select(VendasEvolutionInstancias).where(
            VendasEvolutionInstancias.id == instancia_id,
            VendasEvolutionInstancias.empresa_id == empresa_id,
        )
    )


async def obter_qrcode(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> dict:
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    data = await evolution_api.conectar_qrcode(
        base_url=base_url, api_key=api_key, instance_name=inst.instance_name
    )
    return {"base64": data.get("base64"), "code": data.get("code") or data.get("pairingCode")}


async def sincronizar_status(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> str:
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")
    estado = await evolution_api.estado_conexao(
        base_url=base_url, api_key=api_key, instance_name=inst.instance_name
    )
    inst.status = {"open": "conectada", "connecting": "conectando"}.get(
        estado, "desconectada"
    )
    inst.updated_at = _now()
    return inst.status


async def deletar_instancia(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID
) -> bool:
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        return False
    try:
        base_url, api_key = await _exigir_servidor(db)
        await evolution_api.logout(
            base_url=base_url, api_key=api_key, instance_name=inst.instance_name
        )
        await evolution_api.deletar(
            base_url=base_url, api_key=api_key, instance_name=inst.instance_name
        )
    except (ValueError, evolution_api.EvolutionError):
        pass  # remove localmente mesmo se a Evolution já não tiver a instância
    await db.delete(inst)
    return True


# ───────────────────────── Envio avulso ─────────────────────────

async def enviar_texto(
    db: AsyncSession, *, empresa_id: uuid.UUID, instancia_id: uuid.UUID,
    numero: str, texto: str,
) -> dict:
    """Envia um texto e grava em vendas_mensagens. NÃO commita."""
    base_url, api_key = await _exigir_servidor(db)
    inst = await _get_instancia(db, empresa_id=empresa_id, instancia_id=instancia_id)
    if inst is None:
        raise ValueError("instância não encontrada")

    destino = re.sub(r"\D", "", numero or "")
    enviado, provider_id, erro = False, None, None
    try:
        provider_id = await evolution_api.enviar_texto(
            base_url=base_url, api_key=api_key,
            instance_name=inst.instance_name, numero=destino, texto=texto,
        )
        enviado = True
    except evolution_api.EvolutionError as exc:
        erro = str(exc)

    return {"enviado": enviado, "provider_id": provider_id, "erro": erro}


async def instancia_conectada(
    db: AsyncSession, empresa_id: uuid.UUID
) -> VendasEvolutionInstancias | None:
    """A instância conectada da empresa (para SDR/campanha). Preferir 'conectada'."""
    inst = await db.scalar(
        select(VendasEvolutionInstancias)
        .where(
            VendasEvolutionInstancias.empresa_id == empresa_id,
            VendasEvolutionInstancias.status == "conectada",
        )
        .limit(1)
    )
    if inst is not None:
        return inst
    return await db.scalar(
        select(VendasEvolutionInstancias)
        .where(VendasEvolutionInstancias.empresa_id == empresa_id)
        .limit(1)
    )


# ───────────────────────── Webhook (ponto de entrada — COMMITA) ─────────────────────────

async def processar_webhook(db: AsyncSession, *, instancia, payload: dict) -> int:
    """Processa o callback da Evolution para UMA instância já identificada.

    - connection.update → atualiza status/numero da instância.
    - messages.upsert (inbound) → acha o lead pelo telefone, marca 'respondeu',
      espelha no Pipeline (append_mensagem), grava ultimo_canal='whatsapp_evo' e
      enfileira 'sdr_inbound' se o SDR estiver ativo+auto_responder. COMMITA.
    Retorna a quantidade de inbounds processados.
    """
    eventos = evolution_api.parse_webhook(payload)
    empresa_id = instancia.empresa_id

    conexao = eventos.get("conexao")
    if conexao and conexao.get("state"):
        instancia.status = {"open": "conectada", "connecting": "conectando"}.get(
            conexao["state"], "desconectada"
        )
        instancia.updated_at = _now()

    processadas = 0
    for inbound in eventos.get("mensagens") or []:
        de = inbound.get("from") or ""
        if not de:
            continue
        leads = (
            await db.scalars(
                select(VendasLeads).where(
                    VendasLeads.empresa_id == empresa_id,
                    VendasLeads.telefone.isnot(None),
                )
            )
        ).all()
        lead = next(
            (l for l in leads if re.sub(r"\D", "", l.telefone or "") == de), None
        )
        if lead is None:
            continue

        msg = await db.scalar(
            select(VendasMensagens)
            .where(
                VendasMensagens.empresa_id == empresa_id,
                VendasMensagens.lead_id == lead.id,
            )
            .order_by(VendasMensagens.created_at.desc())
            .limit(1)
        )
        if msg is not None and msg.respondeu_em is None:
            msg.respondeu_em = _now()
            msg.status = "respondeu"

        lead.ultimo_canal = "whatsapp_evo"
        processadas += 1

        from app.services.vendas_pipeline import append_mensagem

        try:
            await append_mensagem(
                db, empresa_id=empresa_id, lead_id=lead.id,
                sender_type="lead", conteudo=inbound.get("texto") or "",
                canal="whatsapp_evo", media=None,
            )
        except Exception:  # pragma: no cover - best-effort
            await db.rollback()

        from app.models.vendas_sdr import VendasSdrConfig

        sdr = await db.scalar(
            select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
        )
        if sdr is not None and sdr.ativo and sdr.auto_responder and sdr.api_key_enc:
            from app.core.queue import queue

            await db.commit()
            await queue.enqueue(
                "sdr_inbound",
                {
                    "empresa_id": str(empresa_id),
                    "lead_id": str(lead.id),
                    "mensagem": inbound.get("texto") or "",
                },
            )

    await db.commit()
    return processadas
```

- [ ] **Step 2: Escrever os testes de serviço (instância + envio, mockando a rede)**

```python
"""Testes do canal Evolution: serviço (ciclo de vida, envio) + webhook + cross-tenant.

A rede é SEMPRE mockada: substituímos as funções de
app.integrations.evolution_api por fakes async. Nenhum teste fala com a Evolution.
"""
import uuid

import pytest
from sqlalchemy import select

from app.core.esocial_crypto import encrypt_secret
from app.integrations import evolution_api
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasMensagens
from app.models.vendas_evolution import (
    VendasEvolutionInstancias,
    VendasEvolutionServidor,
)
from app.services import vendas_evolution as svc
from tests.helpers import login_as


async def _criar_servidor(db_session):
    srv = VendasEvolutionServidor(
        id=uuid.uuid4(),
        base_url="https://evo.test",
        api_key_enc=encrypt_secret("global-key"),
        webhook_base_url="https://toriq.test",
        limite_padrao_instancias=2,
        ativo=True,
    )
    db_session.add(srv)
    await db_session.commit()
    return srv


def _mock_rede(monkeypatch):
    chamadas = {"criadas": [], "webhooks": [], "textos": []}

    async def fake_criar(**kw):
        chamadas["criadas"].append(kw)
        return {"instance": {"instanceName": kw["instance_name"]}}

    async def fake_webhook(**kw):
        chamadas["webhooks"].append(kw)
        return {"webhook": "ok"}

    async def fake_qr(**kw):
        return {"base64": "data:image/png;base64,AAA", "code": "PAIR-123"}

    async def fake_estado(**kw):
        return "open"

    async def fake_texto(**kw):
        chamadas["textos"].append(kw)
        return "EVO-MSG-1"

    async def fake_logout(**kw):
        return {}

    async def fake_deletar(**kw):
        return {}

    monkeypatch.setattr(evolution_api, "criar_instancia", fake_criar)
    monkeypatch.setattr(evolution_api, "definir_webhook", fake_webhook)
    monkeypatch.setattr(evolution_api, "conectar_qrcode", fake_qr)
    monkeypatch.setattr(evolution_api, "estado_conexao", fake_estado)
    monkeypatch.setattr(evolution_api, "enviar_texto", fake_texto)
    monkeypatch.setattr(evolution_api, "logout", fake_logout)
    monkeypatch.setattr(evolution_api, "deletar", fake_deletar)
    return chamadas


@pytest.mark.anyio
async def test_criar_instancia_persiste_e_configura_webhook(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()

    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="Vendas SP"
    )
    await db_session.commit()

    assert inst.status == "conectando"
    assert inst.instance_name.startswith(f"emp_{str(empresa_id)[:8]}_")
    assert inst.webhook_token
    assert len(chamadas["criadas"]) == 1
    # webhook configurado com a URL pública + token
    assert chamadas["webhooks"][0]["webhook_url"].endswith(
        f"/vendas/evolution/webhook/{inst.webhook_token}"
    )


@pytest.mark.anyio
async def test_limite_de_instancias(db_session, monkeypatch):
    _mock_rede(monkeypatch)
    srv = await _criar_servidor(db_session)
    srv.limite_padrao_instancias = 1
    await db_session.commit()
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()

    await svc.criar_instancia(db_session, empresa_id=empresa_id, nome_exibicao="A")
    await db_session.commit()
    with pytest.raises(ValueError, match="limite"):
        await svc.criar_instancia(db_session, empresa_id=empresa_id, nome_exibicao="B")


@pytest.mark.anyio
async def test_enviar_texto_mockado(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    res = await svc.enviar_texto(
        db_session, empresa_id=empresa_id, instancia_id=inst.id,
        numero="+55 (11) 99999-0000", texto="oi",
    )
    assert res["enviado"] is True
    assert res["provider_id"] == "EVO-MSG-1"
    assert chamadas["textos"][0]["numero"] == "5511999990000"
```

- [ ] **Step 3: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_vendas_evolution.py -v`
Expected: PASS (3 testes). Pré-requisito: migration `e1f2a3b4c5d6` aplicada (Task 3).

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/services/vendas_evolution.py apps/api/tests/test_vendas_evolution.py
git commit -m "feat(evolution): servico de instancias e envio (TDD)"
```

---

## Task 7: Webhook inbound → Pipeline + SDR (TDD)

**Files:**
- Test: `apps/api/tests/test_vendas_evolution.py` (adicionar)

- [ ] **Step 1: Adicionar teste de webhook inbound**

Acrescente ao final de `apps/api/tests/test_vendas_evolution.py`:

```python
@pytest.mark.anyio
async def test_webhook_inbound_marca_respondeu_e_seta_ultimo_canal(
    db_session, monkeypatch
):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    lead = VendasLeads(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="Lead",
        telefone="+55 (11) 99999-0000",
    )
    db_session.add(lead)
    await db_session.commit()

    camp_id = uuid.uuid4()
    from app.models.vendas_disparo import VendasCampanhas

    db_session.add(
        VendasCampanhas(id=camp_id, empresa_id=empresa_id, nome="C", canal="whatsapp_evo")
    )
    msg = VendasMensagens(
        id=uuid.uuid4(), empresa_id=empresa_id, campanha_id=camp_id,
        lead_id=lead.id, canal="whatsapp_evo", destinatario="5511999990000",
        status="enviado",
    )
    db_session.add(msg)
    await db_session.commit()

    payload = {
        "event": "messages.upsert",
        "instance": inst.instance_name,
        "data": {
            "key": {
                "remoteJid": "5511999990000@s.whatsapp.net",
                "fromMe": False, "id": "IN-1",
            },
            "pushName": "Lead",
            "message": {"conversation": "tenho interesse"},
        },
    }
    n = await svc.processar_webhook(db_session, instancia=inst, payload=payload)
    assert n == 1

    refreshed = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg.id)
    )
    await db_session.refresh(refreshed)
    assert refreshed.status == "respondeu"

    lead_ref = await db_session.scalar(
        select(VendasLeads).where(VendasLeads.id == lead.id)
    )
    await db_session.refresh(lead_ref)
    assert lead_ref.ultimo_canal == "whatsapp_evo"


@pytest.mark.anyio
async def test_webhook_connection_update_atualiza_status(db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    payload = {
        "event": "connection.update",
        "instance": inst.instance_name,
        "data": {"state": "open"},
    }
    await svc.processar_webhook(db_session, instancia=inst, payload=payload)
    ref = await db_session.scalar(
        select(VendasEvolutionInstancias).where(VendasEvolutionInstancias.id == inst.id)
    )
    await db_session.refresh(ref)
    assert ref.status == "conectada"
```

- [ ] **Step 2: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_vendas_evolution.py -v -k webhook`
Expected: PASS. (O código de `processar_webhook` já foi escrito na Task 6; estes testes validam o comportamento. Se `append_mensagem` exigir colunas inexistentes, ele é best-effort e faz rollback — o teste ainda valida `respondeu`/`ultimo_canal`.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/test_vendas_evolution.py
git commit -m "test(evolution): webhook inbound + connection update"
```

---

## Task 8: Router (config servidor, instâncias, qrcode/status, enviar, webhook)

**Files:**
- Create: `apps/api/app/api/vendas_evolution.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_vendas_evolution.py` (adicionar testes de API)

- [ ] **Step 1: Escrever o router**

```python
"""Canal WhatsApp via Evolution API — router.

- Config do servidor (global): só super admin (admin_vertical).
- Instâncias: admin do módulo de vendas (admin_vertical/cliente_torq), escopadas
  por empresa. Super admin pode informar empresa_id ao criar.
- Webhook PÚBLICO identificado por webhook_token na URL (inválido → 403).

Tenant SEMPRE por user.empresa_id (403 se None), igual a app/api/vendas_disparo.py.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, mask_secret
from app.models.user import User, UserRole
from app.models.vendas_evolution import (
    VendasEvolutionInstancias,
    VendasEvolutionServidor,
)
from app.schemas import vendas_evolution as s
from app.services import vendas_evolution as svc

router = APIRouter(prefix="/vendas", tags=["vendas-evolution"])

require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)
require_super = require_role(UserRole.admin_vertical)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _instancia_out(o: VendasEvolutionInstancias) -> s.InstanciaOut:
    return s.InstanciaOut(
        id=o.id, empresa_id=o.empresa_id, nome_exibicao=o.nome_exibicao,
        instance_name=o.instance_name, numero=o.numero, status=o.status,
        created_at=o.created_at,
    )


# ───────────────────────── Config do servidor (super admin) ─────────────────────────

@router.get("/evolution/servidor", response_model=s.ServidorPublic)
async def get_servidor(
    user: User = Depends(require_super), db: AsyncSession = Depends(get_db)
):
    obj = await svc.get_servidor(db)
    if obj is None:
        return s.ServidorPublic()
    masked = mask_secret(decrypt_secret(obj.api_key_enc)) if obj.api_key_enc else None
    return s.ServidorPublic(
        base_url=obj.base_url, webhook_base_url=obj.webhook_base_url,
        limite_padrao_instancias=obj.limite_padrao_instancias, ativo=obj.ativo,
        api_key_set=bool(obj.api_key_enc), api_key_masked=masked,
    )


@router.put("/evolution/servidor", response_model=s.ServidorPublic)
async def put_servidor(
    dados: s.ServidorUpdate,
    user: User = Depends(require_super),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.salvar_servidor(db, dados=dados)
    await db.commit()
    masked = mask_secret(decrypt_secret(obj.api_key_enc)) if obj.api_key_enc else None
    return s.ServidorPublic(
        base_url=obj.base_url, webhook_base_url=obj.webhook_base_url,
        limite_padrao_instancias=obj.limite_padrao_instancias, ativo=obj.ativo,
        api_key_set=bool(obj.api_key_enc), api_key_masked=masked,
    )


# ───────────────────────── Instâncias (empresa) ─────────────────────────

@router.get("/evolution/instancias", response_model=list[s.InstanciaOut])
async def listar_instancias(
    user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    empresa_id = _require_empresa(user)
    rows = (
        await db.scalars(
            select(VendasEvolutionInstancias)
            .where(VendasEvolutionInstancias.empresa_id == empresa_id)
            .order_by(VendasEvolutionInstancias.created_at.desc())
        )
    ).all()
    return [_instancia_out(o) for o in rows]


@router.post("/evolution/instancias", response_model=s.InstanciaOut)
async def criar_instancia(
    dados: s.InstanciaIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Super admin pode criar para outra empresa; demais usam a própria.
    if dados.empresa_id is not None and user.role == UserRole.admin_vertical:
        empresa_id = dados.empresa_id
    else:
        empresa_id = _require_empresa(user)
    try:
        inst = await svc.criar_instancia(
            db, empresa_id=empresa_id,
            nome_exibicao=dados.nome_exibicao, criado_por=user.id,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    await db.commit()
    return _instancia_out(inst)


@router.get("/evolution/instancias/{instancia_id}/qrcode", response_model=s.QRCodeOut)
async def qrcode(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        data = await svc.obter_qrcode(db, empresa_id=empresa_id, instancia_id=instancia_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    return s.QRCodeOut(**data)


@router.get("/evolution/instancias/{instancia_id}/status", response_model=s.StatusOut)
async def status_instancia(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        st = await svc.sincronizar_status(
            db, empresa_id=empresa_id, instancia_id=instancia_id
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    await db.commit()
    return s.StatusOut(status=st)


@router.delete("/evolution/instancias/{instancia_id}")
async def deletar_instancia(
    instancia_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    ok = await svc.deletar_instancia(
        db, empresa_id=empresa_id, instancia_id=instancia_id
    )
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "instância não encontrada")
    await db.commit()
    return {"ok": True}


@router.post("/evolution/instancias/{instancia_id}/enviar", response_model=s.EnviarOut)
async def enviar(
    instancia_id: uuid.UUID,
    dados: s.EnviarIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    try:
        res = await svc.enviar_texto(
            db, empresa_id=empresa_id, instancia_id=instancia_id,
            numero=dados.numero, texto=dados.texto,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    await db.commit()
    return s.EnviarOut(**res)


# ───────────────────────── Webhook (público) ─────────────────────────

@router.post("/evolution/webhook/{webhook_token}")
async def webhook(
    webhook_token: str, request: Request, db: AsyncSession = Depends(get_db)
):
    inst = await db.scalar(
        select(VendasEvolutionInstancias).where(
            VendasEvolutionInstancias.webhook_token == webhook_token
        )
    )
    if inst is None:
        return JSONResponse({"detail": "forbidden"}, status_code=status.HTTP_403_FORBIDDEN)
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        payload = {}
    await svc.processar_webhook(db, instancia=inst, payload=payload)
    return JSONResponse({"ok": True}, status_code=200)
```

- [ ] **Step 2: Registrar o router em `main.py`**

Em `apps/api/app/main.py`, após a linha `from app.api.vendas_sdr import router as vendas_sdr_router` (linha ~101), adicionar:

```python
from app.api.vendas_evolution import router as vendas_evolution_router
```

E após `app.include_router(vendas_sdr_router)` (linha ~193), adicionar:

```python
    app.include_router(vendas_evolution_router)
```

- [ ] **Step 3: Adicionar testes de API (auth + cross-tenant)**

Acrescente ao final de `apps/api/tests/test_vendas_evolution.py`:

```python
@pytest.mark.anyio
async def test_api_servidor_requer_super_admin(client, db_session):
    # cliente_torq NÃO pode configurar o servidor global.
    await login_as(client, db_session, role="cliente_torq", email="evo_cli@torq.com")
    r = await client.put("/vendas/evolution/servidor", json={"base_url": "x"})
    assert r.status_code == 403, r.text


@pytest.mark.anyio
async def test_api_criar_instancia_e_listar(client, db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = await login_as(
        client, db_session, role="cliente_torq", email="evo_ok@torq.com"
    )
    r = await client.post(
        "/vendas/evolution/instancias", json={"nome_exibicao": "Minha"}
    )
    assert r.status_code == 200, r.text
    iid = r.json()["id"]

    r2 = await client.get("/vendas/evolution/instancias")
    assert r2.status_code == 200
    assert any(i["id"] == iid for i in r2.json())


@pytest.mark.anyio
async def test_api_cross_tenant_nao_ve_instancia_de_outro(client, db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    # Empresa A cria instância.
    empresa_a = await login_as(
        client, db_session, role="cliente_torq", email="evo_a@torq.com"
    )
    ra = await client.post(
        "/vendas/evolution/instancias", json={"nome_exibicao": "A"}
    )
    iid_a = ra.json()["id"]

    # Empresa B loga e não deve ver a instância de A.
    await login_as(client, db_session, role="cliente_torq", email="evo_b@torq.com")
    rb = await client.get("/vendas/evolution/instancias")
    assert all(i["id"] != iid_a for i in rb.json())


@pytest.mark.anyio
async def test_api_webhook_token_invalido_403(client, db_session):
    r = await client.post(
        "/vendas/evolution/webhook/token-que-nao-existe", json={"event": "x"}
    )
    assert r.status_code == 403, r.text
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_vendas_evolution.py -v`
Expected: PASS (todos). Pré-requisito: router registrado (Step 2) + migration aplicada.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/api/vendas_evolution.py apps/api/app/main.py apps/api/tests/test_vendas_evolution.py
git commit -m "feat(evolution): router (servidor, instancias, qrcode, enviar, webhook)"
```

---

## Task 9: Roteamento de campanha por `whatsapp_evo` (TDD)

**Files:**
- Modify: `apps/api/app/services/vendas_disparo.py`
- Test: `apps/api/tests/test_vendas_evolution.py` (adicionar)

- [ ] **Step 1: Ler o trecho de envio que roteia por canal**

Run: `cd apps/api && sed -n '240,260p;320,360p;380,470p' app/services/vendas_disparo.py`
Expected: ver as checagens `campanha.canal == "whatsapp"`, `eh_whatsapp`, `_campo_destino`, e o bloco `if eh_whatsapp:` que chama `enviar_mensagem_whatsapp`.

- [ ] **Step 2: Adicionar suporte ao canal `whatsapp_evo`**

No `app/services/vendas_disparo.py`, fazer os seguintes ajustes mínimos (mantendo o comportamento atual de email/whatsapp):

(a) Onde o destinatário é o telefone, tratar ambos os canais de WhatsApp. Trocar as duas funções helper:

```python
def _campo_destino(campanha):
    """Coluna do lead usada como destinatário conforme o canal da campanha."""
    return (
        VendasLeads.telefone
        if campanha.canal in ("whatsapp", "whatsapp_evo")
        else VendasLeads.email
    )


def _valor_destino(lead, campanha):
    return (
        lead.telefone
        if campanha.canal in ("whatsapp", "whatsapp_evo")
        else lead.email
    )
```

(Ajuste os nomes/local exatos conforme as linhas vistas no Step 1 — são as funções perto das linhas 49 e 54.)

(b) Na validação de config (perto das linhas 244 e 323), permitir `whatsapp_evo` sem exigir config SMTP/Meta. Trocar:

```python
    if campanha.canal == "whatsapp":
        if config is None or not config.whatsapp_phone_id:
            raise ValueError("configure o WhatsApp (Meta) antes de enviar")
    elif campanha.canal == "whatsapp_evo":
        from app.services.vendas_evolution import instancia_conectada

        if await instancia_conectada(db, campanha.empresa_id) is None:
            raise ValueError("conecte uma instância Evolution antes de enviar")
    else:
        if config is None or not config.smtp_host:
            raise ValueError("configure o email antes de enviar")
```

(c) No bloco de envio por destinatário (perto da linha 383/431), adicionar o ramo `whatsapp_evo` ANTES do ramo de email:

```python
    eh_whatsapp = campanha.canal == "whatsapp"
    eh_evo = campanha.canal == "whatsapp_evo"
    tipo_supressao = "telefone" if (eh_whatsapp or eh_evo) else "email"
```

e onde hoje está `if eh_whatsapp: ... enviar_mensagem_whatsapp(...)`, adicionar:

```python
        if eh_evo:
            from app.services.vendas_evolution import (
                enviar_texto as evo_enviar,
                instancia_conectada,
            )

            inst = await instancia_conectada(db, campanha.empresa_id)
            corpo = (template.conteudo if template is not None else "") or ""
            res = await evo_enviar(
                db, empresa_id=campanha.empresa_id, instancia_id=inst.id,
                numero=destino, texto=corpo,
            )
            if res["enviado"]:
                mensagem.status = "enviado"
                mensagem.provider_id = res["provider_id"]
                mensagem.instancia_id = inst.id
                mensagem.enviado_em = _now()
            else:
                mensagem.status = "erro"
                mensagem.erro = res["erro"]
        elif eh_whatsapp:
            # ... (bloco existente do Meta, inalterado)
```

(d) Na métrica de uso (perto da linha 506), incluir o canal evo:

```python
        metrica=(
            "whatsapp_enviados" if (eh_whatsapp or eh_evo) else "emails_enviados"
        ),
```

> Nota: `destino`, `mensagem`, `template`, `config` e `_now` já existem no escopo dessa função no arquivo. Use os nomes locais exatos que aparecem no Step 1.

- [ ] **Step 3: Escrever o teste de campanha por `whatsapp_evo`**

Acrescente ao final de `apps/api/tests/test_vendas_evolution.py`:

```python
@pytest.mark.anyio
async def test_campanha_whatsapp_evo_envia_pela_instancia(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    inst.status = "conectada"
    await db_session.commit()

    lead = VendasLeads(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="L",
        telefone="+55 (11) 98888-7777",
    )
    db_session.add(lead)
    from app.models.vendas_disparo import VendasCampanhas, VendasTemplates

    tpl = VendasTemplates(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="T",
        canal="whatsapp_evo", conteudo="Olá!",
    )
    db_session.add(tpl)
    await db_session.commit()
    camp = VendasCampanhas(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="C",
        canal="whatsapp_evo", template_id=tpl.id, lead_ids=[str(lead.id)],
        status="rascunho",
    )
    db_session.add(camp)
    await db_session.commit()

    from app.services import vendas_disparo as disparo

    await disparo.preparar_campanha(db_session, camp.id, empresa_id)
    await disparo.enviar_campanha(db_session, camp.id, empresa_id)
    await db_session.commit()

    assert len(chamadas["textos"]) == 1
    assert chamadas["textos"][0]["texto"] == "Olá!"
    msg = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.campanha_id == camp.id)
    )
    await db_session.refresh(msg)
    assert msg.status == "enviado"
    assert msg.instancia_id == inst.id
```

> Confirme no Step 1 os nomes exatos `preparar_campanha`/`enviar_campanha` e suas assinaturas; ajuste a chamada se diferirem.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_vendas_evolution.py::test_campanha_whatsapp_evo_envia_pela_instancia -v`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte de disparo (regressão Meta/email)**

Run: `cd apps/api && pytest tests/test_vendas_disparo.py tests/test_vendas_whatsapp.py -v`
Expected: PASS (nada quebrou nos canais existentes).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/vendas_disparo.py apps/api/tests/test_vendas_evolution.py
git commit -m "feat(evolution): roteamento de campanha por canal whatsapp_evo"
```

---

## Task 10: SDR channel-aware (TDD)

**Files:**
- Modify: `apps/api/app/services/vendas_sdr.py`
- Test: `apps/api/tests/test_vendas_evolution.py` (adicionar)

- [ ] **Step 1: Tornar `_enviar_whatsapp_sdr` ciente do canal**

Em `apps/api/app/services/vendas_sdr.py`, substituir a função `_enviar_whatsapp_sdr` (linhas ~502-530) por:

```python
async def _enviar_whatsapp_sdr(
    db: AsyncSession, *, empresa_id: uuid.UUID, to: str, texto: str,
    canal: str = "whatsapp",
) -> bool:
    """Envia um texto por WhatsApp escolhendo o transporte pelo canal do lead.
    'whatsapp_evo' → Evolution; 'whatsapp' (default) → Meta. Tolerante a falhas."""
    import re

    destino = re.sub(r"\D", "", to or "")
    if not destino:
        return False

    if canal == "whatsapp_evo":
        from app.services.vendas_evolution import enviar_texto, instancia_conectada

        inst = await instancia_conectada(db, empresa_id)
        if inst is None:
            return False
        try:
            res = await enviar_texto(
                db, empresa_id=empresa_id, instancia_id=inst.id,
                numero=destino, texto=texto,
            )
            return bool(res.get("enviado"))
        except Exception:
            return False

    from app.integrations.whatsapp_meta import WhatsAppError, send_text
    from app.models.vendas_disparo import VendasDisparoConfig

    dconf = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if dconf is None or not dconf.whatsapp_phone_id or not dconf.whatsapp_token_enc:
        return False
    try:
        await send_text(
            phone_id=dconf.whatsapp_phone_id,
            token=decrypt_secret(dconf.whatsapp_token_enc),
            to=destino, body=texto,
        )
        return True
    except WhatsAppError:
        return False
```

- [ ] **Step 2: Passar o canal do lead nos callers**

Há 3 chamadas a `_enviar_whatsapp_sdr` (linhas ~626, ~687, ~784). Para as que respondem ao lead (resposta automática e resposta manual), passar o canal do lead:

```python
        enviou = await _enviar_whatsapp_sdr(
            db, empresa_id=empresa_id, to=lead.telefone or "", texto=next_msg,
            canal=(lead.ultimo_canal or "whatsapp"),
        )
```

e (na resposta manual, ~784):

```python
        enviou = await _enviar_whatsapp_sdr(
            db, empresa_id=empresa_id, to=lead.telefone or "", texto=texto,
            canal=(lead.ultimo_canal or "whatsapp"),
        )
```

A chamada de handoff para telefones internos (~687) pode usar o mesmo canal do lead:

```python
            if await _enviar_whatsapp_sdr(
                db, empresa_id=empresa_id, to=tel, texto=alerta,
                canal=(lead.ultimo_canal or "whatsapp"),
            ):
```

> Confirme que `lead` está no escopo das 3 chamadas (está, segundo o grep da exploração). Use os nomes locais exatos.

- [ ] **Step 3: Escrever teste do SDR roteando para Evolution**

Acrescente ao final de `apps/api/tests/test_vendas_evolution.py`:

```python
@pytest.mark.anyio
async def test_sdr_envia_via_evolution_quando_ultimo_canal_evo(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    inst.status = "conectada"
    await db_session.commit()

    from app.services.vendas_sdr import _enviar_whatsapp_sdr

    ok = await _enviar_whatsapp_sdr(
        db_session, empresa_id=empresa_id, to="5511999990000",
        texto="resposta sdr", canal="whatsapp_evo",
    )
    assert ok is True
    assert chamadas["textos"][-1]["texto"] == "resposta sdr"
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && pytest tests/test_vendas_evolution.py::test_sdr_envia_via_evolution_quando_ultimo_canal_evo -v`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte do SDR (regressão)**

Run: `cd apps/api && pytest tests/test_vendas_sdr.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/vendas_sdr.py apps/api/tests/test_vendas_evolution.py
git commit -m "feat(evolution): SDR responde channel-aware (Meta/Evolution)"
```

---

## Task 11: Suíte completa + verificação contra a Evolution real

**Files:** nenhum novo (validação).

- [ ] **Step 1: Rodar a suíte inteira**

Run: `cd apps/api && pytest -q`
Expected: tudo verde. Investigar/consertar qualquer falha antes de prosseguir.

- [ ] **Step 2: Verificação manual contra a Evolution da VPS (smoke)**

Com a app rodando e logado como super admin:
1. `PUT /vendas/evolution/servidor` com `base_url` (sua VPS), `api_key` (a global da Evolution) e `webhook_base_url` (URL pública do TORIQ).
2. Logado como empresa: `POST /vendas/evolution/instancias {"nome_exibicao":"Teste"}`.
3. `GET /vendas/evolution/instancias/{id}/qrcode` → escanear o QR no WhatsApp.
4. `GET /vendas/evolution/instancias/{id}/status` → deve virar `conectada`.
5. `POST /vendas/evolution/instancias/{id}/enviar {"numero":"55...","texto":"oi"}` → mensagem chega.
6. Responder a partir do celular → conferir que o webhook gravou no Pipeline e (se SDR ativo) houve resposta automática.

**Se algum payload divergir** (paths/campos), ajustar `app/integrations/evolution_api.py` conforme a versão da sua Evolution — os pontos marcados "A CONFIRMAR" no arquivo. Reexecutar `pytest tests/test_evolution_api.py` após ajustes.

- [ ] **Step 3: Commit de eventuais ajustes**

```bash
git add -A
git commit -m "fix(evolution): ajustes de payload conforme instancia real"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** servidor global (Task 3/6/8), instâncias multi-tenant (6/8), QR/status (6/8), envio avulso (6/8), campanhas `whatsapp_evo` (9), webhook inbound→Pipeline→SDR (6/7), SDR channel-aware via `ultimo_canal` (2/10), criptografia/masking (6/8), isolamento cross-tenant (8). Fora do escopo do spec (evoai endpoints, grupos, múltiplos servidores) corretamente omitidos. **Frontend é plano separado** (declarado no topo).
- **Placeholders:** nenhum — todo passo tem código/comando reais. Os pontos "A CONFIRMAR" são verificação de versão da Evolution (Task 11), não lacunas de design.
- **Consistência de tipos/nomes:** integração (`criar_instancia`, `definir_webhook`, `conectar_qrcode`, `estado_conexao`, `enviar_texto`, `logout`, `deletar`, `parse_webhook`, `map_status`, `EvolutionError`), serviço (`criar_instancia`, `obter_qrcode`, `sincronizar_status`, `deletar_instancia`, `enviar_texto`, `instancia_conectada`, `processar_webhook`, `get_servidor`, `salvar_servidor`) e router usam os mesmos nomes em todas as tasks. Models `VendasEvolutionServidor`/`VendasEvolutionInstancias` batem com a migration.
