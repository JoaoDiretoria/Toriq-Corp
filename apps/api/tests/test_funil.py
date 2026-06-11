"""Testes do módulo Funil / CRM genérico — Tasks 1, 2 e 3."""
import uuid


# ── Helper de login ───────────────────────────────────────────────────────────

async def _login(client, db_session, email="fu@fu.com", suffix=""):
    from app.models.generated import Empresas as Empresa
    from sqlalchemy import text

    emp = Empresa(id=uuid.uuid4(), nome=f"E{suffix}", tipo="sst")
    db_session.add(emp)
    await db_session.commit()

    # Insert setor via raw SQL to avoid ORM mapping all the extra Setores columns
    # that are not in our simplified SQLite DDL.
    setor_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO setores (id, empresa_id, nome) VALUES (:id, :empresa_id, :nome)"
        ),
        {"id": setor_id.hex, "empresa_id": emp.id.hex, "nome": f"Setor{suffix}"},
    )
    await db_session.commit()

    # Return a simple namespace so callers can access setor.id
    class _Setor:
        id = setor_id

    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "segredo123",
            "nome": f"FU{suffix}",
            "role": "cliente_torq",
            "empresa_id": str(emp.id),
        },
    )
    await client.post("/auth/login", json={"email": email, "password": "segredo123"})
    return emp, _Setor()


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 1 — Funis + etapas + criação de config padrão
# ═══════════════════════════════════════════════════════════════════════════════

async def test_criar_funil_negocio_cria_config_padrao(client, db_session):
    """Criar funil 'negocio' deve criar 1 configuração com card_mostrar_valor=True."""
    emp, setor = await _login(client, db_session)

    r = await client.post(
        "/funil/funis",
        json={"nome": "Vendas", "tipo": "negocio", "setor_id": str(setor.id)},
    )
    assert r.status_code == 201, r.text
    fid = r.json()["id"]

    cfg = await client.get(f"/funil/funis/{fid}/configuracao")
    assert cfg.status_code == 200, cfg.text
    body = cfg.json()
    # card_mostrar_valor deve ser True para funis do tipo 'negocio'
    assert body["card_mostrar_valor"] is True
    assert body["dashboard_visivel"] is True


async def test_criar_funil_fluxo_trabalho_config_sem_valor(client, db_session):
    """Criar funil 'fluxo_trabalho' deve criar configuração com card_mostrar_valor=False."""
    emp, setor = await _login(client, db_session, email="ft@ft.com", suffix="ft")

    r = await client.post(
        "/funil/funis",
        json={"nome": "Onboarding", "tipo": "fluxo_trabalho", "setor_id": str(setor.id)},
    )
    assert r.status_code == 201, r.text
    fid = r.json()["id"]

    cfg = await client.get(f"/funil/funis/{fid}/configuracao")
    assert cfg.status_code == 200, cfg.text
    body = cfg.json()
    assert body["card_mostrar_valor"] is False
    assert body["dashboard_visivel"] is False


async def test_listar_funis(client, db_session):
    emp, setor = await _login(client, db_session, email="lf@lf.com", suffix="lf")

    await client.post(
        "/funil/funis",
        json={"nome": "Funil A", "tipo": "negocio", "setor_id": str(setor.id)},
    )
    await client.post(
        "/funil/funis",
        json={"nome": "Funil B", "tipo": "fluxo_trabalho", "setor_id": str(setor.id)},
    )

    r = await client.get("/funil/funis")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_crud_etapas(client, db_session):
    emp, setor = await _login(client, db_session, email="et@et.com", suffix="et")

    funil_r = await client.post(
        "/funil/funis",
        json={"nome": "Funil Etapas", "tipo": "negocio", "setor_id": str(setor.id)},
    )
    funil_id = funil_r.json()["id"]

    # Criar etapa
    etapa_r = await client.post(
        "/funil/etapas",
        json={"funil_id": funil_id, "nome": "Prospecção", "ordem": 0},
    )
    assert etapa_r.status_code == 201, etapa_r.text
    etapa_id = etapa_r.json()["id"]
    assert etapa_r.json()["nome"] == "Prospecção"

    # Obter etapa
    get_r = await client.get(f"/funil/etapas/{etapa_id}")
    assert get_r.status_code == 200

    # Atualizar etapa
    put_r = await client.put(
        f"/funil/etapas/{etapa_id}",
        json={"funil_id": funil_id, "nome": "Qualificação", "ordem": 0},
    )
    assert put_r.status_code == 200
    assert put_r.json()["nome"] == "Qualificação"

    # Listar etapas do funil
    list_r = await client.get(f"/funil/etapas?funil_id={funil_id}")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1


