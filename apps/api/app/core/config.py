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
    # Origens permitidas no CORS (separadas por vírgula no .env). O Vite de dev
    # roda em :8080 — daí o default. Necessário para o front enviar o cookie httpOnly.
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080"

    # Cadastro aberto. False (default, seguro) → /auth/register exige admin_vertical
    # autenticado. O 1º admin entra via seed (app.seed_admin), não pela rota aberta.
    # Ligue (OPEN_REGISTER=true) só em cenários de teste/bootstrap controlado.
    open_register: bool = False

    # Cloudflare Turnstile (captcha). Secret key validada no /auth/login. Quando
    # VAZIA (default), a validação é PULADA — o captcha fica desligado de ponta a
    # ponta (o front também só mostra o widget quando tem a site key). Defina
    # TURNSTILE_SECRET_KEY para LIGAR a validação.
    turnstile_secret_key: str | None = None

    # Storage S3-compatível (RustFS) — substitui o supabase.storage. Opcionais:
    # sem credenciais o StorageService levanta 503 ao ser usado.
    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"
    # Base pública opcional (CDN/proxy). Sem ela, a URL pública usa o endpoint.
    s3_public_base_url: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]
