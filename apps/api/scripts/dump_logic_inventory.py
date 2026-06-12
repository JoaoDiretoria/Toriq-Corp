"""Extrai triggers e funções do schema public do Supabase para um inventário markdown."""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

OUT = Path(__file__).resolve().parents[3] / "docs" / "superpowers" / "inventario-logica-banco.md"

TRIGGERS_SQL = """
select c.relname as tabela, t.tgname as trigger,
       pg_get_triggerdef(t.oid) as definicao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and not t.tgisinternal
order by c.relname, t.tgname;
"""

FUNCS_SQL = """
select p.proname as funcao, pg_get_functiondef(p.oid) as definicao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
order by p.proname;
"""


def classify_trigger(name: str) -> str:
    """Classifica um trigger pela categoria com base no nome."""
    n = name.lower()
    if any(k in n for k in ("updated_at", "update_at", "set_updated", "update_timestamp",
                            "created_at", "timestamp")):
        return "timestamp"
    if any(k in n for k in ("audit", "log_", "_log", "historia", "history", "audit_")):
        return "auditoria"
    if any(k in n for k in ("notif", "notify", "notification", "push", "alert", "email")):
        return "notificação"
    return "negócio (revisar)"


def classify_func(name: str) -> str:
    """Classifica uma função pela categoria com base no nome."""
    n = name.lower()
    if any(k in n for k in ("updated_at", "update_at", "set_updated", "update_timestamp",
                            "created_at", "timestamp")):
        return "timestamp"
    if any(k in n for k in ("audit", "log_", "_log", "historia", "history", "audit_")):
        return "auditoria"
    if any(k in n for k in ("notif", "notify", "notification", "push", "alert", "email")):
        return "notificação"
    return "negócio (revisar)"


def main() -> None:
    load_dotenv()
    conn = psycopg.connect(os.environ["SUPABASE_DB_URL"].replace("+psycopg", ""))
    triggers = conn.execute(TRIGGERS_SQL).fetchall()
    funcs = conn.execute(FUNCS_SQL).fetchall()

    lines = ["# Inventário da lógica do banco (triggers + funções)\n"]
    lines.append("> Gerado de `scripts/dump_logic_inventory.py`. Cada item deve ser portado")
    lines.append("> para Python na Fatia 3 e marcado aqui (Categoria + Destino).\n")
    lines.append(f"\n## Triggers ({len(triggers)})\n")
    lines.append("| Tabela | Trigger | Categoria | Destino Python | Portado |")
    lines.append("|---|---|---|---|---|")
    for tabela, trig, _ in triggers:
        cat = classify_trigger(trig)
        lines.append(f"| {tabela} | {trig} | {cat} |  | ☐ |")
    lines.append(f"\n## Funções ({len(funcs)})\n")
    lines.append("| Função | Categoria | Destino Python | Portado |")
    lines.append("|---|---|---|---|")
    for nome, _ in funcs:
        cat = classify_func(nome)
        lines.append(f"| {nome} | {cat} |  | ☐ |")

    lines.append("\n## Definições completas (referência)\n")
    for tabela, trig, d in triggers:
        lines.append(f"\n### trigger `{trig}` on `{tabela}`\n```sql\n{d}\n```")
    for nome, d in funcs:
        lines.append(f"\n### function `{nome}`\n```sql\n{d}\n```")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"inventário escrito: {OUT} ({len(triggers)} triggers, {len(funcs)} funções)")


if __name__ == "__main__":
    main()
