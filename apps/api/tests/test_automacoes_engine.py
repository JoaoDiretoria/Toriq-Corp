"""Testes do Motor de Automações do Funil (app/services/automacoes_engine.py).

Auto-contidos: montam empresa/setor/funil/etapa/card via models reais no test DB
(PostgreSQL) e chamam diretamente as funções públicas do serviço com o ``db_session``.
Datas/horas determinísticas via parâmetros internos das funções (executar_em,
updated_at, etc.).
"""
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select

from app.models import generated as m
from app.services import automacoes_engine as eng

TZ = ZoneInfo("America/Sao_Paulo")


# ── Builders ──────────────────────────────────────────────────────────────────

async def _empresa(db, nome="E"):
    emp = m.Empresas(id=uuid.uuid4(), nome=nome, tipo="sst")
    db.add(emp)
    await db.flush()
    return emp


async def _setor(db, empresa_id, nome="Comercial"):
    s = m.Setores(id=uuid.uuid4(), empresa_id=empresa_id, nome=nome)
    db.add(s)
    await db.flush()
    return s


async def _funil(db, empresa_id, setor_id, nome="Vendas"):
    f = m.Funis(
        id=uuid.uuid4(), empresa_id=empresa_id, setor_id=setor_id,
        nome=nome, tipo="negocio",
    )
    db.add(f)
    await db.flush()
    return f


async def _etapa(db, funil_id, nome="Etapa", ordem=0):
    e = m.FunilEtapas(id=uuid.uuid4(), funil_id=funil_id, nome=nome, ordem=ordem)
    db.add(e)
    await db.flush()
    return e


async def _card(db, funil_id, etapa_id, titulo="Card", **kw):
    c = m.FunilCards(
        id=uuid.uuid4(), funil_id=funil_id, etapa_id=etapa_id, titulo=titulo, **kw
    )
    db.add(c)
    await db.flush()
    return c


async def _automacao(db, empresa_id, *, tipo, gatilho, funil_id=None,
                     etapa_id=None, acao_config=None, ativo=True, dias_parado=None):
    a = m.Automacoes(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="Auto",
        tipo=tipo, gatilho=gatilho, funil_id=funil_id, etapa_id=etapa_id,
        acao_config=acao_config or {}, ativo=ativo, dias_parado=dias_parado,
    )
    db.add(a)
    await db.flush()
    return a


async def _base(db, nome="E"):
    """empresa + setor + funil + etapa + card. Retorna namespace simples."""
    emp = await _empresa(db, nome)
    setor = await _setor(db, emp.id)
    funil = await _funil(db, emp.id, setor.id)
    etapa = await _etapa(db, funil.id, "Inicial", 0)
    card = await _card(db, funil.id, etapa.id, "Negócio X")
    return emp, setor, funil, etapa, card


# ═══════════════════════════════════════════════════════════════════════════════
# agendar_atividade
# ═══════════════════════════════════════════════════════════════════════════════

