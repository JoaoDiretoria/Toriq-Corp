"""Job de vencimentos — notifica contas a pagar/receber que vencem HOJE.

Roda 1x/dia (ver ``app/jobs/scheduler.py``). Para cada conta que vence no dia,
cria uma notificação (e push via SSE) para o tenant dono da conta. Best-effort:
``notificar`` nunca levanta; uma conta problemática não interrompe as demais.
"""
import datetime
import logging
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select

from app.core.db import SessionLocal
from app.models import generated as m
from app.services.notificacoes import notificar

logger = logging.getLogger("toriq.notificacoes")

_TZ = ZoneInfo("America/Sao_Paulo")


async def notificar_vencimentos_todas_empresas() -> int:
    """Cria notificações para contas (pagar e receber) que vencem hoje.

    Retorna o total de notificações criadas. O escopo por empresa vem do próprio
    ``conta.empresa_id`` — o job é global (roda fora de um request).
    """
    hoje = datetime.datetime.now(_TZ).date()
    total = 0

    async with SessionLocal() as db:
        # ── Contas a pagar: vencendo hoje, não pagas, não arquivadas ──────────
        pagar = await db.scalars(
            select(m.ContasPagar).where(
                m.ContasPagar.data_vencimento == hoje,
                m.ContasPagar.data_pagamento.is_(None),
                or_(
                    m.ContasPagar.arquivado.is_(False),
                    m.ContasPagar.arquivado.is_(None),
                ),
            )
        )
        for conta in pagar:
            desc = (
                getattr(conta, "descricao", None)
                or getattr(conta, "fornecedor_nome", None)
                or "Conta a pagar"
            )
            await notificar(
                db,
                empresa_id=conta.empresa_id,
                titulo="Conta a pagar vence hoje",
                mensagem=f"{desc} vence hoje.",
                tipo="warning",
                categoria="financeiro",
                modulo="financeiro",
                tela="contas-pagar",
                referencia_tipo="conta_pagar",
                referencia_id=conta.id,
            )
            total += 1

        # ── Contas a receber: previstas para hoje, não recebidas, não arquivadas ─
        receber = await db.scalars(
            select(m.ContasReceber).where(
                m.ContasReceber.data_recebimento == hoje,
                m.ContasReceber.data_pagamento.is_(None),
                or_(
                    m.ContasReceber.arquivado.is_(False),
                    m.ContasReceber.arquivado.is_(None),
                ),
            )
        )
        for conta in receber:
            desc = (
                getattr(conta, "servico_produto", None)
                or getattr(conta, "cliente_nome", None)
                or "Conta a receber"
            )
            await notificar(
                db,
                empresa_id=conta.empresa_id,
                titulo="Conta a receber prevista para hoje",
                mensagem=f"{desc} está prevista para hoje.",
                tipo="info",
                categoria="financeiro",
                modulo="financeiro",
                tela="contas-receber",
                referencia_tipo="conta_receber",
                referencia_id=conta.id,
            )
            total += 1

    logger.info("job_vencimentos: %d notificações criadas para %s", total, hoje)
    return total
