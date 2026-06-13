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
