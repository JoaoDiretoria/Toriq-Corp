import { useState, useEffect, useCallback } from 'react';
import {
  vendasPipelineApi,
  type Conversao,
  type ConversaoItem,
  type Analytics,
} from '@/integrations/api/vendasPipeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Trophy,
  Percent,
} from 'lucide-react';

const TEMP_EMOJI: Record<string, string> = {
  quente: '🔥',
  morno: '🌤️',
  frio: '❄️',
};

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatBRL(v: number): string {
  return BRL.format(Number.isFinite(v) ? v : 0);
}

export function ConversaoDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<Conversao | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchConversao = useCallback(async () => {
    setLoading(true);
    try {
      const [conv, ana] = await Promise.all([
        vendasPipelineApi.getConversao(),
        vendasPipelineApi.getAnalytics().catch(() => null),
      ]);
      setData(conv);
      setAnalytics(ana);
    } catch (err: any) {
      console.error('[ConversaoDashboard] erro ao carregar:', err);
      toast.error(err?.message || 'Erro ao carregar a conversão');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversao();
  }, [fetchConversao, refreshKey]);

  if (initialLoading && loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const itens = data?.itens ?? [];
  const totalLeads = data?.total_leads ?? 0;
  const valorTotal = data?.valor_total ?? 0;
  const maxTotal = Math.max(1, ...itens.map((i) => i.total));

  if (!loading && itens.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Sem dados de conversão</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Quando houver leads na pipeline, a distribuição por estágio aparece aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de leads</p>
              <p className="text-2xl font-bold tabular-nums">{totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-500/10 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor estimado total</p>
              <p className="text-2xl font-bold tabular-nums">{formatBRL(valorTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por estágio (barras) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Distribuição por estágio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itens.map((item: ConversaoItem) => {
            const cor = item.cor ?? '#64748b';
            const pct = totalLeads > 0 ? Math.round((item.total / totalLeads) * 100) : 0;
            const barPct = Math.round((item.total / maxTotal) * 100);
            return (
              <div key={item.stage_id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cor }}
                    />
                    <span className="font-medium truncate">{item.nome}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="font-semibold tabular-nums">
                      {item.total} {item.total === 1 ? 'lead' : 'leads'}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatBRL(item.valor)}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, backgroundColor: cor }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Desempenho (analytics) */}
      {analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-full bg-blue-500/10 p-2.5">
                  <Percent className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de conversão</p>
                  <p className="text-xl font-bold tabular-nums">
                    {Math.round((analytics.taxa_conversao ?? 0) * 100)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-full bg-green-500/10 p-2.5">
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ganhos</p>
                  <p className="text-xl font-bold tabular-nums">{analytics.ganhos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-full bg-red-500/10 p-2.5">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perdidos</p>
                  <p className="text-xl font-bold tabular-nums">{analytics.perdidos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-full bg-emerald-500/10 p-2.5">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor ganho</p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatBRL(analytics.valor_ganho)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por origem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desempenho por origem</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.por_origem.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b pb-1.5 text-[11px] font-medium text-muted-foreground">
                      <span>Origem</span>
                      <span className="text-right">Leads</span>
                      <span className="text-right">Ganhos</span>
                      <span className="text-right">Valor</span>
                    </div>
                    {analytics.por_origem
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((o) => (
                        <div
                          key={o.origem}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-sm"
                        >
                          <span className="truncate">{o.origem}</span>
                          <span className="text-right tabular-nums">{o.total}</span>
                          <span className="text-right tabular-nums text-green-600">
                            {o.ganhos}
                          </span>
                          <span className="text-right tabular-nums text-muted-foreground">
                            {formatBRL(o.valor_ganho)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por temperatura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads por temperatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.por_temperatura.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  analytics.por_temperatura
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((t) => {
                      const max = Math.max(
                        1,
                        ...analytics.por_temperatura.map((x) => x.total),
                      );
                      const barPct = Math.round((t.total / max) * 100);
                      return (
                        <div key={t.temperatura} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {TEMP_EMOJI[t.temperatura] ?? ''} {t.temperatura}
                            </span>
                            <span className="tabular-nums font-semibold">{t.total}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default ConversaoDashboard;
