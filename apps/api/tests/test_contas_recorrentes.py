"""Task 4 — Testes do serviço de geração de contas recorrentes.

Prova que o serviço:
  - cria exatamente 1 conta na primeira chamada
  - retorna 0 na segunda chamada para o mesmo mês (idempotente)
"""
import uuid
from datetime import date

import pytest

from app.services.contas_recorrentes import gerar_contas_recorrentes


@pytest.fixture
async def setup(db_session):
    from app.models.generated import ContasPagar, ContasPagarColunas, Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="E", tipo="sst"))

    col = ContasPagarColunas(
        id=uuid.uuid4(),
        empresa_id=emp,
        nome="Pagamentos Recorrentes",
        ordem=1,
    )
    db_session.add(col)

    # Template: conta recorrente com valor fixo.
    db_session.add(
        ContasPagar(
            id=uuid.uuid4(),
            empresa_id=emp,
            coluna_id=col.id,
            numero="TPL-001",
            fornecedor_nome="Fornecedor Teste",
            descricao="Aluguel",
            valor=1000,
            frequencia_cobranca="recorrente",
            tipo_valor_recorrente="fixo",
            data_vencimento=date(2026, 1, 10),
        )
    )
    await db_session.commit()
    return db_session, emp


async def test_gera_uma_e_eh_idempotente(setup):
    db, emp = setup
    n1 = await gerar_contas_recorrentes(db, emp, ref=date(2026, 6, 1))
    n2 = await gerar_contas_recorrentes(db, emp, ref=date(2026, 6, 1))
    assert n1 == 1   # criou 1 conta no primeiro run
    assert n2 == 0   # segundo run no mesmo mês não duplica


async def test_gera_para_meses_distintos(setup):
    """Meses diferentes devem gerar contas independentes."""
    db, emp = setup
    n_jun = await gerar_contas_recorrentes(db, emp, ref=date(2026, 6, 1))
    n_jul = await gerar_contas_recorrentes(db, emp, ref=date(2026, 7, 1))
    assert n_jun == 1
    assert n_jul == 1   # julho é um mês diferente → gera normalmente


async def test_sem_coluna_recorrente_retorna_zero(db_session):
    """Empresa sem coluna 'Pagamentos Recorrentes' → retorna 0 sem erros."""
    from app.models.generated import Empresas

    emp = uuid.uuid4()
    db_session.add(Empresas(id=emp, nome="SemColuna", tipo="sst"))
    await db_session.commit()

    n = await gerar_contas_recorrentes(db_session, emp, ref=date(2026, 6, 1))
    assert n == 0
