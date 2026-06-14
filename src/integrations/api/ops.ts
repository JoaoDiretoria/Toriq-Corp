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

export const opsApi = {
  health: () => api.get<HealthOut>('/ops/health'),
};
