"""Endpoints de sistema / infraestrutura.

Tabelas e modelo de tenant (inspecionado em app/models/generated.py):

  Tabela              | Tenant        | Modelo de acesso
  --------------------|---------------|---------------------------------------------
  access_logs         | empresa_id    | POST (registrar) + GET lista da empresa.
                      |               | APPEND-ONLY (sem PUT/DELETE). user_* preenchido
                      |               | do usuário logado, nunca do payload.
  system_updates      | GLOBAL        | GET autenticado; POST/PUT/DELETE admin_vertical.
  user_update_views   | POR USUÁRIO   | filtra por user.id; nunca expõe views de outro
                      |               | usuário. POST marca update como visto (idempotente).
  import_queue        | empresa_id    | CRUD por empresa. user_id = usuário logado.
  google_oauth_tokens | empresa_id    | SENSÍVEL. Só status (sem expor access/refresh
                      | (UNIQUE)      | token) + revogar. Restrito ao próprio tenant.
  cbo_ocupacoes       | GLOBAL        | Só leitura: lista + busca por q (codigo/descricao).
  tickets_sla_config  | empresa_id    | Singleton por empresa: GET + PUT (upsert).
"""
import datetime
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.core.db import get_db
from app.integrations import google_calendar as gcal
from app.models import generated as m
from app.models.user import User, UserRole
from app.schemas import sistema as s
from app.services import google_calendar as gsvc

router = APIRouter(prefix="/sistema", tags=["sistema"])

_ADMIN = Depends(require_role(UserRole.admin_vertical))


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


# ── access_logs (empresa, append-only) ────────────────────────────────────────

_logs = APIRouter(prefix="/access-logs", tags=["access-logs"])


