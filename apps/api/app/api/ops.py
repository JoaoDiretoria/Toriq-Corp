"""Router do dashboard Ops/Suporte (/ops). Guard: require_ops."""
from __future__ import annotations

import datetime
import uuid

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_ops
from app.core.tokens import TokenError, decode_token
from app.api.auth import _set_auth_cookies
from app.core.config import settings
from app.core.db import get_db
from app.core.security import hash_password
from app.models.generated import Profiles
from app.models.user import User, UserRole
from app.models.user import User as UserModel
from app.schemas.ops import (
    AuditListOut,
    AuditRegistro,
    DatabaseOut,
    HealthOut,
    OpsEmpresaUpdateIn,
    OpsResetSenhaOut,
    OpsRoleUpdateIn,
    OpsUserOut,
    OpsUsersListOut,
    OpsUserUpdateIn,
    RedisKeysOut,
    RedisOverviewOut,
    SchedulerOut,
    TicketResumo,
    TicketsListOut,
    TicketsMetricsOut,
)
from app.services import ops as ops_service

router = APIRouter(prefix="/ops", tags=["ops"])


@router.get("/health", response_model=HealthOut)
async def health(
    request: Request,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> HealthOut:
    base = await ops_service.montar_health(db)

    started_at = getattr(request.app.state, "started_at", None)
    if started_at is not None:
        uptime = int(
            (datetime.datetime.now(tz=datetime.timezone.utc) - started_at).total_seconds()
        )
    else:
        uptime = 0

    scheduler = getattr(request.app.state, "scheduler", None)
    jobs = len(scheduler.get_jobs()) if scheduler is not None else None

    return HealthOut(
        status=base["status"],
        versao=request.app.version,
        uptime_segundos=uptime,
        dependencias=base["dependencias"],
        fila_profundidade=base["fila_profundidade"],
        scheduler_jobs=jobs,
    )


@router.get("/database/tables", response_model=DatabaseOut)
async def database_tables(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> DatabaseOut:
    tabelas = await ops_service.listar_tabelas(db)
    return DatabaseOut(
        tabelas=tabelas,
        total_tabelas=len(tabelas),
        pool=ops_service.pool_info(),
    )


@router.get("/redis/overview", response_model=RedisOverviewOut)
async def redis_overview(_: User = Depends(require_ops)) -> RedisOverviewOut:
    return RedisOverviewOut(**await ops_service.redis_overview())


@router.get("/redis/keys", response_model=RedisKeysOut)
async def redis_keys(
    prefix: str | None = None,
    _: User = Depends(require_ops),
) -> RedisKeysOut:
    prefixo = prefix or f"{settings.cache_prefix}:"
    return RedisKeysOut(**await ops_service.redis_keys(prefixo))


@router.get("/scheduler/jobs", response_model=SchedulerOut)
async def scheduler_jobs(
    request: Request,
    _: User = Depends(require_ops),
) -> SchedulerOut:
    scheduler = getattr(request.app.state, "scheduler", None)
    if scheduler is None:
        return SchedulerOut(rodando=False, jobs=[])
    jobs = [
        {"id": j.id, "nome": j.name or j.id, "proximo_run": j.next_run_time}
        for j in scheduler.get_jobs()
    ]
    return SchedulerOut(rodando=bool(scheduler.running), jobs=jobs)


@router.get("/tickets/metrics", response_model=TicketsMetricsOut)
async def tickets_metrics(
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsMetricsOut:
    return TicketsMetricsOut(**await ops_service.tickets_metrics(db))


@router.get("/tickets", response_model=TicketsListOut)
async def tickets(
    status: str | None = None,
    prioridade: str | None = None,
    limit: int = 100,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> TicketsListOut:
    rows = await ops_service.listar_tickets(db, status, prioridade, min(limit, 500))
    return TicketsListOut(
        tickets=[TicketResumo.model_validate(t) for t in rows],
        total=len(rows),
    )


@router.get("/users", response_model=OpsUsersListOut)
async def list_users(
    q: str | None = None,
    limit: int = 100,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUsersListOut:
    stmt = select(UserModel)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(
            func.lower(UserModel.email).like(like),
            func.lower(UserModel.nome).like(like),
        ))
    stmt = stmt.limit(min(limit, 500))
    rows = list((await db.scalars(stmt)).all())
    return OpsUsersListOut(
        users=[OpsUserOut.model_validate(u) for u in rows], total=len(rows)
    )


@router.get("/users/{user_id}", response_model=OpsUserOut)
async def get_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}", response_model=OpsUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: OpsUserUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    if payload.email is not None and payload.email != target.email:
        existe = await db.scalar(select(UserModel).where(UserModel.email == payload.email))
        if existe is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "email já cadastrado")
        target.email = payload.email
    if payload.nome is not None:
        target.nome = payload.nome
    if payload.ativo is not None:
        target.ativo = payload.ativo
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_user", target_user_id=target.id,
        details=payload.model_dump(exclude_none=True),
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}/role", response_model=OpsUserOut)
async def update_role(
    user_id: uuid.UUID,
    payload: OpsRoleUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    # suporte não pode conceder papéis de staff (suporte/admin_vertical) — anti-escalação.
    if payload.role in (UserRole.suporte, UserRole.admin_vertical) and actor.role != UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "conceder papel de staff requer admin_vertical")
    antigo = target.role.value
    target.role = payload.role
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_role", target_user_id=target.id,
        details={"de": antigo, "para": payload.role.value},
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.patch("/users/{user_id}/empresa", response_model=OpsUserOut)
async def update_empresa(
    user_id: uuid.UUID,
    payload: OpsEmpresaUpdateIn,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    target = await ops_service.get_alvo(db, actor, user_id)
    antigo = str(target.empresa_id) if target.empresa_id else None
    target.empresa_id = payload.empresa_id
    await ops_service._sync_profile(db, target)
    await ops_service.registrar_auditoria(
        db, actor, "update_empresa", target_user_id=target.id,
        details={"de": antigo, "para": str(payload.empresa_id) if payload.empresa_id else None},
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(target)
    return OpsUserOut.model_validate(target)


@router.post("/users/{user_id}/reset-senha", response_model=OpsResetSenhaOut)
async def reset_senha(
    user_id: uuid.UUID,
    request: Request,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsResetSenhaOut:
    import secrets, string
    target = await ops_service.get_alvo(db, actor, user_id)
    alfabeto = string.ascii_letters + string.digits
    temp = "".join(secrets.choice(alfabeto) for _ in range(16))
    target.senha_hash = hash_password(temp)
    profile = await db.get(Profiles, target.id)
    if profile is not None:
        profile.senha_alterada = False
    await ops_service.registrar_auditoria(
        db, actor, "reset_senha", target_user_id=target.id,
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsResetSenhaOut(ok=True, temp_password=temp)


@router.get("/audit", response_model=AuditListOut)
async def audit(
    limit: int = 200,
    _: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> AuditListOut:
    rows = await ops_service.listar_auditoria(db, min(limit, 1000))
    return AuditListOut(
        registros=[AuditRegistro.model_validate(r) for r in rows], total=len(rows)
    )


@router.post("/users/{user_id}/impersonate", response_model=OpsUserOut)
async def impersonate(
    user_id: uuid.UUID,
    request: Request,
    response: Response,
    actor: User = Depends(require_ops),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    """Impersona um usuário-alvo, emitindo tokens com claim imp_by = id do operador.

    Restrições de segurança:
    - get_alvo já bloqueia: self-target e staff targets para não-admin_vertical.
    - Adicionalmente: NUNCA permite impersonar admin_vertical (nem por admin_vertical).
    - Alvo deve estar ativo.
    """
    target = await ops_service.get_alvo(db, actor, user_id)
    # Upgrade de segurança: admin_vertical NUNCA pode ser impersonado.
    if target.role == UserRole.admin_vertical:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "não é permitido impersonar admin_vertical")
    if not target.ativo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "usuário inativo")
    _set_auth_cookies(response, target, imp_by=str(actor.id))
    await ops_service.registrar_auditoria(
        db, actor, "impersonate", target_user_id=target.id,
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsUserOut.model_validate(target)


@router.post("/stop-impersonate", response_model=OpsUserOut)
async def stop_impersonate(
    request: Request,
    response: Response,
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> OpsUserOut:
    """Encerra uma sessão de impersonação: restaura os cookies do operador original.

    A autoridade vem do claim imp_by no token atual — não requer require_ops
    porque o token pertence ao usuário impersonado (que pode não ser staff).
    """
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sem token de acesso")
    try:
        payload = decode_token(access_token)
    except TokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token inválido")
    # Só aceita o token de ACESSO (não o refresh) — espelha o guard de deps.py.
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "tipo de token inválido")
    operador_id = payload.get("imp_by")
    if not operador_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "não há impersonação ativa")
    operador = await db.get(UserModel, uuid.UUID(operador_id))
    if operador is None or not operador.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "operador inválido ou inativo")
    # Emite tokens do operador sem imp_by → encerra a impersonação.
    _set_auth_cookies(response, operador)
    await ops_service.registrar_auditoria(
        db, operador, "stop_impersonate",
        ip=request.client.host if request.client else None,
    )
    await db.commit()
    return OpsUserOut.model_validate(operador)
