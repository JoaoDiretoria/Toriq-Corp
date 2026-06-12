"""Blog / Newsletter module.

Tenant model: ALL tables here are GLOBAL (no empresa_id column).
Access control is by role, not by tenant isolation:

  Table                  | Has empresa_id | Access mode
  -----------------------|----------------|---------------------------------------------
  blog_autores           | NO             | GET public; POST/PUT/DELETE → admin_vertical
  blog_categorias        | NO             | GET public; POST/PUT/DELETE → admin_vertical
  blogs                  | NO             | GET public (published); all writes → admin_vertical
  blog_visualizacoes     | NO (blog_id FK)| POST public (anonymous tracking); GET → admin_vertical
  blog_user_preferences  | NO (session_id)| GET/PUT by session_id (no auth needed)
  newsletter_inscricoes  | NO             | POST public (subscribe); GET/manage → admin_vertical
  newsletter_conteudos   | NO             | all → admin_vertical
  newsletter_config      | NO             | GET/PUT → admin_vertical
  newsletter_disparos    | NO             | GET → admin_vertical (read-only)

Simplified: BlogUserPreferences (per-session anon state) only has list/get by session.
NewsletterDisparos is read-only (created by background jobs, not the API).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import blog as s

router = APIRouter(prefix="/blog", tags=["blog"])

# ── helpers ───────────────────────────────────────────────────────────────────

_ADMIN = Depends(require_role(UserRole.admin_vertical))


async def _get_or_404(db: AsyncSession, model, id_: uuid.UUID):
    obj = await db.scalar(select(model).where(model.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")
    return obj


# ── BlogAutores ───────────────────────────────────────────────────────────────

@router.get("/autores", response_model=list[s.AutorOut], tags=["blog-autores"])
async def listar_autores(db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(m.BlogAutores))
    return list(result)


@router.get("/autores/{id_}", response_model=s.AutorOut, tags=["blog-autores"])
async def obter_autor(id_: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, m.BlogAutores, id_)


@router.post(
    "/autores",
    response_model=s.AutorOut,
    status_code=status.HTTP_201_CREATED,
    tags=["blog-autores"],
)
async def criar_autor(
    payload: s.AutorIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.BlogAutores(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/autores/{id_}", response_model=s.AutorOut, tags=["blog-autores"])
async def atualizar_autor(
    id_: uuid.UUID,
    payload: s.AutorUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_or_404(db, m.BlogAutores, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/autores/{id_}", status_code=status.HTTP_204_NO_CONTENT, tags=["blog-autores"])
async def remover_autor(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    # Use direct DELETE to avoid lazy-loading relationships (pesquisas_opiniao, blogs)
    result = await db.execute(
        sa_delete(m.BlogAutores).where(m.BlogAutores.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")


# ── BlogCategorias ────────────────────────────────────────────────────────────

@router.get("/categorias", response_model=list[s.CategoriaOut], tags=["blog-categorias"])
async def listar_categorias(db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(m.BlogCategorias))
    return list(result)


@router.get("/categorias/{id_}", response_model=s.CategoriaOut, tags=["blog-categorias"])
async def obter_categoria(id_: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, m.BlogCategorias, id_)


@router.post(
    "/categorias",
    response_model=s.CategoriaOut,
    status_code=status.HTTP_201_CREATED,
    tags=["blog-categorias"],
)
async def criar_categoria(
    payload: s.CategoriaIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.BlogCategorias(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/categorias/{id_}", response_model=s.CategoriaOut, tags=["blog-categorias"])
async def atualizar_categoria(
    id_: uuid.UUID,
    payload: s.CategoriaUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_or_404(db, m.BlogCategorias, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/categorias/{id_}", status_code=status.HTTP_204_NO_CONTENT, tags=["blog-categorias"])
async def remover_categoria(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    result = await db.execute(
        sa_delete(m.BlogCategorias).where(m.BlogCategorias.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")


# ── Blogs (posts) ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[s.BlogOut], tags=["blog-posts"])
async def listar_posts(db: AsyncSession = Depends(get_db)):
    """Retorna apenas posts publicados (status = 'publicado') para o público geral."""
    result = await db.scalars(
        select(m.Blogs).where(m.Blogs.status == "publicado")
    )
    return list(result)


@router.get("/admin/posts", response_model=list[s.BlogOut], tags=["blog-posts"])
async def listar_posts_admin(
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Retorna todos os posts (todos os status) para admin."""
    result = await db.scalars(select(m.Blogs))
    return list(result)


