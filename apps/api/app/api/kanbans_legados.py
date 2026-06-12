"""Routers para os 4 kanbans legados via fábrica make_kanban_router.

Kanbans expostos:
  /kanban/closer/*          — Kanban de Closer (vendas)
  /kanban/prospeccao/*      — Kanban de Prospecção
  /kanban/pos-venda/*       — Kanban de Pós-Venda
  /kanban/cross-selling/*   — Kanban de Cross-Selling
"""
from fastapi import APIRouter

from app.api.kanban_factory import make_kanban_router
from app.models import generated as m
from app.schemas import kanbans_legados as s

router = APIRouter(prefix="/kanban", tags=["kanbans-legados"])

# ── Closer ────────────────────────────────────────────────────────────────────
router.include_router(
    make_kanban_router(
        card_model=m.CloserCards,
        coluna_model=m.CloserColunas,
        mov_model=m.CloserCardMovimentacoes,
        card_in=s.CloserCardIn,
        card_update=s.CloserCardUpdate,
        card_out=s.CloserCardOut,
        coluna_in=s.ColunaIn,
        coluna_out=s.ColunaOut,
        prefix="/closer",
        tags=["closer"],
        default_colunas=["Novo", "Em Negociação", "Proposta", "Ganho", "Perdido"],
    )
)

# ── Prospecção ────────────────────────────────────────────────────────────────
router.include_router(
    make_kanban_router(
        card_model=m.ProspeccaoCards,
        coluna_model=m.ProspeccaoColunas,
        mov_model=m.ProspeccaoCardMovimentacoes,
        card_in=s.ProspeccaoCardIn,
        card_update=s.ProspeccaoCardUpdate,
        card_out=s.ProspeccaoCardOut,
        coluna_in=s.ColunaIn,
        coluna_out=s.ColunaOut,
        prefix="/prospeccao",
        tags=["prospeccao"],
        default_colunas=[
            "Novo Lead",
            "Contato Realizado",
            "Qualificando",
            "Proposta Enviada",
            "Fechado",
        ],
    )
)

# ── Pós-Venda ─────────────────────────────────────────────────────────────────
router.include_router(
    make_kanban_router(
        card_model=m.PosVendaCards,
        coluna_model=m.PosVendaColunas,
        mov_model=m.PosVendaCardMovimentacoes,
        card_in=s.PosVendaCardIn,
        card_update=s.PosVendaCardUpdate,
        card_out=s.PosVendaCardOut,
        coluna_in=s.ColunaIn,
        coluna_out=s.ColunaOut,
        prefix="/pos-venda",
        tags=["pos-venda"],
        default_colunas=[
            "Onboarding",
            "Em Andamento",
            "Acompanhamento",
            "Renovação",
            "Encerrado",
        ],
    )
)

# ── Cross-Selling ─────────────────────────────────────────────────────────────
router.include_router(
    make_kanban_router(
        card_model=m.CrossSellingCards,
        coluna_model=m.CrossSellingColunas,
        mov_model=m.CrossSellingCardMovimentacoes,
        card_in=s.CrossSellingCardIn,
        card_update=s.CrossSellingCardUpdate,
        card_out=s.CrossSellingCardOut,
        coluna_in=s.ColunaIn,
        coluna_out=s.ColunaOut,
        prefix="/cross-selling",
        tags=["cross-selling"],
        default_colunas=[
            "Identificado",
            "Abordagem",
            "Proposta",
            "Negociação",
            "Concluído",
        ],
    )
)
