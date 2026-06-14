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
