"""Testes do subsistema de STORAGE.

Os métodos de ``storage_service`` são mockados via monkeypatch — NENHUM teste
toca o S3/rede. O router é registrado de forma auto-contida no app.
"""
import pytest

from tests.helpers import login_as


@pytest.fixture
def sclient(client, monkeypatch):
    """Registra o router de storage e mocka o storage_service (sem rede)."""
    from app.main import app
    from app.api.storage import router as storage_router

    if not any(r.path.startswith("/storage") for r in app.routes):
        app.include_router(storage_router)

    monkeypatch.setattr(
        "app.api.storage.storage_service.upload",
        lambda *a, **k: "http://fake/bucket/key",
    )
    monkeypatch.setattr(
        "app.api.storage.storage_service.delete",
        lambda *a, **k: None,
    )
    monkeypatch.setattr(
        "app.api.storage.storage_service.presigned_get",
        lambda *a, **k: "http://fake/presigned",
    )
    return client


async def test_upload_requer_auth(sclient):
    resp = await sclient.post(
        "/storage/documentos/upload",
        files={"file": ("a.txt", b"conteudo", "text/plain")},
    )
    assert resp.status_code == 401


async def test_upload_ok_retorna_url_e_key_por_empresa(sclient, db_session):
    empresa_id = await login_as(sclient, db_session, email="up@test.com")

    resp = await sclient.post(
        "/storage/documentos/upload",
        files={"file": ("doc.pdf", b"conteudo", "application/pdf")},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["bucket"] == "documentos"
    assert body["url"] == "http://fake/bucket/key"
    # Key prefixada pela empresa do usuário.
    assert body["key"].startswith(f"{empresa_id}/")
    assert body["key"].endswith("/doc.pdf")


async def test_upload_bucket_fora_da_allowlist_400(sclient, db_session):
    await login_as(sclient, db_session, email="bad@test.com")

    resp = await sclient.post(
        "/storage/inexistente/upload",
        files={"file": ("a.txt", b"x", "text/plain")},
    )
    assert resp.status_code == 400, resp.text


async def test_delete_da_propria_empresa_204(sclient, db_session):
    empresa_id = await login_as(sclient, db_session, email="del@test.com")
    # Key dentro do próprio tenant → 204.
    resp = await sclient.delete(f"/storage/documentos/{empresa_id}/xyz/arquivo.pdf")
    assert resp.status_code == 204, resp.text


async def test_delete_cross_tenant_404(sclient, db_session):
    """IDOR: usuário não apaga objeto de outra empresa."""
    await login_as(sclient, db_session, email="del2@test.com")
    outra = "00000000-0000-0000-0000-0000000000ff"
    resp = await sclient.delete(f"/storage/documentos/{outra}/xyz/arquivo.pdf")
    assert resp.status_code == 404, resp.text


async def test_presigned_cross_tenant_404(sclient, db_session):
    """IDOR: usuário não gera URL de objeto de outra empresa."""
    await login_as(sclient, db_session, email="ps@test.com")
    outra = "00000000-0000-0000-0000-0000000000ff"
    resp = await sclient.get(f"/storage/documentos/{outra}/xyz/arquivo.pdf/url")
    assert resp.status_code == 404, resp.text


async def test_upload_mime_perigoso_rejeitado_400(sclient, db_session):
    """Anti-XSS: content-type não permitido (ex.: text/html) → 400."""
    await login_as(sclient, db_session, email="xss@test.com")
    resp = await sclient.post(
        "/storage/documentos/upload",
        files={"file": ("evil.html", b"<script>alert(1)</script>", "text/html")},
    )
    assert resp.status_code == 400, resp.text
