"""Toriq Vendas — Pipeline & Conversas (CRM): camada de serviço.

Acompanha leads numa PIPELINE (kanban por estágios) + INBOX de conversas
(thread por lead) + dashboard de CONVERSÃO. Reusa ``vendas_leads``,
``vendas_tags``/``vendas_lead_tags`` e o envio WhatsApp (``send_text``) + cripto.

Convenções (igual a app/services/vendas_disparo.py):
- Tenant SEMPRE por ``empresa_id`` (toda query é escopada).
- Funções recebem ``db``; commitam apenas nos PONTOS DE ENTRADA
  (append_mensagem, mover_lead, marcar_lido, enviar_resposta) — leitura
  (board/listar_conversas/thread/conversao) não commita.
- Tempo real: ao mutar, PUBLICA evento em app.core.events (import LOCAL para
  degradar sem redis e evitar ciclos). Nunca derruba a operação.
"""
from __future__ import annotations

import datetime
import re
import uuid
from typing import Optional

from sqlalchemy import and_, case, func, literal, select

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret
from app.integrations.whatsapp_meta import WhatsAppError, send_template, send_text
from app.models.user import User
from app.models.vendas import VendasLeads, VendasLeadTags, VendasTags
from app.models.vendas_disparo import VendasDisparoConfig, VendasTemplates
from app.models.vendas_pipeline import VendasConversas, VendasPipelineStages


# Janela de atendimento do WhatsApp (Meta): 24h desde a última msg do cliente.
JANELA_ATENDIMENTO = datetime.timedelta(hours=24)


# Estágios padrão (nome, cor, ordem, is_closed, is_won) — lazy-seed por empresa.
ESTAGIOS_PADRAO = [
    ("Novo", "#64748b", 0, False, False),
    ("Contatado", "#3b82f6", 1, False, False),
    ("Respondeu", "#06b6d4", 2, False, False),
    ("Qualificado", "#f59e0b", 3, False, False),
    ("Proposta", "#a855f7", 4, False, False),
    ("Ganho", "#22c55e", 5, True, True),
    ("Perdido", "#ef4444", 6, True, False),
]


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


async def _publicar(empresa_id: uuid.UUID, evento: dict) -> None:
    """Publica um evento no canal da empresa; nunca levanta (import local)."""
    try:
        from app.core.events import publicar

        await publicar(empresa_id, evento)
    except Exception:  # pragma: no cover - publicação é best-effort
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# Estágios
# ═══════════════════════════════════════════════════════════════════════════════

async def garantir_estagios(
    db: AsyncSession, empresa_id: uuid.UUID
) -> list[VendasPipelineStages]:
    """Garante que a empresa tenha estágios (cria os padrões se não tiver).

    Retorna os estágios ordenados por ``ordem``. Lazy-seed idempotente.
    """
    existentes = (
        await db.scalars(
            select(VendasPipelineStages)
            .where(VendasPipelineStages.empresa_id == empresa_id)
            .order_by(VendasPipelineStages.ordem)
        )
    ).all()
    if existentes:
        return list(existentes)

    for nome, cor, ordem, is_closed, is_won in ESTAGIOS_PADRAO:
        db.add(
            VendasPipelineStages(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                nome=nome,
                cor=cor,
                ordem=ordem,
                is_closed=is_closed,
                is_won=is_won,
            )
        )
    await db.flush()

    result = await db.scalars(
        select(VendasPipelineStages)
        .where(VendasPipelineStages.empresa_id == empresa_id)
        .order_by(VendasPipelineStages.ordem)
    )
    return list(result)


