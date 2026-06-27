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


@register("evolution_webhook")
async def _evolution_webhook(payload: dict) -> None:
    """Processa um evento de webhook da Evolution já persistido (fora do request).

    Carrega o evento pelo id, acha a instância e roda ``processar_webhook``
    (inbound → pipeline + SDR; connection.update → status). Marca o evento como
    processed/error. Idempotente: pula se já processado.
    """
    import datetime

    from sqlalchemy import update

    evento_id = payload.get("evento_id")
    if not evento_id:
        return
    from app.core.db import SessionLocal
    from app.models.vendas_evolution import (
        VendasEvolutionInstancias,
        VendasEvolutionWebhookEventos,
    )
    from app.services.vendas_evolution import processar_webhook

    async with SessionLocal() as db:
        evt = await db.get(VendasEvolutionWebhookEventos, uuid.UUID(str(evento_id)))
        if evt is None or evt.status == "processed":
            return
        inst = (
            await db.get(VendasEvolutionInstancias, evt.instancia_id)
            if evt.instancia_id
            else None
        )
        payload_evt = evt.payload or {}
        agora = datetime.datetime.now(datetime.timezone.utc)
        if inst is None:
            await db.execute(
                update(VendasEvolutionWebhookEventos)
                .where(VendasEvolutionWebhookEventos.id == evt.id)
                .values(status="error", erro="instância ausente", processed_at=agora)
            )
            await db.commit()
            return
        try:
            await processar_webhook(db, instancia=inst, payload=payload_evt)
            novo_status, erro = "processed", None
        except Exception as exc:  # noqa: BLE001 - registra e não derruba o worker
            novo_status, erro = "error", str(exc)[:500]
        await db.execute(
            update(VendasEvolutionWebhookEventos)
            .where(VendasEvolutionWebhookEventos.id == evt.id)
            .values(status=novo_status, erro=erro, processed_at=agora)
        )
        await db.commit()


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


@register("instagram_publicar")
async def _instagram_publicar(payload: dict) -> None:
    """Publica um post do Instagram (container -> poll -> publish) fora do request."""
    pid = payload.get("publicacao_id")
    if not pid:
        return
    from app.core.db import SessionLocal
    from app.services.vendas_instagram import executar_publicacao

    async with SessionLocal() as db:
        await executar_publicacao(db, publicacao_id=uuid.UUID(str(pid)))
