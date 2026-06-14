"""Testes do cache read-through do TenantRepository (Toriq — performance).

O ambiente de teste não tem REDIS_URL (cache real desligado), então aqui
injetamos um cache FAKE em memória em ``app.repositories.base.cache`` para
exercitar a lógica de fato:

- ``list_cached``/``get_cached`` servem do cache em hit;
- ``add``/``update``/``delete`` invalidam o namespace da tabela+empresa;
- o cache fake faz JSON round-trip (UUID/datetime viram string), provando que o
  consumidor reidrata corretamente — igual ao Redis real.
"""
import json
import uuid

import pytest

from app.models.generated import ContasReceberColunas, Empresas
from app.repositories import base as base_mod
from app.repositories.base import TenantRepository


class _FakeCache:
    """Cache em memória com a mesma interface usada pelo repositório.

    Faz JSON round-trip no ``set`` para imitar o Redis (tipos viram string).
    """

    def __init__(self) -> None:
        self.store: dict = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value, ttl=None) -> None:
        self.store[key] = json.loads(json.dumps(value, default=str))

    async def delete(self, *keys: str) -> None:
        for k in keys:
            self.store.pop(k, None)

    async def delete_prefixo(self, prefixo: str) -> None:
        for k in [k for k in self.store if k.startswith(prefixo)]:
            self.store.pop(k, None)

    async def get_or_set(self, key: str, ttl, factory):
        if key in self.store:
            return self.store[key]
        valor = await factory()
        if valor is not None:
            await self.set(key, valor, ttl)
        return valor


class _ColunaRepo(TenantRepository):
    model = ContasReceberColunas


@pytest.fixture
def fake_cache(monkeypatch):
    fc = _FakeCache()
    monkeypatch.setattr(base_mod, "cache", fc)
    return fc


async def _nova_empresa(db_session) -> uuid.UUID:
    empresa_id = uuid.uuid4()
    db_session.add(Empresas(id=empresa_id, nome="CacheCo", tipo="sst"))
    await db_session.commit()
    return empresa_id


@pytest.mark.anyio
async def test_list_cached_serve_do_cache_e_invalida_no_write(fake_cache, db_session):
    empresa_id = await _nova_empresa(db_session)
    repo = _ColunaRepo(db_session, empresa_id)

    # add() invalida (best-effort) e cria a 1ª coluna.
    await repo.add(nome="A", ordem=0)

    # 1ª leitura: miss → consulta DB → cacheia ["A"].
    primeira = await repo.list_cached()
    assert [c["nome"] for c in primeira] == ["A"]

    # Escrita DIRETA no banco (bypassa o repo → NÃO invalida).
    db_session.add(
        ContasReceberColunas(id=uuid.uuid4(), empresa_id=empresa_id, nome="B", ordem=1)
    )
    await db_session.commit()

    # 2ª leitura: ainda ["A"] (cache hit, dado velho) — prova que cacheou.
    segunda = await repo.list_cached()
    assert [c["nome"] for c in segunda] == ["A"]

    # Escrita VIA repo → invalida o namespace.
    await repo.add(nome="C", ordem=2)

    # 3ª leitura: agora fresca, com as três colunas — prova a invalidação.
    terceira = await repo.list_cached()
    assert sorted(c["nome"] for c in terceira) == ["A", "B", "C"]


@pytest.mark.anyio
async def test_get_cached_hit_e_invalidacao_no_update(fake_cache, db_session):
    empresa_id = await _nova_empresa(db_session)
    repo = _ColunaRepo(db_session, empresa_id)
    coluna = await repo.add(nome="Inicial", ordem=0)

    # 1ª leitura por id: miss → devolve o dict cru (tipos Python) e cacheia.
    d1 = await repo.get_cached(coluna.id)
    assert d1 is not None and d1["nome"] == "Inicial"

    # 2ª leitura: HIT → vem do cache com o id já como string (JSON round-trip),
    # provando que o consumidor reidrata corretamente — igual ao Redis real.
    d_hit = await repo.get_cached(coluna.id)
    assert d_hit["id"] == str(coluna.id)

    # update() via repo invalida; a próxima leitura reflete o novo nome.
    await repo.update(coluna.id, nome="Renomeada")
    d2 = await repo.get_cached(coluna.id)
    assert d2 is not None and d2["nome"] == "Renomeada"


@pytest.mark.anyio
async def test_isolamento_por_empresa_nas_chaves(fake_cache, db_session):
    empresa_a = await _nova_empresa(db_session)
    empresa_b = await _nova_empresa(db_session)
    repo_a = _ColunaRepo(db_session, empresa_a)
    repo_b = _ColunaRepo(db_session, empresa_b)

    await repo_a.add(nome="DaA", ordem=0)
    await repo_b.add(nome="DaB", ordem=0)

    lista_a = await repo_a.list_cached()
    lista_b = await repo_b.list_cached()
    assert [c["nome"] for c in lista_a] == ["DaA"]
    assert [c["nome"] for c in lista_b] == ["DaB"]
    # As chaves de cache são distintas por empresa.
    assert any(str(empresa_a) in k for k in fake_cache.store)
    assert any(str(empresa_b) in k for k in fake_cache.store)
