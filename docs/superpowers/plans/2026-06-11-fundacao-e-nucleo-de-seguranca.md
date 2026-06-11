# Fundação + Núcleo de Segurança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um "esqueleto andante" do novo backend Python que prova a arquitetura de ponta a ponta: um usuário se cadastra, faz login via JWT em cookie httpOnly, e só enxerga dados da própria empresa (isolamento multi-tenant estrutural, substituindo o RLS do Supabase).

**Architecture:** `apps/api` é um serviço FastAPI standalone (deps via `uv`), falando com Postgres via SQLAlchemy 2.0 async + Alembic. Roda junto de Postgres e MinIO via `docker-compose`. Autenticação própria (argon2 + JWT access/refresh em cookies httpOnly). O isolamento de tenant é aplicado por um *repository base* que injeta `WHERE empresa_id = :empresa_id` automaticamente a partir do `empresa_id` do JWT.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async, asyncpg), Alembic, pydantic-settings, passlib[argon2], PyJWT, pytest + pytest-asyncio + httpx, uv, Docker Compose (postgres:17, minio).

**Escopo deste plano (e o que fica para depois):**
- ✅ Scaffold do `apps/api`, docker-compose (postgres + minio), conexão DB, Alembic.
- ✅ Tabelas mínimas: `empresas`, `users` (enum de role real), e `notas` (tabela demo para provar isolamento).
- ✅ Auth: register, login, refresh, logout (cookies httpOnly), argon2.
- ✅ RBAC (`require_role`) + repository base com isolamento por `empresa_id`.
- ⏭️ **Fora deste plano:** introspecção completa das 172 tabelas (próximo plano "camada de dados"); mover o front para `apps/web` + wiring pnpm/turbo (plano "religar front"); geração do `packages/api-client`; eSocial.

**Pré-requisitos (instalar antes da Task 1):**
- `uv` instalado (`pip install uv` ou installer oficial).
- Docker Desktop rodando.
- Trabalhar na branch `feature/migracao-backend-python`.

**Papéis reais (enum `user_role`):** `admin_vertical`, `cliente_torq`, `cliente_final`, `empresa_parceira`, `instrutor`.

---

### Task 1: Scaffold do `apps/api` com FastAPI e endpoint de health

**Files:**
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/main.py`
- Create: `apps/api/app/api/__init__.py`
- Create: `apps/api/app/api/health.py`
- Create: `apps/api/tests/__init__.py`
- Create: `apps/api/tests/conftest.py`
- Create: `apps/api/tests/test_health.py`

- [ ] **Step 1: Criar `apps/api/pyproject.toml`**

```toml
[project]
name = "toriq-api"
version = "0.1.0"
description = "Backend FastAPI do TORIQ"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30",
    "alembic>=1.14",
    "pydantic-settings>=2.7",
    "passlib[argon2]>=1.7.4",
    "pyjwt>=2.10",
    "python-multipart>=0.0.20",
]

[dependency-groups]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.25",
    "httpx>=0.28",
    "aiosqlite>=0.20",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.uv]
package = false
```

- [ ] **Step 2: Criar o app FastAPI mínimo**

`apps/api/app/__init__.py` (vazio).

`apps/api/app/api/__init__.py` (vazio).

`apps/api/app/main.py`:

```python
from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="TORIQ API", version="0.1.0")
    app.include_router(health_router)
    return app


app = create_app()
```

`apps/api/app/api/health.py`:

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 3: Escrever o teste que falha**

`apps/api/tests/__init__.py` (vazio).

`apps/api/tests/conftest.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

`apps/api/tests/test_health.py`:

```python
async def test_health_returns_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 4: Instalar deps e rodar o teste**

Run (a partir de `apps/api`):
```bash
uv sync
uv run pytest tests/test_health.py -v
```
Expected: PASS (1 passed).

- [ ] **Step 5: Criar `.gitignore` do api e commitar**

`apps/api/.gitignore`:
```
.venv/
__pycache__/
*.pyc
.pytest_cache/
.env
```

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/app apps/api/tests apps/api/.gitignore
git commit -m "feat(api): scaffold FastAPI com endpoint de health"
```

---

### Task 2: docker-compose com Postgres + MinIO

**Files:**
- Create: `docker-compose.yml` (raiz do repo)
- Create: `.env.example` (raiz do repo)

- [ ] **Step 1: Criar `docker-compose.yml` na raiz**

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-toriq}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-toriq}
      POSTGRES_DB: ${POSTGRES_DB:-toriq}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-toriq}"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

