import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasPipelineApi,
  type LeadCard,
  type PipelineStage,
  type ConversasFilters,
  type EventoPipeline,
} from '@/integrations/api/vendasPipeline';
import { vendasApi, type VendasTag } from '@/integrations/api/vendas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConversationList } from './ConversationList';
import { ConversationChat } from './ConversationChat';
import { toast } from 'sonner';
import { Search, SlidersHorizontal, ArrowLeft } from 'lucide-react';

const TEMPERATURAS = [
  { value: 'quente', label: '🔥 Quente' },
  { value: 'morno', label: '🌤️ Morno' },
  { value: 'frio', label: '❄️ Frio' },
];

interface FiltersState {
  busca: string;
  tag_id: string; // "todas" = sem filtro
  temperatura: string; // "todas" = sem filtro
  stage_id: string; // "todos" = sem filtro
  arquivados: boolean;
  minhas: boolean;
}

const EMPTY_FILTERS: FiltersState = {
  busca: '',
  tag_id: 'todas',
  temperatura: 'todas',
  stage_id: 'todos',
  arquivados: false,
  minhas: false,
};

function buildApiFilters(f: FiltersState): ConversasFilters {
  const out: ConversasFilters = { limit: 100, offset: 0 };
  if (f.busca.trim()) out.busca = f.busca.trim();
  if (f.tag_id !== 'todas') out.tag_id = f.tag_id;
  if (f.temperatura !== 'todas') out.temperatura = f.temperatura;
  if (f.stage_id !== 'todos') out.stage_id = f.stage_id;
  if (f.arquivados) out.arquivados = true;
  if (f.minhas) out.minhas = true;
  return out;
}

export function ConversasInbox({
  refreshKey = 0,
  ultimoEvento = null,
}: {
  refreshKey?: number;
  ultimoEvento?: EventoPipeline | null;
}) {
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [tags, setTags] = useState<VendasTag[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [buscaInput, setBuscaInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Tags + estágios (uma vez), para os selects de filtro
  useEffect(() => {
    vendasApi
      .listTags()
      .then((d) => setTags(Array.isArray(d) ? d : []))
      .catch(() => setTags([]));
    vendasPipelineApi
      .getStages()
      .then((d) => setStages(Array.isArray(d) ? d : []))
      .catch(() => setStages([]));
  }, []);

  // -- Busca com debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) =>
        prev.busca === buscaInput ? prev : { ...prev, busca: buscaInput },
      );
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buscaInput]);

  const fetchConversas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendasPipelineApi.listConversas(buildApiFilters(filters));
      setLeads(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('[ConversasInbox] erro ao listar:', err);
      toast.error(err?.message || 'Erro ao carregar conversas');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  // -- SSE / polling: refaz a lista (preview/unread/ordem mudam)
  useEffect(() => {
    if (refreshKey === 0) return;
    fetchConversas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const updateFilter = useCallback(
    <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // -- Marcar lido localmente (zera badge sem refetch completo)
  const handleLido = useCallback((leadId: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, unread: 0, pending_reply: false } : l,
      ),
    );
  }, []);

  const handleEnviado = useCallback(() => {
    // após enviar, refaz a lista (preview/última atividade)
    fetchConversas();
  }, [fetchConversas]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <Card className="overflow-hidden">
      <div className="grid h-[calc(100vh-16rem)] min-h-[480px] grid-cols-1 md:grid-cols-[260px_320px_1fr]">
        {/* Coluna 1: filtros */}
        <aside
          className={`flex flex-col gap-4 border-r p-4 ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tag</Label>
            <Select value={filters.tag_id} onValueChange={(v) => updateFilter('tag_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Temperatura</Label>
            <Select
              value={filters.temperatura}
              onValueChange={(v) => updateFilter('temperatura', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {TEMPERATURAS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Estágio</Label>
            <Select value={filters.stage_id} onValueChange={(v) => updateFilter('stage_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estágios</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="minhas" className="text-xs">
              Só minhas conversas
            </Label>
            <Switch
              id="minhas"
              checked={filters.minhas}
              onCheckedChange={(v) => updateFilter('minhas', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="arquivados" className="text-xs">
              Mostrar arquivados
            </Label>
            <Switch
              id="arquivados"
              checked={filters.arquivados}
              onCheckedChange={(v) => updateFilter('arquivados', v)}
            />
          </div>
        </aside>

        {/* Coluna 2: lista de conversas */}
        <div
          className={`flex flex-col border-r overflow-hidden ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ConversationList
            leads={leads}
            loading={loading}
            selectedId={selectedId}
            onSelect={(lead) => setSelectedId(lead.id)}
          />
        </div>

        {/* Coluna 3: chat */}
        <div className={`flex flex-col overflow-hidden ${selectedId ? 'flex' : 'hidden md:flex'}`}>
          {/* Voltar (mobile) */}
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 border-b px-4 py-2 text-sm text-muted-foreground md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          )}
          <div className="min-h-0 flex-1">
            <ConversationChat
              key={selectedLead?.id ?? 'none'}
              leadId={selectedId}
              refreshKey={refreshKey}
              ultimoEvento={ultimoEvento}
              onLido={handleLido}
              onEnviado={handleEnviado}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ConversasInbox;