@_logs.post("", response_model=s.AccessLogOut, status_code=status.HTTP_201_CREATED)
async def registrar_acesso(
    payload: s.AccessLogIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Registra um log de acesso para a empresa do usuário logado.

    Os campos de identidade (user_id/email/nome) são preenchidos a partir do
    usuário autenticado — o cliente não pode forjar a autoria.
    """
    empresa_id = _require_empresa(user)
    obj = m.AccessLogs(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        user_id=user.id,
        user_email=user.email,
        user_nome=user.nome,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_logs.get("", response_model=list[s.AccessLogOut])
async def listar_acessos(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
):
    """Lista os logs de acesso da empresa do usuário (mais recentes primeiro)."""
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(m.AccessLogs)
        .where(m.AccessLogs.empresa_id == empresa_id)
        .order_by(m.AccessLogs.created_at.desc())
        .limit(limit)
    )
    return list(result)


# ── system_updates (GLOBAL) ───────────────────────────────────────────────────

_updates = APIRouter(prefix="/system-updates", tags=["system-updates"])


async def _get_update_or_404(db: AsyncSession, id_: uuid.UUID) -> m.SystemUpdates:
    obj = await db.scalar(select(m.SystemUpdates).where(m.SystemUpdates.id == id_))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "update não encontrado")
    return obj


@_updates.get("", response_model=list[s.SystemUpdateOut])
async def listar_updates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    apenas_ativos: bool = Query(True),
):
    """Lista o changelog do sistema — leitura para qualquer autenticado."""
    stmt = select(m.SystemUpdates)
    if apenas_ativos:
        stmt = stmt.where(m.SystemUpdates.is_active.is_(True))
    stmt = stmt.order_by(m.SystemUpdates.release_date.desc())
    result = await db.scalars(stmt)
    return list(result)


@_updates.get("/{id_}", response_model=s.SystemUpdateOut)
async def obter_update(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_update_or_404(db, id_)


@_updates.post("", response_model=s.SystemUpdateOut, status_code=status.HTTP_201_CREATED)
async def criar_update(
    payload: s.SystemUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = m.SystemUpdates(id=uuid.uuid4(), **payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_updates.put("/{id_}", response_model=s.SystemUpdateOut)
async def atualizar_update(
    id_: uuid.UUID,
    payload: s.SystemUpdateUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    obj = await _get_update_or_404(db, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_updates.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_update(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = _ADMIN,
):
    result = await db.execute(
        sa_delete(m.SystemUpdates).where(m.SystemUpdates.id == id_)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "update não encontrado")


# ── user_update_views (por usuário) ───────────────────────────────────────────


@_updates.get("/views/me", response_model=list[s.UserUpdateViewOut])
async def listar_minhas_views(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lista os updates que o usuário logado já marcou como vistos.

    Filtra estritamente por user.id — nunca expõe views de outro usuário.
    """
    result = await db.scalars(
        select(m.UserUpdateViews).where(m.UserUpdateViews.user_id == user.id)
    )
    return list(result)


@_updates.post(
    "/{id_}/visto",
    response_model=s.UserUpdateViewOut,
    status_code=status.HTTP_201_CREATED,
)
async def marcar_update_visto(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Marca um update como visto pelo usuário logado (idempotente).

    Valida que o update existe. Se já visto, retorna o registro existente.
    """
    await _get_update_or_404(db, id_)
    existing = await db.scalar(
        select(m.UserUpdateViews).where(
            m.UserUpdateViews.user_id == user.id,
            m.UserUpdateViews.update_id == id_,
        )
    )
    if existing is not None:
        return existing
    obj = m.UserUpdateViews(id=uuid.uuid4(), user_id=user.id, update_id=id_)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── import_queue (empresa) ────────────────────────────────────────────────────

_imports = APIRouter(prefix="/import-queue", tags=["import-queue"])


async def _get_import_or_404(
    db: AsyncSession, empresa_id: uuid.UUID, id_: uuid.UUID
) -> m.ImportQueue:
    obj = await db.scalar(
        select(m.ImportQueue).where(
            m.ImportQueue.id == id_, m.ImportQueue.empresa_id == empresa_id
        )
    )
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")
    return obj


@_imports.get("", response_model=list[s.ImportQueueOut])
async def listar_imports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(m.ImportQueue)
        .where(m.ImportQueue.empresa_id == empresa_id)
        .order_by(m.ImportQueue.created_at.desc())
    )
    return list(result)


@_imports.get("/{id_}", response_model=s.ImportQueueOut)
async def obter_import(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    empresa_id = _require_empresa(user)
    return await _get_import_or_404(db, empresa_id, id_)


@_imports.post("", response_model=s.ImportQueueOut, status_code=status.HTTP_201_CREATED)
async def criar_import(
    payload: s.ImportQueueIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Enfileira uma importação. empresa_id e user_id vêm do usuário logado."""
    empresa_id = _require_empresa(user)
    obj = m.ImportQueue(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        user_id=user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@_imports.put("/{id_}", response_model=s.ImportQueueOut)
async def atualizar_import(
    id_: uuid.UUID,
    payload: s.ImportQueueUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    empresa_id = _require_empresa(user)
    obj = await _get_import_or_404(db, empresa_id, id_)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@_imports.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_import(
    id_: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    empresa_id = _require_empresa(user)
    result = await db.execute(
        sa_delete(m.ImportQueue).where(
            m.ImportQueue.id == id_, m.ImportQueue.empresa_id == empresa_id
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item não encontrado")


# ── google_oauth_tokens (SENSÍVEL — só status + revogar) ──────────────────────

_goauth = APIRouter(prefix="/google-oauth", tags=["google-oauth"])


def _token_status(tok: m.GoogleOauthTokens) -> s.GoogleOauthStatusOut:
    """Projeta o registro de token em status — NUNCA expõe os tokens em si."""
    expirado = False
    if tok.expiry_date is not None:
        # expiry_date é epoch em milissegundos (padrão googleapis)
        expirado = (tok.expiry_date / 1000.0) <= time.time()
    return s.GoogleOauthStatusOut(
        empresa_id=tok.empresa_id,
        conectado=True,
        google_email=tok.google_email,
        scope=tok.scope,
        token_type=tok.token_type,
        expiry_date=tok.expiry_date,
        expirado=expirado,
        criado_em=tok.criado_em,
        atualizado_em=tok.atualizado_em,
    )


@_goauth.get("/iniciar")
async def iniciar_google_oauth(
    user: User = Depends(get_current_user),
):
    """Devolve a URL de consentimento do Google para a empresa do usuário.

    O front redireciona o navegador para essa URL; ao final o Google chama
    ``/callback``. O ``state`` carrega a empresa assinada (Fernet)."""
    empresa_id = _require_empresa(user)
    try:
        state = gsvc.assinar_state(empresa_id)
        url = gcal.build_auth_url(state)
    except gcal.GoogleNotConfigured as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
    return {"url": url}


@_goauth.get("/callback")
async def callback_google_oauth(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Callback do Google (rota PÚBLICA — o navegador é redirecionado para cá).

    Valida o state (assinado), troca o code por tokens, salva CRIPTOGRAFADO e
    redireciona o navegador de volta ao front com ?google_oauth=ok|erro.
    """
    destino = f"{settings.frontend_base_url}/?google_oauth="

    if error or not code or not state:
        return RedirectResponse(destino + "erro", status_code=302)
    try:
        empresa_id = gsvc.verificar_state(state)
    except ValueError:
        return RedirectResponse(destino + "erro", status_code=302)
    try:
        token_json = await gcal.exchange_code(code)
        email = await gcal.get_email(token_json["access_token"])
        await gsvc.salvar_tokens(
            db, empresa_id=empresa_id, token_json=token_json, email=email
        )
    except (gcal.GoogleError, KeyError):
        return RedirectResponse(destino + "erro", status_code=302)
    return RedirectResponse(destino + "ok", status_code=302)


@_goauth.get("/status", response_model=s.GoogleOauthStatusOut)
async def status_google_oauth(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Status da conexão Google OAuth da empresa — sem expor tokens."""
    empresa_id = _require_empresa(user)
    tok = await db.scalar(
        select(m.GoogleOauthTokens).where(
            m.GoogleOauthTokens.empresa_id == empresa_id
        )
    )
    if tok is None:
        return s.GoogleOauthStatusOut(
            empresa_id=empresa_id,
            conectado=False,
            google_email=None,
            scope=None,
            token_type=None,
            expiry_date=None,
            expirado=False,
            criado_em=None,
            atualizado_em=None,
        )
    return _token_status(tok)


@_goauth.put("/tokens", response_model=s.GoogleOauthStatusOut)
async def salvar_google_oauth(
    payload: s.GoogleOauthTokenIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert dos tokens OAuth da empresa. Resposta é só status (sem tokens)."""
    empresa_id = _require_empresa(user)
    tok = await db.scalar(
        select(m.GoogleOauthTokens).where(
            m.GoogleOauthTokens.empresa_id == empresa_id
        )
    )
    data = payload.model_dump(exclude_unset=True)
    now = datetime.datetime.now(datetime.timezone.utc)
    if tok is None:
        tok = m.GoogleOauthTokens(id=uuid.uuid4(), empresa_id=empresa_id, **data)
        db.add(tok)
    else:
        for k, v in data.items():
            setattr(tok, k, v)
        tok.atualizado_em = now
    await db.commit()
    await db.refresh(tok)
    return _token_status(tok)


@_goauth.delete("/tokens", status_code=status.HTTP_204_NO_CONTENT)
async def revogar_google_oauth(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Revoga (remove) a conexão Google OAuth da própria empresa."""
    empresa_id = _require_empresa(user)
    result = await db.execute(
        sa_delete(m.GoogleOauthTokens).where(
            m.GoogleOauthTokens.empresa_id == empresa_id
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "nenhuma conexão encontrada")


# ── cbo_ocupacoes (GLOBAL, só leitura) ────────────────────────────────────────

_cbo = APIRouter(prefix="/cbo", tags=["cbo"])


@_cbo.get("", response_model=list[s.CboOcupacaoOut])
async def listar_cbo(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    q: str | None = Query(None, description="Busca por código ou descrição (ILIKE)"),
    limit: int = Query(50, ge=1, le=200),
):
    """Lista/busca ocupações CBO (tabela de referência global)."""
    stmt = select(m.CboOcupacoes)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                m.CboOcupacoes.codigo.ilike(like),
                m.CboOcupacoes.codigo_formatado.ilike(like),
                m.CboOcupacoes.descricao.ilike(like),
            )
        )
    stmt = stmt.order_by(m.CboOcupacoes.codigo).limit(limit)
    result = await db.scalars(stmt)
    return list(result)


# ── tickets_sla_config (empresa, singleton) ───────────────────────────────────

_sla = APIRouter(prefix="/sla-config", tags=["sla-config"])


@_sla.get("", response_model=s.SlaConfigOut)
async def obter_sla_config(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retorna a config de SLA da empresa, criando defaults se ainda não existir."""
    empresa_id = _require_empresa(user)
    cfg = await db.scalar(
        select(m.TicketsSlaConfig).where(
            m.TicketsSlaConfig.empresa_id == empresa_id
        )
    )
    if cfg is None:
        cfg = m.TicketsSlaConfig(id=uuid.uuid4(), empresa_id=empresa_id)
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


@_sla.put("", response_model=s.SlaConfigOut)
async def atualizar_sla_config(
    payload: s.SlaConfigUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upsert da config de SLA da empresa."""
    empresa_id = _require_empresa(user)
    cfg = await db.scalar(
        select(m.TicketsSlaConfig).where(
            m.TicketsSlaConfig.empresa_id == empresa_id
        )
    )
    data = payload.model_dump(exclude_unset=True)
    if cfg is None:
        cfg = m.TicketsSlaConfig(id=uuid.uuid4(), empresa_id=empresa_id, **data)
        db.add(cfg)
    else:
        for k, v in data.items():
            setattr(cfg, k, v)
    await db.commit()
    await db.refresh(cfg)
    return cfg


# ── Montagem dos sub-routers ──────────────────────────────────────────────────
router.include_router(_logs)
router.include_router(_updates)
router.include_router(_imports)
router.include_router(_goauth)
router.include_router(_cbo)
router.include_router(_sla)
