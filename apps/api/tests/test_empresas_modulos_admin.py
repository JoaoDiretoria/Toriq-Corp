"""Testes da administração cross-tenant de módulos por empresa (super admin).

Cobre /empresas/{empresa_id}/modulos* — restritos a admin_vertical, escopo pelo
path. O ponto central (regressão do bug): o vínculo cai na empresa-ALVO, não na
empresa do admin que está logado.
"""
import uuid

import pytest
from sqlalchemy import text

from tests.helpers import login_as


async def _criar_empresa(db_session, nome: str = "Alvo") -> uuid.UUID:
    from app.models.generated import Empresas
    emp = Empresas(id=uuid.uuid4(), nome=nome, tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    return emp.id


async def _criar_modulo(db_session, nome: str = "Toriq Corp", rota: str = "/sst") -> str:
    mid = uuid.uuid4().hex
    await db_session.execute(
        text(
            "INSERT INTO modulos (id, nome, rota, created_at) "
            "VALUES (:id, :nome, :rota, now())"
        ),
        {"id": mid, "nome": nome, "rota": rota},
    )
    await db_session.commit()
    return str(uuid.UUID(mid))


async def _login_admin(client, db_session, email="admin@test.com") -> uuid.UUID:
    """Loga como admin_vertical e devolve o empresa_id DO ADMIN."""
    return await login_as(client, db_session, role="admin_vertical", email=email)


# ── Vínculo cai na empresa-alvo (regressão do bug) ────────────────────────────

async def test_admin_vincula_modulo_na_empresa_alvo(client, db_session):
    admin_emp = await _login_admin(client, db_session)
    alvo = await _criar_empresa(db_session, "EmpAlvo")
    mid = await _criar_modulo(db_session)

    r = await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": True})
    assert r.status_code == 200, r.text
    assert r.json()["empresa_id"] == str(alvo)
    assert r.json()["modulo_id"] == mid
    assert r.json()["ativo"] is True

    # GET na empresa-alvo lista o vínculo.
    lista = (await client.get(f"/empresas/{alvo}/modulos")).json()
    assert any(e["modulo_id"] == mid and e["ativo"] for e in lista)


async def test_vinculo_nao_vaza_para_empresa_do_admin(client, db_session):
    """O cerne do bug: ativar módulo para a empresa-alvo NÃO grava na do admin."""
    admin_emp = await _login_admin(client, db_session, email="admin2@test.com")
    alvo = await _criar_empresa(db_session, "EmpAlvo2")
    mid = await _criar_modulo(db_session)

    await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": True})

    # A empresa do admin continua SEM vínculo.
    lista_admin = (await client.get(f"/empresas/{admin_emp}/modulos")).json()
    assert all(e["modulo_id"] != mid for e in lista_admin), (
        "vínculo vazou para a empresa do admin!"
    )


# ── Upsert idempotente ────────────────────────────────────────────────────────

async def test_upsert_idempotente(client, db_session):
    await _login_admin(client, db_session, email="admin3@test.com")
    alvo = await _criar_empresa(db_session, "EmpUpsert")
    mid = await _criar_modulo(db_session)

    r1 = await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": True})
    assert r1.status_code == 200
    r2 = await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": False})
    assert r2.status_code == 200
    assert r2.json()["id"] == r1.json()["id"], "upsert duplicou o vínculo"
    assert r2.json()["ativo"] is False

    lista = (await client.get(f"/empresas/{alvo}/modulos")).json()
    assert len([e for e in lista if e["modulo_id"] == mid]) == 1


async def test_desativar_e_remover(client, db_session):
    await _login_admin(client, db_session, email="admin4@test.com")
    alvo = await _criar_empresa(db_session, "EmpDel")
    mid = await _criar_modulo(db_session)

    await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": True})
    r_del = await client.delete(f"/empresas/{alvo}/modulos/{mid}")
    assert r_del.status_code == 204, r_del.text

    lista = (await client.get(f"/empresas/{alvo}/modulos")).json()
    assert all(e["modulo_id"] != mid for e in lista)

    # DELETE de novo → 404 (não há vínculo).
    r_del2 = await client.delete(f"/empresas/{alvo}/modulos/{mid}")
    assert r_del2.status_code == 404


# ── PUT telas reconcilia o conjunto ───────────────────────────────────────────

async def test_definir_telas_reconcilia_conjunto(client, db_session):
    await _login_admin(client, db_session, email="admin5@test.com")
    alvo = await _criar_empresa(db_session, "EmpTelas")
    mid = await _criar_modulo(db_session)

    # Conjunto inicial {a, b}
    r1 = await client.put(
        f"/empresas/{alvo}/modulos/{mid}/telas", json={"tela_ids": ["a", "b"]}
    )
    assert r1.status_code == 200, r1.text
    assert {t["tela_id"] for t in r1.json()} == {"a", "b"}

    # Novo conjunto {b, c} — 'a' sai, 'c' entra, 'b' permanece.
    r2 = await client.put(
        f"/empresas/{alvo}/modulos/{mid}/telas", json={"tela_ids": ["b", "c"]}
    )
    assert r2.status_code == 200, r2.text
    ativas = {t["tela_id"] for t in r2.json() if t["ativo"]}
    assert ativas == {"b", "c"}

    # GET plano da empresa também reflete só {b, c}.
    todas = (await client.get(f"/empresas/{alvo}/modulos-telas")).json()
    do_modulo = {t["tela_id"] for t in todas if t["modulo_id"] == mid}
    assert do_modulo == {"b", "c"}


# ── Autorização e validação ───────────────────────────────────────────────────

async def test_nao_admin_recebe_403(client, db_session):
    await login_as(client, db_session, role="cliente_torq", email="comum@test.com")
    alvo = await _criar_empresa(db_session, "EmpProibida")
    mid = await _criar_modulo(db_session)

    r = await client.put(f"/empresas/{alvo}/modulos/{mid}", json={"ativo": True})
    assert r.status_code == 403, r.text
    assert (await client.get(f"/empresas/{alvo}/modulos")).status_code == 403


async def test_empresa_inexistente_404(client, db_session):
    await _login_admin(client, db_session, email="admin6@test.com")
    mid = await _criar_modulo(db_session)
    inexistente = uuid.uuid4()

    r = await client.put(f"/empresas/{inexistente}/modulos/{mid}", json={"ativo": True})
    assert r.status_code == 404, r.text


async def test_modulo_inexistente_404(client, db_session):
    await _login_admin(client, db_session, email="admin7@test.com")
    alvo = await _criar_empresa(db_session, "EmpSemModulo")
    inexistente = uuid.uuid4()

    r = await client.put(f"/empresas/{alvo}/modulos/{inexistente}", json={"ativo": True})
    assert r.status_code == 404, r.text


async def test_nao_autenticado_401(client, db_session):
    alvo = await _criar_empresa(db_session, "EmpAuth")
    client.cookies.clear()
    assert (await client.get(f"/empresas/{alvo}/modulos")).status_code == 401
