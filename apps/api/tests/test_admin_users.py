"""Testes do subsistema de gestão de usuários (admin) + troca de senha."""
import uuid

import pytest
from sqlalchemy import select

from app.models.generated import Empresas
from app.models.user import User
from tests.helpers import login_as


async def _nova_empresa(db_session) -> uuid.UUID:
    eid = uuid.uuid4()
    db_session.add(Empresas(id=eid, nome="E", tipo="sst"))
    await db_session.commit()
    return eid


async def test_admin_vertical_cria_usuario_e_loga(client, db_session):
    await login_as(client, db_session, role="admin_vertical", email="adm@v.com")
    alvo = await _nova_empresa(db_session)

    r = await client.post(
        "/admin/users",
        json={"email": "novo@x.com", "nome": "Novo", "role": "cliente_torq",
              "empresa_id": str(alvo)},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["empresa_id"] == str(alvo)
    assert "senha_hash" not in body  # nunca vaza
    temp = body["temp_password"]
    assert temp and len(temp) >= 12

    # o usuário criado consegue logar com a senha temporária retornada
    login = await client.post("/auth/login", json={"email": "novo@x.com", "password": temp})
    assert login.status_code == 200


async def test_cliente_torq_cria_na_propria_empresa(client, db_session):
    emp = await login_as(client, db_session, role="cliente_torq", email="dono@e.com")
    r = await client.post(
        "/admin/users",
        json={"email": "func@e.com", "nome": "Func", "role": "instrutor"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["empresa_id"] == str(emp)


async def test_cliente_torq_nao_cria_em_outra_empresa(client, db_session):
    await login_as(client, db_session, role="cliente_torq", email="dono2@e.com")
    outra = await _nova_empresa(db_session)
    r = await client.post(
        "/admin/users",
        json={"email": "x@y.com", "nome": "X", "role": "instrutor",
              "empresa_id": str(outra)},
    )
    assert r.status_code == 403


async def test_cliente_torq_nao_cria_admin_vertical(client, db_session):
    await login_as(client, db_session, role="cliente_torq", email="dono3@e.com")
    r = await client.post(
        "/admin/users",
        json={"email": "z@y.com", "nome": "Z", "role": "admin_vertical"},
    )
    assert r.status_code == 403


async def test_email_duplicado_409(client, db_session):
    await login_as(client, db_session, role="admin_vertical", email="adm2@v.com")
    alvo = await _nova_empresa(db_session)
    payload = {"email": "dup@x.com", "nome": "D", "role": "instrutor", "empresa_id": str(alvo)}
    assert (await client.post("/admin/users", json=payload)).status_code == 201
    assert (await client.post("/admin/users", json=payload)).status_code == 409


async def test_cross_tenant_get_put_delete_404(client, db_session):
    # cria usuário na empresa B (via admin_vertical)
    await login_as(client, db_session, role="admin_vertical", email="adm3@v.com")
    emp_b = await _nova_empresa(db_session)
    r = await client.post(
        "/admin/users",
        json={"email": "alvo@b.com", "nome": "Alvo", "role": "instrutor", "empresa_id": str(emp_b)},
    )
    alvo_id = r.json()["id"]

    # cliente_torq da empresa A não enxerga o usuário da empresa B
    await login_as(client, db_session, role="cliente_torq", email="donoA@a.com")
    assert (await client.put(f"/admin/users/{alvo_id}", json={"nome": "Hack"})).status_code == 404
    assert (await client.delete(f"/admin/users/{alvo_id}")).status_code == 404


async def test_reset_password(client, db_session):
    await login_as(client, db_session, role="admin_vertical", email="adm4@v.com")
    alvo = await _nova_empresa(db_session)
    r = await client.post(
        "/admin/users",
        json={"email": "rp@x.com", "nome": "RP", "role": "instrutor", "empresa_id": str(alvo)},
    )
    uid = r.json()["id"]
    rp = await client.post(f"/admin/users/{uid}/reset-password", json={})
    assert rp.status_code == 200
    nova = rp.json()["temp_password"]
    assert nova
    login = await client.post("/auth/login", json={"email": "rp@x.com", "password": nova})
    assert login.status_code == 200


async def test_soft_delete_e_nao_pode_desativar_a_si(client, db_session):
    await login_as(client, db_session, role="admin_vertical", email="adm5@v.com")
    me = await db_session.scalar(select(User).where(User.email == "adm5@v.com"))
    # não pode desativar a si mesmo
    assert (await client.delete(f"/admin/users/{me.id}")).status_code == 400

    alvo = await _nova_empresa(db_session)
    r = await client.post(
        "/admin/users",
        json={"email": "del@x.com", "nome": "Del", "role": "instrutor", "empresa_id": str(alvo)},
    )
    uid = r.json()["id"]
    d = await client.delete(f"/admin/users/{uid}")
    assert d.status_code == 200
    assert d.json()["ativo"] is False


async def test_cliente_torq_nao_toca_admin_vertical_da_mesma_empresa(client, db_session):
    """Anti-escalonamento: cliente_torq não reseta/edita/desativa um admin_vertical."""
    # cria um admin_vertical e um cliente_torq na MESMA empresa
    emp = await login_as(client, db_session, role="admin_vertical", email="chefe@e.com")
    await login_as(client, db_session, role="cliente_torq", email="sub@e.com", empresa_id=emp)
    admin = await db_session.scalar(select(User).where(User.email == "chefe@e.com"))

    # agora logado como cliente_torq (último login_as), tenta tocar o admin_vertical → 404
    assert (await client.post(f"/admin/users/{admin.id}/reset-password", json={})).status_code == 404
    assert (await client.put(f"/admin/users/{admin.id}", json={"nome": "Hack"})).status_code == 404
    assert (await client.delete(f"/admin/users/{admin.id}")).status_code == 404


async def test_senha_fraca_rejeitada_422(client, db_session):
    await login_as(client, db_session, role="admin_vertical", email="adm7@v.com")
    alvo = await _nova_empresa(db_session)
    r = await client.post(
        "/admin/users",
        json={"email": "fraca@x.com", "nome": "F", "role": "instrutor",
              "empresa_id": str(alvo), "password": "123"},
    )
    assert r.status_code == 422


async def test_change_password(client, db_session):
    await login_as(client, db_session, role="cliente_torq",
                   email="cp@e.com", password="senhaAntiga1")
    # senha atual errada → 401
    bad = await client.post(
        "/auth/change-password",
        json={"current_password": "errada", "new_password": "novaSenha2"},
    )
    assert bad.status_code == 401
    # sucesso → 204
    ok = await client.post(
        "/auth/change-password",
        json={"current_password": "senhaAntiga1", "new_password": "novaSenha2"},
    )
    assert ok.status_code == 204
    # loga com a nova senha
    login = await client.post("/auth/login", json={"email": "cp@e.com", "password": "novaSenha2"})
    assert login.status_code == 200


async def test_lista_escopada_por_tenant(client, db_session):
    # admin_vertical cria usuário na empresa B
    await login_as(client, db_session, role="admin_vertical", email="adm6@v.com")
    emp_b = await _nova_empresa(db_session)
    await client.post(
        "/admin/users",
        json={"email": "lb@b.com", "nome": "LB", "role": "instrutor", "empresa_id": str(emp_b)},
    )
    # cliente_torq da empresa A só vê os da própria empresa
    emp_a = await login_as(client, db_session, role="cliente_torq", email="donoL@a.com")
    r = await client.get("/admin/users")
    assert r.status_code == 200
    empresas = {u["empresa_id"] for u in r.json()}
    assert empresas <= {str(emp_a)}  # nada de outra empresa