async def test_agendar_atividade_cria_atividade_prazo_certo(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    await _automacao(
        db, emp.id, tipo="agendar_atividade", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id,
        acao_config={"quando": "3_dias", "tipo_atividade": "ligacao",
                     "descricao": "Ligar para o cliente"},
    )

    n = await eng.executar_automacoes_evento(
        db, card.id, "negocio_chegar_etapa", empresa_id=emp.id
    )
    await db.commit()
    assert n == 1

    ativ = (await db.scalars(
        select(m.FunilCardAtividades).where(m.FunilCardAtividades.card_id == card.id)
    )).all()
    assert len(ativ) == 1
    a = ativ[0]
    assert a.tipo == "ligacao"
    assert a.descricao == "Ligar para o cliente"
    assert a.status == "a_realizar"
    assert a.prazo == (eng._hoje_tz() + timedelta(days=3))


async def test_chegar_etapa_so_dispara_na_etapa_certa(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    outra = await _etapa(db, funil.id, "Outra", 1)
    # automação configurada para OUTRA etapa
    await _automacao(
        db, emp.id, tipo="agendar_atividade", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=outra.id, acao_config={"quando": "mesmo_dia"},
    )
    n = await eng.executar_automacoes_evento(
        db, card.id, "negocio_chegar_etapa", empresa_id=emp.id
    )
    await db.commit()
    assert n == 0


# ═══════════════════════════════════════════════════════════════════════════════
# mover_card
# ═══════════════════════════════════════════════════════════════════════════════

async def test_mover_card_move_o_card(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    destino = await _etapa(db, funil.id, "Fechado", 1)
    await _automacao(
        db, emp.id, tipo="mover_card", gatilho="negocio_ganho", funil_id=funil.id,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id)},
    )
    n = await eng.executar_automacoes_evento(
        db, card.id, "negocio_ganho", empresa_id=emp.id
    )
    await db.commit()
    assert n == 1

    await db.refresh(card)
    assert card.etapa_id == destino.id
    assert card.funil_id == funil.id


# ═══════════════════════════════════════════════════════════════════════════════
# duplicar_card
# ═══════════════════════════════════════════════════════════════════════════════

async def test_duplicar_card_cria_novo_mantendo_original(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    # Histórico no card original (deve ser copiado).
    db.add(m.FunilCardAtividades(
        id=uuid.uuid4(), card_id=card.id, tipo="nota",
        descricao="histórico", status="realizada",
    ))
    funil2 = await _funil(db, emp.id, setor.id, "Pós-venda")
    etapa2 = await _etapa(db, funil2.id, "Recebido", 0)
    await db.flush()
    await _automacao(
        db, emp.id, tipo="duplicar_card", gatilho="negocio_ganho", funil_id=funil.id,
        acao_config={"funil_destino_id": str(funil2.id),
                     "etapa_destino_id": str(etapa2.id)},
    )
    n = await eng.executar_automacoes_evento(
        db, card.id, "negocio_ganho", empresa_id=emp.id
    )
    await db.commit()
    assert n == 1

    # original intacto
    assert (await db.scalar(
        select(m.FunilCards).where(m.FunilCards.id == card.id)
    )) is not None

    novos = (await db.scalars(
        select(m.FunilCards).where(
            m.FunilCards.funil_id == funil2.id, m.FunilCards.etapa_id == etapa2.id
        )
    )).all()
    assert len(novos) == 1
    novo = novos[0]
    assert novo.titulo == card.titulo
    # histórico copiado
    ativ_novas = (await db.scalars(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.card_id == novo.id
        )
    )).all()
    assert any(a.descricao == "histórico" for a in ativ_novas)


async def test_duplicar_para_contas_a_receber(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    card.valor = 1500
    card.descricao = "Serviço PCMSO"
    await db.flush()

    fin = await _setor(db, emp.id, "Financeiro")
    cr_funil = await _funil(db, emp.id, fin.id, "Contas a Receber")
    cr_etapa = await _etapa(db, cr_funil.id, "A Receber", 0)
    coluna = m.ContasReceberColunas(
        id=uuid.uuid4(), empresa_id=emp.id, nome="A Receber", ordem=0
    )
    db.add(coluna)
    await db.flush()

    await _automacao(
        db, emp.id, tipo="duplicar_card", gatilho="negocio_ganho", funil_id=funil.id,
        acao_config={"funil_destino_id": str(cr_funil.id),
                     "etapa_destino_id": str(cr_etapa.id)},
    )
    await eng.executar_automacoes_evento(
        db, card.id, "negocio_ganho", empresa_id=emp.id
    )
    await db.commit()

    # NÃO cria card no funil de contas a receber
    cards_cr = (await db.scalars(
        select(m.FunilCards).where(m.FunilCards.funil_id == cr_funil.id)
    )).all()
    assert cards_cr == []

    cr = (await db.scalars(
        select(m.ContasReceber).where(m.ContasReceber.empresa_id == emp.id)
    )).all()
    assert len(cr) == 1
    rec = cr[0]
    assert rec.origem == "closer"
    assert rec.numero.startswith("CR-")
    assert rec.origem_card_id == card.id
    assert rec.closer_card_id == card.id
    assert rec.coluna_id == coluna.id
    assert float(rec.valor) == 1500.0
    assert rec.servico_produto == "Serviço PCMSO"
    # origem_kanban = nome do funil de ORIGEM (Closer), conforme spec.
    assert rec.origem_kanban == funil.nome  # "Vendas"


# ═══════════════════════════════════════════════════════════════════════════════
# *_agendado — enfileiramento + anti-dup
# ═══════════════════════════════════════════════════════════════════════════════

async def test_mover_card_agendado_enfileira_e_antidup(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    destino = await _etapa(db, funil.id, "Fechado", 1)
    await _automacao(
        db, emp.id, tipo="mover_card_agendado", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id),
                     "agendamento_dias": 2, "agendamento_hora": "09:30"},
    )

    n = await eng.executar_automacoes_evento(
        db, card.id, "negocio_chegar_etapa", empresa_id=emp.id
    )
    await db.commit()
    assert n == 1

    execs = (await db.scalars(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.card_id == card.id
        )
    )).all()
    assert len(execs) == 1
    ex = execs[0]
    assert ex.executado is False
    # executar_em = hoje+2 às 09:30 TZ São Paulo
    esperado_data = (datetime.now(TZ) + timedelta(days=2)).date()
    assert ex.executar_em.astimezone(TZ).date() == esperado_data
    assert ex.executar_em.astimezone(TZ).hour == 9
    assert ex.executar_em.astimezone(TZ).minute == 30

    # disparar de novo → anti-dup: NÃO cria segunda execução pendente
    await eng.executar_automacoes_evento(
        db, card.id, "negocio_chegar_etapa", empresa_id=emp.id
    )
    await db.commit()
    execs2 = (await db.scalars(
        select(m.AutomacoesExecucoes).where(
            m.AutomacoesExecucoes.card_id == card.id
        )
    )).all()
    assert len(execs2) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# cancelar_agendamentos_pendentes
