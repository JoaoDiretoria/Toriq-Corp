import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  prospeccaoApi,
  type ProspeccaoJob,
} from '@/integrations/api/vendasProspeccao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  StopCircle,
  Inbox,
} from 'lucide-react';

export interface JobsTrackerHandle {
  /** Recarrega a lista de jobs (chamado pela página após iniciar uma captação). */
  refresh: () => void;
}

interface JobsTrackerProps {
  /** Callback após importar resultados (a página pode recarregar leads, etc). */
  onResultsImported?: () => void;
}

const PLATFORM_ICONS: Record<string, typeof Globe> = {
  google: Globe,
  facebook: Facebook,
  instagram: Instagram,
  instagram_followers: Instagram,
  linkedin: Linkedin,
};

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Maps',
  facebook: 'Facebook',
  instagram: 'Instagram',
  instagram_followers: 'IG Seguidores',
  linkedin: 'LinkedIn',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  pending: { label: 'Pendente', variant: 'outline', icon: Clock },
  running: { label: 'Executando', variant: 'secondary', icon: Loader2 },
  succeeded: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Falhou', variant: 'destructive', icon: XCircle },
  aborted: { label: 'Cancelado', variant: 'outline', icon: XCircle },
  cancelled: { label: 'Cancelado', variant: 'outline', icon: XCircle },
};

const POLL_INTERVAL_MS = 4000;

function platformLabel(p: string): string {
  return PLATFORM_LABELS[p] ?? p;
}

function isActive(status: string): boolean {
  return status === 'running' || status === 'pending';
}

export const JobsTracker = forwardRef<JobsTrackerHandle, JobsTrackerProps>(
  function JobsTracker({ onResultsImported }, ref) {
    const [jobs, setJobs] = useState<ProspeccaoJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState<string | null>(null);
    const [importing, setImporting] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchJobs = useCallback(async () => {
      try {
        const result = await prospeccaoApi.listJobs(20);
        setJobs(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('[JobsTracker] erro ao listar jobs:', error);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchJobs();
    }, [fetchJobs]);

    useImperativeHandle(ref, () => ({ refresh: fetchJobs }), [fetchJobs]);

    // Polling: enquanto houver job ativo (running/pending), recarrega a cada 4s.
    // O backend atualiza o status via /scraping/status, então fazemos a checagem
    // ativa dos jobs em andamento e recarregamos a lista.
    useEffect(() => {
      const activeJobs = jobs.filter((j) => isActive(j.status));

      if (activeJobs.length === 0) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }

      if (pollRef.current) return; // já há um poll rodando

      pollRef.current = setInterval(async () => {
        // Checa o status de cada job ativo (força o backend a sincronizar com o Apify).
        const ativos = jobs.filter((j) => isActive(j.status));
        await Promise.all(
          ativos.map((j) => prospeccaoApi.checkStatus(j.id).catch(() => null)),
        );
        await fetchJobs();
      }, POLL_INTERVAL_MS);

      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }, [jobs, fetchJobs]);

    // Limpeza final ao desmontar.
    useEffect(() => {
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, []);

    const handleImport = async (job: ProspeccaoJob) => {
      setImporting(job.id);
      try {
        const res = await prospeccaoApi.fetchResults(job.id);
        const inseridos = res?.inseridos ?? 0;
        const duplicados = res?.duplicados ?? 0;
        if (inseridos > 0) {
          toast.success(
            `${inseridos} lead(s) importado(s)` +
              (duplicados > 0 ? ` · ${duplicados} duplicado(s) ignorado(s)` : ''),
          );
        } else if (duplicados > 0) {
          toast.info(`${duplicados} resultado(s) já haviam sido importados.`);
        } else {
          toast.warning('Nenhum resultado encontrado para esta captação.');
        }
        onResultsImported?.();
        fetchJobs();
      } catch (error: any) {
        console.error('[JobsTracker] erro ao importar resultados:', error);
        toast.error(error?.message || 'Erro ao importar resultados');
      } finally {
        setImporting(null);
      }
    };

    const handleCheck = async (job: ProspeccaoJob) => {
      setChecking(job.id);
      try {
        const status = await prospeccaoApi.checkStatus(job.id);
        if (status.status === 'succeeded') {
          toast.success('Captação concluída! Importe os resultados.');
        } else if (status.status === 'failed') {
          toast.error('A captação falhou. Verifique os detalhes.');
        } else if (status.status === 'aborted') {
          toast.info('Captação cancelada.');
        } else {
          toast.info('Ainda processando... aguarde alguns instantes.');
        }
        fetchJobs();
      } catch (error: any) {
        console.error('[JobsTracker] erro ao verificar status:', error);
        toast.error(error?.message || 'Erro ao verificar status');
      } finally {
        setChecking(null);
      }
    };

    const handleCancel = async (job: ProspeccaoJob) => {
      if (!window.confirm('Cancelar esta captação? O run no Apify será abortado.')) return;
      setCancelling(job.id);
      try {
        await prospeccaoApi.cancelJob(job.id);
        toast.success('Captação cancelada.');
        fetchJobs();
      } catch (error: any) {
        console.error('[JobsTracker] erro ao cancelar:', error);
        toast.error(error?.message || 'Erro ao cancelar captação');
      } finally {
        setCancelling(null);
      }
    };

    // ----- Loading -----
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      );
    }

    // ----- Estado vazio -----
    if (jobs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Nenhuma captação ainda</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Inicie uma nova captação para começar a prospectar leads. As execuções aparecem aqui.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Captações recentes</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const PlatformIcon = PLATFORM_ICONS[job.plataforma] ?? Globe;
            const sc = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = sc.icon;
            const active = isActive(job.status);
            const termo =
              (job.parametros?.['termo'] as string | undefined) ??
              (job.parametros?.['username'] as string | undefined) ??
              '';

            return (
              <Card key={job.id} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {platformLabel(job.plataforma)}
                      </span>
                    </div>
                    <Badge variant={sc.variant} className="shrink-0 text-xs">
                      {job.status === 'running' ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <StatusIcon className="mr-1 h-3 w-3" />
                      )}
                      {sc.label}
                    </Badge>
                  </div>

                  {termo && (
                    <p className="text-xs text-muted-foreground truncate" title={termo}>
                      {termo}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                      {job.from_cache && (
                        <span className="text-amber-600">· cache</span>
                      )}
                      {job.custo != null && (
                        <span>· US$ {Number(job.custo).toFixed(3)}</span>
                      )}
                    </span>
                    {job.status === 'succeeded' && (
                      <span className="font-medium text-foreground">
                        {job.total_captados} captado(s)
                        {job.total_importados > 0 && ` · ${job.total_importados} importado(s)`}
                      </span>
                    )}
                  </div>

                  {job.erro && (
                    <p className="text-xs text-destructive truncate" title={job.erro}>
                      {job.erro}
                    </p>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleCancel(job)}
                        disabled={cancelling === job.id || checking === job.id}
                      >
                        {cancelling === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <StopCircle className="h-3 w-3 mr-1" />
                        )}
                        Cancelar
                      </Button>
                    )}
                    {active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleCheck(job)}
                        disabled={checking === job.id || cancelling === job.id}
                        title="Verificar status agora"
                      >
                        {checking === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Verificar'
                        )}
                      </Button>
                    )}
                    {job.status === 'succeeded' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleImport(job)}
                        disabled={importing === job.id}
                      >
                        {importing === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Download className="h-3 w-3 mr-1" />
                        )}
                        Importar resultados
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  },
);
