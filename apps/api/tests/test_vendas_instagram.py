import datetime
import uuid

import pytest
from sqlalchemy import select

from app.models.generated import Empresas
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasDisparoConfig
from app.models.vendas_instagram import (
    VendasInstagramComentarios,
    VendasInstagramGatilhos,
)
from tests.helpers import login_as


@pytest.mark.asyncio
async def test_gatilho_model_insere(db_session):
    """A tabela existe (migration aplicada) e o model insere/consulta."""
    from sqlalchemy import select
    from app.models.generated import Empresas

    emp = await db_session.scalar(select(Empresas).limit(1))
    assert emp is not None, "precisa de ao menos 1 empresa no DB de teste"

    g = VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=emp.id, palavra_chave="preco",
        responder_publico=True, responder_dm=True,
    )
    db_session.add(g)
    await db_session.flush()
    achado = await db_session.scalar(
        select(VendasInstagramGatilhos).where(VendasInstagramGatilhos.id == g.id)
    )
    assert achado is not None
    assert achado.responder_dm is True


# ─── Task 4: testes do serviço de orquestração ─────────────────────────────────

async def _empresa_id(db_session):
    return (await db_session.scalar(select(Empresas).limit(1))).id


async def _config_ig(db_session, empresa_id, *, user_id="ig_self"):
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=empresa_id, instagram_user_id=user_id,
    )
    db_session.add(cfg)
    await db_session.flush()
    return cfg


def _comentario(**over):
    base = {
        "comment_id": "c1", "media_id": "m1", "parent_id": None,
        "from_id": "user_visitante", "from_username": "visitante",
        "texto": "qual o preco?", "timestamp": "1700000000",
    }
    base.update(over)
    return base


@pytest.mark.asyncio
async def test_anti_loop_ignora_comentario_proprio(db_session, monkeypatch):
    """Comentário cujo from_id == instagram_user_id é ignorado (não vira lead)."""
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid, user_id="ig_self")

    n = await svc.processar_comentarios_webhook(
        db_session, empresa_id=eid, comentarios=[_comentario(from_id="ig_self")]
    )
    assert n == 0
    leads = (await db_session.scalars(select(VendasLeads).where(VendasLeads.empresa_id == eid))).all()
    assert all(l.instagram_user_id != "ig_self" for l in leads)


@pytest.mark.asyncio
async def test_idempotencia_pula_comment_repetido(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    monkeypatch.setattr(svc, "_responder", _fake_responder())

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])
    # 2ª vez com o mesmo comment_id: não duplica.
    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    regs = (await db_session.scalars(
        select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid)
    )).all()
    assert len(regs) == 1


@pytest.mark.asyncio
async def test_cria_lead_e_registra_em_conversas(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    chamadas = _fake_responder()
    monkeypatch.setattr(svc, "_responder", chamadas)

    appended = {}
    async def _fake_append(db, **kw):
        appended.update(kw)
    monkeypatch.setattr(svc, "append_mensagem", _fake_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    lead = await db_session.scalar(
        select(VendasLeads).where(
            VendasLeads.empresa_id == eid,
            VendasLeads.instagram_user_id == "user_visitante",
        )
    )
    assert lead is not None
    assert lead.instagram_username == "visitante"
    assert lead.ultimo_canal == "instagram"
    assert appended["canal"] == "instagram"
    assert appended["sender_type"] == "lead"


@pytest.mark.asyncio
async def test_gatilho_dispara_resposta_publica_e_dm(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    cfg = await _config_ig(db_session, eid)
    db_session.add(VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=eid, palavra_chave="preco",
        responder_publico=True, responder_dm=True,
    ))
    await db_session.flush()

    enviados = {"publico": [], "dm": []}
    async def _fake_reply_public(*, token, comment_id, message):
        enviados["publico"].append((comment_id, message)); return "r1"
    async def _fake_private(*, token, ig_user_id, comment_id, message):
        enviados["dm"].append((comment_id, message)); return "m1"
    monkeypatch.setattr(svc.instagram_meta, "reply_public", _fake_reply_public)
    monkeypatch.setattr(svc.instagram_meta, "send_private_reply", _fake_private)

    async def _fake_gerar(db, *, empresa_id, lead_id, mensagem):
        return "Claro! Te explico 👇"
    monkeypatch.setattr(svc.vendas_sdr, "gerar_resposta", _fake_gerar)

    async def _noop_append(db, **kw): pass
    monkeypatch.setattr(svc, "append_mensagem", _noop_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario(texto="qual o PRECO?")])

    assert enviados["publico"] == [("c1", "Claro! Te explico 👇")]
    assert enviados["dm"] == [("c1", "Claro! Te explico 👇")]
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid))
    assert reg.respondido_publico is True
    assert reg.respondido_dm is True


@pytest.mark.asyncio
async def test_sem_gatilho_nao_responde_mas_registra(db_session, monkeypatch):
    from app.services import vendas_instagram as svc

    eid = await _empresa_id(db_session)
    await _config_ig(db_session, eid)
    # nenhum gatilho cadastrado
    enviou = {"n": 0}
    async def _fake_reply_public(**kw): enviou["n"] += 1; return "r"
    monkeypatch.setattr(svc.instagram_meta, "reply_public", _fake_reply_public)
    async def _noop_append(db, **kw): pass
    monkeypatch.setattr(svc, "append_mensagem", _noop_append)

    await svc.processar_comentarios_webhook(db_session, empresa_id=eid, comentarios=[_comentario()])

    assert enviou["n"] == 0
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(VendasInstagramComentarios.empresa_id == eid))
    assert reg is not None
    assert reg.respondido_publico is False


def _fake_responder():
    async def _fn(db, *, config, lead, gatilho, comentario, registro):
        return None
    return _fn
