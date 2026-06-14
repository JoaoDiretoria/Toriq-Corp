"""Testes do módulo Toriq Vendas — FASE 2 (Disparo em Massa por Email).

O envio real (SMTP) é SEMPRE mockado: substituímos
``app.services.vendas_disparo.enviar_email`` por uma função async fake que
retorna um Message-ID falso e registra as chamadas. Nenhum teste abre socket SMTP.

Cobre:
- PUT + GET /vendas/disparo/config: senha mascarada, nunca vaza o segredo.
- Templates: CRUD básico + filtro por canal.
- Campanha com lead_ids → enviar → mensagens viram 'enviado' (provider chamado).
- Supressão: lead suprimido vira 'suprimido' e NÃO chama o provider.
- Descadastro público adiciona o destinatário à supressão da empresa.
- Rastrear (pixel) marca a mensagem como lida.
- Cross-tenant: empresa B não enxerga/acessa recursos da empresa A.

NOTA (integrador): rode a migration FASE 2 (tabelas vendas_disparo_config,
vendas_templates, vendas_campanhas, vendas_mensagens, vendas_supressao) ANTES
da suíte, e registre o router em main.py.
"""
import uuid

import pytest
from sqlalchemy import select

from app.models.vendas import VendasLeads
from app.services import vendas_disparo as svc
from tests.helpers import login_as


# ───────────────────────────────────────────────────────────────────────────────
# Mock do envio real (registra chamadas).
# ───────────────────────────────────────────────────────────────────────────────

class _Enviadas:
    def __init__(self):
        self.chamadas = []


def _patch_email(monkeypatch):
    """Substitui enviar_email do serviço por um fake async que registra chamadas."""
    registro = _Enviadas()

    async def fake_enviar_email(**kwargs):
        registro.chamadas.append(kwargs)
        return "msgid-fake"

    monkeypatch.setattr(svc, "enviar_email", fake_enviar_email)
    return registro


