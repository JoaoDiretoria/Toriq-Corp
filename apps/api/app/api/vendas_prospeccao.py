"""Toriq Vendas — FASE 1 (Prospecção via Apify).

Configuração do token Apify (criptografado em repouso) + disparo de actors de
scraping (Google Maps, Facebook, Instagram, Instagram-seguidores, LinkedIn) e
normalização dos resultados em leads existentes (tabela ``vendas_leads``).

Apify é plataforma terceira gerenciada — NÃO construímos evasão de detecção.
Tenant SEMPRE por user.empresa_id (403 se None). Acesso restrito a
admin_vertical / cliente_torq via require_role (mesma regra do app/api/vendas.py).

Reuso intencional:
- ``_dedupe_key`` segue a MESMA lógica de app/api/vendas.py (telefone só dígitos
  → "tel:..."; senão email lower/trim → "email:..."; senão None).
- Cripto via app/core/esocial_crypto.py (encrypt_secret/decrypt_secret/mask_secret).
"""
import datetime
import hashlib
import json
import re
import unicodedata
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import insert as sa_insert
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.db import get_db
from app.core.esocial_crypto import decrypt_secret, encrypt_secret, mask_secret
from app.integrations.apify import (
    DEFAULT_ACTORS,
    ApifyClient,
    ApifyError,
    build_actor_input,
    map_apify_status,
    normalize_items,
)
from app.models.user import User, UserRole
from app.models.vendas import VendasLeads, VendasLeadTags, VendasTags
from app.models.vendas_prospeccao import VendasConfig, VendasJobs
from app.schemas import vendas_prospeccao as s

router = APIRouter(prefix="/vendas", tags=["vendas-prospeccao"])

# Admin do módulo de Vendas (mesma regra de app/api/vendas.py).
require_admin = require_role(UserRole.admin_vertical, UserRole.cliente_torq)


def _require_empresa(user: User) -> uuid.UUID:
    if user.empresa_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "usuário sem empresa")
    return user.empresa_id


def _dedupe_key(telefone: Optional[str], email: Optional[str]) -> Optional[str]:
    """Normaliza telefone (somente dígitos) ou email (lower/trim) para dedupe.

    MESMA lógica de app/api/vendas.py — mantém a chave consistente entre import
    manual e prospecção, garantindo o unique parcial (empresa_id, dedupe_key).
    """
    if telefone:
        digitos = re.sub(r"\D", "", telefone)
        if digitos:
            return f"tel:{digitos}"
    if email:
        e = email.strip().lower()
        if e:
            return f"email:{e}"
    return None


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _parametros_hash(plataforma: str, parametros: dict) -> str:
    """Hash estável (plataforma + parâmetros ordenados) para o cache de busca."""
    base = plataforma + "|" + json.dumps(parametros or {}, sort_keys=True, default=str)
    return hashlib.sha256(base.encode()).hexdigest()


_UF_BY_NAME = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM",
    "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
    "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
    "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
    "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE",
    "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
    "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
    "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE",
    "tocantins": "TO",
}

def _location_key(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.casefold().split())

def _state_key(value: object) -> str:
    key = _location_key(value)
    return _UF_BY_NAME.get(key, key.upper() if len(key) == 2 else key)

def _matches_google_location(lead: dict, parametros: dict) -> bool:
    cidade = parametros.get("cidade")
    estado = parametros.get("estado")
    if cidade and _location_key(lead.get("cidade")) != _location_key(cidade):
        return False
    if estado and _state_key(lead.get("estado")) != _state_key(estado):
        return False
    return True

async def _get_config(
    db: AsyncSession, empresa_id: uuid.UUID
) -> Optional[VendasConfig]:
    return await db.scalar(
        select(VendasConfig).where(VendasConfig.empresa_id == empresa_id)
    )


