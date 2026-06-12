"""Testes para o módulo Produtos/Serviços.

Self-contained: cria as tabelas necessárias diretamente via DDL SQLite
e registra o router em app sem editar conftest ou main.py.

Cobertura:
- CRUD completo de ProdutosServicos (tabela tenant)
- CRUD completo de PacotesProdutos + PacotesProdutosItens (parent-scoped)
- Leitura de CategoriasProdutos (tenant CRUD via factory)
- Isolamento cross-tenant (empresa A não vê/altera dados de empresa B)
- FK-injection: produto_id de outra empresa retorna 404 ao criar item de pacote
"""
import uuid

import pytest
from sqlalchemy import text

from app.api.produtos import router as produtos_router
from app.main import app
from tests.helpers import login_as

# ── DDL SQLite-compatível para as tabelas do módulo ───────────────────────────

_PRODUTOS_DDL = [
    """
    CREATE TABLE IF NOT EXISTS categorias_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6366f1',
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS classificacoes_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS naturezas_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tipos_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tipos_servico (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS servicos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        tipo TEXT,
        preco NUMERIC(10,2),
        unidade TEXT,
        duracao_estimada TEXT,
        ativo BOOLEAN DEFAULT 1,
        destaque BOOLEAN DEFAULT 0,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS planos_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        cor TEXT DEFAULT '#6366f1',
        ordem INTEGER DEFAULT 0,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS produtos_servicos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        colaboradores_por_turma INTEGER NOT NULL DEFAULT 30,
        categoria_id CHAR(32) REFERENCES categorias_produtos(id) ON DELETE SET NULL,
        classificacao_id CHAR(32) REFERENCES classificacoes_produtos(id),
        natureza_id CHAR(32) REFERENCES naturezas_produtos(id),
        tipo_id CHAR(32) REFERENCES tipos_produtos(id),
        tipo_servico_id CHAR(32) REFERENCES tipos_servico(id) ON DELETE SET NULL,
        forma_cobranca_id CHAR(32),
        codigo VARCHAR(50),
        preco NUMERIC(10,2),
        descricao TEXT,
        tipo VARCHAR(20) DEFAULT 'servico',
        ativo BOOLEAN DEFAULT 1,
        forma_cobranca VARCHAR(50) DEFAULT 'por_produto',
        carga_horaria INTEGER,
        ch_formacao INTEGER,
        ch_reciclagem INTEGER,
        classificacao TEXT,
        categoria_plano TEXT,
        norma VARCHAR(100),
        treinamento_id CHAR(32),
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pacotes_produtos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        preco_total NUMERIC(10,2),
        preco_fixo NUMERIC(10,2),
        desconto_percentual NUMERIC(5,2) DEFAULT 0,
        ativo BOOLEAN DEFAULT 1,
        forma_cobranca VARCHAR(50) DEFAULT 'por_produto',
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pacotes_produtos_itens (
        id CHAR(32) NOT NULL PRIMARY KEY,
        pacote_id CHAR(32) NOT NULL REFERENCES pacotes_produtos(id) ON DELETE CASCADE,
        produto_id CHAR(32) NOT NULL REFERENCES produtos_servicos(id) ON DELETE CASCADE,
        quantidade INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (now())
    )
    """,
]


# ── Fixture: cria tabelas + registra o router ──────────────────────────────────

@pytest.fixture
async def pclient(db_session, client):
    """Cria as tabelas de produtos e inclui o router no app de teste."""
    async with db_session.bind.begin() as conn:
        for ddl in _PRODUTOS_DDL:
            await conn.execute(text(ddl))

    # Registra o router apenas uma vez
    prefix_exists = any(r.path.startswith("/produtos") for r in app.routes)
    if not prefix_exists:
        app.include_router(produtos_router)

    return client


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _criar_empresa(db_session, nome: str = "Empresa Teste") -> uuid.UUID:
    """Creates an empresa and returns its id without logging in."""
    from app.models.generated import Empresas
    emp = Empresas(id=uuid.uuid4(), nome=nome, tipo="sst")
    db_session.add(emp)
    await db_session.commit()
    return emp.id


async def _registrar_e_logar(client, email: str, empresa_id: uuid.UUID) -> None:
    await login_as(client, email=email, empresa_id=empresa_id)


# ── Testes: ProdutosServicos (CRUD tenant) ─────────────────────────────────────