async def avancar_estagio(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead: VendasLeads, alvo: str
) -> bool:
    """Avança o lead para o estágio nomeado ``alvo`` SE for um avanço (ordem maior
    que a atual). Nunca recua nem reabre lead fechado por engano.

    Automação do funil: disparo→"Contatado", resposta→"Respondeu", SDR qualifica
    →"Qualificado". Apenas muta ``lead.stage_id`` (o chamador commita). Retorna
    True se moveu. Estágio inexistente / sem avanço → False (no-op)."""
    estagios = await garantir_estagios(db, empresa_id)
    destino = next((s for s in estagios if s.nome == alvo), None)
    if destino is None:
        return False
    atual = next((s for s in estagios if s.id == lead.stage_id), None)
    ordem_atual = atual.ordem if atual is not None else -1
    if (destino.ordem or 0) <= ordem_atual:
        return False
    lead.stage_id = destino.id
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers de card / conversas
# ═══════════════════════════════════════════════════════════════════════════════

async def _tags_dos_leads(
    db: AsyncSession, lead_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[dict]]:
    """Mapa lead_id -> lista de {id, nome, cor} das tags."""
    if not lead_ids:
        return {}
    rows = await db.execute(
        select(VendasLeadTags.lead_id, VendasTags.id, VendasTags.nome, VendasTags.cor)
        .join(VendasTags, VendasTags.id == VendasLeadTags.tag_id)
        .where(VendasLeadTags.lead_id.in_(lead_ids))
    )
    mapa: dict[uuid.UUID, list[dict]] = {}
    for lead_id, tag_id, nome, cor in rows.all():
        mapa.setdefault(lead_id, []).append(
            {"id": str(tag_id), "nome": nome, "cor": cor}
        )
    return mapa


async def _unread_e_preview(
    db: AsyncSession, lead: VendasLeads
) -> tuple[int, Optional[str]]:
    """(qtd não-lidas do lead, preview da última mensagem) para um lead."""
    last_read = getattr(lead, "last_read_at", None)
    conds = [
        VendasConversas.lead_id == lead.id,
        VendasConversas.sender_type == "lead",
    ]
    if last_read is not None:
        conds.append(VendasConversas.created_at > last_read)
    unread = await db.scalar(
        select(func.count()).select_from(VendasConversas).where(and_(*conds))
    )
    ultima = await db.scalar(
        select(VendasConversas.conteudo)
        .where(VendasConversas.lead_id == lead.id)
        .order_by(VendasConversas.created_at.desc())
        .limit(1)
    )
    return int(unread or 0), ultima


