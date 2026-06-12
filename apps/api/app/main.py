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
from app.api.contratos import router as contratos_router
from app.api.financeiro_cadastros import router as fin_cadastros_router
from app.api.funil import router as funil_router
from app.api.sst_cadastros import router as sst_router
from app.api.sst_saude import router as sst_saude_router
from app.api.sst_epi import router as sst_epi_router
from app.api.frota import router as frota_router
from app.api.produtos import router as produtos_router
from app.api.notificacoes import router as notificacoes_router
from app.api.suporte import router as suporte_router
from app.api.agenda import router as agenda_router
from app.api.health import router as health_router
from app.api.kanbans_legados import router as kanbans_legados_router
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
    # Funil / CRM genérico — rotas específicas (/{id}/configuracao, /reorder,
    # /{id}/mover, /etiquetas do card) registradas ANTES de /{id} pelo router único
    app.include_router(funil_router)
    # Contratos — rotas filhas (/{id}/clausulas, /{id}/modulos) registradas pelo
    # router único (rota específica antes de /{id} garantida pela ordem no arquivo)
    app.include_router(contratos_router)
    # Kanbans legados — Closer, Prospecção, Pós-Venda, Cross-Selling
    app.include_router(kanbans_legados_router)
    # SST — cadastros base + saúde ocupacional + EPI/equipamentos
    app.include_router(sst_router)
    app.include_router(sst_saude_router)
    app.include_router(sst_epi_router)
    # Frota — veículos, motoristas, manutenções, checklists, custos, documentos, ocorrências
    app.include_router(frota_router)
    # Catálogo, notificações, suporte, agenda
    app.include_router(produtos_router)
    app.include_router(notificacoes_router)
    app.include_router(suporte_router)
    app.include_router(agenda_router)
    return app


app = create_app()
