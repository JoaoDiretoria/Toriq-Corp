async def job_contas_recorrentes() -> None:
    from app.services.contas_recorrentes import gerar_contas_recorrentes_todas_empresas
    await gerar_contas_recorrentes_todas_empresas()


async def job_automacao_colunas() -> None:
    from app.services.automacao_colunas import aplicar_automacao_colunas_todas_empresas
    await aplicar_automacao_colunas_todas_empresas()
