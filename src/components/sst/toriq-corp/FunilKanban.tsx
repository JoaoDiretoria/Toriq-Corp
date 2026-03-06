import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useHierarquia } from '@/hooks/useHierarquia';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, DollarSign, Calendar, User, GripVertical, MoreHorizontal, ArrowLeft, Building2, FileText, MoreVertical, Clock, Phone, Mail, Video, MapPin, CheckCircle2, ArrowRightLeft, ArrowRight, Tag, Pencil, X, Loader2, MessageSquare, ListChecks, Search, Forward, Copy, Trophy, XCircle, Settings, Eye, EyeOff, Calculator, Save, Download, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Table2, Image, Link2, AlertTriangle, LayoutGrid, RotateCcw, Kanban, Car, Upload, ExternalLink, ArrowUpDown, Check, Lock, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CalculadoraTreinamentoNormativo } from '@/components/admin/CalculadoraTreinamentoNormativo';
import { CalculadoraVertical365 } from '@/components/admin/CalculadoraVertical365';
import { CalculadoraServicosSST } from '@/components/admin/CalculadoraServicosSST';
import { GeradorProposta } from '@/components/admin/GeradorProposta';
import { PropostaComercialEditor } from '@/components/admin/PropostaComercialEditor';
import { PropostaComercialServicosSSTEditor } from '@/components/admin/PropostaComercialServicosSSTEditor';
import { PropostaComercialVertical365Editor } from '@/components/admin/PropostaComercialVertical365Editor';
import { PropostasComerciais } from './PropostasComerciais';
import { FunilConfigDialog } from './configuracoes/FunilConfigDialog';
import { FunilFilters, useFunilFilters } from './FunilFilters';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ClienteSelectorModal } from './ClienteSelectorModal';
import { ResponsavelSelectorModal } from './ResponsavelSelectorModal';
import { AtividadeDetalheModal } from './AtividadeDetalheModal';

interface FunilKanbanProps {
  funilId: string;
  onBack?: () => void;
  initialCardId?: string | null;
  onCardOpened?: () => void;
}

interface Funil {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'negocio' | 'fluxo_trabalho';
  setor?: { nome: string };
}

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  trancada?: boolean;
}

interface CardEtiqueta {
  id: string;
  nome: string;
  cor: string;
}

interface FunilCard {
  id: string;
  funil_id: string;
  etapa_id: string;
  titulo: string;
  descricao: string | null;
  valor: number;
  cliente_id: string | null;
  responsavel_id: string | null;
  data_previsao: string | null;
  data_conclusao?: string | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  ordem: number;
  cliente?: { nome: string } | null;
  responsavel?: { nome: string } | null;
  status_negocio?: 'perdido' | 'em_andamento' | 'aceito' | 'ganho' | null;
  acoes_rapidas_config?: Record<string, boolean> | null;
  etiquetas?: CardEtiqueta[];
  created_at?: string;
  status_atividade?: 'programada' | 'pendente' | 'atrasada' | null;
  proxima_atividade_data?: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  sigla?: string | null;
  cidade?: string | null;
  estado?: string | null;
  categoria_id?: string | null;
}

interface Atividade {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  horario: string | null;
  status: 'a_realizar' | 'programada' | 'pendente' | 'concluida';
  created_at: string;
  usuario_id: string | null;
  usuario?: { nome: string } | null;
  responsavel_id?: string | null;
}

interface Movimentacao {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  etapa_origem_id: string | null;
  etapa_destino_id: string | null;
  created_at: string;
  usuario_id: string | null;
  usuario?: { nome: string } | null;
}

interface Responsavel {
  id: string;
  nome: string;
}

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-blue-100 text-blue-700' },
  { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-primary/10 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-purple-100 text-purple-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-orange-100 text-orange-700' },
  { id: 'nota', label: 'Nota', icon: Pencil, cor: 'bg-yellow-100 text-yellow-700' },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, cor: 'bg-amber-100 text-amber-700' },
];

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
  empresa_id: string;
}

const CORES_ETIQUETA = [
  '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6', 
  '#3B82F6', '#06B6D4', '#10B981', '#84CC16', '#6B7280'
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-500' },
  { value: 'media', label: 'Média', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-destructive' },
];

// Interface para Equipamento do Kit
interface EquipamentoKit {
  equipamento_id: string;
  quantidade: number;
  equipamento?: {
    id: string;
    nome: string;
    codigo: string;
    categoria: string;
  };
}

// Interface para Kit de Equipamentos
interface KitEquipamento {
  id: string;
  nome: string;
  codigo: string;
  tipo_servico: string[];
  quantidade?: number;
  equipamentos?: EquipamentoKit[];
}

// Interface para Movimentação de Kit ou Equipamentos
interface MovimentacaoKit {
  id: string;
  numero_movimentacao: string;
  kit_id?: string;
  equipamentos_lista?: Array<{ equipamento_id: string; quantidade: number }>;
  tipo_servico?: string;
  status: string;
  quantidade?: number;
  funil_card_id: string | null;
  created_at?: string;
  kit?: KitEquipamento;
}

// Componente de Card Sortable
interface SortableCardProps {
  card: FunilCard;
  etapa: Etapa;
  funil: Funil;
  etapas: Etapa[];
  cardIndex?: number;
  onEdit: (etapaId: string, card: FunilCard) => void;
  onDelete: (card: FunilCard) => void;
  onMove: (card: FunilCard, novaEtapaId: string) => void;
  onViewDetails?: (card: FunilCard) => void;
  onAtribuirKit?: (card: FunilCard) => void;
  formatCurrency: (value: number) => string;
  getPrioridadeInfo: (prioridade: string) => { value: string; label: string; color: string };
  podeExcluir?: boolean;
  funilConfig?: {
    card_mostrar_valor?: boolean;
    card_mostrar_cliente?: boolean;
    card_mostrar_data?: boolean;
    card_mostrar_responsavel?: boolean;
    card_mostrar_etiquetas?: boolean;
    card_interno_acoes_rapidas?: string[];
  } | null;
}

function SortableCard({ card, etapa, funil, etapas, cardIndex, onEdit, onDelete, onMove, onViewDetails, onAtribuirKit, formatCurrency, getPrioridadeInfo, podeExcluir = true, funilConfig }: SortableCardProps) {
  // Verificar se uma ação rápida está habilitada
  const acaoHabilitada = (acaoId: string): boolean => {
    if (!funilConfig?.card_interno_acoes_rapidas) return true; // Se não configurado, todas habilitadas
    return funilConfig.card_interno_acoes_rapidas.includes(acaoId);
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    data: { type: 'card', card, etapaId: etapa.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  // Cor da prioridade para indicador lateral
  const getPrioridadeColor = () => {
    switch (card.prioridade) {
      case 'urgente': return 'hsl(var(--destructive))';
      case 'alta': return '#f97316';
      case 'media': return '#3b82f6';
      case 'baixa': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group border-border hover:border-primary/50 cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-lg ring-2 ring-primary z-50' : ''}`}
    >
      {/* Indicador de prioridade na lateral */}
      <div 
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        style={{ backgroundColor: getPrioridadeColor() }}
      />
      
      <div className="flex items-start justify-between gap-2 pl-2">
        {/* Grip visual - apenas indicador */}
        <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>
        
        {/* Conteúdo principal do card */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onViewDetails?.(card); }}
        >
          {/* Título com índice */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">
              {cardIndex !== undefined ? `#${cardIndex + 1} - ` : ''}{card.titulo}
            </h4>
          </div>
          
          {/* Cliente */}
          {card.cliente && (funilConfig?.card_mostrar_cliente !== false) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{card.cliente.nome}</span>
            </div>
          )}

          {/* Badges de informações */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Badge de prioridade */}
            <Badge className={`text-2xs ${
              card.prioridade === 'urgente' ? 'bg-destructive/15 text-destructive border-destructive/30' :
              card.prioridade === 'alta' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
              card.prioridade === 'media' ? 'bg-blue-500/15 text-blue-500 border-blue-500/30' :
              'bg-gray-500/15 text-gray-500 border-gray-500/30'
            }`}>
              {getPrioridadeInfo(card.prioridade).label}
            </Badge>
            
            {/* Valor (se for funil de negócio e configurado para mostrar) */}
            {funil.tipo === 'negocio' && card.valor > 0 && (funilConfig?.card_mostrar_valor !== false) && (
              <Badge className="text-2xs bg-green-500/15 text-green-600 border-green-500/30">
                <DollarSign className="h-3 w-3 mr-0.5" />
                {formatCurrency(card.valor)}
              </Badge>
            )}
          </div>
          
          {/* Data de previsão com indicador de atraso */}
          {card.data_previsao && (funilConfig?.card_mostrar_data !== false) && (() => {
            const dataPrevisao = new Date(card.data_previsao);
            dataPrevisao.setHours(23, 59, 59, 999);
            const hoje = new Date();
            const estaAtrasado = dataPrevisao < hoje && !card.data_conclusao;
            const estaFinalizado = !!card.data_conclusao;
            
            return (
              <div className={`flex items-center gap-1 text-xs mt-2 ${
                estaFinalizado ? 'text-green-600' :
                estaAtrasado ? 'text-red-500 font-medium' : 
                'text-muted-foreground'
              }`}>
                {estaFinalizado ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : estaAtrasado ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                <span>
                  {new Date(card.data_previsao).toLocaleDateString('pt-BR')}
                  {estaFinalizado && ' (Finalizado)'}
                  {estaAtrasado && ' (Atrasado)'}
                </span>
              </div>
            );
          })()}
          
          {/* Responsável */}
          {card.responsavel && (funilConfig?.card_mostrar_responsavel !== false) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span className="truncate">{card.responsavel.nome}</span>
            </div>
          )}

          {/* Etiquetas */}
          {card.etiquetas && card.etiquetas.length > 0 && (funilConfig?.card_mostrar_etiquetas !== false) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.etiquetas.slice(0, 3).map((etiqueta) => (
                <span
                  key={etiqueta.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ 
                    backgroundColor: `${etiqueta.cor}20`,
                    color: etiqueta.cor,
                    border: `1px solid ${etiqueta.cor}40`
                  }}
                >
                  {etiqueta.nome}
                </span>
              ))}
              {card.etiquetas.length > 3 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                  +{card.etiquetas.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Status do Negócio - apenas para funis tipo negócio */}
          {funil.tipo === 'negocio' && (funilConfig as any)?.card_mostrar_status !== false && card.status_negocio && (
            <div className="mt-2">
              <span 
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${
                  card.status_negocio === 'perdido' ? 'bg-red-500' :
                  card.status_negocio === 'em_andamento' ? 'bg-orange-500' :
                  card.status_negocio === 'aceito' ? 'bg-green-500' :
                  card.status_negocio === 'ganho' ? 'bg-amber-600' :
                  'bg-gray-500'
                }`}
              >
                {card.status_negocio === 'perdido' ? 'Perdido' :
                 card.status_negocio === 'em_andamento' ? 'Em andamento' :
                 card.status_negocio === 'aceito' ? 'Aceito' :
                 card.status_negocio === 'ganho' ? 'Ganho' : card.status_negocio}
              </span>
            </div>
          )}

          {/* Status de Atividade - mostra a data e indica atraso por cor */}
          {(funilConfig as any)?.card_mostrar_status_atividade !== false && card.status_atividade && (
            <div className="mt-2">
              <span 
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  card.status_atividade === 'atrasada' ? 'bg-red-500 text-white' :
                  card.status_atividade === 'programada' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                  'bg-gray-100 text-gray-700'
                }`}
              >
                <Calendar className="h-3 w-3 mr-1" />
                {card.proxima_atividade_data 
                  ? new Date(card.proxima_atividade_data).toLocaleDateString('pt-BR')
                  : 'Sem data'}
              </span>
            </div>
          )}
        </div>
        
        {/* Menu de ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            {onViewDetails && (
              <DropdownMenuItem onClick={() => onViewDetails(card)}>
                <FileText className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
            )}
            {acaoHabilitada('editar') && (
              <DropdownMenuItem onClick={() => onEdit(etapa.id, card)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {acaoHabilitada('mover') && (
              <>
                <DropdownMenuSeparator />
                {etapas.filter(e => e.id !== etapa.id).map(e => (
                  <DropdownMenuItem 
                    key={e.id}
                    onClick={() => onMove(card, e.id)}
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-2" 
                      style={{ backgroundColor: e.cor }}
                    />
                    Mover para {e.nome}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {acaoHabilitada('atribuir_kit') && onAtribuirKit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAtribuirKit(card)}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Atribuir Kit Equipamentos
                </DropdownMenuItem>
              </>
            )}
            {acaoHabilitada('excluir') && podeExcluir && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(card)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Componente de Coluna Sortable
interface SortableColumnProps {
  etapa: Etapa;
  cards: FunilCard[];
  funil: Funil;
  etapas: Etapa[];
  totalValor: number;
  onAddCard: (etapaId: string) => void;
  onEditCard: (etapaId: string, card: FunilCard) => void;
  onDeleteCard: (card: FunilCard) => void;
  onMoveCard: (card: FunilCard, novaEtapaId: string) => void;
  onViewDetails: (card: FunilCard) => void;
  onAtribuirKit?: (card: FunilCard) => void;
  formatCurrency: (value: number) => string;
  getPrioridadeInfo: (prioridade: string) => { value: string; label: string; color: string };
  podeExcluir?: boolean;
  funilConfig?: {
    card_mostrar_valor?: boolean;
    card_mostrar_cliente?: boolean;
    card_mostrar_data?: boolean;
    card_mostrar_responsavel?: boolean;
    card_mostrar_etiquetas?: boolean;
    card_interno_acoes_rapidas?: string[];
    botao_adicionar_visivel?: boolean;
    botao_adicionar_texto?: string;
  } | null;
}

function SortableColumn({ 
  etapa, 
  cards, 
  funil, 
  etapas, 
  totalValor, 
  onAddCard, 
  onEditCard, 
  onDeleteCard, 
  onMoveCard,
  onViewDetails,
  onAtribuirKit,
  formatCurrency,
  getPrioridadeInfo,
  podeExcluir = true,
  funilConfig
}: SortableColumnProps) {
  const CARDS_PER_PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `column-${etapa.id}`,
    data: { type: 'column', etapa }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Reset visibleCount when cards change (filter, new card, etc.)
  useEffect(() => {
    setVisibleCount(CARDS_PER_PAGE);
  }, [cards.length]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (visibleCount >= cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + CARDS_PER_PAGE, cards.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, cards.length]);

  const cardIds = cards.map(c => c.id);
  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = visibleCount < cards.length;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-80 bg-card/50 rounded-xl border border-border flex flex-col max-h-full transition-all ${isDragging ? 'ring-2 ring-primary/50 border-primary/50 z-50 shadow-xl' : ''}`}
    >
      {/* Header da Coluna - arrastável */}
      <div 
        className="p-4 rounded-t-xl cursor-grab active:cursor-grabbing border-b border-border/50"
        style={{ borderTop: `3px solid ${etapa.cor}` }}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: etapa.cor }}
            />
            <h3 className="font-semibold text-sm truncate">{etapa.nome}</h3>
            {etapa.trancada && <Lock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
            <Badge variant="secondary" className="text-xs flex-shrink-0 bg-muted/50">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Total da Coluna */}
      {funil.tipo === 'negocio' && totalValor > 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-b">
          Total: <span className="font-medium text-green-600">{formatCurrency(totalValor)}</span>
        </div>
      )}

      {/* Cards - área de drop */}
      <div className="flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors scrollbar-thin">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {visibleCards.map((card, index) => (
            <SortableCard
              key={card.id}
              card={card}
              etapa={etapa}
              funil={funil}
              etapas={etapas}
              cardIndex={index}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onMove={onMoveCard}
              onViewDetails={onViewDetails}
              onAtribuirKit={onAtribuirKit}
              formatCurrency={formatCurrency}
              getPrioridadeInfo={getPrioridadeInfo}
              podeExcluir={podeExcluir}
              funilConfig={funilConfig}
            />
          ))}
        </SortableContext>

        {/* Sentinel para infinite scroll */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {visibleCount} de {cards.length} cards...
            </span>
          </div>
        )}

        {cards.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum card nesta etapa
          </div>
        )}
      </div>
    </div>
  );
}

