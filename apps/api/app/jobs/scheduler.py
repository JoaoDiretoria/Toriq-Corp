from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


def build_scheduler() -> AsyncIOScheduler:
    """Cria o scheduler e registra os jobs (sem iniciá-lo).

    Os callables são importados tardiamente para evitar ciclos de import.
    """
    from app.jobs.tasks import job_automacao_colunas, job_contas_recorrentes

    sched = AsyncIOScheduler(timezone="America/Sao_Paulo")
    # Dia 1 de cada mês, 00:10 — gera as contas recorrentes do mês.
    sched.add_job(
        job_contas_recorrentes, CronTrigger(day=1, hour=0, minute=10),
        id="contas_recorrentes_mensal", replace_existing=True,
    )
    # Todo dia 00:05 — move cards de CP/CR por data (vencidos, cobrança, etc.).
    sched.add_job(
        job_automacao_colunas, CronTrigger(hour=0, minute=5),
        id="automacao_colunas_diaria", replace_existing=True,
    )
    return sched
