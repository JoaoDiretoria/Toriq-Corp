"""Testes do subsistema de gestão de usuários (admin) + troca de senha."""
import uuid

import pytest
from sqlalchemy import select

from app.models.generated import Empresas, Profiles
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


async def test_first_access_password(client, db_session):
    """1º acesso: troca senha sem exigir a atual; 2ª vez bloqueia (409)."""
    await login_as(client, db_session, role="cliente_torq", email="fa@e.com", password="tempSenha1")
    r = await client.post("/auth/first-access-password", json={"new_password": "NovaForte1"})
    assert r.status_code == 204, r.text
    # senha_alterada virou True → nova tentativa 409
    r2 = await client.post("/auth/first-access-password", json={"new_password": "OutraForte2"})
    assert r2.status_code == 409
    # loga com a nova senha
    login = await client.post("/auth/login", json={"email": "fa@e.com", "password": "NovaForte1"})
    assert login.status_code == 200


async def test_hierarquia_escopada_e_campos(client, db_session):
    """/admin/users/hierarquia: cliente_torq vê só a própria empresa e os
    campos de organização (gestor_id/grupo_acesso) chegam ao cliente."""
    # empresa B com um profile (criado por admin_vertical)
    await login_as(client, db_session, role="admin_vertical", email="advh@v.com")
    emp_b = await _nova_empresa(db_session)
    rb = await client.post(
        "/admin/users",
        json={"email": "hb@b.com", "nome": "HB", "role": "instrutor", "empresa_id": str(emp_b)},
    )
    # garante o profile da empresa B (o /admin/users cria só o user)
    hb_id = uuid.UUID(rb.json()["id"])
    if await db_session.scalar(select(Profiles).where(Profiles.id == hb_id)) is None:
        db_session.add(Profiles(id=hb_id, email="hb@b.com", nome="HB", role="instrutor", empresa_id=emp_b))
        await db_session.commit()

    # empresa A: um gestor e um colaborador subordinado a ele
    emp_a = await login_as(client, db_session, role="cliente_torq", email="gestorA@a.com")
    gestor = await db_session.scalar(select(Profiles).where(Profiles.email == "gestorA@a.com"))
    gestor.grupo_acesso = "gestor"
    await login_as(client, db_session, role="cliente_torq", email="subA@a.com", empresa_id=emp_a)
    sub = await db_session.scalar(select(Profiles).where(Profiles.email == "subA@a.com"))
    sub.grupo_acesso = "colaborador"
    sub.gestor_id = gestor.id
    await db_session.commit()

    # logado como subA (cliente_torq) → só enxerga profiles da empresa A
    r = await client.get("/admin/users/hierarquia")
    assert r.status_code == 200, r.text
    por_id = {u["id"]: u for u in r.json()}
    assert str(hb_id) not in por_id  # nada da empresa B
    assert str(gestor.id) in por_id and str(sub.id) in por_id
    assert por_id[str(sub.id)]["gestor_id"] == str(gestor.id)
    assert por_id[str(sub.id)]["grupo_acesso"] == "colaborador"


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


async def test_campos_estendidos_criacao(client, db_session):
    """Campos estendidos de perfil devem ser gravados no Profiles na criação."""
    await login_as(client, db_session, role="admin_vertical", email="admext1@v.com")
    alvo = await _nova_empresa(db_session)

    r = await client.post(
        "/admin/users",
        json={
            "email": "extcreate@x.com",
            "nome": "ExtCreate",
            "role": "cliente_torq",
            "empresa_id": str(alvo),
            "telefone": "(11) 91234-5678",
            "cpf": "123.456.789-09",
            "cep": "01310-100",
            "logradouro": "Av. Paulista",
            "numero": "1000",
            "complemento": "Apto 42",
            "bairro": "Bela Vista",
            "cidade": "São Paulo",
            "uf": "SP",
            "grupo_acesso": "colaborador",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["telefone"] == "(11) 91234-5678"
    assert body["cpf"] == "123.456.789-09"
    assert body["cidade"] == "São Paulo"
    assert body["uf"] == "SP"
    assert body["grupo_acesso"] == "colaborador"

    # confirmar que Profiles foi gravado no banco
    user = await db_session.scalar(
        select(Profiles).where(Profiles.email == "extcreate@x.com")
    )
    assert user is not None
    assert user.telefone == "(11) 91234-5678"
    assert user.cidade == "São Paulo"
    assert user.grupo_acesso == "colaborador"


async def test_campos_estendidos_atualizacao(client, db_session):
    """Campos estendidos de perfil devem ser atualizados no Profiles no PUT."""
    await login_as(client, db_session, role="admin_vertical", email="admext2@v.com")
    alvo = await _nova_empresa(db_session)

    # criar sem campos estendidos
    rc = await client.post(
        "/admin/users",
        json={"email": "extupdate@x.com", "nome": "ExtUpdate", "role": "cliente_torq",
              "empresa_id": str(alvo)},
    )
    assert rc.status_code == 201, rc.text
    uid = rc.json()["id"]

    # atualizar com campos estendidos
    ru = await client.put(
        f"/admin/users/{uid}",
        json={
            "nome": "ExtUpdate Editado",
            "telefone": "(21) 98765-4321",
            "bairro": "Centro",
            "cidade": "Rio de Janeiro",
            "uf": "RJ",
            "grupo_acesso": "gestor",
        },
    )
    assert ru.status_code == 200, ru.text
    body = ru.json()
    assert body["nome"] == "ExtUpdate Editado"
    assert body["telefone"] == "(21) 98765-4321"
    assert body["cidade"] == "Rio de Janeiro"
    assert body["grupo_acesso"] == "gestor"

    # confirmar que Profiles foi atualizado no banco
    profile = await db_session.scalar(
        select(Profiles).where(Profiles.email == "extupdate@x.com")
    )
    assert profile is not None
    assert profile.telefone == "(21) 98765-4321"
    assert profile.cidade == "Rio de Janeiro"
    assert profile.grupo_acesso == "gestor"
