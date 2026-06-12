"""RPCs portadas do Supabase para FastAPI.

Router único, SEM prefixo fixo — cada rota define seu caminho completo. As rotas
deliberadamente "invadem" os namespaces /white-label, /sistema e /blog, mas são
mais específicas que os parâmetros dinâmicos desses routers. Por isso, ao montar
no main.py, este router DEVE ser incluído ANTES de qualquer rota dinâmica
conflitante (ver nota no fim do arquivo).

Endpoints:
  GET  /white-label/me                       → resolve a config white-label do usuário logado
  POST /sistema/system-updates/register      → registra versão (idempotente; admin_vertical)
  GET  /blog/trending                        → posts mais vistos no período (público)
"""
import datetime
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_current_user, require_role
from app.core.db import get_db
from app.models import generated as m
from app.models.user import User, UserRole
from app.services.white_label_resolver import resolve_by_user

router = APIRouter(tags=["rpcs"])


# ── RPC 1: GET /white-label/me ────────────────────────────────────────────────

@router.get("/white-label/me")
async def white_label_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Resolve a empresa SST "pai" do usuário e devolve sua config white-label.

    Se não houver empresa SST resolvível, retorna ``{empresa_sst_id: null,
    config: null}`` (o front aplica o tema padrão). A config é devolvida em
    snake_case, tal como persistida no banco — o front converte.
    """
    empresa_sst_id = await resolve_by_user(db, user.id)
    if empresa_sst_id is None:
        return {"empresa_sst_id": None, "config": None}

    cfg = await db.scalar(
        select(m.WhiteLabelConfig).where(
            m.WhiteLabelConfig.empresa_id == empresa_sst_id
        )
    )
    config: dict[str, Any] | None = None
    if cfg is not None:
        config = {
            c.key: getattr(cfg, c.key)
            for c in m.WhiteLabelConfig.__table__.columns
        }
    return {"empresa_sst_id": empresa_sst_id, "config": config}


# ── RPC 2: POST /sistema/system-updates/register ──────────────────────────────

class SystemUpdateRegisterIn(BaseModel):
    version: str
    title: str
    description: str | None = None
    changelog: Any = None
    release_date: datetime.datetime | None = None


@router.post(
    "/sistema/system-updates/register",
    status_code=status.HTTP_201_CREATED,
)
async def register_system_update(
    payload: SystemUpdateRegisterIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin_vertical)),
):
    """Registra uma versão do sistema de forma idempotente.

    - Se a ``version`` ainda não existe: insere (is_active=True) e desativa
      TODAS as demais (is_active=False). Retorna o novo registro.
    - Se já existe: retorna o registro existente sem alterações (idempotente).
    """
    existing = await db.scalar(
        select(m.SystemUpdates).where(m.SystemUpdates.version == payload.version)
    )
    if existing is not None:
        return existing

    obj = m.SystemUpdates(
        id=uuid.uuid4(),
        version=payload.version,
        title=payload.title,
        description=payload.description,
        is_active=True,
    )
    if payload.changelog is not None:
        obj.changelog = payload.changelog
    if payload.release_date is not None:
        obj.release_date = payload.release_date
    db.add(obj)
    await db.flush()

    # Desativa todos os outros registros.
    await db.execute(
        update(m.SystemUpdates)
        .where(m.SystemUpdates.id != obj.id)
        .values(is_active=False)
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# ── RPC 3: GET /blog/trending ─────────────────────────────────────────────────

@router.get("/blog/trending")
async def blog_trending(
    db: AsyncSession = Depends(get_db),
    period_days: int = Query(7, ge=1, le=365),
    limit: int = Query(10, ge=1, le=100),
) -> list[dict[str, Any]]:
    """Lista os posts mais vistos dentro do período (público, sem auth).

    Conta ``blog_visualizacoes`` por blog cujas ``created_at`` estejam dentro da
    janela ``[now - period_days, now]`` e ordena desc pela contagem. Apenas
    posts publicados são considerados. Retorna campos básicos de cada blog.
    """
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
        days=period_days
    )
    view_count = func.count(m.BlogVisualizacoes.id).label("views_period")
    stmt = (
        select(m.Blogs, view_count)
        .outerjoin(
            m.BlogVisualizacoes,
            (m.BlogVisualizacoes.blog_id == m.Blogs.id)
            & (m.BlogVisualizacoes.created_at >= cutoff),
        )
        .where(m.Blogs.status == "publicado")
        .group_by(m.Blogs.id)
        .order_by(view_count.desc(), m.Blogs.publicado_em.desc().nullslast())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    result: list[dict[str, Any]] = []
    for blog, views in rows:
        result.append(
            {
                "id": blog.id,
                "titulo": blog.titulo,
                "slug": blog.slug,
                "descricao": blog.descricao,
                "imagem_capa_url": blog.imagem_capa_url,
                "autor_id": blog.autor_id,
                "categoria_id": blog.categoria_id,
                "status": blog.status,
                "tempo_leitura": blog.tempo_leitura,
                "visualizacoes": blog.visualizacoes,
                "publicado_em": blog.publicado_em,
                "views_period": int(views or 0),
            }
        )
    return result


# ── Montagem no main.py ───────────────────────────────────────────────────────
# from app.api.rpcs import router as rpcs_router
# app.include_router(rpcs_router)
#
# IMPORTANTE — ordem de inclusão:
#   * GET /white-label/me  precisa vir ANTES do white_label_router (que tem
#     rotas dinâmicas /white-label/{id_} como /modulos/{id_}). Inclua rpcs_router
#     ANTES de white_label.router.
#   * GET /blog/trending  precisa vir ANTES do blog_router (que tem /blog/{id_}).
#     Inclua rpcs_router ANTES de blog.router.
#   * /sistema/system-updates/register não conflita com rotas dinâmicas, mas por
#     consistência inclua rpcs_router antes de sistema.router também.
