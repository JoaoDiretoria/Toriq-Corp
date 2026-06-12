# syntax=docker/dockerfile:1
#
# Backend FastAPI do TORIQ — Python 3.12 + uv.
#
# IMPORTANTE: o contexto de build é a RAIZ DO REPO (o EasyPanel usa a raiz como
# contexto para builds via Dockerfile, independente do "Caminho de Build"). Por
# isso os COPY usam o prefixo `apps/api/`. O `.dockerignore` da raiz exclui o que
# não importa (node_modules, **/.venv, backend-esocial, etc.) e MANTÉM `apps/`.
#
# As migrations Alembic rodam no entrypoint (alembic upgrade head) ANTES do
# uvicorn — bom para instância única (pré-lançamento). Se escalar para N réplicas,
# mover a migração para um step de deploy separado (evita corrida + jobs duplicados).

FROM python:3.12-slim AS base

# uv (gerenciador de deps/venv) — binário copiado da imagem oficial.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# 1) Só as dependências primeiro (camada cacheável): resolve do lockfile, sem
#    dev-deps e sem instalar o próprio projeto ([tool.uv] package = false).
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# 2) Código do backend (app/, migrations/, alembic.ini, .python-version).
COPY apps/api/ ./

# Usuário não-root.
RUN useradd --system --uid 1001 --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# /health é servido pela API (app/api/health.py). Sem curl: usa o Python da venv.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

# Migrations no start (auto) + uvicorn. As migrations leem settings.database_url /
# db_ssl, vindos das env vars do container (DATABASE_URL, DB_SSL, JWT_SECRET, ...).
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
