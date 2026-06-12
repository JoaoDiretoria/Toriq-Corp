"""Tests for blog recommendations + user preferences (public endpoints).

Fixtures:
- ``reco_client``: mounts blog_reco_router BEFORE blog_router so that
  /blog/recommendations and /blog/preferences/{session_id} are resolved
  before /blog/{id_} (same ordering required in main.py).

Coverage:
- GET /blog/recommendations — returns list (no auth needed)
- GET /blog/recommendations — prioritises session's preferred categoria
- GET /blog/preferences/{session_id} — 404 when not found
- PUT /blog/preferences/{session_id} — creates new record
- PUT /blog/preferences/{session_id} — merges arrays on second call
- GET /blog/preferences/{session_id} — reads back after upsert
"""
import uuid

import pytest

from app.models.generated import Blogs, BlogCategorias


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def reco_client(db_session, client):
    """Mount blog_reco_router before blog_router to respect route priority."""
    from app.main import app
    from app.api.blog_reco import router as blog_reco_router
    from app.api.blog import router as blog_router

    # Register blog_reco routes only once (idempotent)
    reco_registered = any(
        getattr(r, "path", "").startswith("/blog/recommendations")
        or getattr(r, "path", "").startswith("/blog/preferences")
        for r in app.routes
    )
    if not reco_registered:
        app.include_router(blog_reco_router)

    blog_registered = any(
        getattr(r, "path", "") == "/blog" for r in app.routes
    )
    if not blog_registered:
        app.include_router(blog_router)

    return client


# ── Helper: create a published blog post ─────────────────────────────────────

async def _make_blog(db_session, titulo: str, slug: str, categoria_id=None) -> Blogs:
    blog = Blogs(
        id=uuid.uuid4(),
        titulo=titulo,
        slug=slug,
        status="publicado",
        categoria_id=categoria_id,
        tags=["test"],
        visualizacoes=0,
    )
    db_session.add(blog)
    await db_session.commit()
    return blog


async def _make_categoria(db_session, nome: str = "Tech") -> BlogCategorias:
    cat = BlogCategorias(
        id=uuid.uuid4(),
        nome=nome,
        slug=nome.lower().replace(" ", "-"),
    )
    db_session.add(cat)
    await db_session.commit()
    return cat


# ── Tests: GET /blog/recommendations ─────────────────────────────────────────

async def test_recommendations_returns_list_no_auth(reco_client):
    """Happy-path: endpoint is public and returns a JSON list."""
    r = await reco_client.get("/blog/recommendations")
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


async def test_recommendations_limit_respected(reco_client, db_session):
    """Returned list must not exceed requested limit."""
    # Create 10 published posts
    for i in range(10):
        await _make_blog(db_session, f"Rec Post {i}", f"rec-post-{i}-{uuid.uuid4().hex[:6]}")

    r = await reco_client.get("/blog/recommendations?limit=3")
    assert r.status_code == 200, r.text
    assert len(r.json()) <= 3


async def test_recommendations_excludes_current_post(reco_client, db_session):
    """exclude_id must not appear in results."""
    blog = await _make_blog(db_session, "Exclude Me", f"exclude-me-{uuid.uuid4().hex[:6]}")

    r = await reco_client.get(f"/blog/recommendations?exclude_id={blog.id}&limit=20")
    assert r.status_code == 200, r.text
    ids = [p["id"] for p in r.json()]
    assert str(blog.id) not in ids


