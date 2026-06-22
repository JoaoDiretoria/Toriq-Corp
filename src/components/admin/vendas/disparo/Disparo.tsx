import { useState, useEffect, useCallback } from 'react';
import {
  vendasDisparoApi,
  type DisparoCampanha,
  type DisparoSupressao,
} from '@/integrations/api/vendasDisparo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TemplatesManager } from './TemplatesManager';
import { DisparoConfig } from './DisparoConfig';
import { CampanhaCriar } from './CampanhaCriar';
import { CampanhaDetalhe } from './CampanhaDetalhe';
import { WhatsAppConfig } from './WhatsAppConfig';
import { toast } from 'sonner';
import {
  Send,
  FileText,
  Settings2,
  ShieldBan,
  MessageCircle,
  Mail,
  AlertTriangle,
  Loader2,
  Plus,
  Clock,
  CalendarClock,
  CheckCircle2,
  PencilLine,
  Trash2,
  X,
} from 'lucide-react';

const CAMP_STATUS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
> = {
  rascunho: { label: 'Rascunho', variant: 'outline', icon: PencilLine },
  agendada: { label: 'Agendada', variant: 'outline', icon: CalendarClock },
  enviando: { label: 'Enviando', variant: 'secondary', icon: Loader2 },
  concluida: { label: 'Concluída', variant: 'default', icon: CheckCircle2 },
};

