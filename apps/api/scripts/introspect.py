"""Gera os models SQLAlchemy do schema public do Supabase.

Uso: uv run python -m scripts.introspect
Lê SUPABASE_DB_URL do ambiente/.env e escreve app/models/generated.py.
"""
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

OUT = Path(__file__).resolve().parent.parent / "app" / "models" / "generated.py"


def main() -> int:
    load_dotenv()
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        print("SUPABASE_DB_URL ausente no .env", file=sys.stderr)
        return 1
    cmd = ["sqlacodegen", "--schemas", "public", "--outfile", str(OUT), url]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
