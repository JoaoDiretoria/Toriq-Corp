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


@pytest.mark.anyio
async def test_enviar_resposta_canal_evolution_usa_instancia(
    client, db_session, monkeypatch
):
    empresa_id = await login_as(client, db_session, email="pipe_evo@torq.com")

    # Instância Evolution conectada (o envio manual deve rotear por ela).
    from app.core.esocial_crypto import encrypt_secret
    from app.models.vendas_evolution import VendasEvolutionInstancias

    db_session.add(
        VendasEvolutionInstancias(
            id=uuid.uuid4(), empresa_id=empresa_id, nome_exibicao="WA",
            instance_name=f"emp_{uuid.uuid4().hex[:8]}", status="conectada",
            instance_token_enc=encrypt_secret("tok-evo"),
            webhook_token=uuid.uuid4().hex,
        )
    )
    await db_session.commit()

    # Mock do envio Evolution (nível service) — não toca rede.
    from app.services import vendas_evolution as evo

    chamadas = []

    async def fake_evo(db, *, empresa_id, instancia_id, numero, texto, typing=False):
        chamadas.append({"numero": numero, "texto": texto})
        return {"enviado": True, "provider_id": "EVO-1", "erro": None}

    monkeypatch.setattr(evo, "enviar_texto", fake_evo)

    lead_id = await _criar_lead(client, nome="Eve", telefone="+55 (11) 97777-0000")
    r = await client.post(
        f"/vendas/conversas/{lead_id}/mensagem",
        json={"conteudo": "oi pelo evo", "canal": "whatsapp_evo"},
    )
    assert r.status_code == 200, r.text
    msg = r.json()
    assert msg["status"] == "enviado"
    assert msg["canal"] == "whatsapp_evo"
    assert chamadas and chamadas[0]["numero"] == "5511977770000"
    assert chamadas[0]["texto"] == "oi pelo evo"


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE HSM (reabrir conversa fora da janela 24h)
# ═══════════════════════════════════════════════════════════════════════════════

async def _criar_template_aprovado(db_session, empresa_id):
    from app.models.vendas_disparo import VendasTemplates

    tpl = VendasTemplates(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome="Reengajar",
        canal="whatsapp",
        conteudo="Oi! Podemos retomar?",
        meta_template_name="reengajar_pt",
        approval_status="approved",
    )
    db_session.add(tpl)
    await db_session.commit()
    return tpl.id


@pytest.mark.anyio
async def test_enviar_template_chama_send_template(client, db_session, monkeypatch):
    empresa_id = await login_as(client, db_session, email="pipe_tpl@torq.com")
    await _set_whatsapp_config(client, db_session, empresa_id)
    lead_id = await _criar_lead(client, nome="Eva", telefone="+55 (11) 97777-0001")
    tpl_id = await _criar_template_aprovado(db_session, empresa_id)

    chamadas = []

    async def fake_send_template(**kwargs):
        chamadas.append(kwargs)
        return "wamid-tpl"

    monkeypatch.setattr(svc, "send_template", fake_send_template)

    r = await client.post(
        f"/vendas/conversas/{lead_id}/template", json={"template_id": str(tpl_id)}
    )
    assert r.status_code == 200, r.text
    msg = r.json()
    assert msg["sender_type"] == "agente"
    assert msg["status"] == "enviado"
    assert msg["conteudo"] == "Oi! Podemos retomar?"
    assert len(chamadas) == 1
    assert chamadas[0]["template_name"] == "reengajar_pt"
    assert chamadas[0]["to"] == "5511977770001"


