from app.core.config import Settings


def test_settings_reads_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("JWT_SECRET", "x")
    s = Settings()
    assert s.database_url.startswith("postgresql+asyncpg://")
    assert s.jwt_access_ttl_seconds == 900
