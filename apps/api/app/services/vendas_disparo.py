"""Toriq Vendas — FASE 2 (Disparo em Massa por Email): serviço de envio.

Resolve destinatários de uma campanha (lead_ids explícitos OU filtros de
segmento), materializa uma mensagem por destinatário (idempotente) e envia
respeitando SUPRESSÃO (opt-out LGPD) e rate limit, com link de descadastro e
pixel de rastreio injetados no corpo.

Convenções:
- Tenant SEMPRE por empresa_id (toda query é escopada).
- O envio real (SMTP) é delegado a app.integrations.email_provider.enviar_email,
  que roda em asyncio.to_thread (não bloqueia o loop). Nos testes esse envio é
  mockado por monkeypatch nesta mesma referência (enviar_email).
- Estilo de sessão (SessionLocal) seguindo app/services/automacoes_engine.py e
  app/jobs/tasks.py — funções recebem ``db`` e NÃO commitam, EXCETO enviar_campanha
  e processar_campanhas_pendentes, que são os pontos de entrada (commit próprio).
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.esocial_crypto import decrypt_secret
from app.integrations.email_provider import (
    EmailError,
    enviar_email,
    normalizar_supressao,
    render_template,
)
from app.models.vendas import VendasLeads, VendasSegmentos
from app.models.vendas_disparo import (
    VendasCampanhas,
    VendasDisparoConfig,
    VendasMensagens,
    VendasSupressao,
    VendasTemplates,
)


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


_CANAIS_WHATSAPP = ("whatsapp", "whatsapp_evo")


def _campo_destino(campanha: "VendasCampanhas"):
    """Coluna do lead usada como destinatário conforme o canal da campanha."""
    return (
        VendasLeads.telefone
        if campanha.canal in _CANAIS_WHATSAPP
        else VendasLeads.email
    )


def _valor_destino(campanha: "VendasCampanhas", lead: VendasLeads) -> Optional[str]:
    return lead.telefone if campanha.canal in _CANAIS_WHATSAPP else lead.email


# ═══════════════════════════════════════════════════════════════════════════════
# Resolução de destinatários
# ═══════════════════════════════════════════════════════════════════════════════

async def resolver_destinatarios(
    db: AsyncSession, campanha: VendasCampanhas
) -> list[VendasLeads]:
    """Retorna os leads-alvo da campanha (somente com email não-nulo).

    - Se ``campanha.lead_ids`` tiver itens → busca esses leads (escopados por
      empresa).
    - Senão, se ``segmento_id`` → carrega o segmento e aplica os filtros salvos
      (reusa ``_aplicar_filtros_segmento`` de app/api/vendas.py).
    - Senão → [] (campanha sem alvo).

    Canal email: só entram leads com email preenchido.
    """
    empresa_id = campanha.empresa_id
    conds_extra = None

    if campanha.lead_ids:
        # lead_ids pode vir como list[str] (JSONB) — normaliza para UUID.
        ids: list[uuid.UUID] = []
        for raw in campanha.lead_ids:
            try:
                ids.append(uuid.UUID(str(raw)))
            except (ValueError, TypeError):
                continue
        if not ids:
            return []
        stmt = select(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.id.in_(ids),
            _campo_destino(campanha).isnot(None),
        )
        result = await db.scalars(stmt)
        return list(result)

    if campanha.segmento_id is not None:
        # Import local para evitar ciclo de import (api → services → api).
        from app.api.vendas import _aplicar_filtros_segmento

        seg = await db.scalar(
            select(VendasSegmentos).where(
                VendasSegmentos.id == campanha.segmento_id,
                VendasSegmentos.empresa_id == empresa_id,
            )
        )
        if seg is None:
            return []
        where = _aplicar_filtros_segmento(empresa_id, seg.filtros)
        result = await db.scalars(
            select(VendasLeads).where(where, _campo_destino(campanha).isnot(None))
        )
        return list(result)

    return []


# ═══════════════════════════════════════════════════════════════════════════════
# Materialização das mensagens (idempotente)
# ═══════════════════════════════════════════════════════════════════════════════

async def materializar_mensagens(db: AsyncSession, campanha: VendasCampanhas) -> int:
    """Cria 1 ``VendasMensagens`` (status='pendente') por destinatário que ainda
    não tem mensagem nessa campanha. Atualiza ``total_destinatarios``.

    Retorna a quantidade criada. Idempotente: não duplica destinatários.
    """
    destinatarios = await resolver_destinatarios(db, campanha)

    # lead_ids que já têm mensagem nessa campanha (anti-duplicação).
    existentes = await db.scalars(
        select(VendasMensagens.lead_id).where(
            VendasMensagens.campanha_id == campanha.id
        )
    )
    ja_tem: set[uuid.UUID] = {lid for lid in existentes if lid is not None}

    criadas = 0
    for lead in destinatarios:
        if lead.id in ja_tem:
            continue
        db.add(
            VendasMensagens(
                id=uuid.uuid4(),
                empresa_id=campanha.empresa_id,
                campanha_id=campanha.id,
                lead_id=lead.id,
                canal=campanha.canal,
                destinatario=_valor_destino(campanha, lead),
                status="pendente",
            )
        )
        ja_tem.add(lead.id)
        criadas += 1

    # total_destinatarios = total já materializado para a campanha.
    campanha.total_destinatarios = len(ja_tem)
    await db.flush()
    return criadas


# ═══════════════════════════════════════════════════════════════════════════════
# Envio de uma campanha (uma rodada, respeitando rate limit)
# ═══════════════════════════════════════════════════════════════════════════════

def _variaveis_do_lead(lead: Optional[VendasLeads]) -> dict:
    """Variáveis disponíveis para render do template (assunto + corpo)."""
    if lead is None:
        return {}
    return {
        "nome": lead.nome or "",
        "empresa_nome": lead.empresa_nome or "",
        "email": lead.email or "",
        "telefone": lead.telefone or "",
        "cidade": lead.cidade or "",
        "estado": lead.estado or "",
    }


def _injetar_rastreio_descadastro(html: str, mensagem_id: uuid.UUID) -> str:
    """Anexa pixel de rastreio + link de descadastro ao fim do HTML.

    URLs relativas (placeholder) — o host é resolvido pelo front/infra:
    - rastreio:    /vendas/rastrear/{mensagem_id}.png
    - descadastro: /vendas/descadastro/{mensagem_id}
    """
    pixel = (
        f'<img src="/vendas/rastrear/{mensagem_id}.png" '
        f'width="1" height="1" alt="" style="display:none" />'
    )
    descadastro = (
        f'<p style="font-size:12px;color:#888;margin-top:24px">'
        f'Não deseja mais receber estes emails? '
        f'<a href="/vendas/descadastro/{mensagem_id}">Descadastrar</a>.'
        f"</p>"
    )
    return f"{html or ''}{descadastro}{pixel}"


async def _resumo_status(
    db: AsyncSession, campanha_id: uuid.UUID, empresa_id: uuid.UUID
) -> dict:
    """Resumo 'não enviei nada agora' (outra rodada está processando a campanha)."""
    campanha = await db.scalar(
        select(VendasCampanhas).where(
            VendasCampanhas.id == campanha_id,
            VendasCampanhas.empresa_id == empresa_id,
        )
    )
    if campanha is None:
        raise ValueError("campanha não encontrada")
    return {
        "campanha_id": campanha.id,
        "status": campanha.status,
        "total_destinatarios": campanha.total_destinatarios or 0,
        "enviados": 0,
        "suprimidos": 0,
        "erros": 0,
        "dedup": 0,
    }


async def _resolver_instancia_evo(db: AsyncSession, *, empresa_id, instancia_id):
    """Instância Evolution p/ o disparo: a escolhida na campanha (se houver e for da
    empresa) ou a primeira conectada (fallback). Retorna None se nenhuma existir."""
    from app.services.vendas_evolution import instancia_conectada

    if instancia_id is not None:
        from app.models.vendas_evolution import VendasEvolutionInstancias

        return await db.scalar(
            select(VendasEvolutionInstancias).where(
                VendasEvolutionInstancias.id == instancia_id,
                VendasEvolutionInstancias.empresa_id == empresa_id,
            )
        )
    return await instancia_conectada(db, empresa_id)


async def preparar_campanha(
    db: AsyncSession, *, campanha_id: uuid.UUID, empresa_id: uuid.UUID
) -> dict:
    """Valida + materializa as mensagens e marca a campanha como 'enviando'.

    É a parte RÁPIDA (sem envio real) que o endpoint roda no request para dar
    feedback imediato (total de destinatários). O envio em si fica para a fila /
    scheduler. Idempotente. Levanta ValueError se a campanha/config não existir.
    """
    campanha = await db.scalar(
        select(VendasCampanhas).where(
            VendasCampanhas.id == campanha_id,
            VendasCampanhas.empresa_id == empresa_id,
        )
    )
    if campanha is None:
        raise ValueError("campanha não encontrada")

    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    if campanha.canal == "whatsapp":
        if config is None or not config.whatsapp_phone_id:
            raise ValueError("configure o WhatsApp")
    elif campanha.canal == "whatsapp_evo":
        if await _resolver_instancia_evo(
            db, empresa_id=empresa_id, instancia_id=campanha.instancia_id
        ) is None:
            raise ValueError("conecte uma instância Evolution antes de enviar")
    else:
        if config is None or not config.smtp_host:
            raise ValueError("configure o email")

    await materializar_mensagens(db, campanha)
    if campanha.status in ("rascunho", "agendada"):
        campanha.status = "enviando"
        if campanha.started_at is None:
            campanha.started_at = _now()
    await db.commit()
    return {
        "campanha_id": campanha.id,
        "status": campanha.status,
        "total_destinatarios": campanha.total_destinatarios or 0,
    }


async def enviar_campanha(
    db: AsyncSession,
    *,
    campanha_id: uuid.UUID,
    empresa_id: uuid.UUID,
    limite: Optional[int] = None,
) -> dict:
    """Envia uma rodada da campanha, com lock por-campanha (anti envio duplicado).

    O lock impede que duas rodadas concorrentes (fila + scheduler) enviem as
    mesmas mensagens 'pendente'. Sem Redis, ``try_lock`` retorna sempre True
    (sem lock distribuído) — comportamento idêntico ao de antes do lock.
    """
    if not await cache.try_lock(f"campanha:{campanha_id}", ttl=600):
        return await _resumo_status(db, campanha_id, empresa_id)
    try:
        return await _enviar_campanha_inner(
            db, campanha_id=campanha_id, empresa_id=empresa_id, limite=limite
        )
    finally:
        await cache.release_lock(f"campanha:{campanha_id}")


async def _enviar_campanha_inner(
    db: AsyncSession,
    *,
    campanha_id: uuid.UUID,
    empresa_id: uuid.UUID,
    limite: Optional[int] = None,
) -> dict:
    """Envia uma rodada da campanha (até ``limite`` ou ``email_rate_limit``).

    Fluxo:
    1. Carrega a campanha (empresa-scoped). Não achou → ValueError.
    2. Carrega a config; sem config/sem smtp_host → ValueError("configure o email").
    3. Se status 'rascunho'/'agendada' → materializa mensagens, status='enviando',
       started_at=now.
    4. Para cada mensagem 'pendente' (até o limite): supressão → 'suprimido';
       senão renderiza assunto/corpo, injeta descadastro+rastreio, envia.
       Sucesso → 'enviado'; EmailError → 'erro'.
    5. Se não restam pendentes → status='concluida', finished_at=now.

    Retorna o resumo {campanha_id, status, total_destinatarios, enviados,
    suprimidos, erros}. Commita ao final.
    """
    campanha = await db.scalar(
        select(VendasCampanhas).where(
            VendasCampanhas.id == campanha_id,
            VendasCampanhas.empresa_id == empresa_id,
        )
    )
    if campanha is None:
        raise ValueError("campanha não encontrada")

    config = await db.scalar(
        select(VendasDisparoConfig).where(
            VendasDisparoConfig.empresa_id == empresa_id
        )
    )
    if campanha.canal == "whatsapp":
        if config is None or not config.whatsapp_phone_id:
            raise ValueError("configure o WhatsApp")
    elif campanha.canal == "whatsapp_evo":
        if await _resolver_instancia_evo(
            db, empresa_id=empresa_id, instancia_id=campanha.instancia_id
        ) is None:
            raise ValueError("conecte uma instância Evolution antes de enviar")
    else:
        if config is None or not config.smtp_host:
            raise ValueError("configure o email")

    agora = _now()
    if campanha.status in ("rascunho", "agendada"):
        await materializar_mensagens(db, campanha)
        campanha.status = "enviando"
        if campanha.started_at is None:
            campanha.started_at = agora

    # Carrega o template (se houver) — assunto/corpo.
    template: Optional[VendasTemplates] = None
    if campanha.template_id is not None:
        template = await db.scalar(
            select(VendasTemplates).where(
                VendasTemplates.id == campanha.template_id,
                VendasTemplates.empresa_id == empresa_id,
            )
        )

    # HSM (Fase 9): não disparar WhatsApp com template marcado como rejeitado.
    if (
        campanha.canal == "whatsapp"
        and template is not None
        and template.meta_template_name
        and template.approval_status == "rejected"
    ):
        raise ValueError(
            "template WhatsApp rejeitado pela Meta — corrija/reaprove antes de disparar"
        )

    rate = limite if limite is not None else (
        (config.email_rate_limit if config else None) or 100
    )
    pendentes = (
        await db.scalars(
            select(VendasMensagens)
            .where(
                VendasMensagens.campanha_id == campanha.id,
                VendasMensagens.status == "pendente",
            )
            .order_by(VendasMensagens.created_at)
            .limit(rate)
        )
    ).all()

    # Segredo SMTP descriptografado uma única vez.
    smtp_password = (
        decrypt_secret(config.smtp_password_enc)
        if config and config.smtp_password_enc
        else None
    )

    enviados = 0
    suprimidos = 0
    erros = 0
    dedup = 0

    eh_whatsapp = campanha.canal == "whatsapp"
    eh_evo = campanha.canal == "whatsapp_evo"
    tipo_supressao = "telefone" if (eh_whatsapp or eh_evo) else "email"

    # Canal Evolution: resolve a instância conectada uma única vez.
    evo_inst = None
    if eh_evo:
        evo_inst = await _resolver_instancia_evo(
            db, empresa_id=empresa_id, instancia_id=campanha.instancia_id
        )
        if evo_inst is None:
            raise ValueError("conecte uma instância Evolution antes de enviar")

    # Dedup (Fase 7): não reenviar para o mesmo lead em N dias (0 = desligado).
    dedup_dias = (config.dedup_dias if config else 0) or 0
    dedup_cutoff = (
        _now() - datetime.timedelta(days=dedup_dias) if dedup_dias > 0 else None
    )

    for msg in pendentes:
        destinatario = msg.destinatario or ""
        normalizado = normalizar_supressao(tipo_supressao, destinatario)

        # Supressão (opt-out LGPD): não envia.
        suprimido = await db.scalar(
            select(VendasSupressao.id).where(
                VendasSupressao.empresa_id == empresa_id,
                VendasSupressao.tipo == tipo_supressao,
                VendasSupressao.valor == normalizado,
            )
        )
        if suprimido is not None:
            msg.status = "suprimido"
            suprimidos += 1
            continue

        # Dedup: o lead já recebeu uma mensagem enviada (em OUTRA campanha) na
        # janela? Então não reenvia agora.
        if dedup_cutoff is not None and msg.lead_id is not None:
            recente = await db.scalar(
                select(VendasMensagens.id)
                .where(
                    VendasMensagens.empresa_id == empresa_id,
                    VendasMensagens.lead_id == msg.lead_id,
                    VendasMensagens.campanha_id != campanha.id,
                    VendasMensagens.status.in_(
                        ["enviado", "entregue", "lido", "respondeu"]
                    ),
                    VendasMensagens.enviado_em.isnot(None),
                    VendasMensagens.enviado_em >= dedup_cutoff,
                )
                .limit(1)
            )
            if recente is not None:
                msg.status = "dedup"
                dedup += 1
                continue

        if eh_evo:
            # Canal Evolution: renderiza as variáveis do lead ({{nome}} etc.) e
            # envia pela instância escolhida/conectada da empresa.
            from app.services.vendas_evolution import enviar_texto as evo_enviar

            lead_evo: Optional[VendasLeads] = None
            if msg.lead_id is not None:
                lead_evo = await db.scalar(
                    select(VendasLeads).where(VendasLeads.id == msg.lead_id)
                )
            corpo_evo = render_template(
                template.conteudo if template is not None else None,
                _variaveis_do_lead(lead_evo),
            ) or ""
            res = await evo_enviar(
                db,
                empresa_id=empresa_id,
                instancia_id=evo_inst.id,
                numero=destinatario,
                texto=corpo_evo,
            )
            if res["enviado"]:
                msg.status = "enviado"
                msg.provider_id = res["provider_id"]
                msg.instancia_id = evo_inst.id
                msg.enviado_em = _now()
                enviados += 1
            else:
                msg.status = "erro"
                msg.erro = res["erro"]
                erros += 1
            continue

        if eh_whatsapp:
            # Canal WhatsApp: envio delegado ao serviço dedicado, que seta
            # msg.status/provider_id/enviado_em (ou status='erro'/erro).
            from app.services.vendas_whatsapp import enviar_mensagem_whatsapp

            await enviar_mensagem_whatsapp(
                db,
                config=config,
                mensagem=msg,
                campanha=campanha,
                template=template,
            )
            if msg.status == "enviado":
                enviados += 1
            elif msg.status == "erro":
                erros += 1
            continue

        # Canal email: render + injeção de descadastro/rastreio + SMTP.
        lead: Optional[VendasLeads] = None
        if msg.lead_id is not None:
            lead = await db.scalar(
                select(VendasLeads).where(VendasLeads.id == msg.lead_id)
            )
        variaveis = _variaveis_do_lead(lead)

        assunto = render_template(template.assunto if template else None, variaveis)
        corpo = render_template(template.conteudo if template else None, variaveis)
        html = _injetar_rastreio_descadastro(corpo, msg.id)

        try:
            provider_id = await enviar_email(
                smtp_host=config.smtp_host,
                smtp_port=config.smtp_port,
                smtp_user=config.smtp_user,
                smtp_password=smtp_password,
                use_tls=bool(config.smtp_use_tls),
                remetente=config.email_remetente,
                remetente_nome=config.email_remetente_nome,
                to=destinatario,
                assunto=assunto,
                html=html,
            )
            msg.status = "enviado"
            msg.provider_id = provider_id
            msg.enviado_em = _now()
            enviados += 1
        except EmailError as exc:
            msg.status = "erro"
            msg.erro = str(exc)
            erros += 1

    campanha.total_enviados = (campanha.total_enviados or 0) + enviados
    campanha.total_erros = (campanha.total_erros or 0) + erros

    # Se não restam pendentes → concluída.
    restantes = await db.scalar(
        select(VendasMensagens.id)
        .where(
            VendasMensagens.campanha_id == campanha.id,
            VendasMensagens.status == "pendente",
        )
        .limit(1)
    )
    if restantes is None:
        campanha.status = "concluida"
        campanha.finished_at = _now()

    # Medição de uso (Fase 5): mensagens efetivamente enviadas nesta rodada.
    if enviados:
        from app.services.vendas_uso import registrar_uso

        await registrar_uso(
            db,
            empresa_id=empresa_id,
            metrica=(
                "whatsapp_enviados" if (eh_whatsapp or eh_evo) else "emails_enviados"
            ),
            quantidade=enviados,
            referencia=str(campanha.id),
        )

    await db.commit()

    return {
        "campanha_id": campanha.id,
        "status": campanha.status,
        "total_destinatarios": campanha.total_destinatarios or 0,
        "enviados": enviados,
        "suprimidos": suprimidos,
        "erros": erros,
        "dedup": dedup,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# JOB (~1min): processa campanhas em andamento / agendadas vencidas
# ═══════════════════════════════════════════════════════════════════════════════

async def processar_campanhas_pendentes(db: AsyncSession) -> None:
    """Processa (uma rodada) as campanhas que devem rodar agora.

    Pega campanhas com status='enviando' OU (status='agendada' E
    agendada_para <= now) e chama ``enviar_campanha`` para cada, respeitando o
    rate limit (uma rodada por ciclo). Usado pelo scheduler (o integrador
    registra a task com IntervalTrigger ~1min).
    """
    from sqlalchemy import and_, or_

    agora = _now()
    campanhas = (
        await db.scalars(
            select(VendasCampanhas).where(
                or_(
                    VendasCampanhas.status == "enviando",
                    and_(
                        VendasCampanhas.status == "agendada",
                        VendasCampanhas.agendada_para.isnot(None),
                        VendasCampanhas.agendada_para <= agora,
                    ),
                )
            )
        )
    ).all()

    for campanha in campanhas:
        try:
            await enviar_campanha(
                db,
                campanha_id=campanha.id,
                empresa_id=campanha.empresa_id,
            )
        except ValueError:
            # Sem config de email (ou campanha sumiu) — pula, não derruba o ciclo.
            continue
