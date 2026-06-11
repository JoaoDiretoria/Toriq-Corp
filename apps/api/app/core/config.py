from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_access_ttl_seconds: int = 900
    jwt_refresh_ttl_seconds: int = 1209600
    # Seguro por padrão: cookies só por HTTPS e TLS no banco.
    # Sobrescreva para False apenas no .env de dev local (HTTP / Postgres sem TLS).
    cookie_secure: bool = True
    db_ssl: bool = True


settings = Settings()  # type: ignore[call-arg]
