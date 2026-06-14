"""Integração com Google OAuth + Google Calendar API (Agenda/Meet).

Funções puras (stateless via httpx) que falam com o Google:
- ``build_auth_url``: monta a URL de consentimento OAuth (offline + consent para
  garantir refresh_token).
- ``exchange_code``: troca o ``code`` do callback por tokens.
- ``refresh_access_token``: renova o access_token via refresh_token.
- ``get_email``: descobre o e-mail da conta conectada (userinfo).
- ``criar_evento`` / ``atualizar_evento`` / ``deletar_evento``: gerencia o evento
  no Google Calendar; ``criar_evento`` pede um link do Meet (conferenceData).

Estilo igual a ``whatsapp_meta.py`` / ``apify.py``: erros viram ``GoogleError``.
As credenciais do app (client_id/secret/redirect) vêm de ``settings``.
"""
from __future__ import annotations

import datetime
import urllib.parse

import httpx

from app.core.config import settings

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 - URL pública, não é segredo
_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

# Escopos: criar/editar eventos + identificar o e-mail conectado.
_SCOPES = "openid email https://www.googleapis.com/auth/calendar.events"
_TIMEZONE = "America/Sao_Paulo"
_TIMEOUT = 30.0


class GoogleError(Exception):
    """Erro ao falar com o Google (OAuth ou Calendar)."""


class GoogleNotConfigured(GoogleError):
    """As credenciais do app Google não estão configuradas (settings vazias)."""


def _exigir_credenciais() -> tuple[str, str, str]:
    if not (
        settings.google_client_id
        and settings.google_client_secret
        and settings.google_redirect_uri
    ):
        raise GoogleNotConfigured(
            "Integração Google não configurada (defina GOOGLE_CLIENT_ID, "
            "GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI)."
        )
    return (
        settings.google_client_id,
        settings.google_client_secret,
        settings.google_redirect_uri,
    )


def build_auth_url(state: str) -> str:
    """URL de consentimento OAuth. ``state`` carrega a empresa (assinado)."""
    client_id, _, redirect_uri = _exigir_credenciais()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": _SCOPES,
        "access_type": "offline",  # queremos refresh_token
        "prompt": "consent",  # força devolver refresh_token mesmo em reconexão
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Troca o ``code`` do callback por tokens. Retorna o JSON do Google
    (access_token, refresh_token, expires_in, scope, token_type)."""
    client_id, client_secret, redirect_uri = _exigir_credenciais()
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(_TOKEN_URL, data=data)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise GoogleError(
                f"Falha ao trocar code por token: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise GoogleError(f"Erro de rede no token exchange: {e}") from e


async def refresh_access_token(refresh_token: str) -> dict:
    """Renova o access_token. Retorna JSON (access_token, expires_in, ...)."""
    client_id, client_secret, _ = _exigir_credenciais()
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(_TOKEN_URL, data=data)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise GoogleError(
                f"Falha ao renovar token: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise GoogleError(f"Erro de rede no refresh: {e}") from e


async def get_email(access_token: str) -> str | None:
    """E-mail da conta conectada (best-effort; None se falhar)."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.get(
                _USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            resp.raise_for_status()
            return resp.json().get("email")
        except httpx.HTTPError:
            return None


def _iso(dt: datetime.datetime) -> str:
    return dt.isoformat()


def _corpo_evento(
    *,
    titulo: str,
    inicio: datetime.datetime,
    fim: datetime.datetime | None,
    descricao: str | None,
    local: str | None,
    convidado_email: str | None,
) -> dict:
    fim_real = fim or (inicio + datetime.timedelta(hours=1))
    corpo: dict = {
        "summary": titulo,
        "start": {"dateTime": _iso(inicio), "timeZone": _TIMEZONE},
        "end": {"dateTime": _iso(fim_real), "timeZone": _TIMEZONE},
    }
    if descricao:
        corpo["description"] = descricao
    if local:
        corpo["location"] = local
    if convidado_email:
        corpo["attendees"] = [{"email": convidado_email}]
    return corpo


async def criar_evento(
    access_token: str,
    *,
    titulo: str,
    inicio: datetime.datetime,
    fim: datetime.datetime | None = None,
    descricao: str | None = None,
    local: str | None = None,
    convidado_email: str | None = None,
    request_id: str,
) -> dict:
    """Cria o evento no Calendar pedindo um link do Meet.

    Retorna ``{"google_event_id", "meet_link", "html_link"}``.
    """
    corpo = _corpo_evento(
        titulo=titulo,
        inicio=inicio,
        fim=fim,
        descricao=descricao,
        local=local,
        convidado_email=convidado_email,
    )
    corpo["conferenceData"] = {
        "createRequest": {
            "requestId": request_id,
            "conferenceSolutionKey": {"type": "hangoutsMeet"},
        }
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.post(
                _CALENDAR_BASE,
                params={"conferenceDataVersion": 1},
                headers={"Authorization": f"Bearer {access_token}"},
                json=corpo,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            raise GoogleError(
                f"Falha ao criar evento: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise GoogleError(f"Erro de rede ao criar evento: {e}") from e
    return {
        "google_event_id": data.get("id"),
        "meet_link": data.get("hangoutLink"),
        "html_link": data.get("htmlLink"),
    }


async def atualizar_evento(
    access_token: str,
    *,
    google_event_id: str,
    titulo: str,
    inicio: datetime.datetime,
    fim: datetime.datetime | None = None,
    descricao: str | None = None,
    local: str | None = None,
    convidado_email: str | None = None,
) -> None:
    """Atualiza (PATCH) um evento existente no Calendar."""
    corpo = _corpo_evento(
        titulo=titulo,
        inicio=inicio,
        fim=fim,
        descricao=descricao,
        local=local,
        convidado_email=convidado_email,
    )
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.patch(
                f"{_CALENDAR_BASE}/{google_event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                json=corpo,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise GoogleError(
                f"Falha ao atualizar evento: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise GoogleError(f"Erro de rede ao atualizar evento: {e}") from e


async def deletar_evento(access_token: str, *, google_event_id: str) -> None:
    """Remove um evento do Calendar (404 do Google é tratado como já-removido)."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        try:
            resp = await c.delete(
                f"{_CALENDAR_BASE}/{google_event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code in (404, 410):
                return
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise GoogleError(
                f"Falha ao remover evento: HTTP {e.response.status_code} — {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise GoogleError(f"Erro de rede ao remover evento: {e}") from e
