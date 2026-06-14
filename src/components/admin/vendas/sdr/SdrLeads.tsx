import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  vendasSdrApi,
  type SdrLead,
  type SdrLeadFilters,
} from '@/integrations/api/vendasSdr';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Sparkles,
  MessageSquare,
  Inbox,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SdrConversa } from './SdrConversa';

// ---------------------------------------------------------------------------
// Helpers visuais (compartilháveis com SdrInteligente / Follow-ups)
// ---------------------------------------------------------------------------

export const SDR_STATUS_OPTIONS = [
  { value: 'quente', label: 'Quente' },
  { value: 'morno', label: 'Morno' },
  { value: 'frio', label: 'Frio' },
  { value: 'desqualificado', label: 'Desqualificado' },
];

export function sdrStatusBadge(status: string | null) {
  switch (status) {
    case 'quente':
      return <Badge className="bg-red-600 hover:bg-red-700">Quente</Badge>;
    case 'morno':
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Morno</Badge>;
    case 'frio':
      return <Badge className="bg-sky-600 hover:bg-sky-700">Frio</Badge>;
    case 'desqualificado':
      return <Badge variant="secondary" className="opacity-70">Desqualificado</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Não qualificado</Badge>;
  }
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  let cls = 'bg-muted text-muted-foreground';
  if (score >= 70) cls = 'bg-green-600 text-white hover:bg-green-700';
  else if (score >= 40) cls = 'bg-amber-500 text-white hover:bg-amber-600';
  else cls = 'bg-red-600 text-white hover:bg-red-700';
  return <Badge className={`tabular-nums ${cls}`}>{score}</Badge>;
}

const ITEMS_PER_PAGE = 50;

interface FiltersState {
  busca: string;
  sdr_status: string;
  score_min: string;
}

const EMPTY_FILTERS: FiltersState = {
  busca: '',
  sdr_status: 'todos',
  score_min: 'todos',
};

const SCORE_OPTIONS = [
  { value: '70', label: '70+ (quente)' },
  { value: '40', label: '40+ (morno)' },
  { value: '1', label: 'Qualquer score' },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface SdrLeadsProps {
  /** Chamado após qualificar (para a página recarregar os cards de stats). */
  onChanged?: () => void;
}

export function SdrLeads({ onChanged }: SdrLeadsProps) {
  const [leads, setLeads] = useState<SdrLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const [filters, setFilters] = useState<FiltersState>({ ...EMPTY_FILTERS });
  const [buscaInput, setBuscaInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const [conversaLead, setConversaLead] = useState<SdrLead | null>(null);
  const [conversaOpen, setConversaOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildApiFilters = useCallback((): SdrLeadFilters => {
    const out: SdrLeadFilters = {
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    };
    if (filters.busca.trim()) out.busca = filters.busca.trim();
    if (filters.sdr_status !== 'todos') out.sdr_status = filters.sdr_status;
    if (filters.score_min !== 'todos') out.score_min = Number(filters.score_min);
    return out;
  }, [filters, currentPage]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendasSdrApi.listLeads(buildApiFilters());
      const items = Array.isArray(res?.items) ? res.items : [];
      setLeads(items);
      setTotalCount(typeof res?.total === 'number' ? res.total : items.length);
    } catch (err) {
      console.error('[SdrLeads] erro ao listar:', err);
      toast.error('Erro ao carregar leads');
      setLeads([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [buildApiFilters]);

  useEffect(() => {
    fetchLeads();
    setSelectedIds(new Set());
  }, [fetchLeads]);

  // Busca com debounce.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => {
        if (prev.busca === buscaInput) return prev;
        return { ...prev, busca: buscaInput };
      });
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buscaInput]);

  const updateFilter = useCallback(
    <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const hasFilters =
    filters.busca.trim().length > 0 ||
    filters.sdr_status !== 'todos' ||
    filters.score_min !== 'todos';

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setBuscaInput('');
    setCurrentPage(1);
  };

  // Seleção.
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someOnPageSelected = leads.some((l) => selectedIds.has(l.id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) leads.forEach((l) => next.delete(l.id));
      else leads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Qualificar single.
  const handleQualificar = async (id: string) => {
    setQualifyingId(id);
    try {
      const res = await vendasSdrApi.qualificar(id);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                sdr_score: res.sdr_score,
                sdr_status: res.sdr_status,
                sdr_notas: res.sdr_notas,
              }
            : l,
        ),
      );
      toast.success('Lead qualificado pelo agente');
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao qualificar lead');
    } finally {
      setQualifyingId(null);
    }
  };

  // Qualificar em lote.
  const handleQualificarBatch = async () => {
    if (selectedArray.length === 0) return;
    setBatchRunning(true);
    try {
      const res = await vendasSdrApi.qualificarBatch(selectedArray);
      toast.success(
        `${res.enfileirados} lead(s) enviados para qualificação — processando em segundo plano.`,
      );
      setSelectedIds(new Set());
      // A qualificação roda na fila; recarrega para refletir o que já concluiu.
      await fetchLeads();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao qualificar leads');
    } finally {
      setBatchRunning(false);
    }
  };

  const openConversa = (lead: SdrLead) => {
    setConversaLead(lead);
    setConversaOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  if (initialLoading && loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa, e-mail ou telefone..."
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Select
                value={filters.sdr_status}
                onValueChange={(v) => updateFilter('sdr_status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status SDR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {SDR_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Select
                value={filters.score_min}
                onValueChange={(v) => updateFilter('score_min', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Score mínimo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer score</SelectItem>
                  {SCORE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!loading && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                {hasFilters ? (
                  <Search className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold">
                {hasFilters ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {hasFilters
                  ? 'Nenhum lead corresponde aos filtros aplicados.'
                  : 'Capte leads no módulo de leads para qualificá-los com o agente SDR.'}
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            allOnPageSelected
                              ? true
                              : someOnPageSelected
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={toggleSelectAllPage}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead className="hidden lg:table-cell">Contato</TableHead>
                      <TableHead className="hidden md:table-cell">Local</TableHead>
                      <TableHead className="w-20">Score</TableHead>
                      <TableHead>Status SDR</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        data-state={selectedIds.has(lead.id) ? 'selected' : undefined}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {lead.empresa_nome || lead.nome || 'Sem nome'}
                          </div>
                          {lead.nome && lead.empresa_nome && (
                            <div className="text-xs text-muted-foreground">{lead.nome}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {lead.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.telefone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                            {!lead.telefone && !lead.email && (
                              <span className="italic">Sem contato</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {lead.cidade ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {lead.cidade}
                              {lead.estado ? `/${lead.estado}` : ''}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={lead.sdr_score} />
                        </TableCell>
                        <TableCell>{sdrStatusBadge(lead.sdr_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleQualificar(lead.id)}
                              disabled={qualifyingId === lead.id}
                              title="Qualificar com o agente"
                            >
                              {qualifyingId === lead.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                              <span className="hidden xl:inline ml-1.5">Qualificar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openConversa(lead)}
                              title="Abrir conversa"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {totalCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 text-sm tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Barra de ações flutuante */}
      {selectedArray.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium px-1">
              {selectedArray.length} selecionado(s)
            </span>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <Button size="sm" onClick={handleQualificarBatch} disabled={batchRunning}>
              {batchRunning ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Qualificar selecionados
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SdrConversa lead={conversaLead} open={conversaOpen} onOpenChange={setConversaOpen} />
    </>
  );
}