@pytest.mark.anyio
async def test_enviar_template_nao_aprovado_404(client, db_session, monkeypatch):
    empresa_id = await login_as(client, db_session, email="pipe_tpl_na@torq.com")
    await _set_whatsapp_config(client, db_session, empresa_id)
    lead_id = await _criar_lead(client, nome="Fred")

    from app.models.vendas_disparo import VendasTemplates

    tpl = VendasTemplates(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        nome="Pendente",
        canal="whatsapp",
        conteudo="x",
        meta_template_name="pend",
        approval_status="pending",
    )
    db_session.add(tpl)
    await db_session.commit()

    r = await client.post(
        f"/vendas/conversas/{lead_id}/template", json={"template_id": str(tpl.id)}
    )
    assert r.status_code == 404, r.text


@pytest.mark.anyio
async def test_thread_janela_fechada_sem_inbound(client, db_session):
    """Sem nenhuma mensagem do lead, a janela de 24h está fechada."""
    await login_as(client, db_session, email="pipe_janela@torq.com")
    lead_id = await _criar_lead(client, nome="Gabi")
    r = await client.get(f"/vendas/conversas/{lead_id}")
    assert r.status_code == 200, r.text
    assert r.json()["janela_aberta"] is False


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


# ═══════════════════════════════════════════════════════════════════════════════
# #3 REORDENAR — ordem manual do card no estágio
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_reordenar_coluna_persiste_ordem(client, db_session):
    await login_as(client, db_session, email="pipe_reorder@torq.com")
    a = await _criar_lead(client, nome="A", telefone="+55 11 90000-1001")
    b = await _criar_lead(client, nome="B", telefone="+55 11 90000-1002")

    r = await client.get("/vendas/pipeline/board")
    novo = next(s for s in r.json()["stages"] if s["nome"] == "Novo")

    # Ordem B, A nesse estágio.
    r = await client.post(
        f"/vendas/pipeline/stages/{novo['id']}/reordenar",
        json={"lead_ids": [b, a]},
    )
    assert r.status_code == 204, r.text

    r = await client.get("/vendas/pipeline/board")
    no_novo = [
        c["id"]
        for c in r.json()["leads"]
        if (c["stage_id"] == novo["id"]) and c["id"] in (a, b)
    ]
    assert no_novo == [b, a]


# ═══════════════════════════════════════════════════════════════════════════════
# #6 RESPONSÁVEL — atribuição de conversa a operador
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_atribuir_responsavel_e_filtro_minhas(client, db_session):
    email = "pipe_assign@torq.com"
    await login_as(client, db_session, email=email)
    from app.models.user import User

    uid = await db_session.scalar(select(User.id).where(User.email == email))
    lead_id = await _criar_lead(client, nome="Assigned")

    # Operadores inclui o próprio usuário logado.
    r = await client.get("/vendas/pipeline/operadores")
    assert r.status_code == 200, r.text
    assert any(o["id"] == str(uid) for o in r.json())

    # Atribui via PATCH.
    r = await client.patch(
        f"/vendas/pipeline/leads/{lead_id}", json={"assigned_to": str(uid)}
    )
    assert r.status_code == 200, r.text
    assert r.json()["assigned_to"] == str(uid)
    assert r.json()["assigned_to_nome"]

    # Filtro "minhas" traz o lead; sem filtro também.
    r = await client.get("/vendas/conversas?minhas=true")
    assert any(c["id"] == lead_id for c in r.json())


# ═══════════════════════════════════════════════════════════════════════════════
# #8 ANALYTICS — desempenho da pipeline
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_analytics_conversao_e_ganhos(client, db_session):
    await login_as(client, db_session, email="pipe_analytics@torq.com")
    lead_id = await _criar_lead(client, nome="WonLead")

    r = await client.get("/vendas/pipeline/board")
    ganho = next(s for s in r.json()["stages"] if s["nome"] == "Ganho")

    await client.post(
        f"/vendas/pipeline/leads/{lead_id}/mover",
        json={"stage_id": ganho["id"], "valor_estimado": 500.0},
    )

    r = await client.get("/vendas/pipeline/analytics")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_leads"] == 1
    assert data["ganhos"] == 1
    assert data["valor_ganho"] == 500.0
    assert data["taxa_conversao"] == 1.0