async def test_etapa_nao_pertence_a_funil_de_outra_empresa(client, db_session):
    """Empresa A não deve ver etapa criada por empresa B."""
    emp_a, setor_a = await _login(client, db_session, email="a@a.com", suffix="a")
    funil_r = await client.post(
        "/funil/funis",
        json={"nome": "Funil A", "tipo": "negocio", "setor_id": str(setor_a.id)},
    )
    funil_id_a = funil_r.json()["id"]
    etapa_r = await client.post(
        "/funil/etapas",
        json={"funil_id": funil_id_a, "nome": "Etapa A", "ordem": 0},
    )
    etapa_id_a = etapa_r.json()["id"]

    # Logar como empresa B
    emp_b, setor_b = await _login(client, db_session, email="b@b.com", suffix="b")
    get_r = await client.get(f"/funil/etapas/{etapa_id_a}")
    assert get_r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 2 — Cards: CRUD + mover + reorder + histórico
# ═══════════════════════════════════════════════════════════════════════════════

async def _setup_funil_com_etapas(client, email, suffix, setor_id, funil_nome="Funil"):
    """Cria um funil com duas etapas e retorna (funil_id, etapa1_id, etapa2_id)."""
    funil_r = await client.post(
        "/funil/funis",
        json={"nome": funil_nome, "tipo": "negocio", "setor_id": str(setor_id)},
    )
    funil_id = funil_r.json()["id"]

    e1 = await client.post(
        "/funil/etapas",
        json={"funil_id": funil_id, "nome": "Etapa 1", "ordem": 0},
    )
    e2 = await client.post(
        "/funil/etapas",
        json={"funil_id": funil_id, "nome": "Etapa 2", "ordem": 1},
    )
    return funil_id, e1.json()["id"], e2.json()["id"]


async def test_criar_card_e_mover_com_historico(client, db_session):
    """Criar card, mover para outra etapa, verificar etapa_id e movimentação registrada."""
    emp, setor = await _login(client, db_session, email="card@card.com", suffix="card")
    funil_id, etapa1_id, etapa2_id = await _setup_funil_com_etapas(
        client, "card@card.com", "card", setor.id
    )

    # Criar card na etapa 1
    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa1_id, "titulo": "Negócio X"},
    )
    assert card_r.status_code == 201, card_r.text
    card_id = card_r.json()["id"]
    assert card_r.json()["etapa_id"] == etapa1_id

    # Mover para etapa 2
    mover_r = await client.post(
        f"/funil/cards/{card_id}/mover",
        json={"etapa_destino_id": etapa2_id, "justificativa": "avançou negócio"},
    )
    assert mover_r.status_code == 200, mover_r.text
    assert mover_r.json()["etapa_id"] == etapa2_id

    # Verificar que a movimentação foi registrada via DB (raw SQL to avoid
    # SQLite UUID type coercion issues with the UUID Mapped column).
    from sqlalchemy import text as _text

    rows = (
        await db_session.execute(
            _text(
                "SELECT etapa_origem_id, etapa_destino_id FROM funil_card_movimentacoes"
                " WHERE card_id = :cid"
            ),
            {"cid": uuid.UUID(card_id).hex},
        )
    ).fetchall()
    assert len(rows) == 1
    # SQLite stores UUIDs as hex strings without dashes; normalise for comparison
    def _norm(v):
        return v.replace("-", "") if v else v

    assert _norm(rows[0][0]) == uuid.UUID(etapa1_id).hex
    assert _norm(rows[0][1]) == uuid.UUID(etapa2_id).hex


async def test_reorder_cards(client, db_session):
    emp, setor = await _login(client, db_session, email="reorder@reorder.com", suffix="ro")
    funil_id, etapa1_id, _ = await _setup_funil_com_etapas(
        client, "reorder@reorder.com", "ro", setor.id
    )

    c1 = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa1_id, "titulo": "Card 1", "ordem": 0},
    )
    c2 = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa1_id, "titulo": "Card 2", "ordem": 1},
    )
    id1 = c1.json()["id"]
    id2 = c2.json()["id"]

    resp = await client.patch(
        "/funil/cards/reorder",
        json=[{"id": id1, "ordem": 10}, {"id": id2, "ordem": 5}],
    )
    assert resp.status_code == 204

    updated1 = (await client.get(f"/funil/cards/{id1}")).json()
    updated2 = (await client.get(f"/funil/cards/{id2}")).json()
    assert updated1["ordem"] == 10
    assert updated2["ordem"] == 5


async def test_card_de_outra_empresa_inacessivel(client, db_session):
    """Card da empresa A não deve ser acessível pela empresa B."""
    emp_a, setor_a = await _login(client, db_session, email="ca@ca.com", suffix="ca")
    funil_id, etapa_id, _ = await _setup_funil_com_etapas(
        client, "ca@ca.com", "ca", setor_a.id
    )
    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": "Privado"},
    )
    card_id = card_r.json()["id"]

    # Logar como empresa B
    emp_b, setor_b = await _login(client, db_session, email="cb@cb.com", suffix="cb")
    get_r = await client.get(f"/funil/cards/{card_id}")
    assert get_r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# TASK 3 — Etiquetas (M:N) e atividades
# ═══════════════════════════════════════════════════════════════════════════════

