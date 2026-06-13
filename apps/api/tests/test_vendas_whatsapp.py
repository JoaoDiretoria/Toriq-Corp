"""Testes do módulo Toriq Vendas — FASE 3 (WhatsApp via API oficial Meta).

O envio real à Graph API é SEMPRE mockado: substituímos
``app.services.vendas_whatsapp.send_template`` / ``send_text`` por funções async
fake que retornam um wamid falso e registram chamadas. Nenhum teste fala com a
Graph API real.

Cobre:
- GET webhook (verificação): verify_token correto → challenge; errado → 403.
- POST webhook: status 'delivered' atualiza a mensagem por provider_id (wamid).
- POST webhook: assinatura HMAC inválida → 403.
- Inbound: lead que responde marca a última mensagem como 'respondeu'.
- Cross-tenant: status/inbound de uma empresa não toca mensagens de outra.
- enviar_mensagem_whatsapp: template aprovado → send_template; sem → send_text;
  WhatsAppError → status 'erro'.

NOTA (integrador): este módulo depende da migration FASE 3, que adiciona as
colunas whatsapp_* em vendas_disparo_config. Rode-a ANTES da suíte e registre o
router app/api/vendas_whatsapp.py em main.py. Sem isso os testes não passam.
"""
import hashlib
import hmac
import json
import uuid

import pytest
from sqlalchemy import select

from app.core.esocial_crypto import encrypt_secret
from app.models.vendas import VendasLeads
from app.models.vendas_disparo import VendasCampanhas, VendasDisparoConfig, VendasMensagens
from app.services import vendas_whatsapp as svc
from tests.helpers import login_as

APP_SECRET = "app_secret_supersecreto"
VERIFY_TOKEN = "verify_token_xyz"
PHONE_ID = "1112223334"
WABA_ID = "9998887776"


# ───────────────────────────────────────────────────────────────────────────────
# Mock do envio real (registra chamadas).
# ───────────────────────────────────────────────────────────────────────────────

class _Enviadas:
    def __init__(self):
        self.templates = []
        self.textos = []


def _patch_envio(monkeypatch):
    registro = _Enviadas()

    async def fake_send_template(**kwargs):
        registro.templates.append(kwargs)
        return "wamid-tpl-fake"

    async def fake_send_text(**kwargs):
        registro.textos.append(kwargs)
        return "wamid-txt-fake"

    monkeypatch.setattr(svc, "send_template", fake_send_template)
    monkeypatch.setattr(svc, "send_text", fake_send_text)
    return registro


async def _criar_config_whatsapp(db_session, empresa_id):
    """Cria a vendas_disparo_config da empresa com os campos whatsapp_* setados.

    Depende das colunas whatsapp_* (migration FASE 3).
    """
    cfg = VendasDisparoConfig(id=uuid.uuid4(), empresa_id=empresa_id)
    cfg.whatsapp_phone_id = PHONE_ID
    cfg.whatsapp_waba_id = WABA_ID
    cfg.whatsapp_token_enc = encrypt_secret("token_permanente_fake")
    cfg.whatsapp_app_secret_enc = encrypt_secret(APP_SECRET)
    cfg.whatsapp_verify_token = VERIFY_TOKEN
    db_session.add(cfg)
    await db_session.commit()
    return cfg


def _assinar(body: bytes, secret: str = APP_SECRET) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# GET webhook — verificação (handshake)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_verificacao_token_correto_retorna_challenge(client, db_session):
    empresa_id = await login_as(client, db_session, email="wa_verify_ok@torq.com")
    await _criar_config_whatsapp(db_session, empresa_id)

    r = await client.get(
        "/vendas/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": VERIFY_TOKEN,
            "hub.challenge": "1234567890",
        },
    )
    assert r.status_code == 200, r.text
    assert r.text == "1234567890"


@pytest.mark.anyio
async def test_verificacao_token_errado_403(client, db_session):
    empresa_id = await login_as(client, db_session, email="wa_verify_bad@torq.com")
    await _criar_config_whatsapp(db_session, empresa_id)

    r = await client.get(
        "/vendas/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "token_errado",
            "hub.challenge": "1234567890",
        },
    )
    assert r.status_code == 403, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# POST webhook — status (delivered) atualiza a mensagem por wamid
# ═══════════════════════════════════════════════════════════════════════════════

