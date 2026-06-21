"""Testes do canal Evolution: serviço (ciclo de vida, envio) + webhook + cross-tenant.

A rede é SEMPRE mockada: substituímos as funções de
app.integrations.evolution_api por fakes async. Nenhum teste fala com a Evolution.
"""
import uuid

import pytest
from sqlalchemy import select

from app.core.esocial_crypto import encrypt_secret
from app.integrations import evolution_api
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasMensagens
from app.models.vendas_evolution import (
    VendasEvolutionInstancias,
    VendasEvolutionServidor,
)
from app.services import vendas_evolution as svc
from tests.helpers import login_as


async def _criar_servidor(db_session):
    srv = VendasEvolutionServidor(
        id=uuid.uuid4(),
        base_url="https://evo.test",
        api_key_enc=encrypt_secret("global-key"),
        webhook_base_url="https://toriq.test",
        limite_padrao_instancias=2,
        ativo=True,
    )
    db_session.add(srv)
    await db_session.commit()
    return srv


def _mock_rede(monkeypatch):
    chamadas = {"criadas": [], "webhooks": [], "textos": []}

    async def fake_criar(**kw):
        chamadas["criadas"].append(kw)
        return {"instance": {"instanceName": kw["instance_name"]}}

    async def fake_webhook(**kw):
        chamadas["webhooks"].append(kw)
        return {"webhook": "ok"}

    async def fake_qr(**kw):
        return {"base64": "data:image/png;base64,AAA", "code": "PAIR-123"}

    async def fake_estado(**kw):
        return "open"

    async def fake_texto(**kw):
        chamadas["textos"].append(kw)
        return "EVO-MSG-1"

    async def fake_logout(**kw):
        return {}

    async def fake_deletar(**kw):
        return {}

    monkeypatch.setattr(evolution_api, "criar_instancia", fake_criar)
    monkeypatch.setattr(evolution_api, "definir_webhook", fake_webhook)
    monkeypatch.setattr(evolution_api, "conectar_qrcode", fake_qr)
    monkeypatch.setattr(evolution_api, "estado_conexao", fake_estado)
    monkeypatch.setattr(evolution_api, "enviar_texto", fake_texto)
    monkeypatch.setattr(evolution_api, "logout", fake_logout)
    monkeypatch.setattr(evolution_api, "deletar", fake_deletar)
    return chamadas


async def _criar_empresa(db_session, empresa_id):
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
    await db_session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# SERVIÇO — instâncias e envio (mock de rede)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_criar_instancia_persiste_e_configura_webhook(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)

    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="Vendas SP"
    )
    await db_session.commit()

    assert inst.status == "conectando"
    assert inst.instance_name.startswith(f"emp_{str(empresa_id)[:8]}_")
    assert inst.webhook_token
    assert len(chamadas["criadas"]) == 1
    assert chamadas["webhooks"][0]["webhook_url"].endswith(
        f"/vendas/evolution/webhook/{inst.webhook_token}"
    )


@pytest.mark.anyio
async def test_limite_de_instancias(db_session, monkeypatch):
    _mock_rede(monkeypatch)
    srv = await _criar_servidor(db_session)
    srv.limite_padrao_instancias = 1
    await db_session.commit()
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)

    await svc.criar_instancia(db_session, empresa_id=empresa_id, nome_exibicao="A")
    await db_session.commit()
    with pytest.raises(ValueError, match="limite"):
        await svc.criar_instancia(db_session, empresa_id=empresa_id, nome_exibicao="B")


