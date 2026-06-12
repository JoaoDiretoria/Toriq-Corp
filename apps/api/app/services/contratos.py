"""Serviço de numeração sequencial de contratos.

Porta da função `generate_contrato_numero` do DB:
  TQ-{ano}-{seq:04d}  por empresa por ano corrente.

Executar DENTRO da mesma transação do INSERT do contrato garante atomicidade;
para concorrência alta, o índice único em (empresa_id, numero) impede duplicatas
— o INSERT duplicado falharia com IntegrityError (tratável com retry se necessário).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def proximo_numero_contrato(db: AsyncSession, empresa_id: uuid.UUID) -> str:
    """Gera o próximo número de contrato da empresa no ano corrente: TQ-{ano}-{seq:04d}.

    Conta os contratos existentes da empresa cujo numero começa com TQ-{ano}-
    e retorna o próximo na sequência. Deve ser chamado dentro da mesma transação
    do INSERT do contrato para evitar race condition.
    """
    ano = datetime.now(tz=timezone.utc).year
    prefixo = f"TQ-{ano}-"
    qtd = await db.scalar(
        select(func.count()).select_from(m.Contratos).where(
            m.Contratos.empresa_id == empresa_id,
            m.Contratos.numero.like(f"{prefixo}%"),
        )
    )
    return f"{prefixo}{(qtd or 0) + 1:04d}"
