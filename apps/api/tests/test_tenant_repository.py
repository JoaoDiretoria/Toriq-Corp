import uuid

import pytest
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.repositories.base import TenantRepository


class _Widget(Base):
    __tablename__ = "_widgets_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)


class WidgetRepo(TenantRepository[_Widget]):
    model = _Widget


@pytest.fixture
async def repo(db_session):
    e1 = uuid.uuid4()
    async with db_session.bind.begin() as conn:
        await conn.run_sync(_Widget.__table__.create)
    return WidgetRepo(db_session, e1), e1


async def test_add_get_update_delete_scoped(repo):
    r, e1 = repo
    w = await r.add(nome="A")
    got = await r.get(w.id)
    assert got is not None and got.nome == "A"

    updated = await r.update(w.id, nome="B")
    assert updated is not None and updated.nome == "B"

    assert await r.count() == 1
    assert await r.delete(w.id) is True
    assert await r.get(w.id) is None
    assert await r.count() == 0


async def test_get_of_other_tenant_returns_none(repo, db_session):
    r, e1 = repo
    w = await r.add(nome="A")
    other = WidgetRepo(db_session, uuid.uuid4())
    assert await other.get(w.id) is None        # isolamento no get
    assert await other.update(w.id, nome="X") is None  # isolamento no update
    assert await other.delete(w.id) is False    # isolamento no delete
