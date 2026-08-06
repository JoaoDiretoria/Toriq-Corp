/**
 * Cliente do módulo Chat Meta (backend NestJS em `/api/chat/*`).
 *
 * O frontend principal autentica com cookie httpOnly no FastAPI. Por isso este
 * cliente também envia credenciais e aponta, por padrão, para `VITE_API_URL`:
 * em produção, o gateway deve encaminhar `/api/chat/*` ao serviço NestJS e
 * traduzir a identidade da sessão. `VITE_CHAT_API_URL` permite separar a URL
 * do serviço sem colocar qualquer segredo no bundle.
 */
import { API_URL } from '@/integrations/api/client';

export const CHAT_API_URL = String(import.meta.env.VITE_CHAT_API_URL || API_URL).replace(
  /\/+$/,
  '',
);

interface ApiEnvelope<T> {
  data: T;
  error: string | null;
  meta?: unknown;
}

export class ChatApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

export type StatusContaWhatsapp = 'conectada' | 'suspensa' | 'revogada';
export type DirecaoMensagemChat = 'entrada' | 'saida';
export type StatusMensagemChat =
  | 'recebida'
  | 'pendente'
  | 'enviada'
  | 'entregue'
  | 'lida'
  | 'falhou';

export interface ContaWhatsapp {
  id: string;
  empresaId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  displayName: string;
  tokenExpiresAt: string | null;
  qualityRating: string | null;
  status: StatusContaWhatsapp;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConectarContaPayload {
  codigo: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface ContatoChat {
  id: string;
  empresaId: string;
  contaWhatsappId: string;
  waId: string;
  telefone: string;
  nome: string | null;
  avatarUrl: string | null;
  tags: string[];
  campos: Record<string, unknown> | null;
  ultimaInteracaoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversaChat {
  id: string;
  empresaId: string;
  contaWhatsappId: string;
  contatoId: string;
  status: 'aberta' | 'arquivada';
  atribuidoUserId: string | null;
  naoLidas: number;
  ultimaMensagemTexto: string | null;
  ultimaMensagemTipo: string | null;
  ultimaMensagemEm: string | null;
  ultimaMensagemClienteEm: string | null;
  janelaAtendimentoAte: string | null;
  createdAt: string;
  updatedAt: string;
  contato: ContatoChat;
}

export interface MensagemChat {
  id: string;
  empresaId: string;
  conversaId: string;
  wamid: string;
  direcao: DirecaoMensagemChat;
  tipo: string;
  texto: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  mediaNomeArquivo: string | null;
  contextoWamid: string | null;
  status: StatusMensagemChat;
  erroCodigo: string | null;
  erroMensagem: string | null;
  timestampMeta: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginaConversas {
  data: ConversaChat[];
  proximoCursor: string | null;
}

export interface PaginaMensagens {
  conversa: ConversaChat;
  data: MensagemChat[];
  proximoCursor: string | null;
}

export interface ListarConversasParams {
  busca?: string;
  cursor?: string;
  limit?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function endpoint(path: string): string {
  return `${CHAT_API_URL}/api/chat${path}`;
}

function extrairMensagemErro(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const valor = payload as { error?: unknown; message?: unknown; detail?: unknown };
  if (typeof valor.error === 'string' && valor.error) return valor.error;
  if (typeof valor.message === 'string' && valor.message) return valor.message;
  if (typeof valor.detail === 'string' && valor.detail) return valor.detail;
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const response = await fetch(endpoint(path), {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? 'A sessão do Chat Meta não foi reconhecida. Verifique a ponte de autenticação do serviço.'
        : `Não foi possível concluir a operação (${response.status}).`;
    throw new ChatApiError(response.status, extrairMensagemErro(payload, fallback));
  }

  const envelope = payload as ApiEnvelope<T> | null;
  if (!envelope || !('data' in envelope)) {
    throw new ChatApiError(502, 'O serviço do Chat Meta devolveu uma resposta inválida.');
  }
  if (envelope.error) {
    throw new ChatApiError(response.status, envelope.error);
  }
  return envelope.data;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const chatApi = {
  buscarConta: (signal?: AbortSignal) =>
    request<ContaWhatsapp | null>('/conta', { signal }),

  conectar: (payload: ConectarContaPayload) =>
    request<ContaWhatsapp>('/conta', { method: 'POST', body: payload }),

  desconectar: () =>
    request<{ desconectada: boolean }>('/conta', { method: 'DELETE' }),

  listarConversas: (params: ListarConversasParams = {}, signal?: AbortSignal) =>
    request<PaginaConversas>(
      `/conversas${queryString({
        busca: params.busca?.trim(),
        cursor: params.cursor,
        limit: params.limit,
      })}`,
      { signal },
    ),

  listarMensagens: (
    conversaId: string,
    params: { cursor?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) =>
    request<PaginaMensagens>(
      `/conversas/${encodeURIComponent(conversaId)}/mensagens${queryString(params)}`,
      { signal },
    ),

  marcarLida: (conversaId: string) =>
    request<{ marcada: boolean }>(`/conversas/${encodeURIComponent(conversaId)}/lida`, {
      method: 'PATCH',
    }),

  enviarTexto: (conversaId: string, texto: string, contextoWamid?: string) =>
    request<MensagemChat>(`/conversas/${encodeURIComponent(conversaId)}/mensagens`, {
      method: 'POST',
      body: { texto, contextoWamid },
    }),
};