@router.get("/{id_}", response_model=s.BlogOut, tags=["blog-posts"])
async def obter_post(id_: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await _get_or_404(db, m.Blogs, id_)
    return obj


@router.post(
    "/admin/posts",
    response_model=s.BlogOut,
    status_code=status.HTTP_201_CREATED,
    tags=["blog-posts"],
)
async def criar_post(
    payload: s.BlogIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.Blogs(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/admin/posts/{id_}", response_model=s.BlogOut, tags=["blog-posts"])
async def atualizar_post(
    id_: uuid.UUID,
    payload: s.BlogUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_or_404(db, m.Blogs, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/admin/posts/{id_}", status_code=status.HTTP_204_NO_CONTENT, tags=["blog-posts"])
async def remover_post(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    result = await db.execute(
        sa_delete(m.Blogs).where(m.Blogs.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")


# ── BlogVisualizacoes ─────────────────────────────────────────────────────────

@router.post(
    "/{blog_id}/visualizacoes",
    response_model=s.VisualizacaoOut,
    status_code=status.HTTP_201_CREATED,
    tags=["blog-visualizacoes"],
)
async def registrar_visualizacao(
    blog_id: uuid.UUID,
    payload: s.VisualizacaoIn,
    db: AsyncSession = Depends(get_db),
):
    """Endpoint público/anônimo para registrar uma visualização de post."""
    # Verify the blog exists
    await _get_or_404(db, m.Blogs, blog_id)
    obj = m.BlogVisualizacoes(
        id=uuid.uuid4(),
        blog_id=blog_id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get(
    "/{blog_id}/visualizacoes",
    response_model=list[s.VisualizacaoOut],
    tags=["blog-visualizacoes"],
)
async def listar_visualizacoes(
    blog_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    """Lista visualizações de um post — restrito a admin_vertical."""
    result = await db.scalars(
        select(m.BlogVisualizacoes).where(m.BlogVisualizacoes.blog_id == blog_id)
    )
    return list(result)


# ── Newsletter: Inscrições ────────────────────────────────────────────────────

_nl = APIRouter(prefix="/newsletter", tags=["newsletter"])


@_nl.post(
    "/inscricoes",
    response_model=s.InscricaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def inscrever(
    payload: s.InscricaoIn,
    db: AsyncSession = Depends(get_db),
):
    """Inscrição pública na newsletter — nenhuma autenticação necessária."""
    # Check for duplicate email
    existing = await db.scalar(
        select(m.NewsletterInscricoes).where(
            m.NewsletterInscricoes.email == payload.email
        )
    )
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "e-mail já inscrito na newsletter",
        )
    obj = m.NewsletterInscricoes(
        id=uuid.uuid4(),
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_nl.get("/inscricoes", response_model=list[s.InscricaoOut])
async def listar_inscricoes(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    """Lista todos os inscritos — restrito a admin_vertical."""
    result = await db.scalars(select(m.NewsletterInscricoes))
    return list(result)


@_nl.get("/inscricoes/{id_}", response_model=s.InscricaoOut)
async def obter_inscricao(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    return await _get_or_404(db, m.NewsletterInscricoes, id_)


@_nl.put("/inscricoes/{id_}", response_model=s.InscricaoOut)
async def atualizar_inscricao(
    id_: uuid.UUID,
    payload: s.InscricaoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = await _get_or_404(db, m.NewsletterInscricoes, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_nl.delete("/inscricoes/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_inscricao(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    result = await db.execute(
        sa_delete(m.NewsletterInscricoes).where(m.NewsletterInscricoes.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")


# ── Newsletter: Conteúdos ─────────────────────────────────────────────────────

@_nl.get("/conteudos", response_model=list[s.ConteudoOut])
async def listar_conteudos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    result = await db.scalars(select(m.NewsletterConteudos))
    return list(result)


@_nl.get("/conteudos/{id_}", response_model=s.ConteudoOut)
async def obter_conteudo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    return await _get_or_404(db, m.NewsletterConteudos, id_)


@_nl.post("/conteudos", response_model=s.ConteudoOut, status_code=status.HTTP_201_CREATED)
async def criar_conteudo(
    payload: s.ConteudoIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = m.NewsletterConteudos(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_nl.put("/conteudos/{id_}", response_model=s.ConteudoOut)
async def atualizar_conteudo(
    id_: uuid.UUID,
    payload: s.ConteudoUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = await _get_or_404(db, m.NewsletterConteudos, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_nl.delete("/conteudos/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_conteudo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    result = await db.execute(
        sa_delete(m.NewsletterConteudos).where(m.NewsletterConteudos.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "não encontrado")


# ── Newsletter: Config (singleton, admin-only) ────────────────────────────────

@_nl.get("/config", response_model=list[s.NewsletterConfigOut])
async def listar_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    result = await db.scalars(select(m.NewsletterConfig))
    return list(result)


@_nl.put("/config/{id_}", response_model=s.NewsletterConfigOut)
async def atualizar_config(
    id_: uuid.UUID,
    payload: s.NewsletterConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    obj = await _get_or_404(db, m.NewsletterConfig, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Newsletter: Disparos (read-only, admin) ───────────────────────────────────

@_nl.get("/disparos", response_model=list[s.DisparoOut])
async def listar_disparos(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    result = await db.scalars(select(m.NewsletterDisparos))
    return list(result)


@_nl.get("/disparos/{id_}", response_model=s.DisparoOut)
async def obter_disparo(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    return await _get_or_404(db, m.NewsletterDisparos, id_)


# ── Mount sub-router ──────────────────────────────────────────────────────────
router.include_router(_nl)
