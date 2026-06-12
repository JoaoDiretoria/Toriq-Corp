"""Helpers compartilhados entre os testes de integração.

Uso típico:
    from tests.helpers import login_as

    async def test_algo(client, db_session):
        empresa_id = await login_as(client, db_session, role="cliente_torq", email="u@test.com")
"""
import uuid

from sqlalchemy import select

from app.models.generated import Empresas
from app.models.generated import Profiles
from app.models.user import User


async def login_as(
    client,
    db_session=None,
    *,
    role: str = "cliente_torq",
    email: str = "u@test.com",
    password: str = "segredo123",
    nome: str | None = None,
    empresa_id=None,
) -> uuid.UUID:
    """Cria empresa (se não fornecida) + registra usuário + perfil + faz login.

    Retorna o empresa_id (UUID).

    Args:
        client:      AsyncClient do pytest-anyio (via fixture ``client``).
        db_session:  AsyncSession de teste (via fixture ``db_session``).
        role:        Role do usuário — ``"cliente_torq"`` por padrão.
        email:       E-mail do usuário.
        password:    Senha do usuário (default ``"segredo123"``).
        nome:        Nome do usuário; usa o prefixo do e-mail se omitido.
        empresa_id:  UUID de empresa existente; cria uma nova se None.
    """
    if nome is None:
        nome = email.split("@")[0]

    if empresa_id is None:
        empresa_id = uuid.uuid4()
        db_session.add(Empresas(id=empresa_id, nome="E", tipo="sst"))
        await db_session.commit()

    r_reg = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nome": nome,
            "role": role,
            "empresa_id": str(empresa_id),
        },
    )

    # Ensure a matching profiles row exists (required by FKs like agenda_eventos.criado_por).
    # The /auth/register endpoint only creates the users row, not profiles.
    if db_session is not None and r_reg.status_code in (200, 201):
        user = await db_session.scalar(select(User).where(User.email == email))
        if user is not None:
            existing = await db_session.scalar(
                select(Profiles).where(Profiles.id == user.id)
            )
            if existing is None:
                db_session.add(
                    Profiles(
                        id=user.id,
                        email=email,
                        nome=nome,
                        role=role,
                        empresa_id=empresa_id,
                    )
                )
                await db_session.commit()

    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login falhou ({email}): {r.text}"
    return empresa_id
