"""Handlers da fila Redis (Toriq Vendas — performance).

Importado no lifespan do FastAPI para registrar os handlers. Cada handler abre a
própria sessão (SessionLocal) e é seguro para reexecução. Novos handlers (ex.: SDR
autônomo no inbound) são adicionados aqui conforme as fases avançam.
"""
from __future__ import annotations

import uuid

from app.core.queue import register


@register("disparo_campanha")
async def _disparo_campanha(payload: dict) -> None:
    """Processa uma rodada de envio de campanha fora do request."""
    cid = payload.get("campanha_id")
    eid = payload.get("empresa_id")
    if not cid or not eid:
        return
    from app.core.db import SessionLocal
    from app.services.vendas_disparo import enviar_campanha

    async with SessionLocal() as db:
        try:
            await enviar_campanha(
                db,
                campanha_id=uuid.UUID(str(cid)),
                empresa_id=uuid.UUID(str(eid)),
            )
        except ValueError:
            # Sem config (email/whatsapp) ou campanha sumiu — ignora.
            pass


@register("sdr_qualificar_lote")
async def _sdr_qualificar_lote(payload: dict) -> None:
    """Qualifica um lote de leads pelo SDR fora do request."""
    eid = payload.get("empresa_id")
    ids = payload.get("lead_ids") or []
    if not eid or not ids:
        return
    from app.core.db import SessionLocal
    from app.services.vendas_sdr import qualificar_batch

    lead_ids = [uuid.UUID(str(x)) for x in ids]
    async with SessionLocal() as db:
        try:
            await qualificar_batch(db, empresa_id=uuid.UUID(str(eid)), lead_ids=lead_ids)
        except ValueError:
            pass