async def _get_job(
    db: AsyncSession, job_id: uuid.UUID, empresa_id: uuid.UUID
) -> VendasJobs:
    job = await db.scalar(
        select(VendasJobs).where(
            VendasJobs.id == job_id, VendasJobs.empresa_id == empresa_id
        )
    )
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job não encontrado")
    return job


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG (token Apify + actors)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/config", response_model=s.ConfigPublic)
async def get_config(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Visão pública (sem vazar o token). Sem config → tudo nulo/falso."""
    empresa_id = _require_empresa(user)
    obj = await _get_config(db, empresa_id)
    if obj is None:
        return s.ConfigPublic(apify_token_set=False, apify_token_masked=None, actors=None)

    masked = None
    if obj.apify_token_enc:
        masked = mask_secret(decrypt_secret(obj.apify_token_enc))
    return s.ConfigPublic(
        apify_token_set=bool(obj.apify_token_enc),
        apify_token_masked=masked,
        actors=obj.actors,
        cache_dias=obj.cache_dias,
    )


@router.put("/config", response_model=s.ConfigPublic)
async def put_config(
    payload: s.ConfigUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upsert da config por empresa. Criptografa o token antes de gravar."""
    empresa_id = _require_empresa(user)
    obj = await _get_config(db, empresa_id)
    created = obj is None
    if created:
        obj = VendasConfig(empresa_id=empresa_id)

    # Token (segredo): clear tem precedência; senão grava se veio não-nulo.
    if payload.clear_apify_token:
        obj.apify_token_enc = None
    elif payload.apify_token is not None:
        obj.apify_token_enc = encrypt_secret(payload.apify_token)

    if payload.actors is not None:
        obj.actors = payload.actors
    if payload.cache_dias is not None:
        obj.cache_dias = payload.cache_dias

    obj.updated_at = _now()

    if created:
        db.add(obj)
    await db.commit()
    await db.refresh(obj)

    masked = None
    if obj.apify_token_enc:
        masked = mask_secret(decrypt_secret(obj.apify_token_enc))
    return s.ConfigPublic(
        apify_token_set=bool(obj.apify_token_enc),
        apify_token_masked=masked,
        actors=obj.actors,
        cache_dias=obj.cache_dias,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPING (start / status / results)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/scraping/start", response_model=s.JobOut)
async def scraping_start(
    payload: s.ScrapingStartIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Dispara um actor da Apify e cria um VendasJobs com o run resultante."""
    empresa_id = _require_empresa(user)

    config = await _get_config(db, empresa_id)
    if config is None or not config.apify_token_enc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "configure o token Apify")

    actor_id = (config.actors or {}).get(payload.plataforma) or DEFAULT_ACTORS.get(
        payload.plataforma
    )
    if not actor_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"plataforma sem actor configurado: {payload.plataforma}",
        )

    # Resolve tag (get-or-create por empresa+nome) se tag_nome veio.
    tag_id: Optional[uuid.UUID] = None
    if payload.tag_nome:
        tag = await db.scalar(
            select(VendasTags).where(
                VendasTags.empresa_id == empresa_id,
                VendasTags.nome == payload.tag_nome,
            )
        )
        if tag is None:
            tag = VendasTags(
                id=uuid.uuid4(), empresa_id=empresa_id, nome=payload.tag_nome
            )
            db.add(tag)
            await db.flush()
        tag_id = tag.id

    parametros_hash = _parametros_hash(payload.plataforma, payload.parametros)

    # Cache (Fase 8): reusa um job recente com os MESMOS parâmetros (sem rodar a
    # Apify de novo, economizando Compute Units). Não conta como run.
    if config.cache_dias and config.cache_dias > 0:
        cutoff = _now() - datetime.timedelta(days=config.cache_dias)
        cached = await db.scalar(
            select(VendasJobs)
            .where(
                VendasJobs.empresa_id == empresa_id,
                VendasJobs.plataforma == payload.plataforma,
                VendasJobs.parametros_hash == parametros_hash,
                VendasJobs.apify_dataset_id.isnot(None),
                VendasJobs.status.in_(["succeeded", "imported"]),
                VendasJobs.created_at >= cutoff,
            )
            .order_by(VendasJobs.created_at.desc())
            .limit(1)
        )
        if cached is not None:
            job = VendasJobs(
                id=uuid.uuid4(),
                empresa_id=empresa_id,
                plataforma=payload.plataforma,
                parametros=payload.parametros,
                tag_id=tag_id,
                apify_run_id=None,
                apify_dataset_id=cached.apify_dataset_id,
                status="succeeded",
                parametros_hash=parametros_hash,
                from_cache=True,
                total_captados=cached.total_captados,
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)
            return job

    try:
        run_input = build_actor_input(payload.plataforma, payload.parametros)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    client = ApifyClient(decrypt_secret(config.apify_token_enc))
    try:
        run = await client.run_actor(actor_id, run_input)
    except ApifyError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    job = VendasJobs(
        id=uuid.uuid4(),
        empresa_id=empresa_id,
        plataforma=payload.plataforma,
        parametros=payload.parametros,
        tag_id=tag_id,
        apify_run_id=run.get("id"),
        apify_dataset_id=run.get("defaultDatasetId"),
        status=map_apify_status(run.get("status", "")),
        parametros_hash=parametros_hash,
    )
    db.add(job)
    # Medição de uso (Fase 5): cada disparo de actor conta como 1 run Apify.
    from app.services.vendas_uso import registrar_uso

    await registrar_uso(
        db, empresa_id=empresa_id, metrica="apify_runs", referencia=str(job.id)
    )
    await db.commit()
    await db.refresh(job)
    return job


@router.post("/scraping/status", response_model=s.ScrapingStatusOut)
async def scraping_status(
    payload: s.ScrapingStatusIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Sincroniza o status do job com o run da Apify."""
    empresa_id = _require_empresa(user)
    job = await _get_job(db, payload.job_id, empresa_id)

    if job.apify_run_id:
        config = await _get_config(db, empresa_id)
        if config and config.apify_token_enc:
            client = ApifyClient(decrypt_secret(config.apify_token_enc))
            try:
                run = await client.get_run(job.apify_run_id)
            except ApifyError as exc:
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
            job.status = map_apify_status(run.get("status", ""))
            stats = run.get("stats") or {}
            item_count = stats.get("itemCount")
            if item_count is None:
                item_count = run.get("itemsCount")
            if item_count is not None:
                job.total_captados = item_count
            # Custo/Compute Units (Fase 8): grava o custo em USD reportado pela Apify.
            usd = run.get("usageTotalUsd")
            if usd is not None:
                try:
                    job.custo = float(usd)
                except (TypeError, ValueError):
                    pass
            await db.commit()
            await db.refresh(job)

    return s.ScrapingStatusOut(
        job_id=job.id,
        status=job.status,
        total_captados=job.total_captados or 0,
    )


@router.post("/scraping/results", response_model=s.ScrapingResultsOut)
async def scraping_results(
    payload: s.ScrapingResultsIn,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Importa os itens do dataset do job em vendas_leads (dedupe por empresa)."""
    empresa_id = _require_empresa(user)
    job = await _get_job(db, payload.job_id, empresa_id)

    if job.status != "succeeded" and not payload.force:
        raise HTTPException(status.HTTP_409_CONFLICT, "job ainda não concluído")

    itens: list[dict] = []
    if job.apify_dataset_id:
        config = await _get_config(db, empresa_id)
        if config and config.apify_token_enc:
            client = ApifyClient(decrypt_secret(config.apify_token_enc))
            try:
                itens = await client.get_dataset_items(job.apify_dataset_id)
            except ApifyError as exc:
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    leads = normalize_items(job.plataforma, itens)
    parametros = job.parametros or {}
    if job.plataforma == "google":
        leads = [lead for lead in leads if _matches_google_location(lead, parametros)]
    limite = parametros.get("max")
    try:
        if limite is not None and int(limite) > 0:
            leads = leads[: int(limite)]
    except (TypeError, ValueError):
        pass
    total = len(leads)
    inseridos = 0
    duplicados = 0
    vistos: set[str] = set()
    inserted_ids: list[uuid.UUID] = []

    for lead in leads:
        dedupe_key = _dedupe_key(lead.get("telefone"), lead.get("email"))

        if dedupe_key is not None:
            if dedupe_key in vistos:
                duplicados += 1
                continue
            existente = await db.scalar(
                select(VendasLeads.id).where(
                    VendasLeads.empresa_id == empresa_id,
                    VendasLeads.dedupe_key == dedupe_key,
                )
            )
            if existente is not None:
                duplicados += 1
                continue
            vistos.add(dedupe_key)

        new_id = uuid.uuid4()
        # INSERT via Core na __table__ usando a coluna job_id por nome.
        # requer coluna job_id (migration fase1) — adicionada pelo integrador.
        await db.execute(
            sa_insert(VendasLeads.__table__).values(
                id=new_id,
                empresa_id=empresa_id,
                nome=lead.get("nome"),
                empresa_nome=lead.get("empresa_nome"),
                telefone=lead.get("telefone"),
                email=lead.get("email"),
                cidade=lead.get("cidade"),
                estado=lead.get("estado"),
                plataforma=lead.get("plataforma"),
                avaliacao=lead.get("avaliacao"),
                dados_brutos=lead.get("dados_brutos"),
                dedupe_key=dedupe_key,
                origem="prospeccao",
                status="novo",
                job_id=job.id,  # requer coluna job_id (migration fase1)
            )
        )
        inserted_ids.append(new_id)
        inseridos += 1

    # Vincula os leads inseridos à tag do job (se houver).
    if job.tag_id and inserted_ids:
        rows = [{"lead_id": lid, "tag_id": job.tag_id} for lid in inserted_ids]
        await db.execute(
            pg_insert(VendasLeadTags)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["lead_id", "tag_id"])
        )

    job.total_importados = (job.total_importados or 0) + inseridos
    job.total_duplicados = (job.total_duplicados or 0) + duplicados
    job.status = "imported"
    job.finished_at = _now()

    # Medição de uso (Fase 5): leads efetivamente captados nesta importação.
    if inseridos:
        from app.services.vendas_uso import registrar_uso

        await registrar_uso(
            db,
            empresa_id=empresa_id,
            metrica="leads_captados",
            quantidade=inseridos,
            referencia=str(job.id),
        )

    await db.commit()
    return s.ScrapingResultsOut(inseridos=inseridos, duplicados=duplicados, total=total)


# ═══════════════════════════════════════════════════════════════════════════════
# JOBS (list / cancel)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs", response_model=list[s.JobOut])
async def listar_jobs(
    limit: int = Query(20, ge=1, le=200),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    result = await db.scalars(
        select(VendasJobs)
        .where(VendasJobs.empresa_id == empresa_id)
        .order_by(VendasJobs.created_at.desc())
        .limit(limit)
    )
    return list(result)


@router.post("/jobs/{job_id}/cancel", response_model=s.JobOut)
async def cancelar_job(
    job_id: uuid.UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = _require_empresa(user)
    job = await _get_job(db, job_id, empresa_id)

    if job.apify_run_id and job.status == "running":
        config = await _get_config(db, empresa_id)
        if config and config.apify_token_enc:
            client = ApifyClient(decrypt_secret(config.apify_token_enc))
            try:
                await client.abort_run(job.apify_run_id)
            except ApifyError as exc:
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    job.status = "aborted"
    job.finished_at = _now()
    await db.commit()
    await db.refresh(job)
    return job
