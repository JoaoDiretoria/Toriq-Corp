"""Schemas Pydantic para o módulo Toriq Vendas — FASE 1 (Prospecção via Apify).

snake_case batendo com os models/colunas do backend. Escopo: configuração do token
Apify + disparo de actors de scraping + importação dos resultados em vendas_leads.
Tenant SEMPRE por user.empresa_id (carimbado no router).
"""
import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Config ──────────────────────────────────────────────────────────────────

class ConfigUpdate(BaseModel):
    apify_token: Optional[str] = None
    actors: Optional[dict] = None
    cache_dias: Optional[int] = None
    clear_apify_token: Optional[bool] = None


class ConfigPublic(BaseModel):
    apify_token_set: bool
    apify_token_masked: Optional[str] = None
    actors: Optional[dict] = None
    cache_dias: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ── Scraping ──────────────────────────────────────────────────────────────────

class ScrapingStartIn(BaseModel):
    plataforma: str
    parametros: dict
    tag_nome: Optional[str] = None


class ScrapingStatusIn(BaseModel):
    job_id: uuid.UUID


class ScrapingStatusOut(BaseModel):
    job_id: uuid.UUID
    status: str
    total_captados: int


class ScrapingResultsIn(BaseModel):
    job_id: uuid.UUID
    force: bool = False


class ScrapingResultsOut(BaseModel):
    inseridos: int
    duplicados: int
    total: int


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobOut(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    plataforma: str
    parametros: Optional[dict]
    tag_id: Optional[uuid.UUID]
    apify_run_id: Optional[str]
    apify_dataset_id: Optional[str]
    status: str
    total_captados: int
    total_importados: int
    total_duplicados: int
    custo: Optional[float]
    from_cache: Optional[bool] = False
    erro: Optional[str]
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    finished_at: Optional[datetime.datetime]
    model_config = ConfigDict(from_attributes=True)
