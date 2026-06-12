"""Testes para o módulo SST — cadastros base.

Cobre:
- CRUD de clientes_sst (via endpoints explícitos com empresa_sst_id)
- CRUD de colaboradores (via factory)
- CRUD de cargos (via factory)
- Isolamento cross-tenant: cliente de outra empresa → 404
- Filhos parent-scoped: contatos e unidades de cliente
- Contato de cliente de outra empresa → 404
"""
import uuid

import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client, db_session, email: str, password: str = "segredo123"):
    """Cria empresa + usuário e faz login; retorna empresa_id."""
    from app.models.generated import Empresas as Empresa

    emp = Empresa(id=uuid.uuid4(), nome="Emp-" + email, tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    r = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nome": "Usuário SST",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    assert r.status_code in (200, 201), r.text

    r = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert r.status_code in (200, 201), r.text
    return emp.id


# ── Cargos ────────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_cargos_crud(client, db_session):
    await _register_and_login(client, db_session, "cargos@sst.com")

    # Criar
    r = await client.post("/sst/cargos", json={"nome": "Soldador"})
    assert r.status_code == 201, r.text
    cargo_id = r.json()["id"]

    # Listar
    r = await client.get("/sst/cargos")
    assert r.status_code == 200
    assert any(c["nome"] == "Soldador" for c in r.json())

    # Obter
    r = await client.get(f"/sst/cargos/{cargo_id}")
    assert r.status_code == 200
    assert r.json()["nome"] == "Soldador"

    # Atualizar
    r = await client.put(f"/sst/cargos/{cargo_id}", json={"nome": "Soldador Sênior"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Soldador Sênior"

    # Deletar
    r = await client.delete(f"/sst/cargos/{cargo_id}")
    assert r.status_code == 204

    r = await client.get(f"/sst/cargos/{cargo_id}")
    assert r.status_code == 404


# ── Colaboradores ─────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_colaboradores_crud(client, db_session):
    await _register_and_login(client, db_session, "colab@sst.com")

    r = await client.post("/sst/colaboradores", json={"nome": "João Silva", "cargo": "Eletricista"})
    assert r.status_code == 201, r.text
    colab_id = r.json()["id"]

    r = await client.get("/sst/colaboradores")
    assert r.status_code == 200
    assert any(c["nome"] == "João Silva" for c in r.json())

    r = await client.put(f"/sst/colaboradores/{colab_id}", json={"setor": "Manutenção"})
    assert r.status_code == 200
    assert r.json()["setor"] == "Manutenção"

    r = await client.delete(f"/sst/colaboradores/{colab_id}")
    assert r.status_code == 204


# ── ClientesSst — CRUD ────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_cliente_crud(client, db_session):
    await _register_and_login(client, db_session, "sst@sst.com")

    # Criar
    r = await client.post("/sst/clientes", json={"nome": "Cliente A", "cnpj": "12.345.678/0001-99"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nome"] == "Cliente A"
    cliente_id = data["id"]

    # Listar
    r = await client.get("/sst/clientes")
    assert r.status_code == 200
    assert any(c["nome"] == "Cliente A" for c in r.json())

    # Obter
    r = await client.get(f"/sst/clientes/{cliente_id}")
    assert r.status_code == 200
    assert r.json()["cnpj"] == "12.345.678/0001-99"

    # Atualizar
    r = await client.put(f"/sst/clientes/{cliente_id}", json={"nome": "Cliente A Atualizado"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Cliente A Atualizado"

    # Deletar
    r = await client.delete(f"/sst/clientes/{cliente_id}")
    assert r.status_code == 204

    r = await client.get(f"/sst/clientes/{cliente_id}")
    assert r.status_code == 404


# ── Isolamento cross-tenant — cliente de outra empresa ────────────────────────

@pytest.mark.anyio
async def test_cliente_cross_tenant_404(client, db_session):
    """Empresa A não deve conseguir acessar cliente da Empresa B."""
    # Empresa A cria seu cliente
    await _register_and_login(client, db_session, "empresa_a@sst.com")
    r = await client.post("/sst/clientes", json={"nome": "Cliente Empresa A"})
    assert r.status_code == 201
    cliente_a_id = r.json()["id"]

    # Empresa B faz login
    await _register_and_login(client, db_session, "empresa_b@sst.com")

    # Empresa B não deve ver o cliente da Empresa A
    r = await client.get(f"/sst/clientes/{cliente_a_id}")
    assert r.status_code == 404

    # Empresa B não deve conseguir atualizar o cliente da Empresa A
    r = await client.put(f"/sst/clientes/{cliente_a_id}", json={"nome": "Hackeado"})
    assert r.status_code == 404

    # Empresa B não deve conseguir deletar o cliente da Empresa A
    r = await client.delete(f"/sst/clientes/{cliente_a_id}")
    assert r.status_code == 404


# ── Contatos (parent-scoped) ──────────────────────────────────────────────────

@pytest.mark.anyio
async def test_contatos_crud(client, db_session):
    await _register_and_login(client, db_session, "contatos@sst.com")

    r = await client.post("/sst/clientes", json={"nome": "Cliente Contatos"})
    assert r.status_code == 201
    cliente_id = r.json()["id"]

    # Criar contato
    r = await client.post(
        f"/sst/clientes/{cliente_id}/contatos",
        json={"nome": "Maria Santos", "cargo": "Gerente", "email": "maria@empresa.com"},
    )
    assert r.status_code == 201, r.text
    contato_id = r.json()["id"]
    assert r.json()["nome"] == "Maria Santos"

    # Listar
    r = await client.get(f"/sst/clientes/{cliente_id}/contatos")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Atualizar
    r = await client.put(
        f"/sst/clientes/{cliente_id}/contatos/{contato_id}",
        json={"cargo": "Diretora"},
    )
    assert r.status_code == 200
    assert r.json()["cargo"] == "Diretora"

    # Deletar
    r = await client.delete(f"/sst/clientes/{cliente_id}/contatos/{contato_id}")
    assert r.status_code == 204


@pytest.mark.anyio
async def test_contatos_cross_tenant_404(client, db_session):
    """Empresa A não pode acessar contatos de cliente da Empresa B."""
    # Empresa A cria cliente e contato
    await _register_and_login(client, db_session, "conta_a@sst.com")
    r = await client.post("/sst/clientes", json={"nome": "Cliente A"})
    assert r.status_code == 201
    cliente_a_id = r.json()["id"]

    r = await client.post(
        f"/sst/clientes/{cliente_a_id}/contatos",
        json={"nome": "Contato A"},
    )
    assert r.status_code == 201

    # Empresa B tenta acessar
    await _register_and_login(client, db_session, "conta_b@sst.com")
    r = await client.get(f"/sst/clientes/{cliente_a_id}/contatos")
    assert r.status_code == 404


# ── Unidades (parent-scoped) ──────────────────────────────────────────────────

@pytest.mark.anyio
async def test_unidades_crud(client, db_session):
    await _register_and_login(client, db_session, "unidades@sst.com")

    r = await client.post("/sst/clientes", json={"nome": "Cliente Unidades"})
    assert r.status_code == 201
    cliente_id = r.json()["id"]

    # Criar unidade
    r = await client.post(
        f"/sst/clientes/{cliente_id}/unidades",
        json={"razao_social": "Filial SP", "cidade": "São Paulo", "uf": "SP"},
    )
    assert r.status_code == 201, r.text
    unidade_id = r.json()["id"]
    assert r.json()["razao_social"] == "Filial SP"

    # Listar
    r = await client.get(f"/sst/clientes/{cliente_id}/unidades")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Atualizar
    r = await client.put(
        f"/sst/clientes/{cliente_id}/unidades/{unidade_id}",
        json={"cidade": "Campinas"},
    )
    assert r.status_code == 200
    assert r.json()["cidade"] == "Campinas"

    # Deletar
    r = await client.delete(f"/sst/clientes/{cliente_id}/unidades/{unidade_id}")
    assert r.status_code == 204


# ── Riscos ────────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_riscos_crud(client, db_session):
    await _register_and_login(client, db_session, "riscos@sst.com")

    r = await client.post(
        "/sst/riscos",
        json={"nome": "Ruído excessivo", "tipo": "fisico", "severidade": "alto"},
    )
    assert r.status_code == 201, r.text
    risco_id = r.json()["id"]

    r = await client.get("/sst/riscos")
    assert r.status_code == 200
    assert any(rc["nome"] == "Ruído excessivo" for rc in r.json())

    r = await client.delete(f"/sst/riscos/{risco_id}")
    assert r.status_code == 204


# ── Perigos ───────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_perigos_crud(client, db_session):
    await _register_and_login(client, db_session, "perigos@sst.com")

    r = await client.post("/sst/perigos", json={"nome": "Piso escorregadio", "categoria": "ergonomico"})
    assert r.status_code == 201, r.text
    perigo_id = r.json()["id"]

    r = await client.get("/sst/perigos")
    assert r.status_code == 200
    assert any(p["nome"] == "Piso escorregadio" for p in r.json())

    r = await client.delete(f"/sst/perigos/{perigo_id}")
    assert r.status_code == 204


# ── GruposClientes ────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_grupos_clientes_crud(client, db_session):
    await _register_and_login(client, db_session, "grupos@sst.com")

    r = await client.post("/sst/grupos-clientes", json={"nome": "Indústria"})
    assert r.status_code == 201, r.text
    grupo_id = r.json()["id"]

    r = await client.get("/sst/grupos-clientes")
    assert r.status_code == 200
    assert any(g["nome"] == "Indústria" for g in r.json())

    r = await client.put(f"/sst/grupos-clientes/{grupo_id}", json={"nome": "Indústria Metalúrgica"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Indústria Metalúrgica"

    r = await client.delete(f"/sst/grupos-clientes/{grupo_id}")
    assert r.status_code == 204


# ── CategoriasClientes — global, read-only ────────────────────────────────────

@pytest.mark.anyio
async def test_categorias_clientes_read_only(client, db_session):
    """CategoriasClientes é tabela global — GET disponível, sem tenant filter."""
    from app.models.generated import CategoriasClientes

    # Inserir dado diretamente no banco de teste
    cat = CategoriasClientes(id=uuid.uuid4(), nome="Categoria Teste")
    db_session.add(cat)
    await db_session.commit()

    # Não precisa estar autenticado para listar (endpoint público de referência)
    r = await client.get("/sst/categorias-clientes")
    assert r.status_code == 200
    nomes = [c["nome"] for c in r.json()]
    assert "Categoria Teste" in nomes

    # Obter por ID
    r = await client.get(f"/sst/categorias-clientes/{cat.id}")
    assert r.status_code == 200
    assert r.json()["nome"] == "Categoria Teste"
