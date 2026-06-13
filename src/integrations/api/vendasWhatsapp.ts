/**
 * Client de Vendas — Canal WhatsApp via API oficial Meta (Toriq Vendas Fase 3).
 *
 * A configuração do WhatsApp (Cloud API / Graph API) compartilha a MESMA tabela
 * e o MESMO endpoint da configuração de e-mail da Fase 2
 * (`/vendas/disparo/config`). Por isso este client bate no mesmo endpoint,
 * porém expondo apenas os campos `whatsapp_*` — o schema estendido do backend
 * aceita os dois conjuntos de campos na mesma requisição.
 *
 * Token permanente e app secret nunca voltam em claro: a resposta traz apenas
 * os flags `whatsapp_token_set` / `whatsapp_app_secret_set` (bool) indicando
 * se já estão configurados. Para alterar, envie o valor em claro no payload;
 * deixe ausente para manter o atual.
 *
 * Reusa templates (`canal='whatsapp'` + `meta_template_name`), campanhas
 * (`canal='whatsapp'`), mensagens e supressão (`tipo='telefone'`) da Fase 2 —
 * use o `@/integrations/api/vendasDisparo` para esses recursos.
 *
 * COMPLIANCE Meta: marketing exige template APROVADO (campanha usa
 * `template.meta_template_name`); mensagem livre (texto) só na janela de 24h
 * após o lead responder.
 */

import { api } from "@/integrations/api/client";

// ---------------------------------------------------------------------------
// Tipos (snake_case, espelhando o backend)
// ---------------------------------------------------------------------------

/**
 * Configuração pública do canal WhatsApp (token e app secret nunca voltam em
 * claro — apenas os flags `*_set`). Faz parte da resposta de
 * `/vendas/disparo/config`, ao lado dos campos de e-mail (Fase 2).
 */
export interface WhatsAppConfig {
  whatsapp_phone_id: string | null;
  whatsapp_waba_id: string | null;
  whatsapp_verify_token: string | null;
  whatsapp_rate_limit: number | null;
  /** Token permanente já configurado? (nunca volta em claro) */
  whatsapp_token_set: boolean;
  /** App secret já configurado? (nunca volta em claro) */
  whatsapp_app_secret_set: boolean;
}

/**
 * Payload de atualização do canal WhatsApp. Token e app secret em claro só ao
 * alterar; deixe ausente (undefined) para manter o valor atual.
 */
export interface WhatsAppConfigUpdate {
  whatsapp_phone_id?: string | null;
  whatsapp_waba_id?: string | null;
  whatsapp_token?: string | null;
  whatsapp_app_secret?: string | null;
  whatsapp_verify_token?: string | null;
  whatsapp_rate_limit?: number | null;
  /** Limpa o token permanente armazenado. */
  clear_whatsapp_token?: boolean | null;
  /** Limpa o app secret armazenado. */
  clear_whatsapp_app_secret?: boolean | null;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const vendasWhatsappApi = {
  /**
   * Lê a config do disparo (mesmo endpoint da Fase 2). A resposta inclui os
   * campos `whatsapp_*`; aqui tipamos apenas a fatia do WhatsApp.
   */
  getConfig: () => api.get<WhatsAppConfig>("/vendas/disparo/config"),

  /**
   * Salva a config do WhatsApp no mesmo endpoint do disparo. O backend aceita
   * os campos `whatsapp_*` junto (ou no lugar) dos campos de e-mail.
   */
  saveConfig: (data: WhatsAppConfigUpdate) =>
    api.put<WhatsAppConfig>("/vendas/disparo/config", data),
};
