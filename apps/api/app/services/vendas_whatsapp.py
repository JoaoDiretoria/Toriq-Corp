"""Toriq Vendas — FASE 3 (WhatsApp via API oficial Meta): serviço de envio.

Reusa as tabelas da Fase 2 (vendas_disparo_config, vendas_templates,
vendas_campanhas, vendas_mensagens, vendas_supressao) com o canal 'whatsapp'.
A configuração do WhatsApp fica na MESMA ``vendas_disparo_config`` (colunas
``whatsapp_*`` adicionadas pelo integrador via migration da Fase 3).

Compliance (Meta):
- Marketing exige TEMPLATE APROVADO: a campanha whatsapp envia via
  ``template.meta_template_name`` (send_template). Mensagem livre (texto) só na
  janela de 24h após o lead responder — aqui usada como fallback quando não há
  template aprovado.
- Supressão (tipo='telefone', valor=só dígitos) é checada antes do envio (pelo
  chamador, seguindo o padrão de vendas_disparo).

Convenções (alinhadas a app/services/vendas_disparo.py):
- Tenant SEMPRE por empresa_id (toda query é escopada).
- O envio real é delegado a app.integrations.whatsapp_meta; nos testes é mockado
  por monkeypatch nesta mesma referência (send_template / send_text).
- As funções recebem ``db`` e NÃO commitam — quem chama (enviar_campanha) faz o
  commit, exceto os processadores de webhook, que são pontos de entrada e
  commitam ao final.
"""
from __future__ import annotations

import datetime
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret
from app.integrations.whatsapp_meta import (
    WhatsAppError,
    map_status_whatsapp,
    send_template,
    send_text,
)
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasMensagens


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def normalizar_telefone(valor: str) -> str:
    """Reduz o telefone a só dígitos (alinha com supressão tipo 'telefone')."""
    return re.sub(r"\D", "", valor or "")


# ═══════════════════════════════════════════════════════════════════════════════
# Envio de UMA mensagem WhatsApp (chamado pelo enviar_campanha por destinatário)
# ═══════════════════════════════════════════════════════════════════════════════

async def enviar_mensagem_whatsapp(
    db: AsyncSession,
    *,
    config,
    mensagem,
    campanha,
    template,
) -> None:
    """Envia uma única ``VendasMensagens`` pelo canal WhatsApp.

    - Monta o destinatário (telefone do lead, só dígitos) e grava em
      ``mensagem.destinatario``.
    - Se o template tem ``meta_template_name`` → envia via ``send_template``
      (marketing: template aprovado pela Meta).
    - Senão (sem template aprovado) → tenta ``send_text`` com o conteúdo do
      template (válido apenas dentro da janela de 24h).
    - Sucesso → status='enviado', provider_id=wamid, enviado_em=now.
    - ``WhatsAppError`` → status='erro', erro=str(exc).

    NÃO commita: o chamador (enviar_campanha) faz o commit, seguindo o padrão de
    app/services/vendas_disparo.py.
    """
    telefone = normalizar_telefone(mensagem.destinatario or "")
    mensagem.destinatario = telefone

    token = decrypt_secret(config.whatsapp_token_enc) if config.whatsapp_token_enc else ""

    try:
        if template is not None and template.meta_template_name:
            wamid = await send_template(
                phone_id=config.whatsapp_phone_id,
                token=token,
                to=telefone,
                template_name=template.meta_template_name,
                lang_code="pt_BR",
            )
        else:
            corpo = template.conteudo if template is not None else ""
            wamid = await send_text(
                phone_id=config.whatsapp_phone_id,
                token=token,
                to=telefone,
                body=corpo or "",
            )
        mensagem.status = "enviado"
        mensagem.provider_id = wamid
        mensagem.enviado_em = _now()
    except WhatsAppError as exc:
        mensagem.status = "erro"
        mensagem.erro = str(exc)


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — atualização de status de entrega (sent/delivered/read/failed)
# ═══════════════════════════════════════════════════════════════════════════════

