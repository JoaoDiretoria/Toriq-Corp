/**
 * Client do Toriq Vendas — Pipeline & Conversas (CRM estilo Chatwoot).
 *
 * Cobre estágios da pipeline (kanban), board, movimentação de leads, inbox de
 * conversas (thread por lead), envio de resposta (WhatsApp), marcar como lido e
 * dashboard de conversão. Bate com o backend FastAPI (`/vendas`, snake_case).
 *
 * Tempo real via SSE: `conectarEventos` abre um EventSource para o stream de
 * eventos da empresa (Redis pub/sub no backend), reaproveitando o cookie de
 * auth (`withCredentials`).
 *
 * Usa o client interno `@/integrations/api/client`, que envia o cookie httpOnly
 * de auth e faz refresh transparente em 401.
 */

import { api, apiRequest } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando os schemas Pydantic do backend)
// ---------------------------------------------------------------------------

/** Estágio (coluna) da pipeline. */
export interface PipelineStage {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  is_closed: boolean;
  is_won: boolean;
}

/** Payload de criação de estágio. */
export interface StageInput {
  nome: string;
  cor?: string | null;
  ordem?: number | null;
  is_closed?: boolean | null;
  is_won?: boolean | null;
}

/** Payload de atualização de estágio (todos opcionais). */
export interface StageUpdate {
  nome?: string | null;
  cor?: string | null;
  ordem?: number | null;
  is_closed?: boolean | null;
  is_won?: boolean | null;
}

/** Tag vinculada ao lead (subconjunto devolvido nos cards). */
export interface LeadCardTag {
  id?: string;
  nome?: string;
  cor?: string | null;
  [key: string]: unknown;
}

/** Card de lead no board / na inbox. */
export interface LeadCard {
  id: string;
  nome: string | null;
  empresa_nome: string | null;
  telefone: string | null;
  email: string | null;
  stage_id: string | null;
  temperatura: string | null;
  valor_estimado: number | null;
  sdr_score: number | null;
  status: string | null;
  origem: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  pending_reply: boolean;
  unread: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  tags: LeadCardTag[];
  assigned_to: string | null;
  assigned_to_nome: string | null;
}

/** Operador (usuário) da empresa — seletor de responsável. */
export interface Operador {
  id: string;
  nome: string;
}

/** Board completo (estágios + leads). */
export interface Board {
  stages: PipelineStage[];
  leads: LeadCard[];
}

/** Payload de movimentação de lead entre estágios. */
export interface MoverLeadInput {
  stage_id: string;
  valor_estimado?: number | null;
  motivo?: string | null;
}

/** Payload de patch de lead (campos pontuais do card). */
export interface LeadPatchInput {
  stage_id?: string | null;
  temperatura?: string | null;
  valor_estimado?: number | null;
  is_pinned?: boolean | null;
  is_archived?: boolean | null;
  assigned_to?: string | null;
}

/** Mensagem de uma conversa (thread). */
export interface ConversaMensagem {
  id: string;
  empresa_id: string;
  lead_id: string;
  sender_type: string;
  canal: string | null;
  conteudo: string | null;
  status: string | null;
  media: Record<string, unknown> | null;
  created_at: string | null;
}

/** Thread de conversa (lead + mensagens em ordem cronológica). */
export interface ConversaThread {
  lead: LeadCard;
  mensagens: ConversaMensagem[];
  /** Janela de 24h do WhatsApp aberta? Fora dela, só template HSM. */
  janela_aberta: boolean;
  /** Quando a janela de 24h expira (ISO) ou null se não há inbound. */
  janela_expira_em: string | null;
}

/** Template WhatsApp aprovado (HSM) para reabrir conversa fora das 24h. */
export interface TemplateAprovado {
  id: string;
  nome: string;
  conteudo: string;
  meta_template_name: string | null;
  approval_status: string | null;
}

/** Filtros aceitos por GET /vendas/conversas. */
export interface ConversasFilters {
  busca?: string;
  tag_id?: string;
  temperatura?: string;
  stage_id?: string;
  assigned_to?: string;
  minhas?: boolean;
  arquivados?: boolean;
  limit?: number;
  offset?: number;
}

/** Item do dashboard de conversão (por estágio). */
export interface ConversaoItem {
  stage_id: string;
  nome: string;
  cor: string | null;
  total: number;
  valor: number;
}

/** Dashboard de conversão completo. */
export interface Conversao {
  itens: ConversaoItem[];
  total_leads: number;
  valor_total: number;
}