async def _criar_mensagem(db_session, empresa_id, *, provider_id, lead_id=None):
    camp = VendasCampanhas(
        id=uuid.uuid4(), empresa_id=empresa_id, nome="C", canal="whatsapp"
    )
    db_session.add(camp)
    msg = VendasMensagens(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        campanha_id=camp.id,
        lead_id=lead_id,
        canal="whatsapp",
        destinatario="5511999990000",
        status="enviado",
        provider_id=provider_id,
    )
    db_session.add(msg)
    await db_session.commit()
    return msg


@pytest.mark.anyio
async def test_status_delivered_atualiza_mensagem(client, db_session):
    empresa_id = await login_as(client, db_session, email="wa_status@torq.com")
    await _criar_config_whatsapp(db_session, empresa_id)
    msg = await _criar_mensagem(db_session, empresa_id, provider_id="wamid-ABC")

    payload = {
        "entry": [
            {
                "id": WABA_ID,
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": PHONE_ID},
                            "statuses": [
                                {
                                    "id": "wamid-ABC",
                                    "status": "delivered",
                                    "timestamp": "1700000000",
                                    "recipient_id": "5511999990000",
                                }
                            ],
                        }
                    }
                ],
            }
        ]
    }
    body = json.dumps(payload).encode()
    r = await client.post(
        "/vendas/whatsapp/webhook",
        content=body,
        headers={
            "X-Hub-Signature-256": _assinar(body),
            "Content-Type": "application/json",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True}

    refreshed = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg.id)
    )
    await db_session.refresh(refreshed)
    assert refreshed.status == "entregue"
    assert refreshed.entregue_em is not None


# ═══════════════════════════════════════════════════════════════════════════════
# POST webhook — assinatura inválida → 403
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_assinatura_invalida_403(client, db_session):
    empresa_id = await login_as(client, db_session, email="wa_sig@torq.com")
    await _criar_config_whatsapp(db_session, empresa_id)
    msg = await _criar_mensagem(db_session, empresa_id, provider_id="wamid-XYZ")

    payload = {
        "entry": [
            {
                "id": WABA_ID,
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": PHONE_ID},
                            "statuses": [
                                {"id": "wamid-XYZ", "status": "read"}
                            ],
                        }
                    }
                ],
            }
        ]
    }
    body = json.dumps(payload).encode()
    r = await client.post(
        "/vendas/whatsapp/webhook",
        content=body,
        headers={
            "X-Hub-Signature-256": _assinar(body, secret="secret_errado"),
            "Content-Type": "application/json",
        },
    )
    assert r.status_code == 403, r.text

    # Mensagem NÃO foi tocada (continua 'enviado').
    refreshed = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg.id)
    )
    await db_session.refresh(refreshed)
    assert refreshed.status == "enviado"
    assert refreshed.lido_em is None


# ═══════════════════════════════════════════════════════════════════════════════
# POST webhook — inbound marca a última mensagem do lead como 'respondeu'
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_inbound_marca_respondeu(client, db_session):
    empresa_id = await login_as(client, db_session, email="wa_inbound@torq.com")
    await _criar_config_whatsapp(db_session, empresa_id)

    lead = VendasLeads(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome="Lead WA",
        telefone="+55 (11) 99999-0000",
    )
    db_session.add(lead)
    await db_session.commit()

    msg = await _criar_mensagem(
        db_session, empresa_id, provider_id="wamid-OUT", lead_id=lead.id
    )

    payload = {
        "entry": [
            {
                "id": WABA_ID,
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": PHONE_ID},
                            "messages": [
                                {
                                    "id": "wamid-IN",
                                    "from": "5511999990000",
                                    "type": "text",
                                    "text": {"body": "olá, tenho interesse"},
                                    "timestamp": "1700000100",
                                }
                            ],
                        }
                    }
                ],
            }
        ]
    }
    body = json.dumps(payload).encode()
    r = await client.post(
        "/vendas/whatsapp/webhook",
        content=body,
        headers={
            "X-Hub-Signature-256": _assinar(body),
            "Content-Type": "application/json",
        },
    )
    assert r.status_code == 200, r.text

    refreshed = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg.id)
    )
    await db_session.refresh(refreshed)
    assert refreshed.status == "respondeu"
    assert refreshed.respondeu_em is not None


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT — status de empresa A não toca mensagem de empresa B
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant_status(client, db_session):
    # Empresa A com config + mensagem de mesmo wamid.
    empresa_a = await login_as(client, db_session, email="wa_tenant_a@torq.com")
    await _criar_config_whatsapp(db_session, empresa_a)
    msg_a = await _criar_mensagem(db_session, empresa_a, provider_id="wamid-SHARED")

    # Empresa B tem uma mensagem com o MESMO provider_id, mas outra config (waba/phone).
    empresa_b = uuid.uuid4()
    from app.models.generated import Empresas

    db_session.add(Empresas(id=empresa_b, nome="B", tipo="sst"))
    await db_session.commit()
    cfg_b = VendasDisparoConfig(id=uuid.uuid4(), empresa_id=empresa_b)
    cfg_b.whatsapp_phone_id = "5556667778"
    cfg_b.whatsapp_waba_id = "1231231230"
    cfg_b.whatsapp_token_enc = encrypt_secret("tok_b")
    cfg_b.whatsapp_app_secret_enc = encrypt_secret("secret_b")
    cfg_b.whatsapp_verify_token = "verify_b"
    db_session.add(cfg_b)
    await db_session.commit()
    msg_b = await _criar_mensagem(db_session, empresa_b, provider_id="wamid-SHARED")

    # Webhook chega para a EMPRESA A (waba_id de A).
    payload = {
        "entry": [
            {
                "id": WABA_ID,
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": PHONE_ID},
                            "statuses": [
                                {"id": "wamid-SHARED", "status": "read"}
                            ],
                        }
                    }
                ],
            }
        ]
    }
    body = json.dumps(payload).encode()
    r = await client.post(
        "/vendas/whatsapp/webhook",
        content=body,
        headers={
            "X-Hub-Signature-256": _assinar(body),
            "Content-Type": "application/json",
        },
    )
    assert r.status_code == 200, r.text

    a = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg_a.id)
    )
    b = await db_session.scalar(
        select(VendasMensagens).where(VendasMensagens.id == msg_b.id)
    )
    await db_session.refresh(a)
    await db_session.refresh(b)
    assert a.status == "lido"
    # B não foi tocada — segue 'enviado'.
    assert b.status == "enviado"


