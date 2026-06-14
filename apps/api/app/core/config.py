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

    # Chave-mestra para criptografar segredos de integração (eSocial / gov.br /
    # Toriq Vendas). Derivada para uma chave Fernet em app.core.esocial_crypto.
    # Sem ela, criptografar/descriptografar segredos levanta erro claro no uso.
    integration_encryption_key: str | None = None

    # Google OAuth (Agenda/Meet). Credenciais do app no Google Cloud Console
    # (uma por instância TORIQ, não por empresa). A redirect URI tem que estar
    # autorizada no console e bater com o endpoint /sistema/google-oauth/callback.
    # OPCIONAIS: sem elas a integração fica desligada (endpoints respondem 503).
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None
    # Para onde o callback redireciona o navegador depois de conectar. Sem ela,
    # usa a 1ª origem do CORS.
    frontend_url: str | None = None

    # Resend (envio de emails transacionais do sistema). OPCIONAIS: sem a API key
    # o envio é no-op (a ação que dispara o email não quebra). O domínio do
    # ``resend_from`` precisa estar verificado no Resend.
    resend_api_key: str | None = None
    resend_from: str = "TORIQ <nao-responda@toriqcorp.com.br>"
    # Segredo de assinatura do webhook do Resend (Svix, começa com "whsec_").
    # Sem ele, o webhook responde 503 (não processa eventos não verificados).
    resend_webhook_secret: str | None = None

    # Sentry (monitoramento de erros do backend). OPCIONAL: sem o DSN, o init é
    # no-op (nada é enviado). Usar o DSN do 2º projeto Sentry (backend), separado
    # do front. send_default_pii fica False (não envia dados pessoais por padrão).
    sentry_dsn: str | None = None
    sentry_environment: str = "production"
    sentry_traces_sample_rate: float = 0.1
    # Token de API do Sentry (Internal Integration read-only: event:read, project:read, org:read).
    # Usado pelo endpoint /ops/sentry/issues para buscar issues via REST API.
    # OPCIONAL: sem ele, /ops/sentry/issues retorna 503.
    sentry_api_token: str | None = None

    # Redis (cache + filas). URL no formato redis://default:senha@host:6379.
    # OPCIONAL: sem ela o cache fica desligado (recalcula sempre) e a fila roda
    # inline/no scheduler — a aplicação NUNCA quebra por falta de Redis.
    redis_url: str | None = None
    # TTL padrão do cache (segundos) e prefixo das chaves (namespacing).
    cache_ttl_seconds: int = 60
    cache_prefix: str = "toriq"

    # Sentry (observabilidade de erros). OPCIONAL: sem SENTRY_DSN o SDK não
    # inicializa (degradação graciosa). org/project são usados só para montar a
    # URL de link-out no dashboard /ops (não há chamada à API do Sentry no v1).
    sentry_dsn: str | None = None
    sentry_environment: str = "production"
    sentry_org: str | None = None
    sentry_project: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def frontend_base_url(self) -> str:
        """Base do front para redirects (callback OAuth). Cai na 1ª origem CORS."""
        if self.frontend_url:
            return self.frontend_url.rstrip("/")
        origens = self.cors_origins_list
        return origens[0].rstrip("/") if origens else "http://localhost:8080"


settings = Settings()  # type: ignore[call-arg]
