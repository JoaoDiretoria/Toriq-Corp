import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type TicketResumo, type TicketsMetricsOut } from '@/integrations/api/ops';
import { AlertTriangle, CheckCircle2, CircleAlert, Ticket } from 'lucide-react';

function fmtData(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function badgeClass(value: string, kind: 'status' | 'prioridade'): string {
  if (kind === 'prioridade') {
    if (value === 'critica' || value === 'crítica') return 'text-destructive font-semibold';
    if (value === 'alta') return 'text-orange-500 font-medium';
    if (value === 'media' || value === 'média') return 'text-yellow-600 font-medium';
    return 'text-muted-foreground';
  }
  if (value === 'aberto') return 'text-primary font-medium';
  if (value === 'resolvido') return 'text-green-600 font-medium';
  if (value === 'em_andamento') return 'text-blue-500 font-medium';
  return 'text-muted-foreground';
}

export function OpsTickets() {
  const [metrics, setMetrics] = useState<TicketsMetricsOut | null>(null);
  const [tickets, setTickets] = useState<TicketResumo[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErro(null);
    Promise.all([opsApi.ticketsMetrics(), opsApi.tickets()])
      .then(([m, l]) => {
        setMetrics(m);
        setTickets(l.tickets);
        setTotal(l.total);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar tickets'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!metrics) return null;

  const criticos = metrics.por_prioridade['critica'] ?? metrics.por_prioridade['crítica'] ?? 0;
  const resolvidos = metrics.por_status['resolvido'] ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Abertos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.abertos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> SLA Violados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{metrics.sla_violados}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-orange-500" /> Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-orange-500">{criticos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Resolvidos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-green-600">{resolvidos}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Tickets recentes{total > tickets.length ? ` (exibindo ${tickets.length} de ${total})` : ` (${total})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ticket encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium max-w-xs truncate">{t.titulo}</TableCell>
                    <TableCell>
                      <span className={badgeClass(t.status, 'status')}>{t.status}</span>
                    </TableCell>
                    <TableCell>
                      <span className={badgeClass(t.prioridade, 'prioridade')}>{t.prioridade}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.solicitante_nome}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtData(t.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
