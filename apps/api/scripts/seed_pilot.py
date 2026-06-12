"""Seed mínimo para o piloto da Fatia 5 (e base do bootstrap da Fatia 0).

Cria uma empresa demo (idempotente) e amarra o usuário `piloto@toriq.dev`
(criado via /auth/register) a ela — assim os endpoints tenant-scoped funcionam.

Uso:
    uv run python -m scripts.seed_pilot
"""
import asyncio
import uuid

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models.generated import Empresas, Profiles
from app.models.user import User

DEMO_EMPRESA_ID = uuid.UUID("00000000-0000-0000-0000-0000000000d1")
PILOT_EMAIL = "piloto@toriq.dev"


async def main() -> None:
    async with SessionLocal() as db:
        empresa = await db.get(Empresas, DEMO_EMPRESA_ID)
        if empresa is None:
            empresa = Empresas(id=DEMO_EMPRESA_ID, nome="Toriq Demo (piloto)", tipo="sst")
            db.add(empresa)
            print(f"empresa demo criada: {DEMO_EMPRESA_ID}")
        else:
            print("empresa demo já existe")

        user = await db.scalar(select(User).where(User.email == PILOT_EMAIL))
        if user is None:
            print(f"⚠️  usuário {PILOT_EMAIL} não existe — registre-o primeiro via /auth/register")
        else:
            user.empresa_id = DEMO_EMPRESA_ID
            profile = await db.get(Profiles, user.id)
            if profile is not None:
                profile.empresa_id = DEMO_EMPRESA_ID
            print(f"usuário {PILOT_EMAIL} amarrado à empresa demo")

        await db.commit()
    print("seed concluído.")


if __name__ == "__main__":
    asyncio.run(main())