@pytest.mark.anyio
async def test_enviar_texto_mockado(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    res = await svc.enviar_texto(
        db_session, empresa_id=empresa_id, instancia_id=inst.id,
        numero="+55 (11) 99999-0000", texto="oi",
    )
    assert res["enviado"] is True
    assert res["provider_id"] == "EVO-MSG-1"
    assert chamadas["textos"][0]["numero"] == "5511999990000"


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK — inbound + connection update
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_webhook_inbound_marca_respondeu_e_seta_ultimo_canal(
    db_session, monkeypatch
):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    lead = VendasLeads(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="Lead",
        telefone="+55 (11) 99999-0000",
    )
    db_session.add(lead)
    await db_session.commit()

    camp_id = uuid.uuid4()
    from app.models.vendas_disparo import VendasCampanhas

    db_session.add(
        VendasCampanhas(
            id=camp_id, empresa_id=empresa_id, nome="C", canal="whatsapp_evo"
        )
    )
    msg = VendasMensagens(
        id=uuid.uuid4(), empresa_id=empresa_id, campanha_id=camp_id,
        lead_id=lead.id, canal="whatsapp_evo", destinatario="5511999990000",
        status="enviado",
    )
    db_session.add(msg)
    await db_session.commit()

    payload = {
        "event": "messages.upsert",
        "instance": inst.instance_name,
        "data": {
            "key": {
                "remoteJid": "5511999990000@s.whatsapp.net",
                "fromMe": False, "id": "IN-1",
            },
            "pushName": "Lead",
            "message": {"conversation": "tenho interesse"},
        },
    }
    n = await svc.processar_webhook(db_session, instancia=inst, payload=payload)
    assert n == 1

    refreshed = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg.id)
    )
    await db_session.refresh(refreshed)
    assert refreshed.status == "respondeu"

    lead_ref = await db_session.scalar(
        select(VendasLeads).where(VendasLeads.id == lead.id)
    )
    await db_session.refresh(lead_ref)
    assert lead_ref.ultimo_canal == "whatsapp_evo"


