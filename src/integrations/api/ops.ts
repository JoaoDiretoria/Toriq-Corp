import { api } from './client';

export interface DependenciaStatus { nome: string; ok: boolean; detalhe: string | null; }
export interface HealthOut {
  status: 'ok' | 'degradado';
  versao: string;
  uptime_segundos: number;
  dependencias: DependenciaStatus[];
  fila_profundidade: number | null;
  scheduler_jobs: number | null;
}

// T12 — Banco de Dados
export interface TabelaInfo { nome: string; schema_: string; linhas: number; tamanho_bytes: number; }
export interface PoolInfo { tamanho: number | null; em_uso: number | null; disponiveis: number | null; overflow: number | null; }
export interface DatabaseOut { tabelas: TabelaInfo[]; total_tabelas: number; pool: PoolInfo; }

// T13 — Redis, Filas & Scheduler
export interface RedisOverviewOut {
  conectado: boolean; memoria_usada: string | null; clientes_conectados: number | null;
  keyspace_hits: number | null; keyspace_misses: number | null;
  fila_profundidade: number | null; total_chaves_prefixo: number | null;
}
export interface RedisChave { chave: string; ttl: number; }
export interface RedisKeysOut { prefixo: string; chaves: RedisChave[]; truncado: boolean; }
export interface SchedulerJob { id: string; nome: string; proximo_run: string | null; }
export interface SchedulerOut { rodando: boolean; jobs: SchedulerJob[]; }

// T15 — Tickets
export interface TicketResumo {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  categoria: string | null;
  empresa_solicitante_id: string | null;
  solicitante_nome: string;
  created_at: string | null;
  resolvido_em: string | null;
}
export interface TicketsListOut { tickets: TicketResumo[]; total: number; }
export interface TicketsMetricsOut {
  abertos: number;
  sla_violados: number;
  por_status: Record<string, number>;
  por_prioridade: Record<string, number>;
}

export const opsApi = {
  health: () => api.get<HealthOut>('/ops/health'),
  database: () => api.get<DatabaseOut>('/ops/database/tables'),
  redisOverview: () => api.get<RedisOverviewOut>('/ops/redis/overview'),
  redisKeys: (prefix?: string) => api.get<RedisKeysOut>(`/ops/redis/keys${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`),
  scheduler: () => api.get<SchedulerOut>('/ops/scheduler/jobs'),
  tickets: (status?: string, prioridade?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (prioridade) params.set('prioridade', prioridade);
    const qs = params.toString();
    return api.get<TicketsListOut>(`/ops/tickets${qs ? `?${qs}` : ''}`);
  },
  ticketsMetrics: () => api.get<TicketsMetricsOut>('/ops/tickets/metrics'),
};
