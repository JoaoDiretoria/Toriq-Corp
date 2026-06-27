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


# ─── Task 5: testes de endpoint (router) ───────────────────────────────────────

@pytest.mark.asyncio
async def test_webhook_get_handshake(client, db_session):
    eid = await _empresa_id(db_session)
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_verify_token="vtok", instagram_user_id="ig_self",
    )
    db_session.add(cfg)
    await db_session.commit()

    r = await client.get(
        "/vendas/instagram/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": "vtok", "hub.challenge": "12345"},
    )
    assert r.status_code == 200
    assert r.text == "12345"

    r2 = await client.get(
        "/vendas/instagram/webhook",
        params={"hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "x"},
    )
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_webhook_post_assinatura_invalida_403(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    eid = await _empresa_id(db_session)
    cfg = VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid, instagram_user_id="ig_self",
        instagram_app_secret_enc=encrypt_secret("segredo"),
    )
    db_session.add(cfg)
    await db_session.commit()

    payload = {"entry": [{"id": "ig_self", "changes": [{"field": "comments", "value": {"id": "c1"}}]}]}
    r = await client.post(
        "/vendas/instagram/webhook", json=payload,
        headers={"X-Hub-Signature-256": "sha256=errado"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_webhook_post_sem_config_403(client, db_session):
    # entry.id que não casa com nenhuma empresa → 403 (branch config is None)
    payload = {"entry": [{"id": "ig_inexistente_xyz", "changes": [{"field": "comments", "value": {"id": "c1"}}]}]}
    r = await client.post(
        "/vendas/instagram/webhook", json=payload,
        headers={"X-Hub-Signature-256": "sha256=qualquer"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_gatilhos_crud(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_gat@test.com", empresa_id=eid)

    r = await client.post("/vendas/instagram/gatilhos", json={
        "palavra_chave": "preco", "responder_publico": True, "responder_dm": True,
        "instrucao_ia": "mande a tabela",
    })
    assert r.status_code == 201
    gid = r.json()["id"]

    r = await client.get("/vendas/instagram/gatilhos")
    assert r.status_code == 200
    assert any(g["id"] == gid for g in r.json())

    r = await client.put(f"/vendas/instagram/gatilhos/{gid}", json={"ativo": False})
    assert r.status_code == 200
    assert r.json()["ativo"] is False

    r = await client.delete(f"/vendas/instagram/gatilhos/{gid}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_config_mascara_segredo(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_cfg@test.com", empresa_id=eid)

    r = await client.put("/vendas/instagram/config", json={
        "instagram_user_id": "ig_1", "instagram_token": "TOKENSECRETO123",
        "instagram_app_secret": "APPSECRET",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["instagram_user_id"] == "ig_1"
    assert body["instagram_token_set"] is True
    assert "TOKENSECRETO123" not in str(body)
    assert body["instagram_token_masked"].endswith("123")
    assert body["instagram_app_secret_set"] is True


@pytest.mark.asyncio
async def test_stats_conta_por_empresa(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_stats@test.com", empresa_id=eid)
    db_session.add_all([
        VendasInstagramComentarios(id=uuid.uuid4(), empresa_id=eid, comment_id="cs1", respondido_publico=True),
        VendasInstagramComentarios(id=uuid.uuid4(), empresa_id=eid, comment_id="cs2", erro="boom"),
    ])
    db_session.add(VendasLeads(id=uuid.uuid4(), empresa_id=eid, instagram_user_id="us1"))
    await db_session.commit()

    r = await client.get("/vendas/instagram/stats")
    assert r.status_code == 200
    b = r.json()
    assert b["comentarios"] == 2
    assert b["respondidos"] == 1
    assert b["erros"] == 1
    assert b["leads"] == 1


@pytest.mark.asyncio
async def test_posts_sem_config_400(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_posts1@test.com", empresa_id=eid)
    r = await client.get("/vendas/instagram/posts")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_posts_lista_com_config(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod

    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_posts2@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    async def _fake_list_media(*, token, ig_user_id):
        return [{
            "id": "p1", "caption": "oi", "comments_count": 3,
            "media_url": "http://x/p.jpg", "permalink": "http://insta/p1",
            "media_type": "IMAGE", "timestamp": "2026-01-01",
        }]
    monkeypatch.setattr(router_mod.instagram_meta, "list_media", _fake_list_media)

    r = await client.get("/vendas/instagram/posts")
    assert r.status_code == 200
    body = r.json()
    assert body[0]["id"] == "p1"
    assert body[0]["comments_count"] == 3


# ─── Task 2: endpoints comentários do post + responder manual ──────────────────

@pytest.mark.asyncio
async def test_listar_comentarios_post(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc1@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="ig1", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    async def _fake(*, token, media_id):
        return [{"id": "c1", "text": "oi", "username": "f", "timestamp": "t"}]
    monkeypatch.setattr(router_mod.instagram_meta, "list_comentarios", _fake)

    r = await client.get("/vendas/instagram/posts/m1/comentarios")
    assert r.status_code == 200
    assert r.json()[0]["id"] == "c1"


@pytest.mark.asyncio
async def test_responder_comentario_publico_e_dm(client, db_session, monkeypatch):
    from app.core.esocial_crypto import encrypt_secret
    from app.api import vendas_instagram as router_mod
    from app.models.vendas_instagram import VendasInstagramComentarios
    from sqlalchemy import select

    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc2@test.com", empresa_id=eid)
    db_session.add(VendasDisparoConfig(
        id=uuid.uuid4(), empresa_id=eid,
        instagram_user_id="igself", instagram_token_enc=encrypt_secret("tok"),
    ))
    await db_session.commit()

    enviados = {"pub": [], "dm": []}
    async def _pub(*, token, comment_id, message): enviados["pub"].append((comment_id, message)); return "r"
    async def _dm(*, token, ig_user_id, comment_id, message): enviados["dm"].append((comment_id, message)); return "m"
    monkeypatch.setattr(router_mod.instagram_meta, "reply_public", _pub)
    monkeypatch.setattr(router_mod.instagram_meta, "send_private_reply", _dm)

    r = await client.post("/vendas/instagram/comentarios/cX/responder",
                          json={"texto": "valeu!", "publico": True, "dm": True})
    assert r.status_code == 200
    assert enviados["pub"] == [("cX", "valeu!")]
    assert enviados["dm"] == [("cX", "valeu!")]
    reg = await db_session.scalar(select(VendasInstagramComentarios).where(
        VendasInstagramComentarios.empresa_id == eid,
        VendasInstagramComentarios.comment_id == "cX",
    ))
    assert reg is not None and reg.respondido_publico is True and reg.respondido_dm is True


@pytest.mark.asyncio
async def test_responder_sem_config_400(client, db_session):
    eid = await _empresa_id(db_session)
    await login_as(client, db_session, role="cliente_torq", email="ig_pc3@test.com", empresa_id=eid)
    r = await client.post("/vendas/instagram/comentarios/cY/responder",
                          json={"texto": "x", "publico": True, "dm": False})
    assert r.status_code == 400
