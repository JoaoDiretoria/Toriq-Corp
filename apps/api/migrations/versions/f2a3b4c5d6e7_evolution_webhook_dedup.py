"""evolution: tabela de idempotencia do webhook (dedup por event_id)

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vendas_evolution_webhook_eventos",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("instancia_id", sa.Uuid(), nullable=True),
        sa.Column("event_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'received'"), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=True,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="vendas_evolution_webhook_eventos_pkey"),
        sa.UniqueConstraint(
            "event_id", name="vendas_evolution_webhook_eventos_event_id_key"
        ),
        schema="public",
    )
    op.create_index(
        "idx_vendas_evolution_webhook_eventos_instancia",
        "vendas_evolution_webhook_eventos", ["instancia_id"], schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_vendas_evolution_webhook_eventos_instancia",
        table_name="vendas_evolution_webhook_eventos", schema="public",
    )
    op.drop_table("vendas_evolution_webhook_eventos", schema="public")
