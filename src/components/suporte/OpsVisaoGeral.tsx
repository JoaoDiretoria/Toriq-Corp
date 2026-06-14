import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { opsApi, type HealthOut } from '@/integrations/api/ops';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export function OpsVisaoGeral() {
  const [health, setHealth] = useState<HealthOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      setHealth(await opsApi.health());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!health) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {health.status === 'ok' ? (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
            Sistema saudável
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive">
            Sistema degradado
          </span>
        )}
        <Button variant="outline" size="sm" onClick={carregar}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Versão</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.versao}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Uptime</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatUptime(health.uptime_segundos)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fila (jobs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.fila_profundidade ?? '—'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scheduler (jobs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{health.scheduler_jobs ?? '—'}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Dependências</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {health.dependencias.map((d) => (
            <div key={d.nome} className="flex items-center justify-between border-b border-border/40 py-2 last:border-0">
              <div className="flex items-center gap-2">
                {d.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="font-medium capitalize">{d.nome}</span>
              </div>
              <span className="text-xs text-muted-foreground">{d.detalhe ?? (d.ok ? 'OK' : 'Indisponível')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
