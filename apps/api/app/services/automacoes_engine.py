"""Motor de Automações do Funil.

Porta a semântica documentada em ``docs/superpowers/automacoes-funil-semantica.md``
(extraída do front: ``Automacoes.tsx`` cria; ``FunilKanban.tsx`` dispara/executa +
jobs SQL). Este módulo é a fonte da verdade do motor em Python.

Resumo:
- ``executar_automacoes_evento`` — disparado pelos endpoints de funil quando um card
  entra numa etapa / é ganho / perdido / tem atividade finalizada. Busca as automações
  ATIVAS do funil do card com aquele gatilho e executa cada ação (imediata ou enfileira
  ``*_agendado``). Aplica o loop guard.
- ``cancelar_agendamentos_pendentes`` — chamado quando o card sai de uma etapa: deleta
  execuções pendentes das automações ``*_agendado`` da etapa de origem.
- ``processar_agendadas`` — JOB (~1min): processa ``automacoes_execucoes`` vencidas.
- ``processar_negocio_parado`` — JOB diário: cria atividade p/ cards parados na etapa.

Convenções obrigatórias do spec:
- ``executar_em`` sempre com TZ explícito America/Sao_Paulo.
- NÃO usa as colunas legado ``automacoes.agendamento_data_hora/ultima_execucao/executado``.
- NÃO cria ``notificacoes``.
- Valida FKs/tenant (empresa_id) em toda escrita.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m

# Timezone explícito para o cálculo de ``executar_em`` (spec: ambiguidade do front).
TZ = ZoneInfo("America/Sao_Paulo")

# Mapa ``quando`` → dias (agendar_atividade).
_QUANDO_DIAS = {
    "mesmo_dia": 0,
    "1_dia": 1,
    "2_dias": 2,
    "3_dias": 3,
    "1_semana": 7,
}

# Ações que, quando executadas, mudam/criam um card destino → loop guard.
_ACOES_AGENDADAS = {"duplicar_card_agendado", "mover_card_agendado"}

# Prefixo da descrição das atividades criadas pelo job de negócio parado (dedup).
_PREFIXO_NEGOCIO_PARADO = "Atividade automática:"


def _agora_tz() -> datetime:
    return datetime.now(TZ)


def _hoje_tz() -> date:
    return _agora_tz().date()


# ═══════════════════════════════════════════════════════════════════════════════
# Ações
# ═══════════════════════════════════════════════════════════════════════════════


async def _acao_agendar_atividade(
    db: AsyncSession,
    automacao: m.Automacoes,
    card: m.FunilCards,
    *,
    hoje: date,
) -> None:
    """Insere uma atividade em ``funil_card_atividades`` (status 'a_realizar')."""
    cfg = automacao.acao_config or {}
    quando = cfg.get("quando", "mesmo_dia")
    if quando == "personalizado":
        dias = cfg.get("dias_personalizado") or 1
    else:
        dias = _QUANDO_DIAS.get(quando, 0)
    try:
        dias = int(dias)
    except (TypeError, ValueError):
        dias = 0

    prazo = hoje + timedelta(days=dias)
    tipo = cfg.get("tipo_atividade") or "tarefa"
    descricao = cfg.get("descricao") or "Atividade automática"
    # responsavel_id = card.responsavel_id || responsavel configurado.
    responsavel_id = card.responsavel_id or cfg.get("responsavel")

    db.add(
        m.FunilCardAtividades(
            id=uuid.uuid4(),
            card_id=card.id,
            tipo=tipo,
            descricao=descricao,
            status="a_realizar",
            prazo=prazo,
            responsavel_id=responsavel_id,
        )
    )


async def _copiar_historico(
    db: AsyncSession, origem_id: uuid.UUID, destino_id: uuid.UUID
) -> None:
    """Copia atividades, movimentações e etiquetas do card origem → destino."""
    atividades = (
        await db.scalars(
            select(m.FunilCardAtividades).where(
                m.FunilCardAtividades.card_id == origem_id
            )
        )
    ).all()
    for a in atividades:
        db.add(
            m.FunilCardAtividades(
                id=uuid.uuid4(),
                card_id=destino_id,
                tipo=a.tipo,
                descricao=a.descricao,
                status=a.status,
                prazo=a.prazo,
                horario=a.horario,
                usuario_id=a.usuario_id,
                responsavel_id=a.responsavel_id,
            )
        )

    movs = (
        await db.scalars(
            select(m.FunilCardMovimentacoes).where(
                m.FunilCardMovimentacoes.card_id == origem_id
            )
        )
    ).all()
    for mv in movs:
        db.add(
            m.FunilCardMovimentacoes(
                id=uuid.uuid4(),
                card_id=destino_id,
                tipo=mv.tipo,
                descricao=mv.descricao,
                etapa_origem_id=mv.etapa_origem_id,
                etapa_destino_id=mv.etapa_destino_id,
                usuario_id=mv.usuario_id,
            )
        )

    etiquetas = (
        await db.scalars(
            select(m.FunilCardEtiquetas).where(
                m.FunilCardEtiquetas.card_id == origem_id
            )
        )
    ).all()
    for et in etiquetas:
        db.add(
            m.FunilCardEtiquetas(
                id=uuid.uuid4(),
                card_id=destino_id,
                etiqueta_id=et.etiqueta_id,
            )
        )


async def _validar_funil_etapa(
    db: AsyncSession,
    funil_id: uuid.UUID | None,
    etapa_id: uuid.UUID | None,
    empresa_id: uuid.UUID,
) -> tuple[m.Funis | None, m.FunilEtapas | None]:
    """Valida que funil pertence ao tenant e etapa pertence ao funil."""
    funil = None
    if funil_id is not None:
        funil = await db.scalar(
            select(m.Funis).where(
                m.Funis.id == funil_id, m.Funis.empresa_id == empresa_id
            )
        )
        if funil is None:
            return None, None
    etapa = None
    if etapa_id is not None and funil is not None:
        etapa = await db.scalar(
            select(m.FunilEtapas).where(
                m.FunilEtapas.id == etapa_id,
                m.FunilEtapas.funil_id == funil.id,
            )
        )
    return funil, etapa


async def _proxima_ordem_etapa(db: AsyncSession, etapa_id: uuid.UUID) -> int:
    return await db.scalar(
        select(func.count()).select_from(m.FunilCards).where(
            m.FunilCards.etapa_id == etapa_id
        )
    ) or 0


async def _eh_contas_a_receber(db: AsyncSession, funil: m.Funis) -> bool:
    """Detecta o caminho Closer → Contas a Receber (frágil, por substring — spec)."""
    if "contas a receber" not in (funil.nome or "").lower():
        return False
    setor = await db.scalar(
        select(m.Setores).where(m.Setores.id == funil.setor_id)
    )
    if setor is None:
        return False
    return "financeiro" in (setor.nome or "").lower()


def _numero_contas_receber() -> str:
    """numero = 'CR-' + base36(epoch_now)."""
    epoch = int(datetime.now(TZ).timestamp())
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if epoch == 0:
        return "CR-0"
    s = ""
    n = epoch
    while n:
        n, r = divmod(n, 36)
        s = digits[r] + s
    return f"CR-{s}"


async def _acao_duplicar_para_contas_receber(
    db: AsyncSession,
    card: m.FunilCards,
    funil_origem: m.Funis,
    etapa_destino_id: uuid.UUID | None,
    empresa_id: uuid.UUID,
) -> None:
    """Cria registro em ``contas_receber`` (NÃO cria card)."""
    # Mapeia etapa_destino_id → nome → contas_receber_colunas (ilike).
    coluna_id: uuid.UUID | None = None
    if etapa_destino_id is not None:
        etapa = await db.scalar(
            select(m.FunilEtapas).where(m.FunilEtapas.id == etapa_destino_id)
        )
        if etapa is not None:
            coluna = await db.scalar(
                select(m.ContasReceberColunas).where(
                    m.ContasReceberColunas.empresa_id == empresa_id,
                    m.ContasReceberColunas.nome.ilike(etapa.nome),
                )
            )
            if coluna is not None:
                coluna_id = coluna.id
    if coluna_id is None:
        # Fallback: o próprio etapa_destino_id (spec).
        coluna_id = etapa_destino_id
    if coluna_id is None:
        # Sem coluna possível → não cria.
        return

    cliente_nome = card.titulo or "Cliente"
    cliente_cnpj = None
    if card.cliente_id is not None:
        cliente = await db.scalar(
            select(m.ClientesSst).where(m.ClientesSst.id == card.cliente_id)
        )
        if cliente is not None:
            cliente_nome = cliente.nome or cliente_nome
            cliente_cnpj = cliente.cnpj

    db.add(
        m.ContasReceber(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            coluna_id=coluna_id,
            numero=_numero_contas_receber(),
            cliente_id=card.cliente_id,
            cliente_nome=cliente_nome,
            cliente_cnpj=cliente_cnpj,
            servico_produto=card.descricao or card.titulo,
            valor=card.valor or 0,
            valor_pago=0,
            data_emissao=_hoje_tz(),
            origem="closer",
            origem_card_id=card.id,
            closer_card_id=card.id,
            origem_kanban=funil_origem.nome,
            ordem=0,
            arquivado=False,
        )
    )


async def _acao_duplicar_card(
    db: AsyncSession,
    card: m.FunilCards,
    funil_origem: m.Funis,
    cfg: dict,
    empresa_id: uuid.UUID,
) -> m.FunilCards | None:
    """Duplica o card no funil/etapa destino, copiando histórico. Mantém o original.

    Retorna o novo card (ou None se foi o caminho Contas a Receber / inválido).
    """
    funil_destino_id = cfg.get("funil_destino_id")
    etapa_destino_id = cfg.get("etapa_destino_id")
    funil_destino_id = uuid.UUID(str(funil_destino_id)) if funil_destino_id else None
    etapa_destino_id = uuid.UUID(str(etapa_destino_id)) if etapa_destino_id else None

    funil_destino, etapa_destino = await _validar_funil_etapa(
        db, funil_destino_id, etapa_destino_id, empresa_id
    )
    if funil_destino is None:
        return None

    # Caso especial Contas a Receber.
    if await _eh_contas_a_receber(db, funil_destino):
        await _acao_duplicar_para_contas_receber(
            db, card, funil_origem, etapa_destino_id, empresa_id
        )
        return None

    # Etapa destino: a configurada (validada no funil) ou a primeira por ordem.
    if etapa_destino is None:
        etapa_destino = await db.scalar(
            select(m.FunilEtapas)
            .where(m.FunilEtapas.funil_id == funil_destino.id)
            .order_by(m.FunilEtapas.ordem)
            .limit(1)
        )
        if etapa_destino is None:
            return None

    ordem = await _proxima_ordem_etapa(db, etapa_destino.id)
    novo = m.FunilCards(
        id=uuid.uuid4(),
        funil_id=funil_destino.id,
        etapa_id=etapa_destino.id,
        titulo=card.titulo,
        descricao=card.descricao,
        valor=card.valor,
        cliente_id=card.cliente_id,
        responsavel_id=card.responsavel_id,
        prioridade=card.prioridade,
        ordem=ordem,
    )
    db.add(novo)
    await db.flush()
    await _copiar_historico(db, card.id, novo.id)
    return novo


async def _acao_mover_card(
    db: AsyncSession,
    card: m.FunilCards,
    cfg: dict,
    empresa_id: uuid.UUID,
) -> bool:
    """Move o card (UPDATE) para o funil/etapa destino. Retorna True se moveu."""
    funil_destino_id = cfg.get("funil_destino_id")
    etapa_destino_id = cfg.get("etapa_destino_id")
    funil_destino_id = uuid.UUID(str(funil_destino_id)) if funil_destino_id else None
    etapa_destino_id = uuid.UUID(str(etapa_destino_id)) if etapa_destino_id else None

    funil_destino, etapa_destino = await _validar_funil_etapa(
        db, funil_destino_id, etapa_destino_id, empresa_id
    )
    if funil_destino is None:
        return False
    if etapa_destino is None:
        etapa_destino = await db.scalar(
            select(m.FunilEtapas)
            .where(m.FunilEtapas.funil_id == funil_destino.id)
            .order_by(m.FunilEtapas.ordem)
            .limit(1)
        )
        if etapa_destino is None:
            return False

    ordem = await _proxima_ordem_etapa(db, etapa_destino.id)
    card.funil_id = funil_destino.id
    card.etapa_id = etapa_destino.id
    card.ordem = ordem
    return True


async def _acao_criar_negocio(
    db: AsyncSession,
    card: m.FunilCards,
    cfg: dict,
    empresa_id: uuid.UUID,
) -> m.FunilCards | None:
    """Cria card em outro funil (etapa destino, ou primeira por ordem). Legado."""
    funil_destino_id = cfg.get("funil_destino_id")
    etapa_destino_id = cfg.get("etapa_destino_id")
    funil_destino_id = uuid.UUID(str(funil_destino_id)) if funil_destino_id else None
    etapa_destino_id = uuid.UUID(str(etapa_destino_id)) if etapa_destino_id else None

    funil_destino, etapa_destino = await _validar_funil_etapa(
        db, funil_destino_id, etapa_destino_id, empresa_id
    )
    if funil_destino is None:
        return None
    if etapa_destino is None:
        etapa_destino = await db.scalar(
            select(m.FunilEtapas)
            .where(m.FunilEtapas.funil_id == funil_destino.id)
            .order_by(m.FunilEtapas.ordem)
            .limit(1)
        )
        if etapa_destino is None:
            return None

    ordem = await _proxima_ordem_etapa(db, etapa_destino.id)
    novo = m.FunilCards(
        id=uuid.uuid4(),
        funil_id=funil_destino.id,
        etapa_id=etapa_destino.id,
        titulo=card.titulo,
        descricao=card.descricao,
        valor=card.valor,
        cliente_id=card.cliente_id,
        responsavel_id=card.responsavel_id,
        prioridade=card.prioridade,
        ordem=ordem,
    )
    db.add(novo)
    await db.flush()
    return novo


def _executar_em(cfg: dict, *, agora: datetime) -> datetime:
    """executar_em = (hoje + agendamento_dias) T agendamento_hora, TZ São Paulo."""
    dias = cfg.get("agendamento_dias") or 0
    try:
        dias = int(dias)
    except (TypeError, ValueError):
        dias = 0
    alvo = (agora + timedelta(days=dias)).date()

    hora_str = cfg.get("agendamento_hora")
    hh, mm = 0, 0
    if hora_str:
        partes = str(hora_str).split(":")
        try:
            hh = int(partes[0])
            mm = int(partes[1]) if len(partes) > 1 else 0
        except (ValueError, IndexError):
            hh, mm = 0, 0
    return datetime.combine(alvo, time(hour=hh, minute=mm), tzinfo=TZ)


async def _enfileirar_agendado(
    db: AsyncSession,
    automacao: m.Automacoes,
    card: m.FunilCards,
    empresa_id: uuid.UUID,
    *,
    agora: datetime,
) -> None:
    """Insere/atualiza ``automacoes_execucoes`` para uma automação ``*_agendado``.

    Anti-dup (spec): busca (automacao_id, card_id):
    - existe e !executado → não cria.
    - existe e executado → deleta e recria.
    Constraint única + erro 23505 (IntegrityError) ignorado.
    """
    existente = await db.scalar(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.automacao_id == automacao.id,
            m.AutomacoesExecucoes.card_id == card.id,
        )
    )
    if existente is not None:
        if not existente.executado:
            return  # já pendente → não cria
        await db.delete(existente)
        await db.flush()

    executar_em = _executar_em(automacao.acao_config or {}, agora=agora)
    db.add(
        m.AutomacoesExecucoes(
            id=uuid.uuid4(),
            automacao_id=automacao.id,
            card_id=card.id,
            empresa_id=empresa_id,
            executar_em=executar_em,
            executado=False,
        )
    )
    # Anti-dup já tratado acima pela checagem explícita (automacao_id, card_id). O
    # índice único parcial WHERE executado=false é a salvaguarda final em concorrência;
    # um eventual 23505 (IntegrityError) deve ser ignorado pelo chamador (spec).
    await db.flush()


# ═══════════════════════════════════════════════════════════════════════════════
# Despacho de uma única ação (com loop guard)
# ═══════════════════════════════════════════════════════════════════════════════


async def _executar_acao(
    db: AsyncSession,
    automacao: m.Automacoes,
    card: m.FunilCards,
    funil_origem: m.Funis,
    empresa_id: uuid.UUID,
    *,
    hoje: date,
    agora: datetime,
    loop_guard: bool,
) -> None:
    """Executa a ação de UMA automação sobre o card.

    ``loop_guard``: quando True (rodando no card destino de uma duplicação/mover/criar),
    só ``agendar_atividade`` é permitido — anti-loop (spec).
    """
    tipo = automacao.tipo

    if tipo == "agendar_atividade":
        await _acao_agendar_atividade(db, automacao, card, hoje=hoje)
        return

    if loop_guard:
        # No card destino, ignora duplicar/mover/criar/agendado.
        return

    cfg = automacao.acao_config or {}

    if tipo == "duplicar_card":
        novo = await _acao_duplicar_card(db, card, funil_origem, cfg, empresa_id)
        if novo is not None:
            await _disparar_no_destino(db, novo, empresa_id, hoje=hoje, agora=agora)
    elif tipo == "mover_card":
        await _acao_mover_card(db, card, cfg, empresa_id)
    elif tipo == "criar_negocio":
        novo = await _acao_criar_negocio(db, card, cfg, empresa_id)
        if novo is not None:
            await _disparar_no_destino(db, novo, empresa_id, hoje=hoje, agora=agora)
    elif tipo in _ACOES_AGENDADAS:
        await _enfileirar_agendado(db, automacao, card, empresa_id, agora=agora)
    # enviar_mensagem_whatsapp / mover_etapa / enviar_email / criar_tarefa: no-op.


async def _disparar_no_destino(
    db: AsyncSession,
    card_destino: m.FunilCards,
    empresa_id: uuid.UUID,
    *,
    hoje: date,
    agora: datetime,
) -> None:
    """Loop guard: no card destino roda APENAS automações agendar_atividade do gatilho
    de chegada na etapa (negocio_chegar_etapa) que casam com a etapa do novo card."""
    funil_destino = await db.scalar(
        select(m.Funis).where(
            m.Funis.id == card_destino.funil_id, m.Funis.empresa_id == empresa_id
        )
    )
    if funil_destino is None:
        return
    automacoes = (
        await db.scalars(
            select(m.Automacoes).where(
                m.Automacoes.empresa_id == empresa_id,
                m.Automacoes.funil_id == funil_destino.id,
                m.Automacoes.ativo.is_(True),
                m.Automacoes.gatilho == "negocio_chegar_etapa",
                m.Automacoes.tipo == "agendar_atividade",
                m.Automacoes.etapa_id == card_destino.etapa_id,
            )
        )
    ).all()
    for automacao in automacoes:
        await _executar_acao(
            db, automacao, card_destino, funil_destino, empresa_id,
            hoje=hoje, agora=agora, loop_guard=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# API pública
# ═══════════════════════════════════════════════════════════════════════════════


async def executar_automacoes_evento(
    db: AsyncSession,
    card_id: uuid.UUID,
    gatilho: str,
    *,
    empresa_id: uuid.UUID,
) -> int:
    """Executa as automações ATIVAS do funil do card para ``gatilho``.

    Disparado pelos endpoints de funil. Para ``negocio_chegar_etapa`` casa também a
    ``etapa_id`` (card.etapa_id). Para ``atividade_finalizada`` pula automações com
    ``etapa_id`` configurada diferente da etapa do card. Demais gatilhos: por funil.

    Retorna o número de automações executadas. NÃO commita (cabe ao chamador).
    """
    card = await db.scalar(
        select(m.FunilCards)
        .join(m.Funis, m.FunilCards.funil_id == m.Funis.id)
        .where(m.FunilCards.id == card_id, m.Funis.empresa_id == empresa_id)
    )
    if card is None:
        return 0
    funil = await db.scalar(
        select(m.Funis).where(
            m.Funis.id == card.funil_id, m.Funis.empresa_id == empresa_id
        )
    )
    if funil is None:
        return 0

    q = select(m.Automacoes).where(
        m.Automacoes.empresa_id == empresa_id,
        m.Automacoes.funil_id == funil.id,
        m.Automacoes.ativo.is_(True),
        m.Automacoes.gatilho == gatilho,
    )
    if gatilho == "negocio_chegar_etapa":
        # Filtro exato de etapa.
        q = q.where(m.Automacoes.etapa_id == card.etapa_id)

    automacoes = (await db.scalars(q)).all()

    hoje = _hoje_tz()
    agora = _agora_tz()
    executadas = 0
    for automacao in automacoes:
        if gatilho == "atividade_finalizada":
            # Pula se etapa_id configurada e diferente da etapa do card.
            if automacao.etapa_id is not None and automacao.etapa_id != card.etapa_id:
                continue
        await _executar_acao(
            db, automacao, card, funil, empresa_id,
            hoje=hoje, agora=agora, loop_guard=False,
        )
        executadas += 1
    return executadas


async def cancelar_agendamentos_pendentes(
    db: AsyncSession,
    card_id: uuid.UUID,
    etapa_origem_id: uuid.UUID,
) -> int:
    """Deleta execuções pendentes (executado=false) das automações ``*_agendado``
    da etapa de origem — chamado quando o card sai da etapa.

    Retorna o número de execuções removidas. NÃO commita.
    """
    automacoes_ids = (
        await db.scalars(
            select(m.Automacoes.id).where(
                m.Automacoes.etapa_id == etapa_origem_id,
                m.Automacoes.tipo.in_(_ACOES_AGENDADAS),
            )
        )
    ).all()
    if not automacoes_ids:
        return 0
    result = await db.execute(
        sa_delete(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.card_id == card_id,
            m.AutomacoesExecucoes.executado.is_(False),
            m.AutomacoesExecucoes.automacao_id.in_(automacoes_ids),
        )
    )
    return result.rowcount or 0


async def processar_agendadas(db: AsyncSession) -> int:
    """JOB (~1min): processa ``automacoes_execucoes`` vencidas.

    Pega até 100 com ``executado=false AND executar_em<=now()`` ordenado por
    ``executar_em``. Por execução, aplica a lógica de erro/skip do spec.

    Retorna a contagem de execuções *processadas* (executadas com sucesso, isto é,
    que tiveram a ação aplicada e foram marcadas executado=true).
    """
    agora = _agora_tz()
    pendentes = (
        await db.scalars(
            select(m.AutomacoesExecucoes)
            .where(
                m.AutomacoesExecucoes.executado.is_(False),
                m.AutomacoesExecucoes.executar_em <= agora,
            )
            .order_by(m.AutomacoesExecucoes.executar_em)
            .limit(100)
        )
    ).all()

    hoje = agora.date()
    processadas = 0
    for execucao in pendentes:
        automacao = await db.scalar(
            select(m.Automacoes).where(m.Automacoes.id == execucao.automacao_id)
        )
        if automacao is None or not automacao.ativo:
            execucao.executado = True
            execucao.executado_em = agora
            execucao.erro = "Automação desativada"
            continue

        card = await db.scalar(
            select(m.FunilCards).where(m.FunilCards.id == execucao.card_id)
        )
        if card is None or card.ativo is False:
            execucao.erro = "Card inexistente ou inativo"
            execucao.executado = True
            execucao.executado_em = agora
            continue

        # card saiu da etapa de gatilho → erro, pula (NÃO marca executado? spec:
        # "marca executado=true" não é dito aqui; spec diz erro + pula. Para evitar
        # reprocessamento infinito de um card que saiu, marcamos executado=true).
        if automacao.etapa_id is not None and card.etapa_id != automacao.etapa_id:
            execucao.erro = "Card não está mais na etapa de gatilho"
            execucao.executado = True
            execucao.executado_em = agora
            continue

        funil = await db.scalar(
            select(m.Funis).where(m.Funis.id == card.funil_id)
        )
        if funil is None:
            execucao.erro = "Funil inexistente"
            execucao.executado = True
            execucao.executado_em = agora
            continue

        cfg = automacao.acao_config or {}
        try:
            if automacao.tipo == "duplicar_card_agendado":
                novo = await _acao_duplicar_card(
                    db, card, funil, cfg, execucao.empresa_id
                )
                if novo is not None:
                    await _disparar_no_destino(
                        db, novo, execucao.empresa_id, hoje=hoje, agora=agora
                    )
            elif automacao.tipo == "mover_card_agendado":
                await _acao_mover_card(db, card, cfg, execucao.empresa_id)
            else:
                # Tipo não-agendado numa fila de execução — no-op defensivo.
                pass
            execucao.executado = True
            execucao.executado_em = agora
            execucao.erro = None
            processadas += 1
        except Exception as exc:  # noqa: BLE001 — registra erro, NÃO marca executado.
            execucao.erro = str(exc)
            # NÃO marca executado → reprocessa no próximo ciclo (spec).

    return processadas


async def processar_negocio_parado(db: AsyncSession) -> int:
    """JOB diário: cria atividade para cards parados > ``dias_parado`` na etapa.

    Para cada automação ativa ``negocio_parado_etapa`` com ``dias_parado``, para cada
    card no funil/etapa com ``updated_at < now() - dias_parado`` E SEM atividade
    ``'Atividade automática:%'`` criada na última 1 dia → insere atividade.
    Dedup só pela janela de 1 dia.

    Retorna o número de atividades criadas. NÃO commita.
    """
    agora = _agora_tz()
    hoje = agora.date()
    automacoes = (
        await db.scalars(
            select(m.Automacoes).where(
                m.Automacoes.ativo.is_(True),
                m.Automacoes.gatilho == "negocio_parado_etapa",
                m.Automacoes.dias_parado.isnot(None),
            )
        )
    ).all()

    criadas = 0
    limite_dedup = agora - timedelta(days=1)
    for automacao in automacoes:
        if automacao.funil_id is None or automacao.etapa_id is None:
            continue
        limite_parado = agora - timedelta(days=int(automacao.dias_parado))
        cards = (
            await db.scalars(
                select(m.FunilCards).where(
                    m.FunilCards.funil_id == automacao.funil_id,
                    m.FunilCards.etapa_id == automacao.etapa_id,
                    m.FunilCards.updated_at < limite_parado,
                )
            )
        ).all()
        for card in cards:
            # Dedup: já existe atividade automática criada na última 1 dia?
            existe = await db.scalar(
                select(m.FunilCardAtividades.id).where(
                    m.FunilCardAtividades.card_id == card.id,
                    m.FunilCardAtividades.descricao.like(
                        f"{_PREFIXO_NEGOCIO_PARADO}%"
                    ),
                    m.FunilCardAtividades.created_at >= limite_dedup,
                ).limit(1)
            )
            if existe is not None:
                continue
            cfg = automacao.acao_config or {}
            descricao = cfg.get("descricao") or (
                f"{_PREFIXO_NEGOCIO_PARADO} negócio parado há mais de "
                f"{automacao.dias_parado} dias na etapa"
            )
            if not str(descricao).startswith(_PREFIXO_NEGOCIO_PARADO):
                descricao = f"{_PREFIXO_NEGOCIO_PARADO} {descricao}"
            db.add(
                m.FunilCardAtividades(
                    id=uuid.uuid4(),
                    card_id=card.id,
                    tipo=cfg.get("tipo_atividade") or "tarefa",
                    descricao=descricao,
                    status="a_realizar",
                    prazo=hoje,
                    responsavel_id=card.responsavel_id or cfg.get("responsavel"),
                )
            )
            criadas += 1

    return criadas
