import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  vendasUsoApi,
  type UsoResumo,
  type UsoEmpresas,
} from '@/integrations/api/vendasUso';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Gauge,
  Users,
  Bot,
  Mail,
  MessageCircle,
  Sparkles,
  MessagesSquare,
  Activity,
  Building2,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Métricas — nomes EXATOS gravados pelo backend (ordem de exibição)
// ---------------------------------------------------------------------------

interface MetricaDef {
  metrica: string;
  label: string;
  icon: LucideIcon;
}

const METRICAS: MetricaDef[] = [
  { metrica: 'leads_captados', label: 'Leads captados', icon: Users },
  { metrica: 'apify_runs', label: 'Runs Apify', icon: Bot },
  { metrica: 'emails_enviados', label: 'E-mails enviados', icon: Mail },
  { metrica: 'whatsapp_enviados', label: 'WhatsApp enviados', icon: MessageCircle },
  { metrica: 'sdr_qualificacoes', label: 'Qualificações SDR', icon: Sparkles },
  { metrica: 'sdr_conversas', label: 'Conversas SDR', icon: MessagesSquare },
];

// Métrica desconhecida cai num rótulo legível como fallback
function metricaLabel(metrica: string): string {
  return METRICAS.find((m) => m.metrica === metrica)?.label ?? metrica;
}

// ---------------------------------------------------------------------------
// Seletor de período
// ---------------------------------------------------------------------------

const ACUMULADO = 'acumulado';

/** Período do mês corrente em 'YYYY-MM' (UTC), batendo com o backend. */
function periodoAtual(): string {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mes = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

function periodoLabel(periodo: string): string {
  if (periodo === ACUMULADO) return 'Acumulado total';
  const [ano, mes] = periodo.split('-');
  const nomes = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const idx = Number(mes) - 1;
  const nomeMes = idx >= 0 && idx < 12 ? nomes[idx] : mes;
  return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} de ${ano}`;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PainelUso() {
  // 'acumulado' => sem filtro de período; senão 'YYYY-MM'
  const [periodoSel, setPeriodoSel] = useState<string>(periodoAtual);

  const [resumo, setResumo] = useState<UsoResumo | null>(null);
  const [empresas, setEmpresas] = useState<UsoEmpresas | null>(null);

  const [loadingResumo, setLoadingResumo] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // admin_vertical: a visão cross-empresa só é exibida quando o backend a libera.
  // 403 => usuário não é admin_vertical; escondemos a tabela silenciosamente.
  const [empresasNegado, setEmpresasNegado] = useState(false);

  const periodoParam = periodoSel === ACUMULADO ? undefined : periodoSel;

  const fetchResumo = useCallback(async () => {
    setLoadingResumo(true);
    try {
      const data = await vendasUsoApi.getResumo(periodoParam);
      setResumo(data);
    } catch (error: any) {
      console.error('[PainelUso] erro ao carregar resumo:', error);
      toast.error(error?.message || 'Erro ao carregar o uso da empresa');
      setResumo(null);
    } finally {
      setLoadingResumo(false);
    }
  }, [periodoParam]);

  const fetchEmpresas = useCallback(async () => {
    setLoadingEmpresas(true);
    try {
      const data = await vendasUsoApi.getResumoEmpresas(periodoParam);
      setEmpresas(data);
      setEmpresasNegado(false);
    } catch (error: any) {
      // 403 = não é admin_vertical: oculta a seção sem alarmar o usuário.
      if (error?.status === 403) {
        setEmpresasNegado(true);
        setEmpresas(null);
      } else {
        console.error('[PainelUso] erro ao carregar uso por empresa:', error);
        toast.error(error?.message || 'Erro ao carregar o uso por empresa');
        setEmpresas(null);
      }
    } finally {
      setLoadingEmpresas(false);
    }
  }, [periodoParam]);

  useEffect(() => {
    fetchResumo();
    fetchEmpresas();
  }, [fetchResumo, fetchEmpresas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchResumo(), fetchEmpresas()]);
    setRefreshing(false);
  };

  // Mapa metrica -> quantidade (própria empresa), para os cards
  const quantidadePorMetrica = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of resumo?.metricas ?? []) {
      map[m.metrica] = m.quantidade;
    }
    return map;
  }, [resumo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            Uso & Contratação
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Acompanhe o consumo do Toriq Vendas. Estes números são a base para os
            planos e a contratação do módulo por empresa — cada métrica representa
            um recurso medido (captação, disparos e SDR).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodoSel} onValueChange={setPeriodoSel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={periodoAtual()}>{periodoLabel(periodoAtual())}</SelectItem>
              <SelectItem value={ACUMULADO}>Acumulado total</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards por métrica (própria empresa) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingResumo
          ? METRICAS.map((m) => (
              <Card key={m.metrica}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : METRICAS.map((m) => {
              const Icon = m.icon;
              const valor = quantidadePorMetrica[m.metrica] ?? 0;
              return (
                <Card key={m.metrica}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{m.label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{valor.toLocaleString('pt-BR')}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {periodoSel === ACUMULADO
                        ? 'Acumulado total'
                        : periodoLabel(periodoSel)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Total geral da própria empresa */}
      {!loadingResumo && resumo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Total de eventos medidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(resumo.total ?? 0).toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Soma de todas as métricas no período selecionado.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Uso por empresa (somente admin_vertical) */}
      {!empresasNegado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Uso por empresa
            </CardTitle>
            <CardDescription>
              Consumo de cada empresa no período selecionado — visão para
              acompanhamento de cobrança e contratação dos planos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEmpresas ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !empresas || empresas.itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Nenhum uso registrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Ainda não há consumo medido neste período. Assim que as empresas
                  usarem o Toriq Vendas, o consumo aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      {METRICAS.map((m) => (
                        <TableHead key={m.metrica} className="text-right whitespace-nowrap">
                          {m.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresas.itens.map((item) => {
                      const porMetrica: Record<string, number> = {};
                      for (const m of item.metricas) porMetrica[m.metrica] = m.quantidade;
                      return (
                        <TableRow key={item.empresa_id}>
                          <TableCell className="font-medium">
                            {item.empresa_nome || item.empresa_id}
                          </TableCell>
                          {METRICAS.map((m) => (
                            <TableCell key={m.metrica} className="text-right">
                              {(porMetrica[m.metrica] ?? 0).toLocaleString('pt-BR')}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">
                            {(item.total ?? 0).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