export function Disparo() {
  // Status do provedor (header).
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  // Aviso de SMTP é só informativo (e-mail). Pode ser dispensado e fica lembrado.
  const [smtpAvisoDismissed, setSmtpAvisoDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vendas_smtp_aviso_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const [tab, setTab] = useState('campanhas');
  const [selectedCampanha, setSelectedCampanha] = useState<string | null>(null);
  const [criarOpen, setCriarOpen] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const cfg = await vendasDisparoApi.getConfig();
      setSmtpConfigured(!!cfg.smtp_host && !!cfg.email_remetente);
    } catch (err) {
      console.error('[Disparo] erro ao carregar config:', err);
      setSmtpConfigured(false);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleDismissSmtpAviso = () => {
    setSmtpAvisoDismissed(true);
    try {
      localStorage.setItem('vendas_smtp_aviso_dismissed', '1');
    } catch {
      /* ignore */
    }
  };

  const handleNovaCampanha = () => {
    // Abre direto: a campanha pode ser e-mail, WhatsApp (Meta) ou Evolution. A
    // validação por canal (SMTP p/ e-mail, instância p/ Evolution, etc.) acontece
    // no envio (backend), então não bloqueamos a criação aqui.
    setCriarOpen(true);
  };

  // Detalhe ocupa a tela inteira.
  if (selectedCampanha) {
    return (
      <CampanhaDetalhe
        campanhaId={selectedCampanha}
        onBack={() => setSelectedCampanha(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6" />
            Disparo de campanhas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie campanhas por e-mail ou WhatsApp (Meta/Evolution) aos seus leads,
            respeitando opt-out (LGPD) e rate limit.
          </p>
        </div>
        <Button onClick={handleNovaCampanha} disabled={loadingConfig}>
          <Plus className="h-4 w-4 mr-2" />
          Nova campanha
        </Button>
      </div>

      {/* Aviso: SMTP não configurado */}
      {loadingConfig ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : (
        !smtpConfigured && !smtpAvisoDismissed && (
          <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Provedor de e-mail (SMTP) não configurado
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Necessário apenas para campanhas por <strong>e-mail</strong>. Campanhas
                    por WhatsApp (Meta/Evolution) não usam SMTP.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setTab('config')}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configurar agora
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  onClick={handleDismissSmtpAviso}
                  title="Dispensar este aviso"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="campanhas" className="gap-2">
            <Send className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            E-mail (SMTP)
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="supressao" className="gap-2">
            <ShieldBan className="h-4 w-4" />
            Supressão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas" className="mt-4">
          <CampanhasList
            onSelect={setSelectedCampanha}
            onNova={handleNovaCampanha}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesManager />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <DisparoConfig onSaved={fetchConfig} />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppConfig />
        </TabsContent>

        <TabsContent value="supressao" className="mt-4">
          <SupressaoManager />
        </TabsContent>
      </Tabs>

      <CampanhaCriar
        open={criarOpen}
        onOpenChange={setCriarOpen}
        onCreated={(id) => setSelectedCampanha(id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista de campanhas
// ---------------------------------------------------------------------------

function CampanhasList({
  onSelect,
  onNova,
}: {
  onSelect: (id: string) => void;
  onNova: () => void;
}) {
  const [campanhas, setCampanhas] = useState<DisparoCampanha[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampanhas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasDisparoApi.listCampanhas();
      setCampanhas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[CampanhasList] erro ao listar:', err);
      toast.error('Erro ao carregar campanhas');
      setCampanhas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampanhas();
  }, [fetchCampanhas]);

  // Polling enquanto houver campanha enviando.
  useEffect(() => {
    const enviando = campanhas.some((c) => c.status === 'enviando');
    if (!enviando) return;
    const id = setInterval(fetchCampanhas, 5000);
    return () => clearInterval(id);
  }, [campanhas, fetchCampanhas]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (campanhas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Nenhuma campanha ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Crie uma campanha escolhendo um template e um público (segmento ou leads).
          </p>
          <Button className="mt-4" onClick={onNova}>
            <Plus className="h-4 w-4 mr-2" />
            Nova campanha
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {campanhas.map((c) => {
        const cfg = CAMP_STATUS[c.status] ?? CAMP_STATUS.rascunho;
        const StatusIcon = cfg.icon;
        const total = c.total_destinatarios || 0;
        const processados = c.total_enviados + c.total_erros;
        const progress = total > 0 ? Math.round((processados / total) * 100) : 0;

        return (
          <Card
            key={c.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(c.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    <Badge variant={cfg.variant} className="shrink-0 text-xs">
                      {c.status === 'enviando' ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <StatusIcon className="mr-1 h-3 w-3" />
                      )}
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {c.agendada_para ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.agendada_para).toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      c.created_at && new Date(c.created_at).toLocaleDateString('pt-BR')
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-center">
                    <p className="font-bold tabular-nums">{c.total_destinatarios}</p>
                    <p className="text-muted-foreground">Dest</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold tabular-nums text-blue-500">{c.total_enviados}</p>
                    <p className="text-muted-foreground">Env</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold tabular-nums text-red-500">{c.total_erros}</p>
                    <p className="text-muted-foreground">Err</p>
                  </div>
                </div>
              </div>

              {c.status === 'enviando' && <Progress value={progress} className="mt-2 h-1.5" />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supressão (opt-out / LGPD)
// ---------------------------------------------------------------------------

function SupressaoManager() {
  const [items, setItems] = useState<DisparoSupressao[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [tipo, setTipo] = useState('email');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DisparoSupressao | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasDisparoApi.listSupressao();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SupressaoManager] erro ao listar:', err);
      toast.error('Erro ao carregar a lista de supressão');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    if (!valor.trim()) {
      toast.error('Informe o valor (e-mail ou telefone)');
      return;
    }
    setAdding(true);
    try {
      await vendasDisparoApi.addSupressao({
        tipo,
        valor: valor.trim(),
        motivo: motivo.trim() || null,
      });
      toast.success('Adicionado à lista de supressão');
      setValor('');
      setMotivo('');
      fetchItems();
    } catch (err: any) {
      if (err?.status === 409) {
        toast.info('Esse valor já está na lista de supressão.');
      } else {
        toast.error(err?.message || 'Erro ao adicionar supressão');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vendasDisparoApi.removeSupressao(deleteTarget.id);
      toast.success('Removido da lista de supressão');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2 shrink-0">
              <ShieldBan className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Lista de supressão (opt-out)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Destinatários aqui nunca recebem e-mails. Quem clica em "descadastrar"
                é adicionado automaticamente.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor</Label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === 'email' ? 'contato@exemplo.com' : '(11) 99999-9999'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: solicitação do cliente"
              />
            </div>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShieldBan className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Lista de supressão vazia</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Nenhum opt-out registrado. Os descadastros entram aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                <TableHead className="hidden md:table-cell">Adicionado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{s.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{s.valor}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {s.motivo || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da supressão</AlertDialogTitle>
            <AlertDialogDescription>
              Remover "{deleteTarget?.valor}" da lista de supressão? Esse
              destinatário voltará a poder receber e-mails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
