"""Testes do módulo Toriq Vendas — FASE 4 (SDR Inteligente — agente Claude).

A chamada ao modelo (Claude) é SEMPRE mockada: substituímos
``app.services.vendas_sdr.chamar_claude`` por uma função async fake que devolve
um JSON de qualificação OU um texto de resposta, conforme o conteúdo enviado.
Nenhum teste abre conexão com a API da Anthropic.

Cobre:
- PUT + GET /vendas/sdr/config: chave de API mascarada, nunca vaza o segredo.
- Qualificar: atualiza sdr_score/sdr_status/sdr_notas do lead + cria interação.
- Qualificar batch: conta qualificados/erros.
- Responder: gera resposta + registra interações (usuario + assistente).
- Stats: total, por_status, score_medio, followups_pendentes.
- Patch lead (sdr_status/notas/followup).
- Cross-tenant: empresa B não acessa recursos da empresa A.
- Sem config → 400 ao qualificar/responder.

NOTA (integrador):
- Registre o router (app/api/vendas_sdr.py) em app/main.py.
- Rode a migration FASE 4: cria vendas_sdr_config + vendas_sdr_interacoes E
  faz ALTER em vendas_leads ADD COLUMN sdr_status/sdr_score/sdr_notas/
  sdr_proximo_followup. Estes testes DEPENDEM dessas colunas.
- O model VendasLeads (app/models/vendas.py) precisa ganhar os atributos sdr_*.
"""
import uuid

import pytest

from app.services import vendas_sdr as svc
from tests.helpers import login_as


# ───────────────────────────────────────────────────────────────────────────────
# Mock da chamada ao modelo (Claude). Registra as chamadas e decide o retorno
# com base no conteúdo (qualificação devolve JSON; conversa devolve texto).
# ───────────────────────────────────────────────────────────────────────────────

class _Chamadas:
    def __init__(self):
        self.chamadas = []


def _patch_claude(monkeypatch, *, resposta_conversa="Olá! Como posso ajudar?"):
    registro = _Chamadas()

    async def fake_chamar_claude(**kwargs):
        registro.chamadas.append(kwargs)
        mensagens = kwargs.get("mensagens") or []
        conteudo = mensagens[-1]["content"] if mensagens else ""
        # A qualificação sempre pede o formato JSON com "score"/"status"/"notas".
        if "JSON" in conteudo and "score" in conteudo:
            return '{"score": 87, "status": "quente", "notas": "Bom fit comercial."}'
        return resposta_conversa

    monkeypatch.setattr(svc, "chamar_claude", fake_chamar_claude)
    return registro


