"""Handlers da fila Redis (Toriq Vendas — performance).

Importado no lifespan do FastAPI para registrar os handlers. Cada handler abre a
própria sessão (SessionLocal) e é seguro para reexecução. Novos handlers (ex.: SDR
autônomo no inbound) são adicionados aqui conforme as fases avançam.
"""
from __future__ import annotations

import uuid

from app.core.queue import register


# NOTE: o disparo de campanha NÃO usa fila — o scheduler
# (``processar_campanhas_pendentes``, ~1min) é o mecanismo assíncrono de envio.
# O endpoint /campanhas/{id}/enviar só prepara (materializa + status='enviando').


@register("sdr_inbound")
async def _sdr_inbound(payload: dict) -> None:
    """SDR autônomo: processa um inbound de WhatsApp (qualifica + responde + handoff)."""
    eid = payload.get("empresa_id")
    lid = payload.get("lead_id")
    msg = payload.get("mensagem") or ""
    if not eid or not lid:
        return
    from app.core.db import SessionLocal
    from app.services.vendas_sdr import processar_inbound_sdr

    async with SessionLocal() as db:
        await processar_inbound_sdr(
            db,
            empresa_id=uuid.UUID(str(eid)),
            lead_id=uuid.UUID(str(lid)),
            mensagem=msg,
        )


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
