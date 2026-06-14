import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type RedisOverviewOut, type SchedulerOut, type RedisKeysOut } from '@/integrations/api/ops';

export function OpsRedisFilas() {
  const [ov, setOv] = useState<RedisOverviewOut | null>(null);
  const [sched, setSched] = useState<SchedulerOut | null>(null);
  const [keys, setKeys] = useState<RedisKeysOut | null>(null);

  useEffect(() => {
    opsApi.redisOverview().then(setOv).catch(() => setOv({ conectado: false } as RedisOverviewOut));
    opsApi.scheduler().then(setSched).catch(() => setSched({ rodando: false, jobs: [] }));
    opsApi.redisKeys().then(setKeys).catch(() => setKeys(null));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Redis</CardTitle></CardHeader>
        <CardContent>
          {ov && !ov.conectado ? (
            <p className="text-sm text-muted-foreground">Redis desligado (sem REDIS_URL). Cache recalcula e a fila roda inline.</p>
          ) : ov ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Memória" value={ov.memoria_usada ?? '—'} />
              <Stat label="Clientes" value={String(ov.clientes_conectados ?? '—')} />
              <Stat label="Hits" value={String(ov.keyspace_hits ?? '—')} />
              <Stat label="Misses" value={String(ov.keyspace_misses ?? '—')} />
              <Stat label="Fila" value={String(ov.fila_profundidade ?? '—')} />
              <Stat label="Chaves" value={String(ov.total_chaves_prefixo ?? '—')} />
            </div>
          ) : <div className="animate-pulse text-muted-foreground">Carregando...</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Scheduler (jobs agendados)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Próximo run</TableHead></TableRow></TableHeader>
            <TableBody>
              {(sched?.jobs ?? []).map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.proximo_run ? new Date(j.proximo_run).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {sched && sched.jobs.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-muted-foreground">Nenhum job ativo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {keys && keys.chaves.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Chaves de cache ({keys.prefixo})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Chave</TableHead><TableHead className="text-right">TTL (s)</TableHead></TableRow></TableHeader>
              <TableBody>
                {keys.chaves.map((k) => (
                  <TableRow key={k.chave}>
                    <TableCell className="font-mono text-xs">{k.chave}</TableCell>
                    <TableCell className="text-right">{k.ttl === -1 ? '∞' : k.ttl}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {keys.truncado && <p className="mt-2 text-xs text-muted-foreground">Lista truncada (limite de exibição).</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
