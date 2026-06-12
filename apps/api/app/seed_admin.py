"""Seed do 1º admin (Fatia 0).

Cria um usuário ``admin_vertical`` de bootstrap se ainda não existir NENHUM no
banco. Idempotente: rodar de novo não duplica. É o único caminho de criação do
primeiro admin — a rota /auth/register fica gated (settings.open_register=False)
em produção.

Uso:
    SEED_ADMIN_EMAIL=admin@toriqcorp.com.br SEED_ADMIN_PASSWORD='senhaForte123' \\
    SEED_ADMIN_NOME='Admin' uv run python -m app.seed_admin
"""
import asyncio
import os
import sys
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.generated import Profiles
from app.models.user import User, UserRole

MIN_SENHA = 8


async def seed_admin(
    db: AsyncSession, email: str, password: str, nome: str
) -> tuple[bool, str]:
    """Cria o admin_vertical de bootstrap usando a sessão fornecida.

    Retorna ``(criado, mensagem)``. Não cria se já houver qualquer admin_vertical
    (idempotência) ou se o e-mail já estiver em uso.
    """
    existing = await db.scalar(
        select(User).where(User.role == UserRole.admin_vertical)
    )
    if existing is not None:
        return False, f"admin_vertical já existe ({existing.email}); nada a fazer."

    dup = await db.scalar(select(User).where(User.email == email))
    if dup is not None:
        return False, f"e-mail {email} já cadastrado; abortando."

    user = User(
        id=uuid.uuid4(),
        email=email,
        senha_hash=hash_password(password),
        nome=nome,
        role=UserRole.admin_vertical,
        empresa_id=None,
    )
    db.add(user)
    await db.flush()
    db.add(
        Profiles(
            id=user.id,
            email=user.email,
            nome=user.nome,
            role=user.role.value,
            empresa_id=None,
        )
    )
    await db.commit()
    return True, f"admin_vertical criado: {email} (id={user.id})"


async def _run(email: str, password: str, nome: str) -> tuple[bool, str]:
    async with SessionLocal() as db:
        return await seed_admin(db, email, password, nome)


def _main() -> int:
    email = os.environ.get("SEED_ADMIN_EMAIL")
    password = os.environ.get("SEED_ADMIN_PASSWORD")
    nome = os.environ.get("SEED_ADMIN_NOME", "Admin")

    if not email or not password:
        print(
            "ERRO: defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no ambiente.",
            file=sys.stderr,
        )
        return 2
    if len(password) < MIN_SENHA:
        print(
            f"ERRO: SEED_ADMIN_PASSWORD deve ter >= {MIN_SENHA} caracteres.",
            file=sys.stderr,
        )
        return 2

    created, msg = asyncio.run(_run(email, password, nome))
    print(msg)
    # Sucesso tanto na criação quanto na idempotência (admin já existe).
    return 0 if created or "já existe" in msg else 1


if __name__ == "__main__":
    raise SystemExit(_main())
