import app.models  # noqa: F401  (registers all models in Base.metadata)
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.contas_pagar import (
    colunas_crud_router as cp_colunas_router,
    contas_crud_router as cp_contas_router,
    router as cp_kanban_router,
)
from app.api.contas_receber import (
    colunas_crud_router as cr_colunas_router,
    contas_crud_router as cr_contas_router,
    router as cr_kanban_router,
)
from app.api.financeiro_cadastros import router as fin_cadastros_router
from app.api.health import router as health_router
from app.jobs.scheduler import build_scheduler


@asynccontextmanager
async def lifespan(app):
    scheduler = build_scheduler()
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    app = FastAPI(title="TORIQ API", version="0.1.0", lifespan=lifespan)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(fin_cadastros_router)
    # Contas a Receber — kanban e colunas ANTES do CRUD de contas (evita que
    # GET /colunas seja capturado por GET /{id_} antes de ser resolvido)
    app.include_router(cr_kanban_router)
    app.include_router(cr_colunas_router)
    app.include_router(cr_contas_router)
    # Contas a Pagar — mesma lógica
    app.include_router(cp_kanban_router)
    app.include_router(cp_colunas_router)
    app.include_router(cp_contas_router)
    return app


app = create_app()