async def test_etiquetas_crud_e_associar_ao_card(client, db_session):
    """Criar etiqueta, associar ao card, listar etiquetas do card, desassociar."""
    emp, setor = await _login(client, db_session, email="etq@etq.com", suffix="etq")
    funil_id, etapa_id, _ = await _setup_funil_com_etapas(
        client, "etq@etq.com", "etq", setor.id
    )

    # Criar card
    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": "Card Etiqueta"},
    )
    card_id = card_r.json()["id"]

    # Criar etiqueta
    etq_r = await client.post(
        "/funil/etiquetas",
        json={"nome": "VIP", "cor": "#FF0000"},
    )
    assert etq_r.status_code == 201, etq_r.text
    etq_id = etq_r.json()["id"]

    # Associar ao card
    assoc_r = await client.post(
        f"/funil/cards/{card_id}/etiquetas",
        json={"etiqueta_id": etq_id},
    )
    assert assoc_r.status_code == 201, assoc_r.text

    # Listar etiquetas do card
    list_r = await client.get(f"/funil/cards/{card_id}/etiquetas")
    assert list_r.status_code == 200
    etiquetas = list_r.json()
    assert len(etiquetas) == 1
    assert etiquetas[0]["nome"] == "VIP"

    # Desassociar
    del_r = await client.delete(f"/funil/cards/{card_id}/etiquetas/{etq_id}")
    assert del_r.status_code == 204

    # Verificar que foi removida
    list_r2 = await client.get(f"/funil/cards/{card_id}/etiquetas")
    assert len(list_r2.json()) == 0


async def test_associar_etiqueta_duplicada_idempotente(client, db_session):
    """Associar a mesma etiqueta duas vezes não deve retornar erro nem duplicar."""
    emp, setor = await _login(client, db_session, email="dup@dup.com", suffix="dup")
    funil_id, etapa_id, _ = await _setup_funil_com_etapas(
        client, "dup@dup.com", "dup", setor.id
    )
    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": "Card Dup"},
    )
    card_id = card_r.json()["id"]
    etq_r = await client.post("/funil/etiquetas", json={"nome": "Dup"})
    etq_id = etq_r.json()["id"]

    await client.post(f"/funil/cards/{card_id}/etiquetas", json={"etiqueta_id": etq_id})
    # Segunda associação deve retornar 201 (idempotente)
    r2 = await client.post(f"/funil/cards/{card_id}/etiquetas", json={"etiqueta_id": etq_id})
    assert r2.status_code == 201

    list_r = await client.get(f"/funil/cards/{card_id}/etiquetas")
    assert len(list_r.json()) == 1


async def test_atividades_do_card(client, db_session):
    """Criar atividade no card, listar, atualizar e remover."""
    emp, setor = await _login(client, db_session, email="atv@atv.com", suffix="atv")
    funil_id, etapa_id, _ = await _setup_funil_com_etapas(
        client, "atv@atv.com", "atv", setor.id
    )

    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": "Card Atividade"},
    )
    card_id = card_r.json()["id"]

    # Criar atividade
    atv_r = await client.post(
        f"/funil/cards/{card_id}/atividades",
        json={"tipo": "tarefa", "descricao": "Ligar para cliente", "status": "a_realizar"},
    )
    assert atv_r.status_code == 201, atv_r.text
    atv_id = atv_r.json()["id"]
    assert atv_r.json()["descricao"] == "Ligar para cliente"

    # Listar atividades
    list_r = await client.get(f"/funil/cards/{card_id}/atividades")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1

    # Atualizar atividade
    put_r = await client.put(
        f"/funil/cards/{card_id}/atividades/{atv_id}",
        json={"tipo": "tarefa", "descricao": "Ligar para cliente", "status": "realizada"},
    )
    assert put_r.status_code == 200
    assert put_r.json()["status"] == "realizada"

    # Remover atividade
    del_r = await client.delete(f"/funil/cards/{card_id}/atividades/{atv_id}")
    assert del_r.status_code == 204

    list_r2 = await client.get(f"/funil/cards/{card_id}/atividades")
    assert len(list_r2.json()) == 0


async def test_etiqueta_de_outra_empresa_nao_associavel(client, db_session):
    """Etiqueta da empresa A não deve ser associável a card da empresa B."""
    # Empresa A cria etiqueta
    emp_a, setor_a = await _login(client, db_session, email="ea@ea.com", suffix="ea")
    etq_r = await client.post("/funil/etiquetas", json={"nome": "Etiqueta A"})
    etq_id_a = etq_r.json()["id"]

    # Empresa B cria card
    emp_b, setor_b = await _login(client, db_session, email="eb@eb.com", suffix="eb")
    funil_id, etapa_id, _ = await _setup_funil_com_etapas(
        client, "eb@eb.com", "eb", setor_b.id
    )
    card_r = await client.post(
        "/funil/cards",
        json={"funil_id": funil_id, "etapa_id": etapa_id, "titulo": "Card B"},
    )
    card_id = card_r.json()["id"]

    # Tentar associar etiqueta da empresa A ao card da empresa B
    assoc_r = await client.post(
        f"/funil/cards/{card_id}/etiquetas",
        json={"etiqueta_id": etq_id_a},
    )
    assert assoc_r.status_code == 404
