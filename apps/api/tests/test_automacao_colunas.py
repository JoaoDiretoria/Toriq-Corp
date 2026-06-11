"""Task 5 — Testes do serviço de automação de colunas por data.

Prova que o serviço move contas a receber com data_recebimento < hoje
e status != 'realizado' para a coluna 'Vencidos'.

Nota: ContasReceber usa `data_recebimento` como data de vencimento/prazo
(campo alinhado ao frontend AdminContasReceber.tsx).
"""
import uuid
from datetime import date, timedelta

import pytest

from app.services.automacao_colunas import aplicar_automacao_colunas


@pytest.fixture
async def setup(db_session):
    from app.models.generated import ContasReceber, ContasReceberColunas, Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E", tipo="sst"))

    a = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="A Receber", ordem=0)
    v = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="Vencidos", ordem=3)
    db_session.add_all([a, v])

    db_session.add(
        ContasReceber(
            id=uuid.uuid4(),
            empresa_id=emp,
            coluna_id=a.id,
            numero="CR-001",
            cliente_nome="Cliente Teste",
            valor=50,
            status_recebimento="previsto",
            data_recebimento=date.today() - timedelta(days=5),
        )
    )
    await db_session.commit()
    return db_session, emp, a.id, v.id


async def test_move_vencida_para_coluna_vencidos(setup):
    db, emp, a_id, v_id = setup
    movidas = await aplicar_automacao_colunas(db, emp, hoje=date.today())
    assert movidas == 1


async def test_nao_move_conta_realizada(db_session):
    """Conta já realizada não deve ser movida para 'Vencidos'."""
    from app.models.generated import ContasReceber, ContasReceberColunas, Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E2", tipo="sst"))
    a = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="A Receber", ordem=0)
    v = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="Vencidos", ordem=3)
    db_session.add_all([a, v])
    db_session.add(
        ContasReceber(
            id=uuid.uuid4(),
            empresa_id=emp,
            coluna_id=a.id,
            numero="CR-002",
            cliente_nome="Cliente Realizado",
            valor=100,
            status_recebimento="realizado",
            data_recebimento=date.today() - timedelta(days=10),
        )
    )
    await db_session.commit()
    movidas = await aplicar_automacao_colunas(db_session, emp, hoje=date.today())
    assert movidas == 0


async def test_nao_move_conta_futura(db_session):
    """Conta com data_recebimento futura não deve ser movida."""
    from app.models.generated import ContasReceber, ContasReceberColunas, Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E3", tipo="sst"))
    a = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="A Receber", ordem=0)
    v = ContasReceberColunas(id=uuid.uuid4(), empresa_id=emp, nome="Vencidos", ordem=3)
    db_session.add_all([a, v])
    db_session.add(
        ContasReceber(
            id=uuid.uuid4(),
            empresa_id=emp,
            coluna_id=a.id,
            numero="CR-003",
            cliente_nome="Cliente Futuro",
            valor=200,
            status_recebimento="previsto",
            data_recebimento=date.today() + timedelta(days=30),
        )
    )
    await db_session.commit()
    movidas = await aplicar_automacao_colunas(db_session, emp, hoje=date.today())
    assert movidas == 0


async def test_sem_coluna_vencidos_retorna_zero(db_session):
    """Empresa sem coluna 'Vencidos' → retorna 0 sem erros."""
    from app.models.generated import Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="SemVencidos", tipo="sst"))
    await db_session.commit()

    n = await aplicar_automacao_colunas(db_session, emp, hoje=date.today())
    assert n == 0
