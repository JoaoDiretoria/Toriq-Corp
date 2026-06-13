/**
 * Client de Vendas (Toriq Vendas — Fase 0).
 *
 * Cobre leads + tags + segmentação + import, batendo com o backend FastAPI
 * (`/vendas`, snake_case). Usa o client interno `@/integrations/api/client`,
 * que envia o cookie httpOnly de auth e faz refresh transparente em 401.
 *
 * NÃO inclui Apify/scraping, disparo, WhatsApp ou SDR (fases 1-4).
 */

import { api, apiRequest } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando o backend)
// ---------------------------------------------------------------------------

export interface VendasLead {
  id: string;
  empresa_id: string;
  nome: string | null;
  empresa_nome: string | null;
  telefone: string | null;
  email: string | null;
  plataforma: string | null;
  cidade: string | null;
  estado: string | null;
  avaliacao: number | null;
  dados_brutos: Record<string, unknown> | null;
  status: string;
  origem: string | null;
  consentimento: boolean;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
  /** Tags vinculadas — preenchido pelo backend quando disponível. */
  tags?: VendasTag[];
}

export interface VendasTag {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string | null;
  created_at: string;
  /** Contagem de leads associados — quando o backend devolve. */
  total_leads?: number;
}

export interface VendasSegmento {
  id: string;
  empresa_id: string;
  nome: string;
  filtros: VendasLeadFilters;
  cor: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  /** Contagem de leads do segmento — quando o backend devolve. */
  total_leads?: number;
}

/** Filtros aceitos por GET /vendas/leads e salvos em segmentos. */
export interface VendasLeadFilters {
  status?: string;
  busca?: string;
  cidade?: string;
  estado?: string;
  plataforma?: string;
  avaliacao_min?: number;
  tag_ids?: string[];
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

/** Payload de criação/edição de lead manual. */
export interface VendasLeadInput {
  nome?: string | null;
  empresa_nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  plataforma?: string | null;
  cidade?: string | null;
  estado?: string | null;
  avaliacao?: number | null;
  status?: string | null;
  origem?: string | null;
  consentimento?: boolean | null;
}

/** Linha de import (subconjunto editável). */
export interface VendasLeadImportRow {
  nome?: string | null;
  empresa_nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  cidade?: string | null;
  estado?: string | null;
  plataforma?: string | null;
}

export interface VendasListResponse {
  items: VendasLead[];
  total: number;
}

export interface VendasImportResponse {
  inseridos: number;
  duplicados: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuery(filters: VendasLeadFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") params.append(key, String(v));
      });
    } else {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const vendasApi = {
  // Leads
  listLeads: (filters: VendasLeadFilters = {}) =>
    api.get<VendasListResponse>(`/vendas/leads${buildQuery(filters)}`),

  createLead: (data: VendasLeadInput) =>
    api.post<VendasLead>("/vendas/leads", data),

  updateLead: (id: string, data: Partial<VendasLeadInput>) =>
    api.patch<VendasLead>(`/vendas/leads/${id}`, data),

  deleteLeads: (ids: string[]) =>
    apiRequest<{ deletados?: number } | void>("/vendas/leads", {
      method: "DELETE",
      body: { ids },
    }),

  importLeads: (leads: VendasLeadImportRow[]) =>
    api.post<VendasImportResponse>("/vendas/leads/import", { leads }),

  // Tags
  listTags: () => api.get<VendasTag[]>("/vendas/tags"),

  createTag: (nome: string, cor?: string) =>
    api.post<VendasTag>("/vendas/tags", { nome, cor }),

  deleteTag: (id: string) => api.del<void>(`/vendas/tags/${id}`),

  addTagToLeads: (lead_ids: string[], tag_id: string) =>
    api.post<void>("/vendas/leads/tags", { lead_ids, tag_id }),

  removeTagFromLeads: (lead_ids: string[], tag_id: string) =>
    apiRequest<void>("/vendas/leads/tags", {
      method: "DELETE",
      body: { lead_ids, tag_id },
    }),

  // Segmentos
  listSegmentos: () => api.get<VendasSegmento[]>("/vendas/segmentos"),

  createSegmento: (
    nome: string,
    filtros: VendasLeadFilters,
    cor?: string,
    descricao?: string,
  ) => api.post<VendasSegmento>("/vendas/segmentos", { nome, filtros, cor, descricao }),

  updateSegmento: (
    id: string,
    data: { nome?: string; filtros?: VendasLeadFilters; cor?: string; descricao?: string },
  ) => api.put<VendasSegmento>(`/vendas/segmentos/${id}`, data),

  deleteSegmento: (id: string) => api.del<void>(`/vendas/segmentos/${id}`),

  getSegmentoLeads: (id: string, limit = 25, offset = 0) =>
    api.get<VendasListResponse>(
      `/vendas/segmentos/${id}/leads?limit=${limit}&offset=${offset}`,
    ),
};
