"""Toriq — Google Agenda/Meet: serviço de token e sincronização de eventos.

Camada que liga o ``app.integrations.google_calendar`` (HTTP puro) ao banco:
- tokens são guardados CRIPTOGRAFADOS (Fernet, via ``esocial_crypto``);
- ``access_token`` é renovado automaticamente quando expira (refresh_token);
- o ``state`` do OAuth é assinado (Fernet) com a empresa + timestamp, então o
  callback (rota pública) confia na origem sem sessão;
- ``sincronizar_*`` empurra criação/edição/remoção de eventos da Agenda para o
  Google Calendar (sentido único TORIQ→Google), gerando o link do Meet.

Tudo é best-effort no wiring da agenda: sem conexão Google, as funções de
sincronização simplesmente não fazem nada (a Agenda local segue funcionando).
"""
from __future__ import annotations

import datetime
import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.esocial_crypto import decrypt_secret, encrypt_secret
from app.integrations import google_calendar as gcal
from app.models import generated as m

# Validade do ``state`` do OAuth (anti-replay/CSRF): 10 minutos.
_STATE_TTL_SEGUNDOS = 600
# Margem para renovar o access_token antes de expirar de fato.
_RENOVAR_ANTES_SEGUNDOS = 60


# ═══════════════════════════════════════════════════════════════════════════════
# State assinado (empresa + timestamp)
# ═══════════════════════════════════════════════════════════════════════════════

def assinar_state(empresa_id: uuid.UUID) -> str:
    """State opaco e à prova de adulteração para o fluxo OAuth."""
    return encrypt_secret(f"{empresa_id}|{int(time.time())}")


def verificar_state(state: str) -> uuid.UUID:
    """Valida o state e devolve a empresa. Levanta ValueError se inválido/expirado."""
    try:
        bruto = decrypt_secret(state)
        empresa_str, ts_str = bruto.split("|", 1)
        empresa_id = uuid.UUID(empresa_str)
        ts = int(ts_str)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("state inválido") from exc
    if time.time() - ts > _STATE_TTL_SEGUNDOS:
        raise ValueError("state expirado")
    return empresa_id


# ═══════════════════════════════════════════════════════════════════════════════
# Persistência de tokens (criptografados)
# ═══════════════════════════════════════════════════════════════════════════════

def _expiry_ms(expires_in: int | None) -> int | None:
    if not expires_in:
        return None
    return int((time.time() + int(expires_in)) * 1000)


async def salvar_tokens(
    db: AsyncSession,
    *,
    empresa_id: uuid.UUID,
    token_json: dict,
    email: str | None,
) -> m.GoogleOauthTokens:
    """Upsert dos tokens da empresa (access/refresh CRIPTOGRAFADOS).

    Reconexão pode não devolver refresh_token — nesse caso preservamos o antigo.
    """
    tok = await db.scalar(
        select(m.GoogleOauthTokens).where(
            m.GoogleOauthTokens.empresa_id == empresa_id
        )
    )
    agora = datetime.datetime.now(datetime.timezone.utc)
    access_enc = encrypt_secret(token_json["access_token"])
    refresh_plain = token_json.get("refresh_token")
    refresh_enc = encrypt_secret(refresh_plain) if refresh_plain else None
    scope = token_json.get("scope")
    token_type = token_json.get("token_type") or "Bearer"
    expiry = _expiry_ms(token_json.get("expires_in"))

    if tok is None:
        tok = m.GoogleOauthTokens(
            id=uuid.uuid4(),
            empresa_id=empresa_id,
            access_token=access_enc,
            refresh_token=refresh_enc,
            token_type=token_type,
            scope=scope,
            expiry_date=expiry,
            google_email=email,
        )
        db.add(tok)
    else:
        tok.access_token = access_enc
        if refresh_enc:  # só sobrescreve se veio um novo refresh_token
            tok.refresh_token = refresh_enc
        tok.token_type = token_type
        tok.scope = scope
        tok.expiry_date = expiry
        if email:
            tok.google_email = email
        tok.atualizado_em = agora
    await db.commit()
    await db.refresh(tok)
    return tok


