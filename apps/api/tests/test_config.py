from app.core.config import Settings
from app.core import sentry as sentry_mod
from app.main import create_app


def test_settings_reads_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("JWT_SECRET", "x")
    s = Settings()
    assert s.database_url.startswith("postgresql+asyncpg://")
    assert s.jwt_access_ttl_seconds == 900


def test_invalid_sentry_dsn_is_treated_as_disabled(monkeypatch):
    monkeypatch.setattr(sentry_mod.settings, "sentry_dsn", "https://abc@o123.ingest.sentry.io/")
    assert sentry_mod.get_sentry_dsn() == "https://abc@o123.ingest.sentry.io/"
    assert sentry_mod.has_valid_sentry_dsn() is False


def test_create_app_does_not_crash_with_invalid_sentry_dsn(monkeypatch):
    monkeypatch.setattr(sentry_mod.settings, "sentry_dsn", "https://abc@o123.ingest.sentry.io/")
    app = create_app()
    assert app.title == "TORIQ API"
