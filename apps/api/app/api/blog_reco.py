"""Blog recommendations + user preferences (public, session-keyed).

Tenant model: GLOBAL — no empresa_id. Both tables (blogs, blog_user_preferences)
are cross-tenant; access is by session_id only, no authentication required.

Security decisions:
- No auth on any endpoint (matches blog.py public pattern).
- session_id is a caller-supplied opaque string (e.g. '<timestamp>-<random>').
  There is no server-side session secret so it functions as a pseudonymous key,
  not a secret credential.  An adversary who knows another user's session_id can
  read/overwrite their preferences — this is acceptable for anonymous analytics.
- PUT /blog/preferences/{session_id}: upsert creates a new record if not found
  (ON CONFLICT DO UPDATE emulated via SQLAlchemy select+insert/update).
- GET /blog/recommendations: only publicado posts are ever returned.
- IP address is stored as passed (INET column); we do NOT validate format here —
  FastAPI/Postgres will reject invalid INET values at the driver level.

Route conflict note:
  blog.py has GET /blog/{id_} which would shadow /blog/recommendations and
  /blog/preferences/{session_id}.  This router MUST be registered in main.py
  BEFORE blog_router (same pattern used for rpcs_router / /blog/trending).
"""
import datetime
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import generated as m

router = APIRouter(prefix="/blog", tags=["blog-recommendations"])


# ── Schemas (inline — small surface, no need for separate file) ───────────────

class PreferencesIn(BaseModel):
    """Payload for PUT /blog/preferences/{session_id}."""
    ip_address: Optional[str] = None
    categoria_ids: Optional[list[uuid.UUID]] = None
    tags_interesse: Optional[list[str]] = None
    blogs_visualizados: Optional[list[uuid.UUID]] = None


class PreferencesOut(BaseModel):
    id: uuid.UUID
    session_id: str
    ip_address: Optional[Any] = None
    categoria_ids: Optional[list[uuid.UUID]] = None
    tags_interesse: Optional[list[str]] = None
    blogs_visualizados: Optional[list[uuid.UUID]] = None
    ultimo_acesso: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}


# ── GET /blog/recommendations ─────────────────────────────────────────────────