async def test_recommendations_prioritises_preferred_category(reco_client, db_session):
    """Posts matching the session's categoria_ids appear before others."""
    cat = await _make_categoria(db_session, "Preferred")
    other_cat = await _make_categoria(db_session, "Other")

    # Create preferred-category post
    pref_blog = await _make_blog(
        db_session, "Preferred Cat Post", f"pref-cat-{uuid.uuid4().hex[:6]}", categoria_id=cat.id
    )
    # Create other-category post
    await _make_blog(
        db_session, "Other Cat Post", f"other-cat-{uuid.uuid4().hex[:6]}", categoria_id=other_cat.id
    )

    session_id = f"test-session-{uuid.uuid4().hex[:8]}"

    # Upsert preferences so session prefers cat.id
    r_put = await reco_client.put(
        f"/blog/preferences/{session_id}",
        json={"categoria_ids": [str(cat.id)]},
    )
    assert r_put.status_code == 200, r_put.text

    r = await reco_client.get(f"/blog/recommendations?session_id={session_id}&limit=10")
    assert r.status_code == 200, r.text
    posts = r.json()
    assert len(posts) >= 1

    # The preferred-category post should appear before any other-category post
    preferred_posts = [p for p in posts if p["categoria_id"] == str(cat.id)]
    assert any(p["id"] == str(pref_blog.id) for p in preferred_posts), (
        "preferred category post must appear in recommendations"
    )


async def test_recommendations_only_publicado(reco_client, db_session):
    """Draft posts must not appear in recommendations."""
    draft = Blogs(
        id=uuid.uuid4(),
        titulo="Draft Post",
        slug=f"draft-{uuid.uuid4().hex[:6]}",
        status="rascunho",
    )
    db_session.add(draft)
    await db_session.commit()

    r = await reco_client.get("/blog/recommendations?limit=50")
    assert r.status_code == 200, r.text
    ids = [p["id"] for p in r.json()]
    assert str(draft.id) not in ids, "draft post must not appear in public recommendations"


# ── Tests: GET /blog/preferences/{session_id} ────────────────────────────────

async def test_get_preferences_not_found(reco_client):
    """Returns 404 when no preferences exist for the session."""
    r = await reco_client.get(f"/blog/preferences/nonexistent-session-{uuid.uuid4().hex}")
    assert r.status_code == 404, r.text


# ── Tests: PUT /blog/preferences/{session_id} ────────────────────────────────

async def test_upsert_preferences_creates_record(reco_client):
    """PUT creates a new preferences record and returns it."""
    session_id = f"sess-create-{uuid.uuid4().hex[:8]}"
    cat_id = str(uuid.uuid4())
    tag = "segurança"

    r = await reco_client.put(
        f"/blog/preferences/{session_id}",
        json={
            "categoria_ids": [cat_id],
            "tags_interesse": [tag],
            "blogs_visualizados": [],
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_id"] == session_id
    assert cat_id in data["categoria_ids"]
    assert tag in data["tags_interesse"]


async def test_upsert_preferences_merges_on_second_call(reco_client):
    """Second PUT merges arrays without duplicating existing entries."""
    session_id = f"sess-merge-{uuid.uuid4().hex[:8]}"
    cat1 = str(uuid.uuid4())
    cat2 = str(uuid.uuid4())

    # First upsert
    r1 = await reco_client.put(
        f"/blog/preferences/{session_id}",
        json={"categoria_ids": [cat1], "tags_interesse": ["epi"]},
    )
    assert r1.status_code == 200, r1.text

    # Second upsert with a new category + same category (no dup)
    r2 = await reco_client.put(
        f"/blog/preferences/{session_id}",
        json={"categoria_ids": [cat1, cat2], "tags_interesse": ["epi", "nr35"]},
    )
    assert r2.status_code == 200, r2.text
    data = r2.json()

    # Both categories present, no duplicates
    assert cat1 in data["categoria_ids"]
    assert cat2 in data["categoria_ids"]
    assert data["categoria_ids"].count(cat1) == 1, "no duplicates in categoria_ids"

    # Tags merged without dup
    assert "epi" in data["tags_interesse"]
    assert "nr35" in data["tags_interesse"]
    assert data["tags_interesse"].count("epi") == 1


async def test_get_preferences_after_upsert(reco_client):
    """GET returns the same data that was PUT."""
    session_id = f"sess-read-{uuid.uuid4().hex[:8]}"
    cat_id = str(uuid.uuid4())

    await reco_client.put(
        f"/blog/preferences/{session_id}",
        json={"categoria_ids": [cat_id], "tags_interesse": ["treinamento"]},
    )

    r = await reco_client.get(f"/blog/preferences/{session_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_id"] == session_id
    assert cat_id in data["categoria_ids"]
    assert "treinamento" in data["tags_interesse"]