- [ ] **Step 2: Criar `.env.example` na raiz**

```bash
# Postgres
POSTGRES_USER=toriq
POSTGRES_PASSWORD=toriq
POSTGRES_DB=toriq

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# API
DATABASE_URL=postgresql+asyncpg://toriq:toriq@localhost:5432/toriq
JWT_SECRET=troque-isto-por-um-segredo-forte
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=1209600
COOKIE_SECURE=false
```

- [ ] **Step 3: Subir os containers e verificar**

Run:
```bash
cp .env.example .env
docker compose up -d
docker compose ps
```
Expected: `postgres` com status `healthy` e `minio` `running`.

Run (verifica conexão ao Postgres):
```bash
docker compose exec postgres pg_isready -U toriq
```
Expected: `accepting connections`.

- [ ] **Step 4: Commitar**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: docker-compose com postgres e minio"
```

---

### Task 3: Configuração (settings) + engine SQLAlchemy async

**Files:**
- Create: `apps/api/app/core/__init__.py`
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/app/core/db.py`
- Create: `apps/api/tests/test_config.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_config.py`:

```python
from app.core.config import Settings


def test_settings_reads_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("JWT_SECRET", "x")
    s = Settings()
    assert s.database_url.startswith("postgresql+asyncpg://")
    assert s.jwt_access_ttl_seconds == 900
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `uv run pytest tests/test_config.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.core.config'`.

- [ ] **Step 3: Implementar config e db**

`apps/api/app/core/__init__.py` (vazio).

`apps/api/app/core/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_access_ttl_seconds: int = 900
    jwt_refresh_ttl_seconds: int = 1209600
    cookie_secure: bool = False


settings = Settings()  # type: ignore[call-arg]
```

`apps/api/app/core/db.py`:

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `uv run pytest tests/test_config.py -v`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/core apps/api/tests/test_config.py
git commit -m "feat(api): settings via pydantic e engine SQLAlchemy async"
```

---

### Task 4: Models (`empresas`, `users`, `notas`) + Alembic baseline

**Files:**
- Create: `apps/api/app/models/__init__.py`
- Create: `apps/api/app/models/empresa.py`
- Create: `apps/api/app/models/user.py`
- Create: `apps/api/app/models/nota.py`
- Create: `apps/api/alembic.ini`
- Create: `apps/api/migrations/env.py`
- Create: `apps/api/migrations/script.py.mako`
- Create: `apps/api/migrations/versions/` (diretório vazio com `.gitkeep`)

> **Nota de modelagem:** `users` é a tabela de credenciais própria que substitui `auth.users` do Supabase. A relação 1:1 com a futura `profiles` (que virá na introspecção) será feita no plano da camada de dados. `notas` é uma tabela **demo descartável** que existe só para provar o isolamento de tenant nesta fase; ela será removida quando o primeiro módulo real existir.

- [ ] **Step 1: Criar os models**

`apps/api/app/models/__init__.py`:

```python
from app.models.empresa import Empresa
from app.models.nota import Nota
from app.models.user import User, UserRole

__all__ = ["Empresa", "User", "UserRole", "Nota"]
```

`apps/api/app/models/empresa.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String, nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False, default="sst")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

`apps/api/app/models/user.py`:

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserRole(str, enum.Enum):
    admin_vertical = "admin_vertical"
    cliente_torq = "cliente_torq"
    cliente_final = "cliente_final"
    empresa_parceira = "empresa_parceira"
    instrutor = "instrutor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String, nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"), nullable=False
    )
    empresa_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=True
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

`apps/api/app/models/nota.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Nota(Base):
    """Tabela DEMO para provar isolamento multi-tenant. Remover quando houver módulo real."""

    __tablename__ = "notas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=False, index=True
    )
    texto: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 2: Inicializar Alembic (async)**

Run (a partir de `apps/api`):
```bash
uv run alembic init -t async migrations
```
Expected: cria `alembic.ini` e `migrations/`.

- [ ] **Step 3: Configurar `migrations/env.py` para usar nossos settings e metadata**

Substituir o conteúdo de `apps/api/migrations/env.py` por:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

from app.core.config import settings
from app.core.db import Base
import app.models  # noqa: F401  (registra os models no metadata)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


run_migrations_online()
```

- [ ] **Step 4: Gerar a migration baseline**

Run (com os containers de pé):
```bash
uv run alembic revision --autogenerate -m "baseline: empresas, users, notas"
```
Expected: cria um arquivo em `migrations/versions/` contendo `create_table('empresas')`, `create_table('users')`, `create_table('notas')` e o enum `user_role`.