@router.get("/recommendations", tags=["blog-recommendations"])
async def get_recommendations(
    session_id: Optional[str] = Query(None, description="Session ID for personalization"),
    exclude_id: Optional[uuid.UUID] = Query(None, description="Blog ID to exclude (current post)"),
    limit: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return published posts prioritising the session's preferred categories.

    Algorithm:
    1. If session_id is provided and a preferences record exists, fetch
       categoria_ids + blogs_visualizados.
    2. Query published posts, excluding exclude_id and blogs already seen.
    3. Prefer posts whose categoria_id is in the session's categoria_ids;
       sort preferred group by publicado_em desc, then add remaining posts
       (also by publicado_em desc) as fallback until limit is reached.
    4. If no preferences exist, return the most-recent published posts.
    """
    # Load preferences when session_id is supplied
    categoria_ids: list[uuid.UUID] = []
    blogs_visualizados: list[uuid.UUID] = []

    if session_id:
        prefs = await db.scalar(
            select(m.BlogUserPreferences).where(
                m.BlogUserPreferences.session_id == session_id
            )
        )
        if prefs is not None:
            categoria_ids = list(prefs.categoria_ids or [])
            blogs_visualizados = list(prefs.blogs_visualizados or [])

    # Base query: only published, ordered by publicado_em desc (nulls last)
    base_where = [m.Blogs.status == "publicado"]

    if exclude_id is not None:
        base_where.append(m.Blogs.id != exclude_id)

    if blogs_visualizados:
        base_where.append(m.Blogs.id.notin_(blogs_visualizados))

    base_stmt = (
        select(m.Blogs)
        .where(and_(*base_where))
        .order_by(m.Blogs.publicado_em.desc().nullslast())
    )

    # Fetch enough candidates (up to limit * 3) to allow re-ordering
    candidate_limit = limit * 3
    rows = list(await db.scalars(base_stmt.limit(candidate_limit)))

    if categoria_ids:
        preferred = [b for b in rows if b.categoria_id in categoria_ids]
        others = [b for b in rows if b.categoria_id not in categoria_ids]
        ordered = preferred + others
    else:
        ordered = rows

    selected = ordered[:limit]

    # If not enough results, fall back to recent posts ignoring viewed filter
    if len(selected) < limit:
        fallback_where = [m.Blogs.status == "publicado"]
        if exclude_id is not None:
            fallback_where.append(m.Blogs.id != exclude_id)
        already_ids = {b.id for b in selected}
        fallback_stmt = (
            select(m.Blogs)
            .where(and_(*fallback_where))
            .order_by(m.Blogs.publicado_em.desc().nullslast())
            .limit(limit)
        )
        fallback_rows = await db.scalars(fallback_stmt)
        for b in fallback_rows:
            if b.id not in already_ids and len(selected) < limit:
                selected.append(b)
                already_ids.add(b.id)

    def _serialize(blog: m.Blogs) -> dict[str, Any]:
        return {
            "id": blog.id,
            "titulo": blog.titulo,
            "slug": blog.slug,
            "descricao": blog.descricao,
            "imagem_capa_url": blog.imagem_capa_url,
            "autor_id": blog.autor_id,
            "categoria_id": blog.categoria_id,
            "status": blog.status,
            "tags": blog.tags,
            "tempo_leitura": blog.tempo_leitura,
            "visualizacoes": blog.visualizacoes,
            "publicado_em": blog.publicado_em,
            "created_at": blog.created_at,
        }

    return [_serialize(b) for b in selected]


# ── GET /blog/preferences/{session_id} ───────────────────────────────────────

@router.get(
    "/preferences/{session_id}",
    response_model=PreferencesOut,
    tags=["blog-recommendations"],
)
async def get_preferences(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> m.BlogUserPreferences:
    """Retrieve stored preferences for a session. Returns 404 if not found."""
    prefs = await db.scalar(
        select(m.BlogUserPreferences).where(
            m.BlogUserPreferences.session_id == session_id
        )
    )
    if prefs is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "preferências não encontradas")
    return prefs


# ── PUT /blog/preferences/{session_id} ────────────────────────────────────────

@router.put(
    "/preferences/{session_id}",
    response_model=PreferencesOut,
    tags=["blog-recommendations"],
)
async def upsert_preferences(
    session_id: str,
    payload: PreferencesIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> m.BlogUserPreferences:
    """Upsert preferences for a session (create if not exists, update if found).

    The session_id in the URL path is the canonical key — the JSON body must NOT
    include session_id (it is ignored if supplied).

    ip_address is taken from the request's client.host when not supplied in the
    body, so the caller never needs to pass it explicitly.
    """
    now = datetime.datetime.now(datetime.timezone.utc)

    # Resolve ip_address: body wins; fall back to request.client.host
    ip_address: Optional[str] = payload.ip_address
    if ip_address is None and request.client is not None:
        ip_address = request.client.host

    prefs = await db.scalar(
        select(m.BlogUserPreferences).where(
            m.BlogUserPreferences.session_id == session_id
        )
    )

    if prefs is None:
        # Create new record
        prefs = m.BlogUserPreferences(
            id=uuid.uuid4(),
            session_id=session_id,
            ip_address=ip_address,
            categoria_ids=payload.categoria_ids,
            tags_interesse=payload.tags_interesse,
            blogs_visualizados=payload.blogs_visualizados,
            ultimo_acesso=now,
        )
        db.add(prefs)
    else:
        # Merge arrays: union of existing + incoming (deduplicated), preserving order
        if payload.categoria_ids is not None:
            existing_cats = list(prefs.categoria_ids or [])
            for cid in payload.categoria_ids:
                if cid not in existing_cats:
                    existing_cats.append(cid)
            prefs.categoria_ids = existing_cats[-10:]  # keep last 10

        if payload.tags_interesse is not None:
            existing_tags = list(prefs.tags_interesse or [])
            for tag in payload.tags_interesse:
                if tag not in existing_tags:
                    existing_tags.append(tag)
            prefs.tags_interesse = existing_tags[-30:]  # keep last 30

        if payload.blogs_visualizados is not None:
            existing_viz = list(prefs.blogs_visualizados or [])
            for bid in payload.blogs_visualizados:
                if bid not in existing_viz:
                    existing_viz.append(bid)
            prefs.blogs_visualizados = existing_viz[-50:]  # keep last 50

        if ip_address is not None:
            prefs.ip_address = ip_address

        prefs.ultimo_acesso = now

    await db.commit()
    await db.refresh(prefs)
    return prefs
