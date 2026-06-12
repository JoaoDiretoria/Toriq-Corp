from app.jobs.scheduler import build_scheduler


def test_build_scheduler_registers_jobs():
    sched = build_scheduler()
    ids = {j.id for j in sched.get_jobs()}
    assert "contas_recorrentes_mensal" in ids
    assert "automacao_colunas_diaria" in ids