- [ ] **Step 5: Aplicar e verificar**

Run:
```bash
uv run alembic upgrade head
docker compose exec postgres psql -U toriq -d toriq -c "\dt"
```
Expected: lista `empresas`, `users`, `notas`, `alembic_version`.

- [ ] **Step 6: Commitar**

```bash
git add apps/api/app/models apps/api/alembic.ini apps/api/migrations
git commit -m "feat(api): models empresas/users/notas e migration baseline"
```

---

### Task 5: Hashing de senha com argon2

**Files:**
- Create: `apps/api/app/core/security.py`
- Create: `apps/api/tests/test_security.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_security.py`:

```python
from app.core.security import hash_password, verify_password


def test_hash_is_not_plaintext_and_verifies():
    h = hash_password("segredo123")
    assert h != "segredo123"
    assert verify_password("segredo123", h) is True
    assert verify_password("errada", h) is False
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_security.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.core.security'`.

- [ ] **Step 3: Implementar**

`apps/api/app/core/security.py`:

```python
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_security.py -v`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/core/security.py apps/api/tests/test_security.py
git commit -m "feat(api): hashing de senha com argon2"
```

---

### Task 6: Tokens JWT (access + refresh)

**Files:**
- Create: `apps/api/app/core/tokens.py`
- Create: `apps/api/tests/test_tokens.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_tokens.py`:

```python
import uuid

import pytest

from app.core.tokens import create_token, decode_token, TokenError


def test_roundtrip_access_token():
    uid = str(uuid.uuid4())
    token = create_token(subject=uid, token_type="access", empresa_id="e1", role="admin_vertical")
    payload = decode_token(token)
    assert payload["sub"] == uid
    assert payload["type"] == "access"
    assert payload["empresa_id"] == "e1"
    assert payload["role"] == "admin_vertical"


def test_tampered_token_raises():
    token = create_token(subject="x", token_type="access", empresa_id=None, role="instrutor")
    with pytest.raises(TokenError):
        decode_token(token + "tamper")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_tokens.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar**

`apps/api/app/core/tokens.py`:

```python
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    pass


def create_token(
    *,
    subject: str,
    token_type: TokenType,
    empresa_id: str | None,
    role: str,
) -> str:
    ttl = (
        settings.jwt_access_ttl_seconds
        if token_type == "access"
        else settings.jwt_refresh_ttl_seconds
    )
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "empresa_id": empresa_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_tokens.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/core/tokens.py apps/api/tests/test_tokens.py
git commit -m "feat(api): emissão e validação de JWT access/refresh"
```

---

### Task 7: Fixture de banco para testes (SQLite async) + schemas Pydantic

**Files:**
- Modify: `apps/api/tests/conftest.py`
- Create: `apps/api/app/schemas/__init__.py`
- Create: `apps/api/app/schemas/auth.py`

> **Decisão de teste:** os testes usam SQLite async (`aiosqlite`) em memória, criando o schema a partir do `Base.metadata`. Isso mantém a suíte rápida e sem dependência do Docker. (As migrations Alembic continuam sendo a fonte da verdade para Postgres; os models são compartilhados.)

- [ ] **Step 1: Criar os schemas Pydantic de auth**

`apps/api/app/schemas/__init__.py` (vazio).

`apps/api/app/schemas/auth.py`:

```python
import uuid

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nome: str
    role: UserRole
    empresa_id: uuid.UUID | None

    model_config = {"from_attributes": True}
```

> `EmailStr` exige `email-validator`. Adicionar a dep: a partir de `apps/api` rode `uv add "pydantic[email]"`.

- [ ] **Step 2: Reescrever `conftest.py` com DB de teste e override de `get_db`**

`apps/api/tests/conftest.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base, get_db
from app.main import app


@pytest.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with maker() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Rodar a suíte e garantir que o health ainda passa**

Run: `uv run pytest tests/test_health.py -v`
Expected: PASS (o override não quebra rotas existentes).

- [ ] **Step 4: Commitar**

```bash
git add apps/api/app/schemas apps/api/tests/conftest.py apps/api/pyproject.toml apps/api/uv.lock
git commit -m "test(api): fixture de DB SQLite async e schemas de auth"
```

---

### Task 8: Endpoints de register e login (cookies httpOnly)

**Files:**
- Create: `apps/api/app/api/auth.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_auth_flow.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_auth_flow.py`:

```python
import uuid


