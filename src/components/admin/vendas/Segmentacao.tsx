import { useState, useEffect, useCallback } from 'react';
import { vendasApi } from '@/integrations/api/vendas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Filter, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Layers,
  Star, Phone, Mail, MapPin, X, ListFilter, ArrowLeft,
} from 'lucide-react';

// ─── Tipos (snake_case batendo com o backend vendas_segmentos) ─────────

interface SegmentoFiltros {
  status?: string;
  cidade?: string;
  plataforma?: string;
  tag_ids?: string[];
  avaliacao_min?: number;
}

interface Segmento {
  id: string;
  empresa_id?: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  filtros: SegmentoFiltros;
  created_at?: string;
  updated_at?: string;
}

interface VendasTag {
  id: string;
  nome: string;
  cor: string | null;
}

interface Lead {
  id: string;
  nome: string | null;
  empresa_nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  plataforma: string | null;
  avaliacao: number | null;
  status: string | null;
}

// ─── Constantes ────────────────────────────────────────────────────────

const SEGMENTO_CORES = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const PLATAFORMAS = [
  { value: 'maps', label: 'Google Maps' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'manual', label: 'Manual' },
];

const STATUS = [
  { value: 'novo', label: 'Novo' },
  { value: 'captado', label: 'Captado' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'descartado', label: 'Descartado' },
];

const AVALIACOES = [
  { value: '3', label: '3+ estrelas' },
  { value: '4', label: '4+ estrelas' },
  { value: '4.5', label: '4,5+ estrelas' },
];

const ITEMS_PER_PAGE = 25;
const DEFAULT_COR = '#3b82f6';

// Sentinela para "qualquer" em Selects (Radix não aceita value="").
const ANY = '__any__';

function countActiveFiltros(f: SegmentoFiltros): number {
  let n = 0;
  if (f.status) n++;
  if (f.cidade && f.cidade.trim()) n++;
  if (f.plataforma) n++;
  if (f.tag_ids && f.tag_ids.length) n++;
  if (typeof f.avaliacao_min === 'number') n++;
  return n;
}

