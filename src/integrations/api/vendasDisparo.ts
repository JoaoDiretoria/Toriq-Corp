/**
 * Client de Vendas — Disparo em Massa por Email (Toriq Vendas Fase 2).
 *
 * Cobre configuração do provedor de email (SMTP), templates, campanhas, envio
 * com supressão (opt-out LGPD), rate limit, tracking de abertura e link de
 * descadastro. Bate com o backend FastAPI (`/vendas`, snake_case). Usa o client
 * interno `@/integrations/api/client`, que envia o cookie httpOnly de auth e
 * faz refresh transparente em 401.
 *
 * Complementa `@/integrations/api/vendas` (Fase 0 — leads/tags/segmentação) e
 * `@/integrations/api/vendasProspeccao` (Fase 1 — Apify). WhatsApp é Fase 3 —
 * o campo `canal` já existe para reuso, mas só "email" é usado agora.
 */

import { api, apiRequest } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando o backend)
// ---------------------------------------------------------------------------

/** Configuração pública do provedor de email (a senha SMTP nunca volta em claro). */
export interface DisparoConfig {
  email_provider: string | null;
  email_remetente: string | null;
  email_remetente_nome: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_use_tls: boolean | null;
  email_rate_limit: number | null;
  dedup_dias: number | null;
  smtp_password_set: boolean;
  smtp_password_masked: string | null;
}

/** Payload de atualização da config (senha em claro só ao alterar). */
export interface DisparoConfigUpdate {
  email_provider?: string | null;
  email_remetente?: string | null;
  email_remetente_nome?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_use_tls?: boolean | null;
  email_rate_limit?: number | null;
  dedup_dias?: number | null;
  clear_smtp_password?: boolean | null;
}

/** Template de mensagem (canal "email" por padrão). */
export interface DisparoTemplate {
  id: string;
  empresa_id: string;
  nome: string;
  canal: string;
  assunto: string | null;
  conteudo: string;
  categoria: string | null;
  meta_template_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Payload de criação de template. */
export interface DisparoTemplateInput {
  nome: string;
  canal?: string;
  assunto?: string | null;
  conteudo: string;
  categoria?: string | null;
  meta_template_name?: string | null;
}

/** Payload de edição de template (todos opcionais). */
export interface DisparoTemplateUpdate {
  nome?: string;
  canal?: string;
  assunto?: string | null;
  conteudo?: string;
  categoria?: string | null;
  meta_template_name?: string | null;
}

/** Campanha de disparo. */
export interface DisparoCampanha {
  id: string;
  empresa_id: string;
  nome: string;
  template_id: string | null;
  canal: string;
  segmento_id: string | null;
  lead_ids: string[] | null;
  agendada_para: string | null;
  status: string;
  total_destinatarios: number;
  total_enviados: number;
  total_erros: number;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

/** Payload de criação de campanha. */
export interface DisparoCampanhaInput {
  nome: string;
  template_id?: string | null;
  canal?: string;
  segmento_id?: string | null;
  lead_ids?: string[] | null;
  agendada_para?: string | null;
}

/** Payload de edição de campanha (só rascunho/agendada). */
export interface DisparoCampanhaUpdate {
  nome?: string;
  template_id?: string | null;
  canal?: string;
  segmento_id?: string | null;
  lead_ids?: string[] | null;
  agendada_para?: string | null;
  status?: string;
}

/** Resultado de uma rodada de envio. */
export interface EnviarCampanhaResult {
  campanha_id: string;
  status: string;
  total_destinatarios: number;
  enviados: number;
  suprimidos: number;
  erros: number;
  dedup: number;
}

/** Métricas/funil de uma campanha. */
export interface MetricasCampanha {
  campanha_id: string;
  total: number;
  por_status: Record<string, number>;
  enviados: number;
  entregues: number;
  lidos: number;
  respondidos: number;
  erros: number;
  taxa_entrega: number;
  taxa_leitura: number;
  taxa_resposta: number;
}

/** Mensagem individual de uma campanha. */
export interface DisparoMensagem {
  id: string;
  empresa_id: string;
  campanha_id: string;
  lead_id: string | null;
  canal: string | null;
  destinatario: string | null;
  status: string;
  provider_id: string | null;
  erro: string | null;
  enviado_em: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  respondeu_em: string | null;
  created_at: string | null;
}

/** Entrada da lista de supressão (opt-out). */
export interface DisparoSupressao {
  id: string;
  empresa_id: string;
  tipo: string;
  valor: string;
  motivo: string | null;
  created_at: string | null;
}

/** Payload de criação de supressão. */
export interface DisparoSupressaoInput {
  tipo: string;
  valor: string;
  motivo?: string | null;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const vendasDisparoApi = {
  // Configuração ---------------------------------------------------------
  getConfig: () => api.get<DisparoConfig>("/vendas/disparo/config"),

  saveConfig: (data: DisparoConfigUpdate) =>
    api.put<DisparoConfig>("/vendas/disparo/config", data),

  // Templates ------------------------------------------------------------
  listTemplates: (canal?: string) =>
    api.get<DisparoTemplate[]>(
      `/vendas/templates${canal ? `?canal=${encodeURIComponent(canal)}` : ""}`,
    ),

  createTemplate: (data: DisparoTemplateInput) =>
    api.post<DisparoTemplate>("/vendas/templates", data),

  getTemplate: (id: string) =>
    api.get<DisparoTemplate>(`/vendas/templates/${id}`),

  updateTemplate: (id: string, data: DisparoTemplateUpdate) =>
    api.put<DisparoTemplate>(`/vendas/templates/${id}`, data),

  deleteTemplate: (id: string) => api.del<void>(`/vendas/templates/${id}`),

  // Campanhas ------------------------------------------------------------
  listCampanhas: () => api.get<DisparoCampanha[]>("/vendas/campanhas"),

  createCampanha: (data: DisparoCampanhaInput) =>
    api.post<DisparoCampanha>("/vendas/campanhas", data),

  getCampanha: (id: string) =>
    api.get<DisparoCampanha>(`/vendas/campanhas/${id}`),

  updateCampanha: (id: string, data: DisparoCampanhaUpdate) =>
    api.put<DisparoCampanha>(`/vendas/campanhas/${id}`, data),

  deleteCampanha: (id: string) => api.del<void>(`/vendas/campanhas/${id}`),

  enviarCampanha: (id: string) =>
    api.post<EnviarCampanhaResult>(`/vendas/campanhas/${id}/enviar`),

  listMensagens: (id: string, limit = 50, offset = 0) =>
    api.get<DisparoMensagem[]>(
      `/vendas/campanhas/${id}/mensagens?limit=${limit}&offset=${offset}`,
    ),

  getMetricas: (id: string) =>
    api.get<MetricasCampanha>(`/vendas/campanhas/${id}/metricas`),

  // Supressão (opt-out / LGPD) -------------------------------------------
  listSupressao: () => api.get<DisparoSupressao[]>("/vendas/supressao"),

  addSupressao: (data: DisparoSupressaoInput) =>
    api.post<DisparoSupressao>("/vendas/supressao", data),

  removeSupressao: (id: string) =>
    apiRequest<void>(`/vendas/supressao/${id}`, { method: "DELETE" }),
};
