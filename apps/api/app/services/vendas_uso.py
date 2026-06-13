"""Toriq Vendas — FASE 5 (Medição & Contratação): serviço de uso.

Registra o consumo do Toriq Vendas por empresa e agrega resumos para o painel
de uso (base para planos/cobrança dos módulos por empresa).

Convenções (seguindo app/services/vendas_disparo.py):
- Tenant SEMPRE por empresa_id (toda agregação é escopada, exceto a visão
  cross-empresa para o super-admin).
- As funções recebem ``db`` e NÃO commitam — quem chama commita.
- ``periodo`` é 'YYYY-MM' do mês corrente (UTC), calculado dentro da função
  (nunca em tempo de import).

Métricas previstas (nomes EXATOS): "apify_runs", "leads_captados",
"emails_enviados", "whatsapp_enviados", "sdr_qualificacoes", "sdr_conversas".
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.generated import Empresas
from app.models.vendas_uso import VendasUso


def periodo_atual() -> str:
    """Período corrente no formato 'YYYY-MM' (mês corrente, UTC)."""
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m")


# ═══════════════════════════════════════════════════════════════════════════════
# Registro de uso
# ═══════════════════════════════════════════════════════════════════════════════

async def registrar_uso(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    metrica: str,
    quantidade: int = 1,
    referencia: Optional[str] = None,
    meta: Optional[dict] = None,
) -> None:
    """Adiciona 1 evento de uso (status pendente de commit pelo chamador)."""
    db.add(
        VendasUso(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            metrica=metrica,
            quantidade=quantidade,
            referencia=referencia,
            meta=meta,
            periodo=periodo_atual(),
        )
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Resumo da própria empresa
# ═══════════════════════════════════════════════════════════════════════════════

async def resumo_uso(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    periodo: Optional[str] = None,
) -> dict:
    """Agrega o uso de UMA empresa por métrica (SUM da quantidade).

    Sem ``periodo`` → acumulado total da empresa.
    Retorna {"empresa_id", "periodo", "metricas": [{"metrica","quantidade"}],
    "total"}.
    """
    stmt = (
        select(
            VendasUso.metrica,
            func.coalesce(func.sum(VendasUso.quantidade), 0),
        )
        .where(VendasUso.empresa_id == empresa_id)
        .group_by(VendasUso.metrica)
        .order_by(VendasUso.metrica)
    )
    if periodo:
        stmt = stmt.where(VendasUso.periodo == periodo)

    rows = (await db.execute(stmt)).all()
    metricas = [{"metrica": m, "quantidade": int(q or 0)} for m, q in rows]
    total = sum(item["quantidade"] for item in metricas)
    return {
        "empresa_id": empresa_id,
        "periodo": periodo,
        "metricas": metricas,
        "total": total,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Resumo cross-empresa (super-admin / cobrança)
# ═══════════════════════════════════════════════════════════════════════════════

async def resumo_por_empresa(
    db: AsyncSession,
    *,
    periodo: Optional[str] = None,
) -> dict:
    """Agrega o uso de TODAS as empresas por (empresa, métrica) com SUM.

    Faz JOIN com ``empresas`` para o nome da empresa. Visão cross-empresa para
    o super-admin (admin_vertical) acompanhar consumo p/ cobrança.

    Sem ``periodo`` → acumulado total.
    Retorna {"periodo", "itens": [{"empresa_id","empresa_nome","metricas":[...],
    "total"}]}.
    """
    stmt = (
        select(
            VendasUso.empresa_id,
            Empresas.nome,
            VendasUso.metrica,
            func.coalesce(func.sum(VendasUso.quantidade), 0),
        )
        .join(Empresas, Empresas.id == VendasUso.empresa_id)
        .group_by(VendasUso.empresa_id, Empresas.nome, VendasUso.metrica)
        .order_by(Empresas.nome, VendasUso.metrica)
    )
    if periodo:
        stmt = stmt.where(VendasUso.periodo == periodo)

    rows = (await db.execute(stmt)).all()

    # Agrupa as métricas por empresa, preservando a ordem de aparição.
    por_empresa: dict[uuid.UUID, dict] = {}
    for empresa_id, empresa_nome, metrica, quantidade in rows:
        item = por_empresa.get(empresa_id)
        if item is None:
            item = {
                "empresa_id": empresa_id,
                "empresa_nome": empresa_nome,
                "metricas": [],
                "total": 0,
            }
            por_empresa[empresa_id] = item
        qtd = int(quantidade or 0)
        item["metricas"].append({"metrica": metrica, "quantidade": qtd})
        item["total"] += qtd

    return {"periodo": periodo, "itens": list(por_empresa.values())}
