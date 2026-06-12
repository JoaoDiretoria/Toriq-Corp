"""Testes do módulo Empresas (raiz do tenant)."""
import uuid

import pytest

from app.api.empresas import router as empresas_router
from app.main import app
from tests.helpers import login_as


@pytest.fixture(autouse=True, scope="module")
def _mount_router():
    already = any(getattr(r, "path", "") == "/empresas/me" for r in app.routes)
    if not already:
        app.include_router(empresas_router)
    yield


async def test_obter_minha_empresa(client, db_session):
    empresa_id = await login_as(client, db_session, email="emp_me@e.com")
    r = await client.get("/empresas/me")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == str(empresa_id)
    assert body["nome"] == "E"
    # Campos sensíveis do certificado NÃO devem ser expostos
    assert "certificado_a1_base64" not in body
    assert "certificado_a1_senha" not in body


async def test_usuario_comum_obtem_so_propria_empresa(client, db_session):
    """Usuário comum não pode obter empresa de outra empresa → 403."""
    empresa_a = await login_as(client, db_session, email="ec_a@e.com")
    # Empresa B existe mas o usuário A não deve acessá-la
    empresa_b = uuid.uuid4()
    from app.models.generated import Empresas
    db_session.add(Empresas(id=empresa_b, nome="B", tipo="sst"))
    await db_session.commit()

    # A própria empresa: OK
    own = await client.get(f"/empresas/{empresa_a}")
    assert own.status_code == 200

    # Empresa de outro: 403
    other = await client.get(f"/empresas/{empresa_b}")
    assert other.status_code == 403, other.text


async def test_admin_lista_todas_empresas(client, db_session):
    """admin_vertical lista todas; usuário comum recebe 403."""
    # Usuário comum primeiro
    await login_as(client, db_session, email="comum@e.com", role="cliente_torq")
    forbidden = await client.get("/empresas")
    assert forbidden.status_code == 403, forbidden.text

    # admin_vertical
    await login_as(client, db_session, email="adm@e.com", role="admin_vertical")
    r = await client.get("/empresas")
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


async def test_admin_atualiza_propria_empresa(client, db_session):
    """admin da empresa pode atualizar SÓ a própria empresa."""
    empresa_id = await login_as(client, db_session, email="adm2@e.com", role="admin_vertical")
    r = await client.put(f"/empresas/{empresa_id}", json={"nome": "Nova Razão"})
    assert r.status_code == 200, r.text
    assert r.json()["nome"] == "Nova Razão"

    # Não pode editar outra empresa
    outra = uuid.uuid4()
    from app.models.generated import Empresas
    db_session.add(Empresas(id=outra, nome="Outra", tipo="sst"))
    await db_session.commit()
    bad = await client.put(f"/empresas/{outra}", json={"nome": "Hack"})
    assert bad.status_code == 403, bad.text


# ── POST / DELETE /empresas ────────────────────────────────────────────────────

async def test_admin_vertical_cria_qualquer_tipo(client, db_session):
    await login_as(client, db_session, email="advc@e.com", role="admin_vertical")
    r = await client.post("/empresas", json={"nome": "Nova SST", "tipo": "sst"})
    assert r.status_code == 201, r.text
    assert r.json()["nome"] == "Nova SST"
    assert r.json()["tipo"] == "sst"


async def test_cliente_torq_cria_subtenant_mas_nao_peer(client, db_session):
    await login_as(client, db_session, email="ctc@e.com", role="cliente_torq")
    # sub-tenant permitido
    ok = await client.post("/empresas", json={"nome": "Cliente X", "tipo": "cliente_final"})
    assert ok.status_code == 201, ok.text
    # peer sst proibido
    bad = await client.post("/empresas", json={"nome": "Peer", "tipo": "sst"})
    assert bad.status_code == 403, bad.text


async def test_cria_tipo_invalido_422(client, db_session):
    await login_as(client, db_session, email="inv@e.com", role="admin_vertical")
    r = await client.post("/empresas", json={"nome": "X", "tipo": "inexistente"})
    assert r.status_code == 422, r.text


async def test_delete_empresa_admin_e_403_para_comum(client, db_session):
    # admin cria e deleta uma empresa sem dependências
    await login_as(client, db_session, email="del@e.com", role="admin_vertical")
    criada = await client.post("/empresas", json={"nome": "Descartável", "tipo": "lead"})
    eid = criada.json()["id"]
    d = await client.delete(f"/empresas/{eid}")
    assert d.status_code == 204, d.text
    # sumiu
    assert (await client.get(f"/empresas/{eid}")).status_code == 404

    # usuário comum não deleta
    await login_as(client, db_session, email="comumd@e.com", role="cliente_torq")
    outra = uuid.uuid4()
    from app.models.generated import Empresas
    db_session.add(Empresas(id=outra, nome="O", tipo="sst"))
    await db_session.commit()
    assert (await client.delete(f"/empresas/{outra}")).status_code == 403


# ── Contatos da empresa ─────────────────────────────────────────────────────────

async def test_contatos_crud_e_isolamento(client, db_session):
    empresa_a = await login_as(client, db_session, email="contA@e.com", role="cliente_torq")

    # cria contato na própria empresa
    c = await client.post(
        f"/empresas/{empresa_a}/contatos",
        json={"nome": "João", "cargo": "Gerente", "principal": True},
    )
    assert c.status_code == 201, c.text
    contato_id = c.json()["id"]
    assert c.json()["empresa_id"] == str(empresa_a)

    # lista
    lst = await client.get(f"/empresas/{empresa_a}/contatos")
    assert lst.status_code == 200
    assert any(x["id"] == contato_id for x in lst.json())

    # atualiza
    u = await client.put(
        f"/empresas/{empresa_a}/contatos/{contato_id}", json={"cargo": "Diretor"}
    )
    assert u.status_code == 200 and u.json()["cargo"] == "Diretor"

    # isolamento: contatos de outra empresa → 404
    outra = uuid.uuid4()
    from app.models.generated import Empresas
    db_session.add(Empresas(id=outra, nome="B", tipo="sst"))
    await db_session.commit()
    assert (await client.get(f"/empresas/{outra}/contatos")).status_code == 404
    assert (
        await client.post(f"/empresas/{outra}/contatos", json={"nome": "X"})
    ).status_code == 404

    # deleta
    d = await client.delete(f"/empresas/{empresa_a}/contatos/{contato_id}")
    assert d.status_code == 204
    assert (await client.get(f"/empresas/{empresa_a}/contatos")).json() == []
