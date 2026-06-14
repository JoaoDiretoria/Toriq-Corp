"""Agenda — google_event_id em agenda_eventos (integração Google Agenda/Meet)

Guarda o ID do evento no Google Calendar para propagar edição/remoção
(sincronização TORIQ→Google). Aditiva.

Revision ID: d8a9b0c1e2f3
Revises: c7f8a9b0d1e2
Create Date: 2026-06-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd8a9b0c1e2f3'
down_revision: Union[str, None] = 'c7f8a9b0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'agenda_eventos',
        sa.Column('google_event_id', sa.Text(), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('agenda_eventos', 'google_event_id', schema='public')
