"""Testes do subsistema Ops/Suporte (role suporte + dashboard /ops)."""
import pytest

pytestmark = pytest.mark.anyio


async def _register_login(client, email: str, role: str, empresa_id: str | None = None):
    """Registra (open_register ligado nos testes) e loga; cookies ficam no client."""
    await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "Senha123!",
            "nome": f"User {role}",
            "role": role,
            "empresa_id": empresa_id,
        },
    )
    r = await client.post("/auth/login", json={"email": email, "password": "Senha123!"})
    assert r.status_code == 200, r.text


async def test_suporte_role_pode_registrar_e_logar(client):
    # Só passa se o enum app_role já tiver o valor 'suporte' (migração aplicada).
    await _register_login(client, "sup1@toriq.com", "suporte")
    r = await client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "sup1@toriq.com"


async def test_require_ops_bloqueia_nao_ops(client):
    await _register_login(client, "cli@toriq.com", "cliente_final")
    r = await client.get("/ops/health")
    assert r.status_code == 403


async def test_require_ops_permite_suporte(client):
    await _register_login(client, "sup2@toriq.com", "suporte")
    r = await client.get("/ops/health")
    assert r.status_code == 200


async def test_health_estrutura(client):
    await _register_login(client, "sup3@toriq.com", "suporte")
    r = await client.get("/ops/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in ("ok", "degradado")
    assert "versao" in body and "uptime_segundos" in body
    nomes = {d["nome"] for d in body["dependencias"]}
    assert {"postgres", "redis"} <= nomes


async def test_database_tables(client):
    await _register_login(client, "sup4@toriq.com", "suporte")
    r = await client.get("/ops/database/tables")
    assert r.status_code == 200
    body = r.json()
    assert "tabelas" in body and isinstance(body["tabelas"], list)
    # users sempre existe; deve aparecer com contagem >= 0
    nomes = {t["nome"] for t in body["tabelas"]}
    assert "users" in nomes


async def test_redis_overview_sem_redis(client):
    # Em teste não há REDIS_URL: overview reporta desligado, sem quebrar.
    await _register_login(client, "sup5@toriq.com", "suporte")
    r = await client.get("/ops/redis/overview")
    assert r.status_code == 200
    body = r.json()
    assert body["conectado"] is False


async def test_scheduler_jobs(client):
    await _register_login(client, "sup6@toriq.com", "suporte")
    r = await client.get("/ops/scheduler/jobs")
    assert r.status_code == 200
    assert isinstance(r.json()["jobs"], list)
