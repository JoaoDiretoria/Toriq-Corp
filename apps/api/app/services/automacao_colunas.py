"""Serviço de automação de colunas por data.

Porta do ``useEffect`` do front-end que move cards entre colunas conforme a data.

v1 — apenas a regra de "Vencidos":
  Contas a Receber com data_vencimento < hoje, status != 'realizado' e
  coluna != 'Vencidos' são movidas para a coluna 'Vencidos'.

TODO: portar as regras de 'Cobrança' / 'Emitir NFe' após análise detalhada do front.
"""
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def aplicar_automacao_colunas(
    db: AsyncSession, empresa_id: uuid.UUID, hoje: date
) -> int:
    """Move contas a receber vencidas para a coluna 'Vencidos'.

    Returns the number of rows moved.
    """
    # Localizar a coluna "Vencidos" da empresa.
    vencidos = await db.scalar(
        select(m.ContasReceberColunas).where(
            m.ContasReceberColunas.empresa_id == empresa_id,
            m.ContasReceberColunas.nome == "Vencidos",
        )
    )
    if vencidos is None:
        return 0

    # Contas a receber atrasadas que ainda não estão na coluna "Vencidos".
    # Nota: ContasReceber usa `data_recebimento` como data de vencimento/prazo.
    atrasadas = (
        await db.scalars(
            select(m.ContasReceber).where(
                m.ContasReceber.empresa_id == empresa_id,
                m.ContasReceber.status_recebimento != "realizado",
                m.ContasReceber.data_recebimento < hoje,
                m.ContasReceber.coluna_id != vencidos.id,
            )
        )
    ).all()

    for conta in atrasadas:
        conta.coluna_id = vencidos.id

    await db.commit()
    return len(atrasadas)


async def aplicar_automacao_colunas_todas_empresas() -> int:
    """Job entry-point: roda para todas as empresas que têm contas a receber."""
    from datetime import date as _date

    from app.core.db import SessionLocal

    total = 0
    async with SessionLocal() as db:
        empresas = (
            await db.scalars(select(m.ContasReceber.empresa_id).distinct())
        ).all()
        hoje = _date.today()
        for emp in empresas:
            total += await aplicar_automacao_colunas(db, emp, hoje=hoje)
    return total
