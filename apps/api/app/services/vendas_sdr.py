"""Toriq Vendas — FASE 4 (SDR Inteligente): serviço do agente de IA (Claude).

Dois usos principais, ambos guiados por PROMPTS DINÂMICOS configuráveis por
empresa (persona, objetivo, prompt_sistema, diretrizes, prompt_qualificacao,
temperatura, modelo):

1. QUALIFICAR leads — o modelo classifica o lead em score (0-100) + status
   (quente|morno|frio|desqualificado) + notas, persistidos em vendas_leads
   (colunas sdr_*). Cada qualificação é registrada em vendas_sdr_interacoes.
2. CONVERSAR — o modelo gera respostas considerando o histórico de mensagens do
   lead. NÃO envia por canal nenhum: só gera e registra (o envio é decisão do
   operador, em outra fase/tela).

Convenções:
- Tenant SEMPRE por empresa_id (toda query escopada).
- A chave da API (api_key) é guardada criptografada (api_key_enc) e só é
  descriptografada na hora de chamar o modelo (reusa app.core.esocial_crypto).
- A chamada ao modelo é delegada a app.integrations.llm_claude.chamar_claude,
  que nos testes é mockado por monkeypatch nesta mesma referência (chamar_claude).
- Estilo de sessão seguindo app/services/vendas_disparo.py — as funções de
  entrada (qualificar_lead, qualificar_batch, gerar_resposta) commitam ao final.
"""
from __future__ import annotations

import datetime
import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret
from app.integrations.llm_claude import LLMError, chamar_claude, extrair_json
from app.models.vendas import VendasLeads
from app.models.vendas_sdr import VendasSdrConfig, VendasSdrInteracoes


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# Prompt de qualificação default (pt-BR), usado quando a empresa não configurou
# um prompt_qualificacao próprio.
_PROMPT_QUALIFICACAO_DEFAULT = (
    "Você é um SDR (pré-vendas). Classifique o lead abaixo quanto ao seu "
    "potencial comercial, considerando os dados disponíveis. Atribua um score "
    "de 0 a 100 (quanto maior, mais quente), um status e notas curtas "
    "justificando."
)

# Instrução fixa de formato — sempre anexada à mensagem de qualificação para
# garantir que conseguimos parsear a resposta.
_FORMATO_QUALIFICACAO = (
    'Responda APENAS um JSON: '
    '{"score": 0-100, "status": "quente|morno|frio|desqualificado", '
    '"notas": "..."}'
)


async def _carregar_config(db: AsyncSession, empresa_id: uuid.UUID) -> VendasSdrConfig:
    """Carrega a config do SDR da empresa. Sem config OU sem api_key_enc →
    ValueError("configure o SDR ...") (o router converte em 400)."""
    config = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    if config is None or not config.api_key_enc:
        raise ValueError("configure o SDR (provedor + chave de API) antes de usar o agente")
    return config


async def assegurar_config(db: AsyncSession, empresa_id: uuid.UUID) -> None:
    """Valida que o SDR está configurado (ValueError se não). Pré-check síncrono
    para o endpoint de qualificação assíncrona dar feedback imediato antes de
    enfileirar o trabalho pesado de IA."""
    await _carregar_config(db, empresa_id)


def _resumo_lead(lead: VendasLeads) -> str:
    """Texto curto com os dados do lead para dar contexto ao modelo."""
    partes: list[str] = []
    campos = (
        ("Nome", lead.nome),
        ("Empresa", lead.empresa_nome),
        ("Cidade", lead.cidade),
        ("Estado", lead.estado),
        ("Plataforma", lead.plataforma),
        ("Telefone", lead.telefone),
        ("Email", lead.email),
        ("Status", lead.status),
    )
    for rotulo, valor in campos:
        if valor:
            partes.append(f"{rotulo}: {valor}")
    return "\n".join(partes) if partes else "(sem dados adicionais)"


