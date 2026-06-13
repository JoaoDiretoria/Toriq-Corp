import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  vendasApi,
  type VendasLead,
  type VendasTag,
  type VendasLeadFilters,
  type VendasLeadImportRow,
} from '@/integrations/api/vendas';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Filter,
  X,
  Tag as TagIcon,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  CheckCircle2,
  Inbox,
  SlidersHorizontal,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const PLATAFORMAS = [
  { value: 'maps', label: 'Google Maps' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'manual', label: 'Manual' },
];

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'captado', label: 'Captado' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'descartado', label: 'Descartado' },
];

const TAG_CORES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const AVALIACAO_OPTIONS = [
  { value: '3', label: '3+ estrelas' },
  { value: '4', label: '4+ estrelas' },
  { value: '4.5', label: '4.5+ estrelas' },
];

const SESSION_KEY = 'vendas:leads:filtros';
const ITEMS_PER_PAGE_DEFAULT = 50;

// Cabeçalhos aceitos no CSV/XLSX -> campo do backend
const IMPORT_HEADER_MAP: Record<string, keyof VendasLeadImportRow> = {
  nome: 'nome',
  'nome do contato': 'nome',
  contato: 'nome',
  empresa: 'empresa_nome',
  empresa_nome: 'empresa_nome',
  'nome da empresa': 'empresa_nome',
  'razao social': 'empresa_nome',
  telefone: 'telefone',
  fone: 'telefone',
  celular: 'telefone',
  whatsapp: 'telefone',
  email: 'email',
  'e-mail': 'email',
  cidade: 'cidade',
  municipio: 'cidade',
  estado: 'estado',
  uf: 'estado',
  plataforma: 'plataforma',
  origem: 'plataforma',
  fonte: 'plataforma',
};

// ---------------------------------------------------------------------------
// Estado de filtros
// ---------------------------------------------------------------------------

interface FiltersState {
  busca: string;
  status: string;
  plataforma: string;
  estado: string;
  cidade: string;
  avaliacao_min: string;
  tag_ids: string[];
}

const EMPTY_FILTERS: FiltersState = {
  busca: '',
  status: 'todos',
  plataforma: 'todos',
  estado: 'todos',
  cidade: '',
  avaliacao_min: 'todos',
  tag_ids: [],
};

function loadFiltersFromSession(): FiltersState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_FILTERS, ...parsed };
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

function buildApiFilters(f: FiltersState, limit: number, offset: number): VendasLeadFilters {
  const out: VendasLeadFilters = { limit, offset };
  if (f.busca.trim()) out.busca = f.busca.trim();
  if (f.status !== 'todos') out.status = f.status;
  if (f.plataforma !== 'todos') out.plataforma = f.plataforma;
  if (f.estado !== 'todos') out.estado = f.estado;
  if (f.cidade.trim()) out.cidade = f.cidade.trim();
  if (f.avaliacao_min !== 'todos') out.avaliacao_min = Number(f.avaliacao_min);
  if (f.tag_ids.length > 0) out.tag_ids = f.tag_ids;
  return out;
}

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------

function getStatusBadge(status: string) {
  switch (status) {
    case 'convertido':
      return <Badge className="bg-green-600 hover:bg-green-700">Convertido</Badge>;
    case 'captado':
      return <Badge variant="default">Captado</Badge>;
    case 'descartado':
      return <Badge variant="secondary" className="opacity-70">Descartado</Badge>;
    case 'novo':
    default:
      return <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground">Novo</Badge>;
  }
}

function plataformaLabel(value: string | null): string {
  if (!value) return '-';
  return PLATAFORMAS.find((p) => p.value === value)?.label ?? value;
}

function normalizeHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function LeadsCaptados() {
  const [leads, setLeads] = useState<VendasLead[]>([]);
  const [tags, setTags] = useState<VendasTag[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filtros
  const [filters, setFilters] = useState<FiltersState>(loadFiltersFromSession);
  const [showFilters, setShowFilters] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

  // Seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [actionRunning, setActionRunning] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Carregamento de tags (uma vez)
  useEffect(() => {
    vendasApi
      .listTags()
      .then((data) => setTags(Array.isArray(data) ? data : []))
      .catch(() => setTags([]));
  }, []);

  // -- Persistir filtros na sessão
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  // -- Buscar leads (server-side)
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const apiFilters = buildApiFilters(filters, itemsPerPage, offset);
      const res = await vendasApi.listLeads(apiFilters);
      const items = Array.isArray(res?.items) ? res.items : [];
      setLeads(items);
      setTotalCount(typeof res?.total === 'number' ? res.total : items.length);
    } catch (err) {
      console.error('[LeadsCaptados] erro ao listar:', err);
      toast.error('Erro ao carregar leads');
      setLeads([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    fetchLeads();
    // limpa seleção ao trocar página/filtros
    setSelectedIds(new Set());
  }, [fetchLeads]);

  // -- Reset de página quando filtro muda (exceto paginação)
  const updateFilter = useCallback(<K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // -- Busca com debounce: o input controla texto local, dispara filtro após 400ms
  const [buscaInput, setBuscaInput] = useState(filters.busca);
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

  // -- Contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.status !== 'todos') n++;
    if (filters.plataforma !== 'todos') n++;
    if (filters.estado !== 'todos') n++;
    if (filters.cidade.trim()) n++;
    if (filters.avaliacao_min !== 'todos') n++;
    n += filters.tag_ids.length;
    return n;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setBuscaInput('');
    setCurrentPage(1);
  }, []);

  // -- Seleção
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
      if (allOnPageSelected) {
        leads.forEach((l) => next.delete(l.id));
      } else {
        leads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // -- Ações em lote
  const handleBulkStatus = async (status: string) => {
    if (selectedArray.length === 0) return;
    setActionRunning(true);
    try {
      await Promise.all(selectedArray.map((id) => vendasApi.updateLead(id, { status })));
      toast.success(`${selectedArray.length} lead(s) atualizado(s)`);
      setSelectedIds(new Set());
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar leads');
    } finally {
      setActionRunning(false);
    }
  };

  const handleBulkTag = async (tagId: string) => {
    if (selectedArray.length === 0) return;
    setActionRunning(true);
    try {
      await vendasApi.addTagToLeads(selectedArray, tagId);
      toast.success('Tag aplicada aos leads selecionados');
      setSelectedIds(new Set());
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao aplicar tag');
    } finally {
      setActionRunning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedArray.length === 0) return;
    setActionRunning(true);
    try {
      await vendasApi.deleteLeads(selectedArray);
      toast.success(`${selectedArray.length} lead(s) excluído(s)`);
      setSelectedIds(new Set());
      setDeleteOpen(false);
      // se a página ficou vazia, volta uma página
      if (leads.length === selectedArray.length && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir leads');
    } finally {
      setActionRunning(false);
    }
  };

  // -- Paginação
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const pageNumbers = useMemo<(number | string)[]>(() => {
    const pages: (number | string)[] = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  const hasActiveFiltersOrSearch = activeFilterCount > 0 || filters.busca.trim().length > 0;

  // ----- Loading inicial (tela cheia) -----
  if (initialLoading && loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48" />
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Leads Captados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
            {hasActiveFiltersOrSearch ? ' (filtrados)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filtros */}
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
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 h-5 min-w-5 justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {hasActiveFiltersOrSearch && (
              <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Chips de filtros ativos */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.status !== 'todos' && (
                <FilterChip
                  label={`Status: ${STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}`}
                  onRemove={() => updateFilter('status', 'todos')}
                />
              )}
              {filters.plataforma !== 'todos' && (
                <FilterChip
                  label={`Fonte: ${plataformaLabel(filters.plataforma)}`}
                  onRemove={() => updateFilter('plataforma', 'todos')}
                />
              )}
              {filters.estado !== 'todos' && (
                <FilterChip label={filters.estado} onRemove={() => updateFilter('estado', 'todos')} />
              )}
              {filters.cidade.trim() && (
                <FilterChip label={filters.cidade} onRemove={() => updateFilter('cidade', '')} />
              )}
              {filters.avaliacao_min !== 'todos' && (
                <FilterChip
                  label={`${filters.avaliacao_min}+`}
                  onRemove={() => updateFilter('avaliacao_min', 'todos')}
                />
              )}
              {filters.tag_ids.map((tid) => {
                const t = tags.find((x) => x.id === tid);
                return (
                  <FilterChip
                    key={tid}
                    label={t?.nome ?? 'Tag'}
                    color={t?.cor ?? undefined}
                    onRemove={() =>
                      updateFilter(
                        'tag_ids',
                        filters.tag_ids.filter((x) => x !== tid),
                      )
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Painel de filtros */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fonte</Label>
                <Select value={filters.plataforma} onValueChange={(v) => updateFilter('plataforma', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {PLATAFORMAS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Estado (UF)</Label>
                <Select value={filters.estado} onValueChange={(v) => updateFilter('estado', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {ESTADOS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input
                  placeholder="Cidade"
                  value={filters.cidade}
                  onChange={(e) => updateFilter('cidade', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Avaliação mínima</Label>
                <Select value={filters.avaliacao_min} onValueChange={(v) => updateFilter('avaliacao_min', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Qualquer</SelectItem>
                    {AVALIACAO_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tags</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {filters.tag_ids.length > 0
                          ? `${filters.tag_ids.length} selecionada(s)`
                          : 'Selecionar tags'}
                      </span>
                      <SlidersHorizontal className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-2">
                    {tags.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">Nenhuma tag cadastrada</p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {tags.map((t) => {
                          const checked = filters.tag_ids.includes(t.id);
                          return (
                            <button
                              type="button"
                              key={t.id}
                              onClick={() =>
                                updateFilter(
                                  'tag_ids',
                                  checked
                                    ? filters.tag_ids.filter((x) => x !== t.id)
                                    : [...filters.tag_ids, t.id],
                                )
                              }
                              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                            >
                              <Checkbox checked={checked} className="pointer-events-none" />
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: t.cor ?? '#94a3b8' }}
                              />
                              <span className="truncate">{t.nome}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Estado vazio */}
          {!loading && leads.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFiltersOrSearch}
              onClear={clearFilters}
              onImport={() => setImportOpen(true)}
              onCreate={() => setCreateOpen(true)}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))
                  : leads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-4 border rounded-lg space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleSelect(lead.id)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{lead.empresa_nome || lead.nome || 'Sem nome'}</p>
                            {lead.nome && lead.empresa_nome && (
                              <p className="text-sm text-muted-foreground truncate">{lead.nome}</p>
                            )}
                          </div>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {lead.telefone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>
                          )}
                          {lead.cidade && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.cidade}{lead.estado ? `/${lead.estado}` : ''}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(lead.status)}
                          <span className="text-xs text-muted-foreground">{plataformaLabel(lead.plataforma)}</span>
                        </div>
                      </div>
                    ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block relative">
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
                          checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                          onCheckedChange={toggleSelectAllPage}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead className="hidden lg:table-cell">Contato</TableHead>
                      <TableHead className="hidden lg:table-cell">Local</TableHead>
                      <TableHead className="hidden md:table-cell">Tags</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const semContato = !lead.telefone && !lead.email;
                      return (
                        <TableRow
                          key={lead.id}
                          data-state={selectedIds.has(lead.id) ? 'selected' : undefined}
                          className={`cursor-pointer hover:bg-muted/50 ${semContato ? 'opacity-60' : ''}`}
                          onClick={() => toggleSelect(lead.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(lead.id)}
                              onCheckedChange={() => toggleSelect(lead.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{lead.empresa_nome || lead.nome || 'Sem nome'}</div>
                            {lead.nome && lead.empresa_nome && (
                              <div className="text-xs text-muted-foreground">{lead.nome}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{plataformaLabel(lead.plataforma)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {lead.telefone && (
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>
                              )}
                              {lead.email && (
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                              )}
                              {semContato && <span className="italic">Sem contato</span>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {lead.cidade ? `${lead.cidade}${lead.estado ? `/${lead.estado}` : ''}` : '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(lead.tags ?? []).slice(0, 3).map((t) => (
                                <Badge
                                  key={t.id}
                                  variant="outline"
                                  className="text-[10px]"
                                  style={t.cor ? { borderColor: t.cor, color: t.cor } : undefined}
                                >
                                  {t.nome}
                                </Badge>
                              ))}
                              {(lead.tags?.length ?? 0) > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{(lead.tags!.length - 3)}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
                    {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Por página:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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
                    {pageNumbers.map((p, idx) =>
                      typeof p === 'number' ? (
                        <Button
                          key={idx}
                          variant={p === currentPage ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </Button>
                      ) : (
                        <span key={idx} className="px-1 text-muted-foreground">…</span>
                      ),
                    )}
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

            {/* Atribuir tag */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={actionRunning}>
                  <TagIcon className="h-4 w-4 mr-1.5" />
                  Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuLabel>Aplicar tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags.length === 0 ? (
                  <DropdownMenuItem disabled>Nenhuma tag</DropdownMenuItem>
                ) : (
                  tags.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => handleBulkTag(t.id)}>
                      <span
                        className="h-2.5 w-2.5 rounded-full mr-2"
                        style={{ backgroundColor: t.cor ?? '#94a3b8' }}
                      />
                      {t.nome}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mudar status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={actionRunning}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuLabel>Mudar status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => handleBulkStatus(s.value)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Excluir */}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={actionRunning}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog: novo lead */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          setCurrentPage(1);
          fetchLeads();
        }}
      />

      {/* Dialog: importar CSV */}
      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          setImportOpen(false);
          setCurrentPage(1);
          fetchLeads();
        }}
      />

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir leads</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedArray.length} lead(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={actionRunning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-normal">
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-background/60 p-0.5"
        aria-label={`Remover ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

function EmptyState({
  hasFilters,
  onClear,
  onImport,
  onCreate,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onImport: () => void;
  onCreate: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Nenhum lead encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Nenhum lead corresponde aos filtros aplicados. Tente ajustar ou limpar os filtros.
        </p>
        <Button variant="outline" className="mt-4" onClick={onClear}>
          <X className="h-4 w-4 mr-2" />
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Nenhum lead ainda</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">
        Comece importando uma planilha de leads ou cadastrando um lead manualmente.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-2" />
          Importar planilha
        </Button>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo lead
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog: criar lead manual
// ---------------------------------------------------------------------------

function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    empresa_nome: '',
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: 'none',
    plataforma: 'manual',
  });

  const reset = () =>
    setForm({
      empresa_nome: '',
      nome: '',
      telefone: '',
      email: '',
      cidade: '',
      estado: 'none',
      plataforma: 'manual',
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresa_nome.trim() && !form.nome.trim()) {
      toast.error('Informe ao menos o nome ou a empresa');
      return;
    }
    setSaving(true);
    try {
      await vendasApi.createLead({
        empresa_nome: form.empresa_nome.trim() || null,
        nome: form.nome.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado !== 'none' ? form.estado : null,
        plataforma: form.plataforma,
        status: 'novo',
        origem: 'manual',
      });
      toast.success('Lead criado com sucesso!');
      reset();
      onCreated();
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error('Lead duplicado: já existe um lead com esse telefone/e-mail.');
      } else {
        toast.error(err?.message || 'Erro ao criar lead');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>Cadastre um lead manualmente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-empresa">Empresa</Label>
            <Input
              id="lead-empresa"
              value={form.empresa_nome}
              onChange={(e) => setForm({ ...form, empresa_nome: e.target.value })}
              placeholder="Nome da empresa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-nome">Nome do contato</Label>
            <Input
              id="lead-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-telefone">Telefone</Label>
              <Input
                id="lead-telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-cidade">Cidade</Label>
              <Input
                id="lead-cidade"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {ESTADOS.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fonte</Label>
            <Select value={form.plataforma} onValueChange={(v) => setForm({ ...form, plataforma: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATAFORMAS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: importar CSV/XLSX
// ---------------------------------------------------------------------------

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

function ImportLeadsDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [rows, setRows] = useState<VendasLeadImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inseridos: number; duplicados: number; total: number } | null>(null);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setResult(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (json.length === 0) {
        toast.error('O arquivo não contém dados.');
        return;
      }

      const parsed: VendasLeadImportRow[] = [];
      for (const raw of json) {
        const row: VendasLeadImportRow = {};
        for (const [key, value] of Object.entries(raw)) {
          const field = IMPORT_HEADER_MAP[normalizeHeader(key)];
          if (field && value !== undefined && value !== null && String(value).trim() !== '') {
            row[field] = String(value).trim();
          }
        }
        // só inclui se houver nome, empresa ou contato
        if (row.nome || row.empresa_nome || row.telefone || row.email) {
          parsed.push(row);
        }
      }

      if (parsed.length === 0) {
        toast.error('Nenhuma linha reconhecida. Verifique os cabeçalhos da planilha.');
        return;
      }
      setRows(parsed);
      setStep('preview');
    } catch (err) {
      console.error('[ImportLeads] parse error:', err);
      toast.error('Erro ao ler o arquivo.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      toast.error('Formato inválido. Use .csv, .xlsx ou .xls');
      return;
    }
    parseFile(file);
  };

  const downloadTemplate = () => {
    const example = [
      {
        nome: 'João Silva',
        empresa: 'Empresa Exemplo LTDA',
        telefone: '(11) 99999-9999',
        email: 'contato@empresa.com',
        cidade: 'São Paulo',
        uf: 'SP',
        plataforma: 'manual',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(example);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'template_leads.csv', { bookType: 'csv' });
    toast.success('Template baixado');
  };

  const handleConfirm = async () => {
    setStep('importing');
    setImporting(true);
    try {
      const res = await vendasApi.importLeads(rows);
      setResult({
        inseridos: res?.inseridos ?? 0,
        duplicados: res?.duplicados ?? 0,
        total: res?.total ?? rows.length,
      });
      setStep('done');
      if ((res?.inseridos ?? 0) > 0) {
        toast.success(`${res.inseridos} lead(s) importado(s)`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar leads');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const previewRows = rows.slice(0, 8);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Leads
          </DialogTitle>
          <DialogDescription>
            Importe leads a partir de um arquivo CSV ou Excel. Colunas reconhecidas: nome, empresa,
            telefone, e-mail, cidade, UF, plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-2">
          {step === 'upload' && (
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar template
              </Button>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload
                  className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <p className="text-base font-medium">
                  {isDragging ? 'Solte o arquivo aqui' : 'Clique para selecionar o arquivo'}
                </p>
                <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                <p className="text-xs text-muted-foreground mt-2">Formatos: .csv, .xlsx, .xls</p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{rows.length}</strong> lead(s) reconhecido(s). Pré-visualização das primeiras linhas:
              </p>
              <div className="border rounded-lg overflow-auto max-h-[340px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.empresa_nome || '-'}</TableCell>
                        <TableCell className="text-sm">{r.nome || '-'}</TableCell>
                        <TableCell className="text-sm">{r.telefone || '-'}</TableCell>
                        <TableCell className="text-sm">{r.email || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {r.cidade ? `${r.cidade}${r.estado ? `/${r.estado}` : ''}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > previewRows.length && (
                <p className="text-xs text-muted-foreground">
                  ... e mais {rows.length - previewRows.length} linha(s). Leads duplicados serão ignorados automaticamente.
                </p>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-4 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Importando {rows.length} lead(s)...</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-3 py-10 text-center">
              <CheckCircle2 className="h-14 w-14 mx-auto text-green-600" />
              <p className="text-lg font-semibold">Importação concluída!</p>
              <div className="flex items-center justify-center gap-3">
                <Badge className="bg-green-600 hover:bg-green-700">{result.inseridos} inseridos</Badge>
                {result.duplicados > 0 && (
                  <Badge variant="secondary">{result.duplicados} duplicados</Badge>
                )}
                <Badge variant="outline">{result.total} total</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          {step === 'preview' && (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={reset}>
                Trocar arquivo
              </Button>
              <Button onClick={handleConfirm} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                Importar {rows.length} lead(s)
              </Button>
            </div>
          )}
          {step === 'done' && (
            <Button
              onClick={() => {
                onImported();
                reset();
              }}
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