# ═══════════════════════════════════════════════════════════════════════════════

async def test_cancelar_agendamentos_remove_pendentes(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    destino = await _etapa(db, funil.id, "Fechado", 1)
    auto = await _automacao(
        db, emp.id, tipo="mover_card_agendado", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id), "agendamento_dias": 1},
    )
    await eng.executar_automacoes_evento(
        db, card.id, "negocio_chegar_etapa", empresa_id=emp.id
    )
    await db.commit()
    assert (await db.scalar(select(m.AutomacoesExecucoes).where(
        m.AutomacoesExecucoes.card_id == card.id))) is not None

    removidas = await eng.cancelar_agendamentos_pendentes(db, card.id, etapa.id)
    await db.commit()
    assert removidas == 1
    assert (await db.scalar(select(m.AutomacoesExecucoes).where(
        m.AutomacoesExecucoes.card_id == card.id))) is None


# ═══════════════════════════════════════════════════════════════════════════════
# processar_agendadas
# ═══════════════════════════════════════════════════════════════════════════════

async def test_processar_agendadas_executa_vencida(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    destino = await _etapa(db, funil.id, "Fechado", 1)
    auto = await _automacao(
        db, emp.id, tipo="mover_card_agendado", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id)},
    )
    # execução vencida (executar_em no passado)
    ex = m.AutomacoesExecucoes(
        id=uuid.uuid4(), automacao_id=auto.id, card_id=card.id, empresa_id=emp.id,
        executar_em=datetime.now(TZ) - timedelta(hours=1), executado=False,
    )
    db.add(ex)
    await db.commit()

    processadas = await eng.processar_agendadas(db)
    await db.commit()
    assert processadas == 1

    await db.refresh(ex)
    assert ex.executado is True
    assert ex.executado_em is not None
    assert ex.erro is None
    await db.refresh(card)
    assert card.etapa_id == destino.id


async def test_processar_agendadas_pula_card_que_saiu_da_etapa(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    outra = await _etapa(db, funil.id, "Outra", 1)
    destino = await _etapa(db, funil.id, "Fechado", 2)
    auto = await _automacao(
        db, emp.id, tipo="mover_card_agendado", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id)},
    )
    # card já saiu da etapa de gatilho (está em 'outra')
    card.etapa_id = outra.id
    ex = m.AutomacoesExecucoes(
        id=uuid.uuid4(), automacao_id=auto.id, card_id=card.id, empresa_id=emp.id,
        executar_em=datetime.now(TZ) - timedelta(hours=1), executado=False,
    )
    db.add(ex)
    await db.commit()

    processadas = await eng.processar_agendadas(db)
    await db.commit()
    assert processadas == 0

    await db.refresh(ex)
    assert ex.erro == "Card não está mais na etapa de gatilho"
    await db.refresh(card)
    # não moveu para destino
    assert card.etapa_id == outra.id