export function Segmentacao() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [tags, setTags] = useState<VendasTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Preview de leads do segmento selecionado
  const [selectedSegmento, setSelectedSegmento] = useState<Segmento | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [page, setPage] = useState(0);

  // Dialog criar/editar
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Segmento | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(DEFAULT_COR);
  const [filtros, setFiltros] = useState<SegmentoFiltros>({});
  const [saving, setSaving] = useState(false);

  // Dialog excluir
  const [segmentoToDelete, setSegmentoToDelete] = useState<Segmento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────

  const fetchSegmentos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendasApi.listSegmentos().catch(() => [] as Segmento[]);
      const list = (Array.isArray(data) ? data : []).map((s: any) => ({
        ...s,
        filtros: s.filtros || {},
      }));
      list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setSegmentos(list);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao carregar segmentos');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    const data = await vendasApi.listTags().catch(() => [] as VendasTag[]);
    setTags(Array.isArray(data) ? data : []);
  }, []);

  const fetchSegmentoLeads = useCallback(async (segId: string, pageNum: number) => {
    setLeadsLoading(true);
    try {
      const res = await vendasApi.getSegmentoLeads(segId, ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE);
      setLeads((res?.items as Lead[]) || []);
      setTotalLeads(res?.total || 0);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao carregar leads do segmento');
      setLeads([]);
      setTotalLeads(0);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegmentos();
    fetchTags();
  }, [fetchSegmentos, fetchTags]);

  useEffect(() => {
    if (selectedSegmento) {
      fetchSegmentoLeads(selectedSegmento.id, page);
    }
  }, [selectedSegmento, page, fetchSegmentoLeads]);

  // ─── CRUD ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setDescricao('');
    setCor(DEFAULT_COR);
    setFiltros({});
    setEditorOpen(true);
  };

  const openEdit = (seg: Segmento) => {
    setEditing(seg);
    setNome(seg.nome);
    setDescricao(seg.descricao || '');
    setCor(seg.cor || DEFAULT_COR);
    setFiltros({ ...(seg.filtros || {}) });
    setEditorOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do segmento');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await vendasApi.updateSegmento(editing.id, { nome: nome.trim(), descricao, cor, filtros });
        toast.success('Segmento atualizado com sucesso!');
      } else {
        await vendasApi.createSegmento(nome.trim(), filtros, cor, descricao);
        toast.success('Segmento criado com sucesso!');
      }
      setEditorOpen(false);
      fetchSegmentos();
      // Se editou o segmento aberto, recarrega o preview.
      if (editing && selectedSegmento?.id === editing.id) {
        setPage(0);
        fetchSegmentoLeads(editing.id, 0);
      }
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao salvar segmento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!segmentoToDelete) return;
    setDeleting(true);
    try {
      await vendasApi.deleteSegmento(segmentoToDelete.id);
      toast.success('Segmento excluído com sucesso!');
      if (selectedSegmento?.id === segmentoToDelete.id) {
        setSelectedSegmento(null);
        setLeads([]);
      }
      setSegmentoToDelete(null);
      fetchSegmentos();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || 'Erro ao excluir segmento');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Helpers de filtro (editor) ──────────────────────────────────────

  const setFiltro = <K extends keyof SegmentoFiltros>(key: K, value: SegmentoFiltros[K]) => {
    setFiltros((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const toggleTagFiltro = (tagId: string) => {
    setFiltros((prev) => {
      const current = prev.tag_ids || [];
      const has = current.includes(tagId);
      const nextTags = has ? current.filter((t) => t !== tagId) : [...current, tagId];
      const next = { ...prev };
      if (nextTags.length) next.tag_ids = nextTags;
      else delete next.tag_ids;
      return next;
    });
  };

  const tagById = (id: string) => tags.find((t) => t.id === id);

  // ─── Render: loading inicial ─────────────────────────────────────────

  if (initialLoading && loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalLeads / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Segmentação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Salve conjuntos de filtros como segmentos reutilizáveis de leads.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Segmento
        </Button>
      </div>

      {/* Grid de segmentos */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {segmentos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Nenhum segmento criado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                Segmentos guardam filtros (status, cidade, plataforma, tags, avaliação) para
                que você reencontre grupos de leads com um clique.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro segmento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {segmentos.map((seg) => {
              const segCor = seg.cor || DEFAULT_COR;
              const ativos = countActiveFiltros(seg.filtros);
              const isSelected = selectedSegmento?.id === seg.id;
              return (
                <Card
                  key={seg.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => { setPage(0); setSelectedSegmento(seg); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: segCor }}
                        />
                        <CardTitle className="text-base truncate" title={seg.nome}>
                          {seg.nome}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEdit(seg); }}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); setSegmentoToDelete(seg); }}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {seg.descricao && (
                      <CardDescription className="line-clamp-2">{seg.descricao}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {seg.filtros.status && (
                        <Badge variant="secondary" className="text-xs">
                          {STATUS.find((s) => s.value === seg.filtros.status)?.label || seg.filtros.status}
                        </Badge>
                      )}
                      {seg.filtros.plataforma && (
                        <Badge variant="secondary" className="text-xs">
                          {PLATAFORMAS.find((p) => p.value === seg.filtros.plataforma)?.label || seg.filtros.plataforma}
                        </Badge>
                      )}
                      {seg.filtros.cidade && (
                        <Badge variant="secondary" className="text-xs">{seg.filtros.cidade}</Badge>
                      )}
                      {typeof seg.filtros.avaliacao_min === 'number' && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {seg.filtros.avaliacao_min}+
                        </Badge>
                      )}
                      {(seg.filtros.tag_ids || []).slice(0, 2).map((tid) => {
                        const t = tagById(tid);
                        return (
                          <Badge
                            key={tid}
                            className="text-xs border text-foreground"
                            style={{ backgroundColor: `${(t?.cor || DEFAULT_COR)}20`, borderColor: t?.cor || DEFAULT_COR }}
                          >
                            {t?.nome || 'tag'}
                          </Badge>
                        );
                      })}
                      {ativos === 0 && (
                        <span className="text-xs text-muted-foreground italic">Sem filtros (todos os leads)</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview dos leads do segmento selecionado */}
      {selectedSegmento && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setSelectedSegmento(null); setLeads([]); }}
                  title="Fechar preview"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedSegmento.cor || DEFAULT_COR }}
                />
                <CardTitle className="text-base truncate">
                  Leads de “{selectedSegmento.nome}”
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">{totalLeads}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(selectedSegmento)}>
                <ListFilter className="h-4 w-4 mr-2" />
                Editar filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {leadsLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!leadsLoading && leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium">Nenhum lead neste segmento</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Os filtros salvos não correspondem a nenhum lead no momento. Ajuste os
                    critérios em “Editar filtros”.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead className="hidden md:table-cell">Contato</TableHead>
                        <TableHead className="hidden lg:table-cell">Local</TableHead>
                        <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="font-medium">
                              {lead.empresa_nome || lead.nome || '—'}
                            </div>
                            {lead.empresa_nome && lead.nome && (
                              <div className="text-xs text-muted-foreground">{lead.nome}</div>
                            )}
                            {typeof lead.avaliacao === 'number' && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {lead.avaliacao}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {lead.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {lead.telefone}
                                </span>
                              )}
                              {lead.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {lead.email}
                                </span>
                              )}
                              {!lead.telefone && !lead.email && '—'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {lead.cidade || lead.estado ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[lead.cidade, lead.estado].filter(Boolean).join('/')}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {PLATAFORMAS.find((p) => p.value === lead.plataforma)?.label || lead.plataforma || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{lead.status || 'novo'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-4 pt-4 border-t mt-4">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, totalLeads)} de {totalLeads}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={page === 0 || leadsLoading}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          {page + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={page + 1 >= totalPages || leadsLoading}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor de segmento (criar/editar) */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar segmento' : 'Novo segmento'}</DialogTitle>
            <DialogDescription>
              Defina os filtros que serão salvos. Leads que correspondem aparecem no preview.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Identificação */}
            <div className="space-y-2">
              <Label htmlFor="seg-nome">Nome *</Label>
              <Input
                id="seg-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Restaurantes SP 4+ estrelas"
                autoFocus
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seg-descricao">Descrição</Label>
              <Textarea
                id="seg-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Observação opcional sobre este segmento"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTO_CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      cor === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>

            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros do segmento
              </p>
              <Badge variant="secondary">{countActiveFiltros(filtros)} ativo(s)</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filtros.status ?? ANY}
                  onValueChange={(v) => setFiltro('status', v === ANY ? undefined : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Qualquer status</SelectItem>
                    {STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select
                  value={filtros.plataforma ?? ANY}
                  onValueChange={(v) => setFiltro('plataforma', v === ANY ? undefined : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Qualquer plataforma</SelectItem>
                    {PLATAFORMAS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seg-cidade">Cidade</Label>
                <Input
                  id="seg-cidade"
                  value={filtros.cidade || ''}
                  onChange={(e) => setFiltro('cidade', e.target.value)}
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label>Avaliação mínima</Label>
                <Select
                  value={typeof filtros.avaliacao_min === 'number' ? String(filtros.avaliacao_min) : ANY}
                  onValueChange={(v) => setFiltro('avaliacao_min', v === ANY ? undefined : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Qualquer avaliação</SelectItem>
                    {AVALIACOES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nenhuma tag cadastrada. Crie tags na tela de Tags para filtrar por elas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const active = (filtros.tag_ids || []).includes(t.id);
                    const tCor = t.cor || DEFAULT_COR;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTagFiltro(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          active ? 'text-foreground' : 'text-muted-foreground hover:bg-muted'
                        }`}
                        style={active ? { backgroundColor: `${tCor}20`, borderColor: tCor } : undefined}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tCor }} />
                        {t.nome}
                        {active && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !nome.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar segmento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!segmentoToDelete} onOpenChange={(open) => { if (!open) setSegmentoToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir segmento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o segmento{' '}
              <strong>{segmentoToDelete?.nome}</strong>? Os leads não são afetados, apenas o
              filtro salvo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Segmentacao;