def _desencriptar(valor: str | None) -> str | None:
    if not valor:
        return None
    try:
        return decrypt_secret(valor)
    except Exception:  # noqa: BLE001 - token legado em texto puro / chave trocada
        return None


async def obter_access_token(
    db: AsyncSession, empresa_id: uuid.UUID
) -> str | None:
    """access_token válido da empresa (renova via refresh se expirado).

    Retorna None se não há conexão, o token não pôde ser lido, ou a renovação
    falhou — o chamador trata como "não conectado" e segue sem sincronizar.
    """
    tok = await db.scalar(
        select(m.GoogleOauthTokens).where(
            m.GoogleOauthTokens.empresa_id == empresa_id
        )
    )
    if tok is None:
        return None

    expirado = (
        tok.expiry_date is not None
        and (tok.expiry_date / 1000.0) <= time.time() + _RENOVAR_ANTES_SEGUNDOS
    )
    if not expirado:
        return _desencriptar(tok.access_token)

    refresh = _desencriptar(tok.refresh_token)
    if not refresh:
        return _desencriptar(tok.access_token)  # tenta o atual mesmo assim
    try:
        novo = await gcal.refresh_access_token(refresh)
    except gcal.GoogleError:
        return None
    tok.access_token = encrypt_secret(novo["access_token"])
    tok.expiry_date = _expiry_ms(novo.get("expires_in"))
    tok.atualizado_em = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    return novo["access_token"]


# ═══════════════════════════════════════════════════════════════════════════════
# Sincronização de eventos (TORIQ → Google) — best-effort
# ═══════════════════════════════════════════════════════════════════════════════

async def sincronizar_criar(
    db: AsyncSession, *, empresa_id: uuid.UUID, evento: m.AgendaEventos
) -> bool:
    """Cria o evento no Google e grava google_event_id + meet_link no evento.

    Retorna True se sincronizou. Não commita (o chamador faz). Best-effort:
    qualquer erro/sem-conexão → False, sem alterar o evento."""
    access = await obter_access_token(db, empresa_id)
    if not access:
        return False
    try:
        res = await gcal.criar_evento(
            access,
            titulo=evento.titulo,
            inicio=evento.data_inicio,
            fim=evento.data_fim,
            descricao=evento.descricao,
            local=evento.local,
            convidado_email=evento.cliente_email,
            request_id=str(evento.id),
        )
    except gcal.GoogleError:
        return False
    evento.google_event_id = res.get("google_event_id")
    if res.get("meet_link"):
        evento.meet_link = res["meet_link"]
    return True


async def sincronizar_atualizar(
    db: AsyncSession, *, empresa_id: uuid.UUID, evento: m.AgendaEventos
) -> None:
    """Propaga edição para o Google (se o evento já tem google_event_id)."""
    if not getattr(evento, "google_event_id", None):
        return
    access = await obter_access_token(db, empresa_id)
    if not access:
        return
    try:
        await gcal.atualizar_evento(
            access,
            google_event_id=evento.google_event_id,
            titulo=evento.titulo,
            inicio=evento.data_inicio,
            fim=evento.data_fim,
            descricao=evento.descricao,
            local=evento.local,
            convidado_email=evento.cliente_email,
        )
    except gcal.GoogleError:
        return


async def sincronizar_deletar(
    db: AsyncSession, *, empresa_id: uuid.UUID, google_event_id: str | None
) -> None:
    """Remove o evento no Google (best-effort)."""
    if not google_event_id:
        return
    access = await obter_access_token(db, empresa_id)
    if not access:
        return
    try:
        await gcal.deletar_evento(access, google_event_id=google_event_id)
    except gcal.GoogleError:
        return
