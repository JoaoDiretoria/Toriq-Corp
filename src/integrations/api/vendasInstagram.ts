/**
 * Client de Vendas — Automação Instagram (canal IG estilo ManyChat).
 * Bate com o backend FastAPI (`/vendas/instagram/*`, snake_case). Usa o client
 * interno `@/integrations/api/client` (cookie httpOnly + refresh em 401).
 * Segredos (token, app_secret) nunca voltam em claro — só `*_set` + `*_masked`.
 */
import { api } from "@/integrations/api/client";

export interface InstagramConfigPublic {
  instagram_user_id: string | null;
  instagram_username: string | null;
  instagram_verify_token: string | null;
  instagram_token_set: boolean;
  instagram_token_masked: string | null;
  instagram_app_secret_set: boolean;
}

export interface InstagramConfigUpdate {
  instagram_user_id?: string | null;
  instagram_username?: string | null;
  instagram_verify_token?: string | null;
  instagram_token?: string | null;
  instagram_app_secret?: string | null;
  clear_instagram_token?: boolean | null;
  clear_instagram_app_secret?: boolean | null;
}

export interface Gatilho {
  id: string;
  palavra_chave: string | null;
  ativo: boolean;
  responder_publico: boolean;
  responder_dm: boolean;
  instrucao_ia: string | null;
  resposta_publica_fixa: string | null;
}

export interface GatilhoInput {
  palavra_chave?: string | null;
  ativo?: boolean;
  responder_publico?: boolean;
  responder_dm?: boolean;
  instrucao_ia?: string | null;
  resposta_publica_fixa?: string | null;
}

export interface Comentario {
  id: string;
  comment_id: string;
  media_id: string | null;
  from_username: string | null;
  texto: string | null;
  lead_id: string | null;
  respondido_publico: boolean;
  respondido_dm: boolean;
  resposta_texto: string | null;
  erro: string | null;
  created_at: string | null;
}

export interface Post {
  id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  permalink: string | null;
  timestamp: string | null;
  comments_count: number | null;
}

export interface ComentarioIG {
  id: string | null;
  text: string | null;
  username: string | null;
  timestamp: string | null;
}

export interface RespostaManualPayload {
  texto: string;
  publico: boolean;
  dm: boolean;
  from_username?: string | null;
}

export interface InstagramStats {
  comentarios: number;
  respondidos: number;
  leads: number;
  erros: number;
}

export const vendasInstagramApi = {
  getConfig: () => api.get<InstagramConfigPublic>("/vendas/instagram/config"),
  saveConfig: (data: InstagramConfigUpdate) =>
    api.put<InstagramConfigPublic>("/vendas/instagram/config", data),

  getStats: () => api.get<InstagramStats>("/vendas/instagram/stats"),

  listGatilhos: () => api.get<Gatilho[]>("/vendas/instagram/gatilhos"),
  createGatilho: (data: GatilhoInput) =>
    api.post<Gatilho>("/vendas/instagram/gatilhos", data),
  updateGatilho: (id: string, data: GatilhoInput) =>
    api.put<Gatilho>(`/vendas/instagram/gatilhos/${id}`, data),
  deleteGatilho: (id: string) =>
    api.del<void>(`/vendas/instagram/gatilhos/${id}`),

  listComentarios: (limit = 50) =>
    api.get<Comentario[]>(`/vendas/instagram/comentarios?limit=${limit}`),

  listPosts: () => api.get<Post[]>("/vendas/instagram/posts"),

  listComentariosPost: (mediaId: string) =>
    api.get<ComentarioIG[]>(`/vendas/instagram/posts/${mediaId}/comentarios`),
  responderComentario: (commentId: string, data: RespostaManualPayload) =>
    api.post<{ ok: boolean; respondido_publico: boolean; respondido_dm: boolean }>(
      `/vendas/instagram/comentarios/${commentId}/responder`, data),
};