async def _set_config(client, api_key="sk-ant-supersecreto-xyz9", ativo=True):
    r = await client.put(
        "/vendas/sdr/config",
        json={
            "provider": "anthropic",
            "modelo": "claude-sonnet-4-6",
            "persona": "Sou um SDR cordial da Toriq.",
            "objetivo": "Qualificar leads e agendar reuniões.",
            "prompt_sistema": "Você é um SDR profissional e objetivo.",
            "diretrizes": "Seja breve e cordial.",
            "prompt_qualificacao": "Classifique o lead.",
            "temperatura": 0.5,
            "api_key": api_key,
            "ativo": ativo,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


async def _criar_lead(client, *, nome="Lead", email="lead@dest.com", empresa_nome="Empresa X"):
    r = await client.post(
        "/vendas/leads",
        json={"nome": nome, "empresa_nome": empresa_nome, "email": email},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_config_get_vazia(client, db_session):
    await login_as(client, db_session, email="sdr_cfg_vazia@torq.com")
    r = await client.get("/vendas/sdr/config")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["api_key_set"] is False
    assert body["api_key_masked"] is None
    assert body["ativo"] is False


@pytest.mark.anyio
async def test_config_put_get_mascara_chave(client, db_session):
    await login_as(client, db_session, email="sdr_cfg@torq.com")
    api_key = "sk-ant-supersecreto-xyz9"
    body = await _set_config(client, api_key=api_key)

    assert body["api_key_set"] is True
    assert body["provider"] == "anthropic"
    assert body["persona"] == "Sou um SDR cordial da Toriq."
    assert body["ativo"] is True
    # Mascarada: nunca a chave em claro, mas termina nos 4 últimos chars.
    assert body["api_key_masked"] != api_key
    assert body["api_key_masked"].endswith("xyz9")
    assert api_key not in body["api_key_masked"]

    # GET reflete o mesmo sem vazar.
    r = await client.get("/vendas/sdr/config")
    body = r.json()
    assert body["api_key_set"] is True
    assert api_key not in (body["api_key_masked"] or "")
    assert body["prompt_sistema"] == "Você é um SDR profissional e objetivo."

    # Limpar chave.
    r = await client.put("/vendas/sdr/config", json={"clear_api_key": True})
    assert r.status_code == 200
    body = r.json()
    assert body["api_key_set"] is False
    assert body["api_key_masked"] is None
    # Persona permanece.
    assert body["persona"] == "Sou um SDR cordial da Toriq."


# ═══════════════════════════════════════════════════════════════════════════════
# QUALIFICAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_qualificar_atualiza_lead_e_cria_interacao(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_qual@torq.com")
    await _set_config(client)
    registro = _patch_claude(monkeypatch)

    lead_id = await _criar_lead(client, nome="Alice", email="alice@dest.com")

    r = await client.post(f"/vendas/sdr/leads/{lead_id}/qualificar")
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["lead_id"] == lead_id
    assert res["sdr_score"] == 87
    assert res["sdr_status"] == "quente"
    assert "fit" in res["sdr_notas"].lower()

    # Modelo foi chamado.
    assert len(registro.chamadas) == 1

    # Lead atualizado (via lista SDR).
    r = await client.get("/vendas/sdr/leads")
    leads = r.json()["items"]
    alvo = next(l for l in leads if l["id"] == lead_id)
    assert alvo["sdr_score"] == 87
    assert alvo["sdr_status"] == "quente"

    # Interação de qualificação registrada.
    r = await client.get(f"/vendas/sdr/leads/{lead_id}/interacoes")
    inter = r.json()
    assert any(i["tipo"] == "qualificacao" and i["papel"] == "assistente" for i in inter)


@pytest.mark.anyio
async def test_qualificar_batch(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_batch@torq.com")
    await _set_config(client)
    _patch_claude(monkeypatch)

    l1 = await _criar_lead(client, nome="A", email="a@dest.com")
    l2 = await _criar_lead(client, nome="B", email="b@dest.com")

    r = await client.post(
        "/vendas/sdr/qualificar-batch", json={"lead_ids": [l1, l2]}
    )
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["qualificados"] == 2
    assert res["erros"] == 0


@pytest.mark.anyio
async def test_qualificar_sem_config_400(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_nocfg@torq.com")
    _patch_claude(monkeypatch)
    lead_id = await _criar_lead(client, email="x@dest.com")
    r = await client.post(f"/vendas/sdr/leads/{lead_id}/qualificar")
    assert r.status_code == 400, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSA (responder)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_responder_gera_e_registra(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_resp@torq.com")
    await _set_config(client)
    _patch_claude(monkeypatch, resposta_conversa="Claro, posso agendar uma demo!")

    lead_id = await _criar_lead(client, email="conv@dest.com")

    r = await client.post(
        f"/vendas/sdr/leads/{lead_id}/responder",
        json={"mensagem": "Quero saber mais sobre o produto."},
    )
    assert r.status_code == 200, r.text
    assert r.json()["resposta"] == "Claro, posso agendar uma demo!"

    # A mensagem do usuário e a resposta do assistente foram registradas.
    r = await client.get(f"/vendas/sdr/leads/{lead_id}/interacoes")
    inter = r.json()
    msgs = [i for i in inter if i["tipo"] == "mensagem"]
    papeis = [m["papel"] for m in msgs]
    assert "usuario" in papeis
    assert "assistente" in papeis
    assert any(m["conteudo"] == "Claro, posso agendar uma demo!" for m in msgs)


@pytest.mark.anyio
async def test_responder_sem_config_400(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_resp_nocfg@torq.com")
    _patch_claude(monkeypatch)
    lead_id = await _criar_lead(client, email="y@dest.com")
    r = await client.post(
        f"/vendas/sdr/leads/{lead_id}/responder", json={"mensagem": "oi"}
    )
    assert r.status_code == 400, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# INTERAÇÃO MANUAL
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_interacao_manual(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_inter@torq.com")
    _patch_claude(monkeypatch)
    lead_id = await _criar_lead(client, email="man@dest.com")

    r = await client.post(
        f"/vendas/sdr/leads/{lead_id}/interacao",
        json={"tipo": "nota", "conteudo": "Ligou e pediu retorno.", "papel": "usuario"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tipo"] == "nota"
    assert body["conteudo"] == "Ligou e pediu retorno."

    r = await client.get(f"/vendas/sdr/leads/{lead_id}/interacoes")
    assert any(i["tipo"] == "nota" for i in r.json())


# ═══════════════════════════════════════════════════════════════════════════════
# PATCH LEAD + STATS + FOLLOWUPS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_patch_lead_e_followups(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_patch@torq.com")
    _patch_claude(monkeypatch)
    lead_id = await _criar_lead(client, email="patch@dest.com")

    futuro = "2099-01-01T12:00:00+00:00"
    r = await client.patch(
        f"/vendas/sdr/leads/{lead_id}",
        json={
            "sdr_status": "morno",
            "sdr_notas": "aguardando orçamento",
            "sdr_proximo_followup": futuro,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sdr_status"] == "morno"
    assert body["sdr_notas"] == "aguardando orçamento"
    assert body["sdr_proximo_followup"] is not None

    # Follow-ups: lead com proximo_followup aparece na lista.
    r = await client.get("/vendas/sdr/followups")
    assert any(l["id"] == lead_id for l in r.json())


@pytest.mark.anyio
async def test_stats(client, db_session, monkeypatch):
    await login_as(client, db_session, email="sdr_stats@torq.com")
    await _set_config(client)
    _patch_claude(monkeypatch)

    l1 = await _criar_lead(client, nome="A", email="sa@dest.com")
    await _criar_lead(client, nome="B", email="sb@dest.com")

    # Qualifica um (score 87, status quente).
    r = await client.post(f"/vendas/sdr/leads/{l1}/qualificar")
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/sdr/stats")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2
    assert isinstance(body["por_status"], dict)
    assert body["por_status"].get("quente") == 1
    assert body["score_medio"] == 87.0


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant(client, db_session, monkeypatch):
    # Empresa A cria/qualifica lead.
    await login_as(client, db_session, email="sdr_tenant_a@torq.com")
    await _set_config(client)
    _patch_claude(monkeypatch)
    lead_a = await _criar_lead(client, email="a@dest.com")
    await client.post(f"/vendas/sdr/leads/{lead_a}/qualificar")

    # Empresa B não enxerga o lead nem acessa interações/qualificar.
    await login_as(client, db_session, email="sdr_tenant_b@torq.com")
    r = await client.get("/vendas/sdr/leads")
    assert all(l["id"] != lead_a for l in r.json()["items"])

    r = await client.get(f"/vendas/sdr/leads/{lead_a}/interacoes")
    assert r.status_code == 404

    r = await client.post(f"/vendas/sdr/leads/{lead_a}/qualificar")
    assert r.status_code == 400  # lead não encontrado (cross-tenant) → ValueError → 400

    # B não vê a config de A.
    r = await client.get("/vendas/sdr/config")
    assert r.json()["api_key_set"] is False


@pytest.mark.anyio
async def test_sem_empresa_403(client, db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    email = "sdr_sem_empresa@torq.com"
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

    r = await client.get("/vendas/sdr/config")
    assert r.status_code == 403
