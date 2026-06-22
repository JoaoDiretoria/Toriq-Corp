import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasDisparoApi,
  type DisparoCampanha,
  type DisparoMensagem,
  type MetricasCampanha,
} from '@/integrations/api/vendasDisparo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  Send,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Clock,
  CalendarClock,
  Loader2,
  Ban,
  Mail,
} from 'lucide-react';

interface CampanhaDetalheProps {
  campanhaId: string;
  onBack: () => void;
}

const CAMP_STATUS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  agendada: { label: 'Agendada', variant: 'outline' },
  enviando: { label: 'Enviando', variant: 'secondary' },
  concluida: { label: 'Concluída', variant: 'default' },
};

const MSG_STATUS: Record<string, { label: string; icon: any; className?: string }> = {
  pendente: { label: 'Pendente', icon: Clock },
  enviado: { label: 'Enviado', icon: Send, className: 'text-blue-500' },
  entregue: { label: 'Entregue', icon: CheckCircle2, className: 'text-green-500' },
  lido: { label: 'Lido', icon: Eye, className: 'text-emerald-500' },
  suprimido: { label: 'Suprimido', icon: Ban, className: 'text-muted-foreground' },
  erro: { label: 'Erro', icon: AlertTriangle, className: 'text-destructive' },
};

const MSG_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'lido', label: 'Lidos' },
  { value: 'suprimido', label: 'Suprimidos' },
  { value: 'erro', label: 'Erros' },
];

export function CampanhaDetalhe({ campanhaId, onBack }: CampanhaDetalheProps) {
  const [campanha, setCampanha] = useState<DisparoCampanha | null>(null);
  const [mensagens, setMensagens] = useState<DisparoMensagem[]>([]);
  const [metricas, setMetricas] = useState<MetricasCampanha | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgFilter, setMsgFilter] = useState('todos');
  const [sending, setSending] = useState(false);

  const fetchCampanha = useCallback(async () => {
    try {
      const data = await vendasDisparoApi.getCampanha(campanhaId);
      setCampanha(data);
    } catch (err) {
      console.error('[CampanhaDetalhe] erro ao buscar campanha:', err);
      toast.error('Erro ao carregar campanha');
    }
  }, [campanhaId]);

  const fetchMensagens = useCallback(async () => {
    try {
      vendasDisparoApi.getMetricas(campanhaId).then(setMetricas).catch(() => {});
      const data = await vendasDisparoApi.listMensagens(campanhaId, 200, 0);
      setMensagens(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[CampanhaDetalhe] erro ao buscar mensagens:', err);
    }
  }, [campanhaId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCampanha(), fetchMensagens()]);
      setLoading(false);
    })();
  }, [fetchCampanha, fetchMensagens]);

  // Auto-refresh enquanto está enviando (usa refs p/ evitar stale closures).
  const fetchCampanhaRef = useRef(fetchCampanha);
  fetchCampanhaRef.current = fetchCampanha;
  const fetchMensagensRef = useRef(fetchMensagens);
  fetchMensagensRef.current = fetchMensagens;

  const status = campanha?.status;
  useEffect(() => {
    if (status !== 'enviando') return;
    const id = setInterval(() => {
      fetchCampanhaRef.current();
      fetchMensagensRef.current();
    }, 5000);
    return () => clearInterval(id);
  }, [status]);

  const handleEnviar = async () => {
    setSending(true);
    try {
      const res = await vendasDisparoApi.enviarCampanha(campanhaId);
      toast.success(
        `Disparo iniciado: ${res.total_destinatarios} destinatário(s) na fila. ` +
          `O envio roda em segundo plano — acompanhe o progresso aqui.`,
      );
      await Promise.all([fetchCampanha(), fetchMensagens()]);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar campanha');
    } finally {
      setSending(false);
    }
  };

  if (loading || !campanha) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const total = campanha.total_destinatarios || 0;
  const processados = campanha.total_enviados + campanha.total_erros;
  const progress = total > 0 ? Math.round((processados / total) * 100) : 0;
  const statusCfg = CAMP_STATUS[campanha.status] ?? CAMP_STATUS.rascunho;
  const suprimidos = mensagens.filter((m) => m.status === 'suprimido').length;
  const lidos = mensagens.filter((m) => m.status === 'lido').length;

  const podeEnviar = campanha.status !== 'concluida';

  const filtradas =
    msgFilter === 'todos'
      ? mensagens
      : mensagens.filter((m) => m.status === msgFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{campanha.nome}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusCfg.variant}>
                {campanha.status === 'enviando' && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                {statusCfg.label}
              </Badge>
              {campanha.status === 'agendada' && campanha.agendada_para && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {new Date(campanha.agendada_para).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
        {podeEnviar && (
          <Button onClick={handleEnviar} disabled={sending} className="shrink-0">
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar agora
          </Button>
        )}
      </div>

      {/* Progresso + métricas */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              {campanha.status === 'concluida' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Concluída — {progress}%
                </>
              ) : campanha.status === 'enviando' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Enviando… {progress}%
                </>
              ) : (
                <>{progress}% processado</>
              )}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {processados} / {total}
            </span>
          </div>
          <Progress
            value={progress}
            className={
              campanha.status === 'concluida'
                ? 'transition-all [&>div]:bg-emerald-500'
                : 'transition-all'
            }
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center pt-1">
            <div>
              <p className="text-2xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-muted-foreground">Destinatários</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-blue-500">
                {campanha.total_enviados}
              </p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-500">{lidos}</p>
              <p className="text-xs text-muted-foreground">Lidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-red-500">
                {campanha.total_erros}
              </p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>

          {metricas && metricas.enviados > 0 && (
            <div className="grid grid-cols-3 gap-3 text-center border-t pt-3">
              <div>
                <p className="text-lg font-semibold tabular-nums">{metricas.taxa_entrega}%</p>
                <p className="text-[11px] text-muted-foreground">Entrega</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{metricas.taxa_leitura}%</p>
                <p className="text-[11px] text-muted-foreground">Leitura</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{metricas.taxa_resposta}%</p>
                <p className="text-[11px] text-muted-foreground">Resposta</p>
              </div>
            </div>
          )}

          {suprimidos > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Ban className="h-3.5 w-3.5" />
              {suprimidos} destinatário(s) na lista de supressão (não enviados — LGPD).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mensagens */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          Mensagens ({mensagens.length})
        </h3>
        <Select value={msgFilter} onValueChange={setMsgFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MSG_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destinatário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Enviado em</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((msg) => {
              const cfg = MSG_STATUS[msg.status] ?? MSG_STATUS.pendente;
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={msg.id}>
                  <TableCell className="text-sm font-mono">{msg.destinatario || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      <StatusIcon className={`mr-1 h-3 w-3 ${cfg.className ?? ''}`} />
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {msg.enviado_em ? new Date(msg.enviado_em).toLocaleString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell
                    className="text-xs text-destructive max-w-[200px] truncate"
                    title={msg.erro || ''}
                  >
                    {msg.erro || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  {mensagens.length === 0
                    ? 'Nenhuma mensagem ainda. As mensagens são materializadas ao enviar.'
                    : 'Nenhuma mensagem com esse status.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
