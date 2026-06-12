import uuid

import pytest
from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.api.crud_factory import make_crud_router
from app.core.db import Base
from tests.helpers import login_as


class _Gadget(Base):
    __tablename__ = "_gadgets_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    nome: Mapped[str] = mapped_column(String, nullable=False)


class GadgetIn(BaseModel):
    nome: str


class GadgetOut(BaseModel):
    id: uuid.UUID
    nome: str
    model_config = {"from_attributes": True}


@pytest.fixture
async def gadget_client(db_session, client):
    async with db_session.bind.begin() as conn:
        await conn.run_sync(_Gadget.__table__.create)
    from app.main import app
    app.include_router(make_crud_router(
        model=_Gadget, create_schema=GadgetIn, update_schema=GadgetIn,
        read_schema=GadgetOut, prefix="/gadgets", tags=["gadgets"],
    ))
    return client


async def test_crud_factory_full_cycle(gadget_client, db_session):
    await login_as(gadget_client, db_session, email="g@g.com")
    created = await gadget_client.post("/gadgets", json={"nome": "X"})
    assert created.status_code == 201
    gid = created.json()["id"]
    assert (await gadget_client.get("/gadgets")).json()[0]["nome"] == "X"
    assert (await gadget_client.get(f"/gadgets/{gid}")).json()["nome"] == "X"
    upd = await gadget_client.put(f"/gadgets/{gid}", json={"nome": "Y"})
    assert upd.json()["nome"] == "Y"
    assert (await gadget_client.delete(f"/gadgets/{gid}")).status_code == 204
    assert (await gadget_client.get(f"/gadgets/{gid}")).status_code == 404


async def test_crud_requires_auth(gadget_client):
    assert (await gadget_client.get("/gadgets")).status_code == 401
