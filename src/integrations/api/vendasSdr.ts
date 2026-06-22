/**
 * Client de Vendas — SDR Inteligente (Toriq Vendas Fase 4).
 *
 * Cobre o agente SDR com Claude: configuração dos prompts dinâmicos (persona,
 * objetivo, prompt_sistema, diretrizes, prompt_qualificacao, modelo,
 * temperatura, api_key), qualificação de leads (score 0-100 + status + notas),
 * geração de respostas (conversa) e estatísticas. Bate com o backend FastAPI
 * (`/vendas/sdr`, snake_case). Usa o client interno `@/integrations/api/client`,
 * que envia o cookie httpOnly de auth e faz refresh transparente em 401.
 *
 * Complementa `@/integrations/api/vendas` (Fase 0 — leads/tags/segmentação) e
 * `@/integrations/api/vendasDisparo` (Fase 2 — disparo de e-mail). A api_key do
 * provedor é armazenada criptografada e nunca volta em claro.
 */

import { api } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando os schemas do backend)
// ---------------------------------------------------------------------------

/** Configuração pública do agente SDR (a api_key nunca volta em claro). */
export interface SdrConfigPublic {
  provider: string | null;
  modelo: string | null;
  prompt_sistema: string | null;
  temperatura: number | null;
  diretrizes: string | null;
  prompt_qualificacao: string | null;
  persona: string | null;
  objetivo: string | null;
  ativo: boolean;
  auto_responder: boolean;
  notificar_telefones: string | null;
  canal_saida_padrao: string | null;
  api_key_set: boolean;
  api_key_masked: string | null;
  openai_api_key_set?: boolean;
  openai_api_key_masked?: string | null;
}

/** Payload de atualização da config (api_key em claro só ao alterar). */
export interface SdrConfigUpdate {
  provider?: string | null;
  api_key?: string | null;
  modelo?: string | null;
  prompt_sistema?: string | null;
  temperatura?: number | null;
  diretrizes?: string | null;
  prompt_qualificacao?: string | null;
  persona?: string | null;
  objetivo?: string | null;
  ativo?: boolean | null;
  auto_responder?: boolean | null;
  notificar_telefones?: string | null;
  canal_saida_padrao?: string | null;
  clear_api_key?: boolean | null;
  openai_api_key?: string | null; // Whisper (transcrição de áudio do WhatsApp)
  clear_openai_api_key?: boolean | null;
}

/** Lead na visão do SDR (campos sdr_* incluídos). */
export interface SdrLead {
  id: string;
  empresa_id: string;
  nome: string | null;
  empresa_nome: string | null;
  telefone: string | null;
  email: string | null;
  plataforma: string | null;
  cidade: string | null;
  estado: string | null;
  status: string | null;
  sdr_status: string | null;
  sdr_score: number | null;
  sdr_notas: string | null;
  sdr_proximo_followup: string | null;
  created_at: string | null;
}

export interface SdrLeadsListResponse {
  items: SdrLead[];
  total: number;
}

/** Filtros aceitos por GET /vendas/sdr/leads. */
export interface SdrLeadFilters {
  sdr_status?: string;
  score_min?: number;
  busca?: string;
  limit?: number;
  offset?: number;
}

/** Payload de edição manual de um lead (campos sdr_*). */
export interface SdrLeadPatch {
  sdr_status?: string | null;
  sdr_notas?: string | null;
  sdr_proximo_followup?: string | null;
}

/** Resultado da qualificação de um lead. */
export interface QualificarResult {
  lead_id: string;
  sdr_score: number | null;
  sdr_status: string | null;
  sdr_notas: string | null;
}

/** Resultado da qualificação em lote (assíncrona): o lote foi enfileirado para
 * a IA processar fora do request. O front reacompanha relendo os leads. */
export interface QualificarBatchResult {
  enfileirados: number;
  status: string;
}

/** Interação registrada na timeline do lead. */
export interface SdrInteracao {
  id: string;
  empresa_id: string;
  lead_id: string;
  papel: string | null;
  tipo: string | null;
  conteudo: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

/** Payload para registrar uma interação manual. */
export interface SdrInteracaoInput {
  tipo: string;
  conteudo: string;
  papel?: string;
}

/** Resultado da geração de resposta pelo agente. */
export interface SdrResponderResult {
  resposta: string;
}

/** Estatísticas agregadas do SDR. */
export interface SdrStats {
  total: number;
  por_status: Record<string, number>;
  score_medio: number | null;
  followups_pendentes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuery(filters: SdrLeadFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const vendasSdrApi = {
  // Configuração ---------------------------------------------------------
  getConfig: () => api.get<SdrConfigPublic>("/vendas/sdr/config"),

  saveConfig: (data: SdrConfigUpdate) =>
    api.put<SdrConfigPublic>("/vendas/sdr/config", data),

  // Estatísticas ---------------------------------------------------------
  getStats: () => api.get<SdrStats>("/vendas/sdr/stats"),

  // Leads ----------------------------------------------------------------
  listLeads: (filters: SdrLeadFilters = {}) =>
    api.get<SdrLeadsListResponse>(`/vendas/sdr/leads${buildQuery(filters)}`),

  patchLead: (id: string, data: SdrLeadPatch) =>
    api.patch<SdrLead>(`/vendas/sdr/leads/${id}`, data),

  qualificar: (id: string) =>
    api.post<QualificarResult>(`/vendas/sdr/leads/${id}/qualificar`),

  qualificarBatch: (lead_ids: string[]) =>
    api.post<QualificarBatchResult>("/vendas/sdr/qualificar-batch", { lead_ids }),

  // Interações / conversa ------------------------------------------------
  listInteracoes: (id: string) =>
    api.get<SdrInteracao[]>(`/vendas/sdr/leads/${id}/interacoes`),

  addInteracao: (id: string, data: SdrInteracaoInput) =>
    api.post<SdrInteracao>(`/vendas/sdr/leads/${id}/interacao`, data),

  responder: (id: string, mensagem: string) =>
    api.post<SdrResponderResult>(`/vendas/sdr/leads/${id}/responder`, { mensagem }),

  // Follow-ups -----------------------------------------------------------
  listFollowups: () => api.get<SdrLead[]>("/vendas/sdr/followups"),
};
