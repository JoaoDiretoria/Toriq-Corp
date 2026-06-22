/**
 * Canais de envio do módulo Vendas. Os `value` batem com o backend (campo `canal`
 * em templates/campanhas/mensagens e no roteamento do SDR/conversas):
 * - `email`        → SMTP
 * - `whatsapp`     → WhatsApp oficial da Meta (Cloud API)
 * - `whatsapp_evo` → WhatsApp via Evolution (self-hosted, whatsmeow)
 *
 * Fonte única para os seletores de canal (disparo, conversas, SDR) — evita
 * divergência de rótulos/valores entre as telas.
 */

export const CANAIS_ENVIO = [
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp (Meta)' },
  { value: 'whatsapp_evo', label: 'WhatsApp (Evolution)' },
] as const;

/** Apenas os canais de WhatsApp — para contextos onde e-mail não se aplica
 * (conversas/atendimento e SDR). */
export const CANAIS_WHATSAPP = [
  { value: 'whatsapp', label: 'WhatsApp (Meta)' },
  { value: 'whatsapp_evo', label: 'WhatsApp (Evolution)' },
] as const;

export type CanalEnvio = (typeof CANAIS_ENVIO)[number]['value'];

/** É um canal de WhatsApp (Meta ou Evolution)? */
export const isWhatsappCanal = (canal: string): boolean =>
  canal === 'whatsapp' || canal === 'whatsapp_evo';

/** Rótulo amigável de um canal (fallback: o próprio valor). */
export const labelCanal = (canal: string): string =>
  CANAIS_ENVIO.find((c) => c.value === canal)?.label ?? canal;