async def processar_status_webhook(
    db: AsyncSession,
    *,
    empresa_id,
    statuses: list,
) -> int:
    """Atualiza ``vendas_mensagens`` (escopadas por empresa) a partir dos
    statuses do webhook da Meta. Casa por ``provider_id == wamid``.

    Mapeia o status via ``map_status_whatsapp`` e seta entregue_em/lido_em
    conforme. Retorna a quantidade de mensagens atualizadas. NÃO commita aqui —
    quem chama (router) faz o commit no fim do POST.
    """
    atualizadas = 0
    for st in statuses or []:
        wamid = st.get("wamid")
        if not wamid:
            continue

        msg = await db.scalar(
            select(VendasMensagens).where(
                VendasMensagens.empresa_id == empresa_id,
                VendasMensagens.provider_id == wamid,
            )
        )
        if msg is None:
            continue

        novo = map_status_whatsapp(st.get("status") or "")
        agora = _now()
        if novo == "entregue":
            if msg.entregue_em is None:
                msg.entregue_em = agora
            msg.status = novo
        elif novo == "lido":
            if msg.entregue_em is None:
                msg.entregue_em = agora
            if msg.lido_em is None:
                msg.lido_em = agora
            msg.status = novo
        elif novo == "erro":
            msg.status = "erro"
        elif novo == "enviado":
            if msg.enviado_em is None:
                msg.enviado_em = agora
            msg.status = novo
        else:
            msg.status = novo

        atualizadas += 1

    return atualizadas


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook — mensagens recebidas (inbound) → marca o lead como respondeu
# ═══════════════════════════════════════════════════════════════════════════════

async def processar_inbound_webhook(
    db: AsyncSession,
    *,
    empresa_id,
    mensagens: list,
) -> int:
    """Registra respostas de leads (inbound) abrindo a janela de 24h.

    Para cada mensagem recebida acha o lead pelo telefone (vendas_leads.telefone
    normalizado == campo 'from') na empresa; marca a ÚLTIMA ``vendas_mensagens``
    daquele lead com respondeu_em=now e status='respondeu' (se houver).

    NÃO gera resposta de IA (isso é Fase 4 — SDR). Apenas registra. Retorna a
    quantidade de inbounds processados (que casaram com um lead + mensagem).
    """
    processadas = 0
    for inbound in mensagens or []:
        de = normalizar_telefone(inbound.get("from") or "")
        if not de:
            continue

        # Acha o lead pelo telefone normalizado (escopado por empresa).
        leads = (
            await db.scalars(
                select(VendasLeads).where(
                    VendasLeads.empresa_id == empresa_id,
                    VendasLeads.telefone.isnot(None),
                )
            )
        ).all()
        lead = next(
            (l for l in leads if normalizar_telefone(l.telefone or "") == de),
            None,
        )
        if lead is None:
            continue

        # Última mensagem desse lead (qualquer canal/campanha) na empresa.
        msg = await db.scalar(
            select(VendasMensagens)
            .where(
                VendasMensagens.empresa_id == empresa_id,
                VendasMensagens.lead_id == lead.id,
            )
            .order_by(VendasMensagens.created_at.desc())
            .limit(1)
        )
        if msg is None:
            continue

        if msg.respondeu_em is None:
            msg.respondeu_em = _now()
        msg.status = "respondeu"
        processadas += 1

        # Pipeline & Conversas (CRM): registra a mensagem recebida na thread do
        # lead (sender_type='lead'). Isso abre pending_reply, atualiza
        # last_message_at e publica o evento em tempo real (SSE). Best-effort:
        # nunca derruba o webhook (que é crítico para os status de entrega).
        from app.services.vendas_pipeline import append_mensagem

        try:
            await append_mensagem(
                db,
                empresa_id=empresa_id,
                lead_id=lead.id,
                sender_type="lead",
                conteudo=inbound.get("texto") or "",
                canal="whatsapp",
                media=inbound.get("media"),
            )
        except Exception:  # pragma: no cover - tolerante a falha de gravação
            await db.rollback()

        # SDR autônomo (Fase 6): se o agente estiver ligado com auto-resposta,
        # enfileira o processamento da IA (qualifica + responde + handoff) fora
        # do request. Sem Redis, o enqueue roda inline (webhook mais lento, mas ok).
        from app.models.vendas_sdr import VendasSdrConfig

        sdr = await db.scalar(
            select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
        )
        if sdr is not None and sdr.ativo and sdr.auto_responder and sdr.api_key_enc:
            from app.core.queue import queue

            await db.commit()  # garante o inbound persistido antes do job assíncrono
            await queue.enqueue(
                "sdr_inbound",
                {
                    "empresa_id": str(empresa_id),
                    "lead_id": str(lead.id),
                    "mensagem": inbound.get("texto") or "",
                },
            )

    return processadas