async def _set_config(client, password="smtp_supersecreto_xyz9"):
    r = await client.put(
        "/vendas/disparo/config",
        json={
            "email_remetente": "no-reply@torq.com",
            "email_remetente_nome": "Toriq",
            "smtp_host": "smtp.torq.com",
            "smtp_port": 587,
            "smtp_user": "user@torq.com",
            "smtp_password": password,
            "smtp_use_tls": True,
            "email_rate_limit": 100,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


async def _criar_lead(client, email, nome="Lead", empresa_nome="Empresa X"):
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
    await login_as(client, db_session, email="disp_cfg_vazia@torq.com")
    r = await client.get("/vendas/disparo/config")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["smtp_password_set"] is False
    assert body["smtp_password_masked"] is None
    assert body["smtp_host"] is None


@pytest.mark.anyio
async def test_config_put_get_mascara_senha(client, db_session):
    await login_as(client, db_session, email="disp_cfg@torq.com")
    password = "smtp_supersecreto_xyz9"
    body = await _set_config(client, password=password)

    assert body["smtp_password_set"] is True
    assert body["smtp_host"] == "smtp.torq.com"
    assert body["smtp_port"] == 587
    # Mascarado: nunca a senha em claro, mas termina nos 4 últimos chars.
    assert body["smtp_password_masked"] != password
    assert body["smtp_password_masked"].endswith("xyz9")
    assert password not in body["smtp_password_masked"]

    # GET reflete o mesmo sem vazar.
    r = await client.get("/vendas/disparo/config")
    body = r.json()
    assert body["smtp_password_set"] is True
    assert password not in (body["smtp_password_masked"] or "")

    # Limpar senha.
    r = await client.put(
        "/vendas/disparo/config", json={"clear_smtp_password": True}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["smtp_password_set"] is False
    assert body["smtp_password_masked"] is None
    # Host permanece.
    assert body["smtp_host"] == "smtp.torq.com"


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_template_crud(client, db_session):
    await login_as(client, db_session, email="disp_tpl@torq.com")

    r = await client.post(
        "/vendas/templates",
        json={
            "nome": "Boas-vindas",
            "assunto": "Olá {{nome}}",
            "conteudo": "<p>Oi {{nome}}, da {{empresa_nome}}</p>",
            "categoria": "onboarding",
        },
    )
    assert r.status_code == 201, r.text
    tpl = r.json()
    assert tpl["nome"] == "Boas-vindas"
    assert tpl["canal"] == "email"
    tpl_id = tpl["id"]

    # GET único.
    r = await client.get(f"/vendas/templates/{tpl_id}")
    assert r.status_code == 200
    assert r.json()["assunto"] == "Olá {{nome}}"

    # Lista + filtro por canal.
    r = await client.get("/vendas/templates?canal=email")
    assert any(t["id"] == tpl_id for t in r.json())
    r = await client.get("/vendas/templates?canal=whatsapp")
    assert all(t["id"] != tpl_id for t in r.json())

    # PUT.
    r = await client.put(
        f"/vendas/templates/{tpl_id}", json={"nome": "Boas-vindas v2"}
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Boas-vindas v2"

    # DELETE.
    r = await client.delete(f"/vendas/templates/{tpl_id}")
    assert r.status_code == 204
    r = await client.get(f"/vendas/templates/{tpl_id}")
    assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# CAMPANHA — criar + enviar (provider chamado, mensagens 'enviado')
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_campanha_enviar_lead_ids(client, db_session, monkeypatch):
    await login_as(client, db_session, email="disp_camp@torq.com")
    await _set_config(client)
    registro = _patch_email(monkeypatch)

    # Template.
    r = await client.post(
        "/vendas/templates",
        json={
            "nome": "T",
            "assunto": "Oi {{nome}}",
            "conteudo": "<p>Olá {{nome}}</p>",
        },
    )
    template_id = r.json()["id"]

    # 2 leads com email.
    l1 = await _criar_lead(client, "a@dest.com", nome="Alice")
    l2 = await _criar_lead(client, "b@dest.com", nome="Bob")

    # Campanha por lead_ids.
    r = await client.post(
        "/vendas/campanhas",
        json={
            "nome": "Campanha 1",
            "template_id": template_id,
            "lead_ids": [l1, l2],
        },
    )
    assert r.status_code == 201, r.text
    camp = r.json()
    assert camp["status"] == "rascunho"
    camp_id = camp["id"]

    # Enviar (assíncrono): prepara + 202, NÃO envia no request.
    r = await client.post(f"/vendas/campanhas/{camp_id}/enviar")
    assert r.status_code == 202, r.text
    res = r.json()
    assert res["total_destinatarios"] == 2
    assert res["status"] == "enviando"
    assert res["enfileirado"] is True
    # Ainda não chamou o provider (envio fica para o scheduler).
    assert len(registro.chamadas) == 0

    # O scheduler é quem envia — drena as pendentes via a sessão de teste.
    await svc.processar_campanhas_pendentes(db_session)

    # Provider chamado 2x, com HTML contendo link de descadastro.
    assert len(registro.chamadas) == 2
    destinos = {c["to"] for c in registro.chamadas}
    assert destinos == {"a@dest.com", "b@dest.com"}
    assert all("/vendas/descadastro/" in c["html"] for c in registro.chamadas)

    # Mensagens viraram 'enviado' com provider_id; campanha 'concluida'.
    r = await client.get(f"/vendas/campanhas/{camp_id}/mensagens")
    msgs = r.json()
    assert len(msgs) == 2
    assert all(m["status"] == "enviado" for m in msgs)
    assert all(m["provider_id"] == "msgid-fake" for m in msgs)
    r = await client.get(f"/vendas/campanhas/{camp_id}")
    assert r.json()["status"] == "concluida"


# ═══════════════════════════════════════════════════════════════════════════════
# SUPRESSÃO — lead suprimido NÃO recebe (não chama provider)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_campanha_respeita_supressao(client, db_session, monkeypatch):
    await login_as(client, db_session, email="disp_supr@torq.com")
    await _set_config(client)
    registro = _patch_email(monkeypatch)

    l1 = await _criar_lead(client, "ok@dest.com", nome="Ok")
    l2 = await _criar_lead(client, "Blocked@Dest.com", nome="Bloqueado")

    # Suprime o segundo (normaliza p/ lower).
    r = await client.post(
        "/vendas/supressao",
        json={"tipo": "email", "valor": "blocked@dest.com", "motivo": "opt-out"},
    )
    assert r.status_code == 201, r.text

    r = await client.post(
        "/vendas/campanhas",
        json={"nome": "C", "lead_ids": [l1, l2]},
    )
    camp_id = r.json()["id"]

    r = await client.post(f"/vendas/campanhas/{camp_id}/enviar")
    assert r.status_code == 202, r.text

    # O scheduler envia; supressão aplicada na rodada.
    await svc.processar_campanhas_pendentes(db_session)

    # Provider chamado só p/ o não-suprimido.
    assert len(registro.chamadas) == 1
    assert registro.chamadas[0]["to"] == "ok@dest.com"

    r = await client.get(f"/vendas/campanhas/{camp_id}/mensagens")
    status_por_dest = {m["destinatario"]: m["status"] for m in r.json()}
    assert status_por_dest["ok@dest.com"] == "enviado"
    assert status_por_dest["Blocked@Dest.com"] == "suprimido"


@pytest.mark.anyio
async def test_enviar_sem_config_400(client, db_session, monkeypatch):
    await login_as(client, db_session, email="disp_nocfg@torq.com")
    _patch_email(monkeypatch)
    l1 = await _criar_lead(client, "x@dest.com")
    r = await client.post("/vendas/campanhas", json={"nome": "C", "lead_ids": [l1]})
    camp_id = r.json()["id"]
    r = await client.post(f"/vendas/campanhas/{camp_id}/enviar")
    assert r.status_code == 400, r.text


# ═══════════════════════════════════════════════════════════════════════════════
# ROTAS PÚBLICAS — descadastro + rastreio
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_descadastro_publico_adiciona_supressao(client, db_session, monkeypatch):
    empresa_id = await login_as(client, db_session, email="disp_desc@torq.com")
    await _set_config(client)
    _patch_email(monkeypatch)

    l1 = await _criar_lead(client, "leave@dest.com", nome="Sair")
    r = await client.post("/vendas/campanhas", json={"nome": "C", "lead_ids": [l1]})
    camp_id = r.json()["id"]
    await client.post(f"/vendas/campanhas/{camp_id}/enviar")
    await svc.processar_campanhas_pendentes(db_session)

    r = await client.get(f"/vendas/campanhas/{camp_id}/mensagens")
    msg_id = r.json()[0]["id"]

    # Descadastro público (sem auth) — sempre 200.
    r = await client.get(f"/vendas/descadastro/{msg_id}")
    assert r.status_code == 200
    assert "descadastrado" in r.text.lower()

    # Agora consta na supressão da empresa.
    r = await client.get("/vendas/supressao")
    valores = {x["valor"] for x in r.json()}
    assert "leave@dest.com" in valores

    # Idempotente: chamar de novo ainda 200.
    r = await client.get(f"/vendas/descadastro/{msg_id}")
    assert r.status_code == 200

    # Mensagem inexistente → ainda 200.
    r = await client.get(f"/vendas/descadastro/{uuid.uuid4()}")
    assert r.status_code == 200


@pytest.mark.anyio
async def test_rastrear_marca_lido(client, db_session, monkeypatch):
    await login_as(client, db_session, email="disp_track@torq.com")
    await _set_config(client)
    _patch_email(monkeypatch)

    l1 = await _criar_lead(client, "open@dest.com")
    r = await client.post("/vendas/campanhas", json={"nome": "C", "lead_ids": [l1]})
    camp_id = r.json()["id"]
    await client.post(f"/vendas/campanhas/{camp_id}/enviar")
    await svc.processar_campanhas_pendentes(db_session)

    r = await client.get(f"/vendas/campanhas/{camp_id}/mensagens")
    msg_id = r.json()[0]["id"]

    # Pixel (sem auth) → image/gif.
    r = await client.get(f"/vendas/rastrear/{msg_id}.png")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/gif"

    # Mensagem agora 'lido'.
    r = await client.get(f"/vendas/campanhas/{camp_id}/mensagens")
    msg = r.json()[0]
    assert msg["status"] == "lido"
    assert msg["lido_em"] is not None

    # Mensagem inexistente → ainda devolve o pixel (nunca erra).
    r = await client.get(f"/vendas/rastrear/{uuid.uuid4()}.png")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/gif"


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_cross_tenant_campanha(client, db_session, monkeypatch):
    # Empresa A cria campanha.
    await login_as(client, db_session, email="disp_tenant_a@torq.com")
    await _set_config(client)
    _patch_email(monkeypatch)
    l1 = await _criar_lead(client, "a@dest.com")
    r = await client.post("/vendas/campanhas", json={"nome": "C-A", "lead_ids": [l1]})
    camp_a = r.json()["id"]

    # Empresa B não enxerga nem acessa.
    await login_as(client, db_session, email="disp_tenant_b@torq.com")
    r = await client.get("/vendas/campanhas")
    assert all(c["id"] != camp_a for c in r.json())

    r = await client.get(f"/vendas/campanhas/{camp_a}")
    assert r.status_code == 404

    r = await client.post(f"/vendas/campanhas/{camp_a}/enviar")
    assert r.status_code == 404

    r = await client.get(f"/vendas/campanhas/{camp_a}/mensagens")
    assert r.status_code == 404

    # B não vê config de A.
    r = await client.get("/vendas/disparo/config")
    assert r.json()["smtp_password_set"] is False


@pytest.mark.anyio
async def test_sem_empresa_403(client, db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    email = "disp_sem_empresa@torq.com"
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

    r = await client.get("/vendas/disparo/config")
    assert r.status_code == 403