/** Indicadores de desempenho da pipeline. */
export interface Analytics {
  total_leads: number;
  ganhos: number;
  perdidos: number;
  valor_ganho: number;
  taxa_conversao: number;
  por_origem: { origem: string; total: number; ganhos: number; valor_ganho: number }[];
  por_temperatura: { temperatura: string; total: number }[];
}

/** Evento recebido via SSE (Redis pub/sub). */
export interface EventoPipeline {
  tipo: "conversa_nova_mensagem" | "lead_atualizado" | "lead_movido" | "ping" | string;
  lead_id?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * URL do proxy autenticado de mídia (imagem/áudio/vídeo/doc recebidos no
 * WhatsApp). Usada direto em <img>/<audio>/<video> src — o cookie httpOnly de
 * auth é enviado porque a API é same-site (subdomínio do mesmo domínio).
 */
export function mediaUrl(mediaId: string): string {
  return `${API_URL}/vendas/conversas/media/${encodeURIComponent(mediaId)}`;
}

function buildQuery(filters: ConversasFilters): string {
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

export const vendasPipelineApi = {
  // Estágios (kanban)
  getStages: () => api.get<PipelineStage[]>("/vendas/pipeline/stages"),

  createStage: (data: StageInput) =>
    api.post<PipelineStage>("/vendas/pipeline/stages", data),

  updateStage: (id: string, data: StageUpdate) =>
    api.put<PipelineStage>(`/vendas/pipeline/stages/${id}`, data),

  deleteStage: (id: string) => api.del<void>(`/vendas/pipeline/stages/${id}`),

  // Board
  getBoard: () => api.get<Board>("/vendas/pipeline/board"),

  // Operadores (responsáveis)
  listOperadores: () =>
    api.get<Operador[]>("/vendas/pipeline/operadores"),

  // Leads (movimentação / patch)
  moverLead: (id: string, data: MoverLeadInput) =>
    api.post<LeadCard>(`/vendas/pipeline/leads/${id}/mover`, data),

  patchLead: (id: string, data: LeadPatchInput) =>
    api.patch<LeadCard>(`/vendas/pipeline/leads/${id}`, data),

  /** Persiste a ordem manual dos cards de um estágio (drag-and-drop). */
  reordenarColuna: (stageId: string, leadIds: string[]) =>
    api.post<void>(`/vendas/pipeline/stages/${stageId}/reordenar`, {
      lead_ids: leadIds,
    }),

  // Conversas (inbox)
  listConversas: (filters: ConversasFilters = {}) =>
    api.get<LeadCard[]>(`/vendas/conversas${buildQuery(filters)}`),

  getThread: (leadId: string) =>
    api.get<ConversaThread>(`/vendas/conversas/${leadId}`),

  enviarMensagem: (leadId: string, conteudo: string) =>
    api.post<ConversaMensagem>(`/vendas/conversas/${leadId}/mensagem`, { conteudo }),

  enviarTemplate: (leadId: string, templateId: string) =>
    api.post<ConversaMensagem>(`/vendas/conversas/${leadId}/template`, {
      template_id: templateId,
    }),

  /** Templates WhatsApp aprovados (HSM) — para reabrir conversa fora das 24h. */
  listTemplatesAprovados: async (): Promise<TemplateAprovado[]> => {
    const todos = await api.get<TemplateAprovado[]>(
      "/vendas/templates?canal=whatsapp",
    );
    return (todos ?? []).filter(
      (t) => t.approval_status === "approved" && !!t.meta_template_name,
    );
  },

  marcarLido: (leadId: string) =>
    apiRequest<void>(`/vendas/conversas/${leadId}/ler`, { method: "POST" }),

  // Conversão (dashboard)
  getConversao: () => api.get<Conversao>("/vendas/pipeline/conversao"),

  // Analytics (desempenho)
  getAnalytics: () => api.get<Analytics>("/vendas/pipeline/analytics"),
};

// ---------------------------------------------------------------------------
// Tempo real (SSE)
// ---------------------------------------------------------------------------

/**
 * Abre uma conexão SSE com o stream de eventos da empresa e chama `onEvento`
 * para cada evento recebido. Reaproveita o cookie de auth via `withCredentials`.
 *
 * Retorna a instância do `EventSource` — o chamador é responsável por chamar
 * `.close()` no cleanup (ex.: no unmount do componente).
 */
export function conectarEventos(
  onEvento: (evento: EventoPipeline) => void,
): EventSource {
  const es = new EventSource(`${API_URL}/vendas/eventos/stream`, {
    withCredentials: true,
  });

  es.onmessage = (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data) as EventoPipeline;
      onEvento(parsed);
    } catch {
      /* heartbeat / linha não-JSON — ignora */
    }
  };

  return es;
}
