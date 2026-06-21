async def job_contas_recorrentes() -> None:
    from app.services.contas_recorrentes import gerar_contas_recorrentes_todas_empresas
    await gerar_contas_recorrentes_todas_empresas()


async def job_vencimentos() -> None:
    """Notifica contas a pagar/receber que vencem hoje (diário)."""
    from app.services.notificacoes_vencimentos import notificar_vencimentos_todas_empresas
    await notificar_vencimentos_todas_empresas()


async def job_automacao_colunas() -> None:
    from app.services.automacao_colunas import aplicar_automacao_colunas_todas_empresas
    await aplicar_automacao_colunas_todas_empresas()


async def job_automacoes_agendadas() -> None:
    """Processa as automações de funil agendadas que venceram (~1min)."""
    from app.core.db import SessionLocal
    from app.services.automacoes_engine import processar_agendadas
    async with SessionLocal() as db:
        await processar_agendadas(db)
        await db.commit()


async def job_automacoes_negocio_parado() -> None:
    """Cria atividades para cards parados além do limite (diário)."""
    from app.core.db import SessionLocal
    from app.services.automacoes_engine import processar_negocio_parado
    async with SessionLocal() as db:
        await processar_negocio_parado(db)
        await db.commit()


async def job_disparo_campanhas() -> None:
    """Processa campanhas de disparo (enviando + agendadas vencidas) (~1min).

    O serviço faz commit próprio por campanha; aqui só abrimos a sessão.
    """
    from app.core.db import SessionLocal
    from app.services.vendas_disparo import processar_campanhas_pendentes
    async with SessionLocal() as db:
        await processar_campanhas_pendentes(db)


async def job_sdr_followups() -> None:
    """Dispara os follow-ups automáticos do SDR que venceram (~5min).

    O serviço commita por lead; aqui só abrimos a sessão.
    """
    from app.core.db import SessionLocal
    from app.services.vendas_sdr import processar_followups_pendentes
    async with SessionLocal() as db:
        await processar_followups_pendentes(db)


async def job_sdr_buffers() -> None:
    """Drena os buffers de debounce do SDR (canal Evolution) que venceram (~10s).

    Agrupa mensagens que chegaram rápido e chama o SDR uma vez por lead.
    """
    from app.core.db import SessionLocal
    from app.services.vendas_evolution import processar_sdr_buffers
    async with SessionLocal() as db:
        await processar_sdr_buffers(db)
