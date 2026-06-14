"""Testes do módulo Toriq Vendas — Pipeline & Conversas (CRM).

O envio real do WhatsApp é SEMPRE mockado: substituímos
``app.services.vendas_pipeline.send_text`` por uma função async fake que retorna
um wamid falso e registra as chamadas. Nenhum teste abre socket HTTP.

Cobre:
- garantir_estagios cria os 7 padrões (idempotente).
- board agrupa leads (sem estágio → "Novo").
- mover_lead muda o estágio do lead.
- append_mensagem + thread (ordem asc, pending_reply em msg do lead).
- enviar_resposta (provider chamado, msg registrada).
- listar conversas com filtros (temperatura).
- marcar_lido zera unread.
- cross-tenant: empresa B não acessa recursos da empresa A.

NOTA (integrador): rode a migration que adiciona as colunas em vendas_leads
(stage_id, is_pinned, is_archived, last_message_at, last_read_at, pending_reply,
temperatura, valor_estimado) e cria vendas_pipeline_stages/vendas_conversas ANTES
da suíte, e registre o router em main.py.
"""
import uuid

import pytest
from sqlalchemy import select

from app.models.vendas import VendasLeads
from app.services import vendas_pipeline as svc
from tests.helpers import login_as


# ───────────────────────────────────────────────────────────────────────────────
# Mock do envio real (registra chamadas).
# ───────────────────────────────────────────────────────────────────────────────

class _Enviadas:
    def __init__(self):
        self.chamadas = []


def _patch_whatsapp(monkeypatch):
    registro = _Enviadas()

    async def fake_send_text(**kwargs):
        registro.chamadas.append(kwargs)
        return "wamid-fake"

    monkeypatch.setattr(svc, "send_text", fake_send_text)
    return registro


async def _criar_lead(client, *, nome="Lead", telefone="+55 11 99999-0000", email=None):
    body = {"nome": nome, "telefone": telefone}
    if email:
        body["email"] = email
    r = await client.post("/vendas/leads", json=body)
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _set_whatsapp_config(client, db_session, empresa_id):
    """Insere config de WhatsApp diretamente (phone_id + token cripto)."""
    from app.core.esocial_crypto import encrypt_secret
    from app.models.vendas_disparo import VendasDisparoConfig

    db_session.add(
        VendasDisparoConfig(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            whatsapp_phone_id="123456",
            whatsapp_token_enc=encrypt_secret("token-zap"),
        )
    )
    await db_session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# ESTÁGIOS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_garantir_estagios_cria_padroes(client, db_session):
    await login_as(client, db_session, email="pipe_stages@torq.com")
    r = await client.get("/vendas/pipeline/stages")
    assert r.status_code == 200, r.text
    stages = r.json()
    assert len(stages) == 7
    nomes = [s["nome"] for s in stages]
    assert nomes == [n for (n, *_rest) in svc.ESTAGIOS_PADRAO]
    # Idempotente: segunda chamada não duplica.
    r = await client.get("/vendas/pipeline/stages")
    assert len(r.json()) == 7
    # Ganho/Perdido fechados; Ganho ganho.
    ganho = next(s for s in stages if s["nome"] == "Ganho")
    perdido = next(s for s in stages if s["nome"] == "Perdido")
    assert ganho["is_closed"] and ganho["is_won"]
    assert perdido["is_closed"] and not perdido["is_won"]


