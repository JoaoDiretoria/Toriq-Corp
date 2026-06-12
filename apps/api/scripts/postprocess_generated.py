"""Pós-processa app/models/generated.py após a geração:
1. Rebind: usa o Base do app (app.core.db) em vez do Base local gerado.
2. Religa as 39 FKs de 'auth.users.id' para 'users.id' (nossa tabela de credenciais).
3. Remove o comentario/schema 'auth' caso reste alguma referencia.
"""
from pathlib import Path

GEN = Path(__file__).resolve().parent.parent / "app" / "models" / "generated.py"


def main() -> None:
    src = GEN.read_text(encoding="utf-8")

    # 2. Religar FKs cross-schema: auth.users -> public.users
    src = src.replace("['auth.users.id']", "['users.id']")

    # 1. Rebind do Base: remover a definição local e importar do app
    src = src.replace(
        "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship",
        "from sqlalchemy.orm import Mapped, mapped_column, relationship\n"
        "from app.core.db import Base",
    )
    src = src.replace("class Base(DeclarativeBase):\n    pass\n\n\n", "")

    # 3. sqlacodegen interpretou profiles como joined-table-inheritance de auth.users;
    #    depois da religação, Profiles deve herdar de Base (é tabela independente).
    src = src.replace("class Profiles(Users):", "class Profiles(Base):")

    GEN.write_text(src, encoding="utf-8")
    # Verificações
    assert "auth.users" not in src, "ainda há referência a auth.users"
    assert "from app.core.db import Base" in src, "rebind do Base falhou"
    assert "class Base(DeclarativeBase)" not in src, "Base local não removido"
    print("pós-processamento OK")


if __name__ == "__main__":
    main()
