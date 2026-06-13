/**
 * Client de Vendas — Prospecção (Toriq Vendas Fase 1).
 *
 * Cobre configuração do Apify (token + actors) e disparo/acompanhamento de jobs
 * de scraping, batendo com o backend FastAPI (`/vendas`, snake_case). Usa o
 * client interno `@/integrations/api/client`, que envia o cookie httpOnly de
 * auth e faz refresh transparente em 401.
 *
 * Complementa `@/integrations/api/vendas` (Fase 0 — leads/tags/segmentação).
 */

import { api } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando o backend)
// ---------------------------------------------------------------------------

/** Configuração pública (o token nunca é devolvido em claro). */
export interface ProspeccaoConfig {
  apify_token_set: boolean;
  apify_token_masked: string | null;
  actors: Record<string, string> | null;
}

/** Payload de atualização da config. */
export interface ProspeccaoConfigUpdate {
  apify_token?: string;
  actors?: Record<string, string>;
  clear_apify_token?: boolean;
}

/** Job de scraping. */
export interface ProspeccaoJob {
  id: string;
  empresa_id: string;
  plataforma: string;
  parametros: Record<string, unknown> | null;
  tag_id: string | null;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  status: string;
  total_captados: number;
  total_importados: number;
  total_duplicados: number;
  custo: number | null;
  erro: string | null;
  created_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
}

export interface ProspeccaoStatus {
  job_id: string;
  status: string;
  total_captados: number;
}

export interface ProspeccaoResults {
  inseridos: number;
  duplicados: number;
  total: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const prospeccaoApi = {
  // Configuração ---------------------------------------------------------
  getConfig: () => api.get<ProspeccaoConfig>("/vendas/config"),

  saveConfig: (data: ProspeccaoConfigUpdate) =>
    api.put<ProspeccaoConfig>("/vendas/config", data),

  // Scraping -------------------------------------------------------------
  startScraping: (
    plataforma: string,
    parametros: Record<string, unknown>,
    tag_nome?: string,
  ) =>
    api.post<ProspeccaoJob>("/vendas/scraping/start", {
      plataforma,
      parametros,
      tag_nome,
    }),

  checkStatus: (job_id: string) =>
    api.post<ProspeccaoStatus>("/vendas/scraping/status", { job_id }),

  fetchResults: (job_id: string, force = false) =>
    api.post<ProspeccaoResults>("/vendas/scraping/results", { job_id, force }),

  // Jobs -----------------------------------------------------------------
  listJobs: (limit = 20) =>
    api.get<ProspeccaoJob[]>(`/vendas/jobs?limit=${limit}`),

  cancelJob: (job_id: string) =>
    api.post<ProspeccaoJob>(`/vendas/jobs/${job_id}/cancel`),
};
