"""Endpoints de operações internas (ops) — só admin_vertical.

Expõe issues do Sentry (front + back) com cache Redis curto para não
estourar o rate limit da API do Sentry (100 req/s por org).
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import require_role
from app.core.cache import cache
from app.core.config import settings
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ops", tags=["ops"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))

# ── Schemas de resposta ───────────────────────────────────────────────────────

class SentryIssue(BaseModel):
      id: str
      title: str
      culprit: str | None = None
      level: str
      count: int
      user_count: int
      project: str
      permalink: str
      first_seen: str
      last_seen: str


class SentryProjectSummary(BaseModel):
      project: str
      slug: str
      unresolved: int


class SentryIssuesResponse(BaseModel):
      projects: list[SentryProjectSummary]
      issues: list[SentryIssue]


# ── Helpers ───────────────────────────────────────────────────────────────────

_SENTRY_API = "https://sentry.io/api/0"
_SENTRY_ORG = "toriq-corp"
_PROJECTS = [
      ("toriq-corp-frontend", "Frontend"),
      ("toriq-corp-backend", "Backend"),
]
_CACHE_TTL = 60  # segundos — respeita rate limit


async def _fetch_issues(project_slug: str, token: str, limit: int) -> list[dict[str, Any]]:
      """Busca issues não-resolvidas de um projeto via API do Sentry."""
      url = f"{_SENTRY_API}/projects/{_SENTRY_ORG}/{project_slug}/issues/"
      params = {
          "query": "is:unresolved",
          "limit": limit,
          "sort": "date",
      }
      headers = {"Authorization": f"Bearer {token}"}
      async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 401:
                              raise HTTPException(status.HTTP_502_BAD_GATEWAY, "SENTRY_API_TOKEN inválido ou sem permissão")
                          if not resp.is_success:
                                        logger.warning("Sentry API error %s para %s: %s", resp.status_code, project_slug, resp.text[:200])
                                        return []
                                    return resp.json()


def _to_issue(raw: dict[str, Any], project_label: str) -> SentryIssue:
      return SentryIssue(
                id=raw["id"],
                title=raw.get("title", ""),
                culprit=raw.get("culprit"),
                level=raw.get("level", "error"),
                count=int(raw.get("count", 0)),
                user_count=int(raw.get("userCount", 0)),
                project=project_label,
                permalink=raw.get("permalink", ""),
                first_seen=raw.get("firstSeen", ""),
                last_seen=raw.get("lastSeen", ""),
      )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/sentry/issues", response_model=SentryIssuesResponse)
async def listar_sentry_issues(
      limit: int = Query(10, ge=1, le=50, description="Issues por projeto"),
      _: User = _ADMIN,
) -> SentryIssuesResponse:
      """Retorna top issues não-resolvidas do Sentry (front + back).

          - Exige ``admin_vertical``.
              - Cache Redis de 60 s para não estourar o rate limit (100 req/s).
                  - Sem SENTRY_API_TOKEN configurado, retorna 503.
                      """
      token = settings.sentry_api_token
      if not token:
                raise HTTPException(
                              status.HTTP_503_SERVICE_UNAVAILABLE,
                              "SENTRY_API_TOKEN não configurado",
                )

      cache_key = f"{settings.cache_prefix}:ops:sentry:issues:limit={limit}"
      cached = await cache.get(cache_key)
      if cached is not None:
                return SentryIssuesResponse(**cached)

      all_issues: list[SentryIssue] = []
      summaries: list[SentryProjectSummary] = []

    for slug, label in _PROJECTS:
              try:
                            raw_issues = await _fetch_issues(slug, token, limit)
except HTTPException:
            raise
except Exception as exc:
            logger.error("Erro ao buscar issues do projeto %s: %s", slug, exc)
            raw_issues = []

        issues = [_to_issue(r, label) for r in raw_issues]
        all_issues.extend(issues)
        summaries.append(SentryProjectSummary(
                      project=label,
                      slug=slug,
                      unresolved=len(issues),
        ))

    # Ordena por count desc (mais frequentes primeiro)
    all_issues.sort(key=lambda i: i.count, reverse=True)

    result = SentryIssuesResponse(projects=summaries, issues=all_issues[:limit])

    await cache.set(cache_key, result.model_dump(), ttl=_CACHE_TTL)
    return result
