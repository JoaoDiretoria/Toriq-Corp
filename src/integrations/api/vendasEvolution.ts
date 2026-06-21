/**
 * Client de Vendas — Canal WhatsApp via Evolution API.
 *
 * Cobre o canal WhatsApp self-hosted (Evolution API), paralelo ao Meta:
 * - Config do servidor global (super admin): base_url + api_key (criptografada) +
 *   webhook_base_url + limite padrão de instâncias.
 * - Gestão de instâncias por empresa: criar, listar, QR code, status, enviar, deletar.
 *
 * Bate com o backend FastAPI (`/vendas/evolution`, snake_case). Usa o client
 * interno `@/integrations/api/client`, que envia o cookie httpOnly de auth e faz
 * refresh transparente em 401. A api_key do servidor nunca volta em claro.
 */

import { api } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando os schemas do backend)
// ---------------------------------------------------------------------------

/** Config pública do servidor Evolution (api_key nunca volta em claro). */
export interface ServidorPublic {
  base_url: string | null;
  webhook_base_url: string | null;
  limite_padrao_instancias: number | null;
  ativo: boolean | null;
  api_key_set: boolean;
  api_key_masked: string | null;
}

export interface ServidorUpdate {
  base_url?: string | null;
  api_key?: string | null; // vazio/omisso = mantém a atual
  webhook_base_url?: string | null;
  limite_padrao_instancias?: number | null;
  ativo?: boolean | null;
}

export interface Instancia {
  id: string;
  empresa_id: string;
  nome_exibicao: string;
  instance_name: string;
  numero: string | null;
  status: string | null; // criada | conectando | conectada | desconectada
  created_at: string | null;
}

export interface InstanciaIn {
  nome_exibicao: string;
  empresa_id?: string | null; // só super admin pode informar outra empresa
}

export interface QRCode {
  base64: string | null;
  code: string | null;
}

export interface StatusOut {
  status: string;
}

export interface EnviarIn {
  numero: string;
  texto: string;
}

export interface EnviarOut {
  enviado: boolean;
  provider_id: string | null;
  erro: string | null;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const vendasEvolutionApi = {
  // Servidor (super admin)
  getServidor: () => api.get<ServidorPublic>("/vendas/evolution/servidor"),
  saveServidor: (data: ServidorUpdate) =>
    api.put<ServidorPublic>("/vendas/evolution/servidor", data),

  // Instâncias (empresa)
  listInstancias: () =>
    api.get<Instancia[]>("/vendas/evolution/instancias"),
  criarInstancia: (data: InstanciaIn) =>
    api.post<Instancia>("/vendas/evolution/instancias", data),
  getQrcode: (id: string) =>
    api.get<QRCode>(`/vendas/evolution/instancias/${id}/qrcode`),
  getStatus: (id: string) =>
    api.get<StatusOut>(`/vendas/evolution/instancias/${id}/status`),
  deletarInstancia: (id: string) =>
    api.del<{ ok: boolean }>(`/vendas/evolution/instancias/${id}`),
  enviar: (id: string, data: EnviarIn) =>
    api.post<EnviarOut>(`/vendas/evolution/instancias/${id}/enviar`, data),
};
