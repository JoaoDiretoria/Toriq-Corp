/**
 * Client de Medição de Uso (Toriq Vendas — Fase 5).
 *
 * Cobre o consumo do módulo Toriq Vendas por empresa, que serve de base para
 * planos/contratação (white-label). Bate com o backend FastAPI (`/vendas/uso`,
 * snake_case). Usa o client interno `@/integrations/api/client`, que envia o
 * cookie httpOnly de auth e faz refresh transparente em 401.
 *
 * - getResumo: uso da PRÓPRIA empresa do usuário.
 * - getResumoEmpresas: visão cross-empresa (somente admin_vertical).
 */

import { api } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando os schemas do backend)
// ---------------------------------------------------------------------------

/** Espelha UsoMetricaOut. */
export interface UsoMetrica {
  metrica: string;
  quantidade: number;
}

/** Espelha UsoResumoOut — uso da própria empresa. */
export interface UsoResumo {
  empresa_id: string;
  periodo: string | null;
  metricas: UsoMetrica[];
  total: number;
}

/** Espelha UsoEmpresaLinhaOut — uma linha por empresa na visão cross-empresa. */
export interface UsoEmpresaLinha {
  empresa_id: string;
  empresa_nome: string | null;
  metricas: UsoMetrica[];
  total: number;
}

/** Espelha UsoEmpresasOut — visão cross-empresa para cobrança. */
export interface UsoEmpresas {
  periodo: string | null;
  itens: UsoEmpresaLinha[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

function periodoQuery(periodo?: string): string {
  return periodo ? `?periodo=${encodeURIComponent(periodo)}` : "";
}

export const vendasUsoApi = {
  /** Uso da própria empresa. Sem `periodo` = acumulado total. */
  getResumo: (periodo?: string) =>
    api.get<UsoResumo>(`/vendas/uso${periodoQuery(periodo)}`),

  /** Visão cross-empresa (somente admin_vertical). Sem `periodo` = acumulado. */
  getResumoEmpresas: (periodo?: string) =>
    api.get<UsoEmpresas>(`/vendas/uso/empresas${periodoQuery(periodo)}`),
};
