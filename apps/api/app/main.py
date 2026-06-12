import app.models  # noqa: F401  (registers all models in Base.metadata)
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
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
from app.api.white_label import router as white_label_router
from app.api.blog import router as blog_router
from app.api.pesquisas import router as pesquisas_router
from app.api.modelos import router as modelos_router
from app.api.funil_card_extras import router as funil_card_extras_router
# Onda 1 Fatia 5 — endpoints de tabelas que já existiam no banco mas não tinham router
from app.api.empresas import router as empresas_router
from app.api.modulos import router as modulos_router
from app.api.setor_permissoes import router as setor_permissoes_router
from app.api.empresa_settings import router as empresa_settings_router
from app.api.cadastros_empresa import router as cadastros_empresa_router
from app.api.funil_comercial import router as funil_comercial_router
# Onda 2 Fatia 5 — plataforma/sistema, conteúdo/público, financeiro/EPI extras
from app.api.sistema import router as sistema_router
from app.api.leads_landing import router as leads_landing_router
from app.api.vagas import router as vagas_router
from app.api.financeiro_extras import (
    financeiro_contas_router,
    modelos_atividade_router,
    atividades_router as cp_atividades_router,
    anexos_router as cp_anexos_router,
    cp_movimentacoes_router,
)
from app.api.equipamentos_extras import (
    epi_modelos_atividade_router,
    historico_router as epi_historico_router,
)
# Onda 3 Fatia 5 — endpoints das 13 tabelas novas (Treinamentos, instrutores, parceiras)
from app.api.treinamentos import router as treinamentos_router
from app.api.instrutores import (
    instrutores_router,
    parceiras_router,
    recon_facial_router,
    anexos_router as funil_anexos_router,
)
# Subsistema gestão de usuários (admin) + troca de senha
from app.api.admin_users import (
    router as admin_users_router,
    password_router as change_password_router,
)
# Subsistema de storage (RustFS / S3) — substitui supabase.storage
from app.api.storage import router as storage_router
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
    # CORS: o front (Vite :8080) precisa enviar o cookie httpOnly de auth.
    # allow_credentials=True exige origens explícitas (não pode usar "*").
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
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
    # Extras de card do funil (orçamentos/propostas/comparações) — escopados via card
    app.include_router(funil_card_extras_router)
    # Modelos/Templates — ANTES de contratos (cujo /modelos/{id} capturaria /modelos/atividades)
    app.include_router(modelos_router)
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
    # White Label (config/módulos da empresa) e Blog/Newsletter (conteúdo global)
    app.include_router(white_label_router)
    app.include_router(blog_router)
    app.include_router(pesquisas_router)
    # Onda 1 Fatia 5 — empresa/plataforma, cadastros e funil comercial
    app.include_router(empresas_router)
    app.include_router(modulos_router)
    app.include_router(setor_permissoes_router)
    app.include_router(empresa_settings_router)
    app.include_router(cadastros_empresa_router)
    app.include_router(funil_comercial_router)
    # Onda 2 — sistema, públicos e sub-recursos financeiro/EPI (filhas antes dos genéricos)
    app.include_router(sistema_router)
    app.include_router(leads_landing_router)
    app.include_router(vagas_router)
    app.include_router(cp_atividades_router)
    app.include_router(cp_anexos_router)
    app.include_router(cp_movimentacoes_router)
    app.include_router(financeiro_contas_router)
    app.include_router(modelos_atividade_router)
    app.include_router(epi_historico_router)
    app.include_router(epi_modelos_atividade_router)
    # Onda 3 — Treinamentos, instrutores, parceiras, recon. facial, anexos de card
    app.include_router(treinamentos_router)
    app.include_router(parceiras_router)
    app.include_router(recon_facial_router)
    app.include_router(instrutores_router)
    app.include_router(funil_anexos_router)
    # Gestão de usuários (admin) + troca de senha
    app.include_router(admin_users_router)
    app.include_router(change_password_router)
    app.include_router(storage_router)
    return app


app = create_app()
