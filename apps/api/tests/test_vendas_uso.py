"""Testes do módulo Toriq Vendas — FASE 5 (Medição & Contratação).

Cobre:
- registrar_uso + resumo_uso: agrega por métrica (SUM) e filtra por período.
- Cross-tenant: empresa A não enxerga o uso de B em GET /vendas/uso.
- /vendas/uso/empresas exige admin_vertical (403 para cliente_torq).

NOTA (integrador): rode a migration FASE 5 (tabela vendas_uso) ANTES da suíte
e registre o router em main.py + o model em models/__init__.py.
"""
import uuid

import pytest

from app.services import vendas_uso as svc
from tests.helpers import login_as


# ═══════════════════════════════════════════════════════════════════════════════
# SERVIÇO — registrar_uso + resumo_uso (agrega por métrica, filtra período)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_registrar_e_resumo_uso_agrega_e_filtra_periodo(client, db_session):
    empresa_id = await login_as(client, db_session, email="uso_svc@torq.com")

    periodo = svc.periodo_atual()

    # 3 runs apify + 5 leads no período corrente.
    await svc.registrar_uso(
        db_session, empresa_id=empresa_id, metrica="apify_runs", quantidade=2
    )
    await svc.registrar_uso(
        db_session, empresa_id=empresa_id, metrica="apify_runs", quantidade=1
    )
    await svc.registrar_uso(
        db_session, empresa_id=empresa_id, metrica="leads_captados", quantidade=5
    )
    await db_session.commit()

    # Resumo do período corrente: agrega por métrica.
    resumo = await svc.resumo_uso(db_session, empresa_id=empresa_id, periodo=periodo)
    por_metrica = {m["metrica"]: m["quantidade"] for m in resumo["metricas"]}
    assert por_metrica["apify_runs"] == 3
    assert por_metrica["leads_captados"] == 5
    assert resumo["total"] == 8
    assert resumo["periodo"] == periodo

    # Filtro por período diferente → vazio.
    resumo_outro = await svc.resumo_uso(
        db_session, empresa_id=empresa_id, periodo="1999-01"
    )
    assert resumo_outro["metricas"] == []
    assert resumo_outro["total"] == 0

    # Sem período → acumulado total (mesmos valores aqui).
    resumo_total = await svc.resumo_uso(db_session, empresa_id=empresa_id)
    assert resumo_total["total"] == 8
    assert resumo_total["periodo"] is None


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT /vendas/uso — própria empresa + cross-tenant
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_uso_endpoint_cross_tenant(client, db_session):
    # Empresa A registra uso.
    empresa_a = await login_as(client, db_session, email="uso_tenant_a@torq.com")
    await svc.registrar_uso(
        db_session, empresa_id=empresa_a, metrica="emails_enviados", quantidade=10
    )
    await db_session.commit()

    r = await client.get("/vendas/uso")
    assert r.status_code == 200, r.text
    body = r.json()
    por_metrica = {m["metrica"]: m["quantidade"] for m in body["metricas"]}
    assert por_metrica.get("emails_enviados") == 10
    assert body["total"] == 10

    # Empresa B não vê o uso de A.
    await login_as(client, db_session, email="uso_tenant_b@torq.com")
    r = await client.get("/vendas/uso")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["metricas"] == []
    assert body["total"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT /vendas/uso/empresas — somente admin_vertical
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_uso_empresas_exige_admin_vertical(client, db_session):
    # cliente_torq → 403.
    await login_as(
        client, db_session, role="cliente_torq", email="uso_cliente@torq.com"
    )
    r = await client.get("/vendas/uso/empresas")
    assert r.status_code == 403, r.text


@pytest.mark.anyio
async def test_uso_empresas_admin_vertical_ve_todas(client, db_session):
    # Empresa A (cliente_torq) gera uso.
    empresa_a = await login_as(
        client, db_session, role="cliente_torq", email="uso_emp_a@torq.com"
    )
    await svc.registrar_uso(
        db_session, empresa_id=empresa_a, metrica="sdr_conversas", quantidade=4
    )
    await db_session.commit()

    # admin_vertical enxerga a visão cross-empresa.
    await login_as(
        client, db_session, role="admin_vertical", email="uso_super@torq.com"
    )
    r = await client.get("/vendas/uso/empresas")
    assert r.status_code == 200, r.text
    body = r.json()
    ids = {item["empresa_id"] for item in body["itens"]}
    assert str(empresa_a) in ids
    linha_a = next(
        item for item in body["itens"] if item["empresa_id"] == str(empresa_a)
    )
    por_metrica = {m["metrica"]: m["quantidade"] for m in linha_a["metricas"]}
    assert por_metrica["sdr_conversas"] == 4
    assert linha_a["total"] == 4


@pytest.mark.anyio
async def test_uso_sem_empresa_403(client, db_session):
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    email = "uso_sem_empresa@torq.com"
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

    r = await client.post(
        "/auth/login", json={"email": email, "password": "segredo123"}
    )
    assert r.status_code == 200, r.text

    r = await client.get("/vendas/uso")
    assert r.status_code == 403