@pytest.mark.anyio
async def test_webhook_connection_update_atualiza_status(db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    payload = {
        "event": "connection.update",
        "instance": inst.instance_name,
        "data": {"state": "open"},
    }
    await svc.processar_webhook(db_session, instancia=inst, payload=payload)
    ref = await db_session.scalar(
        select(VendasEvolutionInstancias).where(VendasEvolutionInstancias.id == inst.id)
    )
    await db_session.refresh(ref)
    assert ref.status == "conectada"


# ═══════════════════════════════════════════════════════════════════════════════
# API — auth, criação/listagem, cross-tenant, webhook 403
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_api_servidor_requer_super_admin(client, db_session):
    # cliente_torq NÃO pode configurar o servidor global.
    await login_as(client, db_session, role="cliente_torq", email="evo_cli@torq.com")
    r = await client.put("/vendas/evolution/servidor", json={"base_url": "x"})
    assert r.status_code == 403, r.text


@pytest.mark.anyio
async def test_api_criar_instancia_e_listar(client, db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    await login_as(client, db_session, role="cliente_torq", email="evo_ok@torq.com")
    r = await client.post(
        "/vendas/evolution/instancias", json={"nome_exibicao": "Minha"}
    )
    assert r.status_code == 200, r.text
    iid = r.json()["id"]

    r2 = await client.get("/vendas/evolution/instancias")
    assert r2.status_code == 200
    assert any(i["id"] == iid for i in r2.json())


@pytest.mark.anyio
async def test_api_cross_tenant_nao_ve_instancia_de_outro(
    client, db_session, monkeypatch
):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    # Empresa A cria instância.
    await login_as(client, db_session, role="cliente_torq", email="evo_a@torq.com")
    ra = await client.post(
        "/vendas/evolution/instancias", json={"nome_exibicao": "A"}
    )
    iid_a = ra.json()["id"]

    # Empresa B loga e não deve ver a instância de A.
    await login_as(client, db_session, role="cliente_torq", email="evo_b@torq.com")
    rb = await client.get("/vendas/evolution/instancias")
    assert all(i["id"] != iid_a for i in rb.json())


@pytest.mark.anyio
async def test_api_webhook_token_invalido_403(client, db_session):
    r = await client.post(
        "/vendas/evolution/webhook/token-que-nao-existe", json={"event": "x"}
    )
    assert r.status_code == 403, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# CAMPANHA — canal whatsapp_evo envia pela instância conectada
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_campanha_whatsapp_evo_envia_pela_instancia(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    inst.status = "conectada"
    await db_session.commit()

    lead = VendasLeads(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="L",
        telefone="+55 (11) 98888-7777",
    )
    db_session.add(lead)
    from app.models.vendas_disparo import VendasCampanhas, VendasTemplates

    tpl = VendasTemplates(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="T",
        canal="whatsapp_evo", conteudo="Olá!",
    )
    db_session.add(tpl)
    await db_session.commit()
    camp = VendasCampanhas(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="C",
        canal="whatsapp_evo", template_id=tpl.id, lead_ids=[str(lead.id)],
        status="rascunho",
    )
    db_session.add(camp)
    await db_session.commit()

    from app.services import vendas_disparo as disparo

    await disparo.preparar_campanha(
        db_session, campanha_id=camp.id, empresa_id=empresa_id
    )
    await disparo.enviar_campanha(
        db_session, campanha_id=camp.id, empresa_id=empresa_id
    )
    await db_session.commit()

    assert len(chamadas["textos"]) == 1
    assert chamadas["textos"][0]["texto"] == "Olá!"
    msg = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.campanha_id == camp.id)
    )
    await db_session.refresh(msg)
    assert msg.status == "enviado"
    assert msg.instancia_id == inst.id


# ═══════════════════════════════════════════════════════════════════════════════
# SDR — responde via Evolution quando o lead chegou pelo canal evo
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_sdr_envia_via_evolution_quando_ultimo_canal_evo(db_session, monkeypatch):
    chamadas = _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    inst.status = "conectada"
    await db_session.commit()

    from app.services.vendas_sdr import _enviar_whatsapp_sdr

    ok = await _enviar_whatsapp_sdr(
        db_session, empresa_id=empresa_id, to="5511999990000",
        texto="resposta sdr", canal="whatsapp_evo",
    )
    assert ok is True
    assert chamadas["textos"][-1]["texto"] == "resposta sdr"


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK — idempotência / dedup (evita reprocessar reenvios da Evolution)
# ═══════════════════════════════════════════════════════════════════════════════

def _payload_inbound(instance_name: str, wid: str = "DUP-1") -> dict:
    return {
        "event": "messages.upsert",
        "instance": instance_name,
        "data": {
            "key": {
                "remoteJid": "5511999990000@s.whatsapp.net",
                "fromMe": False, "id": wid,
            },
            "message": {"conversation": "oi"},
        },
    }


@pytest.mark.anyio
async def test_registrar_webhook_evento_deduplica(db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    payload = _payload_inbound(inst.instance_name, "WID-DUP")
    id1 = await svc.registrar_webhook_evento(db_session, instancia=inst, payload=payload)
    id2 = await svc.registrar_webhook_evento(db_session, instancia=inst, payload=payload)
    assert id1 is not None
    assert id2 is None  # mesma key.id → descartado


@pytest.mark.anyio
async def test_api_webhook_duplicado_responde_deduped(client, db_session, monkeypatch):
    _mock_rede(monkeypatch)
    await _criar_servidor(db_session)
    empresa_id = uuid.uuid4()
    await _criar_empresa(db_session, empresa_id)
    inst = await svc.criar_instancia(
        db_session, empresa_id=empresa_id, nome_exibicao="X"
    )
    await db_session.commit()

    payload = _payload_inbound(inst.instance_name, "WID-API")
    r1 = await client.post(
        f"/vendas/evolution/webhook/{inst.webhook_token}", json=payload
    )
    assert r1.status_code == 200, r1.text
    assert r1.json().get("deduped") is not True

    r2 = await client.post(
        f"/vendas/evolution/webhook/{inst.webhook_token}", json=payload
    )
    assert r2.status_code == 200, r2.text
    assert r2.json().get("deduped") is True
