"""Serviço de geração de contas recorrentes mensais.

Porta do edge function ``gerar-contas-recorrentes`` do Supabase.
Idempotente: deduplica por (empresa_id + coluna "Pagamentos Recorrentes" +
fornecedor_id + descricao + categoria + ano/mês de data_vencimento).
"""
import uuid
from datetime import date

from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import generated as m


async def gerar_contas_recorrentes(
    db: AsyncSession, empresa_id: uuid.UUID, ref: date
) -> int:
    """Gera as contas recorrentes da empresa para o mês de ``ref``.

    Returns the number of rows created (0 on a second call — idempotent).
    """
    # 1. Localizar a coluna destino "Pagamentos Recorrentes".
    col = await db.scalar(
        select(m.ContasPagarColunas).where(
            m.ContasPagarColunas.empresa_id == empresa_id,
            m.ContasPagarColunas.nome == "Pagamentos Recorrentes",
        )
    )
    if col is None:
        return 0

    # 2. Buscar todas as contas-template com frequencia_cobranca='recorrente'.
    recorrentes = (
        await db.scalars(
            select(m.ContasPagar).where(
                m.ContasPagar.empresa_id == empresa_id,
                m.ContasPagar.frequencia_cobranca == "recorrente",
            )
        )
    ).all()

    if not recorrentes:
        return 0

    # 3. Prefixo de numeração: REC-YYYY-MM (sequence grows per call within a run).
    prefixo = f"REC-{ref.year}-{ref.month:02d}"

    # Determine the highest existing sequence for this prefix to avoid collisions.
    seq_offset = await db.scalar(
        select(func.count()).where(
            m.ContasPagar.empresa_id == empresa_id,
            m.ContasPagar.numero.like(f"{prefixo}-%"),
        )
    ) or 0

    criadas = 0
    for tpl in recorrentes:
        # 4a. Calcular data de vencimento: mesmo dia (máx 28) no mês ref.
        dia = min(tpl.data_vencimento.day if tpl.data_vencimento else 1, 28)
        venc = date(ref.year, ref.month, dia)

        # 4b. Dedup: já existe uma conta nesta coluna, com mesma descrição,
        #     fornecedor e categoria, para este mês/ano?
        existe = await db.scalar(
            select(m.ContasPagar).where(
                and_(
                    m.ContasPagar.empresa_id == empresa_id,
                    m.ContasPagar.coluna_id == col.id,
                    m.ContasPagar.descricao == tpl.descricao,
                    m.ContasPagar.fornecedor_id == tpl.fornecedor_id,
                    m.ContasPagar.categoria == tpl.categoria,
                    extract("year", m.ContasPagar.data_vencimento) == ref.year,
                    extract("month", m.ContasPagar.data_vencimento) == ref.month,
                )
            )
        )
        if existe:
            continue

        # 4c. Gerar número determinístico para a linha nova.
        seq = seq_offset + criadas + 1
        numero = f"{prefixo}-{seq:03d}"

        # 4d. Valor: fixo → copia; variável → 0 (será ajustado pelo usuário).
        valor = tpl.valor if tpl.tipo_valor_recorrente == "fixo" else 0

        # 4e. Criar a nova conta (unico, previsto).
        db.add(
            m.ContasPagar(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                coluna_id=col.id,
                numero=numero,
                fornecedor_nome=tpl.fornecedor_nome,   # NOT NULL — copia do template
                fornecedor_id=tpl.fornecedor_id,
                descricao=tpl.descricao,
                categoria=tpl.categoria,
                valor=valor,
                data_vencimento=venc,
                frequencia_cobranca="unico",
                status_pagamento="previsto",
            )
        )
        criadas += 1

    await db.commit()
    return criadas


async def gerar_contas_recorrentes_todas_empresas() -> int:
    """Job entry-point: roda para todas as empresas que possuem contas recorrentes."""
    from datetime import date as _date

    from app.core.db import SessionLocal

    total = 0
    async with SessionLocal() as db:
        empresas = (
            await db.scalars(
                select(m.ContasPagar.empresa_id)
                .where(m.ContasPagar.frequencia_cobranca == "recorrente")
                .distinct()
            )
        ).all()
        ref = _date.today().replace(day=1)
        for emp in empresas:
            total += await gerar_contas_recorrentes(db, emp, ref=ref)
    return total