# ═══════════════════════════════════════════════════════════════════════════════
# SERVIÇO — enviar_mensagem_whatsapp (template aprovado / texto / erro)
# ═══════════════════════════════════════════════════════════════════════════════

class _Cfg:
    whatsapp_phone_id = PHONE_ID
    whatsapp_token_enc = None  # token vazio → decrypt não chamado


class _Tpl:
    def __init__(self, meta_template_name=None, conteudo="corpo livre"):
        self.meta_template_name = meta_template_name
        self.conteudo = conteudo


class _Msg:
    def __init__(self):
        self.destinatario = "+55 (11) 98888-7777"
        self.status = "pendente"
        self.provider_id = None
        self.enviado_em = None
        self.erro = None


@pytest.mark.anyio
async def test_enviar_mensagem_com_template_usa_send_template(db_session, monkeypatch):
    registro = _patch_envio(monkeypatch)
    msg = _Msg()
    await svc.enviar_mensagem_whatsapp(
        db_session,
        config=_Cfg(),
        mensagem=msg,
        campanha=None,
        template=_Tpl(meta_template_name="promo_junho"),
    )
    assert msg.status == "enviado"
    assert msg.provider_id == "wamid-tpl-fake"
    assert msg.destinatario == "5511988887777"  # normalizado
    assert len(registro.templates) == 1
    assert registro.templates[0]["template_name"] == "promo_junho"
    assert len(registro.textos) == 0


@pytest.mark.anyio
async def test_enviar_mensagem_sem_template_usa_send_text(db_session, monkeypatch):
    registro = _patch_envio(monkeypatch)
    msg = _Msg()
    await svc.enviar_mensagem_whatsapp(
        db_session,
        config=_Cfg(),
        mensagem=msg,
        campanha=None,
        template=_Tpl(meta_template_name=None, conteudo="oi tudo bem"),
    )
    assert msg.status == "enviado"
    assert msg.provider_id == "wamid-txt-fake"
    assert len(registro.textos) == 1
    assert registro.textos[0]["body"] == "oi tudo bem"


@pytest.mark.anyio
async def test_enviar_mensagem_whatsapp_error_vira_erro(db_session, monkeypatch):
    from app.integrations.whatsapp_meta import WhatsAppError

    async def fail_send_template(**kwargs):
        raise WhatsAppError("falha graph")

    monkeypatch.setattr(svc, "send_template", fail_send_template)
    msg = _Msg()
    await svc.enviar_mensagem_whatsapp(
        db_session,
        config=_Cfg(),
        mensagem=msg,
        campanha=None,
        template=_Tpl(meta_template_name="promo"),
    )
    assert msg.status == "erro"
    assert msg.erro == "falha graph"
    assert msg.provider_id is None


def _normalizar_telefone_sanity():
    assert svc.normalizar_telefone("+55 (11) 9-8888.7777") == "5511988887777"