# ═══════════════════════════════════════════════════════════════════════════════
# BOARD + MOVER
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_board_e_mover_lead(client, db_session):
    await login_as(client, db_session, email="pipe_board@torq.com")
    lead_id = await _criar_lead(client, nome="Alice")

    r = await client.get("/vendas/pipeline/board")
    assert r.status_code == 200, r.text
    board = r.json()
    assert len(board["stages"]) == 7
    card = next(c for c in board["leads"] if c["id"] == lead_id)
    novo_stage = next(s for s in board["stages"] if s["nome"] == "Novo")
    # Lead sem estágio cai no "Novo".
    assert card["stage_id"] == novo_stage["id"]

    qualificado = next(s for s in board["stages"] if s["nome"] == "Qualificado")
    r = await client.post(
        f"/vendas/pipeline/leads/{lead_id}/mover",
        json={"stage_id": qualificado["id"], "valor_estimado": 1500.0},
    )
    assert r.status_code == 200, r.text
    assert r.json()["stage_id"] == qualificado["id"]
    assert r.json()["valor_estimado"] == 1500.0


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSAS — append + thread + marcar lido
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_append_thread_e_marcar_lido(client, db_session):
    empresa_id = await login_as(client, db_session, email="pipe_thread@torq.com")
    lead_id = await _criar_lead(client, nome="Bob")

    # Mensagem inbound do lead (gera não-lida + pending_reply).
    await svc.append_mensagem(
        db_session,
        empresa_id=empresa_id,
        lead_id=uuid.UUID(lead_id),
        sender_type="lead",
        conteudo="Oi, tenho interesse",
    )

    r = await client.get(f"/vendas/conversas/{lead_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["mensagens"]) == 1
    assert data["mensagens"][0]["conteudo"] == "Oi, tenho interesse"
    assert data["lead"]["unread"] == 1
    assert data["lead"]["pending_reply"] is True
    assert data["lead"]["last_message_preview"] == "Oi, tenho interesse"

    # Marca lido → zera unread.
    r = await client.post(f"/vendas/conversas/{lead_id}/ler")
    assert r.status_code == 204
    r = await client.get(f"/vendas/conversas/{lead_id}")
    assert r.json()["lead"]["unread"] == 0
    assert r.json()["lead"]["pending_reply"] is False


# ═══════════════════════════════════════════════════════════════════════════════
# ENVIAR RESPOSTA — provider chamado, mensagem registrada
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_enviar_resposta_chama_provider(client, db_session, monkeypatch):
    empresa_id = await login_as(client, db_session, email="pipe_resp@torq.com")
    await _set_whatsapp_config(client, db_session, empresa_id)
    registro = _patch_whatsapp(monkeypatch)
    lead_id = await _criar_lead(client, nome="Carol", telefone="+55 (11) 98888-1234")

    r = await client.post(
        f"/vendas/conversas/{lead_id}/mensagem",
        json={"conteudo": "Olá Carol, segue a proposta"},
    )
    assert r.status_code == 200, r.text
    msg = r.json()
    assert msg["sender_type"] == "agente"
    assert msg["status"] == "enviado"

    # Provider chamado 1x com telefone só-dígitos.
    assert len(registro.chamadas) == 1
    assert registro.chamadas[0]["to"] == "5511988881234"
    assert registro.chamadas[0]["body"] == "Olá Carol, segue a proposta"

    # Mensagem aparece na thread.
    r = await client.get(f"/vendas/conversas/{lead_id}")
    assert any(m["conteudo"] == "Olá Carol, segue a proposta" for m in r.json()["mensagens"])


@pytest.mark.anyio
async def test_enviar_resposta_sem_config_registra_erro(client, db_session, monkeypatch):
    await login_as(client, db_session, email="pipe_resp_noconf@torq.com")
    registro = _patch_whatsapp(monkeypatch)
    lead_id = await _criar_lead(client, nome="Dan")

    r = await client.post(
        f"/vendas/conversas/{lead_id}/mensagem", json={"conteudo": "teste"}
    )
    assert r.status_code == 200, r.text
    # Sem config → status erro, provider NÃO chamado, mas msg registrada.
    assert r.json()["status"] == "erro"
    assert len(registro.chamadas) == 0
    r = await client.get(f"/vendas/conversas/{lead_id}")
    assert len(r.json()["mensagens"]) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# LISTAR CONVERSAS — filtros
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_listar_conversas_filtro_temperatura(client, db_session):
    await login_as(client, db_session, email="pipe_inbox@torq.com")
    quente = await _criar_lead(client, nome="Quente", telefone="+55 11 90000-0001")
    await _criar_lead(client, nome="Sem temp", telefone="+55 11 90000-0002")

    r = await client.patch(
        f"/vendas/pipeline/leads/{quente}", json={"temperatura": "quente"}
    )
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/conversas?temperatura=quente")
    assert r.status_code == 200, r.text
    ids = {c["id"] for c in r.json()}
    assert quente in ids
    assert len(ids) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSÃO
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_conversao_por_estagio(client, db_session):
    await login_as(client, db_session, email="pipe_conv@torq.com")
    lead_id = await _criar_lead(client, nome="Val")
    r = await client.get("/vendas/pipeline/board")
    proposta = next(s for s in r.json()["stages"] if s["nome"] == "Proposta")
    await client.post(
        f"/vendas/pipeline/leads/{lead_id}/mover",
        json={"stage_id": proposta["id"], "valor_estimado": 999.0},
    )

    r = await client.get("/vendas/pipeline/conversao")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_leads"] == 1
    assert data["valor_total"] == 999.0
    item_prop = next(i for i in data["itens"] if i["nome"] == "Proposta")
    assert item_prop["total"] == 1
    assert item_prop["valor"] == 999.0


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant(client, db_session):
    # Empresa A cria lead.
    await login_as(client, db_session, email="pipe_tenant_a@torq.com")
    lead_a = await _criar_lead(client, nome="A")

    # Empresa B não enxerga nem acessa.
    await login_as(client, db_session, email="pipe_tenant_b@torq.com")
    r = await client.get("/vendas/pipeline/board")
    assert all(c["id"] != lead_a for c in r.json()["leads"])

    r = await client.get(f"/vendas/conversas/{lead_a}")
    assert r.status_code == 404

    stage_b = r_board = await client.get("/vendas/pipeline/board")
    algum_stage = r_board.json()["stages"][0]["id"]
    r = await client.post(
        f"/vendas/pipeline/leads/{lead_a}/mover",
        json={"stage_id": algum_stage},
    )
    assert r.status_code == 404


@pytest.mark.anyio
async def test_sem_empresa_403(client, db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    email = "pipe_sem_empresa@torq.com"
    user = User(
        id=uuid.uuid4(),
        email=email,
        senha_hash=hash_password("segredo123"),
        nome="Sem Empresa",
        role=UserRole.admin_vertical,
        empresa_id=None,
        ativo=True,
    )
    db_session.add(user)
    await db_session.commit()

    r = await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/pipeline/board")
    assert r.status_code == 403
