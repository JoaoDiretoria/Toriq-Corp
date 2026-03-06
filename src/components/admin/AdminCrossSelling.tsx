import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AtividadePopup } from './AtividadePopup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MoreVertical, Trash2, Edit, Phone, Mail, Building2, DollarSign, GripVertical, Search, Loader2, Settings, MessageSquare, FileText, Video, MapPin, Target, Star, TrendingUp, Smile, Meh, Frown, ArrowRightLeft, Calendar, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { parse } from 'date-fns';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface Coluna { id: string; empresa_id: string; nome: string; cor: string; ordem: number; meta_valor: number; }
interface CrossSellingCard { id: string; empresa_id: string; coluna_id: string; titulo: string; descricao: string | null; valor: number; responsavel_id: string | null; cliente_nome: string | null; cliente_email: string | null; cliente_telefone: string | null; cliente_empresa: string | null; cliente_id: string | null; tipo_servico: string | null; data_venda: string | null; data_implementacao: string | null; data_followup: string | null; status_satisfacao: 'pendente' | 'satisfeito' | 'neutro' | 'insatisfeito'; nota_nps: number | null; ordem: number; arquivado: boolean; created_at?: string; created_by?: string | null; }
interface Atividade { id: string; card_id: string; usuario_id: string | null; tipo: string; descricao: string | null; prazo: string | null; horario: string | null; status: string; created_at: string; }
interface Etiqueta { id: string; empresa_id: string; nome: string; cor: string; }
interface CardEtiqueta { card_id: string; etiqueta_id: string; etiqueta?: Etiqueta; }

const CORES_COLUNAS = [
  { key: 'indigo', value: '#6366f1' }, { key: 'violet', value: '#8b5cf6' }, { key: 'purple', value: '#a855f7' },
  { key: 'pink', value: '#ec4899' }, { key: 'red', value: '#ef4444' }, { key: 'orange', value: '#f97316' },
  { key: 'amber', value: '#f59e0b' }, { key: 'green', value: '#22c55e' }, { key: 'teal', value: '#14b8a6' },
  { key: 'cyan', value: '#06b6d4' }, { key: 'blue', value: '#3b82f6' }, { key: 'slate', value: '#64748b' },
];