async def _nomes_responsaveis(
    db: AsyncSession, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Mapa user_id -> nome dos operadores responsáveis (assignees)."""
    ids = [u for u in set(user_ids) if u is not None]
    if not ids:
        return {}
    rows = await db.execute(select(User.id, User.nome).where(User.id.in_(ids)))
    return {uid: nome for uid, nome in rows.all()}


async def _card(
    db: AsyncSession,
    lead: VendasLeads,
    *,
    novo_stage_id: Optional[uuid.UUID] = None,
    tags: Optional[list[dict]] = None,
    nomes: Optional[dict[uuid.UUID, str]] = None,
) -> dict:
    """Serializa um lead no formato LeadCardOut (dict).

    ``novo_stage_id`` é usado como fallback quando o lead está sem estágio
    (cai no estágio "Novo"). ``nomes`` é um cache opcional id->nome dos
    responsáveis (evita query por card no board/listagem).
    """
    if tags is None:
        tags = (await _tags_dos_leads(db, [lead.id])).get(lead.id, [])
    unread, preview = await _unread_e_preview(db, lead)

    stage_id = getattr(lead, "stage_id", None) or novo_stage_id
    valor = getattr(lead, "valor_estimado", None)
    assigned_to = getattr(lead, "assigned_to", None)
    if assigned_to is not None and nomes is None:
        nomes = await _nomes_responsaveis(db, [assigned_to])
    assigned_nome = (nomes or {}).get(assigned_to) if assigned_to else None
    return {
        "id": lead.id,
        "nome": lead.nome,
        "empresa_nome": lead.empresa_nome,
        "telefone": lead.telefone,
        "email": lead.email,
        "stage_id": stage_id,
        "temperatura": getattr(lead, "temperatura", None),
        "valor_estimado": float(valor) if valor is not None else None,
        "sdr_score": getattr(lead, "sdr_score", None),
        "status": lead.status,
        "origem": lead.origem,
        "is_pinned": bool(getattr(lead, "is_pinned", False)),
        "is_archived": bool(getattr(lead, "is_archived", False)),
        "pending_reply": bool(getattr(lead, "pending_reply", False)),
        "unread": unread,
        "last_message_at": getattr(lead, "last_message_at", None),
        "last_message_preview": preview,
        "tags": tags,
        "assigned_to": assigned_to,
        "assigned_to_nome": assigned_nome,
    }


async def listar_operadores(
    db: AsyncSession, empresa_id: uuid.UUID
) -> list[dict]:
    """Operadores (usuários ativos) da empresa — para o seletor de responsável."""
    rows = await db.execute(
        select(User.id, User.nome)
        .where(User.empresa_id == empresa_id, User.ativo.is_(True))
        .order_by(User.nome)
    )
    return [{"id": uid, "nome": nome} for uid, nome in rows.all()]


async def _get_lead(
    db: AsyncSession, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> Optional[VendasLeads]:
    return await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Conversas (mensagens)
# ═══════════════════════════════════════════════════════════════════════════════

async def append_mensagem(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    lead_id: uuid.UUID,
    sender_type: str,
    conteudo: Optional[str],
    canal: str = "whatsapp",
    status: Optional[str] = None,
    media: Optional[dict] = None,
) -> VendasConversas:
    """Cria uma mensagem na thread do lead e atualiza o lead.

    - cria ``VendasConversas``;
    - lead.last_message_at = now;
    - se ``sender_type == "lead"`` → lead.pending_reply = True;
    - commit;
    - PUBLICA "conversa_nova_mensagem".
    """
    msg = VendasConversas(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        lead_id=lead_id,
        sender_type=sender_type,
        canal=canal,
        conteudo=conteudo,
        status=status,
        media=media,
    )
    db.add(msg)

    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is not None:
        lead.last_message_at = _now()
        if sender_type == "lead":
            lead.pending_reply = True

    await db.commit()
    await db.refresh(msg)

    await _publicar(
        empresa_id,
        {
            "tipo": "conversa_nova_mensagem",
            "lead_id": str(lead_id),
            "sender_type": sender_type,
        },
    )
    return msg


# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline (mover / patch)
# ═══════════════════════════════════════════════════════════════════════════════

async def mover_lead(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    lead_id: uuid.UUID,
    stage_id: uuid.UUID,
    valor_estimado: Optional[float] = None,
    motivo: Optional[str] = None,
) -> VendasLeads:
    """Move o lead para outro estágio (valida estágio da empresa). Commit + evento."""
    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is None:
        raise ValueError("lead não encontrado")

    stage = await db.scalar(
        select(VendasPipelineStages).where(
            VendasPipelineStages.id == stage_id,
            VendasPipelineStages.empresa_id == empresa_id,
        )
    )
    if stage is None:
        raise ValueError("estágio não encontrado")

    lead.stage_id = stage_id
    if valor_estimado is not None:
        lead.valor_estimado = valor_estimado

    await db.commit()
    await db.refresh(lead)

    await _publicar(
        empresa_id,
        {"tipo": "lead_movido", "lead_id": str(lead_id), "stage_id": str(stage_id)},
    )

    # Notificação persistente (além do evento efêmero de UI acima).
    try:
        from app.services.notificacoes import notificar

        await notificar(
            db,
            empresa_id=empresa_id,
            titulo="Lead movido no funil",
            mensagem=(
                f"{getattr(lead, 'nome', None) or 'Um lead'} foi movido para "
                f"{getattr(stage, 'nome', None) or 'outro estágio'}."
            ),
            tipo="info",
            categoria="comercial",
            modulo="toriq_vendas",
            tela="vendas",
            referencia_tipo="lead",
            referencia_id=lead_id,
        )
    except Exception:  # pragma: no cover - notificação é best-effort
        pass
    return lead


async def marcar_lido(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> None:
    """Marca a thread do lead como lida (zera não-lidas). Commit + evento."""
    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is None:
        raise ValueError("lead não encontrado")
    lead.last_read_at = _now()
    lead.pending_reply = False
    await db.commit()
    await _publicar(
        empresa_id, {"tipo": "lead_atualizado", "lead_id": str(lead_id)}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Board (kanban)
# ═══════════════════════════════════════════════════════════════════════════════

async def board(
    db: AsyncSession, *, empresa_id: uuid.UUID, incluir_arquivados: bool = False
) -> dict:
    """Retorna {stages:[...], leads:[cards]} para o kanban.

    Leads sem ``stage_id`` recebem o id do estágio "Novo" no card.
    """
    stages = await garantir_estagios(db, empresa_id)
    novo = next((s for s in stages if s.ordem == 0), stages[0] if stages else None)
    novo_id = novo.id if novo is not None else None

    conds = [VendasLeads.empresa_id == empresa_id]
    if not incluir_arquivados:
        conds.append(VendasLeads.is_archived.isnot(True))

    leads = (
        await db.scalars(
            select(VendasLeads)
            .where(and_(*conds))
            .order_by(
                VendasLeads.board_ordem.asc().nullslast(),
                VendasLeads.last_message_at.desc().nullslast(),
            )
        )
    ).all()

    tags_map = await _tags_dos_leads(db, [l.id for l in leads])
    nomes = await _nomes_responsaveis(db, [l.assigned_to for l in leads])
    cards = [
        await _card(
            db, l, novo_stage_id=novo_id, tags=tags_map.get(l.id, []), nomes=nomes
        )
        for l in leads
    ]
    return {"stages": list(stages), "leads": cards}


async def reordenar_coluna(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    stage_id: uuid.UUID,
    lead_ids: list[uuid.UUID],
) -> None:
    """Persiste a ordem manual dos cards de um estágio (board_ordem = posição).

    Também garante que cada lead da lista esteja no estágio informado (move se
    veio de outra coluna no mesmo gesto de arrastar). Escopado por empresa.
    """
    for posicao, lead_id in enumerate(lead_ids):
        lead = await _get_lead(db, empresa_id, lead_id)
        if lead is None:
            continue
        lead.board_ordem = posicao
        lead.stage_id = stage_id
    await db.commit()
    await _publicar(
        empresa_id, {"tipo": "lead_movido", "stage_id": str(stage_id)}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Conversas (inbox)
# ═══════════════════════════════════════════════════════════════════════════════

async def listar_conversas(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    busca: Optional[str] = None,
    tag_id: Optional[uuid.UUID] = None,
    temperatura: Optional[str] = None,
    stage_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    arquivados: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Lista leads como cards de conversa (pin no topo, mais recentes primeiro)."""
    conds = [VendasLeads.empresa_id == empresa_id]
    if arquivados:
        conds.append(VendasLeads.is_archived.is_(True))
    else:
        conds.append(VendasLeads.is_archived.isnot(True))
    if temperatura:
        conds.append(VendasLeads.temperatura == temperatura)
    if stage_id is not None:
        conds.append(VendasLeads.stage_id == stage_id)
    if assigned_to is not None:
        conds.append(VendasLeads.assigned_to == assigned_to)
    if busca:
        like = f"%{busca}%"
        conds.append(
            func.coalesce(VendasLeads.nome, "").ilike(like)
            | func.coalesce(VendasLeads.empresa_nome, "").ilike(like)
            | func.coalesce(VendasLeads.telefone, "").ilike(like)
            | func.coalesce(VendasLeads.email, "").ilike(like)
        )
    if tag_id is not None:
        conds.append(
            VendasLeads.id.in_(
                select(VendasLeadTags.lead_id).where(VendasLeadTags.tag_id == tag_id)
            )
        )

    leads = (
        await db.scalars(
            select(VendasLeads)
            .where(and_(*conds))
            .order_by(
                VendasLeads.is_pinned.desc().nullslast(),
                VendasLeads.last_message_at.desc().nullslast(),
            )
            .limit(limit)
            .offset(offset)
        )
    ).all()

    tags_map = await _tags_dos_leads(db, [l.id for l in leads])
    nomes = await _nomes_responsaveis(db, [l.assigned_to for l in leads])
    return [
        await _card(db, l, tags=tags_map.get(l.id, []), nomes=nomes)
        for l in leads
    ]


async def _janela_atendimento(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> tuple[bool, Optional[datetime.datetime]]:
    """Janela de 24h do WhatsApp: (aberta?, quando expira).

    Aberta enquanto faltar menos de 24h desde a ÚLTIMA mensagem do lead
    (sender_type='lead'). Sem nenhum inbound → fechada (None)."""
    ultimo_inbound = await db.scalar(
        select(VendasConversas.created_at)
        .where(
            VendasConversas.empresa_id == empresa_id,
            VendasConversas.lead_id == lead_id,
            VendasConversas.sender_type == "lead",
        )
        .order_by(VendasConversas.created_at.desc())
        .limit(1)
    )
    if ultimo_inbound is None:
        return False, None
    expira = ultimo_inbound + JANELA_ATENDIMENTO
    return _now() < expira, expira


async def thread(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID, limit: int = 200
) -> dict:
    """{lead, mensagens(asc), janela_*} da thread. NÃO marca lido."""
    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is None:
        raise ValueError("lead não encontrado")

    mensagens = (
        await db.scalars(
            select(VendasConversas)
            .where(
                VendasConversas.empresa_id == empresa_id,
                VendasConversas.lead_id == lead_id,
            )
            .order_by(VendasConversas.created_at.asc())
            .limit(limit)
        )
    ).all()
    aberta, expira = await _janela_atendimento(
        db, empresa_id=empresa_id, lead_id=lead_id
    )
    return {
        "lead": await _card(db, lead),
        "mensagens": list(mensagens),
        "janela_aberta": aberta,
        "janela_expira_em": expira,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Envio de resposta (WhatsApp) — tolerante
# ═══════════════════════════════════════════════════════════════════════════════

async def enviar_resposta(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID, conteudo: str,
    canal: str | None = None,
) -> VendasConversas:
    """Envia resposta por WhatsApp e registra a mensagem (sender agente).

    O canal pode ser escolhido explicitamente: 'whatsapp' (Meta) ou 'whatsapp_evo'
    (Evolution). Sem canal, segue o último canal do lead (fallback Meta).
    Tolerante: se o provider falhar (erro/config faltando), grava a mensagem com
    status="erro" mesmo assim — o agente vê o que tentou enviar.
    """
    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is None:
        raise ValueError("lead não encontrado")

    canal_efetivo = canal or lead.ultimo_canal or "whatsapp"
    if canal_efetivo == "whatsapp_evo":
        status = await _enviar_via_evolution(
            db, empresa_id=empresa_id, telefone=lead.telefone, conteudo=conteudo
        )
    else:
        canal_efetivo = "whatsapp"
        status = await _enviar_via_meta(
            db, empresa_id=empresa_id, telefone=lead.telefone, conteudo=conteudo
        )

    return await append_mensagem(
        db,
        empresa_id=empresa_id,
        lead_id=lead_id,
        sender_type="agente",
        conteudo=conteudo,
        canal=canal_efetivo,
        status=status,
    )


async def _enviar_via_meta(
    db: AsyncSession, *, empresa_id: uuid.UUID, telefone: str | None, conteudo: str
) -> str:
    """Envio pela Cloud API da Meta. Retorna 'enviado' | 'erro' (tolerante)."""
    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    if (
        config is None
        or not config.whatsapp_phone_id
        or not config.whatsapp_token_enc
        or not telefone
    ):
        return "erro"
    try:
        await send_text(
            phone_id=config.whatsapp_phone_id,
            token=decrypt_secret(config.whatsapp_token_enc),
            to=re.sub(r"\D", "", telefone),
            body=conteudo,
        )
    except WhatsAppError:
        return "erro"
    return "enviado"


async def _enviar_via_evolution(
    db: AsyncSession, *, empresa_id: uuid.UUID, telefone: str | None, conteudo: str
) -> str:
    """Envio pela instância Evolution conectada da empresa. 'enviado' | 'erro'."""
    if not telefone:
        return "erro"
    from app.services.vendas_evolution import (
        enviar_texto as evo_enviar,
        instancia_conectada,
    )

    inst = await instancia_conectada(db, empresa_id)
    if inst is None:
        return "erro"
    res = await evo_enviar(
        db, empresa_id=empresa_id, instancia_id=inst.id,
        numero=re.sub(r"\D", "", telefone), texto=conteudo,
    )
    return "enviado" if res.get("enviado") else "erro"


async def enviar_template(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID, template_id: uuid.UUID
) -> VendasConversas:
    """Envia um TEMPLATE aprovado (HSM) — reabre conversa fora da janela 24h.

    Valida que o template é da empresa, é WhatsApp e está 'approved' (com
    meta_template_name). Tolerante a falha de envio (registra status='erro').
    """
    lead = await _get_lead(db, empresa_id, lead_id)
    if lead is None:
        raise ValueError("lead não encontrado")

    template = await db.scalar(
        select(VendasTemplates).where(
            VendasTemplates.id == template_id,
            VendasTemplates.empresa_id == empresa_id,
        )
    )
    if template is None:
        raise ValueError("template não encontrado")
    if not template.meta_template_name or template.approval_status != "approved":
        raise ValueError("template não aprovado pela Meta")

    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )

    status = "enviado"
    if (
        config is None
        or not config.whatsapp_phone_id
        or not config.whatsapp_token_enc
        or not lead.telefone
    ):
        status = "erro"
    else:
        to = re.sub(r"\D", "", lead.telefone)
        try:
            await send_template(
                phone_id=config.whatsapp_phone_id,
                token=decrypt_secret(config.whatsapp_token_enc),
                to=to,
                template_name=template.meta_template_name,
                lang_code="pt_BR",
            )
        except WhatsAppError:
            status = "erro"

    return await append_mensagem(
        db,
        empresa_id=empresa_id,
        lead_id=lead_id,
        sender_type="agente",
        conteudo=template.conteudo,
        canal="whatsapp",
        status=status,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Conversão (dashboard)
# ═══════════════════════════════════════════════════════════════════════════════

async def conversao(db: AsyncSession, *, empresa_id: uuid.UUID) -> dict:
    """Por estágio: total de leads + soma de valor_estimado. + totais gerais."""
    stages = await garantir_estagios(db, empresa_id)
    novo = next((s for s in stages if s.ordem == 0), stages[0] if stages else None)

    rows = await db.execute(
        select(
            VendasLeads.stage_id,
            func.count().label("total"),
            func.coalesce(func.sum(VendasLeads.valor_estimado), 0).label("valor"),
        )
        .where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.is_archived.isnot(True),
        )
        .group_by(VendasLeads.stage_id)
    )
    por_stage: dict[Optional[uuid.UUID], tuple[int, float]] = {}
    for stage_id, total, valor in rows.all():
        por_stage[stage_id] = (int(total or 0), float(valor or 0))

    # Leads sem estágio caem no "Novo".
    if None in por_stage and novo is not None:
        t_null, v_null = por_stage.pop(None)
        t0, v0 = por_stage.get(novo.id, (0, 0.0))
        por_stage[novo.id] = (t0 + t_null, v0 + v_null)

    itens = []
    total_leads = 0
    valor_total = 0.0
    for s in stages:
        total, valor = por_stage.get(s.id, (0, 0.0))
        total_leads += total
        valor_total += valor
        itens.append(
            {
                "stage_id": str(s.id),
                "nome": s.nome,
                "cor": s.cor,
                "total": total,
                "valor": valor,
            }
        )
    return {"itens": itens, "total_leads": total_leads, "valor_total": valor_total}


# ═══════════════════════════════════════════════════════════════════════════════
# Analytics (desempenho)
# ═══════════════════════════════════════════════════════════════════════════════

async def analytics(db: AsyncSession, *, empresa_id: uuid.UUID) -> dict:
    """Indicadores de desempenho da pipeline (sobre leads não-arquivados).

    Resumo (total/ganhos/perdidos/valor ganho/taxa de conversão) + quebra por
    origem e por temperatura. Não usa histórico de transições (não temos tabela
    de eventos) — mede o ESTADO atual dos leads."""
    stages = await garantir_estagios(db, empresa_id)
    won_ids = {s.id for s in stages if s.is_won}
    lost_ids = {s.id for s in stages if s.is_closed and not s.is_won}

    base = [VendasLeads.empresa_id == empresa_id, VendasLeads.is_archived.isnot(True)]

    total = int(await db.scalar(
        select(func.count()).select_from(VendasLeads).where(and_(*base))
    ) or 0)

    ganhos = 0
    valor_ganho = 0.0
    if won_ids:
        ganhos = int(await db.scalar(
            select(func.count()).select_from(VendasLeads).where(
                and_(*base, VendasLeads.stage_id.in_(won_ids))
            )
        ) or 0)
        valor_ganho = float(await db.scalar(
            select(func.coalesce(func.sum(VendasLeads.valor_estimado), 0)).where(
                and_(*base, VendasLeads.stage_id.in_(won_ids))
            )
        ) or 0)
    perdidos = 0
    if lost_ids:
        perdidos = int(await db.scalar(
            select(func.count()).select_from(VendasLeads).where(
                and_(*base, VendasLeads.stage_id.in_(lost_ids))
            )
        ) or 0)

    taxa_conversao = (ganhos / total) if total else 0.0

    # Por origem: total + ganhos + valor ganho.
    if won_ids:
        ganhos_expr = func.coalesce(
            func.sum(case((VendasLeads.stage_id.in_(won_ids), 1), else_=0)), 0
        )
        valor_expr = func.coalesce(
            func.sum(
                case(
                    (VendasLeads.stage_id.in_(won_ids), VendasLeads.valor_estimado),
                    else_=0,
                )
            ),
            0,
        )
    else:
        ganhos_expr = literal(0)
        valor_expr = literal(0)

    por_origem: dict[str, dict] = {}
    rows = await db.execute(
        select(
            VendasLeads.origem,
            func.count().label("total"),
            ganhos_expr.label("ganhos"),
            valor_expr.label("valor_ganho"),
        )
        .where(and_(*base))
        .group_by(VendasLeads.origem)
    )
    for origem, tot, gan, val in rows.all():
        chave = origem or "—"
        por_origem[chave] = {
            "origem": chave,
            "total": int(tot or 0),
            "ganhos": int(gan or 0),
            "valor_ganho": float(val or 0),
        }

    # Por temperatura.
    por_temperatura: list[dict] = []
    rows_t = await db.execute(
        select(VendasLeads.temperatura, func.count())
        .where(and_(*base))
        .group_by(VendasLeads.temperatura)
    )
    for temp, qtd in rows_t.all():
        por_temperatura.append(
            {"temperatura": temp or "—", "total": int(qtd or 0)}
        )

    return {
        "total_leads": total,
        "ganhos": ganhos,
        "perdidos": perdidos,
        "valor_ganho": valor_ganho,
        "taxa_conversao": taxa_conversao,
        "por_origem": list(por_origem.values()),
        "por_temperatura": por_temperatura,
    }