async def test_register_then_login_sets_cookies(client, db_session):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()

    reg = await client.post(
        "/auth/register",
        json={
            "email": "a@a.com",
            "password": "segredo123",
            "nome": "Ana",
            "role": "cliente_torq",
            "empresa_id": str(empresa.id),
        },
    )
    assert reg.status_code == 201
    assert reg.json()["email"] == "a@a.com"

    login = await client.post(
        "/auth/login", json={"email": "a@a.com", "password": "segredo123"}
    )
    assert login.status_code == 200
    assert "access_token" in login.cookies
    assert "refresh_token" in login.cookies


async def test_login_wrong_password_401(client, db_session):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post(
        "/auth/register",
        json={
            "email": "b@b.com", "password": "certa123", "nome": "Bia",
            "role": "instrutor", "empresa_id": str(empresa.id),
        },
    )
    resp = await client.post("/auth/login", json={"email": "b@b.com", "password": "errada"})
    assert resp.status_code == 401
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_auth_flow.py -v`
Expected: FAIL com 404 (rotas `/auth/*` não existem).

- [ ] **Step 3: Implementar os endpoints**

`apps/api/app/api/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import hash_password, verify_password
from app.core.tokens import create_token
from app.models.user import User
from app.schemas.auth import LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, user: User) -> None:
    empresa_id = str(user.empresa_id) if user.empresa_id else None
    access = create_token(
        subject=str(user.id), token_type="access",
        empresa_id=empresa_id, role=user.role.value,
    )
    refresh = create_token(
        subject=str(user.id), token_type="refresh",
        empresa_id=empresa_id, role=user.role.value,
    )
    common = {"httponly": True, "secure": settings.cookie_secure, "samesite": "lax"}
    response.set_cookie("access_token", access,
                        max_age=settings.jwt_access_ttl_seconds, **common)
    response.set_cookie("refresh_token", refresh,
                        max_age=settings.jwt_refresh_ttl_seconds, path="/auth", **common)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> User:
    exists = await db.scalar(select(User).where(User.email == payload.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "email já cadastrado")
    user = User(
        email=payload.email,
        senha_hash=hash_password(payload.password),
        nome=payload.nome,
        role=payload.role,
        empresa_id=payload.empresa_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response,
                db: AsyncSession = Depends(get_db)) -> User:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credenciais inválidas")
    if not user.ativo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário inativo")
    _set_auth_cookies(response, user)
    return user
```

`apps/api/app/main.py` (adicionar o router):

```python
from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="TORIQ API", version="0.1.0")
    app.include_router(health_router)
    app.include_router(auth_router)
    return app


app = create_app()
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_auth_flow.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/api/auth.py apps/api/app/main.py apps/api/tests/test_auth_flow.py
git commit -m "feat(api): register e login com cookies httpOnly"
```

---

### Task 9: Dependência `get_current_user` (lê o cookie de access)

**Files:**
- Create: `apps/api/app/api/deps.py`
- Create: `apps/api/tests/test_current_user.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_current_user.py`:

```python
import uuid

from fastapi import Depends

from app.api.deps import CurrentUser, get_current_user
from app.main import app


@app.get("/whoami")
async def whoami(user: CurrentUser = Depends(get_current_user)):
    return {"id": str(user.id), "empresa_id": str(user.empresa_id), "role": user.role.value}


async def _seed_and_login(client, db_session, role="cliente_torq"):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": "c@c.com", "password": "segredo123", "nome": "Cau",
        "role": role, "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": "c@c.com", "password": "segredo123"})
    return empresa


async def test_whoami_with_cookie(client, db_session):
    empresa = await _seed_and_login(client, db_session)
    resp = await client.get("/whoami")
    assert resp.status_code == 200
    assert resp.json()["empresa_id"] == str(empresa.id)


async def test_whoami_without_cookie_401(client):
    resp = await client.get("/whoami")
    assert resp.status_code == 401
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_current_user.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.api.deps'`.

- [ ] **Step 3: Implementar**

`apps/api/app/api/deps.py`:

```python
import uuid
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.tokens import TokenError, decode_token
from app.models.user import User


async def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "não autenticado")
    try:
        payload = decode_token(access_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "tipo de token inválido")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "usuário inválido")
    return user


CurrentUser = User
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_current_user.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/api/deps.py apps/api/tests/test_current_user.py
git commit -m "feat(api): dependência get_current_user via cookie"
```

---

### Task 10: RBAC — `require_role`

**Files:**
- Modify: `apps/api/app/api/deps.py`
- Create: `apps/api/tests/test_rbac.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_rbac.py`:

```python
import uuid

from fastapi import Depends

from app.api.deps import require_role
from app.main import app
from app.models.user import UserRole


@app.get("/admin-only", dependencies=[Depends(require_role(UserRole.admin_vertical))])
async def admin_only():
    return {"ok": True}


async def _register_login(client, db_session, role):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="ACME", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": f"{role}@x.com", "password": "segredo123", "nome": "U",
        "role": role, "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": f"{role}@x.com", "password": "segredo123"})


async def test_admin_allowed(client, db_session):
    await _register_login(client, db_session, "admin_vertical")
    resp = await client.get("/admin-only")
    assert resp.status_code == 200


async def test_non_admin_forbidden(client, db_session):
    await _register_login(client, db_session, "instrutor")
    resp = await client.get("/admin-only")
    assert resp.status_code == 403
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_rbac.py -v`
Expected: FAIL com `ImportError: cannot import name 'require_role'`.

- [ ] **Step 3: Implementar (adicionar ao final de `deps.py`)**

```python
from collections.abc import Callable

from app.models.user import UserRole


def require_role(*roles: UserRole) -> Callable:
    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "permissão insuficiente")
        return user

    return _guard
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_rbac.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commitar**

```bash
git add apps/api/app/api/deps.py apps/api/tests/test_rbac.py
git commit -m "feat(api): guard de RBAC require_role"
```

---

### Task 11: Repository base com isolamento por `empresa_id` + endpoint demo

Esta é a task central do plano: prova que o isolamento multi-tenant é **estrutural**.

**Files:**
- Create: `apps/api/app/repositories/__init__.py`
- Create: `apps/api/app/repositories/base.py`
- Create: `apps/api/app/api/notas.py`
- Create: `apps/api/app/schemas/nota.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_tenant_isolation.py`

- [ ] **Step 1: Escrever o teste de isolamento (o mais importante do plano)**

`apps/api/tests/test_tenant_isolation.py`:

```python
import uuid


async def _empresa_e_login(client, db_session, email):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": email, "password": "segredo123", "nome": "U",
        "role": "cliente_torq", "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    return empresa


async def test_usuario_so_ve_notas_da_propria_empresa(client, db_session):
    # Empresa A cria uma nota
    await _empresa_e_login(client, db_session, "a@a.com")
    created = await client.post("/notas", json={"texto": "segredo da A"})
    assert created.status_code == 201

    # Mesma empresa enxerga a nota
    listed = await client.get("/notas")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    # Empresa B loga (sobrescreve cookies) e NÃO deve ver a nota da A
    await _empresa_e_login(client, db_session, "b@b.com")
    listed_b = await client.get("/notas")
    assert listed_b.status_code == 200
    assert listed_b.json() == []
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_tenant_isolation.py -v`
Expected: FAIL com 404 (rotas `/notas` não existem).

- [ ] **Step 3: Implementar o repository base**

`apps/api/app/repositories/__init__.py` (vazio).

`apps/api/app/repositories/base.py`:

```python
import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class TenantRepository(Generic[T]):
    """Repository base que SEMPRE filtra por empresa_id.

    O isolamento é estrutural: nenhum método expõe query sem o filtro de tenant,
    substituindo a garantia que o RLS dava no Supabase.
    """

    model: type[T]

    def __init__(self, db: AsyncSession, empresa_id: uuid.UUID):
        self.db = db
        self.empresa_id = empresa_id

    async def list(self) -> list[T]:
        result = await self.db.scalars(
            select(self.model).where(self.model.empresa_id == self.empresa_id)
        )
        return list(result)

    async def add(self, **fields) -> T:
        obj = self.model(empresa_id=self.empresa_id, **fields)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj
```

`apps/api/app/schemas/nota.py`:

```python
import uuid
from datetime import datetime

from pydantic import BaseModel


class NotaIn(BaseModel):
    texto: str


class NotaOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    texto: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

`apps/api/app/api/notas.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.nota import Nota
from app.models.user import User
from app.repositories.base import TenantRepository
from app.schemas.nota import NotaIn, NotaOut

router = APIRouter(prefix="/notas", tags=["notas"])


class NotaRepository(TenantRepository[Nota]):
    model = Nota


def get_repo(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotaRepository:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return NotaRepository(db, user.empresa_id)


@router.get("", response_model=list[NotaOut])
async def listar(repo: NotaRepository = Depends(get_repo)) -> list[Nota]:
    return await repo.list()


@router.post("", response_model=NotaOut, status_code=status.HTTP_201_CREATED)
async def criar(payload: NotaIn, repo: NotaRepository = Depends(get_repo)) -> Nota:
    return await repo.add(texto=payload.texto)
```

`apps/api/app/main.py` (adicionar o router de notas):

```python
from app.api.notas import router as notas_router
# ...
    app.include_router(notas_router)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_tenant_isolation.py -v`
Expected: PASS — a empresa B vê `[]` mesmo havendo nota da A. **Esta é a prova do isolamento estrutural.**

- [ ] **Step 5: Rodar a suíte inteira**

Run: `uv run pytest -v`
Expected: todos os testes passam.

- [ ] **Step 6: Commitar**

```bash
git add apps/api/app/repositories apps/api/app/api/notas.py apps/api/app/schemas/nota.py apps/api/app/main.py apps/api/tests/test_tenant_isolation.py
git commit -m "feat(api): repository base com isolamento por empresa_id + demo notas"
```

---

### Task 12: Refresh e logout

**Files:**
- Modify: `apps/api/app/api/auth.py`
- Create: `apps/api/tests/test_refresh_logout.py`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/tests/test_refresh_logout.py`:

```python
import uuid


async def _login(client, db_session):
    from app.models.empresa import Empresa

    empresa = Empresa(id=uuid.uuid4(), nome="E", tipo="sst")
    db_session.add(empresa)
    await db_session.commit()
    await client.post("/auth/register", json={
        "email": "d@d.com", "password": "segredo123", "nome": "D",
        "role": "cliente_torq", "empresa_id": str(empresa.id),
    })
    await client.post("/auth/login", json={"email": "d@d.com", "password": "segredo123"})


async def test_refresh_emite_novo_access(client, db_session):
    await _login(client, db_session)
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


async def test_logout_limpa_cookies(client, db_session):
    await _login(client, db_session)
    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
    # cookie de access esvaziado
    assert client.cookies.get("access_token", "") == ""
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `uv run pytest tests/test_refresh_logout.py -v`
Expected: FAIL com 404.

- [ ] **Step 3: Implementar (adicionar ao `auth.py`)**

```python
from fastapi import Cookie

from app.core.tokens import TokenError, decode_token
from app.models.user import User


@router.post("/refresh", response_model=UserOut)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sem refresh token")
    try:
        payload = decode_token(refresh_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "refresh inválido")
    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "tipo de token inválido")
    import uuid as _uuid

    user = await db.get(User, _uuid.UUID(payload["sub"]))
    if not user or not user.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "usuário inválido")
    _set_auth_cookies(response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/auth")
```

- [ ] **Step 4: Rodar e ver passar**

Run: `uv run pytest tests/test_refresh_logout.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Rodar a suíte inteira e commitar**

Run: `uv run pytest -v`
Expected: todos passam.

```bash
git add apps/api/app/api/auth.py apps/api/tests/test_refresh_logout.py
git commit -m "feat(api): endpoints de refresh e logout"
```

---

## Validação final do plano (esqueleto andante completo)

Ao terminar todas as tasks, o seguinte deve ser verdade:

- [ ] `docker compose up -d` sobe postgres + minio.
- [ ] `uv run alembic upgrade head` cria `empresas`, `users`, `notas`.
- [ ] `uv run pytest -v` passa 100%.
- [ ] Subindo a API (`uv run uvicorn app.main:app --reload`), o fluzo manual funciona: register → login (recebe cookies httpOnly) → criar nota → listar (só vê as da própria empresa) → refresh → logout.
- [ ] `/docs` (Swagger) mostra a OpenAPI — base para gerar o `packages/api-client` no próximo plano.

## Próximos planos (decomposição do spec)

1. **Camada de dados** — introspecção das 172 tabelas do Supabase → models SQLAlchemy + migrations; inventário de regras que viviam em triggers/policies.
2. **Módulos de negócio** — portar os 7 edge functions + domínios (SST, Toriq Corp, Treinamentos, Frota, White Label); storage via MinIO.
3. **eSocial em Python** — reescrever assinatura digital A1 / SOAP gov.br.
4. **Religar o front** — mover para `apps/web`, wiring pnpm/turbo, gerar `packages/api-client`, trocar 136 arquivos de `supabase.from()` + 14 de `supabase.auth`.
5. **Cutover** — subir na VPS, recriar dados de teste, desligar o Supabase.