const TIPOS_SERVICO = ['Upsell SST', 'Cross-sell Treinamento', 'Renovação Contrato', 'Expansão de Serviços', 'Consultoria Adicional', 'Novo Módulo', 'Upgrade de Plano', 'Outro'];

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: Target, cor: 'bg-blue-100 text-blue-700' },
  { id: 'nota', label: 'Nota', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-purple-100 text-purple-700' },
  { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-green-100 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-indigo-100 text-indigo-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-orange-100 text-orange-700' },
  { id: 'proposta', label: 'Proposta', icon: FileText, cor: 'bg-yellow-100 text-yellow-700' },
];

function SortableCard({ card, onEdit, onDelete, onViewDetails, isDropped, atividades = [], etiquetas = [], cardIndex }: { card: CrossSellingCard; onEdit: (card: CrossSellingCard) => void; onDelete: (id: string) => void; onViewDetails: (card: CrossSellingCard) => void; isDropped?: boolean; atividades?: Atividade[]; etiquetas?: CardEtiqueta[]; cardIndex?: number; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: 'card', card } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms ease', opacity: isDragging ? 0.5 : 1, animation: isDropped ? 'jelly 0.5s ease' : undefined };

  const getSatisfacaoColor = () => {
    switch (card.status_satisfacao) {
      case 'satisfeito': return '#22c55e';
      case 'neutro': return '#eab308';
      case 'insatisfeito': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const getSatisfacaoIcon = () => {
    switch (card.status_satisfacao) {
      case 'satisfeito': return <Smile className="h-3 w-3 text-green-500" />;
      case 'neutro': return <Meh className="h-3 w-3 text-yellow-500" />;
      case 'insatisfeito': return <Frown className="h-3 w-3 text-red-500" />;
      default: return <Meh className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group border-border hover:border-primary/50">
      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full" style={{ backgroundColor: getSatisfacaoColor() }} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewDetails(card)}>
          <div className="flex items-center gap-2 mb-1">
            {getSatisfacaoIcon()}
            <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">{cardIndex !== undefined ? `#${cardIndex + 1} - ` : ''}{card.cliente_nome || card.titulo}</h4>
          </div>
          {card.cliente_empresa && (<div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Building2 className="h-3 w-3" /><span className="truncate">{card.cliente_empresa}</span></div>)}
          {card.tipo_servico && (<div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><TrendingUp className="h-3 w-3" /><span className="truncate">{card.tipo_servico}</span></div>)}
          {card.valor > 0 && (<div className="flex items-center gap-1 text-xs text-green-600 mb-1"><DollarSign className="h-3 w-3" /><span>R$ {card.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>)}
          {etiquetas.length > 0 && (<div className="flex items-center gap-1 flex-wrap mt-1 mb-1">{etiquetas.map((ce) => ce.etiqueta && (<div key={ce.etiqueta_id} className="px-1.5 py-0.5 rounded text-2xs font-medium text-white" style={{ backgroundColor: ce.etiqueta.cor }}>{ce.etiqueta.nome}</div>))}</div>)}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={`text-2xs ${card.status_satisfacao === 'satisfeito' ? 'bg-green-500/15 text-green-600' : card.status_satisfacao === 'insatisfeito' ? 'bg-red-500/15 text-red-600' : card.status_satisfacao === 'neutro' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-gray-500/15 text-gray-600'}`}>{card.status_satisfacao === 'satisfeito' ? 'Interessado' : card.status_satisfacao === 'insatisfeito' ? 'Não Interessado' : card.status_satisfacao === 'neutro' ? 'Em Análise' : 'Pendente'}</Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(card)}><FileText className="h-4 w-4 mr-2" />Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(card)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(card.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SortableColumn({ coluna, cards, onEditCard, onDeleteCard, onViewDetails, onEditColumn, onDeleteColumn, droppedCardId, cardAtividades, allCardEtiquetas, allCards }: { coluna: Coluna; cards: CrossSellingCard[]; onEditCard: (card: CrossSellingCard) => void; onDeleteCard: (id: string) => void; onViewDetails: (card: CrossSellingCard) => void; onEditColumn: (coluna: Coluna) => void; onDeleteColumn: (id: string) => void; droppedCardId: string | null; cardAtividades: Record<string, Atividade[]>; allCardEtiquetas: Record<string, CardEtiqueta[]>; allCards: CrossSellingCard[]; }) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: coluna.id, data: { type: 'column', coluna } });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `droppable-${coluna.id}`, data: { type: 'column', coluna } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms ease', opacity: isDragging ? 0.5 : 1 };

  const valorTotal = cards.reduce((sum, c) => sum + (c.valor || 0), 0);

  return (
    <div ref={setSortableRef} style={style} className={`flex-shrink-0 w-80 bg-card/50 rounded-xl border border-border flex flex-col max-h-full transition-all ${isOver ? 'ring-2 ring-primary/50 border-primary/50 bg-primary/5' : ''} ${isDragging ? 'z-50 shadow-xl' : ''}`}>
      <div className="p-4 rounded-t-xl cursor-grab active:cursor-grabbing border-b border-border/50" style={{ borderTop: `3px solid ${coluna.cor}` }} {...attributes} {...listeners}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: coluna.cor }} />
            <h3 className="font-semibold text-sm truncate">{coluna.nome}</h3>
            <Badge variant="secondary" className="text-xs flex-shrink-0 bg-muted/50">{cards.length}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0 opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onEditColumn(coluna)}><Edit className="h-4 w-4 mr-2" />Editar Coluna</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteColumn(coluna.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir Coluna</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {valorTotal > 0 && (
          <div className="mt-2 text-xs text-green-600 font-medium">
            R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
      <div ref={setDroppableRef} className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors scrollbar-thin ${isOver ? 'bg-primary/5' : ''}`}>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (<SortableCard key={card.id} card={card} onEdit={onEditCard} onDelete={onDeleteCard} onViewDetails={onViewDetails} isDropped={droppedCardId === card.id} atividades={cardAtividades[card.id] || []} etiquetas={allCardEtiquetas[card.id] || []} cardIndex={allCards.findIndex(c => c.id === card.id)} />))}
        </SortableContext>
        {cards.length === 0 && (<div className={`text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}><Target className="h-6 w-6 mx-auto mb-2 opacity-50" /><p>Arraste oportunidades para cá</p></div>)}
      </div>
    </div>
  );
}

export function AdminCrossSelling() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [cards, setCards] = useState<CrossSellingCard[]>([]);
  const [activeCard, setActiveCard] = useState<CrossSellingCard | null>(null);
  const [activeColuna, setActiveColuna] = useState<Coluna | null>(null);
  const [dragOriginColunaId, setDragOriginColunaId] = useState<string | null>(null);
  const [droppedCardId, setDroppedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [colunaDialogOpen, setColunaDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CrossSellingCard | null>(null);
  const [editingColuna, setEditingColuna] = useState<Coluna | null>(null);
  const [selectedColunaId, setSelectedColunaId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [viewingCard, setViewingCard] = useState<CrossSellingCard | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [atividadePopupOpen, setAtividadePopupOpen] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);
  const [novaAtividade, setNovaAtividade] = useState({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [cardAtividades, setCardAtividades] = useState<Record<string, Atividade[]>>({});
  const [allCardEtiquetas, setAllCardEtiquetas] = useState<Record<string, CardEtiqueta[]>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'coluna' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  
  // Estado para dialog de justificativa de mudança de etapa
  const [mudancaEtapaDialog, setMudancaEtapaDialog] = useState<{
    open: boolean;
    colunaDestino: Coluna | null;
    colunaOrigem: Coluna | null;
    etapasMovidas: number;
    direcao: 'avanco' | 'retrocesso';
  }>({ open: false, colunaDestino: null, colunaOrigem: null, etapasMovidas: 0, direcao: 'avanco' });
  const [justificativaMudanca, setJustificativaMudanca] = useState('');
  const [cardForm, setCardForm] = useState({ titulo: '', descricao: '', cliente_nome: '', cliente_email: '', cliente_telefone: '', cliente_empresa: '', tipo_servico: '', data_venda: '', data_implementacao: '', data_followup: '', status_satisfacao: 'pendente' as const, nota_nps: '' as string | number, valor: 0 });
  const [colunaForm, setColunaForm] = useState({ nome: '', cor: '#6366f1', meta_valor: 0 });
  
  // Estado para dialog de transferência de card
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferFunil, setTransferFunil] = useState<string>('');
  const [transferColuna, setTransferColuna] = useState<string>('');
  const [transferColunas, setTransferColunas] = useState<{id: string; nome: string}[]>([]);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  const empresaId = TORIQ_EMPRESA_ID;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => { if (empresaId) fetchData(); }, [empresaId]);

  const fetchData = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data: colunasData, error: colunasError } = await (supabase as any).from('cross_selling_colunas').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true });
      if (colunasError) throw colunasError;
      if (!colunasData || colunasData.length === 0) { await criarColunasPadrao(); return; }
      setColunas(colunasData);
      const { data: cardsData, error: cardsError } = await (supabase as any).from('cross_selling_cards').select('*').eq('empresa_id', empresaId).eq('arquivado', false).order('ordem', { ascending: true });
      if (cardsError) throw cardsError;
      setCards(cardsData || []);
      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map((c: CrossSellingCard) => c.id);
        const { data: atividadesData } = await (supabase as any).from('cross_selling_atividades').select('*').in('card_id', cardIds).order('prazo', { ascending: true, nullsFirst: false });
        const atividadesPorCard: Record<string, Atividade[]> = {};
        (atividadesData || []).forEach((a: any) => { if (!atividadesPorCard[a.card_id]) atividadesPorCard[a.card_id] = []; atividadesPorCard[a.card_id].push(a); });
        setCardAtividades(atividadesPorCard);
        const { data: etiquetasData } = await (supabase as any).from('cross_selling_card_etiquetas').select('*, etiqueta:cross_selling_etiquetas(*)');
        const etiquetasPorCard: Record<string, CardEtiqueta[]> = {};
        (etiquetasData || []).forEach((ce: CardEtiqueta) => { if (!etiquetasPorCard[ce.card_id]) etiquetasPorCard[ce.card_id] = []; etiquetasPorCard[ce.card_id].push(ce); });
        setAllCardEtiquetas(etiquetasPorCard);
      }
    } catch (error: any) { console.error('Erro ao buscar dados:', error); toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' }); } finally { setLoading(false); }
  };

  const criarColunasPadrao = async () => {
    if (!empresaId) return;
    const colunasPadrao = [{ nome: 'Identificado', cor: '#6366f1', ordem: 0 }, { nome: 'Qualificado', cor: '#8b5cf6', ordem: 1 }, { nome: 'Proposta Enviada', cor: '#f59e0b', ordem: 2 }, { nome: 'Negociação', cor: '#a855f7', ordem: 3 }, { nome: 'Fechado', cor: '#22c55e', ordem: 4 }, { nome: 'Perdido', cor: '#ef4444', ordem: 5 }];
    try { const { error } = await (supabase as any).from('cross_selling_colunas').insert(colunasPadrao.map(c => ({ ...c, empresa_id: empresaId }))); if (error) throw error; fetchData(); } catch (error: any) { console.error('Erro ao criar colunas padrão:', error); }
  };

  const handleDragStart = (event: DragStartEvent) => { const { active } = event; const activeData = active.data.current; if (activeData?.type === 'card') { setActiveCard(activeData.card); setActiveColuna(null); setDragOriginColunaId(activeData.card.coluna_id); } else if (activeData?.type === 'column') { setActiveColuna(activeData.coluna); setActiveCard(null); setDragOriginColunaId(null); } };
  const handleDragOver = (event: DragOverEvent) => { const { active, over } = event; if (!over) return; const activeData = active.data.current; const overData = over.data.current; if (activeData?.type !== 'card') return; const activeCardData = activeData.card as CrossSellingCard; const activeId = active.id as string; let targetColunaId: string | null = null; if (over.id.toString().startsWith('droppable-')) { targetColunaId = over.id.toString().replace('droppable-', ''); } else if (overData?.type === 'card') { targetColunaId = (overData.card as CrossSellingCard).coluna_id; } else if (overData?.type === 'column') { targetColunaId = overData.coluna.id; } if (targetColunaId && activeCardData.coluna_id !== targetColunaId) { setCards(prev => prev.map(c => c.id === activeId ? { ...c, coluna_id: targetColunaId! } : c)); } };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event; const activeData = active.data.current; const savedOriginColunaId = dragOriginColunaId; setActiveCard(null); setActiveColuna(null); setDragOriginColunaId(null); if (!over) return;
    if (activeData?.type === 'column') { const activeId = active.id as string; const overId = over.id as string; if (activeId !== overId) { const oldIndex = colunas.findIndex(c => c.id === activeId); const newIndex = colunas.findIndex(c => c.id === overId); if (oldIndex !== -1 && newIndex !== -1) { const reordered = arrayMove(colunas, oldIndex, newIndex); setColunas(reordered.map((c, i) => ({ ...c, ordem: i }))); try { for (let i = 0; i < reordered.length; i++) { await (supabase as any).from('cross_selling_colunas').update({ ordem: i }).eq('id', reordered[i].id); } } catch (error) { console.error('Erro ao reordenar colunas:', error); fetchData(); } } } return; }
    if (activeData?.type === 'card') { const activeId = active.id as string; const activeCardData = activeData.card as CrossSellingCard; const overData = over.data.current; const colunaOrigemId = savedOriginColunaId || activeCardData.coluna_id; let targetColunaId = colunaOrigemId; if (over.id.toString().startsWith('droppable-')) { targetColunaId = over.id.toString().replace('droppable-', ''); } else if (overData?.type === 'card') { targetColunaId = (overData.card as CrossSellingCard).coluna_id; } else if (overData?.type === 'column') { targetColunaId = overData.coluna.id; } const mudouDeColuna = colunaOrigemId !== targetColunaId; const cardAtualizado = cards.find(c => c.id === activeId); if (cardAtualizado) { const cardsNaColuna = cards.filter(c => c.coluna_id === targetColunaId && c.id !== activeId); const novaOrdem = cardsNaColuna.length; setCards(prev => prev.map(c => c.id === activeId ? { ...c, coluna_id: targetColunaId, ordem: novaOrdem } : c)); setDroppedCardId(activeId); setTimeout(() => setDroppedCardId(null), 500); try { await (supabase as any).from('cross_selling_cards').update({ coluna_id: targetColunaId, ordem: novaOrdem }).eq('id', activeId); if (mudouDeColuna) { const colunaOrigem = colunas.find(c => c.id === colunaOrigemId); const colunaDestino = colunas.find(c => c.id === targetColunaId); await (supabase as any).from('cross_selling_atividades').insert({ card_id: activeId, usuario_id: profile?.id || null, tipo: 'movimentacao', descricao: `Oportunidade movida de "${colunaOrigem?.nome}" para "${colunaDestino?.nome}"`, status: 'concluida' }); fetchData(); } } catch (error) { console.error('Erro ao mover card:', error); fetchData(); } } }
  };

  const fetchAtividades = async (cardId: string) => { setLoadingAtividades(true); try { const { data, error } = await (supabase as any).from('cross_selling_atividades').select('*').eq('card_id', cardId).order('created_at', { ascending: false }); if (error) throw error; setAtividades(data || []); } catch (error) { console.error('Erro ao buscar atividades:', error); } finally { setLoadingAtividades(false); } };

  // Função para executar mudança de etapa com justificativa
  const executarMudancaEtapa = async (colunaDestino: Coluna, colunaOrigem: Coluna, justificativa?: string) => {
    if (!viewingCard) return;
    try {
      await (supabase as any).from('cross_selling_cards').update({ coluna_id: colunaDestino.id }).eq('id', viewingCard.id);
      const indexOrigem = colunas.findIndex(c => c.id === colunaOrigem.id);
      const indexDestino = colunas.findIndex(c => c.id === colunaDestino.id);
      const direcao = indexDestino > indexOrigem ? 'avançou' : 'retrocedeu';
      const etapas = Math.abs(indexDestino - indexOrigem);
      await (supabase as any).from('cross_selling_atividades').insert({
        card_id: viewingCard.id,
        usuario_id: profile?.id || null,
        tipo: 'mudanca_etapa',
        descricao: `${direcao === 'avançou' ? 'Avançou' : 'Retrocedeu'} ${etapas} etapa${etapas > 1 ? 's' : ''}: "${colunaOrigem.nome}" → "${colunaDestino.nome}"${justificativa ? ` | ${justificativa}` : ''}`,
        status: 'concluida'
      });
      setViewingCard({ ...viewingCard, coluna_id: colunaDestino.id });
      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, coluna_id: colunaDestino.id } : c));
      fetchAtividades(viewingCard.id);
      fetchData();
      toast({ title: 'Sucesso', description: `Oportunidade movida para "${colunaDestino.nome}"` });
    } catch (error) { console.error('Erro ao mudar etapa:', error); toast({ title: 'Erro', description: 'Não foi possível mover', variant: 'destructive' }); }
  };

  // Handler para mudança de etapa via navegação
  const handleMudarEtapa = (colunaDestino: Coluna) => {
    if (!viewingCard) return;
    const colunaOrigem = colunas.find(c => c.id === viewingCard.coluna_id);
    if (!colunaOrigem || colunaOrigem.id === colunaDestino.id) return;
    const indexOrigem = colunas.findIndex(c => c.id === colunaOrigem.id);
    const indexDestino = colunas.findIndex(c => c.id === colunaDestino.id);
    const etapasMovidas = Math.abs(indexDestino - indexOrigem);
    const direcao = indexDestino < indexOrigem ? 'retrocesso' : 'avanco';
    if (direcao === 'retrocesso' || etapasMovidas > 1) {
      setMudancaEtapaDialog({ open: true, colunaDestino, colunaOrigem, etapasMovidas, direcao });
    } else {
      executarMudancaEtapa(colunaDestino, colunaOrigem);
    }
  };

  const handleAddAtividade = async () => { if (!viewingCard || !novaAtividade.descricao.trim()) { toast({ title: 'Erro', description: 'Digite uma descrição.', variant: 'destructive' }); return; } try { await (supabase as any).from('cross_selling_atividades').insert({ card_id: viewingCard.id, usuario_id: profile?.id || null, tipo: novaAtividade.tipo, descricao: novaAtividade.descricao.trim(), prazo: novaAtividade.prazo || null, horario: novaAtividade.horario || null, status: novaAtividade.prazo ? 'programada' : 'a_realizar' }); setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' }); setAtividadeDialogOpen(false); fetchAtividades(viewingCard.id); fetchData(); toast({ title: 'Sucesso', description: 'Atividade adicionada!' }); } catch (error: any) { console.error('Erro:', error); toast({ title: 'Erro', description: 'Não foi possível adicionar.', variant: 'destructive' }); } };

  const handleUpdateAtividadeStatus = async (atividadeId: string, newStatus: string) => {
    try {
      await (supabase as any).from('cross_selling_atividades').update({ status: newStatus }).eq('id', atividadeId);
      if (viewingCard) {
        fetchAtividades(viewingCard.id);
      }
      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status.', variant: 'destructive' });
    }
  };

  // Função para buscar colunas do funil selecionado
  const handleFunilChange = async (funil: string) => {
    setTransferFunil(funil);
    setTransferColuna('');
    setTransferColunas([]);
    
    if (!funil) return;
    
    try {
      const tabelaColunas = `${funil}_colunas`;
      const { data, error } = await (supabase as any)
        .from(tabelaColunas)
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      setTransferColunas(data || []);
    } catch (error) {
      console.error('Erro ao buscar colunas:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as colunas.', variant: 'destructive' });
    }
  };

  // Função para transferir card para outro funil
  const handleTransferCard = async () => {
    if (!viewingCard || !transferFunil || !transferColuna) {
      toast({ title: 'Erro', description: 'Selecione o funil e a coluna de destino.', variant: 'destructive' });
      return;
    }
    
    setLoadingTransfer(true);
    try {
      const tabelaCards = `${transferFunil}_cards`;
      const tabelaAtividades = `${transferFunil}_atividades`;
      
      // Contar cards na coluna destino para definir ordem
      const { data: cardsNaColuna } = await (supabase as any)
        .from(tabelaCards)
        .select('id')
        .eq('coluna_id', transferColuna);
      
      // Criar card no funil de destino com campos específicos de cada funil
      let cardData: any = {
        empresa_id: empresaId,
        coluna_id: transferColuna,
        titulo: viewingCard.titulo,
        descricao: viewingCard.descricao,
        valor: viewingCard.valor || 0,
        ordem: cardsNaColuna?.length || 0,
        arquivado: false,
      };
      
      // Campos específicos para cada funil
      if (transferFunil === 'prospeccao') {
        // prospeccao_cards usa contato_* em vez de cliente_*
        cardData = {
          ...cardData,
          contato_nome: viewingCard.cliente_nome,
          contato_email: viewingCard.cliente_email,
          contato_telefone: viewingCard.cliente_telefone,
          contato_empresa: viewingCard.cliente_empresa,
          temperatura: 'morno',
          origem: 'cross_selling',
        };
      } else if (transferFunil === 'closer') {
        // closer_cards usa contato_* em vez de cliente_* (não tem created_by)
        cardData = {
          ...cardData,
          contato_nome: viewingCard.cliente_nome,
          contato_email: viewingCard.cliente_email,
          contato_telefone: viewingCard.cliente_telefone,
          contato_empresa: viewingCard.cliente_empresa,
          temperatura: 'morno',
          origem: 'cross_selling',
        };
      } else if (transferFunil === 'pos_venda') {
        // pos_venda_cards usa cliente_*
        cardData = {
          ...cardData,
          cliente_nome: viewingCard.cliente_nome,
          cliente_email: viewingCard.cliente_email,
          cliente_telefone: viewingCard.cliente_telefone,
          cliente_empresa: viewingCard.cliente_empresa,
          tipo_servico: viewingCard.tipo_servico,
          data_venda: viewingCard.data_venda,
          status_satisfacao: viewingCard.status_satisfacao || 'pendente',
          created_by: profile?.id || null,
        };
      }
      
      const { data: insertedCard, error: insertError } = await (supabase as any)
        .from(tabelaCards)
        .insert(cardData)
        .select();
      
      if (insertError) throw insertError;
      
      const novoCardId = insertedCard?.[0]?.id;
      
      // Copiar histórico de atividades
      if (novoCardId) {
        const { data: atividadesOrigem } = await (supabase as any)
          .from('cross_selling_atividades')
          .select('*')
          .eq('card_id', viewingCard.id)
          .order('created_at', { ascending: true });
        
        console.log('[Transfer] Atividades encontradas:', atividadesOrigem?.length || 0);
        
        if (atividadesOrigem && atividadesOrigem.length > 0) {
          // Mapear atividades com campos compatíveis para cada funil
          const atividadesDestino = atividadesOrigem.map((ativ: any) => {
            const baseAtividade: any = {
              card_id: novoCardId,
              usuario_id: ativ.usuario_id,
              tipo: ativ.tipo || 'movimentacao',
              descricao: ativ.descricao ? `[Histórico Cross-Selling] ${ativ.descricao}` : '[Histórico Cross-Selling]',
            };
            
            // Campos específicos por funil de destino
            if (transferFunil === 'prospeccao' || transferFunil === 'closer') {
              // prospeccao_atividades e closer_atividades têm estrutura similar
              return {
                ...baseAtividade,
                prazo: ativ.prazo ? new Date(ativ.prazo).toISOString().split('T')[0] : null,
                horario: ativ.horario || null,
                status: ativ.status || 'concluida',
              };
            } else if (transferFunil === 'pos_venda') {
              return {
                ...baseAtividade,
                prazo: ativ.prazo ? new Date(ativ.prazo).toISOString().split('T')[0] : null,
                horario: ativ.horario || null,
                status: ativ.status || 'concluida',
              };
            }
            return baseAtividade;
          });
          
          const { error: insertAtivError } = await (supabase as any).from(tabelaAtividades).insert(atividadesDestino);
          if (insertAtivError) {
            console.error('[Transfer] Erro ao copiar atividades:', insertAtivError);
          } else {
            console.log('[Transfer] Atividades copiadas com sucesso:', atividadesDestino.length);
          }
        }
        
        // Registrar atividade de transferência
        const funilNomes: Record<string, string> = {
          prospeccao: 'Prospecção',
          closer: 'Closer',
          pos_venda: 'Onboarding',
          cross_selling: 'Cross-Selling',
        };
        
        const atividadeTransferencia: any = {
          card_id: novoCardId,
          usuario_id: profile?.id,
          tipo: 'movimentacao',
          descricao: `Card transferido do Cross-Selling para ${funilNomes[transferFunil] || transferFunil}`,
          status: 'concluida',
        };
        
        await (supabase as any).from(tabelaAtividades).insert(atividadeTransferencia);
        
        // Copiar histórico de MOVIMENTAÇÕES (tabela separada das atividades)
        const tabelaMovimentacoesOrigem = 'cross_selling_card_movimentacoes';
        const tabelaMovimentacoesDestino = `${transferFunil}_card_movimentacoes`;
        
        const { data: movimentacoesOrigem } = await (supabase as any)
          .from(tabelaMovimentacoesOrigem)
          .select('*')
          .eq('card_id', viewingCard.id)
          .order('created_at', { ascending: true });
        
        console.log('[Transfer] Movimentações encontradas:', movimentacoesOrigem?.length || 0);
        
        if (movimentacoesOrigem && movimentacoesOrigem.length > 0) {
          const movimentacoesDestino = movimentacoesOrigem.map((mov: any) => ({
            card_id: novoCardId,
            usuario_id: mov.usuario_id,
            tipo: mov.tipo,
            descricao: mov.descricao ? `[Histórico Cross-Selling] ${mov.descricao}` : '[Histórico Cross-Selling]',
            coluna_origem_id: null, // IDs de colunas não são válidos no novo funil
            coluna_destino_id: null,
            kanban_origem: mov.kanban_origem || 'cross_selling',
            kanban_destino: mov.kanban_destino || 'cross_selling',
            dados_anteriores: mov.dados_anteriores,
            dados_novos: mov.dados_novos,
          }));
          
          const { error: insertMovError } = await (supabase as any)
            .from(tabelaMovimentacoesDestino)
            .insert(movimentacoesDestino);
          
          if (insertMovError) {
            console.error('[Transfer] Erro ao copiar movimentações:', insertMovError);
          } else {
            console.log('[Transfer] Movimentações copiadas com sucesso:', movimentacoesDestino.length);
          }
        }
        
        // Registrar movimentação de transferência
        await (supabase as any).from(tabelaMovimentacoesDestino).insert({
          card_id: novoCardId,
          usuario_id: profile?.id,
          tipo: 'mudanca_kanban',
          descricao: `Card transferido do Cross-Selling para ${funilNomes[transferFunil] || transferFunil}`,
          kanban_origem: 'cross_selling',
          kanban_destino: transferFunil === 'pos_venda' ? 'onboarding' : transferFunil,
        });
      }
      
      // Arquivar o card original
      await (supabase as any)
        .from('cross_selling_cards')
        .update({ arquivado: true })
        .eq('id', viewingCard.id);
      
      // Remover da lista local
      setCards(prev => prev.filter(c => c.id !== viewingCard.id));
      
      // Fechar dialogs
      setTransferDialogOpen(false);
      setDetailsDialogOpen(false);
      setViewingCard(null);
      setTransferFunil('');
      setTransferColuna('');
      setTransferColunas([]);
      
      const funilNomes: Record<string, string> = {
        prospeccao: 'Prospecção',
        closer: 'Closer',
        pos_venda: 'Onboarding',
        cross_selling: 'Cross-Selling',
      };
      
      toast({ title: 'Sucesso!', description: `Card transferido para ${funilNomes[transferFunil] || transferFunil} com todo o histórico.` });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao transferir card:', error);
      toast({ title: 'Erro', description: error?.message || 'Não foi possível transferir o card.', variant: 'destructive' });
    } finally {
      setLoadingTransfer(false);
    }
  };

  const handleSaveCard = async () => { if (!cardForm.titulo.trim() && !cardForm.cliente_nome.trim()) { toast({ title: 'Erro', description: 'Preencha o título ou nome do cliente.', variant: 'destructive' }); return; } setSavingCard(true); try { const cardData = { empresa_id: empresaId, coluna_id: selectedColunaId || colunas[0]?.id, titulo: cardForm.titulo || cardForm.cliente_nome, descricao: cardForm.descricao || null, cliente_nome: cardForm.cliente_nome || null, cliente_email: cardForm.cliente_email || null, cliente_telefone: cardForm.cliente_telefone || null, cliente_empresa: cardForm.cliente_empresa || null, tipo_servico: cardForm.tipo_servico || null, data_venda: cardForm.data_venda || null, data_implementacao: cardForm.data_implementacao || null, data_followup: cardForm.data_followup || null, status_satisfacao: cardForm.status_satisfacao, nota_nps: cardForm.nota_nps ? Number(cardForm.nota_nps) : null, valor: cardForm.valor || 0 }; if (editingCard) { await (supabase as any).from('cross_selling_cards').update(cardData).eq('id', editingCard.id); toast({ title: 'Sucesso', description: 'Oportunidade atualizada!' }); } else { const cardsNaColuna = cards.filter(c => c.coluna_id === cardData.coluna_id); await (supabase as any).from('cross_selling_cards').insert({ ...cardData, ordem: cardsNaColuna.length, created_by: profile?.id || null }); toast({ title: 'Sucesso', description: 'Oportunidade adicionada!' }); } setCardDialogOpen(false); setEditingCard(null); resetCardForm(); fetchData(); } catch (error: any) { console.error('Erro:', error); toast({ title: 'Erro', description: error?.message || 'Não foi possível salvar.', variant: 'destructive' }); } finally { setSavingCard(false); } };

  const handleSaveColuna = async () => { if (!colunaForm.nome.trim()) { toast({ title: 'Erro', description: 'Digite um nome.', variant: 'destructive' }); return; } try { if (editingColuna) { await (supabase as any).from('cross_selling_colunas').update({ nome: colunaForm.nome, cor: colunaForm.cor, meta_valor: colunaForm.meta_valor }).eq('id', editingColuna.id); toast({ title: 'Sucesso', description: 'Coluna atualizada!' }); } else { await (supabase as any).from('cross_selling_colunas').insert({ empresa_id: empresaId, nome: colunaForm.nome, cor: colunaForm.cor, meta_valor: colunaForm.meta_valor, ordem: colunas.length }); toast({ title: 'Sucesso', description: 'Coluna criada!' }); } setColunaDialogOpen(false); setEditingColuna(null); setColunaForm({ nome: '', cor: '#6366f1', meta_valor: 0 }); fetchData(); } catch (error: any) { console.error('Erro:', error); toast({ title: 'Erro', description: error?.message || 'Não foi possível salvar.', variant: 'destructive' }); } };

  const handleConfirmDelete = async () => { if (!deleteId || !deleteType) return; try { if (deleteType === 'coluna') { await (supabase as any).from('cross_selling_colunas').delete().eq('id', deleteId); toast({ title: 'Sucesso', description: 'Coluna excluída!' }); } else { await (supabase as any).from('cross_selling_cards').delete().eq('id', deleteId); toast({ title: 'Sucesso', description: 'Oportunidade excluída!' }); } fetchData(); } catch (error: any) { console.error('Erro:', error); toast({ title: 'Erro', description: error?.message || 'Não foi possível excluir.', variant: 'destructive' }); } finally { setDeleteDialogOpen(false); setDeleteType(null); setDeleteId(null); setDeleteName(''); } };

  const resetCardForm = () => { setCardForm({ titulo: '', descricao: '', cliente_nome: '', cliente_email: '', cliente_telefone: '', cliente_empresa: '', tipo_servico: '', data_venda: '', data_implementacao: '', data_followup: '', status_satisfacao: 'pendente', nota_nps: '', valor: 0 }); };
  const handleEditCard = (card: CrossSellingCard) => { setEditingCard(card); setSelectedColunaId(card.coluna_id); setCardForm({ titulo: card.titulo || '', descricao: card.descricao || '', cliente_nome: card.cliente_nome || '', cliente_email: card.cliente_email || '', cliente_telefone: card.cliente_telefone || '', cliente_empresa: card.cliente_empresa || '', tipo_servico: card.tipo_servico || '', data_venda: card.data_venda || '', data_implementacao: card.data_implementacao || '', data_followup: card.data_followup || '', status_satisfacao: (card.status_satisfacao as any) || 'pendente', nota_nps: card.nota_nps ?? '', valor: card.valor || 0 }); setCardDialogOpen(true); };
  const handleViewDetails = (card: CrossSellingCard) => { setViewingCard(card); fetchAtividades(card.id); setDetailsDialogOpen(true); };
  const handleDeleteCard = (id: string) => { const card = cards.find(c => c.id === id); setDeleteType('card'); setDeleteId(id); setDeleteName(card?.cliente_nome || card?.titulo || 'esta oportunidade'); setDeleteDialogOpen(true); };
  const handleEditColumn = (coluna: Coluna) => { setEditingColuna(coluna); setColunaForm({ nome: coluna.nome, cor: coluna.cor, meta_valor: coluna.meta_valor }); setColunaDialogOpen(true); };
  const handleDeleteColumn = (id: string) => { const coluna = colunas.find(c => c.id === id); setDeleteType('coluna'); setDeleteId(id); setDeleteName(coluna?.nome || 'esta coluna'); setDeleteDialogOpen(true); };

  const filteredCards = useMemo(() => { if (!searchTerm) return cards; const term = searchTerm.toLowerCase(); return cards.filter(c => c.titulo?.toLowerCase().includes(term) || c.cliente_nome?.toLowerCase().includes(term) || c.cliente_empresa?.toLowerCase().includes(term) || c.tipo_servico?.toLowerCase().includes(term)); }, [cards, searchTerm]);

  if (loading) { return (<div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>); }

  return (
    <div className="space-y-4">
      <style>{`@keyframes jelly { 0%, 100% { transform: scale(1, 1); } 25% { transform: scale(0.95, 1.05); } 50% { transform: scale(1.05, 0.95); } 75% { transform: scale(0.98, 1.02); } }`}</style>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">CS / Cross-selling</h2></div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar oportunidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-64" /></div>
          <Button variant="outline" onClick={() => { setEditingColuna(null); setColunaForm({ nome: '', cor: '#6366f1', meta_valor: 0 }); setColunaDialogOpen(true); }}><Settings className="h-4 w-4 mr-2" />Nova Coluna</Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-h-[calc(100vh-220px)]">
            <SortableContext items={colunas.map(c => c.id)}>
              {colunas.map((coluna) => (<SortableColumn key={coluna.id} coluna={coluna} cards={filteredCards.filter(c => c.coluna_id === coluna.id)} onEditCard={handleEditCard} onDeleteCard={handleDeleteCard} onViewDetails={handleViewDetails} onEditColumn={handleEditColumn} onDeleteColumn={handleDeleteColumn} droppedCardId={droppedCardId} cardAtividades={cardAtividades} allCardEtiquetas={allCardEtiquetas} allCards={filteredCards} />))}
            </SortableContext>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DragOverlay>{activeCard && (<div className="bg-card rounded-lg border shadow-lg p-3 w-72 opacity-90"><h4 className="font-medium text-sm">{activeCard.cliente_nome || activeCard.titulo}</h4></div>)}{activeColuna && (<div className="bg-card/80 rounded-xl border shadow-lg p-4 w-80 opacity-90" style={{ borderTop: `3px solid ${activeColuna.cor}` }}><h3 className="font-semibold text-sm">{activeColuna.nome}</h3></div>)}</DragOverlay>
      </DndContext>

      {/* Dialog Card */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
            <DialogDescription>
              {editingCard ? 'Atualize as informações da oportunidade' : 'Preencha os dados da nova oportunidade de cross-selling'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome do Cliente *</Label><Input value={cardForm.cliente_nome} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_nome: e.target.value }))} placeholder="Nome do cliente" /></div>
              <div className="space-y-2"><Label>Empresa</Label><Input value={cardForm.cliente_empresa} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_empresa: e.target.value }))} placeholder="Empresa do cliente" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={cardForm.cliente_email} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_email: e.target.value }))} placeholder="email@exemplo.com" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={cardForm.cliente_telefone} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo de Oportunidade</Label><Select value={cardForm.tipo_servico} onValueChange={(v) => setCardForm(prev => ({ ...prev, tipo_servico: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TIPOS_SERVICO.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Valor Estimado (R$)</Label><Input type="number" value={cardForm.valor} onChange={(e) => setCardForm(prev => ({ ...prev, valor: Number(e.target.value) }))} placeholder="0,00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label><Select value={cardForm.status_satisfacao} onValueChange={(v: any) => setCardForm(prev => ({ ...prev, status_satisfacao: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="satisfeito">Interessado</SelectItem><SelectItem value="neutro">Em Análise</SelectItem><SelectItem value="insatisfeito">Não Interessado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Data Follow-up</Label><Input type="date" value={cardForm.data_followup} onChange={(e) => setCardForm(prev => ({ ...prev, data_followup: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={cardForm.descricao} onChange={(e) => setCardForm(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Observações sobre a oportunidade..." rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCardDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveCard} disabled={savingCard}>{savingCard && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingCard ? 'Salvar' : 'Adicionar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Coluna */}
      <Dialog open={colunaDialogOpen} onOpenChange={setColunaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColuna ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
            <DialogDescription>
              {editingColuna ? 'Atualize as propriedades da coluna' : 'Configure as propriedades da nova coluna do Kanban'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nome da Coluna *</Label><Input value={colunaForm.nome} onChange={(e) => setColunaForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Qualificado" /></div>
            <div className="space-y-2"><Label>Cor</Label><div className="flex flex-wrap gap-2">{CORES_COLUNAS.map(c => (<button key={c.key} type="button" className={`w-8 h-8 rounded-full border-2 transition-all ${colunaForm.cor === c.value ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} onClick={() => setColunaForm(prev => ({ ...prev, cor: c.value }))} />))}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setColunaDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveColuna}>{editingColuna ? 'Salvar' : 'Criar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />{viewingCard?.cliente_nome || viewingCard?.titulo}</DialogTitle>
            {/* Navegação por etapas */}
            {viewingCard && (
              <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 -mx-1 px-1">
                {colunas.map((col, index) => {
                  const isAtual = viewingCard.coluna_id === col.id;
                  const indexAtual = colunas.findIndex(c => c.id === viewingCard.coluna_id);
                  const isAnterior = index < indexAtual;
                  const isPosterior = index > indexAtual;
                  return (
                    <Button key={col.id} variant={isAtual ? 'default' : 'outline'} size="sm" className={`flex-shrink-0 text-xs ${isAnterior ? 'opacity-60' : ''}`} style={isAtual ? { backgroundColor: col.cor } : {}} onClick={() => handleMudarEtapa(col)} disabled={isAtual}>
                      {isAnterior && <TrendingUp className="h-3 w-3 mr-1 rotate-180" />}
                      {col.nome}
                      {isPosterior && <TrendingUp className="h-3 w-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
            )}
          </DialogHeader>
          {viewingCard && (
            <div className="flex-1 overflow-hidden flex gap-4 mt-4">
              {/* Coluna Esquerda - Atividades e Movimentações */}
              <div className="flex-1 flex flex-col min-w-0 gap-4">
                {/* Histórico de Atividades */}
                <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Histórico de Atividades
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAtividadeDialogOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nova Atividade
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1">
                  {loadingAtividades ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (() => {
                    const atividadesFiltradas = atividades.filter(a => 
                      a.tipo !== 'movimentacao' && 
                      a.tipo !== 'mudanca_etapa' && 
                      a.tipo !== 'criacao'
                    );
                    const atividadesPendentes = atividadesFiltradas.filter(a => a.status !== 'concluida');
                    const atividadesConcluidas = atividadesFiltradas.filter(a => a.status === 'concluida');
                    
                    if (atividadesFiltradas.length === 0) {
                      return (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          <p>Nenhuma atividade registrada</p>
                        </div>
                      );
                    }
                    
                    const renderAtividadeCompacta = (atividade: Atividade) => {
                      const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[0];
                      const TipoIcon = tipoInfo.icon;
                      const isConcluida = atividade.status === 'concluida';
                      const statusColors: Record<string, string> = {
                        a_realizar: 'bg-orange-100 text-orange-700',
                        programada: 'bg-blue-100 text-blue-700',
                        pendente: 'bg-red-100 text-red-700',
                        concluida: 'bg-green-100 text-green-700',
                      };
                      const statusLabels: Record<string, string> = {
                        a_realizar: 'A ser realizada',
                        programada: 'Programada',
                        pendente: 'Pendente',
                        concluida: 'Concluída',
                      };
                      const prazoDate = atividade.prazo ? parse(atividade.prazo.split('T')[0], 'yyyy-MM-dd', new Date()) : null;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isToday = prazoDate && prazoDate.toDateString() === today.toDateString();
                      const isPastDue = prazoDate && prazoDate < today && !isConcluida;
                      
                      return (
                        <div 
                          key={atividade.id} 
                          className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                            isConcluida ? 'bg-muted/30 border-border' : 
                            isToday ? 'border-orange-400 bg-orange-50' : 
                            isPastDue ? 'border-red-400 bg-red-50' : 
                            'border-border bg-card'
                          }`}
                          onClick={() => {
                            setSelectedAtividade(atividade as any);
                            setAtividadePopupOpen(true);
                          }}
                        >
                          <Checkbox
                            checked={isConcluida}
                            onCheckedChange={(checked) => {
                              handleUpdateAtividadeStatus(atividade.id, checked ? 'concluida' : 'a_realizar');
                            }}
                            className="h-4 w-4 mt-0.5"
                          />
                          <div className={`p-1.5 rounded-full ${tipoInfo.cor} flex-shrink-0`}>
                            <TipoIcon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`font-medium text-xs ${isConcluida ? 'line-through text-muted-foreground' : ''}`}>
                                  {tipoInfo.label}
                                </span>
                                <Badge className={`text-[10px] px-1.5 py-0 h-4 ${statusColors[atividade.status || 'a_realizar']}`}>
                                  {statusLabels[atividade.status || 'a_realizar']}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {format(new Date(atividade.created_at), 'dd/MM/yy HH:mm')}
                              </span>
                            </div>
                            {atividade.descricao && (
                              <p className={`text-xs text-muted-foreground mt-0.5 line-clamp-2 ${isConcluida ? 'line-through' : ''}`}>
                                {atividade.descricao}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {atividade.prazo && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {format(parse(atividade.prazo.split('T')[0], 'yyyy-MM-dd', new Date()), 'dd/MM/yy')}
                                </span>
                              )}
                              {atividade.horario && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5" />
                                  {atividade.horario}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    };
                    
                    return (
                      <div className="space-y-2">
                        {/* Atividades Pendentes */}
                        {atividadesPendentes.map(renderAtividadeCompacta)}
                        
                        {/* Dropdown de Concluídas */}
                        {atividadesConcluidas.length > 0 && (
                          <details className="group mt-3">
                            <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground py-2 border-t">
                              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                              <span>Concluídas ({atividadesConcluidas.length})</span>
                            </summary>
                            <div className="space-y-2 mt-2 pl-1">
                              {atividadesConcluidas.map(renderAtividadeCompacta)}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })()}
                  </div>
                </div>
                
                {/* Histórico de Movimentações do Card */}
                <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 flex-shrink-0">
                    <ArrowRightLeft className="h-4 w-4" />
                    Histórico de Movimentações
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto pr-1">
                  {loadingAtividades ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (() => {
                    const movimentacoes = atividades.filter(a => 
                      a.tipo === 'movimentacao' || 
                      a.tipo === 'mudanca_etapa' || 
                      a.tipo === 'criacao'
                    );
                    
                    if (movimentacoes.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma movimentação registrada
                        </p>
                      );
                    }
                    
                    return (
                      <div className="relative">
                        {/* Linha vertical de conexão */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                        
                        <div className="space-y-3">
                          {movimentacoes.map((mov) => (
                            <div key={mov.id} className="relative flex gap-3 pl-1">
                              {/* Indicador */}
                              <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                mov.tipo === 'criacao' ? 'bg-teal-100 text-teal-700' :
                                mov.tipo === 'movimentacao' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {mov.tipo === 'criacao' && <Plus className="h-3 w-3" />}
                                {mov.tipo === 'movimentacao' && <ArrowRightLeft className="h-3 w-3" />}
                                {mov.tipo === 'mudanca_etapa' && <ArrowRightLeft className="h-3 w-3" />}
                              </div>
                              
                              {/* Conteúdo */}
                              <div className="flex-1 min-w-0 pb-3">
                                <p className="text-sm">{mov.descricao}</p>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(mov.created_at), 'dd/MM/yy HH:mm')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Ações Rápidas e Informações */}
              <div className="w-72 flex-shrink-0 border-l pl-4 bg-muted/50 rounded-lg p-4 overflow-y-auto max-h-full">
                {/* Ações Rápidas */}
                <div className="space-y-2 mb-6">
                  <h4 className="font-semibold text-sm mb-3">Ações Rápidas</h4>
                  
                  {/* Botão Nova Atividade */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                    onClick={() => setAtividadeDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Atividade
                  </Button>
                  
                  {viewingCard.cliente_email && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => window.open(`mailto:${viewingCard.cliente_email}`, '_blank')}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar E-mail
                    </Button>
                  )}
                  
                  {/* Botão Transferir Card */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transferir Card
                  </Button>
                </div>

                {/* Dados do Cliente */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm">Dados do Cliente</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEditCard(viewingCard)}
                      title="Editar Cliente"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 text-sm">
                    {viewingCard.cliente_nome && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{viewingCard.cliente_nome}</span>
                      </div>
                    )}
                    {viewingCard.cliente_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{viewingCard.cliente_email}</span>
                      </div>
                    )}
                    {viewingCard.cliente_telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{viewingCard.cliente_telefone}</span>
                      </div>
                    )}
                    {viewingCard.tipo_servico && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{viewingCard.tipo_servico}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                {viewingCard.descricao && (
                  <div className="pt-4 border-t mt-4">
                    <h4 className="font-semibold text-sm mb-2">Observações</h4>
                    <p className="text-sm text-muted-foreground">{viewingCard.descricao}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Justificativa para Mudança de Etapa */}
      <Dialog open={mudancaEtapaDialog.open} onOpenChange={(open) => { if (!open) { setMudancaEtapaDialog(prev => ({ ...prev, open: false })); setJustificativaMudanca(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${mudancaEtapaDialog.direcao === 'retrocesso' ? 'text-orange-500' : 'text-blue-500'}`} />
              {mudancaEtapaDialog.direcao === 'retrocesso' ? 'Retroceder Etapa' : 'Avançar Etapas'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {mudancaEtapaDialog.direcao === 'retrocesso' ? (
                <>Você está <strong>retrocedendo</strong> de "{mudancaEtapaDialog.colunaOrigem?.nome}" para "{mudancaEtapaDialog.colunaDestino?.nome}".</>
              ) : (
                <>Você está avançando <strong>{mudancaEtapaDialog.etapasMovidas} etapas</strong> de "{mudancaEtapaDialog.colunaOrigem?.nome}" para "{mudancaEtapaDialog.colunaDestino?.nome}".</>
              )}
            </p>
            <div>
              <Label className="text-sm font-medium">Justificativa {mudancaEtapaDialog.direcao === 'retrocesso' ? '(obrigatória)' : '(opcional)'}</Label>
              <Textarea placeholder={mudancaEtapaDialog.direcao === 'retrocesso' ? 'Explique o motivo do retrocesso...' : 'Explique o motivo de pular etapas...'} value={justificativaMudanca} onChange={(e) => setJustificativaMudanca(e.target.value)} className="mt-2 min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMudancaEtapaDialog(prev => ({ ...prev, open: false })); setJustificativaMudanca(''); }}>Cancelar</Button>
            <Button onClick={() => { if (mudancaEtapaDialog.colunaDestino && mudancaEtapaDialog.colunaOrigem) { executarMudancaEtapa(mudancaEtapaDialog.colunaDestino, mudancaEtapaDialog.colunaOrigem, justificativaMudanca || undefined); } setMudancaEtapaDialog(prev => ({ ...prev, open: false })); setJustificativaMudanca(''); }} disabled={mudancaEtapaDialog.direcao === 'retrocesso' && !justificativaMudanca.trim()} className={mudancaEtapaDialog.direcao === 'retrocesso' ? 'bg-warning hover:bg-warning/90' : ''}>
              {mudancaEtapaDialog.direcao === 'retrocesso' ? 'Retroceder' : 'Avançar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {deleteName}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Nova Atividade */}
      <Dialog open={atividadeDialogOpen} onOpenChange={setAtividadeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const tipoAtual = TIPOS_ATIVIDADE.find(t => t.id === novaAtividade.tipo);
                const IconComponent = tipoAtual?.icon || FileText;
                return (
                  <>
                    <IconComponent className="h-5 w-5" />
                    Nova {tipoAtual?.label || 'Atividade'}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Tipo de Atividade */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo</Label>
              <Select value={novaAtividade.tipo} onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ATIVIDADE.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <div className="flex items-center gap-2">
                        <tipo.icon className="h-4 w-4" />
                        {tipo.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Descrição</Label>
              <Textarea
                placeholder="O que foi feito e qual o próximo passo?"
                value={novaAtividade.descricao}
                onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={novaAtividade.prazo}
                  onChange={(e) => setNovaAtividade(prev => ({ ...prev, prazo: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Horário</Label>
                <Input
                  type="time"
                  value={novaAtividade.horario}
                  onChange={(e) => setNovaAtividade(prev => ({ ...prev, horario: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAtividadeDialogOpen(false);
                setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddAtividade}
              className="bg-primary"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup de Atividade */}
      <AtividadePopup
        open={atividadePopupOpen}
        onOpenChange={setAtividadePopupOpen}
        atividade={selectedAtividade}
        onMarkComplete={(atividadeId) => {
          handleUpdateAtividadeStatus(atividadeId, 'concluida');
        }}
      />

      {/* Dialog de Transferência de Card */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Card</DialogTitle>
            <DialogDescription>
              Selecione o funil e a coluna de destino para transferir este card com todo o histórico.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funil de Destino</Label>
              <Select value={transferFunil} onValueChange={handleFunilChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospeccao">Prospecção (SDR)</SelectItem>
                  <SelectItem value="closer">Closer</SelectItem>
                  <SelectItem value="pos_venda">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {transferFunil && (
              <div className="space-y-2">
                <Label>Coluna de Destino</Label>
                <Select value={transferColuna} onValueChange={setTransferColuna}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferColunas.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {viewingCard && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{viewingCard.titulo}</p>
                {viewingCard.cliente_nome && <p className="text-muted-foreground">{viewingCard.cliente_nome}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setTransferDialogOpen(false);
                setTransferFunil('');
                setTransferColuna('');
                setTransferColunas([]);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleTransferCard}
              disabled={!transferFunil || !transferColuna || loadingTransfer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loadingTransfer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