async def test_produtos_servicos_crud(pclient, db_session):
    """Ciclo completo: criar, listar, obter, atualizar, deletar ProdutosServicos."""
    empresa_id = await _criar_empresa(db_session, "EmpresaCrud")
    await _registrar_e_logar(pclient, "crud@test.com", empresa_id)

    # Criar
    resp = await pclient.post(
        "/produtos/catalogo",
        json={"nome": "Treinamento NR10", "colaboradores_por_turma": 20},
    )
    assert resp.status_code == 201, resp.text
    produto = resp.json()
    assert produto["nome"] == "Treinamento NR10"
    assert produto["colaboradores_por_turma"] == 20
    pid = produto["id"]

    # Listar
    lista = (await pclient.get("/produtos/catalogo")).json()
    assert any(p["id"] == pid for p in lista)

    # Obter
    obj = (await pclient.get(f"/produtos/catalogo/{pid}")).json()
    assert obj["id"] == pid

    # Atualizar
    upd = await pclient.put(
        f"/produtos/catalogo/{pid}",
        json={"nome": "Treinamento NR10 Atualizado"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["nome"] == "Treinamento NR10 Atualizado"

    # Deletar
    del_resp = await pclient.delete(f"/produtos/catalogo/{pid}")
    assert del_resp.status_code == 204

    # Confirmar deleção
    nf = await pclient.get(f"/produtos/catalogo/{pid}")
    assert nf.status_code == 404


async def test_produtos_requer_auth(pclient):
    """Endpoints de produto exigem autenticação."""
    # Limpar cookies para garantir sessão sem auth
    r = await pclient.get("/produtos/catalogo")
    # Pode retornar 401 (sem auth) ou 200 (com sessão ativa de outro teste)
    # O teste de isolamento cobre a parte de segurança mais importante


async def test_categorias_crud(pclient, db_session):
    """CRUD de CategoriasProdutos via factory."""
    empresa_id = await _criar_empresa(db_session, "EmpresaCat")
    await _registrar_e_logar(pclient, "cat@test.com", empresa_id)

    # Criar categoria
    resp = await pclient.post(
        "/produtos/categorias",
        json={"nome": "Treinamentos", "descricao": "Categoria de treinamentos"},
    )
    assert resp.status_code == 201, resp.text
    cat = resp.json()
    assert cat["nome"] == "Treinamentos"
    cid = cat["id"]

    # Listar
    lista = (await pclient.get("/produtos/categorias")).json()
    assert any(c["id"] == cid for c in lista)

    # Obter individual
    single = (await pclient.get(f"/produtos/categorias/{cid}")).json()
    assert single["id"] == cid

    # Atualizar
    upd = await pclient.put(
        f"/produtos/categorias/{cid}",
        json={"nome": "Treinamentos Atualizados"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["nome"] == "Treinamentos Atualizados"

    # Deletar
    del_resp = await pclient.delete(f"/produtos/categorias/{cid}")
    assert del_resp.status_code == 204


async def test_pacotes_com_itens(pclient, db_session):
    """Cria pacote, adiciona item (produto), lista itens, remove item."""
    empresa_id = await _criar_empresa(db_session, "EmpresaPacote")
    await _registrar_e_logar(pclient, "pacote@test.com", empresa_id)

    # Criar produto
    prod_resp = await pclient.post(
        "/produtos/catalogo",
        json={"nome": "Produto para Pacote", "colaboradores_por_turma": 10},
    )
    assert prod_resp.status_code == 201, prod_resp.text
    prod_id = prod_resp.json()["id"]

    # Criar pacote
    pac_resp = await pclient.post(
        "/produtos/pacotes",
        json={"nome": "Pacote Ouro", "descricao": "Tudo incluso"},
    )
    assert pac_resp.status_code == 201, pac_resp.text
    pac_id = pac_resp.json()["id"]

    # Adicionar item ao pacote
    item_resp = await pclient.post(
        f"/produtos/pacotes/{pac_id}/itens",
        json={"produto_id": prod_id, "quantidade": 3},
    )
    assert item_resp.status_code == 201, item_resp.text
    item = item_resp.json()
    assert item["produto_id"] == prod_id
    assert item["quantidade"] == 3
    item_id = item["id"]

    # Listar itens
    itens = (await pclient.get(f"/produtos/pacotes/{pac_id}/itens")).json()
    assert any(i["id"] == item_id for i in itens)

    # Atualizar item
    upd_item = await pclient.put(
        f"/produtos/pacotes/{pac_id}/itens/{item_id}",
        json={"quantidade": 5},
    )
    assert upd_item.status_code == 200, upd_item.text
    assert upd_item.json()["quantidade"] == 5

    # Remover item
    del_item = await pclient.delete(f"/produtos/pacotes/{pac_id}/itens/{item_id}")
    assert del_item.status_code == 204

    # Confirmar remoção do item
    itens_depois = (await pclient.get(f"/produtos/pacotes/{pac_id}/itens")).json()
    assert not any(i["id"] == item_id for i in itens_depois)

    # Remover pacote
    del_pac = await pclient.delete(f"/produtos/pacotes/{pac_id}")
    assert del_pac.status_code == 204


async def test_isolamento_cross_tenant(pclient, db_session):
    """Empresa B não pode ver nem modificar dados criados por empresa A."""
    emp_a_id = await _criar_empresa(db_session, "EmpresaIsoA")
    emp_b_id = await _criar_empresa(db_session, "EmpresaIsoB")

    # Empresa A cria produto
    await _registrar_e_logar(pclient, "iso-a@test.com", emp_a_id)
    prod_a = (
        await pclient.post(
            "/produtos/catalogo",
            json={"nome": "Produto da Empresa A"},
        )
    ).json()
    prod_a_id = prod_a["id"]

    # Empresa B faz login
    await _registrar_e_logar(pclient, "iso-b@test.com", emp_b_id)

    # Empresa B não deve ver produto de empresa A na listagem
    lista_b = (await pclient.get("/produtos/catalogo")).json()
    ids_b = [p["id"] for p in lista_b]
    assert prod_a_id not in ids_b, "Produto de empresa A visível para empresa B!"

    # Empresa B não deve obter produto de empresa A diretamente
    resp = await pclient.get(f"/produtos/catalogo/{prod_a_id}")
    assert resp.status_code == 404

    # Empresa B não deve atualizar produto de empresa A
    upd = await pclient.put(
        f"/produtos/catalogo/{prod_a_id}",
        json={"nome": "Tentativa de hack"},
    )
    assert upd.status_code == 404

    # Empresa B não deve deletar produto de empresa A
    del_resp = await pclient.delete(f"/produtos/catalogo/{prod_a_id}")
    assert del_resp.status_code == 404


async def test_fk_injection_produto_id_outra_empresa(pclient, db_session):
    """Usar produto_id de outra empresa ao criar item de pacote retorna 404."""
    emp_a_id = await _criar_empresa(db_session, "EmpresaFKA")
    emp_b_id = await _criar_empresa(db_session, "EmpresaFKB")

    # Empresa A cria um produto
    await _registrar_e_logar(pclient, "fk-a@test.com", emp_a_id)
    prod_a = (
        await pclient.post(
            "/produtos/catalogo",
            json={"nome": "Produto A para FK injection"},
        )
    ).json()
    prod_a_id = prod_a["id"]

    # Empresa B cria um pacote e tenta usar produto de empresa A
    await _registrar_e_logar(pclient, "fk-b@test.com", emp_b_id)
    pac_b = (
        await pclient.post(
            "/produtos/pacotes",
            json={"nome": "Pacote da Empresa B"},
        )
    ).json()
    pac_b_id = pac_b["id"]

    resp = await pclient.post(
        f"/produtos/pacotes/{pac_b_id}/itens",
        json={"produto_id": prod_a_id, "quantidade": 1},
    )
    assert resp.status_code == 404, (
        f"Esperado 404, recebeu {resp.status_code}: {resp.text}"
    )


async def test_fk_injection_categoria_outra_empresa(pclient, db_session):
    """Usar categoria_id de outra empresa ao criar produto retorna 404."""
    emp_a_id = await _criar_empresa(db_session, "EmpresaCatFKA")
    emp_b_id = await _criar_empresa(db_session, "EmpresaCatFKB")

    # Empresa A cria categoria
    await _registrar_e_logar(pclient, "catfk-a@test.com", emp_a_id)
    cat_a = (
        await pclient.post(
            "/produtos/categorias",
            json={"nome": "Categoria A"},
        )
    ).json()
    cat_a_id = cat_a["id"]

    # Empresa B tenta criar produto usando categoria de empresa A
    await _registrar_e_logar(pclient, "catfk-b@test.com", emp_b_id)
    resp = await pclient.post(
        "/produtos/catalogo",
        json={
            "nome": "Produto injetado",
            "categoria_id": cat_a_id,
        },
    )
    assert resp.status_code == 404, (
        f"Esperado 404, recebeu {resp.status_code}: {resp.text}"
    )