def _system_qualificacao(config: VendasSdrConfig) -> str | None:
    """System prompt para qualificação: prompt_sistema explícito ou montado a
    partir de persona/objetivo."""
    if config.prompt_sistema:
        return config.prompt_sistema
    partes: list[str] = []
    if config.persona:
        partes.append(config.persona)
    if config.objetivo:
        partes.append(f"Objetivo: {config.objetivo}")
    return "\n\n".join(partes) if partes else None


def _system_conversa(config: VendasSdrConfig, lead: VendasLeads) -> str | None:
    """System prompt para conversa: prompt_sistema (ou persona/objetivo) +
    diretrizes + contexto do lead."""
    partes: list[str] = []
    base = _system_qualificacao(config)
    if base:
        partes.append(base)
    if config.diretrizes:
        partes.append(f"Diretrizes:\n{config.diretrizes}")
    partes.append(f"Contexto do lead:\n{_resumo_lead(lead)}")
    return "\n\n".join(partes) if partes else None


async def _carregar_lead(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> VendasLeads:
    """Carrega o lead escopado por empresa. Não achou → ValueError."""
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if lead is None:
        raise ValueError("lead não encontrado")
    return lead


# ═══════════════════════════════════════════════════════════════════════════════
# QUALIFICAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════

async def qualificar_lead(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> dict:
    """Qualifica um lead com o agente: pede ao modelo um JSON com score/status/
    notas, persiste em vendas_leads.sdr_* e registra a interação. Commita.

    Se o parse do JSON falhar, não explode: status fica como veio (ou None) e
    notas recebe o texto bruto retornado pelo modelo.
    """
    config = await _carregar_config(db, empresa_id)
    lead = await _carregar_lead(db, empresa_id=empresa_id, lead_id=lead_id)

    system = _system_qualificacao(config)
    user = (
        (config.prompt_qualificacao or _PROMPT_QUALIFICACAO_DEFAULT)
        + "\n\nLead:\n"
        + _resumo_lead(lead)
        + "\n\n"
        + _FORMATO_QUALIFICACAO
    )

    texto = await chamar_claude(
        api_key=decrypt_secret(config.api_key_enc),
        modelo=config.modelo or "claude-sonnet-4-6",
        system=system,
        mensagens=[{"role": "user", "content": user}],
        temperatura=float(config.temperatura) if config.temperatura is not None else 0.7,
    )

    parsed = extrair_json(texto)
    score: int | None = None
    status: str | None = None
    notas: str | None = None
    if parsed:
        raw_score = parsed.get("score")
        try:
            score = int(raw_score) if raw_score is not None else None
        except (TypeError, ValueError):
            score = None
        status = parsed.get("status") or None
        notas = parsed.get("notas") or None
    if notas is None:
        # Sem JSON parseável (ou sem 'notas'): guarda o texto bruto.
        notas = texto

    lead.sdr_score = score
    lead.sdr_status = status
    lead.sdr_notas = notas

    db.add(
        VendasSdrInteracoes(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            lead_id=lead.id,
            papel="assistente",
            tipo="qualificacao",
            conteudo=texto,
            meta=parsed if parsed else None,
        )
    )

    # Medição de uso (Fase 5): 1 qualificação SDR.
    from app.services.vendas_uso import registrar_uso

    await registrar_uso(
        db, empresa_id=empresa_id, metrica="sdr_qualificacoes", referencia=str(lead.id)
    )

    await db.commit()
    return {
        "lead_id": lead.id,
        "sdr_score": score,
        "sdr_status": status,
        "sdr_notas": notas,
    }


async def qualificar_batch(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_ids: list[uuid.UUID]
) -> dict:
    """Qualifica vários leads. Conta quantos qualificaram e quantos erraram
    (erro de modelo/rede ou lead inexistente). Commita ao final."""
    # Garante config logo no início (sem config → não tenta nada).
    await _carregar_config(db, empresa_id)

    qualificados = 0
    erros = 0
    for lead_id in lead_ids:
        try:
            await _qualificar_lead_sem_commit(db, empresa_id=empresa_id, lead_id=lead_id)
            qualificados += 1
        except (LLMError, ValueError):
            erros += 1
            continue

    await db.commit()
    return {"qualificados": qualificados, "erros": erros}


async def _qualificar_lead_sem_commit(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> None:
    """Núcleo da qualificação sem commit (reuso pelo batch)."""
    config = await _carregar_config(db, empresa_id)
    lead = await _carregar_lead(db, empresa_id=empresa_id, lead_id=lead_id)

    system = _system_qualificacao(config)
    user = (
        (config.prompt_qualificacao or _PROMPT_QUALIFICACAO_DEFAULT)
        + "\n\nLead:\n"
        + _resumo_lead(lead)
        + "\n\n"
        + _FORMATO_QUALIFICACAO
    )

    texto = await chamar_claude(
        api_key=decrypt_secret(config.api_key_enc),
        modelo=config.modelo or "claude-sonnet-4-6",
        system=system,
        mensagens=[{"role": "user", "content": user}],
        temperatura=float(config.temperatura) if config.temperatura is not None else 0.7,
    )

    parsed = extrair_json(texto)
    score: int | None = None
    status: str | None = None
    notas: str | None = None
    if parsed:
        raw_score = parsed.get("score")
        try:
            score = int(raw_score) if raw_score is not None else None
        except (TypeError, ValueError):
            score = None
        status = parsed.get("status") or None
        notas = parsed.get("notas") or None
    if notas is None:
        notas = texto

    lead.sdr_score = score
    lead.sdr_status = status
    lead.sdr_notas = notas

    db.add(
        VendasSdrInteracoes(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            lead_id=lead.id,
            papel="assistente",
            tipo="qualificacao",
            conteudo=texto,
            meta=parsed if parsed else None,
        )
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSA (gerar resposta)
# ═══════════════════════════════════════════════════════════════════════════════

async def gerar_resposta(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID, mensagem: str
) -> str:
    """Gera (e registra) uma resposta do agente para a última mensagem do lead.

    Fluxo: registra a mensagem recebida (papel='usuario'), reconstrói o histórico
    de mensagens do lead (tipo='mensagem'), chama o modelo e registra a resposta
    (papel='assistente'). NÃO envia por canal nenhum. Commita.
    """
    config = await _carregar_config(db, empresa_id)
    lead = await _carregar_lead(db, empresa_id=empresa_id, lead_id=lead_id)

    # Registra a mensagem recebida ANTES de montar o histórico, para que ela
    # entre na conversa enviada ao modelo.
    db.add(
        VendasSdrInteracoes(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            lead_id=lead.id,
            papel="usuario",
            tipo="mensagem",
            conteudo=mensagem,
            meta=None,
        )
    )
    await db.flush()

    historico = (
        await db.scalars(
            select(VendasSdrInteracoes)
            .where(
                VendasSdrInteracoes.lead_id == lead.id,
                VendasSdrInteracoes.empresa_id == empresa_id,
                VendasSdrInteracoes.tipo == "mensagem",
            )
            .order_by(VendasSdrInteracoes.created_at)
        )
    ).all()

    _mapa_papel = {"usuario": "user", "assistente": "assistant"}
    mensagens: list[dict] = []
    for it in historico:
        role = _mapa_papel.get((it.papel or "").lower())
        if role is None or not it.conteudo:
            continue
        mensagens.append({"role": role, "content": it.conteudo})

    if not mensagens:
        # Fallback defensivo: ao menos a mensagem atual.
        mensagens = [{"role": "user", "content": mensagem}]

    system = _system_conversa(config, lead)

    resposta = await chamar_claude(
        api_key=decrypt_secret(config.api_key_enc),
        modelo=config.modelo or "claude-sonnet-4-6",
        system=system,
        mensagens=mensagens,
        temperatura=float(config.temperatura) if config.temperatura is not None else 0.7,
    )

    db.add(
        VendasSdrInteracoes(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            lead_id=lead.id,
            papel="assistente",
            tipo="mensagem",
            conteudo=resposta,
            meta=None,
        )
    )

    # Medição de uso (Fase 5): 1 conversa SDR (resposta gerada pela IA).
    from app.services.vendas_uso import registrar_uso

    await registrar_uso(
        db, empresa_id=empresa_id, metrica="sdr_conversas", referencia=str(lead.id)
    )

    await db.commit()
    return resposta


# ═══════════════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════════════

async def stats(db: AsyncSession, *, empresa_id: uuid.UUID) -> dict:
    """Resumo do funil SDR da empresa: total de leads, contagem por sdr_status,
    score médio (ignora null) e follow-ups pendentes (proximo_followup <= now)."""
    total = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id
        )
    )

    por_status_rows = (
        await db.execute(
            select(VendasLeads.sdr_status, func.count())
            .where(VendasLeads.empresa_id == empresa_id)
            .group_by(VendasLeads.sdr_status)
        )
    ).all()
    por_status: dict = {}
    for sdr_status, qtd in por_status_rows:
        chave = sdr_status if sdr_status is not None else "sem_status"
        por_status[chave] = qtd

    score_medio = await db.scalar(
        select(func.avg(VendasLeads.sdr_score)).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.sdr_score.isnot(None),
        )
    )

    followups_pendentes = await db.scalar(
        select(func.count()).select_from(VendasLeads).where(
            VendasLeads.empresa_id == empresa_id,
            VendasLeads.sdr_proximo_followup.isnot(None),
            VendasLeads.sdr_proximo_followup <= _now(),
        )
    )

    return {
        "total": total or 0,
        "por_status": por_status,
        "score_medio": float(score_medio) if score_medio is not None else None,
        "followups_pendentes": followups_pendentes or 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SDR AUTÔNOMO (Fase 6): inbound → raciocínio CoT → resposta + handoff
# ═══════════════════════════════════════════════════════════════════════════════

# Mapa da decisão do agente para o sdr_status do lead.
_DECISAO_PARA_STATUS = {
    "qualified": "quente",
    "em_contato": "morno",
    "desqualified": "desqualificado",
}

# Horas até o follow-up automático quando o lead fica "em_contato" e some.
# Mantido DENTRO da janela de 24h do WhatsApp para o nudge poder ir como texto.
FOLLOWUP_HORAS = 6


async def _cot_decisao(
    config: VendasSdrConfig, system: str | None, contexto_user: str
) -> tuple[str, dict | None]:
    """Raciocínio em 2 fases (Chain-of-Thought): primeiro o modelo "pensa" a
    conversa em texto livre; depois decide em JSON usando o próprio raciocínio
    como contexto. Melhora a qualidade vs. um único prompt."""
    api_key = decrypt_secret(config.api_key_enc)
    modelo = config.modelo or "claude-sonnet-4-6"
    temp = float(config.temperatura) if config.temperatura is not None else 0.7

    pensamento = await chamar_claude(
        api_key=api_key,
        modelo=modelo,
        system=system,
        mensagens=[
            {
                "role": "user",
                "content": contexto_user
                + "\n\nAnalise a conversa internamente (interesse, objeções, "
                "estágio, próximo passo ideal). Ainda NÃO responda em JSON.",
            }
        ],
        temperatura=temp,
        max_tokens=600,
    )

    formato = (
        "Com base na sua análise, responda APENAS um JSON válido: "
        '{"is_final": true|false, '
        '"decision": "qualified|em_contato|desqualified", '
        '"next_message": "mensagem curta para enviar ao lead (ou vazio)", '
        '"summary": "resumo da conversa e situação", '
        '"reason": "motivo objetivo da decisão", "score": 0-100}'
    )
    texto = await chamar_claude(
        api_key=api_key,
        modelo=modelo,
        system="Você responde SOMENTE com JSON válido, sem texto fora do objeto.",
        mensagens=[
            {"role": "user", "content": contexto_user},
            {"role": "assistant", "content": pensamento},
            {"role": "user", "content": formato},
        ],
        temperatura=0.3,
        max_tokens=800,
    )
    return texto, extrair_json(texto)


def _telefones_notificacao(config: VendasSdrConfig) -> list[str]:
    raw = (config.notificar_telefones or "").replace(";", ",")
    return [t.strip() for t in raw.split(",") if t.strip()]


async def _enviar_whatsapp_sdr(
    db: AsyncSession, *, empresa_id: uuid.UUID, to: str, texto: str,
    canal: str = "whatsapp",
) -> bool:
    """Envia um texto por WhatsApp escolhendo o transporte pelo canal do lead.
    'whatsapp_evo' → Evolution; 'whatsapp' (default) → Meta (config de disparo).
    Retorna True se enviou. Tolerante a falhas (nunca levanta)."""
    import re

    destino = re.sub(r"\D", "", to or "")
    if not destino:
        return False

    if canal == "whatsapp_evo":
        from app.services.vendas_evolution import enviar_texto, instancia_conectada

        inst = await instancia_conectada(db, empresa_id)
        if inst is None:
            return False
        try:
            res = await enviar_texto(
                db, empresa_id=empresa_id, instancia_id=inst.id,
                numero=destino, texto=texto, typing=True,
            )
            return bool(res.get("enviado"))
        except Exception:
            return False

    from app.integrations.whatsapp_meta import WhatsAppError, send_text
    from app.models.vendas_disparo import VendasDisparoConfig

    dconf = await db.scalar(
        select(VendasDisparoConfig).where(VendasDisparoConfig.empresa_id == empresa_id)
    )
    if (
        dconf is None
        or not dconf.whatsapp_phone_id
        or not dconf.whatsapp_token_enc
    ):
        return False
    try:
        await send_text(
            phone_id=dconf.whatsapp_phone_id,
            token=decrypt_secret(dconf.whatsapp_token_enc),
            to=destino,
            body=texto,
        )
        return True
    except WhatsAppError:
        return False


async def processar_inbound_sdr(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID, mensagem: str
) -> None:
    """SDR autônomo: processa uma mensagem recebida (inbound) de um lead.

    Só roda se o agente estiver ATIVO e com chave de API. Registra o inbound,
    raciocina (CoT 2 fases), atualiza o lead (status/score/notas), e — se houver
    next_message — RESPONDE automaticamente por WhatsApp (janela 24h). Se o lead
    for qualificado (quente), faz HANDOFF: alerta os telefones de notificação.

    É o handler da fila 'sdr_inbound'. Commita ao final. Nunca propaga LLMError.
    """
    config = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    if config is None or not config.ativo or not config.api_key_enc:
        return  # SDR desligado/sem chave — não faz nada.

    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if lead is None:
        return

    # 1) Registra a mensagem recebida.
    db.add(
        VendasSdrInteracoes(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            lead_id=lead.id,
            papel="usuario",
            tipo="mensagem",
            conteudo=mensagem,
        )
    )
    await db.flush()

    # 2) Histórico de mensagens (para contexto da conversa).
    historico = (
        await db.scalars(
            select(VendasSdrInteracoes)
            .where(
                VendasSdrInteracoes.empresa_id == empresa_id,
                VendasSdrInteracoes.lead_id == lead.id,
                VendasSdrInteracoes.tipo == "mensagem",
            )
            .order_by(VendasSdrInteracoes.created_at)
        )
    ).all()
    conversa = "\n".join(
        f"{'Lead' if i.papel == 'usuario' else 'SDR'}: {i.conteudo}"
        for i in historico
        if i.conteudo
    )
    system = _system_conversa(config, lead)
    contexto_user = (
        f"Conversa até agora:\n{conversa}\n\nÚltima mensagem do lead: {mensagem}"
    )

    # 3) Raciocínio CoT → decisão.
    try:
        texto, parsed = await _cot_decisao(config, system, contexto_user)
    except LLMError:
        await db.commit()  # mantém o inbound registrado, sem resposta.
        return

    parsed = parsed or {}
    decisao = parsed.get("decision")
    next_msg = (parsed.get("next_message") or "").strip()
    summary = parsed.get("summary")
    score = parsed.get("score")

    # 4) Atualiza o lead.
    if isinstance(score, (int, float)):
        lead.sdr_score = int(score)
    if decisao in _DECISAO_PARA_STATUS:
        lead.sdr_status = _DECISAO_PARA_STATUS[decisao]
    if summary:
        lead.sdr_notas = summary

    # Follow-up automático: se o lead segue em negociação ("em_contato"),
    # agenda um nudge. Se qualificou ou desqualificou, cancela o follow-up.
    if decisao == "em_contato":
        lead.sdr_proximo_followup = _now() + datetime.timedelta(hours=FOLLOWUP_HORAS)
    elif decisao in ("qualified", "desqualified"):
        lead.sdr_proximo_followup = None

    # 5) Responde automaticamente (se houver next_message e telefone).
    if next_msg:
        enviou = await _enviar_whatsapp_sdr(
            db, empresa_id=empresa_id, to=lead.telefone or "", texto=next_msg,
            canal=(lead.ultimo_canal or "whatsapp"),
        )
        db.add(
            VendasSdrInteracoes(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                lead_id=lead.id,
                papel="assistente",
                tipo="mensagem",
                conteudo=next_msg,
                meta={"enviado": enviou, "decision": decisao},
            )
        )
        from app.services.vendas_uso import registrar_uso

        await registrar_uso(
            db, empresa_id=empresa_id, metrica="sdr_conversas", referencia=str(lead.id)
        )

        # Pipeline & Conversas (CRM): espelha a resposta do bot na thread do lead
        # (sender_type='sdr') para aparecer na inbox em tempo real. Best-effort.
        try:
            from app.services.vendas_pipeline import append_mensagem

            await append_mensagem(
                db,
                empresa_id=empresa_id,
                lead_id=lead.id,
                sender_type="sdr",
                conteudo=next_msg,
                canal="whatsapp",
                status="enviado" if enviou else "erro",
            )
        except Exception:  # pragma: no cover - tolerante
            pass
    else:
        # Sem resposta: registra o raciocínio/decisão.
        db.add(
            VendasSdrInteracoes(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                lead_id=lead.id,
                papel="assistente",
                tipo="qualificacao",
                conteudo=texto,
                meta=parsed,
            )
        )

    # 6) Handoff humano se o lead esquentou (qualified).
    if decisao == "qualified":
        telefones = _telefones_notificacao(config)
        alerta = (
            f"🔥 Lead qualificado pelo SDR: "
            f"{lead.nome or lead.empresa_nome or lead.telefone or 'lead'}\n"
            f"Telefone: {lead.telefone or '-'}\n"
            f"Resumo: {summary or parsed.get('reason') or '-'}"
        )
        notificados = 0
        for tel in telefones:
            if await _enviar_whatsapp_sdr(
                db, empresa_id=empresa_id, to=tel, texto=alerta,
                canal=(lead.ultimo_canal or "whatsapp"),
            ):
                notificados += 1
        db.add(
            VendasSdrInteracoes(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                lead_id=lead.id,
                papel="evento",
                tipo="escalonamento",
                conteudo=f"Handoff: lead quente — {notificados}/{len(telefones)} notificado(s).",
                meta={"telefones": len(telefones), "notificados": notificados},
            )
        )

    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# FOLLOW-UP AUTOMÁTICO (Fase pós-pipeline): nudge ao lead que ficou em silêncio
# ═══════════════════════════════════════════════════════════════════════════════

async def _janela_aberta_lead(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> bool:
    """A janela de 24h (última msg do lead na thread de conversas) está aberta?"""
    from app.models.vendas_pipeline import VendasConversas

    ultimo = await db.scalar(
        select(VendasConversas.created_at)
        .where(
            VendasConversas.empresa_id == empresa_id,
            VendasConversas.lead_id == lead_id,
            VendasConversas.sender_type == "lead",
        )
        .order_by(VendasConversas.created_at.desc())
        .limit(1)
    )
    if ultimo is None:
        return False
    return _now() < ultimo + datetime.timedelta(hours=24)


async def processar_followup_sdr(
    db: AsyncSession, *, empresa_id: uuid.UUID, lead_id: uuid.UUID
) -> None:
    """Envia UM nudge de reengajamento a um lead com follow-up vencido.

    Só roda com SDR ativo + auto-resposta + chave. Respeita a janela de 24h
    (fora dela não dá para mandar texto livre → só limpa o agendamento). Gera
    a mensagem com a IA, envia por WhatsApp, espelha na thread e LIMPA o
    follow-up (one-shot, evita spam). Commita. Nunca propaga LLMError.
    """
    config = await db.scalar(
        select(VendasSdrConfig).where(VendasSdrConfig.empresa_id == empresa_id)
    )
    lead = await db.scalar(
        select(VendasLeads).where(
            VendasLeads.id == lead_id, VendasLeads.empresa_id == empresa_id
        )
    )
    if lead is None:
        return
    # Desliga o agendamento em qualquer caso que não dê para seguir.
    if (
        config is None
        or not config.ativo
        or not config.auto_responder
        or not config.api_key_enc
        or not await _janela_aberta_lead(db, empresa_id=empresa_id, lead_id=lead_id)
    ):
        lead.sdr_proximo_followup = None
        await db.commit()
        return

    system = _system_conversa(config, lead)
    contexto = (
        "O lead ficou em silêncio após a última interação. Gere UMA mensagem "
        "curta, gentil e específica de follow-up para reengajar a conversa. "
        "Responda apenas com a mensagem, sem aspas."
    )
    try:
        texto = await chamar_claude(
            api_key=decrypt_secret(config.api_key_enc),
            modelo=config.modelo or "claude-sonnet-4-6",
            system=system,
            mensagens=[{"role": "user", "content": contexto}],
            temperatura=float(config.temperatura) if config.temperatura is not None else 0.7,
            max_tokens=400,
        )
    except LLMError:
        lead.sdr_proximo_followup = None
        await db.commit()
        return

    texto = (texto or "").strip()
    enviou = False
    if texto:
        enviou = await _enviar_whatsapp_sdr(
            db, empresa_id=empresa_id, to=lead.telefone or "", texto=texto,
            canal=(lead.ultimo_canal or "whatsapp"),
        )
        db.add(
            VendasSdrInteracoes(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                lead_id=lead.id,
                papel="assistente",
                tipo="mensagem",
                conteudo=texto,
                meta={"enviado": enviou, "followup": True},
            )
        )
        # Espelha o follow-up na thread de conversas (inbox em tempo real).
        try:
            from app.services.vendas_pipeline import append_mensagem

            await append_mensagem(
                db,
                empresa_id=empresa_id,
                lead_id=lead.id,
                sender_type="sdr",
                conteudo=texto,
                canal="whatsapp",
                status="enviado" if enviou else "erro",
            )
        except Exception:  # pragma: no cover - espelho é best-effort
            pass
        from app.services.vendas_uso import registrar_uso

        await registrar_uso(
            db, empresa_id=empresa_id, metrica="sdr_conversas", referencia=str(lead.id)
        )

    lead.sdr_proximo_followup = None  # one-shot
    await db.commit()


async def processar_followups_pendentes(db: AsyncSession, *, limite: int = 200) -> int:
    """Roda os follow-ups vencidos de todas as empresas (chamado pelo scheduler).

    Retorna quantos leads foram processados. Cada lead commita por si em
    ``processar_followup_sdr`` (tolerante a falhas)."""
    devidos = (
        await db.scalars(
            select(VendasLeads)
            .where(
                VendasLeads.sdr_proximo_followup.isnot(None),
                VendasLeads.sdr_proximo_followup <= _now(),
            )
            .limit(limite)
        )
    ).all()
    for lead in devidos:
        await processar_followup_sdr(
            db, empresa_id=lead.empresa_id, lead_id=lead.id
        )
    return len(devidos)