async def test_processar_agendadas_automacao_inativa(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    destino = await _etapa(db, funil.id, "Fechado", 1)
    auto = await _automacao(
        db, emp.id, tipo="mover_card_agendado", gatilho="negocio_chegar_etapa",
        funil_id=funil.id, etapa_id=etapa.id, ativo=False,
        acao_config={"funil_destino_id": str(funil.id),
                     "etapa_destino_id": str(destino.id)},
    )
    ex = m.AutomacoesExecucoes(
        id=uuid.uuid4(), automacao_id=auto.id, card_id=card.id, empresa_id=emp.id,
        executar_em=datetime.now(TZ) - timedelta(hours=1), executado=False,
    )
    db.add(ex)
    await db.commit()

    processadas = await eng.processar_agendadas(db)
    await db.commit()
    assert processadas == 0
    await db.refresh(ex)
    assert ex.executado is True
    assert ex.erro == "Automação desativada"


# ═══════════════════════════════════════════════════════════════════════════════
# processar_negocio_parado
# ═══════════════════════════════════════════════════════════════════════════════

async def test_negocio_parado_cria_atividade_e_dedup_1_dia(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    await _automacao(
        db, emp.id, tipo="agendar_atividade", gatilho="negocio_parado_etapa",
        funil_id=funil.id, etapa_id=etapa.id, dias_parado=5,
        acao_config={"tipo_atividade": "tarefa"},
    )
    # card parado há 10 dias
    card.updated_at = datetime.now(TZ) - timedelta(days=10)
    await db.commit()

    criadas = await eng.processar_negocio_parado(db)
    await db.commit()
    assert criadas == 1

    ativ = (await db.scalars(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.card_id == card.id
        )
    )).all()
    assert len(ativ) == 1
    assert ativ[0].descricao.startswith("Atividade automática:")

    # segunda rodada no mesmo dia → NÃO duplica (dedup janela 1 dia)
    criadas2 = await eng.processar_negocio_parado(db)
    await db.commit()
    assert criadas2 == 0
    ativ2 = (await db.scalars(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.card_id == card.id
        )
    )).all()
    assert len(ativ2) == 1


async def test_negocio_parado_nao_cria_para_card_recente(db_session):
    db = db_session
    emp, setor, funil, etapa, card = await _base(db)
    await _automacao(
        db, emp.id, tipo="agendar_atividade", gatilho="negocio_parado_etapa",
        funil_id=funil.id, etapa_id=etapa.id, dias_parado=5,
    )
    # card atualizado agora → não está parado
    card.updated_at = datetime.now(TZ)
    await db.commit()
    criadas = await eng.processar_negocio_parado(db)
    await db.commit()
    assert criadas == 0


# ═══════════════════════════════════════════════════════════════════════════════
# Isolamento por tenant
# ═══════════════════════════════════════════════════════════════════════════════

async def test_isolamento_tenant(db_session):
    db = db_session
    # Empresa A com automação + card
    empA, setorA, funilA, etapaA, cardA = await _base(db, "EA")
    await _automacao(
        db, empA.id, tipo="agendar_atividade", gatilho="negocio_chegar_etapa",
        funil_id=funilA.id, etapa_id=etapaA.id, acao_config={"quando": "mesmo_dia"},
    )
    await db.commit()

    # Empresa B tentando disparar evento no card de A → 0 (card não é da B)
    empB = await _empresa(db, "EB")
    await db.commit()
    n = await eng.executar_automacoes_evento(
        db, cardA.id, "negocio_chegar_etapa", empresa_id=empB.id
    )
    await db.commit()
    assert n == 0
    # nenhuma atividade criada
    ativ = (await db.scalars(
        select(m.FunilCardAtividades).where(
            m.FunilCardAtividades.card_id == cardA.id
        )
    )).all()
    assert ativ == []

    # Com o tenant correto, dispara normalmente
    n2 = await eng.executar_automacoes_evento(
        db, cardA.id, "negocio_chegar_etapa", empresa_id=empA.id
    )
    await db.commit()
    assert n2 == 1
