import uuid

import pytest

from app.models.vendas_instagram import VendasInstagramGatilhos
from tests.helpers import login_as


@pytest.mark.asyncio
async def test_gatilho_model_insere(db_session):
    """A tabela existe (migration aplicada) e o model insere/consulta."""
    from sqlalchemy import select
    from app.models.generated import Empresas

    emp = await db_session.scalar(select(Empresas).limit(1))
    assert emp is not None, "precisa de ao menos 1 empresa no DB de teste"

    g = VendasInstagramGatilhos(
        id=uuid.uuid4(), empresa_id=emp.id, palavra_chave="preco",
        responder_publico=True, responder_dm=True,
    )
    db_session.add(g)
    await db_session.flush()
    achado = await db_session.scalar(
        select(VendasInstagramGatilhos).where(VendasInstagramGatilhos.id == g.id)
    )
    assert achado is not None
    assert achado.responder_dm is True