export function FunilKanban({ funilId, onBack, initialCardId, onCardOpened }: FunilKanbanProps) {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [funil, setFunil] = useState<Funil | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [cards, setCards] = useState<FunilCard[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<FunilCard | null>(null);
  const [originalEtapaId, setOriginalEtapaId] = useState<string | null>(null);
  
  // Hook de filtros do funil
  const funilFilters = useFunilFilters();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Modal de criação/edição de card
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FunilCard | null>(null);
  const [selectedEtapaId, setSelectedEtapaId] = useState<string>('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor: '',
    cliente_id: '',
    data_previsao: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    responsavel_id: ''
  });

  // Modal de detalhes do card
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<FunilCard | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [novaAtividade, setNovaAtividade] = useState({
    tipo: 'tarefa',
    descricao: '',
    prazo: '',
    horario: '',
    responsavel_id: ''
  });
  const [atividadeAnexo, setAtividadeAnexo] = useState<File | null>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [novoChecklistItem, setNovoChecklistItem] = useState('');
  
  // Etiquetas
  const [etiquetasDialogOpen, setEtiquetasDialogOpen] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [cardEtiquetas, setCardEtiquetas] = useState<string[]>([]);
  const [loadingEtiquetas, setLoadingEtiquetas] = useState(false);
  const [etiquetaSearch, setEtiquetaSearch] = useState('');
  const [novaEtiqueta, setNovaEtiqueta] = useState({ nome: '', cor: CORES_ETIQUETA[0] });
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [editandoEtiqueta, setEditandoEtiqueta] = useState<{ id: string; nome: string; cor: string } | null>(null);
  
  // Edição de Responsável
  const [editandoResponsavel, setEditandoResponsavel] = useState(false);
  
  // Edição de Categoria do Cliente
  const [editandoCategoria, setEditandoCategoria] = useState(false);
  
  // Edição de Data de Previsão
  const [editandoDataPrevisao, setEditandoDataPrevisao] = useState(false);
  const [categoriasCliente, setCategoriasCliente] = useState<{id: string; nome: string; cor: string}[]>([]);
  
  // Confirmação de mover para etapa trancada
  const [pendingLockedMove, setPendingLockedMove] = useState<{
    card: FunilCard;
    targetEtapaId: string;
    targetEtapaNome: string;
    source: 'drag' | 'details';
  } | null>(null);

  // Dialog de Configuração do Funil
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // Modo de visualização (kanban ou lista)
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'lista'>('kanban');
  
  // Configurações do Funil (carregadas do banco)
  const [funilConfig, setFunilConfig] = useState<{
    titulo_pagina?: string;
    descricao_pagina?: string;
    modo_visualizacao?: 'kanban' | 'lista';
    dashboard_visivel?: boolean;
    dashboard_metricas?: string[];
    botao_adicionar_visivel?: boolean;
    botao_adicionar_texto?: string;
    card_mostrar_valor?: boolean;
    card_mostrar_cliente?: boolean;
    card_mostrar_data?: boolean;
    card_mostrar_responsavel?: boolean;
    card_mostrar_etiquetas?: boolean;
    card_interno_atividades_tipos?: string[];
    card_interno_acoes_rapidas?: string[];
    card_interno_mostrar_historico?: boolean;
    card_interno_mostrar_movimentacoes?: boolean;
    formulario_campos?: any[];
  } | null>(null);
  
  // Configuração de Ações Rápidas
  const [configAcoesOpen, setConfigAcoesOpen] = useState(false);
  const ACOES_RAPIDAS_DISPONIVEIS = [
    { id: 'editar_card', label: 'Editar Card', icon: Pencil },
    { id: 'mover_card', label: 'Mover Card', icon: ArrowRightLeft },
    { id: 'excluir_card', label: 'Excluir Card', icon: Trash2 },
    { id: 'nova_atividade', label: 'Nova Atividade', icon: Plus },
    { id: 'etiquetas', label: 'Gerenciar Etiquetas', icon: Tag },
    { id: 'encaminhar_card', label: 'Encaminhar Card', icon: Forward },
    { id: 'enviar_email', label: 'Enviar E-mail', icon: Mail },
    { id: 'atribuir_kit', label: 'Atribuir Kit Equipamentos', icon: LayoutGrid },
    { id: 'atribuir_veiculo', label: 'Atribuir Movimentação de Veículo', icon: Car },
    { id: 'finalizar_card', label: 'Finalizar Card', icon: CheckCircle2 },
    { id: 'elaborar_orcamento', label: 'Elaborar Orçamento', icon: FileText, apenasNegocio: true },
    { id: 'ver_propostas', label: 'Propostas', icon: FileText, apenasNegocio: true },
  ];
  
  // Criar Etapa
  const [criarEtapaDialogOpen, setCriarEtapaDialogOpen] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaCor, setNovaEtapaCor] = useState('#6366f1');
  const [criandoEtapa, setCriandoEtapa] = useState(false);

  // Nova Atividade Dialog
  const [novaAtividadeDialogOpen, setNovaAtividadeDialogOpen] = useState(false);
  const [tipoAtividadeSelecionado, setTipoAtividadeSelecionado] = useState<string | null>(null);
  
  // Detalhe da Atividade Dialog
  const [atividadeDetalheOpen, setAtividadeDetalheOpen] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);
  const [atividadeEditModeInicial, setAtividadeEditModeInicial] = useState(false);

  // Encaminhar Card
  const [encaminharDialogOpen, setEncaminharDialogOpen] = useState(false);
  const [funisCadastrados, setFunisCadastrados] = useState<any[]>([]);
  const [etapasDestino, setEtapasDestino] = useState<any[]>([]);
  const [encaminharForm, setEncaminharForm] = useState({
    funilDestinoId: '',
    etapaDestinoId: '',
    acao: 'transferir' as 'transferir' | 'duplicar'
  });
  const [loadingEncaminhar, setLoadingEncaminhar] = useState(false);
  
  // Elaborar Orçamento
  const [orcamentoDialogOpen, setOrcamentoDialogOpen] = useState(false);
  
  // Configurações de calculadoras carregadas do banco
  const [configCalculadoras, setConfigCalculadoras] = useState({
    treinamento_normativo: true,
    servicos_sst: true,
    vertical_365: true,
    comparacao_vertical_treinamentos: true,
  });
  
  // Atribuir Kit Equipamentos
  const [atribuirKitDialogOpen, setAtribuirKitDialogOpen] = useState(false);
  const [kitsComDemanda, setKitsComDemanda] = useState<MovimentacaoKit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [cardParaAtribuirKit, setCardParaAtribuirKit] = useState<FunilCard | null>(null);
  const [buscaMovimentacaoId, setBuscaMovimentacaoId] = useState('');
  const [movimentacaoKitDoCard, setMovimentacaoKitDoCard] = useState<MovimentacaoKit | null>(null);
  const [loadingMovimentacaoKit, setLoadingMovimentacaoKit] = useState(false);
  const [confirmarRetornoKitDialogOpen, setConfirmarRetornoKitDialogOpen] = useState(false);
  
  // Atribuir Movimentação de Veículo
  const [atribuirVeiculoDialogOpen, setAtribuirVeiculoDialogOpen] = useState(false);
  const [movimentacoesVeiculo, setMovimentacoesVeiculo] = useState<any[]>([]);
  const [loadingMovimentacoesVeiculo, setLoadingMovimentacoesVeiculo] = useState(false);
  const [cardParaAtribuirVeiculo, setCardParaAtribuirVeiculo] = useState<FunilCard | null>(null);
  const [movimentacaoVeiculoDoCard, setMovimentacaoVeiculoDoCard] = useState<any | null>(null);
  
  // Gerar Proposta
  const [propostaDialogOpen, setPropostaDialogOpen] = useState(false);
  const [propostasDialogOpen, setPropostasDialogOpen] = useState(false);
  const [propostasSearchFilter, setPropostasSearchFilter] = useState('');
  const [orcamentoView, setOrcamentoView] = useState<'menu' | 'calculadora-treinamento' | 'calculadora-servicos-sst' | 'calculadora-vertical365' | 'comparacao-vertical365' | 'proposta-comercial' | 'proposta-comercial-servicos-sst' | 'proposta-comercial-vertical365'>('menu');
  // Mapa de orçamentos salvos por card ID
  const [orcamentosPorCard, setOrcamentosPorCard] = useState<Record<string, {
    empresa?: string;
    cidadeDestino?: string;
    estadoOrigem?: string;
    cidadeOrigem?: string;
    km?: number;
    tabelaPrecos?: Array<{
      ch: string;
      horaAula: number;
      bronze: number;
      prata: number;
      ouro: number;
    }>;
    config?: any;
  }>>({});
  
  // Orçamento do card atual (do cache local ou do card carregado)
  const orcamentoTreinamentoSalvo = viewingCard?.id 
    ? orcamentosPorCard[viewingCard.id] || (viewingCard as any)?.orcamento_treinamento || null 
    : null;
  
  const setOrcamentoTreinamentoSalvo = async (dados: typeof orcamentoTreinamentoSalvo) => {
    if (viewingCard?.id && dados) {
      // Atualizar cache local
      setOrcamentosPorCard(prev => ({
        ...prev,
        [viewingCard.id]: dados
      }));
      
      // Salvar no Supabase
      try {
        const { error } = await (supabase as any)
          .from('funil_cards')
          .update({ orcamento_treinamento: dados })
          .eq('id', viewingCard.id);
        
        if (error) {
          console.error('Erro ao salvar orçamento no Supabase:', error);
        }
      } catch (err) {
        console.error('Erro ao salvar orçamento:', err);
      }
    }
  };

  // Mapa de orçamentos Vertical 365 salvos por card ID
  const [orcamentosVertical365PorCard, setOrcamentosVertical365PorCard] = useState<Record<string, any>>({});
  
  // Mapa de orçamentos Serviços SST salvos por card ID
  const [orcamentosServicosSSTporCard, setOrcamentosServicosSSTporCard] = useState<Record<string, any>>({});
  
  // Estados para campos editáveis da comparação Vertical 365 x Treinamentos Avulsos
  const [campo1Treinamento, setCampo1Treinamento] = useState(''); // Valor médio de treinamento (R$)
  const [campo2Turmas, setCampo2Turmas] = useState(''); // Quantidade de turmas
  const [campo4SistemaGestao, setCampo4SistemaGestao] = useState(''); // Sistema de Gestão (Mensal)
  const [campo5Implantacao, setCampo5Implantacao] = useState(''); // Implantação do Sistema
  
  // Estados para rótulos editáveis - Plano Vertical 365
  const [labelTreinamentosInclusos, setLabelTreinamentosInclusos] = useState('Valor do Treinamento por turma');
  const [labelSistemaGestaoAnual, setLabelSistemaGestaoAnual] = useState('Quantidade de turma');
  const [labelImplantacao, setLabelImplantacao] = useState('Valor total das turmas de treinamento');
  const [labelTotalAnual, setLabelTotalAnual] = useState('Sistema de Gestão de Treinamentos anual');
  const [labelValorMensal, setLabelValorMensal] = useState('Implantação do sistema');
  const [labelCampoNumerico, setLabelCampoNumerico] = useState('Total Anual');
  const [valorCampoNumerico, setValorCampoNumerico] = useState('');
  const [labelCampoValor, setLabelCampoValor] = useState('Valor Mensal');
  const [valorCampoValor, setValorCampoValor] = useState('');
  
  // Estados para rótulos editáveis - Treinamentos Avulsos
  const [labelValorMedio, setLabelValorMedio] = useState('Valor médio de treinamento com C.H 8 horas por turma');
  const [labelQuantidadeTurmas, setLabelQuantidadeTurmas] = useState('Quantidade de turmas');
  const [labelValorTotalTurmas, setLabelValorTotalTurmas] = useState('Valor total das turmas de treinamento');
  const [labelSistemaGestaoMensal, setLabelSistemaGestaoMensal] = useState('Sistema de Gestão de Treinamentos (Mensal)');
  const [labelSistemaGestaoAnualAvulso, setLabelSistemaGestaoAnualAvulso] = useState('Valor total do sistema de gestão em 1 ano');
  const [labelImplantacaoAvulso, setLabelImplantacaoAvulso] = useState('Impantação do Sistema (Valor único)');
  const [labelValorTotalInvestido, setLabelValorTotalInvestido] = useState('Valor total investido durante o ano, de acordo com a necessidade do cliente');
  
  // Estados para seção de Pontos Fortes e Pontos a Desejar
  const [labelPontosFortes, setLabelPontosFortes] = useState('Pontos fortes do Vertical 365');
  const [textoPontosFortes, setTextoPontosFortes] = useState('');
  const [labelPontosDesejar, setLabelPontosDesejar] = useState('Pontos a desejar do método convencional');
  const [textoPontosDesejar, setTextoPontosDesejar] = useState('');
  
  // Estados para controlar modo de edição
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
  // Referência para o conteúdo da comparação (para PDF)
  const comparacaoRef = useRef<HTMLDivElement>(null);
  
  // Estado para salvar comparação por card
  const [comparacoesSalvasPorCard, setComparacoesSalvasPorCard] = useState<Record<string, {
    // Vertical 365
    valorCampoNumerico: string;
    labelTreinamentosInclusos: string;
    labelSistemaGestaoAnual: string;
    labelImplantacao: string;
    labelTotalAnual: string;
    labelValorMensal: string;
    labelCampoNumerico: string;
    labelCampoValor: string;
    // Treinamentos Avulsos
    campo1Treinamento: string;
    campo2Turmas: string;
    campo4SistemaGestao: string;
    campo5Implantacao: string;
    labelValorMedio: string;
    labelQuantidadeTurmas: string;
    labelValorTotalTurmas: string;
    labelSistemaGestaoMensal: string;
    labelSistemaGestaoAnualAvulso: string;
    labelImplantacaoAvulso: string;
    labelValorTotalInvestido: string;
    // Pontos Fortes e Pontos a Desejar
    labelPontosFortes: string;
    textoPontosFortes: string;
    labelPontosDesejar: string;
    textoPontosDesejar: string;
  }>>({});
  
  // Estado de loading para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  
  // Mapa de orçamentos do cliente (popup "Orçamento para o Cliente") salvos por card ID
  const [orcamentosClientePorCard, setOrcamentosClientePorCard] = useState<Record<string, {
    empresa?: string;
    cidadeDestino?: string;
    estadoOrigem?: string;
    cidadeOrigem?: string;
    km?: number;
    itensPorPlano?: any;
    totais?: {
      ouro: number;
      prata: number;
      bronze: number;
    };
  }>>({});
  
  // Orçamento do cliente do card atual
  const orcamentoClienteSalvo = viewingCard?.id 
    ? orcamentosClientePorCard[viewingCard.id] || null 
    : null;

  // Função para carregar orçamento do cliente do banco de dados
  const carregarOrcamentoClienteDoBanco = async (cardId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_card_orcamentos')
        .select('*')
        .eq('card_id', cardId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // Atualizar o estado com os dados carregados
        setOrcamentosClientePorCard(prev => ({
          ...prev,
          [cardId]: {
            empresa: data.cliente_nome,
            cidadeDestino: data.cidade_destino,
            estadoOrigem: data.config?.estadoOrigem,
            cidadeOrigem: data.config?.cidadeOrigem,
            km: data.km,
            itensPorPlano: {
              OURO: data.itens_ouro || [],
              PRATA: data.itens_prata || [],
              BRONZE: data.itens_bronze || []
            },
            totais: {
              ouro: data.total_ouro || 0,
              prata: data.total_prata || 0,
              bronze: data.total_bronze || 0,
            },
          }
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar orçamento do cliente:', err);
    }
  };

  // Carregar orçamento do cliente quando o card for visualizado
  useEffect(() => {
    if (viewingCard?.id && !orcamentosClientePorCard[viewingCard.id]) {
      carregarOrcamentoClienteDoBanco(viewingCard.id);
    }
  }, [viewingCard?.id]);
  
  // Plano selecionado para o orçamento (bronze, prata, ouro)
  const [planoSelecionadoOrcamento, setPlanoSelecionadoOrcamento] = useState<'bronze' | 'prata' | 'ouro'>('ouro');
  
  // Calculadora selecionada no menu (para destacar e mostrar resultado)
  const [calculadoraSelecionada, setCalculadoraSelecionada] = useState<'treinamento' | 'mensal' | 'vertical365' | null>(null);
  
  // Orçamento Vertical 365 do card atual
  const orcamentoVertical365Salvo = viewingCard?.id 
    ? orcamentosVertical365PorCard[viewingCard.id] || (viewingCard as any)?.orcamento_vertical365 || null 
    : null;
  
  const setOrcamentoVertical365Salvo = async (dados: any) => {
    if (viewingCard?.id && dados) {
      // Atualizar cache local
      setOrcamentosVertical365PorCard(prev => ({
        ...prev,
        [viewingCard.id]: dados
      }));
      
      // Salvar no Supabase
      try {
        const { error } = await (supabase as any)
          .from('funil_cards')
          .update({ orcamento_vertical365: dados })
          .eq('id', viewingCard.id);
        
        if (error) {
          console.error('Erro ao salvar orçamento Vertical 365 no Supabase:', error);
          toast({ title: 'Erro', description: 'Não foi possível salvar o orçamento.', variant: 'destructive' });
        } else {
          toast({ title: 'Orçamento Vertical 365 salvo', description: 'Os valores foram salvos com sucesso!' });
        }
      } catch (err) {
        console.error('Erro ao salvar orçamento Vertical 365:', err);
        toast({ title: 'Erro', description: 'Não foi possível salvar o orçamento.', variant: 'destructive' });
      }
    }
  };
  
  // Orçamento Serviços SST do card atual
  const orcamentoServicosSSTSalvo = viewingCard?.id 
    ? orcamentosServicosSSTporCard[viewingCard.id] || (viewingCard as any)?.orcamento_servicos_sst || null 
    : null;
  
  const setOrcamentoServicosSSTSalvo = async (dados: any) => {
    if (viewingCard?.id && dados) {
      // Atualizar cache local
      setOrcamentosServicosSSTporCard(prev => ({
        ...prev,
        [viewingCard.id]: dados
      }));
      
      // Salvar no Supabase
      try {
        const { error } = await (supabase as any)
          .from('funil_cards')
          .update({ orcamento_servicos_sst: dados })
          .eq('id', viewingCard.id);
        
        if (error) {
          console.error('Erro ao salvar orçamento Serviços SST no Supabase:', error);
          toast({ title: 'Erro', description: 'Não foi possível salvar o orçamento.', variant: 'destructive' });
        } else {
          toast({ title: 'Orçamento salvo', description: 'Os valores foram salvos com sucesso!' });
        }
      } catch (err) {
        console.error('Erro ao salvar orçamento Serviços SST:', err);
        toast({ title: 'Erro', description: 'Não foi possível salvar o orçamento.', variant: 'destructive' });
      }
    }
  };
  
  // Função para calcular o valor do negócio baseado na calculadora selecionada
  const getValorNegocioCalculado = (): number => {
    // 1.1 - Calculadora para Treinamento Normativo - valor do plano selecionado
    if (calculadoraSelecionada === 'treinamento') {
      // Prioridade: usar totais do orçamento do cliente (valores corretos calculados)
      if (orcamentoClienteSalvo?.totais) {
        const valorTotal = orcamentoClienteSalvo.totais[planoSelecionadoOrcamento];
        if (valorTotal && valorTotal > 0) return valorTotal;
      }
      // Fallback: tabela de preços bruta (apenas se não houver orçamento do cliente)
      if (orcamentoTreinamentoSalvo?.tabelaPrecos) {
        const primeiraLinha = orcamentoTreinamentoSalvo.tabelaPrecos[0];
        if (primeiraLinha) {
          return primeiraLinha[planoSelecionadoOrcamento] || 0;
        }
      }
    }
    
    // 1.2 - Calculadora para Serviços de SST - Preço Final
    if (calculadoraSelecionada === 'mensal' && orcamentoServicosSSTSalvo?.totais) {
      return orcamentoServicosSSTSalvo.totais.precoTotal || 0;
    }
    
    // 1.3 - Calculadora Vertical 365 - Plano Vertical 365 (mensal)
    if (calculadoraSelecionada === 'vertical365' && orcamentoVertical365Salvo?.totais) {
      return orcamentoVertical365Salvo.totais.planoVertical365 || 0;
    }
    
    // Fallback: valor original do card
    return viewingCard?.valor || 0;
  };
  
  // Atualizar valor do card quando a calculadora selecionada muda
  useEffect(() => {
    const atualizarValorCard = async () => {
      if (!viewingCard?.id || !calculadoraSelecionada) return;
      
      const novoValor = getValorNegocioCalculado();
      if (novoValor > 0 && novoValor !== viewingCard.valor) {
        try {
          await (supabase as any)
            .from('funil_cards')
            .update({ valor: novoValor })
            .eq('id', viewingCard.id);
          
          // Atualizar estado local
          setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, valor: novoValor } : c));
          setViewingCard(prev => prev ? { ...prev, valor: novoValor } : prev);
        } catch (err) {
          console.error('Erro ao atualizar valor do card:', err);
        }
      }
    };
    
    atualizarValorCard();
  }, [calculadoraSelecionada, planoSelecionadoOrcamento, orcamentoClienteSalvo, orcamentoTreinamentoSalvo, orcamentoServicosSSTSalvo, orcamentoVertical365Salvo]);
  
  // Status do Negócio (para funis tipo negócio)
  const STATUS_NEGOCIO = [
    { id: 'perdido', label: 'Perdido', color: 'bg-destructive hover:bg-red-600 text-white', icon: 'DollarSign' },
    { id: 'em_andamento', label: 'Em andamento', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: 'Clock' },
    { id: 'aceito', label: 'Aceito', color: 'bg-green-500 hover:bg-green-600 text-white', icon: 'DollarSign' },
    { id: 'ganho', label: 'Ganho', color: 'bg-amber-600 hover:bg-amber-700 text-white', icon: 'Trophy' },
  ];
  
  const { profile } = useAuth();
  const { isAdministrador, isGestor, usuariosVisiveis, loading: hierarquiaLoading } = useHierarquia();
  
  // Estado para modal de confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<FunilCard | null>(null);

  useEffect(() => {
    if (funilId) {
      loadFunil();
      loadEtapas();
      loadClientes();
      loadResponsaveis();
    }
  }, [funilId]);

  // Carregar cards quando hierarquia estiver pronta (para aplicar filtro corretamente)
  useEffect(() => {
    if (funilId && !hierarquiaLoading) {
      loadCards();
    }
  }, [funilId, hierarquiaLoading, usuariosVisiveis]);

  // Realtime subscription para atualizar cards quando modificados por automações
  useEffect(() => {
    if (!funilId) return;

    const channel = supabase
      .channel(`funil_cards_${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'funil_cards',
          filter: `funil_id=eq.${funilId}`
        },
        (payload) => {
          console.log('[Realtime] Card atualizado:', payload);
          // Recarregar cards quando houver mudanças
          loadCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [funilId]);

  // Carregar configurações de calculadoras do banco
  // Empresa especial que vê todas as calculadoras: 277f98dc-846e-4772-906e-71b21a5536f7
  const EMPRESA_TODAS_CALCULADORAS = '277f98dc-846e-4772-906e-71b21a5536f7';
  
  useEffect(() => {
    const loadConfigCalculadoras = async () => {
      if (!empresaId) return;
      
      // Se NÃO for a empresa especial, mostrar apenas Calculadora para Serviços de SST
      if (empresaId !== EMPRESA_TODAS_CALCULADORAS) {
        setConfigCalculadoras({
          treinamento_normativo: false,
          servicos_sst: true,
          vertical_365: false,
          comparacao_vertical_treinamentos: false,
        });
        return;
      }
      
      // Para a empresa especial, carregar configurações do banco ou usar todas ativas
      try {
        const { data, error } = await (supabase as any)
          .from('funil_negocio_configuracoes')
          .select('calc_treinamento_normativo, calc_servicos_sst, calc_vertical_365, calc_comparacao_vertical_treinamentos')
          .eq('empresa_id', empresaId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar configurações de calculadoras:', error);
          // Para empresa especial, ativar todas por padrão
          setConfigCalculadoras({
            treinamento_normativo: true,
            servicos_sst: true,
            vertical_365: true,
            comparacao_vertical_treinamentos: true,
          });
          return;
        }
        
        if (data) {
          setConfigCalculadoras({
            treinamento_normativo: data.calc_treinamento_normativo ?? true,
            servicos_sst: data.calc_servicos_sst ?? true,
            vertical_365: data.calc_vertical_365 ?? true,
            comparacao_vertical_treinamentos: data.calc_comparacao_vertical_treinamentos ?? true,
          });
        } else {
          // Se não houver dados, ativar todas para empresa especial
          setConfigCalculadoras({
            treinamento_normativo: true,
            servicos_sst: true,
            vertical_365: true,
            comparacao_vertical_treinamentos: true,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de calculadoras:', err);
      }
    };
    
    loadConfigCalculadoras();
  }, [empresaId]);

  const loadFunil = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select(`
          *,
          setor:setores(nome)
        `)
        .eq('id', funilId)
        .single();

      if (error) throw error;
      setFunil(data);
      
      // Carregar configurações do funil (carga inicial)
      loadFunilConfig(true);
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
    }
  };

  // Carregar movimentações com status "demanda" (sem funil_card_id atribuído)
  // Inclui kits E equipamentos individuais
  const loadKitsComDemanda = async () => {
    if (!empresaId) return;
    setLoadingKits(true);
    try {
      const { data, error } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .select(`
          id,
          numero_movimentacao,
          kit_id,
          equipamentos_lista,
          tipo_servico,
          quantidade,
          status,
          funil_card_id,
          created_at,
          kit:equipamentos_kits(id, nome, codigo, tipo_servico)
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'demanda')
        .is('funil_card_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filtrar apenas movimentações que têm kit_id OU equipamentos_lista
      const movimentacoesValidas = (data || []).filter((m: any) => 
        m.kit_id || (m.equipamentos_lista && m.equipamentos_lista.length > 0)
      );
      setKitsComDemanda(movimentacoesValidas);
    } catch (error) {
      console.error('Erro ao carregar movimentações com demanda:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as movimentações.', variant: 'destructive' });
    } finally {
      setLoadingKits(false);
    }
  };

  // Abrir dialog de atribuição de kit
  const handleOpenAtribuirKit = (card: FunilCard) => {
    setCardParaAtribuirKit(card);
    loadKitsComDemanda();
    setAtribuirKitDialogOpen(true);
  };

  // Abrir dialog de atribuição de veículo
  const handleOpenAtribuirVeiculo = (card: FunilCard) => {
    setCardParaAtribuirVeiculo(card);
    loadMovimentacoesVeiculoDisponiveis();
    loadMovimentacaoVeiculoDoCard(card.id);
    setAtribuirVeiculoDialogOpen(true);
  };

  // Carregar movimentações de veículo disponíveis (sem card vinculado)
  const loadMovimentacoesVeiculoDisponiveis = async () => {
    if (!empresaId) return;
    setLoadingMovimentacoesVeiculo(true);
    try {
      const { data, error } = await (supabase as any)
        .from('frota_utilizacoes')
        .select(`
          id,
          codigo,
          veiculo_id,
          motorista,
          data_saida,
          hora_saida,
          status,
          funil_card_id,
          veiculo:frota_veiculos(placa, marca, modelo)
        `)
        .eq('empresa_id', empresaId)
        .is('funil_card_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovimentacoesVeiculo(data || []);
    } catch (error) {
      console.error('Erro ao carregar movimentações de veículo:', error);
      setMovimentacoesVeiculo([]);
    } finally {
      setLoadingMovimentacoesVeiculo(false);
    }
  };

  // Carregar movimentação de veículo atribuída ao card
  const loadMovimentacaoVeiculoDoCard = async (cardId: string | null | undefined) => {
    if (!cardId) {
      setMovimentacaoVeiculoDoCard(null);
      return;
    }
    
    try {
      const { data, error } = await (supabase as any)
        .from('frota_utilizacoes')
        .select(`
          id,
          codigo,
          veiculo_id,
          motorista,
          data_saida,
          hora_saida,
          status,
          funil_card_id,
          veiculo:frota_veiculos(placa, marca, modelo)
        `)
        .eq('funil_card_id', cardId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMovimentacaoVeiculoDoCard(data || null);
    } catch (error) {
      console.error('Erro ao carregar movimentação do card:', error);
      setMovimentacaoVeiculoDoCard(null);
    }
  };

  // Atribuir movimentação de veículo ao card
  const handleAtribuirVeiculo = async (movimentacaoId: string) => {
    if (!cardParaAtribuirVeiculo) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .update({ funil_card_id: cardParaAtribuirVeiculo.id })
        .eq('id', movimentacaoId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Movimentação de veículo atribuída ao card!'
      });

      // Recarregar dados
      await loadMovimentacaoVeiculoDoCard(cardParaAtribuirVeiculo.id);
      await loadMovimentacoesVeiculoDisponiveis();
      
      setAtribuirVeiculoDialogOpen(false);
      setCardParaAtribuirVeiculo(null);
    } catch (error) {
      console.error('Erro ao atribuir movimentação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atribuir a movimentação.',
        variant: 'destructive'
      });
    }
  };

  // Desvincular movimentação de veículo do card
  const handleDesvincularVeiculo = async () => {
    if (!movimentacaoVeiculoDoCard) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .update({ funil_card_id: null })
        .eq('id', movimentacaoVeiculoDoCard.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Movimentação desvinculada do card!'
      });

      setMovimentacaoVeiculoDoCard(null);
      await loadMovimentacoesVeiculoDisponiveis();
    } catch (error) {
      console.error('Erro ao desvincular movimentação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desvincular a movimentação.',
        variant: 'destructive'
      });
    }
  };

  // Carregar movimentação de kit atribuída ao card
  const loadMovimentacaoKitDoCard = async (cardId: string | null | undefined) => {
    if (!cardId || cardId === 'null') {
      setMovimentacaoKitDoCard(null);
      setLoadingMovimentacaoKit(false);
      return;
    }
    
    setLoadingMovimentacaoKit(true);
    try {
      const { data, error } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .select(`
          id,
          numero_movimentacao,
          kit_id,
          equipamentos_lista,
          status,
          quantidade,
          funil_card_id
        `)
        .eq('funil_card_id', cardId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Se for movimentação de kit
        if (data.kit_id) {
          // Carregar detalhes do kit com equipamentos
          const { data: kitData, error: kitError } = await (supabase as any)
            .from('equipamentos_kits')
            .select(`
              id,
              nome,
              codigo,
              tipo_servico,
              quantidade
            `)
            .eq('id', data.kit_id)
            .single();

          if (kitError && kitError.code !== 'PGRST116') throw kitError;

          // Carregar itens do kit com detalhes dos equipamentos
          const { data: itensKit, error: itensError } = await (supabase as any)
            .from('equipamentos_kit_itens')
            .select(`
              equipamento_id,
              quantidade,
              equipamento:equipamentos_sst(id, nome, codigo, categoria)
            `)
            .eq('kit_id', data.kit_id);

          if (itensError) throw itensError;

          setMovimentacaoKitDoCard({
            ...data,
            kit: {
              ...kitData,
              equipamentos: itensKit || []
            }
          });
        } else {
          // Movimentação de equipamentos individuais (sem kit)
          setMovimentacaoKitDoCard(data);
        }
      } else {
        setMovimentacaoKitDoCard(null);
      }
    } catch (error) {
      console.error('Erro ao carregar movimentação de kit do card:', error);
      setMovimentacaoKitDoCard(null);
    } finally {
      setLoadingMovimentacaoKit(false);
    }
  };

  // Registrar histórico de movimentação de equipamento
  const registrarHistoricoMovimentacao = async (
    movimentacaoId: string,
    tipo: string,
    descricao: string,
    dadosAdicionais?: {
      funil_id?: string;
      funil_nome?: string;
      card_id?: string;
      card_titulo?: string;
      status_anterior?: string;
      status_novo?: string;
    }
  ) => {
    try {
      await (supabase as any)
        .from('equipamentos_movimentacoes_historico')
        .insert({
          movimentacao_id: movimentacaoId,
          tipo,
          descricao,
          funil_id: dadosAdicionais?.funil_id,
          funil_nome: dadosAdicionais?.funil_nome,
          card_id: dadosAdicionais?.card_id,
          card_titulo: dadosAdicionais?.card_titulo,
          status_anterior: dadosAdicionais?.status_anterior,
          status_novo: dadosAdicionais?.status_novo,
          usuario_id: profile?.id,
          usuario_nome: profile?.nome
        });
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
    }
  };

  // Atribuir kit ao card
  const handleAtribuirKit = async (movimentacaoId: string) => {
    if (!cardParaAtribuirKit) return;
    
    try {
      // Se já existe uma movimentação atribuída, desatribuir primeiro
      if (movimentacaoKitDoCard) {
        await (supabase as any)
          .from('equipamentos_movimentacoes')
          .update({ funil_card_id: null })
          .eq('id', movimentacaoKitDoCard.id);
        
        // Registrar histórico de remoção do kit anterior
        await registrarHistoricoMovimentacao(
          movimentacaoKitDoCard.id,
          'desatribuicao_funil',
          `Kit removido do card "${cardParaAtribuirKit.titulo}" para atribuição de outro kit`,
          {
            funil_id: funilId,
            funil_nome: funil?.nome,
            card_id: cardParaAtribuirKit.id,
            card_titulo: cardParaAtribuirKit.titulo
          }
        );
      }

      const { error } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .update({ funil_card_id: cardParaAtribuirKit.id })
        .eq('id', movimentacaoId);

      if (error) throw error;

      // Registrar histórico de atribuição
      await registrarHistoricoMovimentacao(
        movimentacaoId,
        'atribuicao_funil',
        `Kit atribuído ao card "${cardParaAtribuirKit.titulo}" do funil "${funil?.nome}"`,
        {
          funil_id: funilId,
          funil_nome: funil?.nome,
          card_id: cardParaAtribuirKit.id,
          card_titulo: cardParaAtribuirKit.titulo
        }
      );

      toast({ 
        title: 'Sucesso', 
        description: 'Kit atribuído ao card com sucesso!' 
      });
      
      // Recarregar a movimentação do card
      await loadMovimentacaoKitDoCard(cardParaAtribuirKit.id);
      
      setAtribuirKitDialogOpen(false);
      setCardParaAtribuirKit(null);
      setKitsComDemanda([]);
    } catch (error) {
      console.error('Erro ao atribuir kit:', error);
      toast({ title: 'Erro', description: 'Não foi possível atribuir o kit.', variant: 'destructive' });
    }
  };

  // Remover atribuição de kit do card
  const handleRemoverKitDoCard = async () => {
    if (!movimentacaoKitDoCard || !viewingCard) return;
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .update({ funil_card_id: null })
        .eq('id', movimentacaoKitDoCard.id);

      if (error) throw error;

      // Registrar histórico de remoção
      await registrarHistoricoMovimentacao(
        movimentacaoKitDoCard.id,
        'remocao_funil',
        `Kit removido do card "${viewingCard.titulo}" do funil "${funil?.nome}"`,
        {
          funil_id: funilId,
          funil_nome: funil?.nome,
          card_id: viewingCard.id,
          card_titulo: viewingCard.titulo
        }
      );

      toast({ 
        title: 'Sucesso', 
        description: 'Kit removido do card com sucesso!' 
      });
      
      setMovimentacaoKitDoCard(null);
    } catch (error) {
      console.error('Erro ao remover kit do card:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover o kit.', variant: 'destructive' });
    }
  };

  // Retornar kit de treinamento - move a movimentação para status "devolvido"
  // IMPORTANTE: Mantém o funil_card_id para histórico e consulta
  // IMPORTANTE: NÃO altera estoque físico - apenas muda status da movimentação
  // O estoque "em uso" é calculado dinamicamente baseado nas movimentações ativas (não devolvidas)
  const handleRetornarKitTreinamento = async () => {
    if (!movimentacaoKitDoCard) return;
    
    try {
      const now = new Date().toISOString();
      const statusAnterior = movimentacaoKitDoCard.status;
      
      // Apenas atualiza o status da movimentação para "devolvido"
      // O estoque fica automaticamente disponível pois o cálculo de "em uso" 
      // considera apenas movimentações com status diferente de "devolvido"
      const { error } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .update({ 
          status: 'devolvido',
          data_retorno: now
        })
        .eq('id', movimentacaoKitDoCard.id);

      if (error) throw error;

      // Registrar histórico de retorno
      await registrarHistoricoMovimentacao(
        movimentacaoKitDoCard.id,
        'retorno_kit',
        `Kit "${movimentacaoKitDoCard.kit?.nome}" devolvido - equipamentos liberados para uso`,
        {
          funil_id: funilId,
          funil_nome: funil?.nome,
          card_id: cardParaAtribuirKit?.id || viewingCard?.id,
          card_titulo: cardParaAtribuirKit?.titulo || viewingCard?.titulo,
          status_anterior: statusAnterior,
          status_novo: 'devolvido',
          quantidade_kits: movimentacaoKitDoCard.quantidade || 1
        }
      );

      toast({ 
        title: 'Kit Devolvido', 
        description: `O kit "${movimentacaoKitDoCard.kit?.nome}" foi devolvido. Os equipamentos estão disponíveis para novas movimentações.`
      });
      
      // Atualiza o estado local para refletir o novo status
      setMovimentacaoKitDoCard({ ...movimentacaoKitDoCard, status: 'devolvido' });
      setConfirmarRetornoKitDialogOpen(false);
      setAtribuirKitDialogOpen(false);
    } catch (error) {
      console.error('Erro ao retornar kit de treinamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível retornar o kit.', variant: 'destructive' });
    }
  };

  const loadFunilConfig = async (isInitialLoad: boolean = false) => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis_configuracoes')
        .select('*')
        .eq('funil_id', funilId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFunilConfig(data);
        // Definir modo de visualização APENAS na carga inicial
        // Não sobrescrever quando recarrega após salvar configurações
        if (isInitialLoad && data.modo_visualizacao) {
          setModoVisualizacao(data.modo_visualizacao);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do funil:', error);
    }
  };

  const loadEtapas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etapas')
        .select('*')
        .eq('funil_id', funilId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    }
  };

  const handleCriarEtapa = async () => {
    if (!novaEtapaNome.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome da etapa.',
        variant: 'destructive'
      });
      return;
    }

    setCriandoEtapa(true);
    try {
      const { error } = await (supabase as any)
        .from('funil_etapas')
        .insert({
          funil_id: funilId,
          nome: novaEtapaNome.trim(),
          cor: novaEtapaCor,
          ordem: etapas.length,
          ativo: true
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Etapa criada com sucesso!'
      });

      setCriarEtapaDialogOpen(false);
      setNovaEtapaNome('');
      setNovaEtapaCor('#6366f1');
      loadEtapas();
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a etapa.',
        variant: 'destructive'
      });
    } finally {
      setCriandoEtapa(false);
    }
  };

  const loadCards = async () => {
    setLoading(true);
    try {
      // Construir query base
      let query = (supabase as any)
        .from('funil_cards')
        .select(`
          *,
          cliente:clientes_sst(id, nome, cnpj, email, telefone, responsavel, sigla, cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(cidade, estado)),
          responsavel:profiles(nome)
        `)
        .eq('funil_id', funilId)
        .eq('ativo', true);

      // Aplicar filtro de hierarquia:
      // - Administrador: vê todos os cards
      // - Gestor: vê seus cards + cards dos subordinados
      // - Colaborador: vê apenas seus próprios cards
      if (!isAdministrador && usuariosVisiveis.length > 0) {
        // Filtrar cards onde o responsavel_id está na lista de usuários visíveis
        // OU onde responsavel_id é null (cards sem responsável - visíveis para gestores também)
        if (isGestor) {
          // Gestor vê cards dos usuários visíveis OU cards sem responsável
          query = query.or(`responsavel_id.in.(${usuariosVisiveis.join(',')}),responsavel_id.is.null`);
        } else {
          // Colaborador vê apenas seus próprios cards
          query = query.in('responsavel_id', usuariosVisiveis);
        }
      }

      query = query.order('ordem');

      const { data: cardsData, error: cardsError } = await query;

      if (cardsError) throw cardsError;

      // Carregar etiquetas de todos os cards
      const cardIds = (cardsData || []).map((c: any) => c.id);
      const etiquetasMap: Record<string, CardEtiqueta[]> = {};

      if (cardIds.length > 0) {
        try {
          const { data: cardEtiquetasData } = await (supabase as any)
            .from('funil_card_etiquetas')
            .select(`
              card_id,
              etiqueta:funil_etiquetas(id, nome, cor)
            `)
            .in('card_id', cardIds);

          if (cardEtiquetasData) {
            // Agrupar etiquetas por card_id (evitando duplicatas)
            cardEtiquetasData.forEach((item: any) => {
              if (item.etiqueta) {
                if (!etiquetasMap[item.card_id]) {
                  etiquetasMap[item.card_id] = [];
                }
                // Verificar se a etiqueta já existe para evitar duplicatas
                const jaExiste = etiquetasMap[item.card_id].some(
                  (e: any) => e.id === item.etiqueta.id
                );
                if (!jaExiste) {
                  etiquetasMap[item.card_id].push(item.etiqueta);
                }
              }
            });
          }
        } catch (etiquetasError) {
        }
      }

      // Buscar atividades de todos os cards para determinar status e próxima data
      const atividadesMap: Record<string, { status: 'programada' | 'pendente' | 'atrasada' | null; proximaData: string | null }> = {};
      
      if (cardIds.length > 0) {
        try {
          const { data: atividadesData } = await (supabase as any)
            .from('funil_card_atividades')
            .select('card_id, status, prazo')
            .in('card_id', cardIds)
            .neq('status', 'concluida')
            .order('prazo', { ascending: true, nullsFirst: false });

          if (atividadesData) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            atividadesData.forEach((atividade: any) => {
              const cardId = atividade.card_id;
              let statusAtividade: 'programada' | 'pendente' | 'atrasada' | null = null;
              const prazoAtividade = atividade.prazo || null;
              
              if (atividade.prazo) {
                const prazoDate = new Date(atividade.prazo);
                prazoDate.setHours(0, 0, 0, 0);
                
                if (prazoDate < hoje) {
                  statusAtividade = 'atrasada';
                } else {
                  statusAtividade = 'programada';
                }
              } else {
                statusAtividade = 'pendente';
              }
              
              // Prioridade: atrasada > programada > pendente
              // Guardar a data mais relevante (atrasada ou próxima programada)
              if (!atividadesMap[cardId]) {
                atividadesMap[cardId] = { status: statusAtividade, proximaData: prazoAtividade };
              } else {
                const currentStatus = atividadesMap[cardId].status;
                if (statusAtividade === 'atrasada') {
                  atividadesMap[cardId].status = 'atrasada';
                  // Manter a data mais antiga atrasada
                  if (!atividadesMap[cardId].proximaData || (prazoAtividade && prazoAtividade < atividadesMap[cardId].proximaData)) {
                    atividadesMap[cardId].proximaData = prazoAtividade;
                  }
                } else if (statusAtividade === 'programada' && currentStatus !== 'atrasada') {
                  atividadesMap[cardId].status = 'programada';
                  // Manter a data mais próxima
                  if (!atividadesMap[cardId].proximaData || (prazoAtividade && prazoAtividade < atividadesMap[cardId].proximaData)) {
                    atividadesMap[cardId].proximaData = prazoAtividade;
                  }
                }
              }
            });
          }
        } catch (atividadesError) {
          console.error('Erro ao buscar atividades:', atividadesError);
        }
      }

      // Adicionar etiquetas e status de atividade aos cards
      const cardsComEtiquetas = (cardsData || []).map((card: any) => ({
        ...card,
        etiquetas: etiquetasMap[card.id] || [],
        status_atividade: atividadesMap[card.id]?.status || null,
        proxima_atividade_data: atividadesMap[card.id]?.proximaData || null
      }));

      setCards(cardsComEtiquetas);
    } catch (error) {
      console.error('Erro ao carregar cards:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cards.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('clientes_sst')
        .select(`
          id, 
          nome,
          cnpj,
          email,
          categoria_id,
          cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(cidade, estado)
        `)
        .eq('empresa_sst_id', empresaId)
        .order('nome');

      if (error) throw error;
      // Mapear para extrair a cidade e estado da empresa cliente
      const clientesComCidade = (data || []).map((c: any) => ({
        id: c.id,
        nome: c.nome,
        cnpj: c.cnpj || null,
        email: c.email || null,
        cidade: c.cliente_empresa?.cidade || null,
        estado: c.cliente_empresa?.estado || null,
        categoria_id: c.categoria_id || null
      }));
      setClientes(clientesComCidade);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadResponsaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('role', 'empresa_sst')
        .order('nome');

      if (error) throw error;
      setResponsaveis(data || []);
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
    }
  };

  const loadCategoriasCliente = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('categorias_clientes_empresa')
        .select('id, nome, cor')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCategoriasCliente(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleUpdateCategoriaCliente = async (categoriaId: string | null) => {
    if (!viewingCard?.cliente_id) return;
    
    try {
      const { error } = await (supabase as any)
        .from('clientes')
        .update({ categoria_id: categoriaId })
        .eq('id', viewingCard.cliente_id);

      if (error) throw error;

      // Atualizar o cliente na lista local
      setClientes(prev => prev.map(c => 
        c.id === viewingCard.cliente_id 
          ? { ...c, categoria_id: categoriaId } as any
          : c
      ));

      setEditandoCategoria(false);
      toast({
        title: 'Sucesso',
        description: 'Categoria do cliente atualizada!',
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a categoria.',
        variant: 'destructive'
      });
    }
  };

  const fetchAtividades = async (cardId: string) => {
    setLoadingAtividades(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_card_atividades')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) {
        // Tabela pode não existir ainda
        setAtividades([]);
        setLoadingAtividades(false);
        return;
      }

      // Buscar usuários
      const usuarioIds = [...new Set((data || []).map((a: any) => a.usuario_id).filter(Boolean))] as string[];
      let usuariosMap: Record<string, { nome: string }> = {};

      if (usuarioIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', usuarioIds);

        usuariosMap = (usuariosData || []).reduce((acc: Record<string, { nome: string }>, u: any) => {
          acc[u.id] = { nome: u.nome };
          return acc;
        }, {});
      }

      const atividadesComUsuario = (data || []).map((atividade: any) => ({
        ...atividade,
        usuario: atividade.usuario_id ? usuariosMap[atividade.usuario_id] || null : null,
      }));

      setAtividades(atividadesComUsuario);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      setAtividades([]);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const fetchMovimentacoes = async (cardId: string) => {
    setLoadingMovimentacoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_card_movimentacoes')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) {
        // Tabela pode não existir ainda
        setMovimentacoes([]);
        setLoadingMovimentacoes(false);
        return;
      }

      // Buscar usuários
      const usuarioIds = [...new Set((data || []).map((m: any) => m.usuario_id).filter(Boolean))] as string[];
      let usuariosMap: Record<string, { nome: string }> = {};

      if (usuarioIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', usuarioIds);

        usuariosMap = (usuariosData || []).reduce((acc: Record<string, { nome: string }>, u: any) => {
          acc[u.id] = { nome: u.nome };
          return acc;
        }, {});
      }

      const movimentacoesComUsuario = (data || []).map((mov: any) => ({
        ...mov,
        usuario: mov.usuario_id ? usuariosMap[mov.usuario_id] || null : null,
      }));

      setMovimentacoes(movimentacoesComUsuario);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      setMovimentacoes([]);
    } finally {
      setLoadingMovimentacoes(false);
    }
  };

  const handleViewDetails = (card: FunilCard) => {
    // Abrir modal imediatamente para melhor UX
    setViewingCard(card);
    setDetailsDialogOpen(true);
    setAtividadeFormExpanded(false);
    setChecklistItems([]);
    setNovoChecklistItem('');
    setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '', responsavel_id: profile?.id || '' });
    setEditandoResponsavel(false);
    setEditandoCategoria(false);
    setEditandoDataPrevisao(false);
    
    // Auto-detectar calculadora usada baseado nos orçamentos salvos do card
    const cardAny = card as any;
    if (orcamentosClientePorCard[card.id] || cardAny?.orcamento_treinamento) {
      setCalculadoraSelecionada('treinamento');
    } else if (orcamentosServicosSSTporCard[card.id] || cardAny?.orcamento_servicos_sst) {
      setCalculadoraSelecionada('mensal');
    } else if (orcamentosVertical365PorCard[card.id] || cardAny?.orcamento_vertical365) {
      setCalculadoraSelecionada('vertical365');
    } else {
      setCalculadoraSelecionada(null);
    }
    
    // Carregar dados em paralelo sem bloquear a abertura
    Promise.all([
      fetchAtividades(card.id),
      fetchMovimentacoes(card.id),
      loadResponsaveis(),
      loadCategoriasCliente(),
      loadCardEtiquetas(card.id),
      loadMovimentacaoKitDoCard(card.id),
      loadEtiquetas(),
    ]);
  };

  // Abrir card automaticamente quando initialCardId é fornecido
  useEffect(() => {
    if (initialCardId && cards.length > 0 && !loading) {
      const cardToOpen = cards.find(c => c.id === initialCardId);
      if (cardToOpen) {
        handleViewDetails(cardToOpen);
        // Notificar que o card foi aberto para limpar o pendingCardId
        if (onCardOpened) {
          onCardOpened();
        }
      }
    }
  }, [initialCardId, cards, loading]);

  // Funções de Etiquetas
  const loadEtiquetas = async () => {
    if (!empresaId) return;
    setLoadingEtiquetas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('funil_etiquetas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) {
        setEtiquetas([]);
        return;
      }
      setEtiquetas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      setEtiquetas([]);
    } finally {
      setLoadingEtiquetas(false);
    }
  };

  const loadCardEtiquetas = async (cardId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('funil_card_etiquetas')
        .select('etiqueta_id')
        .eq('card_id', cardId);

      if (error) {
        setCardEtiquetas([]);
        return;
      }
      // Remover duplicatas usando Set
      const etiquetaIds = [...new Set((data || []).map((d: any) => d.etiqueta_id))];
      setCardEtiquetas(etiquetaIds);
    } catch (error) {
      console.error('Erro ao carregar etiquetas do card:', error);
      setCardEtiquetas([]);
    }
  };

  const handleOpenEtiquetas = async () => {
    setEtiquetasDialogOpen(true);
    setEtiquetaSearch('');
    setCriandoEtiqueta(false);
    setEditandoEtiqueta(null);
    setNovaEtiqueta({ nome: '', cor: CORES_ETIQUETA[0] });
    await loadEtiquetas();
  };

  const handleCreateEtiqueta = async () => {
    if (!novaEtiqueta.nome.trim() || !empresaId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('funil_etiquetas')
        .insert({
          nome: novaEtiqueta.nome.trim(),
          cor: novaEtiqueta.cor,
          empresa_id: empresaId,
        })
        .select()
        .single();

      if (error) throw error;

      setEtiquetas(prev => [...prev, data]);
      setNovaEtiqueta({ nome: '', cor: CORES_ETIQUETA[0] });
      setCriandoEtiqueta(false);
      toast({ title: 'Sucesso', description: 'Etiqueta criada!' });
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a etiqueta.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateEtiqueta = async () => {
    if (!editandoEtiqueta || !editandoEtiqueta.nome.trim()) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_etiquetas')
        .update({
          nome: editandoEtiqueta.nome.trim(),
          cor: editandoEtiqueta.cor,
        })
        .eq('id', editandoEtiqueta.id);

      if (error) throw error;

      setEtiquetas(prev => prev.map(e => 
        e.id === editandoEtiqueta.id 
          ? { ...e, nome: editandoEtiqueta.nome.trim(), cor: editandoEtiqueta.cor }
          : e
      ));
      setEditandoEtiqueta(null);
      toast({ title: 'Sucesso', description: 'Etiqueta atualizada!' });
      // Atualizar cards que usam essa etiqueta
      await loadCards();
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etiqueta.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteEtiqueta = async (etiquetaId: string) => {
    try {
      // Remover vínculos com cards primeiro
      await (supabase as any)
        .from('funil_card_etiquetas')
        .delete()
        .eq('etiqueta_id', etiquetaId);

      const { error } = await (supabase as any)
        .from('funil_etiquetas')
        .delete()
        .eq('id', etiquetaId);

      if (error) throw error;

      setEtiquetas(prev => prev.filter(e => e.id !== etiquetaId));
      setCardEtiquetas(prev => prev.filter(id => id !== etiquetaId));
      setEditandoEtiqueta(null);
      toast({ title: 'Sucesso', description: 'Etiqueta excluída!' });
      await loadCards();
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a etiqueta.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleEtiqueta = async (etiquetaId: string) => {
    if (!viewingCard) return;

    const isSelected = cardEtiquetas.includes(etiquetaId);

    try {
      if (isSelected) {
        // Remover etiqueta
        await (supabase as any)
          .from('funil_card_etiquetas')
          .delete()
          .eq('card_id', viewingCard.id)
          .eq('etiqueta_id', etiquetaId);

        setCardEtiquetas(prev => prev.filter(id => id !== etiquetaId));
      } else {
        // Adicionar etiqueta
        await (supabase as any)
          .from('funil_card_etiquetas')
          .insert({
            card_id: viewingCard.id,
            etiqueta_id: etiquetaId,
          });

        setCardEtiquetas(prev => [...prev, etiquetaId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etiqueta.',
        variant: 'destructive'
      });
    }
  };

  const filteredEtiquetas = etiquetas.filter(e => 
    e.nome.toLowerCase().includes(etiquetaSearch.toLowerCase())
  );

  // Funções de Encaminhar Card
  const loadFunisCadastrados = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select('id, nome, tipo, setor_id, setores(nome)')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      // Mapear para incluir setor_nome
      const funisComSetor = (data || []).map((f: any) => ({
        ...f,
        setor_nome: f.setores?.nome || 'Sem setor'
      }));
      setFunisCadastrados(funisComSetor);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      setFunisCadastrados([]);
    }
  };

  const loadEtapasDestino = async (funilDestinoId: string) => {
    try {
      // Verificar se o funil destino é "Contas a Receber" (Financeiro)
      const funilDestino = funisCadastrados.find(f => f.id === funilDestinoId);
      const isContasReceber = funilDestino?.nome?.toLowerCase().includes('contas a receber') && 
                              funilDestino?.setor_nome?.toLowerCase().includes('financeiro');
      
      if (isContasReceber) {
        // Carregar colunas do módulo Contas a Receber
        const { data, error } = await (supabase as any)
          .from('contas_receber_colunas')
          .select('id, nome, cor, ordem')
          .eq('empresa_id', empresaId)
          .order('ordem');
        if (error) throw error;
        setEtapasDestino(data || []);
      } else {
        const { data, error } = await (supabase as any)
          .from('funil_etapas')
          .select('id, nome, cor, ordem')
          .eq('funil_id', funilDestinoId)
          .eq('ativo', true)
          .order('ordem');
        if (error) throw error;
        setEtapasDestino(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar etapas destino:', error);
      setEtapasDestino([]);
    }
  };

  const handleOpenEncaminhar = async () => {
    setEncaminharDialogOpen(true);
    setEncaminharForm({ funilDestinoId: '', etapaDestinoId: '', acao: 'transferir' });
    setEtapasDestino([]);
    await loadFunisCadastrados();
  };

  const handleEncaminharCard = async () => {
    if (!viewingCard || !encaminharForm.funilDestinoId || !encaminharForm.etapaDestinoId) {
      toast({
        title: 'Erro',
        description: 'Selecione o funil e a etapa de destino.',
        variant: 'destructive'
      });
      return;
    }

    setLoadingEncaminhar(true);
    try {
      // Verificar se destino é "Contas a Receber" do Financeiro
      const funilDestino = funisCadastrados.find(f => f.id === encaminharForm.funilDestinoId);
      const isContasReceber = funilDestino?.nome?.toLowerCase().includes('contas a receber') && 
                              funilDestino?.setor_nome?.toLowerCase().includes('financeiro');

      if (isContasReceber) {
        // Criar registro em contas_receber (módulo financeiro)
        const hoje = new Date().toISOString().split('T')[0];
        const numero = `CR-${Date.now().toString(36).toUpperCase()}`;
        
        // Buscar dados do cliente se existir
        let clienteNome = viewingCard.titulo || 'Sem cliente';
        let clienteCnpj = '';
        if (viewingCard.cliente_id) {
          const { data: clienteData } = await (supabase as any)
            .from('clientes_sst')
            .select('nome, cnpj')
            .eq('id', viewingCard.cliente_id)
            .single();
          if (clienteData) {
            clienteNome = clienteData.nome || clienteNome;
            clienteCnpj = clienteData.cnpj || '';
          }
        }

        const { error } = await (supabase as any)
          .from('contas_receber')
          .insert({
            empresa_id: empresaId,
            coluna_id: encaminharForm.etapaDestinoId,
            numero,
            cliente_id: viewingCard.cliente_id || null,
            cliente_nome: clienteNome,
            cliente_cnpj: clienteCnpj,
            servico_produto: viewingCard.descricao || viewingCard.titulo || '',
            valor: viewingCard.valor || 0,
            valor_pago: 0,
            data_emissao: hoje,
            observacoes: `Encaminhado do funil "${funil?.nome}" - Card: ${viewingCard.titulo}`,
            origem: 'closer',
            origem_card_id: viewingCard.id,
            origem_kanban: funil?.nome || 'Closer',
            closer_card_id: viewingCard.id,
            ordem: 0,
            arquivado: false,
          });

        if (error) throw error;

        toast({ 
          title: 'Sucesso', 
          description: `Card ${encaminharForm.acao === 'transferir' ? 'transferido' : 'duplicado'} para Contas a Receber!` 
        });

        if (encaminharForm.acao === 'transferir') {
          // Marcar card original como ganho ao transferir para financeiro
          await (supabase as any)
            .from('funil_cards')
            .update({ status_negocio: 'ganho' })
            .eq('id', viewingCard.id);
          setDetailsDialogOpen(false);
        }
        
        await loadCards();
      } else if (encaminharForm.acao === 'transferir') {
        // Transferir: mover o card para outro funil
        const { error } = await (supabase as any)
          .from('funil_cards')
          .update({
            funil_id: encaminharForm.funilDestinoId,
            etapa_id: encaminharForm.etapaDestinoId,
          })
          .eq('id', viewingCard.id);

        if (error) throw error;

        toast({ title: 'Sucesso', description: 'Card transferido com sucesso!' });
        setDetailsDialogOpen(false);
        loadCards();
      } else {
        // Duplicar: criar cópia do card no destino
        const { data: newCardData, error } = await (supabase as any)
          .from('funil_cards')
          .insert({
            funil_id: encaminharForm.funilDestinoId,
            etapa_id: encaminharForm.etapaDestinoId,
            titulo: viewingCard.titulo,
            descricao: viewingCard.descricao,
            valor: viewingCard.valor,
            cliente_id: viewingCard.cliente_id,
            responsavel_id: viewingCard.responsavel_id,
            data_previsao: viewingCard.data_previsao,
            prioridade: viewingCard.prioridade,
            ordem: 0,
            ativo: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Copiar histórico de atividades, movimentações e etiquetas do card original
        if (newCardData) {
          await copyCardHistory(viewingCard.id, newCardData.id);
        }

        toast({ title: 'Sucesso', description: 'Card duplicado com sucesso! Histórico copiado.' });
        await loadCards();
      }

      setEncaminharDialogOpen(false);
    } catch (error) {
      console.error('Erro ao encaminhar card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível encaminhar o card.',
        variant: 'destructive'
      });
    } finally {
      setLoadingEncaminhar(false);
    }
  };

  // Atualizar status do negócio
  const handleUpdateStatusNegocio = async (status: 'perdido' | 'em_andamento' | 'aceito' | 'ganho') => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ status_negocio: status })
        .eq('id', viewingCard.id);

      if (error) throw error;

      // Atualizar o card localmente
      setViewingCard({ ...viewingCard, status_negocio: status });

      toast({ 
        title: 'Status atualizado', 
        description: `Negócio marcado como "${STATUS_NEGOCIO.find(s => s.id === status)?.label}"` 
      });

      // Executar automações baseadas no status
      if (status === 'ganho' || status === 'perdido') {
        await executeAutomationsByStatus(viewingCard, status);
      }
      
      // Recarregar cards para refletir a mudança
      await loadCards();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  };

  // Atualizar responsável do card
  const handleUpdateResponsavel = async (novoResponsavelId: string | null) => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ responsavel_id: novoResponsavelId })
        .eq('id', viewingCard.id);

      if (error) throw error;

      // Buscar dados do novo responsável
      let novoResponsavel = null;
      if (novoResponsavelId) {
        const resp = responsaveis.find(r => r.id === novoResponsavelId);
        if (resp) {
          novoResponsavel = { nome: resp.nome };
        }
      }

      // Atualizar o card localmente
      setViewingCard({ 
        ...viewingCard, 
        responsavel_id: novoResponsavelId,
        responsavel: novoResponsavel
      });
      
      setEditandoResponsavel(false);
      toast({ title: 'Sucesso', description: 'Responsável atualizado!' });
      
      // Recarregar cards para refletir a mudança
      await loadCards();
    } catch (error) {
      console.error('Erro ao atualizar responsável:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o responsável.',
        variant: 'destructive'
      });
    }
  };

  // Atualizar data de previsão do card
  const handleUpdateDataPrevisao = async (novaData: Date | undefined) => {
    if (!viewingCard) return;

    const dataStr = novaData ? format(novaData, 'yyyy-MM-dd') : null;

    try {
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ data_previsao: dataStr })
        .eq('id', viewingCard.id);

      if (error) throw error;

      setViewingCard({ ...viewingCard, data_previsao: dataStr });
      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, data_previsao: dataStr } : c));
      setEditandoDataPrevisao(false);
      toast({ title: 'Sucesso', description: 'Data de previsão atualizada!' });
    } catch (error) {
      console.error('Erro ao atualizar data de previsão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a data de previsão.',
        variant: 'destructive'
      });
    }
  };

  // Finalizar card - só permite se todas as atividades estiverem concluídas
  const handleFinalizarCard = async () => {
    if (!viewingCard) return;

    try {
      // Verificar se há atividades não concluídas
      const { data: atividadesPendentes, error: atividadesError } = await (supabase as any)
        .from('funil_card_atividades')
        .select('id, status')
        .eq('card_id', viewingCard.id)
        .neq('status', 'concluida');

      if (atividadesError) throw atividadesError;

      if (atividadesPendentes && atividadesPendentes.length > 0) {
        toast({
          title: 'Não é possível finalizar',
          description: `Existem ${atividadesPendentes.length} atividade(s) não concluída(s). Conclua todas as atividades antes de finalizar o card.`,
          variant: 'destructive'
        });
        return;
      }

      // Finalizar o card definindo data_conclusao
      const dataHoje = format(new Date(), 'yyyy-MM-dd');
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ data_conclusao: dataHoje })
        .eq('id', viewingCard.id);

      if (error) throw error;

      setViewingCard({ ...viewingCard, data_conclusao: dataHoje });
      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, data_conclusao: dataHoje } : c));
      
      toast({ 
        title: 'Card Finalizado!', 
        description: 'O card foi marcado como concluído com sucesso.' 
      });
    } catch (error) {
      console.error('Erro ao finalizar card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o card.',
        variant: 'destructive'
      });
    }
  };

  // Reabrir card finalizado
  const handleReabrirCard = async () => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ data_conclusao: null })
        .eq('id', viewingCard.id);

      if (error) throw error;

      setViewingCard({ ...viewingCard, data_conclusao: null });
      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, data_conclusao: null } : c));
      
      toast({ 
        title: 'Card Reaberto', 
        description: 'O card foi reaberto e pode ser editado novamente.' 
      });
    } catch (error) {
      console.error('Erro ao reabrir card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reabrir o card.',
        variant: 'destructive'
      });
    }
  };

  // Atualizar configuração de ações rápidas do card
  const handleToggleAcaoRapida = async (acaoId: string) => {
    if (!viewingCard) return;

    try {
      const configAtual = viewingCard.acoes_rapidas_config || {};
      const novaConfig = {
        ...configAtual,
        [acaoId]: configAtual[acaoId] === false ? true : false // toggle, default é true (visível)
      };

      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ acoes_rapidas_config: novaConfig })
        .eq('id', viewingCard.id);

      if (error) throw error;

      // Atualizar o card localmente
      setViewingCard({ ...viewingCard, acoes_rapidas_config: novaConfig });
      
      // Atualizar na lista de cards
      setCards(prev => prev.map(c => 
        c.id === viewingCard.id ? { ...c, acoes_rapidas_config: novaConfig } : c
      ));

      const acaoLabel = ACOES_RAPIDAS_DISPONIVEIS.find(a => a.id === acaoId)?.label;
      const visivel = novaConfig[acaoId] !== false;
      toast({ 
        title: visivel ? 'Ação exibida' : 'Ação ocultada', 
        description: `"${acaoLabel}" ${visivel ? 'será exibida' : 'foi ocultada'} nas ações rápidas.` 
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração.',
        variant: 'destructive'
      });
    }
  };

  // Verificar se uma ação rápida está visível (considera config do funil E do card)
  const isAcaoRapidaVisivel = (acaoId: string): boolean => {
    // Primeiro verifica a configuração global do funil
    if (funilConfig?.card_interno_acoes_rapidas && !funilConfig.card_interno_acoes_rapidas.includes(acaoId)) {
      return false;
    }
    // Depois verifica a configuração específica do card
    if (!viewingCard) return true;
    const config = viewingCard.acoes_rapidas_config;
    if (!config) return true; // Por padrão, todas são visíveis
    return config[acaoId] !== false;
  };

  // Buscar proposta por identificador e abrir o card correspondente
  const buscarPropostaPorIdentificador = async (identificador: string) => {
    if (!empresaId || !funil?.id) return false;
    
    try {
      // Buscar nas três tabelas de propostas em paralelo
      const [resTreinamentos, resServicosSST, resVertical365] = await Promise.all([
        (supabase as any)
          .from('propostas_comerciais_treinamentos')
          .select('card_id, identificador')
          .eq('empresa_id', empresaId)
          .ilike('identificador', `%${identificador}%`)
          .limit(1),
        (supabase as any)
          .from('propostas_comerciais_servicos_sst')
          .select('card_id, identificador')
          .eq('empresa_id', empresaId)
          .ilike('identificador', `%${identificador}%`)
          .limit(1),
        (supabase as any)
          .from('propostas_comerciais_vertical365')
          .select('card_id, identificador')
          .eq('empresa_id', empresaId)
          .ilike('identificador', `%${identificador}%`)
          .limit(1)
      ]);
      
      if (resTreinamentos.error) {
        console.error('Erro ao buscar em propostas_comerciais_treinamentos:', resTreinamentos.error);
      }
      if (resServicosSST.error) {
        console.error('Erro ao buscar em propostas_comerciais_servicos_sst:', resServicosSST.error);
      }
      if (resVertical365.error) {
        console.error('Erro ao buscar em propostas_comerciais_vertical365:', resVertical365.error);
      }
      
      // Encontrar a primeira proposta válida
      let proposta = resTreinamentos.data?.[0] || resServicosSST.data?.[0] || resVertical365.data?.[0];
      
      if (proposta?.card_id) {
        // Encontrar o card correspondente
        const card = cards.find(c => c.id === proposta.card_id);
        if (card) {
          // Limpar o termo de busca
          funilFilters.setSearchTerm('');
          // Abrir o card diretamente usando os setters
          setViewingCard(card);
          setDetailsDialogOpen(true);
          setAtividadeFormExpanded(false);
          // Carregar dados do card
          fetchAtividades(card.id);
          fetchMovimentacoes(card.id);
          loadCardEtiquetas(card.id);
          // Definir o filtro de propostas com o identificador
          setPropostasSearchFilter(proposta.identificador);
          // Abrir o dialog de propostas após um pequeno delay para garantir que o card foi carregado
          setTimeout(() => {
            setPropostasDialogOpen(true);
          }, 300);
          return true;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Erro ao buscar proposta:', error?.message || error);
      return false;
    }
  };

  // Efeito para detectar busca por ID de proposta com debounce
  // Formato: 3 letras maiúsculas + 14 dígitos (ex: JCR20260204165939, ASR20260204165939)
  useEffect(() => {
    const term = funilFilters.searchTerm.trim().toUpperCase();
    // Detectar padrão de ID de proposta: 3 letras + números (mínimo 17 caracteres para ID completo)
    const propostaIdPattern = /^[A-Z]{3}\d{14,}$/;
    if (propostaIdPattern.test(term)) {
      const timeoutId = setTimeout(() => {
        buscarPropostaPorIdentificador(term);
      }, 500); // Aguardar 500ms após parar de digitar
      return () => clearTimeout(timeoutId);
    }
  }, [funilFilters.searchTerm, empresaId, funil?.id, cards]);

  const handleAddAtividade = async () => {
    if (!viewingCard || !novaAtividade.descricao.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha a descrição da atividade.',
        variant: 'destructive'
      });
      return;
    }

    // Para checklist, incluir os itens na descrição como JSON
    let descricaoFinal = novaAtividade.descricao;
    if (novaAtividade.tipo === 'checklist' && checklistItems.length > 0) {
      descricaoFinal = JSON.stringify({
        texto: novaAtividade.descricao,
        itens: checklistItems.map(item => ({ texto: item, concluido: false }))
      });
    }

    try {
      setUploadingAnexo(true);
      
      // Upload do anexo se existir
      let anexoUrl: string | null = null;
      let anexoNome: string | null = null;
      
      if (atividadeAnexo) {
        const fileExt = atividadeAnexo.name.split('.').pop();
        const fileName = `${viewingCard.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('atividades-anexos')
          .upload(fileName, atividadeAnexo);
        
        if (uploadError) {
          console.error('Erro ao fazer upload:', uploadError);
          toast({
            title: 'Aviso',
            description: `Não foi possível anexar o arquivo: ${uploadError.message}`,
            variant: 'destructive'
          });
          // Continua sem o anexo se falhar
        } else {
          const { data: urlData } = supabase.storage
            .from('atividades-anexos')
            .getPublicUrl(fileName);
          anexoUrl = urlData.publicUrl;
          anexoNome = atividadeAnexo.name;
          console.log('Anexo URL gerada:', anexoUrl);
        }
      }

      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .insert({
          card_id: viewingCard.id,
          tipo: novaAtividade.tipo,
          descricao: descricaoFinal,
          prazo: novaAtividade.prazo || null,
          horario: novaAtividade.horario || null,
          status: novaAtividade.prazo ? 'programada' : 'a_realizar',
          usuario_id: profile?.id,
          responsavel_id: novaAtividade.responsavel_id || null,
          anexo_url: anexoUrl,
          anexo_nome: anexoNome,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Atividade adicionada!' });
      setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '', responsavel_id: profile?.id || '' });
      setAtividadeAnexo(null);
      setChecklistItems([]);
      setNovoChecklistItem('');
      setAtividadeFormExpanded(false);
      await fetchAtividades(viewingCard.id);
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a atividade.',
        variant: 'destructive'
      });
    } finally {
      setUploadingAnexo(false);
    }
  };

  const handleAddChecklistItem = () => {
    if (novoChecklistItem.trim()) {
      setChecklistItems(prev => [...prev, novoChecklistItem.trim()]);
      setNovoChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleChecklistItem = async (atividadeId: string, itemIndex: number) => {
    const atividade = atividades.find(a => a.id === atividadeId);
    if (!atividade || atividade.tipo !== 'checklist') return;

    try {
      const checklistData = JSON.parse(atividade.descricao);
      checklistData.itens[itemIndex].concluido = !checklistData.itens[itemIndex].concluido;

      const novaDescricao = JSON.stringify(checklistData);
      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .update({ descricao: novaDescricao })
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.map(a => 
        a.id === atividadeId ? { ...a, descricao: novaDescricao } : a
      ));

      // Auto-complete activity when all checklist items are done
      const todosCompletos = checklistData.itens.every((item: any) => item.concluido);
      if (todosCompletos && atividade.status !== 'concluida') {
        handleUpdateAtividadeStatus(atividadeId, 'concluida');
      }
    } catch (error) {
      console.error('Erro ao atualizar checklist:', error);
    }
  };

  const handleDeleteAtividade = async (atividadeId: string) => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .delete()
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.filter(a => a.id !== atividadeId));
      toast({ title: 'Sucesso', description: 'Atividade excluída!' });
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a atividade.',
        variant: 'destructive'
      });
    }
  };

  const handleEditAtividade = async (atividadeId: string, dados: { descricao: string; prazo?: string | null; horario?: string | null }) => {
    if (!viewingCard) return;

    try {
      const updateData: any = { descricao: dados.descricao };
      if (dados.prazo !== undefined) updateData.prazo = dados.prazo;
      if (dados.horario !== undefined) updateData.horario = dados.horario;
      if (dados.prazo) updateData.status = 'programada';

      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .update(updateData)
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.map(a => 
        a.id === atividadeId ? { ...a, ...updateData } : a
      ));
      toast({ title: 'Sucesso', description: 'Atividade atualizada!' });
    } catch (error) {
      console.error('Erro ao editar atividade:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível editar a atividade.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAtividadeStatus = async (atividadeId: string, novoStatus: 'a_realizar' | 'programada' | 'pendente' | 'concluida') => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.map(a => 
        a.id === atividadeId ? { ...a, status: novoStatus } : a
      ));

      toast({ 
        title: 'Sucesso', 
        description: novoStatus === 'concluida' ? 'Atividade concluída!' : 'Status atualizado!' 
      });

      // Executar automações de atividade finalizada
      if (novoStatus === 'concluida') {
        await executeAutomationsByAtividadeFinalizada(viewingCard);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  };

  const handleMoveCardFromDetails = async (novaEtapaId: string) => {
    if (!viewingCard || viewingCard.etapa_id === novaEtapaId) return;

    const etapaOrigem = etapas.find(e => e.id === viewingCard.etapa_id);
    const etapaDestino = etapas.find(e => e.id === novaEtapaId);

    // Bloquear se a etapa de origem é trancada
    if (etapaOrigem?.trancada) {
      toast({
        title: 'Etapa trancada',
        description: `Cards na etapa "${etapaOrigem.nome}" não podem ser movidos.`,
        variant: 'destructive'
      });
      return;
    }

    // Se destino é trancado, pedir confirmação
    if (etapaDestino?.trancada) {
      setPendingLockedMove({
        card: viewingCard,
        targetEtapaId: novaEtapaId,
        targetEtapaNome: etapaDestino.nome,
        source: 'details'
      });
      return;
    }

    try {
      // Cancelar agendamentos pendentes da etapa de origem
      await cancelarAgendamentosPendentes(viewingCard.id, viewingCard.etapa_id);

      // Atualizar card
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({ etapa_id: novaEtapaId, updated_at: new Date().toISOString() })
        .eq('id', viewingCard.id);

      if (error) throw error;

      // Registrar movimentação
      await (supabase as any)
        .from('funil_card_movimentacoes')
        .insert({
          card_id: viewingCard.id,
          tipo: 'mudanca_etapa',
          descricao: `Movido de "${etapaOrigem?.nome}" para "${etapaDestino?.nome}"`,
          etapa_origem_id: viewingCard.etapa_id,
          etapa_destino_id: novaEtapaId,
          usuario_id: profile?.id,
        });

      // Atualizar estados
      setViewingCard({ ...viewingCard, etapa_id: novaEtapaId });
      
      // Recarregar cards para refletir a mudança
      await loadCards();
      await fetchMovimentacoes(viewingCard.id);
      
      // Executar automações para a nova etapa
      await executeAutomations({ ...viewingCard, etapa_id: novaEtapaId }, novaEtapaId);
      
      toast({ title: 'Sucesso', description: 'Card movido!' });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o card.',
        variant: 'destructive'
      });
    }
  };

  // Filtrar responsáveis pela hierarquia (apenas o próprio usuário + colaboradores sob gestão)
  const responsaveisVisiveis = responsaveis.filter(resp => {
    // Administrador vê todos
    if (isAdministrador) return true;
    // Usuário sempre vê a si mesmo
    if (resp.id === profile?.id) return true;
    // Gestor/Colaborador vê apenas os usuários visíveis pela hierarquia
    // usuariosVisiveis é um array de strings (IDs)
    return usuariosVisiveis.includes(resp.id);
  });

  // IDs dos responsáveis visíveis para filtrar cards quando "Todos" está selecionado
  const responsaveisVisiveisIds = responsaveisVisiveis.map(r => r.id);

  // Aplicar filtros aos cards (passa os IDs dos responsáveis visíveis para filtrar pela hierarquia)
  const filteredCards = funilFilters.filterCards(cards, responsaveisVisiveisIds);
  
  // Função de ordenação baseada na configuração do funil
  const sortCards = (cardsToSort: FunilCard[]) => {
    const ordenacao = (funilConfig as any)?.cards_ordenacao || 'ordem_chegada';
    
    return [...cardsToSort].sort((a, b) => {
      switch (ordenacao) {
        case 'atividade_proxima':
          // Cards com atividade atrasada primeiro, depois por data mais próxima
          if (a.status_atividade === 'atrasada' && b.status_atividade !== 'atrasada') return -1;
          if (b.status_atividade === 'atrasada' && a.status_atividade !== 'atrasada') return 1;
          if (a.proxima_atividade_data && b.proxima_atividade_data) {
            return new Date(a.proxima_atividade_data).getTime() - new Date(b.proxima_atividade_data).getTime();
          }
          if (a.proxima_atividade_data && !b.proxima_atividade_data) return -1;
          if (!a.proxima_atividade_data && b.proxima_atividade_data) return 1;
          return a.ordem - b.ordem;
          
        case 'data_previsao':
          // Cards com data mais próxima primeiro
          if (a.data_previsao && b.data_previsao) {
            return new Date(a.data_previsao).getTime() - new Date(b.data_previsao).getTime();
          }
          if (a.data_previsao && !b.data_previsao) return -1;
          if (!a.data_previsao && b.data_previsao) return 1;
          return a.ordem - b.ordem;
          
        case 'valor':
          // Cards com maior valor primeiro
          return (b.valor || 0) - (a.valor || 0);
          
        case 'prioridade':
          // Cards com maior prioridade primeiro
          const prioridadeOrdem = { urgente: 0, alta: 1, media: 2, baixa: 3 };
          return (prioridadeOrdem[a.prioridade] || 3) - (prioridadeOrdem[b.prioridade] || 3);
          
        case 'ordem_chegada':
        default:
          // Ordem padrão (ordem de chegada na coluna)
          return a.ordem - b.ordem;
      }
    });
  };
  
  const getCardsByEtapa = (etapaId: string) => {
    const cardsEtapa = filteredCards.filter(c => c.etapa_id === etapaId);
    return sortCards(cardsEtapa);
  };
  
  // Versão sem filtros para operações internas (mover, criar, etc)
  const getCardsByEtapaUnfiltered = (etapaId: string) => {
    return cards.filter(c => c.etapa_id === etapaId).sort((a, b) => a.ordem - b.ordem);
  };

  const handleOpenDialog = (etapaId: string, card?: FunilCard) => {
    setSelectedEtapaId(etapaId);
    if (card) {
      setEditingCard(card);
      setFormData({
        titulo: card.titulo,
        descricao: card.descricao || '',
        valor: card.valor?.toString() || '',
        cliente_id: card.cliente_id || '',
        data_previsao: card.data_previsao || '',
        prioridade: card.prioridade,
        responsavel_id: card.responsavel_id || ''
      });
    } else {
      setEditingCard(null);
      // Ao criar novo card, definir o usuário atual como responsável padrão
      setFormData({
        titulo: '',
        descricao: '',
        valor: '',
        cliente_id: '',
        data_previsao: '',
        prioridade: 'media',
        responsavel_id: profile?.id || ''
      });
    }
    setDialogOpen(true);
  };

  const handleSaveCard = async () => {
    // Validar campos obrigatórios conforme configuração do formulário
    const camposObrigatorios = funilConfig?.formulario_campos?.filter((c: any) => c.obrigatorio && c.visivel !== false) || [];
    
    for (const campo of camposObrigatorios) {
      let valor: any;
      switch (campo.campo) {
        case 'titulo': valor = formData.titulo?.trim(); break;
        case 'descricao': valor = formData.descricao?.trim(); break;
        case 'cliente': valor = formData.cliente_id; break;
        case 'valor': valor = formData.valor; break;
        case 'data_previsao': valor = formData.data_previsao; break;
        case 'responsavel': valor = formData.responsavel_id; break;
        default: valor = null;
      }
      
      if (!valor) {
        toast({
          title: 'Campo obrigatório',
          description: `Preencha o campo "${campo.label || campo.campo}".`,
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      if (editingCard) {
        // Ao editar: montar objeto apenas com campos que realmente mudaram
        // para nunca apagar dados existentes do card
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString()
        };

        // Comparar cada campo com o valor original do card
        if (formData.titulo !== (editingCard.titulo || '')) {
          updateData.titulo = formData.titulo;
        }
        if (formData.descricao !== (editingCard.descricao || '')) {
          updateData.descricao = formData.descricao || editingCard.descricao || null;
        }
        if (formData.valor !== (editingCard.valor?.toString() || '')) {
          updateData.valor = formData.valor ? parseFloat(formData.valor) : editingCard.valor || 0;
        }
        if (formData.cliente_id !== (editingCard.cliente_id || '')) {
          updateData.cliente_id = formData.cliente_id || null;
        }
        if (formData.data_previsao !== (editingCard.data_previsao || '')) {
          updateData.data_previsao = formData.data_previsao || null;
        }
        if (formData.prioridade !== editingCard.prioridade) {
          updateData.prioridade = formData.prioridade;
        }
        if (formData.responsavel_id !== (editingCard.responsavel_id || '')) {
          updateData.responsavel_id = formData.responsavel_id || null;
        }

        const { error } = await (supabase as any)
          .from('funil_cards')
          .update(updateData)
          .eq('id', editingCard.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Card atualizado com sucesso!' });
      } else {
        const cardData = {
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          valor: formData.valor ? parseFloat(formData.valor) : 0,
          cliente_id: formData.cliente_id || null,
          data_previsao: formData.data_previsao || null,
          prioridade: formData.prioridade,
          responsavel_id: formData.responsavel_id || profile?.id || null,
          updated_at: new Date().toISOString()
        };

        const cardsNaEtapa = getCardsByEtapaUnfiltered(selectedEtapaId);
        const etapaAtual = etapas.find(e => e.id === selectedEtapaId);
        
        const { data: novoCard, error } = await (supabase as any)
          .from('funil_cards')
          .insert({
            ...cardData,
            funil_id: funilId,
            etapa_id: selectedEtapaId,
            ordem: cardsNaEtapa.length,
            ativo: true,
            // status_negocio só para funis tipo negócio
            ...(funil?.tipo === 'negocio' ? { status_negocio: 'em_andamento' } : {})
          })
          .select()
          .single();

        if (error) throw error;

        // Registrar movimentação inicial (criação do card)
        if (novoCard?.id) {
          await (supabase as any)
            .from('funil_card_movimentacoes')
            .insert({
              card_id: novoCard.id,
              tipo: 'criacao',
              descricao: `Card criado na etapa "${etapaAtual?.nome || 'Inicial'}"`,
              etapa_destino_id: selectedEtapaId,
              usuario_id: profile?.id
            });
          
          // Executar automações para a etapa onde o card foi criado
          await executeAutomations(novoCard as FunilCard, selectedEtapaId);
        }

        toast({ title: 'Sucesso', description: 'Card criado com sucesso!' });
      }

      setDialogOpen(false);
      await loadCards();
    } catch (error) {
      console.error('Erro ao salvar card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o card.',
        variant: 'destructive'
      });
    }
  };

  // Função para salvar a comparação Vertical 365 x Treinamentos Avulsos no banco de dados
  const handleSalvarComparacao = async () => {
    if (!viewingCard?.id || !empresaId) {
      toast({
        title: 'Erro',
        description: 'Nenhum card selecionado ou empresa não identificada.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const dadosComparacao = {
        card_id: viewingCard.id,
        empresa_id: empresaId,
        // Vertical 365
        valor_campo_numerico: valorCampoNumerico,
        label_treinamentos_inclusos: labelTreinamentosInclusos,
        label_sistema_gestao_anual: labelSistemaGestaoAnual,
        label_implantacao: labelImplantacao,
        label_total_anual: labelTotalAnual,
        label_valor_mensal: labelValorMensal,
        label_campo_numerico: labelCampoNumerico,
        label_campo_valor: labelCampoValor,
        // Treinamentos Avulsos
        campo1_treinamento: campo1Treinamento,
        campo2_turmas: campo2Turmas,
        campo4_sistema_gestao: campo4SistemaGestao,
        campo5_implantacao: campo5Implantacao,
        label_valor_medio: labelValorMedio,
        label_quantidade_turmas: labelQuantidadeTurmas,
        label_valor_total_turmas: labelValorTotalTurmas,
        label_sistema_gestao_mensal: labelSistemaGestaoMensal,
        label_sistema_gestao_anual_avulso: labelSistemaGestaoAnualAvulso,
        label_implantacao_avulso: labelImplantacaoAvulso,
        label_valor_total_investido: labelValorTotalInvestido,
        // Pontos Fortes e Pontos a Desejar
        label_pontos_fortes: labelPontosFortes,
        texto_pontos_fortes: textoPontosFortes,
        label_pontos_desejar: labelPontosDesejar,
        texto_pontos_desejar: textoPontosDesejar,
        created_by: profile?.id
      };

      // Verificar se já existe uma comparação para este card
      const { data: existentes, error: selectError } = await (supabase as any)
        .from('funil_card_comparacoes')
        .select('id')
        .eq('card_id', viewingCard.id);

      if (selectError) {
        console.error('Erro ao verificar comparação existente:', selectError);
        throw selectError;
      }

      if (existentes && existentes.length > 0) {
        // Atualizar existente
        const { error } = await (supabase as any)
          .from('funil_card_comparacoes')
          .update(dadosComparacao)
          .eq('id', existentes[0].id);

        if (error) throw error;
      } else {
        // Inserir novo
        const { error } = await (supabase as any)
          .from('funil_card_comparacoes')
          .insert(dadosComparacao);

        if (error) throw error;
      }

      // Atualizar estado local também
      setComparacoesSalvasPorCard(prev => ({
        ...prev,
        [viewingCard.id]: {
          valorCampoNumerico,
          labelTreinamentosInclusos,
          labelSistemaGestaoAnual,
          labelImplantacao,
          labelTotalAnual,
          labelValorMensal,
          labelCampoNumerico,
          labelCampoValor,
          campo1Treinamento,
          campo2Turmas,
          campo4SistemaGestao,
          campo5Implantacao,
          labelValorMedio,
          labelQuantidadeTurmas,
          labelValorTotalTurmas,
          labelSistemaGestaoMensal,
          labelSistemaGestaoAnualAvulso,
          labelImplantacaoAvulso,
          labelValorTotalInvestido,
          labelPontosFortes,
          textoPontosFortes,
          labelPontosDesejar,
          textoPontosDesejar,
        }
      }));

      toast({
        title: 'Sucesso',
        description: 'Comparação salva com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar comparação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a comparação.',
        variant: 'destructive'
      });
    }
  };

  // Função para carregar comparação salva do banco de dados quando abrir o card
  const carregarComparacaoSalva = async (cardId: string) => {
    try {
      // Buscar do banco de dados
      const { data: registros, error } = await (supabase as any)
        .from('funil_card_comparacoes')
        .select('*')
        .eq('card_id', cardId);

      if (error) {
        console.error('Erro ao carregar comparação:', error);
        return;
      }

      const data = registros && registros.length > 0 ? registros[0] : null;

      if (data) {
        // Carregar dados do banco
        setValorCampoNumerico(data.valor_campo_numerico || '');
        setLabelTreinamentosInclusos(data.label_treinamentos_inclusos || 'Valor do Treinamento por turma');
        setLabelSistemaGestaoAnual(data.label_sistema_gestao_anual || 'Quantidade de turma');
        setLabelImplantacao(data.label_implantacao || 'Valor total das turmas de treinamento');
        setLabelTotalAnual(data.label_total_anual || 'Sistema de Gestão de Treinamentos anual');
        setLabelValorMensal(data.label_valor_mensal || 'Implantação do sistema');
        setLabelCampoNumerico(data.label_campo_numerico || 'Total Anual');
        setLabelCampoValor(data.label_campo_valor || 'Valor Mensal');
        setCampo1Treinamento(data.campo1_treinamento || '');
        setCampo2Turmas(data.campo2_turmas || '');
        setCampo4SistemaGestao(data.campo4_sistema_gestao || '');
        setCampo5Implantacao(data.campo5_implantacao || '');
        setLabelValorMedio(data.label_valor_medio || 'Valor médio de treinamento com C.H 8 horas por turma');
        setLabelQuantidadeTurmas(data.label_quantidade_turmas || 'Quantidade de turmas');
        setLabelValorTotalTurmas(data.label_valor_total_turmas || 'Valor total das turmas de treinamento');
        setLabelSistemaGestaoMensal(data.label_sistema_gestao_mensal || 'Sistema de Gestão de Treinamentos (Mensal)');
        setLabelSistemaGestaoAnualAvulso(data.label_sistema_gestao_anual_avulso || 'Valor total do sistema de gestão em 1 ano');
        setLabelImplantacaoAvulso(data.label_implantacao_avulso || 'Impantação do Sistema (Valor único)');
        setLabelValorTotalInvestido(data.label_valor_total_investido || 'Valor total investido durante o ano, de acordo com a necessidade do cliente');
        // Pontos Fortes e Pontos a Desejar
        setLabelPontosFortes(data.label_pontos_fortes || 'Pontos fortes do Vertical 365');
        setTextoPontosFortes(data.texto_pontos_fortes || '');
        setLabelPontosDesejar(data.label_pontos_desejar || 'Pontos a desejar do método convencional');
        setTextoPontosDesejar(data.texto_pontos_desejar || '');

        // Atualizar cache local
        setComparacoesSalvasPorCard(prev => ({
          ...prev,
          [cardId]: {
            valorCampoNumerico: data.valor_campo_numerico || '',
            labelTreinamentosInclusos: data.label_treinamentos_inclusos || 'Valor do Treinamento por turma',
            labelSistemaGestaoAnual: data.label_sistema_gestao_anual || 'Quantidade de turma',
            labelImplantacao: data.label_implantacao || 'Valor total das turmas de treinamento',
            labelTotalAnual: data.label_total_anual || 'Sistema de Gestão de Treinamentos anual',
            labelValorMensal: data.label_valor_mensal || 'Implantação do sistema',
            labelCampoNumerico: data.label_campo_numerico || 'Total Anual',
            labelCampoValor: data.label_campo_valor || 'Valor Mensal',
            campo1Treinamento: data.campo1_treinamento || '',
            campo2Turmas: data.campo2_turmas || '',
            campo4SistemaGestao: data.campo4_sistema_gestao || '',
            campo5Implantacao: data.campo5_implantacao || '',
            labelValorMedio: data.label_valor_medio || 'Valor médio de treinamento com C.H 8 horas por turma',
            labelQuantidadeTurmas: data.label_quantidade_turmas || 'Quantidade de turmas',
            labelValorTotalTurmas: data.label_valor_total_turmas || 'Valor total das turmas de treinamento',
            labelSistemaGestaoMensal: data.label_sistema_gestao_mensal || 'Sistema de Gestão de Treinamentos (Mensal)',
            labelSistemaGestaoAnualAvulso: data.label_sistema_gestao_anual_avulso || 'Valor total do sistema de gestão em 1 ano',
            labelImplantacaoAvulso: data.label_implantacao_avulso || 'Impantação do Sistema (Valor único)',
            labelValorTotalInvestido: data.label_valor_total_investido || 'Valor total investido durante o ano, de acordo com a necessidade do cliente',
            labelPontosFortes: data.label_pontos_fortes || 'Pontos fortes do Vertical 365',
            textoPontosFortes: data.texto_pontos_fortes || '',
            labelPontosDesejar: data.label_pontos_desejar || 'Pontos a desejar do método convencional',
            textoPontosDesejar: data.texto_pontos_desejar || '',
          }
        }));
      } else {
        // Se não houver dados no banco, verificar cache local ou resetar para valores padrão
        const comparacaoSalva = comparacoesSalvasPorCard[cardId];
        if (comparacaoSalva) {
          setValorCampoNumerico(comparacaoSalva.valorCampoNumerico || '');
          setLabelTreinamentosInclusos(comparacaoSalva.labelTreinamentosInclusos || 'Valor do Treinamento por turma');
          setLabelSistemaGestaoAnual(comparacaoSalva.labelSistemaGestaoAnual || 'Quantidade de turma');
          setLabelImplantacao(comparacaoSalva.labelImplantacao || 'Valor total das turmas de treinamento');
          setLabelTotalAnual(comparacaoSalva.labelTotalAnual || 'Sistema de Gestão de Treinamentos anual');
          setLabelValorMensal(comparacaoSalva.labelValorMensal || 'Implantação do sistema');
          setLabelCampoNumerico(comparacaoSalva.labelCampoNumerico || 'Total Anual');
          setLabelCampoValor(comparacaoSalva.labelCampoValor || 'Valor Mensal');
          setCampo1Treinamento(comparacaoSalva.campo1Treinamento || '');
          setCampo2Turmas(comparacaoSalva.campo2Turmas || '');
          setCampo4SistemaGestao(comparacaoSalva.campo4SistemaGestao || '');
          setCampo5Implantacao(comparacaoSalva.campo5Implantacao || '');
          setLabelValorMedio(comparacaoSalva.labelValorMedio || 'Valor médio de treinamento com C.H 8 horas por turma');
          setLabelQuantidadeTurmas(comparacaoSalva.labelQuantidadeTurmas || 'Quantidade de turmas');
          setLabelValorTotalTurmas(comparacaoSalva.labelValorTotalTurmas || 'Valor total das turmas de treinamento');
          setLabelSistemaGestaoMensal(comparacaoSalva.labelSistemaGestaoMensal || 'Sistema de Gestão de Treinamentos (Mensal)');
          setLabelSistemaGestaoAnualAvulso(comparacaoSalva.labelSistemaGestaoAnualAvulso || 'Valor total do sistema de gestão em 1 ano');
          setLabelImplantacaoAvulso(comparacaoSalva.labelImplantacaoAvulso || 'Impantação do Sistema (Valor único)');
          setLabelValorTotalInvestido(comparacaoSalva.labelValorTotalInvestido || 'Valor total investido durante o ano, de acordo com a necessidade do cliente');
          setLabelPontosFortes(comparacaoSalva.labelPontosFortes || 'Pontos fortes do Vertical 365');
          setTextoPontosFortes(comparacaoSalva.textoPontosFortes || '');
          setLabelPontosDesejar(comparacaoSalva.labelPontosDesejar || 'Pontos a desejar do método convencional');
          setTextoPontosDesejar(comparacaoSalva.textoPontosDesejar || '');
        } else {
          // Resetar para valores padrão
          setValorCampoNumerico('');
          setLabelTreinamentosInclusos('Valor do Treinamento por turma');
          setLabelSistemaGestaoAnual('Quantidade de turma');
          setLabelImplantacao('Valor total das turmas de treinamento');
          setLabelTotalAnual('Sistema de Gestão de Treinamentos anual');
          setLabelValorMensal('Implantação do sistema');
          setLabelCampoNumerico('Total Anual');
          setLabelCampoValor('Valor Mensal');
          setCampo1Treinamento('');
          setCampo2Turmas('');
          setCampo4SistemaGestao('');
          setCampo5Implantacao('');
          setLabelValorMedio('Valor médio de treinamento com C.H 8 horas por turma');
          setLabelQuantidadeTurmas('Quantidade de turmas');
          setLabelValorTotalTurmas('Valor total das turmas de treinamento');
          setLabelSistemaGestaoMensal('Sistema de Gestão de Treinamentos (Mensal)');
          setLabelSistemaGestaoAnualAvulso('Valor total do sistema de gestão em 1 ano');
          setLabelImplantacaoAvulso('Impantação do Sistema (Valor único)');
          setLabelValorTotalInvestido('Valor total investido durante o ano, de acordo com a necessidade do cliente');
          setLabelPontosFortes('Pontos fortes do Vertical 365');
          setTextoPontosFortes('');
          setLabelPontosDesejar('Pontos a desejar do método convencional');
          setTextoPontosDesejar('');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar comparação:', error);
    }
  };

  // Função para gerar e baixar PDF da comparação
  const handleGerarPDFComparacao = async () => {
    if (!comparacaoRef.current) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive'
      });
      return;
    }

    setGerandoPDF(true);

    try {
      const element = comparacaoRef.current;
      
      // Capturar o elemento como canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      // Nome do arquivo
      const clienteNome = viewingCard?.cliente?.nome || viewingCard?.titulo || 'comparacao';
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `Comparacao_Vertical365_${clienteNome}_${dataAtual}.pdf`;

      pdf.save(nomeArquivo);

      toast({
        title: 'Sucesso',
        description: 'PDF gerado e baixado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive'
      });
    } finally {
      setGerandoPDF(false);
    }
  };

  // Verificar se usuário pode excluir cards (apenas admin ou gestor)
  const podeExcluirCard = () => {
    return isAdministrador || isGestor || profile?.role === 'admin_vertical';
  };

  const handleDeleteCard = async (card: FunilCard) => {
    // Verificar permissão
    if (!podeExcluirCard()) {
      toast({
        title: 'Sem permissão',
        description: 'Apenas administradores ou gestores podem excluir cards.',
        variant: 'destructive'
      });
      return;
    }

    // Abrir modal de confirmação
    setCardToDelete(card);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('funil_cards')
        .delete()
        .eq('id', cardToDelete.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Card excluído com sucesso!' });
      setDeleteConfirmOpen(false);
      setCardToDelete(null);
      setDetailsDialogOpen(false);
      loadCards();
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o card.',
        variant: 'destructive'
      });
    }
  };

  const handleMoveCard = async (card: FunilCard, novaEtapaId: string) => {
    const etapaOrigem = etapas.find(e => e.id === card.etapa_id);
    const etapaDestino = etapas.find(e => e.id === novaEtapaId);

    // Bloquear se a etapa de origem é trancada
    if (etapaOrigem?.trancada) {
      toast({
        title: 'Etapa trancada',
        description: `Cards na etapa "${etapaOrigem.nome}" não podem ser movidos.`,
        variant: 'destructive'
      });
      return;
    }

    // Se destino é trancado, pedir confirmação
    if (etapaDestino?.trancada) {
      setPendingLockedMove({
        card,
        targetEtapaId: novaEtapaId,
        targetEtapaNome: etapaDestino.nome,
        source: 'details'
      });
      return;
    }

    try {
      // Cancelar agendamentos pendentes da etapa de origem
      await cancelarAgendamentosPendentes(card.id, card.etapa_id);

      const cardsNaNovaEtapa = getCardsByEtapaUnfiltered(novaEtapaId);
      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({
          etapa_id: novaEtapaId,
          ordem: cardsNaNovaEtapa.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      if (error) throw error;
      loadCards();
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o card.',
        variant: 'destructive'
      });
    }
  };

  // Executar movimentação pendente para etapa trancada (após confirmação)
  const executePendingLockedMove = async () => {
    if (!pendingLockedMove) return;
    const { card, targetEtapaId } = pendingLockedMove;

    try {
      // Cancelar agendamentos pendentes da etapa de origem
      await cancelarAgendamentosPendentes(card.id, card.etapa_id);

      const etapaOrigem = etapas.find(e => e.id === card.etapa_id);
      const etapaDestino = etapas.find(e => e.id === targetEtapaId);
      const cardsNaNovaEtapa = getCardsByEtapaUnfiltered(targetEtapaId);

      const { error } = await (supabase as any)
        .from('funil_cards')
        .update({
          etapa_id: targetEtapaId,
          ordem: cardsNaNovaEtapa.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      if (error) throw error;

      // Registrar movimentação
      await (supabase as any)
        .from('funil_card_movimentacoes')
        .insert({
          card_id: card.id,
          tipo: 'mudanca_etapa',
          descricao: `Movido de "${etapaOrigem?.nome || 'Desconhecida'}" para "${etapaDestino?.nome || 'Desconhecida'}" (etapa trancada)`,
          etapa_origem_id: card.etapa_id,
          etapa_destino_id: targetEtapaId,
          usuario_id: profile?.id,
        });

      // Atualizar viewingCard se estiver aberto
      if (viewingCard?.id === card.id) {
        setViewingCard({ ...viewingCard, etapa_id: targetEtapaId });
        await fetchMovimentacoes(card.id);
      }

      await loadCards();
      await executeAutomations({ ...card, etapa_id: targetEtapaId }, targetEtapaId);

      toast({ title: 'Sucesso', description: `Card movido para "${etapaDestino?.nome}".` });
    } catch (error) {
      console.error('Erro ao mover card para etapa trancada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o card.',
        variant: 'destructive'
      });
    } finally {
      setPendingLockedMove(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPrioridadeInfo = (prioridade: string) => {
    return PRIORIDADES.find(p => p.value === prioridade) || PRIORIDADES[1];
  };

  const getTotalPorEtapa = (etapaId: string) => {
    // Usar cards filtrados para mostrar total consistente com a visualização
    const cardsEtapa = getCardsByEtapa(etapaId);
    return cardsEtapa.reduce((acc, card) => acc + (card.valor || 0), 0);
  };

  // Função para copiar histórico de atividades e movimentações de um card para outro
  const copyCardHistory = async (sourceCardId: string, targetCardId: string) => {
    try {
      // Copiar atividades
      const { data: atividades } = await (supabase as any)
        .from('funil_card_atividades')
        .select('*')
        .eq('card_id', sourceCardId);

      if (atividades && atividades.length > 0) {
        const atividadesCopy = atividades.map((atividade: any) => ({
          card_id: targetCardId,
          tipo: atividade.tipo,
          descricao: atividade.descricao,
          prazo: atividade.prazo,
          horario: atividade.horario,
          status: atividade.status,
          usuario_id: atividade.usuario_id,
          responsavel_id: atividade.responsavel_id,
          created_at: atividade.created_at,
          updated_at: atividade.updated_at
        }));

        await (supabase as any)
          .from('funil_card_atividades')
          .insert(atividadesCopy);
      }

      // Copiar movimentações
      const { data: movimentacoes } = await (supabase as any)
        .from('funil_card_movimentacoes')
        .select('*')
        .eq('card_id', sourceCardId);

      if (movimentacoes && movimentacoes.length > 0) {
        const movimentacoesCopy = movimentacoes.map((mov: any) => ({
          card_id: targetCardId,
          etapa_origem_id: mov.etapa_origem_id,
          etapa_destino_id: mov.etapa_destino_id,
          usuario_id: mov.usuario_id,
          created_at: mov.created_at
        }));

        await (supabase as any)
          .from('funil_card_movimentacoes')
          .insert(movimentacoesCopy);
      }

      // Copiar etiquetas
      const { data: etiquetas } = await (supabase as any)
        .from('funil_card_etiquetas')
        .select('*')
        .eq('card_id', sourceCardId);

      if (etiquetas && etiquetas.length > 0) {
        const etiquetasCopy = etiquetas.map((etq: any) => ({
          card_id: targetCardId,
          etiqueta_id: etq.etiqueta_id
        }));

        await (supabase as any)
          .from('funil_card_etiquetas')
          .insert(etiquetasCopy);
      }

    } catch (error) {
      console.error('Erro ao copiar histórico do card:', error);
    }
  };

  // Função para executar automações de um funil específico (usado para cards duplicados/criados em outros funis)
  const executeAutomationsForFunil = async (card: FunilCard, targetFunilId: string, etapaId: string) => {
    try {
      // Buscar automações ativas para o funil de destino e etapa
      const { data: automacoes, error } = await (supabase as any)
        .from('automacoes')
        .select('*')
        .eq('funil_id', targetFunilId)
        .eq('etapa_id', etapaId)
        .eq('gatilho', 'negocio_chegar_etapa')
        .eq('ativo', true);

      if (error || !automacoes || automacoes.length === 0) {
        return;
      }

      // Executar apenas automações de agendar atividade (não duplicar novamente para evitar loop)
      for (const automacao of automacoes) {
        if (automacao.tipo === 'agendar_atividade') {
          const { tipo_atividade, quando, descricao, dias_personalizado } = automacao.acao_config;

          if (tipo_atividade) {
            const prazoDate = new Date();
            switch (quando) {
              case '1_dia':
                prazoDate.setDate(prazoDate.getDate() + 1);
                break;
              case '2_dias':
                prazoDate.setDate(prazoDate.getDate() + 2);
                break;
              case '3_dias':
                prazoDate.setDate(prazoDate.getDate() + 3);
                break;
              case '1_semana':
                prazoDate.setDate(prazoDate.getDate() + 7);
                break;
              case 'personalizado':
                prazoDate.setDate(prazoDate.getDate() + (dias_personalizado || 1));
                break;
              case 'mesmo_dia':
              default:
                break;
            }

            const prazoFormatado = prazoDate.toISOString().split('T')[0];

            const { error: atividadeError } = await (supabase as any)
              .from('funil_card_atividades')
              .insert({
                card_id: card.id,
                tipo: tipo_atividade,
                descricao: descricao || `Atividade automática: ${tipo_atividade}`,
                prazo: prazoFormatado,
                status: 'a_realizar',
                usuario_id: card.responsavel_id || profile?.id,
                responsavel_id: card.responsavel_id || profile?.id
              });

            if (!atividadeError) {
              toast({
                title: 'Automação executada',
                description: `Atividade "${tipo_atividade}" agendada automaticamente!`,
              });
              // Sempre recarregar atividades do card (se estiver aberto)
              if (viewingCard?.id === card.id) {
                fetchAtividades(card.id);
              }
            }
          }
        }
      }
    } catch {
      // Erro silencioso - automação não crítica
    }
  };

  // Função para cancelar agendamentos pendentes quando card sai da etapa
  const cancelarAgendamentosPendentes = async (cardId: string, etapaOrigemId: string) => {
    try {
      // Buscar automações da etapa de origem que são do tipo agendado
      const { data: automacoesEtapa } = await (supabase as any)
        .from('automacoes')
        .select('id')
        .eq('funil_id', funilId)
        .eq('etapa_id', etapaOrigemId)
        .eq('gatilho', 'negocio_chegar_etapa')
        .in('tipo', ['mover_card_agendado', 'duplicar_card_agendado'])
        .eq('ativo', true);

      if (!automacoesEtapa || automacoesEtapa.length === 0) return;

      const automacaoIds = automacoesEtapa.map((a: { id: string }) => a.id);

      // Deletar agendamentos pendentes (não executados) para este card
      const { error, count } = await (supabase as any)
        .from('automacoes_execucoes')
        .delete()
        .eq('card_id', cardId)
        .eq('executado', false)
        .in('automacao_id', automacaoIds);

      if (!error && count && count > 0) {
        console.log(`[Automações] Cancelados ${count} agendamento(s) pendente(s) para card ${cardId}`);
      }
    } catch (err) {
      console.error('[Automações] Erro ao cancelar agendamentos:', err);
    }
  };

  // Função para executar automações quando card chega em uma etapa
  const executeAutomations = async (card: FunilCard, etapaId: string) => {
    try {
      console.log('[Automações] Buscando automações para funil:', funilId, 'etapa:', etapaId);
      
      // Buscar automações ativas para este funil e etapa
      const { data: automacoes, error } = await (supabase as any)
        .from('automacoes')
        .select('*')
        .eq('funil_id', funilId)
        .eq('etapa_id', etapaId)
        .eq('gatilho', 'negocio_chegar_etapa')
        .eq('ativo', true);

      console.log('[Automações] Resultado:', { automacoes, error });

      if (error || !automacoes || automacoes.length === 0) {
        console.log('[Automações] Nenhuma automação encontrada ou erro');
        return;
      }

      // Helper: buscar nomes do funil e etapa de destino
      const getDestinoNomes = async (funilDestinoId: string, etapaDestinoId: string) => {
        const [funilRes, etapaRes] = await Promise.all([
          (supabase as any).from('funis').select('nome, setores(nome)').eq('id', funilDestinoId).single(),
          (supabase as any).from('funil_etapas').select('nome').eq('id', etapaDestinoId).single()
        ]);
        // Se não encontrou etapa em funil_etapas, tentar em contas_receber_colunas
        let etapaNome = etapaRes.data?.nome;
        if (!etapaNome) {
          const { data: colunaData } = await (supabase as any)
            .from('contas_receber_colunas')
            .select('nome')
            .eq('id', etapaDestinoId)
            .single();
          etapaNome = colunaData?.nome;
        }
        return {
          funilNome: funilRes.data?.nome || 'Funil',
          setorNome: funilRes.data?.setores?.nome || '',
          etapaNome: etapaNome || 'Etapa'
        };
      };

      // Helper: verificar se funil destino é "Contas a Receber" do Financeiro
      const isContasReceberFunil = async (funilDestinoId: string) => {
        const { data } = await (supabase as any)
          .from('funis')
          .select('nome, setores(nome)')
          .eq('id', funilDestinoId)
          .single();
        return data?.nome?.toLowerCase().includes('contas a receber') && 
               data?.setores?.nome?.toLowerCase().includes('financeiro');
      };

      // Executar cada automação
      for (const automacao of automacoes) {
        if (automacao.tipo === 'duplicar_card') {
          // Duplicar card para outro funil/etapa
          const { funil_destino_id, etapa_destino_id } = automacao.acao_config;

          if (funil_destino_id && etapa_destino_id) {
            const isContasReceber = await isContasReceberFunil(funil_destino_id);
            
            if (isContasReceber) {
              // Destino é Contas a Receber: inserir na tabela contas_receber
              const hoje = new Date().toISOString().split('T')[0];
              const numero = `CR-${Date.now().toString(36).toUpperCase()}`;
              
              // Buscar coluna_id correspondente na tabela contas_receber_colunas
              // O etapa_destino_id pode ser um funil_etapas.id, precisamos mapear pelo nome
              let colunaId = etapa_destino_id;
              const { data: etapaData } = await (supabase as any)
                .from('funil_etapas')
                .select('nome')
                .eq('id', etapa_destino_id)
                .single();
              if (etapaData?.nome) {
                const { data: colunaData } = await (supabase as any)
                  .from('contas_receber_colunas')
                  .select('id')
                  .eq('empresa_id', empresaId)
                  .ilike('nome', etapaData.nome)
                  .single();
                if (colunaData) colunaId = colunaData.id;
              }
              
              // Buscar dados do cliente
              let clienteNome = card.titulo || 'Sem cliente';
              let clienteCnpj = '';
              if (card.cliente_id) {
                const { data: clienteData } = await (supabase as any)
                  .from('clientes_sst')
                  .select('nome, cnpj')
                  .eq('id', card.cliente_id)
                  .single();
                if (clienteData) {
                  clienteNome = clienteData.nome || clienteNome;
                  clienteCnpj = clienteData.cnpj || '';
                }
              }

              const { error: insertError } = await (supabase as any)
                .from('contas_receber')
                .insert({
                  empresa_id: empresaId,
                  coluna_id: colunaId,
                  numero,
                  cliente_id: card.cliente_id || null,
                  cliente_nome: clienteNome,
                  cliente_cnpj: clienteCnpj,
                  servico_produto: card.descricao || card.titulo || '',
                  valor: card.valor || 0,
                  valor_pago: 0,
                  data_emissao: hoje,
                  observacoes: `Automação: duplicado do funil "${funil?.nome}" - Card: ${card.titulo}`,
                  origem: 'closer',
                  origem_card_id: card.id,
                  origem_kanban: funil?.nome || '',
                  closer_card_id: card.id,
                  ordem: 0,
                  arquivado: false,
                });

              if (insertError) {
                toast({
                  title: 'Erro na automação',
                  description: `Não foi possível criar conta a receber: ${insertError.message}`,
                  variant: 'destructive'
                });
              } else {
                const { funilNome, etapaNome } = await getDestinoNomes(funil_destino_id, etapa_destino_id);
                toast({
                  title: 'Automação executada',
                  description: `Card "${card.titulo}" duplicado para ${etapaNome} do ${funilNome} (Financeiro)`,
                });
                await loadCards();
              }
            } else {
              // Destino é um funil normal: inserir em funil_cards
              const { data: cardsDestino } = await (supabase as any)
                .from('funil_cards')
                .select('id')
                .eq('funil_id', funil_destino_id)
                .eq('etapa_id', etapa_destino_id)
                .eq('ativo', true);

              const ordemDestino = cardsDestino?.length || 0;

              const cardData = {
                funil_id: funil_destino_id,
                etapa_id: etapa_destino_id,
                titulo: card.titulo,
                descricao: card.descricao,
                valor: card.valor,
                cliente_id: card.cliente_id,
                responsavel_id: card.responsavel_id,
                data_previsao: card.data_previsao,
                prioridade: card.prioridade,
                ordem: ordemDestino,
                ativo: true
              };

              const { data: newCardData, error: insertError } = await (supabase as any)
                .from('funil_cards')
                .insert(cardData)
                .select()
                .single();

              if (insertError) {
                toast({
                  title: 'Erro na automação',
                  description: `Não foi possível duplicar o card: ${insertError.message}`,
                  variant: 'destructive'
                });
              } else {
                if (newCardData) {
                  await copyCardHistory(card.id, newCardData.id);
                }
                
                const { funilNome, etapaNome } = await getDestinoNomes(funil_destino_id, etapa_destino_id);
                toast({
                  title: 'Automação executada',
                  description: `Card "${card.titulo}" duplicado para ${etapaNome} do ${funilNome}`,
                });
                await loadCards();
                
                if (newCardData) {
                  await executeAutomationsForFunil(newCardData as FunilCard, funil_destino_id, etapa_destino_id);
                }
              }
            }
          }
        } else if (automacao.tipo === 'mover_card') {
          // Mover card para outro funil/etapa (transferência - mantém histórico)
          const { funil_destino_id, etapa_destino_id } = automacao.acao_config;

          if (funil_destino_id && etapa_destino_id) {
            // Contar cards na etapa de destino para definir ordem
            const { data: cardsDestino } = await (supabase as any)
              .from('funil_cards')
              .select('id')
              .eq('funil_id', funil_destino_id)
              .eq('etapa_id', etapa_destino_id)
              .eq('ativo', true);

            const ordemDestino = cardsDestino?.length || 0;

            // Atualizar o card para o novo funil/etapa (mantém o mesmo ID e histórico)
            const { error: updateError } = await (supabase as any)
              .from('funil_cards')
              .update({
                funil_id: funil_destino_id,
                etapa_id: etapa_destino_id,
                ordem: ordemDestino
              })
              .eq('id', card.id);

            if (updateError) {
              toast({
                title: 'Erro na automação',
                description: `Não foi possível mover o card: ${updateError.message}`,
                variant: 'destructive'
              });
            } else {
              const { funilNome, etapaNome } = await getDestinoNomes(funil_destino_id, etapa_destino_id);
              toast({
                title: 'Automação executada',
                description: `Card "${card.titulo}" transferido para ${etapaNome} do ${funilNome}`,
              });
              // Recarregar cards para refletir a mudança
              await loadCards();
              
              // Executar automações do funil de destino para o card movido
              const movedCard = { ...card, funil_id: funil_destino_id, etapa_id: etapa_destino_id };
              await executeAutomationsForFunil(movedCard, funil_destino_id, etapa_destino_id);
            }
          }
        } else if (automacao.tipo === 'duplicar_card_agendado' || automacao.tipo === 'mover_card_agendado') {
          // Agendar duplicação/movimentação para X dias depois no horário exato
          const { agendamento_dias, agendamento_hora } = automacao.acao_config;
          
          console.log('[Automações] Tipo agendado detectado:', automacao.tipo, { agendamento_dias, agendamento_hora });

          if (agendamento_dias !== undefined && agendamento_dias !== null && agendamento_hora) {
            // Calcular data de execução: hoje + X dias no horário exato
            const dataExecucao = new Date();
            dataExecucao.setDate(dataExecucao.getDate() + agendamento_dias);
            const dataStr = dataExecucao.toISOString().split('T')[0];
            const executarEm = `${dataStr}T${agendamento_hora}`;
            
            console.log('[Automações] Agendando para:', executarEm);

            // Verificar se já existe agendamento para este card/automação
            const { data: existente } = await (supabase as any)
              .from('automacoes_execucoes')
              .select('id, executado')
              .eq('automacao_id', automacao.id)
              .eq('card_id', card.id)
              .maybeSingle();

            if (existente) {
              if (!existente.executado) {
                // Agendamento pendente já existe - não criar novo
                console.log('[Automações] Agendamento pendente já existe para este card/automação');
                return;
              } else {
                // Registro já executado - deletar para permitir novo agendamento
                console.log('[Automações] Deletando registro executado para permitir novo agendamento');
                await (supabase as any)
                  .from('automacoes_execucoes')
                  .delete()
                  .eq('id', existente.id);
              }
            }

            const { error: execError } = await (supabase as any)
              .from('automacoes_execucoes')
              .insert({
                automacao_id: automacao.id,
                card_id: card.id,
                empresa_id: empresaId,
                executar_em: executarEm,
                executado: false
              });

            if (execError) {
              // Ignorar erro de duplicata silenciosamente
              if (execError.code !== '23505') {
                console.error('Erro ao agendar automação:', execError);
              }
            } else {
              const acaoLabel = automacao.tipo === 'duplicar_card_agendado' ? 'duplicação' : 'movimentação';
              toast({
                title: 'Automação agendada',
                description: `${acaoLabel.charAt(0).toUpperCase() + acaoLabel.slice(1)} do card "${card.titulo}" agendada para ${agendamento_dias} dia(s) às ${agendamento_hora}`,
              });
            }
          }
        } else if (automacao.tipo === 'criar_negocio') {
          // Criar negócio em outro funil
          const { funil_destino_id, etapa_destino_id } = automacao.acao_config;

          if (funil_destino_id) {
            let targetEtapaId = etapa_destino_id;

            // Se não tiver etapa de destino configurada, buscar a primeira etapa do funil
            if (!targetEtapaId) {
              const { data: etapasDestino } = await (supabase as any)
                .from('funil_etapas')
                .select('id')
                .eq('funil_id', funil_destino_id)
                .eq('ativo', true)
                .order('ordem')
                .limit(1);

              if (etapasDestino && etapasDestino.length > 0) {
                targetEtapaId = etapasDestino[0].id;
              }
            }

            if (targetEtapaId) {
              // Contar cards na etapa de destino
              const { data: cardsDestino } = await (supabase as any)
                .from('funil_cards')
                .select('id')
                .eq('funil_id', funil_destino_id)
                .eq('etapa_id', targetEtapaId)
                .eq('ativo', true);

              const ordemDestino = cardsDestino?.length || 0;

              // Criar novo card
              const { data: newCardData, error: insertError } = await (supabase as any)
                .from('funil_cards')
                .insert({
                  funil_id: funil_destino_id,
                  etapa_id: targetEtapaId,
                  titulo: card.titulo,
                  descricao: card.descricao,
                  valor: card.valor,
                  cliente_id: card.cliente_id,
                  responsavel_id: card.responsavel_id,
                  data_previsao: card.data_previsao,
                  prioridade: card.prioridade,
                  ordem: ordemDestino,
                  ativo: true
                })
                .select()
                .single();

              if (!insertError) {
                // Copiar histórico de atividades, movimentações e etiquetas do card original
                if (newCardData) {
                  await copyCardHistory(card.id, newCardData.id);
                }
                
                toast({
                  title: 'Automação executada',
                  description: `Negócio criado automaticamente com histórico!`,
                });
                // Recarregar cards para refletir a mudança
                await loadCards();
                
                // Executar automações do funil de destino para o novo card
                if (newCardData) {
                  await executeAutomationsForFunil(newCardData as FunilCard, funil_destino_id, targetEtapaId);
                }
              }
            }
          }
        } else if (automacao.tipo === 'agendar_atividade') {
          // Agendar atividade automaticamente
          const { tipo_atividade, quando, descricao, dias_personalizado } = automacao.acao_config;

          if (tipo_atividade) {
            // Calcular data da atividade baseado no "quando"
            const prazoDate = new Date();
            switch (quando) {
              case '1_dia':
                prazoDate.setDate(prazoDate.getDate() + 1);
                break;
              case '2_dias':
                prazoDate.setDate(prazoDate.getDate() + 2);
                break;
              case '3_dias':
                prazoDate.setDate(prazoDate.getDate() + 3);
                break;
              case '1_semana':
                prazoDate.setDate(prazoDate.getDate() + 7);
                break;
              case 'personalizado':
                prazoDate.setDate(prazoDate.getDate() + (dias_personalizado || 1));
                break;
              case 'mesmo_dia':
              default:
                // Mantém a data atual
                break;
            }

            const prazoFormatado = prazoDate.toISOString().split('T')[0];

            // Criar atividade
            const { error: atividadeError } = await (supabase as any)
              .from('funil_card_atividades')
              .insert({
                card_id: card.id,
                tipo: tipo_atividade,
                descricao: descricao || `Atividade automática: ${tipo_atividade}`,
                prazo: prazoFormatado,
                status: 'a_realizar',
                usuario_id: card.responsavel_id || profile?.id,
                responsavel_id: card.responsavel_id || profile?.id
              });

            if (!atividadeError) {
              toast({
                title: 'Automação executada',
                description: `Atividade "${tipo_atividade}" agendada automaticamente!`,
              });
              // Sempre recarregar atividades do card (se estiver aberto)
              if (viewingCard?.id === card.id) {
                fetchAtividades(card.id);
              }
            }
          }
        }
      }
    } catch {
      // Erro silencioso - automação não crítica
    }
  };

  // Função para executar automações baseadas no status do negócio (ganho/perdido)
  const executeAutomationsByStatus = async (card: FunilCard, status: 'ganho' | 'perdido') => {
    try {
      const gatilho = status === 'ganho' ? 'negocio_ganho' : 'negocio_perdido';

      // Buscar automações ativas para este funil e gatilho
      const { data: automacoes, error } = await (supabase as any)
        .from('automacoes')
        .select('*')
        .eq('funil_id', funilId)
        .eq('gatilho', gatilho)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar automações:', error);
        return;
      }
      
      if (!automacoes || automacoes.length === 0) {
        return;
      }

      // Executar cada automação
      for (const automacao of automacoes) {
        if (automacao.tipo === 'criar_negocio') {
          // Criar negócio em outro funil
          const { funil_destino_id, etapa_destino_id } = automacao.acao_config;

          if (funil_destino_id) {
            let targetEtapaId = etapa_destino_id;

            // Se não tiver etapa de destino configurada, buscar a primeira etapa do funil
            if (!targetEtapaId) {
              const { data: etapasDestino } = await (supabase as any)
                .from('funil_etapas')
                .select('id')
                .eq('funil_id', funil_destino_id)
                .eq('ativo', true)
                .order('ordem')
                .limit(1);

              if (etapasDestino && etapasDestino.length > 0) {
                targetEtapaId = etapasDestino[0].id;
              }
            }

            if (targetEtapaId) {
              // Contar cards na etapa de destino
              const { data: cardsDestino } = await (supabase as any)
                .from('funil_cards')
                .select('id')
                .eq('funil_id', funil_destino_id)
                .eq('etapa_id', targetEtapaId)
                .eq('ativo', true);

              const ordemDestino = cardsDestino?.length || 0;

              // Criar novo card
              const { data: newCardData, error: insertError } = await (supabase as any)
                .from('funil_cards')
                .insert({
                  funil_id: funil_destino_id,
                  etapa_id: targetEtapaId,
                  titulo: card.titulo,
                  descricao: card.descricao,
                  valor: card.valor,
                  cliente_id: card.cliente_id,
                  responsavel_id: card.responsavel_id,
                  data_previsao: card.data_previsao,
                  prioridade: card.prioridade,
                  ordem: ordemDestino,
                  ativo: true
                })
                .select()
                .single();

              if (insertError) {
                console.error('Erro ao criar negócio via automação:', insertError);
                toast({
                  title: 'Erro na automação',
                  description: `Não foi possível criar o negócio: ${insertError.message}`,
                  variant: 'destructive'
                });
              } else {
                // Copiar histórico de atividades, movimentações e etiquetas do card original
                if (newCardData) {
                  await copyCardHistory(card.id, newCardData.id);
                }
                
                toast({
                  title: 'Automação executada',
                  description: `Negócio duplicado automaticamente para outro funil com histórico!`,
                });
                // Recarregar cards para refletir a mudança
                await loadCards();
                
                // Executar automações do funil de destino para o novo card
                if (newCardData) {
                  await executeAutomationsForFunil(newCardData as FunilCard, funil_destino_id, targetEtapaId);
                }
              }
            }
          }
        } else if (automacao.tipo === 'agendar_atividade') {
          // Agendar atividade automaticamente
          const { tipo_atividade, quando, descricao, dias_personalizado } = automacao.acao_config;

          if (tipo_atividade) {
            const prazoDate = new Date();
            switch (quando) {
              case '1_dia':
                prazoDate.setDate(prazoDate.getDate() + 1);
                break;
              case '2_dias':
                prazoDate.setDate(prazoDate.getDate() + 2);
                break;
              case '3_dias':
                prazoDate.setDate(prazoDate.getDate() + 3);
                break;
              case '1_semana':
                prazoDate.setDate(prazoDate.getDate() + 7);
                break;
              case 'personalizado':
                prazoDate.setDate(prazoDate.getDate() + (dias_personalizado || 1));
                break;
              default:
                break;
            }

            const prazoFormatado = prazoDate.toISOString().split('T')[0];

            const { error: atividadeError } = await (supabase as any)
              .from('funil_card_atividades')
              .insert({
                card_id: card.id,
                tipo: tipo_atividade,
                descricao: descricao || `Atividade automática: ${tipo_atividade}`,
                prazo: prazoFormatado,
                status: 'a_realizar',
                usuario_id: card.responsavel_id || profile?.id,
                responsavel_id: card.responsavel_id || profile?.id
              });

            if (!atividadeError) {
              toast({
                title: 'Automação executada',
                description: `Atividade agendada automaticamente!`,
              });
              // Sempre recarregar atividades do card (se estiver aberto)
              if (viewingCard?.id === card.id) {
                fetchAtividades(card.id);
              }
            }
          }
        }
      }
    } catch {
      // Erro silencioso - automação não crítica
    }
  };

  // Função para executar automações quando uma atividade é finalizada
  const executeAutomationsByAtividadeFinalizada = async (card: FunilCard) => {
    try {
      // Buscar automações ativas para este funil com gatilho de atividade finalizada
      const { data: automacoes, error } = await (supabase as any)
        .from('automacoes')
        .select('*')
        .eq('funil_id', funilId)
        .eq('gatilho', 'atividade_finalizada')
        .eq('ativo', true);

      if (error || !automacoes || automacoes.length === 0) {
        return;
      }

      // Executar cada automação (filtrar por etapa se configurada)
      for (const automacao of automacoes) {
        // Se a automação tem etapa_id configurada, verificar se o card está nessa etapa
        if (automacao.etapa_id && automacao.etapa_id !== card.etapa_id) {
          continue; // Pular esta automação se o card não está na etapa configurada
        }

        if (automacao.tipo === 'agendar_atividade') {
          const { tipo_atividade, quando, descricao, dias_personalizado } = automacao.acao_config;

          if (tipo_atividade) {
            const prazoDate = new Date();
            switch (quando) {
              case '1_dia':
                prazoDate.setDate(prazoDate.getDate() + 1);
                break;
              case '2_dias':
                prazoDate.setDate(prazoDate.getDate() + 2);
                break;
              case '3_dias':
                prazoDate.setDate(prazoDate.getDate() + 3);
                break;
              case '1_semana':
                prazoDate.setDate(prazoDate.getDate() + 7);
                break;
              case 'personalizado':
                prazoDate.setDate(prazoDate.getDate() + (dias_personalizado || 1));
                break;
              case 'mesmo_dia':
              default:
                break;
            }

            const prazoFormatado = prazoDate.toISOString().split('T')[0];

            const { error: atividadeError } = await (supabase as any)
              .from('funil_card_atividades')
              .insert({
                card_id: card.id,
                tipo: tipo_atividade,
                descricao: descricao || `Atividade automática: ${tipo_atividade}`,
                prazo: prazoFormatado,
                status: 'a_realizar',
                usuario_id: card.responsavel_id || profile?.id,
                responsavel_id: card.responsavel_id || profile?.id
              });

            if (!atividadeError) {
              toast({
                title: 'Automação executada',
                description: `Nova atividade "${tipo_atividade}" agendada!`,
              });
              // Recarregar atividades (se card estiver aberto)
              if (viewingCard?.id === card.id) {
                fetchAtividades(card.id);
              }
            }
          }
        }
      }
    } catch {
      // Erro silencioso - automação não crítica
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
      // Salvar a etapa original ANTES de qualquer modificação
      setOriginalEtapaId(activeData.etapaId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'card') return;

    const activeCard = activeData.card as FunilCard;
    let targetEtapaId: string | null = null;

    // Determinar a etapa de destino
    if (overData?.type === 'card') {
      targetEtapaId = overData.etapaId;
    } else if (overData?.type === 'column') {
      targetEtapaId = overData.etapa.id;
    } else if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetEtapaId = over.id.replace('column-', '');
    }

    if (targetEtapaId && activeCard.etapa_id !== targetEtapaId) {
      // Mover card para outra coluna durante o drag
      setCards(prevCards => {
        return prevCards.map(card => 
          card.id === activeCard.id 
            ? { ...card, etapa_id: targetEtapaId! }
            : card
        );
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const savedOriginalEtapaId = originalEtapaId; // Capturar antes de limpar
    setActiveCard(null);
    setOriginalEtapaId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Reordenar colunas
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeEtapa = activeData.etapa as Etapa;
      const overEtapa = overData.etapa as Etapa;

      if (activeEtapa.id !== overEtapa.id) {
        const oldIndex = etapas.findIndex(e => e.id === activeEtapa.id);
        const newIndex = etapas.findIndex(e => e.id === overEtapa.id);

        const newEtapas = arrayMove(etapas, oldIndex, newIndex);
        setEtapas(newEtapas);

        // Salvar nova ordem no banco
        try {
          for (let i = 0; i < newEtapas.length; i++) {
            await (supabase as any)
              .from('funil_etapas')
              .update({ ordem: i })
              .eq('id', newEtapas[i].id);
          }
        } catch (error) {
          console.error('Erro ao reordenar colunas:', error);
          loadEtapas(); // Recarregar em caso de erro
        }
      }
      return;
    }

    // Reordenar/mover cards
    if (activeData?.type === 'card') {
      const activeCard = activeData.card as FunilCard;
      let targetEtapaId = activeCard.etapa_id; // Pode ter sido atualizado durante dragOver
      let targetIndex = -1;

      // Determinar destino (usar versão sem filtros para operações de drag)
      if (overData?.type === 'card') {
        const overCard = overData.card as FunilCard;
        targetEtapaId = overCard.etapa_id;
        const etapaCards = getCardsByEtapaUnfiltered(targetEtapaId);
        targetIndex = etapaCards.findIndex(c => c.id === overCard.id);
      } else if (overData?.type === 'column') {
        targetEtapaId = overData.etapa.id;
        targetIndex = getCardsByEtapaUnfiltered(targetEtapaId).length;
      }

      // Bloquear se a etapa de ORIGEM é trancada (não pode sair)
      if (savedOriginalEtapaId && savedOriginalEtapaId !== targetEtapaId) {
        const etapaOrigem = etapas.find(e => e.id === savedOriginalEtapaId);
        if (etapaOrigem?.trancada) {
          // Reverter card para etapa original
          setCards(prevCards => prevCards.map(c =>
            c.id === activeCard.id ? { ...c, etapa_id: savedOriginalEtapaId } : c
          ));
          toast({
            title: 'Etapa trancada',
            description: `Cards na etapa "${etapaOrigem.nome}" não podem ser movidos.`,
            variant: 'destructive'
          });
          return;
        }
      }

      // Se o destino é uma etapa trancada e é diferente da origem, pedir confirmação
      if (savedOriginalEtapaId && savedOriginalEtapaId !== targetEtapaId) {
        const targetEtapa = etapas.find(e => e.id === targetEtapaId);
        if (targetEtapa?.trancada) {
          // Reverter card para etapa original
          setCards(prevCards => prevCards.map(c =>
            c.id === activeCard.id ? { ...c, etapa_id: savedOriginalEtapaId } : c
          ));
          // Mostrar confirmação
          setPendingLockedMove({
            card: activeCard,
            targetEtapaId,
            targetEtapaNome: targetEtapa.nome,
            source: 'drag'
          });
          return;
        }
      }

      // Atualizar estado local
      const updatedCards = cards.map(card => {
        if (card.id === activeCard.id) {
          return { ...card, etapa_id: targetEtapaId };
        }
        return card;
      });

      // Reordenar cards na etapa de destino
      const etapaCards = updatedCards
        .filter(c => c.etapa_id === targetEtapaId)
        .sort((a, b) => a.ordem - b.ordem);

      const activeIndex = etapaCards.findIndex(c => c.id === activeCard.id);
      if (activeIndex !== -1 && targetIndex !== -1 && activeIndex !== targetIndex) {
        const reorderedCards = arrayMove(etapaCards, activeIndex, targetIndex);
        
        // Atualizar ordem
        reorderedCards.forEach((card, index) => {
          const cardInList = updatedCards.find(c => c.id === card.id);
          if (cardInList) cardInList.ordem = index;
        });
      }

      setCards(updatedCards);

      // Salvar no banco
      try {
        const cardsToUpdate = updatedCards.filter(c => c.etapa_id === targetEtapaId);
        for (let i = 0; i < cardsToUpdate.length; i++) {
          await (supabase as any)
            .from('funil_cards')
            .update({ 
              etapa_id: targetEtapaId,
              ordem: i,
              updated_at: new Date().toISOString()
            })
            .eq('id', cardsToUpdate[i].id);
        }

        // Verificar e executar automações se o card mudou de etapa
        if (savedOriginalEtapaId && savedOriginalEtapaId !== targetEtapaId) {
          // Cancelar agendamentos pendentes da etapa de origem
          await cancelarAgendamentosPendentes(activeCard.id, savedOriginalEtapaId);

          // Registrar movimentação de mudança de etapa
          const etapaOrigem = etapas.find(e => e.id === savedOriginalEtapaId);
          const etapaDestino = etapas.find(e => e.id === targetEtapaId);
          
          await (supabase as any)
            .from('funil_card_movimentacoes')
            .insert({
              card_id: activeCard.id,
              tipo: 'mudanca_etapa',
              descricao: `Movido de "${etapaOrigem?.nome || 'Desconhecida'}" para "${etapaDestino?.nome || 'Desconhecida'}"`,
              etapa_origem_id: savedOriginalEtapaId,
              etapa_destino_id: targetEtapaId,
              usuario_id: profile?.id
            });
          
          await executeAutomations(activeCard, targetEtapaId);
        }
      } catch (error) {
        loadCards(); // Recarregar em caso de erro
      }
    }
  };

  if (!funil) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando funil...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{funilConfig?.titulo_pagina || funil.nome}</h1>
            <p className="text-muted-foreground text-sm">
              {funilConfig?.descricao_pagina || `${funil.setor?.nome} • ${funil.tipo === 'negocio' ? 'Funil de Negócio' : 'Fluxo de Trabalho'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão Novo Card */}
          {(funilConfig?.botao_adicionar_visivel !== false) && etapas.length > 0 && (
            <Button
              onClick={() => handleOpenDialog(etapas[0].id)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {funilConfig?.botao_adicionar_texto || 'Novo Card'}
            </Button>
          )}
          {/* Botão Nova Etapa */}
          <Button
            variant="outline"
            onClick={() => setCriarEtapaDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Etapa
          </Button>
          {/* Toggle de Modo de Visualização */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={modoVisualizacao === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setModoVisualizacao('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant={modoVisualizacao === 'lista' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setModoVisualizacao('lista')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
          </div>
          {/* Dropdown de Ordenação Rápida */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                title="Ordenar Cards"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Ordenar Cards por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { id: 'ordem_chegada', label: 'Ordem de Chegada' },
                { id: 'atividade_proxima', label: 'Atividade Mais Próxima' },
                { id: 'data_previsao', label: 'Data de Previsão' },
                { id: 'valor', label: 'Valor' },
                { id: 'prioridade', label: 'Prioridade' },
              ].map((opcao) => (
                <DropdownMenuItem
                  key={opcao.id}
                  onClick={async () => {
                    // Atualizar estado local
                    setFunilConfig(prev => ({ ...prev, cards_ordenacao: opcao.id }));
                    // Salvar no banco
                    try {
                      const { data: existingConfig } = await (supabase as any)
                        .from('funis_configuracoes')
                        .select('id')
                        .eq('funil_id', funilId)
                        .maybeSingle();
                      
                      if (existingConfig?.id) {
                        await (supabase as any)
                          .from('funis_configuracoes')
                          .update({ cards_ordenacao: opcao.id })
                          .eq('id', existingConfig.id);
                      } else {
                        await (supabase as any)
                          .from('funis_configuracoes')
                          .insert({ funil_id: funilId, empresa_id: empresaId, cards_ordenacao: opcao.id });
                      }
                    } catch (error) {
                      console.error('Erro ao salvar ordenação:', error);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {(funilConfig as any)?.cards_ordenacao === opcao.id && (
                    <Check className="h-4 w-4" />
                  )}
                  <span className={(funilConfig as any)?.cards_ordenacao === opcao.id ? 'font-medium' : ''}>
                    {opcao.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setConfigDialogOpen(true)}
            title="Configurações do Funil"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dashboard de Métricas - usa filteredCards para refletir os filtros */}
      {(funilConfig?.dashboard_visivel !== false) && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 flex-shrink-0">
          {funilConfig?.dashboard_metricas?.includes('total_cards') && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  {filteredCards.length === cards.length ? 'Total de Cards' : 'Cards Filtrados'}
                </p>
                <p className="text-2xl font-bold">
                  {filteredCards.length === cards.length 
                    ? filteredCards.length 
                    : `${filteredCards.length} / ${cards.length}`}
                </p>
              </CardContent>
            </Card>
          )}
          {funilConfig?.dashboard_metricas?.includes('valor_total') && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredCards.reduce((acc, c) => acc + (c.valor || 0), 0))}
                </p>
              </CardContent>
            </Card>
          )}
          {funilConfig?.dashboard_metricas?.includes('cards_atrasados') && (() => {
            const cardsAtrasados = filteredCards.filter(c => c.data_previsao && new Date(c.data_previsao) < new Date() && !c.data_conclusao);
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Card className={cardsAtrasados.length > 0 ? 'cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all' : ''}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Cards Atrasados
                        {cardsAtrasados.length > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </p>
                      <p className="text-2xl font-bold text-destructive">{cardsAtrasados.length}</p>
                    </CardContent>
                  </Card>
                </PopoverTrigger>
                {cardsAtrasados.length > 0 && (
                  <PopoverContent className="w-96 p-0" align="start">
                    <div className="p-3 border-b bg-destructive/5">
                      <p className="font-bold text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        {cardsAtrasados.length} Card{cardsAtrasados.length > 1 ? 's' : ''} Atrasado{cardsAtrasados.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <ScrollArea className={cardsAtrasados.length > 5 ? 'h-[300px]' : ''}>
                      <div className="p-2 space-y-1">
                        {cardsAtrasados
                          .sort((a, b) => new Date(a.data_previsao!).getTime() - new Date(b.data_previsao!).getTime())
                          .map(card => {
                            const diasAtraso = Math.floor((new Date().getTime() - new Date(card.data_previsao!).getTime()) / (1000 * 60 * 60 * 24));
                            const etapaNome = etapas.find(e => e.id === card.etapa_id)?.nome || '—';
                            return (
                              <div
                                key={card.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                onClick={() => handleViewDetails(card)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{card.titulo}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{etapaNome}</span>
                                    {card.valor > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-green-600">{formatCurrency(card.valor)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="destructive" className="text-xs shrink-0">
                                  {diasAtraso}d
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                )}
              </Popover>
            );
          })()}
          {funilConfig?.dashboard_metricas?.includes('taxa_conversao') && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredCards.length > 0 
                    ? `${Math.round((filteredCards.filter(c => c.status_negocio === 'ganho').length / filteredCards.length) * 100)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          )}
          {funilConfig?.dashboard_metricas?.includes('taxa_perdido') && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de Perdido</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredCards.length > 0 
                    ? `${Math.round((filteredCards.filter(c => c.status_negocio === 'perdido').length / filteredCards.length) * 100)}%`
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          )}
          {funilConfig?.dashboard_metricas?.includes('media_tempo_etapa') && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Média de Tempo por Etapa</p>
                <p className="text-2xl font-bold text-purple-600">
                  {/* Calcular média de dias que os cards ficam em cada etapa */}
                  {(() => {
                    const cardsComData = filteredCards.filter(c => c.created_at);
                    if (cardsComData.length === 0) return '0 dias';
                    const totalDias = cardsComData.reduce((acc, c) => {
                      const created = new Date(c.created_at || new Date());
                      const now = new Date();
                      const dias = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                      return acc + dias;
                    }, 0);
                    const media = Math.round(totalDias / cardsComData.length);
                    return `${media} dias`;
                  })()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros do Funil */}
      <div className="flex-shrink-0">
        <FunilFilters
          etapas={etapas}
          responsaveis={responsaveisVisiveis}
          etiquetas={etiquetas}
          searchTerm={funilFilters.searchTerm}
          filterEtapa={funilFilters.filterEtapa}
          filterResponsavel={funilFilters.filterResponsavel}
          filterResponsavelNome={funilFilters.filterResponsavelNome}
          filterPrioridade={funilFilters.filterPrioridade}
          filterDataInicio={funilFilters.filterDataInicio}
          filterDataFim={funilFilters.filterDataFim}
          filterTipoData={funilFilters.filterTipoData}
          filterEtiqueta={funilFilters.filterEtiqueta}
          onSearchChange={funilFilters.setSearchTerm}
          onEtapaChange={funilFilters.setFilterEtapa}
          onResponsavelChange={(id, nome) => {
            funilFilters.setFilterResponsavel(id);
            funilFilters.setFilterResponsavelNome(nome || null);
          }}
          onPrioridadeChange={funilFilters.setFilterPrioridade}
          onDataInicioChange={funilFilters.setFilterDataInicio}
          onDataFimChange={funilFilters.setFilterDataFim}
          onTipoDataChange={funilFilters.setFilterTipoData}
          onEtiquetaChange={funilFilters.setFilterEtiqueta}
          onClearFilters={funilFilters.clearFilters}
          totalCards={cards.length}
          filteredCount={funilFilters.filterCards(cards, responsaveisVisiveisIds).length}
          showEtiquetas={etiquetas.length > 0}
          empresaId={empresaId}
          usuariosVisiveis={usuariosVisiveis}
          isAdministrador={isAdministrador}
          currentUserId={profile?.id}
        />
      </div>

      {/* Visualização: Kanban ou Lista */}
      {modoVisualizacao === 'kanban' ? (
        /* Kanban Board com Drag and Drop */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 flex-1 min-h-0 scrollbar-always-visible">
            {/* Filtrar etapas visíveis baseado no filtro de etapa */}
            {(() => {
              const etapasVisiveis = funilFilters.filterEtapa !== 'todas' 
                ? etapas.filter(e => e.id === funilFilters.filterEtapa)
                : etapas;
              
              return (
                <SortableContext 
                  items={etapasVisiveis.map(e => `column-${e.id}`)} 
                  strategy={horizontalListSortingStrategy}
                >
                  {etapasVisiveis.map(etapa => (
                    <SortableColumn
                      key={etapa.id}
                      etapa={etapa}
                      cards={getCardsByEtapa(etapa.id)}
                      funil={funil}
                      etapas={etapas}
                      totalValor={getTotalPorEtapa(etapa.id)}
                      onAddCard={handleOpenDialog}
                      onEditCard={handleOpenDialog}
                      onDeleteCard={handleDeleteCard}
                      onMoveCard={handleMoveCard}
                      onViewDetails={handleViewDetails}
                      onAtribuirKit={handleOpenAtribuirKit}
                      formatCurrency={formatCurrency}
                      getPrioridadeInfo={getPrioridadeInfo}
                      podeExcluir={podeExcluirCard()}
                      funilConfig={funilConfig}
                    />
                  ))}
                </SortableContext>
              );
            })()}

            {etapas.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Kanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Este funil ainda não possui etapas.</p>
                  <p className="text-sm mb-4">Crie etapas para começar a adicionar cards.</p>
                  <Button onClick={() => setCriarEtapaDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Etapa
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Drag Overlay para feedback visual */}
          <DragOverlay>
            {activeCard && (
              <Card className="w-72 shadow-xl rotate-3 opacity-90">
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{activeCard.titulo}</p>
                  {activeCard.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {activeCard.descricao}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Visualização em Lista (Tabela) */
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Header da Tabela */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 border-b font-medium text-sm">
            <div className="col-span-3">Título</div>
            <div className="col-span-2">Etapa</div>
            {(funilConfig?.card_mostrar_cliente !== false) && <div className="col-span-2">Cliente</div>}
            {(funilConfig?.card_mostrar_valor !== false) && funil.tipo === 'negocio' && <div className="col-span-1">Valor</div>}
            {(funilConfig?.card_mostrar_data !== false) && <div className="col-span-1">Data</div>}
            {(funilConfig?.card_mostrar_responsavel !== false) && <div className="col-span-2">Responsável</div>}
            <div className="col-span-1 text-right">Ações</div>
          </div>

          {/* Corpo da Tabela */}
          <div className="divide-y">
            {filteredCards.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>{cards.length === 0 ? 'Nenhum card encontrado neste funil.' : 'Nenhum card corresponde aos filtros aplicados.'}</p>
                {cards.length === 0 && (funilConfig?.botao_adicionar_visivel !== false) && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => handleOpenDialog(etapas[0]?.id || '')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {funilConfig?.botao_adicionar_texto || 'Novo Card'}
                  </Button>
                )}
              </div>
            ) : (
              filteredCards.map((card) => {
                const etapa = etapas.find(e => e.id === card.etapa_id);
                return (
                  <div 
                    key={card.id}
                    className="grid grid-cols-12 gap-2 p-3 hover:bg-muted/30 cursor-pointer transition-colors items-center"
                    onClick={() => handleViewDetails(card)}
                  >
                    {/* Título com indicador de prioridade */}
                    <div className="col-span-3 flex items-center gap-2">
                      <div 
                        className="w-1.5 h-8 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: card.prioridade === 'urgente' ? 'hsl(var(--destructive))' :
                            card.prioridade === 'alta' ? '#f97316' :
                            card.prioridade === 'media' ? '#3b82f6' : '#6b7280'
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{card.titulo}</p>
                        {card.descricao && (
                          <p className="text-xs text-muted-foreground truncate">{card.descricao}</p>
                        )}
                      </div>
                    </div>

                    {/* Etapa + Etiquetas */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        {etapa && (
                          <Badge 
                            variant="outline" 
                            className="text-xs w-fit"
                            style={{ borderColor: etapa.cor, color: etapa.cor }}
                          >
                            {etapa.nome}
                          </Badge>
                        )}
                        {/* Etiquetas na lista */}
                        {card.etiquetas && card.etiquetas.length > 0 && (funilConfig?.card_mostrar_etiquetas !== false) && (
                          <div className="flex flex-wrap gap-0.5">
                            {card.etiquetas.slice(0, 2).map((etiqueta) => (
                              <span
                                key={etiqueta.id}
                                className="inline-flex items-center px-1 py-0 rounded text-[9px] font-medium"
                                style={{ 
                                  backgroundColor: `${etiqueta.cor}20`,
                                  color: etiqueta.cor,
                                }}
                              >
                                {etiqueta.nome}
                              </span>
                            ))}
                            {card.etiquetas.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{card.etiquetas.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cliente */}
                    {(funilConfig?.card_mostrar_cliente !== false) && (
                      <div className="col-span-2 text-sm text-muted-foreground truncate">
                        {card.cliente?.nome || '-'}
                      </div>
                    )}

                    {/* Valor */}
                    {(funilConfig?.card_mostrar_valor !== false) && funil.tipo === 'negocio' && (
                      <div className="col-span-1 text-sm font-medium text-green-600">
                        {card.valor > 0 ? formatCurrency(card.valor) : '-'}
                      </div>
                    )}

                    {/* Data */}
                    {(funilConfig?.card_mostrar_data !== false) && (
                      <div className="col-span-1 text-sm text-muted-foreground">
                        {card.data_previsao 
                          ? new Date(card.data_previsao).toLocaleDateString('pt-BR')
                          : '-'}
                      </div>
                    )}

                    {/* Responsável */}
                    {(funilConfig?.card_mostrar_responsavel !== false) && (
                      <div className="col-span-2 text-sm text-muted-foreground truncate">
                        {card.responsavel?.nome || '-'}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="col-span-1 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(card); }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(card.etapa_id, card); }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCard(card); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer com botão de adicionar */}
          {cards.length > 0 && (funilConfig?.botao_adicionar_visivel !== false) && etapas.length > 0 && (
            <div className="p-3 border-t bg-muted/30">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleOpenDialog(etapas[0].id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {funilConfig?.botao_adicionar_texto || 'Novo Card'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog de Criação/Edição de Card */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          // Resetar formulário ao fechar
          setEditingCard(null);
          setFormData({
            titulo: '',
            descricao: '',
            valor: '',
            cliente_id: '',
            data_previsao: '',
            prioridade: 'media',
            responsavel_id: ''
          });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Card' : (funilConfig?.botao_adicionar_texto || 'Novo Card')}</DialogTitle>
            <DialogDescription>
              {editingCard 
                ? 'Edite as informações do card.' 
                : `Adicione um novo card ao funil.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Renderizar campos na ordem configurada */}
            {(funilConfig?.formulario_campos || [
              { campo: 'titulo', label: 'Título', visivel: true, obrigatorio: false },
              { campo: 'descricao', label: 'Descrição', visivel: true, obrigatorio: false },
              { campo: 'cliente', label: 'Cliente', visivel: true, obrigatorio: false },
              { campo: 'valor', label: 'Valor', visivel: true, obrigatorio: false },
              { campo: 'data_previsao', label: 'Data Previsão', visivel: true, obrigatorio: false },
            ]).map((campoConfig: any) => {
              if (campoConfig.visivel === false) return null;
              
              // Valor só aparece para funis de negócio
              if (campoConfig.campo === 'valor' && funil?.tipo !== 'negocio') return null;

              const obrigatorio = campoConfig.obrigatorio ? '*' : '';

              switch (campoConfig.campo) {
                case 'titulo':
                  return (
                    <div key="titulo" className="space-y-2">
                      <Label htmlFor="titulo">Título {obrigatorio}</Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        placeholder="Ex: Proposta para Cliente X"
                      />
                    </div>
                  );
                case 'descricao':
                  return (
                    <div key="descricao" className="space-y-2">
                      <Label htmlFor="descricao">Descrição {obrigatorio}</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Detalhes do card..."
                        rows={3}
                      />
                    </div>
                  );
                case 'cliente':
                  return (
                    <div key="cliente" className="space-y-2">
                      <Label htmlFor="cliente">Cliente {obrigatorio}</Label>
                      <ClienteSelectorModal
                        empresaId={empresaId || ''}
                        selectedClienteId={formData.cliente_id || null}
                        onSelect={(clienteId) => setFormData({ ...formData, cliente_id: clienteId || '' })}
                      />
                    </div>
                  );
                case 'valor':
                  return (
                    <div key="valor" className="space-y-2">
                      <Label htmlFor="valor">Valor (R$) {obrigatorio}</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  );
                case 'data_previsao':
                  return (
                    <div key="data_previsao" className="space-y-2">
                      <Label htmlFor="data_previsao">Data de Previsão {obrigatorio}</Label>
                      <Input
                        id="data_previsao"
                        type="date"
                        value={formData.data_previsao}
                        onChange={(e) => setFormData({ ...formData, data_previsao: e.target.value })}
                      />
                    </div>
                  );
                case 'responsavel':
                  // Colaborador não pode alterar o responsável (sempre ele mesmo)
                  const isColaboradorSemSubordinados = !isAdministrador && !isGestor;
                  
                  // ID do responsável atual (pode ser string vazia, tratar como null)
                  const responsavelIdAtual = formData.responsavel_id || profile?.id || null;
                  
                  // Buscar nome do responsável selecionado
                  const responsavelSelecionado = responsaveis.find(r => r.id === responsavelIdAtual);
                  const nomeResponsavel = responsavelSelecionado?.nome || 
                    (responsavelIdAtual === profile?.id ? profile?.nome : null);
                  
                  return (
                    <div key="responsavel" className="space-y-2">
                      <Label htmlFor="responsavel">Responsável {obrigatorio}</Label>
                      <ResponsavelSelectorModal
                        empresaId={empresaId || ''}
                        selectedResponsavelId={responsavelIdAtual}
                        selectedResponsavelNome={nomeResponsavel}
                        onSelect={(id, nome) => setFormData({ ...formData, responsavel_id: id || '' })}
                        usuariosVisiveis={usuariosVisiveis}
                        isAdministrador={isAdministrador}
                        currentUserId={profile?.id}
                        disabled={isColaboradorSemSubordinados}
                        disabledText={profile?.nome}
                        allowNone={isAdministrador}
                      />
                    </div>
                  );
                default:
                  return null;
              }
            })}

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, prioridade: p.value as any })}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-md text-xs font-medium transition-all ${
                      formData.prioridade === p.value
                        ? `${p.color} text-white`
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCard}>
              {editingCard ? 'Salvar' : `Criar ${(funilConfig?.botao_adicionar_texto || 'Card').replace(/^Novo\s*/i, '')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar Etapa */}
      <Dialog open={criarEtapaDialogOpen} onOpenChange={setCriarEtapaDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
            <DialogDescription>
              Crie uma nova etapa para o funil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="etapa-nome">Nome da Etapa *</Label>
              <Input
                id="etapa-nome"
                value={novaEtapaNome}
                onChange={(e) => setNovaEtapaNome(e.target.value)}
                placeholder="Ex: A Fazer, Em Andamento, Concluído..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etapa</Label>
              <div className="flex gap-2 flex-wrap">
                {['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'].map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${novaEtapaCor === cor ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setNovaEtapaCor(cor)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarEtapaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarEtapa} disabled={criandoEtapa}>
              {criandoEtapa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Card */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent 
          className="max-w-5xl h-[90vh] overflow-hidden flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          {viewingCard && (
            <>
              {/* Header do Dialog */}
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingCard.titulo}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2">
                      {viewingCard.cliente && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {viewingCard.cliente.nome}
                        </span>
                      )}
                      {viewingCard.responsavel && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {viewingCard.responsavel.nome}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                  
                  {/* Botão Fechar */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted hover:bg-destructive hover:text-white transition-colors z-50"
                    onClick={() => setDetailsDialogOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>

                  {/* Botões de Status do Negócio - apenas para funis tipo negócio */}
                  {funil?.tipo === 'negocio' && (
                    <div className="flex items-center gap-2 mr-10">
                      <Button
                        size="sm"
                        variant={viewingCard.status_negocio === 'perdido' ? 'default' : 'outline'}
                        className={viewingCard.status_negocio === 'perdido' 
                          ? 'bg-destructive hover:bg-red-600 text-white border-red-500' 
                          : 'border-red-500 text-red-500 hover:bg-destructive/10'}
                        onClick={() => handleUpdateStatusNegocio('perdido')}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Perdido
                      </Button>
                      <Button
                        size="sm"
                        variant={viewingCard.status_negocio === 'em_andamento' ? 'default' : 'outline'}
                        className={viewingCard.status_negocio === 'em_andamento' 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                          : 'border-orange-500 text-orange-500 hover:bg-orange-50'}
                        onClick={() => handleUpdateStatusNegocio('em_andamento')}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Em andamento
                      </Button>
                      <Button
                        size="sm"
                        variant={viewingCard.status_negocio === 'aceito' ? 'default' : 'outline'}
                        className={viewingCard.status_negocio === 'aceito' 
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                          : 'border-green-500 text-green-500 hover:bg-green-50'}
                        onClick={() => handleUpdateStatusNegocio('aceito')}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Aceito
                      </Button>
                      <Button
                        size="sm"
                        variant={viewingCard.status_negocio === 'ganho' ? 'default' : 'outline'}
                        className={viewingCard.status_negocio === 'ganho' 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' 
                          : 'border-amber-600 text-amber-600 hover:bg-amber-50'}
                        onClick={() => handleUpdateStatusNegocio('ganho')}
                      >
                        <Trophy className="h-4 w-4 mr-1" />
                        Ganho
                      </Button>
                    </div>
                  )}
                  
                  {/* Badge de prioridade - apenas para funis não-negócio */}
                  {funil?.tipo !== 'negocio' && (
                    <div className="flex items-center gap-2 mr-12">
                      <Badge 
                        className={`${
                          viewingCard.prioridade === 'urgente' ? 'bg-destructive' :
                          viewingCard.prioridade === 'alta' ? 'bg-orange-500' :
                          viewingCard.prioridade === 'media' ? 'bg-blue-500' :
                          'bg-gray-500'
                        } text-white`}
                      >
                        {getPrioridadeInfo(viewingCard.prioridade).label}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Navegação por etapas */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
                  {etapas.map((etapa) => (
                    <Button
                      key={etapa.id}
                      variant={viewingCard.etapa_id === etapa.id ? 'default' : 'outline'}
                      size="sm"
                      className="flex-shrink-0 text-xs"
                      style={viewingCard.etapa_id === etapa.id ? { backgroundColor: etapa.cor } : {}}
                      onClick={() => handleMoveCardFromDetails(etapa.id)}
                    >
                      {etapa.nome}
                    </Button>
                  ))}
                </div>
              </DialogHeader>

              {/* Conteúdo Principal */}
              <div className="flex-1 overflow-hidden flex gap-4 mt-4">
                {/* Coluna Esquerda - Atividades */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                  {/* Etiquetas do Card - acima do título Atividades */}
                  {cardEtiquetas.length > 0 && (
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground mb-2 block">Etiquetas</Label>
                      <div className="flex flex-wrap gap-1">
                        {cardEtiquetas.map(etiquetaId => {
                          const etiqueta = etiquetas.find(e => e.id === etiquetaId);
                          if (!etiqueta) return null;
                          return (
                            <Badge 
                              key={etiquetaId}
                              className="text-xs text-white"
                              style={{ backgroundColor: etiqueta.cor }}
                            >
                              {etiqueta.nome}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Histórico de Atividades */}
                  {(funilConfig?.card_interno_mostrar_historico !== false) && (
                  <div className={`border rounded-lg p-3 flex flex-col flex-1 min-h-0`}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3 flex-shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      Histórico de Atividades
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto">
                    {loadingAtividades ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : atividades.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <p>Nenhuma atividade registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atividades.map((atividade) => {
                          const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[0];
                          const TipoIcon = tipoInfo.icon;
                          const isConcluida = atividade.status === 'concluida';
                          const statusColors: Record<string, string> = {
                            a_realizar: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                            programada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            pendente: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-red-400',
                            concluida: 'bg-primary/10 text-green-700 dark:bg-green-900/30 dark:text-green-400',
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
                          const isPastDue = prazoDate && prazoDate < today && atividade.status !== 'concluida';
                          
                          return (
                            <div 
                              key={atividade.id} 
                              className={`group/atividade border rounded-lg p-3 bg-card cursor-pointer hover:shadow-md transition-shadow ${isConcluida ? 'opacity-60' : ''} ${isToday ? 'border-orange-500 border-2 bg-orange-500/5' : isPastDue ? 'border-red-500 border-2 bg-destructive/5' : 'border-border'}`}
                              onClick={() => {
                                setAtividadeSelecionada(atividade);
                                setAtividadeDetalheOpen(true);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isConcluida}
                                    onCheckedChange={(checked) => {
                                      if (checked && atividade.tipo === 'checklist') {
                                        try {
                                          const checkData = JSON.parse(atividade.descricao);
                                          if (checkData?.itens && !checkData.itens.every((i: any) => i.concluido)) {
                                            const done = checkData.itens.filter((i: any) => i.concluido).length;
                                            toast({
                                              title: 'Itens pendentes',
                                              description: `Conclua todos os itens do checklist antes de finalizar. (${done}/${checkData.itens.length})`,
                                              variant: 'destructive',
                                              duration: 5000
                                            });
                                            return;
                                          }
                                        } catch {}
                                      }
                                      handleUpdateAtividadeStatus(
                                        atividade.id, 
                                        checked ? 'concluida' : 'a_realizar'
                                      );
                                    }}
                                    className="h-5 w-5"
                                  />
                                  <div className={`p-2 rounded-full ${tipoInfo.cor}`}>
                                    <TipoIcon className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{tipoInfo.label}</span>
                                      <Badge className={`text-xs ${statusColors[atividade.status || 'a_realizar']}`}>
                                        {statusLabels[atividade.status || 'a_realizar']}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(atividade.created_at).toLocaleDateString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {!isConcluida && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/atividade:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAtividadeSelecionada(atividade);
                                              setAtividadeEditModeInicial(true);
                                              setAtividadeDetalheOpen(true);
                                            }}
                                            title="Editar"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAtividade(atividade.id);
                                            }}
                                            title="Excluir"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Render checklist description properly */}
                                  {(() => {
                                    if (atividade.tipo === 'checklist') {
                                      try {
                                        const checkData = JSON.parse(atividade.descricao);
                                        if (checkData && checkData.itens && Array.isArray(checkData.itens)) {
                                          const total = checkData.itens.length;
                                          const done = checkData.itens.filter((i: any) => i.concluido).length;
                                          return (
                                            <div className="space-y-1.5">
                                              <p className="text-sm text-muted-foreground">
                                                {checkData.texto}
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-muted rounded-full h-1.5">
                                                  <div 
                                                    className={`h-1.5 rounded-full transition-all ${done === total ? 'bg-green-500' : 'bg-primary'}`}
                                                    style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                                                  />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{done}/{total}</span>
                                              </div>
                                            </div>
                                          );
                                        }
                                      } catch {}
                                    }
                                    return (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {atividade.descricao}
                                      </p>
                                    );
                                  })()}
                                  
                                  {(atividade.prazo || atividade.horario) && (
                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                      {atividade.prazo && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {format(parse(atividade.prazo.split('T')[0], 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                      )}
                                      {atividade.horario && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {atividade.horario}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {atividade.usuario && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Por: {atividade.usuario.nome}
                                    </p>
                                  )}

                                  {/* Anexo da atividade */}
                                  {(atividade as any).anexo_url && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const url = (atividade as any).anexo_url;
                                          console.log('Abrindo anexo:', url);
                                          if (url) {
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                          }
                                        }}
                                        className="flex items-center gap-2 text-xs text-orange-500 hover:text-orange-600 hover:underline bg-orange-500/10 px-2 py-1 rounded cursor-pointer transition-colors"
                                      >
                                        <FileText className="h-3 w-3" />
                                        <span className="truncate max-w-[200px]">{(atividade as any).anexo_nome || 'Anexo'}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Checkbox de Proposta Aprovada - aparece para atividades de proposta comercial */}
                                  {atividade.descricao?.toLowerCase().includes('proposta comercial') && (
                                    <div className="mt-3 pt-3 border-t border-dashed">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          id={`proposta-aprovada-${atividade.id}`}
                                          checked={atividade.proposta_aprovada || false}
                                          onCheckedChange={async (checked) => {
                                            try {
                                              // Atualizar status de aprovação
                                              await (supabase as any)
                                                .from('funil_card_atividades')
                                                .update({ proposta_aprovada: !!checked })
                                                .eq('id', atividade.id);
                                              
                                              // Atualizar estado local
                                              setAtividades(prev => prev.map(a => 
                                                a.id === atividade.id ? { ...a, proposta_aprovada: !!checked } : a
                                              ));
                                              
                                              // Se aprovado, verificar valor do orçamento vs valor do card
                                              if (checked && viewingCard) {
                                                // Buscar orçamento do card
                                                const { data: orcamento } = await (supabase as any)
                                                  .from('funil_card_orcamentos')
                                                  .select('*')
                                                  .eq('card_id', viewingCard.id)
                                                  .maybeSingle();
                                                
                                                if (orcamento) {
                                                  const valorOrcamento = orcamento.total_ouro || orcamento.total_prata || orcamento.total_bronze || 0;
                                                  const valorCard = viewingCard.valor || 0;
                                                  
                                                  // Verificar se valores são diferentes (tolerância de R$ 0.01)
                                                  if (Math.abs(valorOrcamento - valorCard) > 0.01) {
                                                    toast({
                                                      title: '⚠️ Valores divergentes!',
                                                      description: `Orçamento: R$ ${valorOrcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Card: R$ ${valorCard.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                                      variant: 'destructive',
                                                      duration: 8000
                                                    });
                                                  } else {
                                                    toast({
                                                      title: '✅ Proposta aprovada!',
                                                      description: 'Valores conferem com o card.'
                                                    });
                                                  }
                                                } else {
                                                  toast({
                                                    title: '✅ Proposta aprovada!',
                                                    description: 'Nenhum orçamento vinculado para comparação.'
                                                  });
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Erro ao atualizar aprovação:', error);
                                              toast({
                                                title: 'Erro',
                                                description: 'Não foi possível atualizar a aprovação.',
                                                variant: 'destructive'
                                              });
                                            }
                                          }}
                                          className="h-4 w-4 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                        />
                                        <label 
                                          htmlFor={`proposta-aprovada-${atividade.id}`} 
                                          className={`text-xs font-medium cursor-pointer ${atividade.proposta_aprovada ? 'text-orange-600' : 'text-muted-foreground'}`}
                                        >
                                          Proposta aprovada
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                  )}
                  
                  {/* Histórico de Movimentações do Card */}
                  {(funilConfig?.card_interno_mostrar_movimentacoes !== false) && (
                  <div className={`border rounded-lg p-3 mt-3 flex flex-col flex-1 min-h-0`}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3 flex-shrink-0">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Histórico de Movimentações
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto">
                    {loadingMovimentacoes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : movimentacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma movimentação registrada
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                        
                        <div className="space-y-3">
                          {movimentacoes.map((mov) => {
                            const etapaOrigem = etapas.find(e => e.id === mov.etapa_origem_id);
                            const etapaDestino = etapas.find(e => e.id === mov.etapa_destino_id);
                            
                            return (
                              <div key={mov.id} className="relative flex gap-3 pl-1">
                                <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  mov.tipo === 'criacao' ? 'bg-teal-100 text-teal-700' :
                                  mov.tipo === 'mudanca_etapa' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {mov.tipo === 'criacao' && <Plus className="h-3 w-3" />}
                                  {mov.tipo === 'mudanca_etapa' && <ArrowRightLeft className="h-3 w-3" />}
                                </div>
                                
                                <div className="flex-1 min-w-0 pb-3">
                                  <p className="text-sm">{mov.descricao}</p>
                                  
                                  {(etapaOrigem || etapaDestino) && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {etapaOrigem && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs"
                                          style={{ borderColor: etapaOrigem.cor, color: etapaOrigem.cor }}
                                        >
                                          {etapaOrigem.nome}
                                        </Badge>
                                      )}
                                      {etapaOrigem && etapaDestino && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      {etapaDestino && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs"
                                          style={{ borderColor: etapaDestino.cor, color: etapaDestino.cor }}
                                        >
                                          {etapaDestino.nome}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>
                                      {new Date(mov.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {mov.usuario && (
                                      <>
                                        <span>•</span>
                                        <span>Por: {mov.usuario.nome}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  )}
                </div>

                {/* Coluna Direita - Ações Rápidas e Dados do Card */}
                <div className="w-72 flex-shrink-0 border-l pl-4 overflow-y-auto max-h-full">
                  {/* Ações Rápidas */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações Rápidas</h4>
                      <Popover open={configAcoesOpen} onOpenChange={setConfigAcoesOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-50 hover:opacity-100">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Exibir/Ocultar</p>
                            {ACOES_RAPIDAS_DISPONIVEIS
                              .filter(acao => !acao.apenasNegocio || funil?.tipo === 'negocio')
                              .map((acao) => {
                                const IconComponent = acao.icon;
                                const visivel = isAcaoRapidaVisivel(acao.id);
                                return (
                                  <div 
                                    key={acao.id} 
                                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted cursor-pointer"
                                    onClick={() => handleToggleAcaoRapida(acao.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs">{acao.label}</span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${visivel ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  </div>
                                );
                              })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-1">
                      {isAcaoRapidaVisivel('editar_card') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            setDetailsDialogOpen(false);
                            handleOpenDialog(viewingCard.etapa_id, viewingCard);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Editar</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('mover_card') && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm">
                              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Mover</span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-2" align="start">
                            <div className="space-y-0.5">
                              {etapas.filter(e => e.id !== viewingCard.etapa_id).map((etapa) => (
                                <div
                                  key={etapa.id}
                                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-xs"
                                  onClick={() => handleMoveCardFromDetails(etapa.id)}
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                                  {etapa.nome}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      {isAcaoRapidaVisivel('nova_atividade') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            setTipoAtividadeSelecionado(null);
                            setNovaAtividadeDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Nova Atividade</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('etiquetas') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={handleOpenEtiquetas}
                        >
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Etiquetas</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('encaminhar_card') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={handleOpenEncaminhar}
                        >
                          <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Encaminhar</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('enviar_email') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            const cliente = clientes.find(c => c.id === viewingCard.cliente_id);
                            const email = cliente?.email;
                            if (email) {
                              const subject = encodeURIComponent(`Contato - ${viewingCard.titulo}`);
                              const body = encodeURIComponent(`Olá ${cliente.nome},\n\n`);
                              const mailtoLink = document.createElement('a');
                              mailtoLink.href = `mailto:${email}?subject=${subject}&body=${body}`;
                              mailtoLink.click();
                            } else if (viewingCard.cliente_id) {
                              toast({
                                title: 'E-mail não encontrado',
                                description: 'O cliente não possui e-mail cadastrado.',
                                variant: 'destructive'
                              });
                            } else {
                              toast({
                                title: 'Nenhum cliente vinculado',
                                description: 'Este card não possui cliente associado.',
                                variant: 'destructive'
                              });
                            }
                          }}
                        >
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Enviar E-mail</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('atribuir_kit') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            setCardParaAtribuirKit(viewingCard);
                            loadKitsComDemanda();
                            setAtribuirKitDialogOpen(true);
                          }}
                        >
                          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Atribuir Kit</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('atribuir_veiculo') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            if (viewingCard) handleOpenAtribuirVeiculo(viewingCard);
                          }}
                        >
                          <Car className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Atribuir Veículo</span>
                        </div>
                      )}
                      
                      {funil?.tipo === 'negocio' && isAcaoRapidaVisivel('elaborar_orcamento') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => setOrcamentoDialogOpen(true)}
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Elaborar Orçamento</span>
                        </div>
                      )}
                      
                      {funil?.tipo === 'negocio' && isAcaoRapidaVisivel('ver_propostas') && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => setPropostasDialogOpen(true)}
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Propostas</span>
                        </div>
                      )}
                      
                      {isAcaoRapidaVisivel('finalizar_card') && (
                        viewingCard.data_conclusao ? (
                          <div 
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-orange-100 cursor-pointer text-sm text-orange-600"
                            onClick={handleReabrirCard}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reabrir Card</span>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-green-100 cursor-pointer text-sm text-green-600"
                            onClick={handleFinalizarCard}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Finalizar Card</span>
                          </div>
                        )
                      )}
                      
                      {isAcaoRapidaVisivel('excluir_card') && podeExcluirCard() && (
                        <div 
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-destructive/10 cursor-pointer text-sm text-destructive"
                          onClick={() => handleDeleteCard(viewingCard)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Excluir</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Valor do Negócio - apenas para funis tipo negócio */}
                  {funil?.tipo === 'negocio' && (
                    <div className="mb-4 pb-4 border-b">
                      <h4 className="font-semibold text-sm mb-3">Valor do Negócio</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(getValorNegocioCalculado())}
                      </p>
                      
                      {/* Status atual do negócio */}
                      {viewingCard.status_negocio && (
                        <div className="mt-2">
                          <Badge 
                            className={`text-xs ${
                              viewingCard.status_negocio === 'perdido' ? 'bg-destructive' :
                              viewingCard.status_negocio === 'em_andamento' ? 'bg-orange-500' :
                              viewingCard.status_negocio === 'aceito' ? 'bg-green-500' :
                              viewingCard.status_negocio === 'ganho' ? 'bg-amber-600' :
                              'bg-gray-500'
                            } text-white`}
                          >
                            {STATUS_NEGOCIO.find(s => s.id === viewingCard.status_negocio)?.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Dados do Card */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm">Dados do Card</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setDetailsDialogOpen(false);
                          handleOpenDialog(viewingCard.etapa_id, viewingCard);
                        }}
                        title="Editar Card"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Responsável */}
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Responsável</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditandoResponsavel(!editandoResponsavel)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {editandoResponsavel ? (
                          <Select
                            value={viewingCard.responsavel_id || 'none'}
                            onValueChange={(value) => handleUpdateResponsavel(value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecione um responsável..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum responsável</SelectItem>
                              {responsaveis.map((resp) => (
                                <SelectItem key={resp.id} value={resp.id}>
                                  {resp.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            {viewingCard.responsavel ? (
                              <>
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                                  {viewingCard.responsavel.nome?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                                <span className="text-sm font-medium">
                                  {viewingCard.responsavel.nome}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Nenhum responsável</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cliente */}
                      {viewingCard.cliente && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Cliente</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{viewingCard.cliente.nome}</span>
                          </div>
                        </div>
                      )}

                      {/* Categoria do Cliente */}
                      {viewingCard.cliente_id && (
                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Categoria do Cliente</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditandoCategoria(!editandoCategoria)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {editandoCategoria ? (
                            <Select
                              value={clientes.find(c => c.id === viewingCard.cliente_id)?.categoria_id || 'none'}
                              onValueChange={(value) => handleUpdateCategoriaCliente(value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione uma categoria..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem categoria</SelectItem>
                                {categoriasCliente.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: cat.cor }}
                                      />
                                      {cat.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              {(() => {
                                const cliente = clientes.find(c => c.id === viewingCard.cliente_id);
                                const categoriaId = (cliente as any)?.categoria_id;
                                const categoria = categoriasCliente.find(c => c.id === categoriaId);
                                
                                if (categoria) {
                                  return (
                                    <>
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: categoria.cor }}
                                      />
                                      <span className="text-sm font-medium">{categoria.nome}</span>
                                    </>
                                  );
                                }
                                return <span className="text-sm text-muted-foreground">Sem categoria</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Valor */}
                      {funil?.tipo === 'negocio' && viewingCard.valor > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor</Label>
                          <p className="text-sm font-medium text-green-600 mt-1">
                            {formatCurrency(viewingCard.valor)}
                          </p>
                        </div>
                      )}

                      {/* Data de Previsão */}
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Data de Previsão</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditandoDataPrevisao(!editandoDataPrevisao)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {editandoDataPrevisao ? (
                          <div className="mt-1 space-y-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                                  <Calendar className="h-3 w-3 mr-2" />
                                  {viewingCard.data_previsao
                                    ? new Date(viewingCard.data_previsao + 'T12:00:00').toLocaleDateString('pt-BR')
                                    : 'Selecionar data...'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={viewingCard.data_previsao ? new Date(viewingCard.data_previsao + 'T12:00:00') : undefined}
                                  onSelect={(date) => handleUpdateDataPrevisao(date)}
                                  locale={ptBR}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {viewingCard.data_previsao && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => handleUpdateDataPrevisao(undefined)}
                              >
                                <X className="h-3 w-3 mr-1" /> Remover data
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm mt-1">
                            {viewingCard.data_previsao
                              ? new Date(viewingCard.data_previsao + 'T12:00:00').toLocaleDateString('pt-BR')
                              : <span className="text-muted-foreground">Sem data definida</span>}
                          </p>
                        )}
                      </div>

                      {/* Descrição */}
                      {viewingCard.descricao && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Descrição</Label>
                          <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                            {viewingCard.descricao}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Etiquetas — Lista/Seleção */}
      <Dialog open={etiquetasDialogOpen} onOpenChange={setEtiquetasDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Etiquetas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar etiquetas..."
                value={etiquetaSearch}
                onChange={(e) => setEtiquetaSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Lista de etiquetas */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {loadingEtiquetas ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredEtiquetas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {etiquetaSearch ? 'Nenhuma etiqueta encontrada' : 'Nenhuma etiqueta cadastrada'}
                </p>
              ) : (
                filteredEtiquetas.map((etiqueta) => (
                  <div 
                    key={etiqueta.id} 
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleToggleEtiqueta(etiqueta.id)}
                  >
                    <Checkbox 
                      checked={cardEtiquetas.includes(etiqueta.id)}
                      onCheckedChange={() => handleToggleEtiqueta(etiqueta.id)}
                      className="flex-shrink-0"
                    />
                    <div 
                      className="flex-1 py-1.5 px-3 rounded-md text-white text-sm font-medium truncate"
                      style={{ backgroundColor: etiqueta.cor }}
                    >
                      {etiqueta.nome}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditandoEtiqueta({ id: etiqueta.id, nome: etiqueta.nome, cor: etiqueta.cor });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Separador + Criar nova etiqueta */}
            <div className="border-t pt-3">
              {!criandoEtiqueta ? (
                <Button
                  variant="outline"
                  className="w-full justify-center h-9"
                  onClick={() => setCriandoEtiqueta(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar uma nova etiqueta
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Nome da etiqueta"
                    value={novaEtiqueta.nome}
                    onChange={(e) => setNovaEtiqueta(prev => ({ ...prev, nome: e.target.value }))}
                    className="h-9"
                    autoFocus
                  />
                  <div className="flex justify-center gap-2">
                    {CORES_ETIQUETA.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${
                          novaEtiqueta.cor.toUpperCase() === cor.toUpperCase() ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: cor }}
                        onClick={() => setNovaEtiqueta(prev => ({ ...prev, cor }))}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={novaEtiqueta.cor}
                    onChange={(e) => setNovaEtiqueta(prev => ({ ...prev, cor: e.target.value }))}
                    className="w-full h-8 rounded-md cursor-pointer border border-border block"
                    style={{ padding: '2px' }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCriandoEtiqueta(false);
                        setNovaEtiqueta({ nome: '', cor: CORES_ETIQUETA[0] });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleCreateEtiqueta}
                      disabled={!novaEtiqueta.nome.trim()}
                    >
                      Criar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Etiqueta — popup separado por cima */}
      <Dialog open={!!editandoEtiqueta} onOpenChange={(open) => { if (!open) setEditandoEtiqueta(null); }}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4" />
              Editar Etiqueta
            </DialogTitle>
          </DialogHeader>

          {editandoEtiqueta && (
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
                <Input
                  placeholder="Nome da etiqueta"
                  value={editandoEtiqueta.nome}
                  onChange={(e) => setEditandoEtiqueta(prev => prev ? { ...prev, nome: e.target.value } : null)}
                  className="h-9"
                  autoFocus
                />
              </div>

              {/* Cor */}
              <div className="space-y-2.5">
                <Label className="text-xs font-medium text-muted-foreground">Cor</Label>
                <div className="grid grid-cols-5 gap-2 justify-items-center">
                  {CORES_ETIQUETA.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                        editandoEtiqueta.cor.toUpperCase() === cor.toUpperCase() ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setEditandoEtiqueta(prev => prev ? { ...prev, cor } : null)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={editandoEtiqueta.cor}
                    onChange={(e) => setEditandoEtiqueta(prev => prev ? { ...prev, cor: e.target.value } : null)}
                    className="w-9 h-9 rounded-md cursor-pointer border border-border flex-shrink-0"
                    style={{ padding: '2px' }}
                  />
                  <span className="text-xs text-muted-foreground">Escolher cor personalizada</span>
                </div>
              </div>

              {/* Pré-visualização */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Pré-visualização</Label>
                <div 
                  className="w-full py-2 px-4 rounded-lg text-white text-sm font-semibold text-center"
                  style={{ backgroundColor: editandoEtiqueta.cor }}
                >
                  {editandoEtiqueta.nome || 'Nome da etiqueta'}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEtiqueta(editandoEtiqueta.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Excluir
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditandoEtiqueta(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateEtiqueta}
                  disabled={!editandoEtiqueta.nome.trim()}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Encaminhar Card */}
      <Dialog open={encaminharDialogOpen} onOpenChange={setEncaminharDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5" />
              Encaminhar Card
            </DialogTitle>
            <DialogDescription>
              Escolha o destino e a ação para o card
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seleção de Ação */}
            <div>
              <Label className="text-sm font-medium mb-2 block">O que deseja fazer?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={encaminharForm.acao === 'transferir' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setEncaminharForm(prev => ({ ...prev, acao: 'transferir' }))}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir
                </Button>
                <Button
                  variant={encaminharForm.acao === 'duplicar' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setEncaminharForm(prev => ({ ...prev, acao: 'duplicar' }))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {encaminharForm.acao === 'transferir' 
                  ? 'O card será movido para o funil de destino' 
                  : 'Uma cópia do card será criada no funil de destino'}
              </p>
            </div>

            {/* Dropdown de Funil Destino */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Funil de Destino</Label>
              <Select
                value={encaminharForm.funilDestinoId}
                onValueChange={(value) => {
                  setEncaminharForm(prev => ({ ...prev, funilDestinoId: value, etapaDestinoId: '' }));
                  loadEtapasDestino(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil..." />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Filtrar funis: excluir o funil atual
                    let funisFiltrados = funisCadastrados.filter(f => f.id !== funilId);
                    
                    // Ocultar funis dos setores Administrativo e Financeiro,
                    // exceto "Contas a Receber" do Financeiro que sempre aparece
                    funisFiltrados = funisFiltrados.filter(f => {
                      const setorLower = (f.setor_nome || '').toLowerCase();
                      const isAdm = setorLower.includes('administrativo');
                      const isFin = setorLower.includes('financeiro');
                      if (isAdm) return false;
                      if (isFin) return f.nome?.toLowerCase().includes('contas a receber');
                      return true;
                    });
                    
                    // Agrupar por setor
                    const porSetor: Record<string, typeof funisFiltrados> = {};
                    funisFiltrados.forEach(f => {
                      const setor = f.setor_nome || 'Sem setor';
                      if (!porSetor[setor]) porSetor[setor] = [];
                      porSetor[setor].push(f);
                    });
                    const setoresOrdenados = Object.keys(porSetor).sort();
                    
                    if (funisFiltrados.length === 0) {
                      return (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          Nenhum funil de destino disponível
                        </div>
                      );
                    }
                    
                    return setoresOrdenados.map(setor => (
                      <div key={setor}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                          {setor}
                        </div>
                        {porSetor[setor].map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-2">
                              <span>{f.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                ({f.tipo === 'negocio' ? 'Negócio' : 'Fluxo'})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown de Etapa/Coluna Destino */}
            {encaminharForm.funilDestinoId && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Etapa de Destino</Label>
                <Select
                  value={encaminharForm.etapaDestinoId}
                  onValueChange={(value) => setEncaminharForm(prev => ({ ...prev, etapaDestinoId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {etapasDestino.map((etapa) => (
                      <SelectItem key={etapa.id} value={etapa.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: etapa.cor }}
                          />
                          {etapa.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEncaminharDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEncaminharCard}
              disabled={!encaminharForm.funilDestinoId || !encaminharForm.etapaDestinoId || loadingEncaminhar}
            >
              {loadingEncaminhar ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {encaminharForm.acao === 'transferir' ? 'Transferir' : 'Duplicar'} Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o card <strong>"{cardToDelete?.titulo}"</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todas as atividades, movimentações e dados associados a este card serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCardToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCard}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Elaborar Orçamento */}
      <Dialog open={orcamentoDialogOpen} onOpenChange={(open) => {
        setOrcamentoDialogOpen(open);
        if (!open) {
          setOrcamentoView('menu');
        }
      }}>
        <DialogContent className={orcamentoView === 'calculadora-servicos-sst' ? 'max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col' : orcamentoView === 'calculadora-treinamento' || orcamentoView === 'calculadora-vertical365' || orcamentoView === 'comparacao-vertical365' || orcamentoView === 'proposta-comercial' || orcamentoView === 'proposta-comercial-servicos-sst' || orcamentoView === 'proposta-comercial-vertical365' ? 'max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}>
          {orcamentoView === 'menu' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Elaborar Orçamento
                </DialogTitle>
                <DialogDescription>
                  Selecione uma das opções abaixo para elaborar o orçamento do lead
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6 py-4">
                {/* Coluna Esquerda - Ações */}
                <div className="space-y-4">
                  {/* 1 - Calculadora para Treinamento Normativo */}
                  {configCalculadoras.treinamento_normativo && (
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${calculadoraSelecionada === 'treinamento' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'hover:bg-muted/50'}`}
                    onClick={() => setCalculadoraSelecionada('treinamento')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${calculadoraSelecionada === 'treinamento' ? 'bg-primary/10' : 'bg-blue-100'}`}>
                        <Calculator className={`h-5 w-5 ${calculadoraSelecionada === 'treinamento' ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h4 className={`font-medium text-sm ${calculadoraSelecionada === 'treinamento' ? 'text-green-700' : ''}`}>Calculadora para Treinamento Normativo</h4>
                        <p className="text-xs text-muted-foreground">Calcular o preço do treinamento</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={calculadoraSelecionada === 'treinamento' ? 'text-green-600 hover:text-green-700 hover:bg-primary/10 border-green-300' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrcamentoView('calculadora-treinamento');
                      }}
                    >
                      Calcular
                    </Button>
                  </div>
                  )}

                  {/* 2 - Calculadora para Serviços de SST */}
                  {configCalculadoras.servicos_sst && (
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${calculadoraSelecionada === 'mensal' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'hover:bg-muted/50'}`}
                    onClick={() => setCalculadoraSelecionada('mensal')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${calculadoraSelecionada === 'mensal' ? 'bg-primary/10' : 'bg-purple-100'}`}>
                        <Calculator className={`h-5 w-5 ${calculadoraSelecionada === 'mensal' ? 'text-green-600' : 'text-purple-600'}`} />
                      </div>
                      <div>
                        <h4 className={`font-medium text-sm ${calculadoraSelecionada === 'mensal' ? 'text-green-700' : ''}`}>Calculadora para Serviços de SST</h4>
                        <p className="text-xs text-muted-foreground">Calcular orçamento de serviços</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={calculadoraSelecionada === 'mensal' ? 'text-green-600 hover:text-green-700 hover:bg-primary/10 border-green-300' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrcamentoView('calculadora-servicos-sst');
                      }}
                    >
                      Calcular
                    </Button>
                  </div>
                  )}

                  {/* 3 - Vertical 365 */}
                  {configCalculadoras.vertical_365 && (
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${calculadoraSelecionada === 'vertical365' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'hover:bg-muted/50'}`}
                    onClick={() => setCalculadoraSelecionada('vertical365')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${calculadoraSelecionada === 'vertical365' ? 'bg-primary/10' : 'bg-primary/10'}`}>
                        <Calculator className={`h-5 w-5 ${calculadoraSelecionada === 'vertical365' ? 'text-green-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <h4 className={`font-medium text-sm ${calculadoraSelecionada === 'vertical365' ? 'text-green-700' : ''}`}>Vertical 365</h4>
                        <p className="text-xs text-muted-foreground">Calcular orçamento Vertical 365</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={calculadoraSelecionada === 'vertical365' ? 'text-green-600 hover:text-green-700 hover:bg-primary/10 border-green-300' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrcamentoView('calculadora-vertical365');
                      }}
                    >
                      Calcular
                    </Button>
                  </div>
                  )}

                  {/* 4 - Comparação Vertical 365 x Treinamentos */}
                  {configCalculadoras.comparacao_vertical_treinamentos && (
                  <div 
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 border-dashed border-amber-300"
                    onClick={() => {
                      if (viewingCard?.id) {
                        carregarComparacaoSalva(viewingCard.id);
                      }
                      setOrcamentoView('comparacao-vertical365');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100">
                        <Calculator className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Comparação Vertical 365 x Treinamentos</h4>
                        <p className="text-xs text-muted-foreground">Compare custos entre Vertical 365 e treinamentos avulsos</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (viewingCard?.id) {
                          carregarComparacaoSalva(viewingCard.id);
                        }
                        setOrcamentoView('comparacao-vertical365');
                      }}
                    >
                      Comparar
                    </Button>
                  </div>
                  )}
                </div>

                {/* Coluna Direita - Preview/Resultado */}
                <div className="border rounded-lg p-4 bg-muted/30 flex flex-col">
                  <h4 className="font-semibold text-sm mb-4 flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resultado
                  </h4>
                  
                  <div className="flex-1 flex flex-col gap-3 overflow-auto">
                    {/* Mostrar resultado baseado na calculadora selecionada */}
                    {!calculadoraSelecionada && (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <p className="text-sm text-center">Selecione uma calculadora ao lado para ver o resultado</p>
                      </div>
                    )}

                    {/* Seção 1 - Calculadora para Treinamento Normativo */}
                    {calculadoraSelecionada === 'treinamento' && (
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <h5 className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Calculadora para Treinamento Normativo
                      </h5>
                      
                      {/* Mostrar orçamento do cliente se disponível */}
                      {orcamentoClienteSalvo?.totais ? (
                        <div className="space-y-2">
                          {/* Info do orçamento do cliente */}
                          <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                            {orcamentoClienteSalvo.empresa && (
                              <p><span className="font-medium">Empresa:</span> {orcamentoClienteSalvo.empresa}</p>
                            )}
                            {orcamentoClienteSalvo.cidadeOrigem && orcamentoClienteSalvo.estadoOrigem && (
                              <p><span className="font-medium">Origem:</span> {orcamentoClienteSalvo.cidadeOrigem}/{orcamentoClienteSalvo.estadoOrigem}</p>
                            )}
                            {orcamentoClienteSalvo.cidadeDestino && (
                              <p><span className="font-medium">Destino:</span> {orcamentoClienteSalvo.cidadeDestino}</p>
                            )}
                            {orcamentoClienteSalvo.km && (
                              <p><span className="font-medium">KM:</span> {orcamentoClienteSalvo.km} km</p>
                            )}
                          </div>
                          
                          {/* Resumo do Orçamento do Cliente */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-700 mb-2">Orçamento para o Cliente</p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div 
                                className={`p-2 rounded cursor-pointer transition-colors ${planoSelecionadoOrcamento === 'ouro' ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-amber-50 hover:bg-amber-100'}`}
                                onClick={async () => {
                                  setPlanoSelecionadoOrcamento('ouro');
                                  if (viewingCard?.id && orcamentoClienteSalvo?.totais?.ouro) {
                                    const novoValor = orcamentoClienteSalvo.totais.ouro;
                                    try {
                                      await (supabase as any).from('funil_cards').update({ valor: novoValor }).eq('id', viewingCard.id);
                                      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, valor: novoValor } : c));
                                      setViewingCard(prev => prev ? { ...prev, valor: novoValor } : prev);
                                      toast({ title: 'Plano OURO selecionado', description: `Valor do negócio atualizado para ${novoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
                                    } catch (err) { console.error('Erro ao atualizar valor:', err); }
                                  }
                                }}
                              >
                                <p className="text-[10px] text-amber-700 font-medium">OURO {planoSelecionadoOrcamento === 'ouro' && '✓'}</p>
                                <p className="text-sm font-bold text-amber-800">
                                  {orcamentoClienteSalvo.totais.ouro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              <div 
                                className={`p-2 rounded cursor-pointer transition-colors ${planoSelecionadoOrcamento === 'prata' ? 'bg-slate-200 ring-2 ring-slate-500' : 'bg-slate-100 hover:bg-slate-200'}`}
                                onClick={async () => {
                                  setPlanoSelecionadoOrcamento('prata');
                                  if (viewingCard?.id && orcamentoClienteSalvo?.totais?.prata) {
                                    const novoValor = orcamentoClienteSalvo.totais.prata;
                                    try {
                                      await (supabase as any).from('funil_cards').update({ valor: novoValor }).eq('id', viewingCard.id);
                                      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, valor: novoValor } : c));
                                      setViewingCard(prev => prev ? { ...prev, valor: novoValor } : prev);
                                      toast({ title: 'Plano PRATA selecionado', description: `Valor do negócio atualizado para ${novoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
                                    } catch (err) { console.error('Erro ao atualizar valor:', err); }
                                  }
                                }}
                              >
                                <p className="text-[10px] text-slate-600 font-medium">PRATA {planoSelecionadoOrcamento === 'prata' && '✓'}</p>
                                <p className="text-sm font-bold text-slate-700">
                                  {orcamentoClienteSalvo.totais.prata.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              <div 
                                className={`p-2 rounded cursor-pointer transition-colors ${planoSelecionadoOrcamento === 'bronze' ? 'bg-orange-100 ring-2 ring-orange-500' : 'bg-orange-50 hover:bg-orange-100'}`}
                                onClick={async () => {
                                  setPlanoSelecionadoOrcamento('bronze');
                                  if (viewingCard?.id && orcamentoClienteSalvo?.totais?.bronze) {
                                    const novoValor = orcamentoClienteSalvo.totais.bronze;
                                    try {
                                      await (supabase as any).from('funil_cards').update({ valor: novoValor }).eq('id', viewingCard.id);
                                      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, valor: novoValor } : c));
                                      setViewingCard(prev => prev ? { ...prev, valor: novoValor } : prev);
                                      toast({ title: 'Plano BRONZE selecionado', description: `Valor do negócio atualizado para ${novoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
                                    } catch (err) { console.error('Erro ao atualizar valor:', err); }
                                  }
                                }}
                              >
                                <p className="text-[10px] text-orange-700 font-medium">BRONZE {planoSelecionadoOrcamento === 'bronze' && '✓'}</p>
                                <p className="text-sm font-bold text-orange-800">
                                  {orcamentoClienteSalvo.totais.bronze.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                              Clique em um plano para selecionar
                            </p>
                          </div>
                        </div>
                      ) : orcamentoTreinamentoSalvo?.tabelaPrecos ? (
                        <div className="space-y-2">
                          {/* Info do orçamento */}
                          <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                            {orcamentoTreinamentoSalvo.empresa && (
                              <p><span className="font-medium">Empresa:</span> {orcamentoTreinamentoSalvo.empresa}</p>
                            )}
                            {orcamentoTreinamentoSalvo.cidadeOrigem && orcamentoTreinamentoSalvo.estadoOrigem && (
                              <p><span className="font-medium">Origem:</span> {orcamentoTreinamentoSalvo.cidadeOrigem}/{orcamentoTreinamentoSalvo.estadoOrigem}</p>
                            )}
                            {orcamentoTreinamentoSalvo.cidadeDestino && (
                              <p><span className="font-medium">Destino:</span> {orcamentoTreinamentoSalvo.cidadeDestino}</p>
                            )}
                            {orcamentoTreinamentoSalvo.km && (
                              <p><span className="font-medium">KM:</span> {orcamentoTreinamentoSalvo.km} km</p>
                            )}
                          </div>
                          {/* Tabela de preços - clique para selecionar o plano */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-1 px-1 font-medium">CH</th>
                                  <th 
                                    className={`text-right py-1 px-1 font-medium cursor-pointer transition-colors rounded ${planoSelecionadoOrcamento === 'bronze' ? 'bg-primary/10 text-green-700 ring-2 ring-green-500' : 'text-amber-700 hover:bg-amber-50'}`}
                                    onClick={() => setPlanoSelecionadoOrcamento('bronze')}
                                    title="Clique para selecionar o plano Bronze"
                                  >
                                    Bronze {planoSelecionadoOrcamento === 'bronze' && '✓'}
                                  </th>
                                  <th 
                                    className={`text-right py-1 px-1 font-medium cursor-pointer transition-colors rounded ${planoSelecionadoOrcamento === 'prata' ? 'bg-primary/10 text-green-700 ring-2 ring-green-500' : 'text-slate-500 hover:bg-slate-50'}`}
                                    onClick={() => setPlanoSelecionadoOrcamento('prata')}
                                    title="Clique para selecionar o plano Prata"
                                  >
                                    Prata {planoSelecionadoOrcamento === 'prata' && '✓'}
                                  </th>
                                  <th 
                                    className={`text-right py-1 px-1 font-medium cursor-pointer transition-colors rounded ${planoSelecionadoOrcamento === 'ouro' ? 'bg-primary/10 text-green-700 ring-2 ring-green-500' : 'text-yellow-600 hover:bg-yellow-50'}`}
                                    onClick={() => setPlanoSelecionadoOrcamento('ouro')}
                                    title="Clique para selecionar o plano Ouro"
                                  >
                                    Ouro {planoSelecionadoOrcamento === 'ouro' && '✓'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {orcamentoTreinamentoSalvo.tabelaPrecos.map((row) => (
                                  <tr key={row.ch} className="border-b border-dashed last:border-0">
                                    <td className="py-1 px-1 font-medium">{row.ch}h</td>
                                    <td 
                                      className={`text-right py-1 px-1 cursor-pointer ${planoSelecionadoOrcamento === 'bronze' ? 'bg-green-50 text-green-700 font-semibold' : 'text-amber-700'}`}
                                      onClick={() => setPlanoSelecionadoOrcamento('bronze')}
                                    >
                                      {row.bronze.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td 
                                      className={`text-right py-1 px-1 cursor-pointer ${planoSelecionadoOrcamento === 'prata' ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-500'}`}
                                      onClick={() => setPlanoSelecionadoOrcamento('prata')}
                                    >
                                      {row.prata.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td 
                                      className={`text-right py-1 px-1 cursor-pointer ${planoSelecionadoOrcamento === 'ouro' ? 'bg-green-50 text-green-700 font-semibold' : 'text-yellow-600'}`}
                                      onClick={() => setPlanoSelecionadoOrcamento('ouro')}
                                    >
                                      {row.ouro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 text-center">
                            Clique em uma coluna para selecionar o plano
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-muted-foreground">
                          <p className="text-xs text-center">Clique em "Calcular" para ver o resultado</p>
                        </div>
                      )}
                      
                      {/* Botão Gerar Orçamento Comercial */}
                      {(orcamentoClienteSalvo?.totais || orcamentoTreinamentoSalvo?.tabelaPrecos) && (
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
                            onClick={() => setOrcamentoView('proposta-comercial')}
                          >
                            <FileText className="h-4 w-4" />
                            Gerar Orçamento Comercial
                          </Button>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Seção 2 - Calculadora para Serviços de SST */}
                    {calculadoraSelecionada === 'mensal' && (
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Calculadora para Serviços de SST
                        </h5>
                        {orcamentoServicosSSTSalvo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                            onClick={() => setOrcamentoView('calculadora-servicos-sst')}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                      {orcamentoServicosSSTSalvo?.totais ? (
                        <div className="space-y-2">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Custo Base:</span>
                              <span className="font-medium">{orcamentoServicosSSTSalvo.totais.custoBase?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Encargos:</span>
                              <span className="font-medium">{orcamentoServicosSSTSalvo.totais.totalEncargos?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Custo Total:</span>
                              <span className="font-medium">{orcamentoServicosSSTSalvo.totais.custoTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Preço Final:</span>
                              <span className="text-green-600">{orcamentoServicosSSTSalvo.totais.precoTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between bg-blue-50 dark:bg-blue-900/20 p-1 rounded font-semibold">
                              <span>Lucro:</span>
                              <span className="text-blue-600">{orcamentoServicosSSTSalvo.totais.lucro?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                            onClick={() => setOrcamentoView('proposta-comercial-servicos-sst')}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Gerar Proposta Comercial
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-muted-foreground">
                          <p className="text-xs text-center">Clique em "Calcular" para ver o resultado</p>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Seção 3 - Vertical 365 */}
                    {calculadoraSelecionada === 'vertical365' && (
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Vertical 365
                        </h5>
                        {orcamentoVertical365Salvo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                            onClick={() => setOrcamentoView('calculadora-vertical365')}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                      {orcamentoVertical365Salvo?.totais ? (
                        <div className="space-y-2">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Treinamentos:</span>
                              <span className="font-medium">{orcamentoVertical365Salvo.totais.totalTreinamentos?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Gestão Anual:</span>
                              <span className="font-medium">{orcamentoVertical365Salvo.totais.valorGestaoAnual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Implantação:</span>
                              <span className="font-medium">{orcamentoVertical365Salvo.totais.valorImplantacaoSistema?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            {orcamentoVertical365Salvo.desconto > 0 && (
                              <div className="flex justify-between text-destructive">
                                <span>Desconto ({orcamentoVertical365Salvo.desconto}%):</span>
                                <span className="font-medium">- {orcamentoVertical365Salvo.totais.valorDesconto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Total Anual:</span>
                              <span className="text-green-600">{orcamentoVertical365Salvo.totais.totalComDesconto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between bg-green-50 dark:bg-green-900/20 p-1 rounded font-semibold">
                              <span>Plano Vertical 365:</span>
                              <span className="text-blue-600">{orcamentoVertical365Salvo.totais.planoVertical365?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setOrcamentoView('proposta-comercial-vertical365')}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Gerar Proposta Comercial
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-muted-foreground">
                          <p className="text-xs text-center">Clique em "Calcular" para ver o resultado</p>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOrcamentoDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          ) : orcamentoView === 'calculadora-treinamento' ? (
            <CalculadoraTreinamentoNormativo 
              onClose={() => setOrcamentoView('menu')}
              onSave={(dados) => {
                setOrcamentoTreinamentoSalvo({
                  empresa: dados.empresa,
                  cidadeDestino: dados.cidadeDestino,
                  estadoOrigem: dados.estadoOrigem,
                  cidadeOrigem: dados.cidadeOrigem,
                  km: dados.km,
                  tabelaPrecos: dados.tabelaPrecos,
                  config: dados.config,
                });
              }}
              onSaveOrcamentoCliente={(dados) => {
                // Salvar dados do orçamento do cliente no estado
                if (viewingCard?.id) {
                  setOrcamentosClientePorCard(prev => ({
                    ...prev,
                    [viewingCard.id]: dados
                  }));
                }
                // Voltar para o menu de orçamento
                setOrcamentoView('menu');
              }}
              onOpenPropostaComercial={(dados) => {
                // Salvar dados do orçamento do cliente no estado
                if (viewingCard?.id) {
                  setOrcamentosClientePorCard(prev => ({
                    ...prev,
                    [viewingCard.id]: dados
                  }));
                }
                // Abrir proposta comercial
                setOrcamentoView('proposta-comercial');
              }}
              clientes={clientes}
              empresaInicial={viewingCard?.cliente?.nome || ''}
              cidadeInicial={(viewingCard?.cliente as any)?.cliente_empresa?.cidade || ''}
              estadoDestinoInicial={(viewingCard?.cliente as any)?.cliente_empresa?.estado || ''}
              estadoOrigemInicial={empresa?.estado || ''}
              cidadeOrigemInicial={empresa?.cidade || ''}
              dadosSalvos={orcamentoTreinamentoSalvo}
              cardId={viewingCard?.id}
              empresaId={empresaId}
            />
          ) : orcamentoView === 'calculadora-vertical365' ? (
            <CalculadoraVertical365 
              onClose={() => setOrcamentoView('menu')}
              onSave={(dados) => {
                setOrcamentoVertical365Salvo(dados);
                setOrcamentoView('menu');
              }}
              empresaInicial={viewingCard?.cliente?.nome || ''}
              tabelaPrecosTreinamento={orcamentoTreinamentoSalvo?.tabelaPrecos}
              planoSelecionado={planoSelecionadoOrcamento}
              dadosSalvos={orcamentoVertical365Salvo}
            />
          ) : orcamentoView === 'calculadora-servicos-sst' ? (
            <CalculadoraServicosSST 
              onClose={() => setOrcamentoView('menu')}
              onSave={(dados) => {
                setOrcamentoServicosSSTSalvo(dados);
                setOrcamentoView('menu');
              }}
              empresaInicial={viewingCard?.cliente?.nome || ''}
              dadosSalvos={orcamentoServicosSSTSalvo}
            />
          ) : orcamentoView === 'comparacao-vertical365' ? (
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Header fixo */}
              <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-amber-600" />
                    Comparação Vertical 365 x Treinamentos Avulsos
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare os custos entre contratar o Plano Vertical 365 e contratar treinamentos avulsos + sistema de gestão separado
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSalvarComparacao}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGerarPDFComparacao}
                    disabled={gerandoPDF}
                    className="gap-2"
                  >
                    {gerandoPDF ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setOrcamentoView('menu')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto p-6 pt-4" ref={comparacaoRef}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna 1 - Vertical 365 */}
                <div className="border rounded-lg p-4 bg-primary/5">
                  <h3 className="font-semibold text-lg text-primary mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    Plano Vertical 365
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Solução completa: treinamentos + sistema de gestão integrado
                  </p>
                  
                  <div className="space-y-3">
                    {/* Campo 1: Valor da turma de 8 horas do plano ouro */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelTreinamentosInclusos' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelTreinamentosInclusos(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelTreinamentosInclusos(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelTreinamentosInclusos}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelTreinamentosInclusos');
                                setEditingValue(labelTreinamentosInclusos);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-medium text-green-600">
                        {(1936).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    {/* Campo 2: Quantidade de turmas (input editável) */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelSistemaGestaoAnual' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelSistemaGestaoAnual(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelSistemaGestaoAnual(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelSistemaGestaoAnual}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelSistemaGestaoAnual');
                                setEditingValue(labelSistemaGestaoAnual);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={valorCampoNumerico}
                        onChange={(e) => setValorCampoNumerico(e.target.value)}
                        className="w-32 text-right font-medium text-green-600 h-8"
                      />
                    </div>
                    
                    {/* Campo 3: Resultado campo 1 × campo 2 */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelImplantacao' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelImplantacao(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelImplantacao(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelImplantacao}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelImplantacao');
                                setEditingValue(labelImplantacao);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-medium text-green-600">
                        {(1936 * (Number(valorCampoNumerico) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    {/* Campo 4: Sistema de Gestão de Treinamentos anual */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelTotalAnual' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelTotalAnual(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelTotalAnual(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelTotalAnual}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelTotalAnual');
                                setEditingValue(labelTotalAnual);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-medium text-green-600">
                        {orcamentoVertical365Salvo?.totais?.valorGestaoAnual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                      </span>
                    </div>
                    
                    {/* Campo 5: Implantação do sistema */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelValorMensal' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelValorMensal(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelValorMensal(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelValorMensal}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelValorMensal');
                                setEditingValue(labelValorMensal);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-medium text-green-600">
                        {orcamentoVertical365Salvo?.totais?.valorImplantacaoSistema?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                      </span>
                    </div>
                    {orcamentoVertical365Salvo?.desconto > 0 && (
                      <div className="flex justify-between items-center py-2 border-b text-destructive">
                        <span className="text-sm">Desconto ({orcamentoVertical365Salvo.desconto}%)</span>
                        <span className="font-medium">
                          - {orcamentoVertical365Salvo?.totais?.valorDesconto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}
                    
                    {/* Campo 6: Total Anual (campo 3 + campo 4 + campo 5) */}
                    <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-3 mt-4">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelCampoNumerico' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelCampoNumerico(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelCampoNumerico(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="font-semibold">{labelCampoNumerico}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelCampoNumerico');
                                setEditingValue(labelCampoNumerico);
                              }}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-primary" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-bold text-lg text-green-700">
                        {((1936 * (Number(valorCampoNumerico) || 0)) + (orcamentoVertical365Salvo?.totais?.valorGestaoAnual || 0) + (orcamentoVertical365Salvo?.totais?.valorImplantacaoSistema || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    {/* Campo 7: Valor Mensal (campo 6 / 12) */}
                    <div className="flex justify-between items-center py-3 bg-green-200 rounded-lg px-3">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelCampoValor' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelCampoValor(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelCampoValor(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="font-semibold">{labelCampoValor}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelCampoValor');
                                setEditingValue(labelCampoValor);
                              }}
                              className="p-1 hover:bg-primary/30 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-green-700" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-bold text-xl text-primary">
                        {(((1936 * (Number(valorCampoNumerico) || 0)) + (orcamentoVertical365Salvo?.totais?.valorGestaoAnual || 0) + (orcamentoVertical365Salvo?.totais?.valorImplantacaoSistema || 0)) / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coluna 2 - Treinamentos Avulsos + Sistema Separado */}
                <div className="border rounded-lg p-4 bg-destructive/5">
                  <h3 className="font-semibold text-lg text-destructive mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    Treinamentos Avulsos + Sistema Separado
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contratar treinamentos com uma empresa e sistema de gestão com outra
                  </p>
                  
                  <div className="space-y-3">
                    {/* Campo 1: Valor médio de treinamento (R$) */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelValorMedio' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelValorMedio(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelValorMedio(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelValorMedio}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelValorMedio');
                                setEditingValue(labelValorMedio);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={campo1Treinamento}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '');
                          setCampo1Treinamento(valor);
                        }}
                        className="w-32 text-right font-medium text-destructive h-8"
                      />
                    </div>
                    
                    {/* Campo 2: Quantidade de turmas */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelQuantidadeTurmas' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelQuantidadeTurmas(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelQuantidadeTurmas(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelQuantidadeTurmas}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelQuantidadeTurmas');
                                setEditingValue(labelQuantidadeTurmas);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={campo2Turmas}
                        onChange={(e) => setCampo2Turmas(e.target.value)}
                        className="w-32 text-right font-medium text-destructive h-8"
                      />
                    </div>
                    
                    {/* Campo 3: Valor total das turmas (Fórmula: Campo 1 * Campo 2) */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelValorTotalTurmas' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelValorTotalTurmas(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelValorTotalTurmas(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelValorTotalTurmas}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelValorTotalTurmas');
                                setEditingValue(labelValorTotalTurmas);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="w-32 text-right font-medium text-destructive h-8 flex items-center justify-end">
                        {((Number(campo1Treinamento) || 0) * (Number(campo2Turmas) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    {/* Campo 4: Sistema de Gestão (R$) */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelSistemaGestaoMensal' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelSistemaGestaoMensal(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelSistemaGestaoMensal(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelSistemaGestaoMensal}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelSistemaGestaoMensal');
                                setEditingValue(labelSistemaGestaoMensal);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={campo4SistemaGestao}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '');
                          setCampo4SistemaGestao(valor);
                        }}
                        className="w-32 text-right font-medium text-destructive h-8"
                      />
                    </div>
                    
                    {/* Campo 4.1: Valor total do sistema de gestão em 1 ano (Fórmula: Campo 4 × 12) */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelSistemaGestaoAnualAvulso' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelSistemaGestaoAnualAvulso(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelSistemaGestaoAnualAvulso(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="text-sm">{labelSistemaGestaoAnualAvulso}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelSistemaGestaoAnualAvulso');
                                setEditingValue(labelSistemaGestaoAnualAvulso);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="w-32 text-right font-medium text-destructive h-8 flex items-center justify-end">
                        {((Number(campo4SistemaGestao) || 0) * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    
                    {/* Campo 5: Implantação do Sistema (R$) */}
                    <div className="flex justify-between items-center py-3 bg-destructive/10 rounded-lg px-3 mt-4 border-b">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelImplantacaoAvulso' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelImplantacaoAvulso(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelImplantacaoAvulso(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="font-semibold">{labelImplantacaoAvulso}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelImplantacaoAvulso');
                                setEditingValue(labelImplantacaoAvulso);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={campo5Implantacao}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, '');
                          setCampo5Implantacao(valor);
                        }}
                        className="w-32 text-right font-medium text-destructive h-8 bg-destructive/10 border-0"
                      />
                    </div>
                    
                    {/* Campo 7: Valor total investido (Fórmula: Campo 3 + Campo 5 + Campo 4.1) */}
                    <div className="flex justify-between items-center py-3 bg-destructive/20 rounded-lg px-3">
                      <div className="flex items-center gap-2">
                        {editingLabel === 'labelValorTotalInvestido' ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              setLabelValorTotalInvestido(editingValue);
                              setEditingLabel(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLabelValorTotalInvestido(editingValue);
                                setEditingLabel(null);
                              }
                            }}
                            className="text-sm h-6"
                          />
                        ) : (
                          <>
                            <span className="font-semibold">{labelValorTotalInvestido}</span>
                            <button
                              onClick={() => {
                                setEditingLabel('labelValorTotalInvestido');
                                setEditingValue(labelValorTotalInvestido);
                              }}
                              className="p-1 hover:bg-destructive/30 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="font-bold text-xl text-destructive">
                        {(((Number(campo1Treinamento) || 0) * (Number(campo2Turmas) || 0)) + (Number(campo5Implantacao) || 0) + ((Number(campo4SistemaGestao) || 0) * 12)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo da Economia */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <span>💰</span> Resumo da Comparação
                </h4>
                
                {/* Comparativo Anual */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                    <span>📅</span> Comparativo Anual
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center bg-white/50 rounded-lg p-3">
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground mb-1">Vertical 365 (Anual)</p>
                      <p className="font-bold text-lg text-green-600">
                        {((1936 * (Number(valorCampoNumerico) || 0)) + (orcamentoVertical365Salvo?.totais?.valorGestaoAnual || 0) + (orcamentoVertical365Salvo?.totais?.valorImplantacaoSistema || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground mb-1">Avulso + Sistema (Anual)</p>
                      <p className="font-bold text-lg text-destructive">
                        {(((Number(campo1Treinamento) || 0) * (Number(campo2Turmas) || 0)) + (Number(campo5Implantacao) || 0) + ((Number(campo4SistemaGestao) || 0) * 12)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground mb-1">Economia Anual</p>
                      {(() => {
                        const vertical365Total = (1936 * (Number(valorCampoNumerico) || 0)) + (orcamentoVertical365Salvo?.totais?.valorGestaoAnual || 0) + (orcamentoVertical365Salvo?.totais?.valorImplantacaoSistema || 0);
                        const avulsoTotal = ((Number(campo1Treinamento) || 0) * (Number(campo2Turmas) || 0)) + (Number(campo5Implantacao) || 0) + ((Number(campo4SistemaGestao) || 0) * 12);
                        const economia = avulsoTotal - vertical365Total;
                        return (
                          <p className={`font-bold text-lg ${economia > 0 ? 'text-green-600' : economia < 0 ? 'text-destructive' : 'text-amber-600'}`}>
                            {economia > 0 ? '+' : ''}{economia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Pontos Fortes e Pontos a Desejar */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna 1 - Pontos Fortes do Vertical 365 */}
                <div className="border rounded-lg p-4 bg-green-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    {editingLabel === 'labelPontosFortes' ? (
                      <Input
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          setLabelPontosFortes(editingValue);
                          setEditingLabel(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setLabelPontosFortes(editingValue);
                            setEditingLabel(null);
                          }
                        }}
                        className="text-lg font-semibold h-8 flex-1"
                      />
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg text-green-700 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          {labelPontosFortes}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingLabel('labelPontosFortes');
                            setEditingValue(labelPontosFortes);
                          }}
                          className="p-1 hover:bg-primary/20 rounded"
                        >
                          <Edit2 className="h-3 w-3 text-primary" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Editor Rich Text - Pontos Fortes */}
                  <div className="border rounded-md bg-white/70 border-green-200">
                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-green-200 bg-green-50/50">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('bold')} title="Negrito">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('italic')} title="Itálico">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('underline')} title="Sublinhado">
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('strikeThrough')} title="Tachado">
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-green-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyLeft')} title="Alinhar à esquerda">
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyCenter')} title="Centralizar">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyRight')} title="Alinhar à direita">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-green-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('insertUnorderedList')} title="Lista">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('insertOrderedList')} title="Lista numerada">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-green-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const tableHtml = `<table style="border-collapse: collapse; width: 100%; margin: 8px 0;"><tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td></tr><tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td></tr></table>`;
                        document.execCommand('insertHTML', false, tableHtml);
                      }} title="Inserir tabela">
                        <Table2 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const url = prompt('Digite a URL da imagem:');
                        if (url) document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagem" style="max-width: 100%; height: auto; margin: 8px 0;" />`);
                      }} title="Inserir imagem">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const url = prompt('Digite a URL do link:');
                        if (url) {
                          const text = prompt('Digite o texto do link:', url);
                          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: #16a34a; text-decoration: underline;">${text || url}</a>`);
                        }
                      }} title="Inserir link">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div
                      contentEditable
                      className="min-h-[150px] p-3 focus:outline-none text-sm"
                      dangerouslySetInnerHTML={{ __html: textoPontosFortes }}
                      onBlur={(e) => setTextoPontosFortes(e.currentTarget.innerHTML)}
                      onInput={(e) => setTextoPontosFortes(e.currentTarget.innerHTML)}
                      data-placeholder="Digite os pontos fortes do Vertical 365..."
                      style={{ minHeight: '150px' }}
                    />
                  </div>
                </div>

                {/* Coluna 2 - Pontos a Desejar do Método Convencional */}
                <div className="border rounded-lg p-4 bg-destructive/5">
                  <div className="flex items-center gap-2 mb-3">
                    {editingLabel === 'labelPontosDesejar' ? (
                      <Input
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          setLabelPontosDesejar(editingValue);
                          setEditingLabel(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setLabelPontosDesejar(editingValue);
                            setEditingLabel(null);
                          }
                        }}
                        className="text-lg font-semibold h-8 flex-1"
                      />
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg text-destructive flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-destructive" />
                          {labelPontosDesejar}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingLabel('labelPontosDesejar');
                            setEditingValue(labelPontosDesejar);
                          }}
                          className="p-1 hover:bg-destructive/20 rounded"
                        >
                          <Edit2 className="h-3 w-3 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Editor Rich Text - Pontos a Desejar */}
                  <div className="border rounded-md bg-white/70 border-destructive/20">
                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-destructive/20 bg-destructive/5">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('bold')} title="Negrito">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('italic')} title="Itálico">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('underline')} title="Sublinhado">
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('strikeThrough')} title="Tachado">
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-red-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyLeft')} title="Alinhar à esquerda">
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyCenter')} title="Centralizar">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('justifyRight')} title="Alinhar à direita">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-red-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('insertUnorderedList')} title="Lista">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.execCommand('insertOrderedList')} title="Lista numerada">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-5 bg-red-300 mx-1" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const tableHtml = `<table style="border-collapse: collapse; width: 100%; margin: 8px 0;"><tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td></tr><tr><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td><td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td></tr></table>`;
                        document.execCommand('insertHTML', false, tableHtml);
                      }} title="Inserir tabela">
                        <Table2 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const url = prompt('Digite a URL da imagem:');
                        if (url) document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagem" style="max-width: 100%; height: auto; margin: 8px 0;" />`);
                      }} title="Inserir imagem">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const url = prompt('Digite a URL do link:');
                        if (url) {
                          const text = prompt('Digite o texto do link:', url);
                          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: #dc2626; text-decoration: underline;">${text || url}</a>`);
                        }
                      }} title="Inserir link">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div
                      contentEditable
                      className="min-h-[150px] p-3 focus:outline-none text-sm"
                      dangerouslySetInnerHTML={{ __html: textoPontosDesejar }}
                      onBlur={(e) => setTextoPontosDesejar(e.currentTarget.innerHTML)}
                      onInput={(e) => setTextoPontosDesejar(e.currentTarget.innerHTML)}
                      data-placeholder="Digite os pontos a desejar do método convencional..."
                      style={{ minHeight: '150px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Botão Voltar */}
              <div className="flex justify-end mt-6">
                <Button onClick={() => setOrcamentoView('menu')}>
                  Voltar ao Menu
                </Button>
              </div>
              </div>
            </div>
          ) : orcamentoView === 'proposta-comercial' ? (
            <PropostaComercialEditor
              onClose={() => setOrcamentoView('menu')}
              dadosCalculadora={orcamentosClientePorCard[viewingCard?.id || ''] || null}
              clienteNome={viewingCard?.cliente?.nome || viewingCard?.titulo || ''}
              clienteCidade={viewingCard?.cliente?.cidade || ''}
              clienteContato={viewingCard?.cliente?.responsavel || ''}
              clienteInfo={{
                nome: viewingCard?.cliente?.nome || viewingCard?.titulo || '',
                razaoSocial: viewingCard?.cliente?.nome || '',
                cnpj: viewingCard?.cliente?.cnpj || '',
                contato: viewingCard?.cliente?.responsavel || '',
                email: viewingCard?.cliente?.email || '',
                telefone: viewingCard?.cliente?.telefone || '',
                cidade: viewingCard?.cliente?.cidade || ''
              }}
              cardId={viewingCard?.id}
            />
          ) : orcamentoView === 'proposta-comercial-servicos-sst' ? (
            <PropostaComercialServicosSSTEditor
              onClose={() => setOrcamentoView('menu')}
              dadosOrcamento={orcamentoServicosSSTSalvo}
              clienteNome={viewingCard?.cliente?.nome || viewingCard?.titulo || ''}
              clienteCidade={viewingCard?.cliente?.cidade || ''}
              clienteContato={viewingCard?.cliente?.responsavel || ''}
              clienteInfo={{
                nome: viewingCard?.cliente?.nome || viewingCard?.titulo || '',
                razaoSocial: viewingCard?.cliente?.nome || '',
                cnpj: viewingCard?.cliente?.cnpj || '',
                contato: viewingCard?.cliente?.responsavel || '',
                email: viewingCard?.cliente?.email || '',
                telefone: viewingCard?.cliente?.telefone || '',
                cidade: viewingCard?.cliente?.cidade || ''
              }}
              cardId={viewingCard?.id}
              onSaveProposta={() => {
                setOrcamentoDialogOpen(false);
                setPropostasDialogOpen(true);
              }}
            />
          ) : orcamentoView === 'proposta-comercial-vertical365' ? (
            <PropostaComercialVertical365Editor
              onClose={() => setOrcamentoView('menu')}
              dadosOrcamento={orcamentoVertical365Salvo}
              clienteNome={viewingCard?.cliente?.nome || viewingCard?.titulo || ''}
              clienteCidade={viewingCard?.cliente?.cidade || ''}
              clienteInfo={{
                nome: viewingCard?.cliente?.nome || viewingCard?.titulo || '',
                razaoSocial: viewingCard?.cliente?.nome || '',
                cnpj: viewingCard?.cliente?.cnpj || '',
                contato: viewingCard?.cliente?.responsavel || '',
                email: viewingCard?.cliente?.email || '',
                telefone: viewingCard?.cliente?.telefone || '',
                cidade: viewingCard?.cliente?.cidade || ''
              }}
              cardId={viewingCard?.id}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog para Gerar Proposta */}
      <Dialog open={propostaDialogOpen} onOpenChange={setPropostaDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Gerar Proposta</DialogTitle>
          </DialogHeader>
          <GeradorProposta 
            onClose={() => setPropostaDialogOpen(false)}
            clienteNome={viewingCard?.cliente?.nome || viewingCard?.titulo || ''}
            cardId={viewingCard?.id}
            dadosOrcamento={
              calculadoraSelecionada === 'treinamento' && orcamentoTreinamentoSalvo ? {
                tipo: 'treinamento',
                planoSelecionado: planoSelecionadoOrcamento,
                tabelaPrecos: orcamentoTreinamentoSalvo.tabelaPrecos
              } : calculadoraSelecionada === 'vertical365' && orcamentoVertical365Salvo ? {
                tipo: 'vertical365',
                planoSelecionado: planoSelecionadoOrcamento,
                itens: orcamentoVertical365Salvo.itens,
                valorTotal: orcamentoVertical365Salvo.valorTotal
              } : null
            }
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para Ver Propostas Comerciais */}
      <Dialog open={propostasDialogOpen} onOpenChange={setPropostasDialogOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 overflow-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Propostas Comerciais</DialogTitle>
          </DialogHeader>
          <PropostasComerciais 
            onClose={() => {
              setPropostasDialogOpen(false);
              setPropostasSearchFilter(''); // Limpar filtro ao fechar
            }}
            cardId={viewingCard?.id}
            initialSearchTerm={propostasSearchFilter}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para Atribuir Kit Equipamentos */}
      <Dialog open={atribuirKitDialogOpen} onOpenChange={(open) => {
        setAtribuirKitDialogOpen(open);
        if (!open) {
          setBuscaMovimentacaoId('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-orange-500" />
              Kit de Equipamentos
            </DialogTitle>
            <DialogDescription>
              {movimentacaoKitDoCard 
                ? `Kit atribuído ao card "${cardParaAtribuirKit?.titulo}"`
                : `Selecione um kit para atribuir ao card "${cardParaAtribuirKit?.titulo}"`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Exibir kit atual se existir */}
            {loadingMovimentacaoKit ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movimentacaoKitDoCard ? (
              <div className="space-y-4">
                {/* Info do Kit Atual */}
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-base">{movimentacaoKitDoCard.kit?.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          {movimentacaoKitDoCard.kit?.codigo}
                        </Badge>
                        <Badge className="text-xs bg-orange-500">
                          {movimentacaoKitDoCard.numero_movimentacao}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {movimentacaoKitDoCard.quantidade || 1} kit(s)
                    </Badge>
                  </div>
                  
                  {/* Equipamentos do Kit */}
                  {movimentacaoKitDoCard.kit?.equipamentos && movimentacaoKitDoCard.kit.equipamentos.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-orange-200">
                      <p className="text-xs font-medium text-muted-foreground">Equipamentos inclusos:</p>
                      <div className="bg-white/70 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                        {movimentacaoKitDoCard.kit.equipamentos.map((item, idx) => {
                          const qtdTotal = item.quantidade * (movimentacaoKitDoCard.quantidade || 1);
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                              <span className="truncate flex-1">{item.equipamento?.nome || 'Equipamento'}</span>
                              <div className="flex items-center gap-3 ml-2">
                                <span className="text-muted-foreground text-xs">{item.quantidade}/kit</span>
                                <Badge variant="outline" className="text-xs font-medium">
                                  Total: {qtdTotal}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Total geral */}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-orange-200">
                        <span className="font-medium">Total de equipamentos:</span>
                        <span className="font-bold text-orange-600 text-base">
                          {movimentacaoKitDoCard.kit.equipamentos.reduce((acc, item) => 
                            acc + (item.quantidade * (movimentacaoKitDoCard.quantidade || 1)), 0
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Botões de ação - desabilitados se kit já foi devolvido */}
                {movimentacaoKitDoCard.status === 'devolvido' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-700">Kit Devolvido</p>
                    <p className="text-sm text-green-600 mt-1">
                      Este kit já foi devolvido e o estoque foi restaurado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="default"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setConfirmarRetornoKitDialogOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retornar Kit de Treinamento
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          // Mostrar lista para alterar
                          setMovimentacaoKitDoCard(null);
                          loadKitsComDemanda();
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Alterar Kit
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          await handleRemoverKitDoCard();
                          setAtribuirKitDialogOpen(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Kit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Campo de busca por ID de movimentação */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID, nome ou código do kit..."
                    value={buscaMovimentacaoId}
                    onChange={(e) => setBuscaMovimentacaoId(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {loadingKits ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : kitsComDemanda.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LayoutGrid className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma movimentação com demanda disponível</p>
                    <p className="text-sm mt-1">
                      Crie uma movimentação (kit ou equipamentos) com status "Demanda" no módulo de Equipamentos SST
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {kitsComDemanda
                      .filter(mov => {
                        if (!buscaMovimentacaoId.trim()) return true;
                        const termo = buscaMovimentacaoId.toLowerCase();
                        return (
                          mov.numero_movimentacao?.toLowerCase().includes(termo) ||
                          mov.kit?.nome?.toLowerCase().includes(termo) ||
                          mov.kit?.codigo?.toLowerCase().includes(termo) ||
                          mov.tipo_servico?.toLowerCase().includes(termo)
                        );
                      })
                      .map((movimentacao) => {
                        const isKit = !!movimentacao.kit_id;
                        const isEquipamentosIndividuais = movimentacao.equipamentos_lista && movimentacao.equipamentos_lista.length > 0;
                        
                        return (
                          <div
                            key={movimentacao.id}
                            className="border rounded-lg p-3 hover:border-orange-300 cursor-pointer transition-colors group"
                            onClick={() => handleAtribuirKit(movimentacao.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isKit ? (
                                    <Badge variant="outline" className="text-2xs bg-orange-50 text-orange-700 border-orange-200">
                                      Kit
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-2xs bg-blue-50 text-blue-700 border-blue-200">
                                      Equipamentos
                                    </Badge>
                                  )}
                                  <p className="font-medium text-sm truncate">
                                    {isKit 
                                      ? movimentacao.kit?.nome 
                                      : `${movimentacao.equipamentos_lista?.length || 0} equipamento(s)`
                                    }
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {isKit && movimentacao.kit?.codigo && (
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {movimentacao.kit.codigo}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs font-mono bg-orange-100 text-orange-700">
                                    {movimentacao.numero_movimentacao}
                                  </Badge>
                                  {movimentacao.quantidade && (
                                    <Badge variant="outline" className="text-xs">
                                      Qtd: {movimentacao.quantidade}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                Selecionar
                              </Button>
                            </div>
                            
                            {/* Tipo de serviço */}
                            {movimentacao.tipo_servico && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-2xs bg-gray-50">
                                  {movimentacao.tipo_servico}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Lista de equipamentos para movimentações individuais */}
                            {isEquipamentosIndividuais && movimentacao.equipamentos_lista && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {movimentacao.equipamentos_lista.slice(0, 2).map((item: any, idx: number) => (
                                  <span key={idx}>
                                    {idx > 0 && ', '}
                                    {item.quantidade}x equip.
                                  </span>
                                ))}
                                {movimentacao.equipamentos_lista.length > 2 && (
                                  <span> +{movimentacao.equipamentos_lista.length - 2} mais</span>
                                )}
                              </div>
                            )}
                            
                            {/* Tipos de serviço do kit */}
                            {isKit && movimentacao.kit?.tipo_servico && movimentacao.kit.tipo_servico.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {movimentacao.kit.tipo_servico.slice(0, 3).map((tipo: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-2xs">
                                    {tipo}
                                  </Badge>
                                ))}
                                {movimentacao.kit.tipo_servico.length > 3 && (
                                  <Badge variant="outline" className="text-2xs">
                                    +{movimentacao.kit.tipo_servico.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    
                    {/* Mensagem quando filtro não encontra resultados */}
                    {buscaMovimentacaoId.trim() && kitsComDemanda.filter(mov => {
                      const termo = buscaMovimentacaoId.toLowerCase();
                      return (
                        mov.numero_movimentacao?.toLowerCase().includes(termo) ||
                        mov.kit?.nome?.toLowerCase().includes(termo) ||
                        mov.kit?.codigo?.toLowerCase().includes(termo) ||
                        mov.tipo_servico?.toLowerCase().includes(termo)
                      );
                    }).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhuma movimentação encontrada com "{buscaMovimentacaoId}"
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirKitDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Retorno de Kit */}
      <Dialog open={confirmarRetornoKitDialogOpen} onOpenChange={setConfirmarRetornoKitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-600" />
              Confirmar Retorno de Kit
            </DialogTitle>
            <DialogDescription>
              Você está prestes a devolver o kit de treinamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-primary mb-2">
                <strong>Atenção:</strong> Esta ação irá:
              </p>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li>Mover o card de movimentação para a coluna <strong>"Devolvido"</strong> no Controle de Equipamentos</li>
                <li>Registrar a data de retorno do kit</li>
                <li>Desassociar o kit deste card do funil</li>
              </ul>
            </div>
            
            {movimentacaoKitDoCard && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Kit a ser devolvido:</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-mono">
                    {movimentacaoKitDoCard.kit?.codigo}
                  </Badge>
                  <span className="text-sm">{movimentacaoKitDoCard.kit?.nome}</span>
                </div>
                <Badge className="text-xs bg-orange-500 mt-2">
                  {movimentacaoKitDoCard.numero_movimentacao}
                </Badge>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmarRetornoKitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleRetornarKitTreinamento}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Atribuir Movimentação de Veículo */}
      <Dialog open={atribuirVeiculoDialogOpen} onOpenChange={(open) => {
        setAtribuirVeiculoDialogOpen(open);
        if (!open) {
          setCardParaAtribuirVeiculo(null);
          setMovimentacoesVeiculo([]);
          setMovimentacaoVeiculoDoCard(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-600" />
              Atribuir Movimentação de Veículo
            </DialogTitle>
            <DialogDescription>
              Vincule uma movimentação de veículo a este card.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Movimentação já atribuída */}
            {movimentacaoVeiculoDoCard && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Veículo Vinculado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-mono bg-white">
                        {movimentacaoVeiculoDoCard.veiculo?.placa || 'N/A'}
                      </Badge>
                      <span className="text-sm text-green-700">
                        {movimentacaoVeiculoDoCard.veiculo?.marca} {movimentacaoVeiculoDoCard.veiculo?.modelo}
                      </span>
                    </div>
                    {movimentacaoVeiculoDoCard.codigo && (
                      <Badge className="text-xs bg-orange-500 mt-2">
                        {movimentacaoVeiculoDoCard.codigo}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={handleDesvincularVeiculo}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Desvincular
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de movimentações disponíveis */}
            {!movimentacaoVeiculoDoCard && (
              <>
                {loadingMovimentacoesVeiculo ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando movimentações...</span>
                  </div>
                ) : movimentacoesVeiculo.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma movimentação de veículo disponível.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie uma utilização em Controle de Frota primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Selecione uma movimentação para vincular:
                    </p>
                    {movimentacoesVeiculo.map((mov) => (
                      <div
                        key={mov.id}
                        className="border rounded-lg p-3 hover:border-orange-300 cursor-pointer transition-colors"
                        onClick={() => handleAtribuirVeiculo(mov.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {mov.veiculo?.placa || 'N/A'}
                              </Badge>
                              <span className="text-sm font-medium">
                                {mov.veiculo?.marca} {mov.veiculo?.modelo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {mov.codigo && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {mov.codigo}
                                </Badge>
                              )}
                              <span>Motorista: {mov.motorista || 'N/A'}</span>
                              {mov.data_saida && (
                                <span>• Saída: {format(parseISO(mov.data_saida), 'dd/MM/yyyy', { locale: ptBR })}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={
                            mov.status === 'em_uso' ? 'default' :
                            mov.status === 'agendado' ? 'outline' : 'secondary'
                          }>
                            {mov.status === 'em_uso' ? 'Em Uso' :
                             mov.status === 'agendado' ? 'Agendado' : mov.status || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirVeiculoDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Nova Atividade */}
      <Dialog open={novaAtividadeDialogOpen} onOpenChange={setNovaAtividadeDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>
              Selecione o tipo e preencha os detalhes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            {/* Seleção de Tipo de Atividade */}
            {!tipoAtividadeSelecionado ? (
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_ATIVIDADE
                  .filter(tipo => !funilConfig?.card_interno_atividades_tipos || funilConfig.card_interno_atividades_tipos.includes(tipo.id))
                  .map((tipo) => (
                  <div
                    key={tipo.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setTipoAtividadeSelecionado(tipo.id);
                      setNovaAtividade(prev => ({ ...prev, tipo: tipo.id, descricao: '', prazo: '', horario: '' }));
                    }}
                  >
                    <tipo.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{tipo.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Header do tipo selecionado */}
                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  {(() => {
                    const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === tipoAtividadeSelecionado);
                    const TipoIcon = tipoInfo?.icon || FileText;
                    return (
                      <>
                        <TipoIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tipoInfo?.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 text-xs text-muted-foreground"
                          onClick={() => setTipoAtividadeSelecionado(null)}
                        >
                          Alterar
                        </Button>
                      </>
                    );
                  })()}
                </div>

                {/* Formulário */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Descrição *</Label>
                    <Textarea
                      placeholder="Descreva a atividade..."
                      value={novaAtividade.descricao}
                      onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                      className="min-h-[100px] mt-1"
                    />
                  </div>

                  {/* Checklist Items - apenas para tipo checklist */}
                  {tipoAtividadeSelecionado === 'checklist' && (
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <ListChecks className="h-4 w-4 text-amber-600" />
                        <Label className="text-xs font-medium">Itens do Checklist</Label>
                      </div>
                      
                      {checklistItems.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {checklistItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-background rounded">
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 text-sm">{item}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleRemoveChecklistItem(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Adicionar item..."
                          value={novoChecklistItem}
                          onChange={(e) => setNovoChecklistItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChecklistItem();
                            }
                          }}
                          className="flex-1 h-9 text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={handleAddChecklistItem}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Data e Hora */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Data e Hora da Atividade</Label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Data */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-10 mt-1 justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {novaAtividade.prazo ? (
                                format(parse(novaAtividade.prazo, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span className="text-muted-foreground">Selecionar</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={novaAtividade.prazo ? parse(novaAtividade.prazo, 'yyyy-MM-dd', new Date()) : undefined}
                              onSelect={(date) => setNovaAtividade(prev => ({ 
                                ...prev, 
                                prazo: date ? format(date, 'yyyy-MM-dd') : '' 
                              }))}
                              locale={ptBR}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Horário - Input com máscara HH:MM */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Horário</Label>
                        <div className="relative mt-1">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="HH:MM"
                            maxLength={5}
                            value={novaAtividade.horario}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^\d:]/g, '');
                              // Auto-adicionar : após 2 dígitos
                              if (value.length === 2 && !value.includes(':') && e.target.value.length > (novaAtividade.horario?.length || 0)) {
                                value = value + ':';
                              }
                              // Validar formato HH:MM
                              if (value.length <= 5) {
                                // Validar hora (0-23) e minuto (0-59)
                                if (value.length === 5) {
                                  const [h, m] = value.split(':').map(Number);
                                  if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                                    setNovaAtividade(prev => ({ ...prev, horario: value }));
                                  }
                                } else {
                                  setNovaAtividade(prev => ({ ...prev, horario: value }));
                                }
                              }
                            }}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Preview e botão limpar */}
                    {(novaAtividade.prazo || novaAtividade.horario) && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>
                            {novaAtividade.prazo && format(parse(novaAtividade.prazo, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            {novaAtividade.prazo && novaAtividade.horario && ' às '}
                            {novaAtividade.horario && novaAtividade.horario}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setNovaAtividade(prev => ({ ...prev, prazo: '', horario: '' }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Responsável</Label>
                    <Select
                      value={novaAtividade.responsavel_id || ''}
                      onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, responsavel_id: value }))}
                    >
                      <SelectTrigger className="h-10 mt-1">
                        <SelectValue placeholder="Selecionar responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsaveis.map((resp) => (
                          <SelectItem key={resp.id} value={resp.id}>
                            {resp.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Anexo (opcional)</Label>
                    <div className="mt-1">
                      {atividadeAnexo ? (
                        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate flex-1">{atividadeAnexo.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setAtividadeAnexo(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Clique para anexar arquivo</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAtividadeAnexo(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setNovaAtividadeDialogOpen(false);
                setTipoAtividadeSelecionado(null);
                setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '', responsavel_id: '' });
                setAtividadeAnexo(null);
                setChecklistItems([]);
              }}
            >
              Cancelar
            </Button>
            {tipoAtividadeSelecionado && (
              <Button 
                onClick={async () => {
                  await handleAddAtividade();
                  setNovaAtividadeDialogOpen(false);
                  setTipoAtividadeSelecionado(null);
                  setAtividadeAnexo(null);
                }}
                disabled={!novaAtividade.descricao.trim() || uploadingAnexo}
              >
                {uploadingAnexo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {uploadingAnexo ? 'Salvando...' : 'Criar Atividade'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação - Mover para Etapa Trancada */}
      <Dialog open={!!pendingLockedMove} onOpenChange={(open) => { if (!open) setPendingLockedMove(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Etapa Trancada
            </DialogTitle>
            <DialogDescription>
              Você está movendo o card <strong>"{pendingLockedMove?.card?.titulo}"</strong> para a etapa <strong>"{pendingLockedMove?.targetEtapaNome}"</strong>.
              <br /><br />
              <span className="text-orange-600 font-medium">
                Esta etapa é trancada. Uma vez movido, o card não poderá ser removido desta etapa.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPendingLockedMove(null)}>
              Cancelar
            </Button>
            <Button 
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={executePendingLockedMove}
            >
              Confirmar Movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração do Funil */}
      <FunilConfigDialog
        funilId={funilId}
        funilNome={funil?.nome || ''}
        funilTipo={funil?.tipo || 'fluxo_trabalho'}
        empresaId={empresaId}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={() => {
          loadFunilConfig();
          loadEtapas();
        }}
      />

      {/* Modal de Detalhes da Atividade */}
      <AtividadeDetalheModal
        atividade={atividadeSelecionada}
        open={atividadeDetalheOpen}
        onOpenChange={setAtividadeDetalheOpen}
        initialEditMode={atividadeEditModeInicial}
        onInitialEditModeHandled={() => setAtividadeEditModeInicial(false)}
        onMarcarConcluida={(atividade) => {
          handleUpdateAtividadeStatus(atividade.id, 'concluida');
          setAtividadeDetalheOpen(false);
        }}
        onToggleChecklistItem={(atividadeId, itemIndex) => {
          handleToggleChecklistItem(atividadeId, itemIndex);
          // Update the selected activity reference so the modal re-renders
          const updated = atividades.find(a => a.id === atividadeId);
          if (updated) {
            try {
              const checkData = JSON.parse(updated.descricao);
              checkData.itens[itemIndex].concluido = !checkData.itens[itemIndex].concluido;
              setAtividadeSelecionada({ ...updated, descricao: JSON.stringify(checkData) });
            } catch {}
          }
        }}
        onDeleteAtividade={handleDeleteAtividade}
        onEditAtividade={(atividadeId, dados) => {
          handleEditAtividade(atividadeId, dados);
          // Update the selected activity reference
          setAtividadeSelecionada(prev => prev ? { ...prev, descricao: dados.descricao, prazo: dados.prazo || null, horario: dados.horario || null } : null);
        }}
      />
    </div>
  );
}
