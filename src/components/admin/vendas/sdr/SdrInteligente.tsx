import { useState, useEffect, useCallback } from 'react';
import {
  vendasSdrApi,
  type SdrStats,
  type SdrLead,
} from '@/integrations/api/vendasSdr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Bot,
  Users,
  Settings2,
  CalendarClock,
  Gauge,
  Flame,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { SdrLeads, sdrStatusBadge, ScoreBadge } from './SdrLeads';
import { SdrConfig } from './SdrConfig';
import { SdrConversa } from './SdrConversa';

export function SdrInteligente() {
  const [tab, setTab] = useState('leads');

  const [stats, setStats] = useState<SdrStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [ativo, setAtivo] = useState(false);
  const [keySet, setKeySet] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await vendasSdrApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('[SdrInteligente] erro ao carregar stats:', err);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await vendasSdrApi.getConfig();
      setAtivo(!!cfg.ativo);
      setKeySet(!!cfg.api_key_set);
    } catch (err) {
      console.error('[SdrInteligente] erro ao carregar config:', err);
      setAtivo(false);
      setKeySet(false);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchConfig();
  }, [fetchStats, fetchConfig]);

  const quentes = stats?.por_status?.quente ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            SDR Inteligente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agente de IA que qualifica leads e gera respostas usando prompts
            dinâmicos configuráveis.
          </p>
        </div>
        {loadingConfig ? (
          <Skeleton className="h-6 w-32" />
        ) : ativo ? (
          <Badge className="bg-green-600 hover:bg-green-700 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Agente ativo
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Agente inativo
          </Badge>
        )}
      </div>

      {/* Aviso: agente não configurado */}
      {!loadingConfig && !keySet && (
        <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Agente SDR não configurado
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Configure a chave de API e os prompts antes de qualificar leads
                  ou gerar respostas.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              onClick={() => setTab('config')}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Leads"
          value={stats?.total ?? 0}
          icon={Users}
          loading={loadingStats}
        />
        <StatCard
          label="Quentes"
          value={quentes}
          icon={Flame}
          iconClass="text-red-500"
          loading={loadingStats}
        />
        <StatCard
          label="Score médio"
          value={stats?.score_medio != null ? Math.round(stats.score_medio) : '-'}
          icon={Gauge}
          loading={loadingStats}
        />
        <StatCard
          label="Follow-ups"
          value={stats?.followups_pendentes ?? 0}
          icon={CalendarClock}
          iconClass="text-amber-500"
          loading={loadingStats}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Agente
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Follow-ups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          <SdrLeads onChanged={fetchStats} />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <SdrConfig
            onSaved={() => {
              fetchConfig();
              fetchStats();
            }}
          />
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <FollowupsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de estatística
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  loading,
}: {
  label: string;
  value: number | string;
  icon: any;
  iconClass?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          )}
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${iconClass ?? 'text-muted-foreground'}`} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Lista de follow-ups
// ---------------------------------------------------------------------------

function FollowupsList() {
  const [leads, setLeads] = useState<SdrLead[]>([]);
  const [loading, setLoading] = useState(true);

  const [conversaLead, setConversaLead] = useState<SdrLead | null>(null);
  const [conversaOpen, setConversaOpen] = useState(false);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasSdrApi.listFollowups();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[FollowupsList] erro ao listar:', err);
      toast.error('Erro ao carregar follow-ups');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const openConversa = (lead: SdrLead) => {
    setConversaLead(lead);
    setConversaOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Nenhum follow-up agendado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Defina uma data de próximo follow-up nos leads para acompanhá-los aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = Date.now();

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="w-20">Score</TableHead>
                <TableHead>Status SDR</TableHead>
                <TableHead>Próximo follow-up</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const fu = lead.sdr_proximo_followup
                  ? new Date(lead.sdr_proximo_followup)
                  : null;
                const atrasado = fu ? fu.getTime() <= now : false;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">
                        {lead.empresa_nome || lead.nome || 'Sem nome'}
                      </div>
                      {lead.nome && lead.empresa_nome && (
                        <div className="text-xs text-muted-foreground">{lead.nome}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={lead.sdr_score} />
                    </TableCell>
                    <TableCell>{sdrStatusBadge(lead.sdr_status)}</TableCell>
                    <TableCell>
                      {fu ? (
                        <span
                          className={`flex items-center gap-1.5 text-sm ${
                            atrasado ? 'text-red-600 font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {atrasado ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <CalendarClock className="h-3.5 w-3.5" />
                          )}
                          {fu.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openConversa(lead)}
                        title="Abrir conversa"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SdrConversa lead={conversaLead} open={conversaOpen} onOpenChange={setConversaOpen} />
    </>
  );
}
