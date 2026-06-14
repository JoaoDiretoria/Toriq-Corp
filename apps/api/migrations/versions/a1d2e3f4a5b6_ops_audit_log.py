"""Tabela ops_audit_log (auditoria do dashboard de suporte). Aditiva.

Revision ID: a1d2e3f4a5b6
Revises: f0c1a2b3c4d5
Create Date: 2026-06-14 17:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1d2e3f4a5b6"
down_revision: Union[str, None] = "f0c1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ops_audit_log",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("actor_nome", sa.Text(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_user_id", sa.Uuid(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="ops_audit_log_pkey"),
    )
    op.create_index("idx_ops_audit_actor", "ops_audit_log", ["actor_id"])
    op.create_index("idx_ops_audit_action", "ops_audit_log", ["action"])
    op.create_index("idx_ops_audit_created", "ops_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_ops_audit_created", table_name="ops_audit_log")
    op.drop_index("idx_ops_audit_action", table_name="ops_audit_log")
    op.drop_index("idx_ops_audit_actor", table_name="ops_audit_log")
    op.drop_table("ops_audit_log")
