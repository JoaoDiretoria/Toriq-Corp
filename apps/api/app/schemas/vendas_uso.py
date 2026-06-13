"""Schemas Pydantic (v2) para o módulo Toriq Vendas — FASE 5 (Medição).

Espelham a saída do serviço ``app.services.vendas_uso`` e do router
``app.api.vendas_uso``. snake_case batendo com os models do backend.
"""
import uuid
from typing import Optional

from pydantic import BaseModel


class UsoMetricaOut(BaseModel):
    metrica: str
    quantidade: int


class UsoResumoOut(BaseModel):
    empresa_id: uuid.UUID
    periodo: Optional[str] = None
    metricas: list[UsoMetricaOut]
    total: int


class UsoEmpresaLinhaOut(BaseModel):
    empresa_id: uuid.UUID
    empresa_nome: Optional[str] = None
    metricas: list[UsoMetricaOut]
    total: int


class UsoEmpresasOut(BaseModel):
    periodo: Optional[str] = None
    itens: list[UsoEmpresaLinhaOut]
