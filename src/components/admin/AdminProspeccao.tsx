import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AtividadePopup } from './AtividadePopup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDroppable } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Phone,
  Mail,
  Building2,
  User,
  DollarSign,
  Calendar,
  Flame,
  Snowflake,
  ThermometerSun,
  GripVertical,
  Filter,
  Search,
  Loader2,
  Settings,
  Archive,
  MessageSquare,
  FileText,
  Video,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Target,
  Star,
  X,
  LayoutGrid,
  List,
  ArrowRightLeft,
  ArrowRight,
  UserCheck,
  Tag,
  Pencil,
  AlertCircle,
  Save,
  Globe,
  Linkedin,
  Instagram,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// ID fixo da empresa Toriq (vertical_on) - para buscar colaboradores do setor comercial
const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

// Interfaces
interface Coluna {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string;
  ordem: number;
  meta_valor: number;
}

interface ProspeccaoCard {
  id: string;
  empresa_id: string;
  coluna_id: string;
  titulo: string;
  descricao: string | null;
  valor: number;
  responsavel_id: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  contato_empresa: string | null;
  origem: string | null;
  temperatura: 'frio' | 'morno' | 'quente';
  data_contato: string | null;
  data_followup: string | null;
  ordem: number;
  arquivado: boolean;
  created_at?: string;
  created_by?: string | null;
  empresa_lead_id?: string | null;
  contatos?: { nome: string; email: string; telefone: string }[];
}

interface EmpresaLead {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  porte: string | null;
  site: string | null;
  linkedin: string | null;
  instagram: string | null;
}

interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

interface Etiqueta {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string;
  created_at?: string;
}

interface CardEtiqueta {
  card_id: string;
  etiqueta_id: string;
  etiqueta?: Etiqueta;
}

interface CardMovimentacao {
  id: string;
  card_id: string;
  usuario_id: string | null;
  tipo: 'criacao' | 'mudanca_coluna' | 'mudanca_etapa' | 'encaminhamento' | 'edicao';
  descricao: string;
  coluna_origem_id: string | null;
  coluna_destino_id: string | null;
  pagina_origem: string | null;
  pagina_destino: string | null;
  dados_anteriores: any;
  dados_novos: any;
  created_at: string;
  usuario?: { nome: string };
}

// Cores disponíveis para etiquetas
const CORES_ETIQUETAS = [
  { nome: 'Amarelo', cor: '#f59e0b' },
  { nome: 'Laranja', cor: '#f97316' },
  { nome: 'Vermelho', cor: '#ef4444' },
  { nome: 'Rosa', cor: '#ec4899' },
  { nome: 'Roxo', cor: '#a855f7' },
  { nome: 'Azul', cor: '#3b82f6' },
  { nome: 'Ciano', cor: '#06b6d4' },
  { nome: 'Verde', cor: '#22c55e' },
  { nome: 'Lima', cor: '#84cc16' },
  { nome: 'Cinza', cor: '#6b7280' },
];

interface Atividade {
  id: string;
  card_id: string;
  usuario_id: string | null;
  tipo: string;
  descricao: string | null;
  dados_anteriores: any;
  dados_novos: any;
  responsavel_id: string | null;
  prazo: string | null;
  horario: string | null;
  anexos: { nome: string; url: string; tipo: string }[] | null;
  checklist_items: ChecklistItem[] | null;
  membros_ids: string[] | null;
  created_at: string;
  status: 'a_realizar' | 'programada' | 'pendente' | 'concluida';
  data_conclusao?: string | null;
  usuario?: {
    nome: string;
  };
}

// Tipos de atividades para seleção (botões)
const TIPOS_ATIVIDADE_SELECAO = [
  { id: 'tarefa', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-blue-100 text-blue-700' },
  { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-green-100 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-purple-100 text-purple-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-orange-100 text-orange-700' },
  { id: 'checklist', label: 'Checklist', icon: CheckCircle2, cor: 'bg-yellow-100 text-yellow-700' },
];

// Todos os tipos de atividades (incluindo automáticos para histórico)
const TIPOS_ATIVIDADE = [
  ...TIPOS_ATIVIDADE_SELECAO,
  { id: 'nota', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700' }, // Legado - mapeia para Tarefa
  { id: 'movimentacao', label: 'Movimentação', icon: ArrowRightLeft, cor: 'bg-indigo-100 text-indigo-700' },
  { id: 'mudanca_etapa', label: 'Mudança de Etapa', icon: ArrowRightLeft, cor: 'bg-indigo-100 text-indigo-700' },
  { id: 'criacao', label: 'Criação', icon: Plus, cor: 'bg-teal-100 text-teal-700' },
];

// Cores disponíveis para colunas (keys únicas)
const CORES_COLUNAS = [
  { key: 'indigo', value: '#6366f1' },
  { key: 'violet', value: '#8b5cf6' },
  { key: 'purple', value: '#a855f7' },
  { key: 'fuchsia', value: '#d946ef' },
  { key: 'pink', value: '#ec4899' },
  { key: 'rose', value: '#f43f5e' },
  { key: 'red', value: '#ef4444' },
  { key: 'orange', value: '#f97316' },
  { key: 'amber', value: '#f59e0b' },
  { key: 'yellow', value: '#eab308' },
  { key: 'lime', value: '#84cc16' },
  { key: 'green', value: '#22c55e' },
  { key: 'emerald', value: '#10b981' },
  { key: 'teal', value: '#14b8a6' },
  { key: 'cyan', value: '#06b6d4' },
  { key: 'sky', value: '#0ea5e9' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'slate', value: '#64748b' },
  { key: 'stone', value: '#78716c' },
  { key: 'zinc', value: '#71717a' },
];

// CSS para animação de gelatina
const jellyKeyframes = `
@keyframes jelly {
  0%, 100% { transform: scale(1, 1); }
  25% { transform: scale(0.95, 1.05); }
  50% { transform: scale(1.05, 0.95); }
  75% { transform: scale(0.98, 1.02); }
}
`;

// Componente Card Arrastável
function SortableCard({ 
  card, 
  onEdit, 
  onDelete,
  onViewDetails,
  onAddAtividade,
  isDropped,
  atividades = [],
  etiquetas = [],
  cardIndex,
}: { 
  card: ProspeccaoCard; 
  onEdit: (card: ProspeccaoCard) => void;
  onDelete: (id: string) => void;
  onViewDetails: (card: ProspeccaoCard) => void;
  onAddAtividade: (card: ProspeccaoCard) => void;
  isDropped?: boolean;
  atividades?: Atividade[];
  etiquetas?: CardEtiqueta[];
  cardIndex?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    data: {
      type: 'card',
      card,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    animation: isDropped ? 'jelly 0.5s ease' : undefined,
  };

  const getTemperaturaIcon = () => {
    switch (card.temperatura) {
      case 'quente':
        return <Flame className="h-3 w-3 text-red-500" />;
      case 'morno':
        return <ThermometerSun className="h-3 w-3 text-orange-500" />;
      case 'frio':
        return <Snowflake className="h-3 w-3 text-blue-500" />;
    }
  };

  const getTemperaturaBadge = () => {
    switch (card.temperatura) {
      case 'quente':
        return <Badge className="text-2xs bg-error/15 text-error border-error/30">Quente</Badge>;
      case 'morno':
        return <Badge className="text-2xs bg-warning/15 text-warning border-warning/30">Morno</Badge>;
      case 'frio':
        return <Badge className="text-2xs bg-info/15 text-info border-info/30">Frio</Badge>;
    }
  };

  const getTemperaturaColor = () => {
    switch (card.temperatura) {
      case 'quente': return 'hsl(var(--temp-quente))';
      case 'morno': return 'hsl(var(--temp-morno))';
      case 'frio': return 'hsl(var(--temp-frio))';
    }
  };

  // Calcular status das atividades do card
  const getAtividadeStatus = () => {
    if (atividades.length === 0) {
      return { status: 'sem_atividade', label: 'Sem atividade', color: 'text-red-500', bgColor: 'bg-red-500' };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const atividadesNaoConcluidas = atividades.filter(a => a.status !== 'concluida');
    
    if (atividadesNaoConcluidas.length === 0) {
      return { status: 'todas_concluidas', label: 'Todas concluídas', color: 'text-green-500', bgColor: 'bg-green-500' };
    }
    
    // Verificar se há atividades para hoje
    const atividadesHoje = atividadesNaoConcluidas.filter(a => {
      if (!a.prazo) return false;
      const prazoDate = new Date(a.prazo);
      prazoDate.setHours(0, 0, 0, 0);
      return prazoDate.getTime() === today.getTime();
    });
    
    if (atividadesHoje.length > 0) {
      return { status: 'a_realizar', label: 'A ser realizada', color: 'text-orange-500', bgColor: 'bg-orange-500' };
    }
    
    // Verificar se há atividades atrasadas
    const atividadesAtrasadas = atividadesNaoConcluidas.filter(a => {
      if (!a.prazo) return false;
      const prazoDate = new Date(a.prazo);
      prazoDate.setHours(0, 0, 0, 0);
      return prazoDate < today;
    });
    
    if (atividadesAtrasadas.length > 0) {
      return { status: 'pendente', label: 'Pendente', color: 'text-red-500', bgColor: 'bg-red-500' };
    }
    
    // Atividades programadas para o futuro
    return { status: 'programada', label: 'Programada', color: 'text-blue-500', bgColor: 'bg-blue-500' };
  };

  const atividadeStatus = getAtividadeStatus();
  const proximaAtividade = atividades.filter(a => a.status !== 'concluida' && a.prazo).sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group ${atividadeStatus.status === 'a_realizar' ? 'border-orange-500 border-2' : atividadeStatus.status === 'pendente' ? 'border-red-500 border-2' : 'border-border hover:border-primary/50'}`}
    >
      {/* Indicador de temperatura na lateral */}
      <div 
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        style={{ backgroundColor: getTemperaturaColor() }}
      />
      
      <div className="flex items-start justify-between gap-2 pl-2">
        <div 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onViewDetails(card)}
        >
          <div className="flex items-center gap-2 mb-1">
            {getTemperaturaIcon()}
            <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">
              {cardIndex !== undefined ? `#${cardIndex + 1} - ` : ''}{card.contato_nome || card.titulo}
            </h4>
          </div>
          
          {card.contato_empresa && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{card.contato_empresa}</span>
            </div>
          )}
          
          {/* Etiquetas do card */}
          {etiquetas.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1 mb-1">
              {etiquetas.map((ce) => (
                ce.etiqueta && (
                  <div
                    key={ce.etiqueta_id}
                    className="px-1.5 py-0.5 rounded text-2xs font-medium text-white"
                    style={{ backgroundColor: ce.etiqueta.cor }}
                  >
                    {ce.etiqueta.nome}
                  </div>
                )
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Indicador de status da atividade */}
            <Badge className={`text-2xs ${atividadeStatus.status === 'sem_atividade' ? 'bg-red-500/15 text-red-500 border-red-500/30' : atividadeStatus.status === 'pendente' ? 'bg-red-500/15 text-red-500 border-red-500/30' : atividadeStatus.status === 'a_realizar' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' : atividadeStatus.status === 'programada' ? 'bg-blue-500/15 text-blue-500 border-blue-500/30' : 'bg-green-500/15 text-green-500 border-green-500/30'}`}>
              {atividadeStatus.status === 'sem_atividade' && <XCircle className="h-3 w-3 mr-1" />}
              {atividadeStatus.label}
            </Badge>
          </div>
          {/* Próxima atividade */}
          {proximaAtividade && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${atividadeStatus.status === 'pendente' ? 'text-red-500' : atividadeStatus.status === 'a_realizar' ? 'text-orange-500' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              <span>{format(parse(proximaAtividade.prazo!.split('T')[0], 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}</span>
              {proximaAtividade.horario && <span>às {proximaAtividade.horario}</span>}
            </div>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(card)}>
              <FileText className="h-4 w-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(card)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddAtividade(card)}>
              <Plus className="h-4 w-4 mr-2" />
              Atividade
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(card.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Componente Coluna do Kanban (Sortable para permitir reordenação)
function SortableColumn({
  coluna,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onViewDetails,
  onAddAtividade,
  onEditColumn,
  onDeleteColumn,
  droppedCardId,
  cardAtividades,
  allCardEtiquetas,
  allCards,
}: {
  coluna: Coluna;
  cards: ProspeccaoCard[];
  onAddCard: (colunaId: string) => void;
  onEditCard: (card: ProspeccaoCard) => void;
  onDeleteCard: (id: string) => void;
  onViewDetails: (card: ProspeccaoCard) => void;
  onAddAtividade: (card: ProspeccaoCard) => void;
  onEditColumn: (coluna: Coluna) => void;
  onDeleteColumn: (id: string) => void;
  droppedCardId: string | null;
  cardAtividades: Record<string, Atividade[]>;
  allCardEtiquetas: Record<string, CardEtiqueta[]>;
  allCards: ProspeccaoCard[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: coluna.id,
    data: {
      type: 'column',
      coluna,
    }
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${coluna.id}`,
    data: {
      type: 'column',
      coluna,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setSortableRef}
      style={style}
      className={`flex-shrink-0 w-80 bg-card/50 rounded-xl border border-border flex flex-col max-h-full transition-all ${
        isOver ? 'ring-2 ring-primary/50 border-primary/50 bg-primary/5' : ''
      } ${isDragging ? 'z-50 shadow-xl' : ''}`}
    >
      {/* Header da Coluna - arrastável */}
      <div 
        className="p-4 rounded-t-xl cursor-grab active:cursor-grabbing border-b border-border/50"
        style={{ borderTop: `3px solid ${coluna.cor}` }}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: coluna.cor }}
            />
            <h3 className="font-semibold text-sm truncate">{coluna.nome}</h3>
            <Badge variant="secondary" className="text-xs flex-shrink-0 bg-muted/50">{cards.length}</Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0 opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onEditColumn(coluna)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Coluna
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteColumn(coluna.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards da Coluna - área de drop */}
      <div 
        ref={setDroppableRef}
        className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors scrollbar-thin ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onViewDetails={onViewDetails}
              onAddAtividade={onAddAtividade}
              isDropped={droppedCardId === card.id}
              atividades={cardAtividades[card.id] || []}
              etiquetas={allCardEtiquetas[card.id] || []}
              cardIndex={allCards.findIndex(c => c.id === card.id)}
            />
          ))}
        </SortableContext>
        
        {cards.length === 0 && (
          <div className={`text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg transition-colors ${
            isOver ? 'border-primary bg-primary/10 text-primary' : 'border-border'
          }`}>
            <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>Arraste leads para cá</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Interface para empresa
interface Empresa {
  id: string;
  nome: string;
}

// Componente Principal
export function AdminProspeccao() {
  const { empresa, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [cards, setCards] = useState<ProspeccaoCard[]>([]);
  const [activeCard, setActiveCard] = useState<ProspeccaoCard | null>(null);
  const [activeColuna, setActiveColuna] = useState<Coluna | null>(null);
  const [dragOriginColunaId, setDragOriginColunaId] = useState<string | null>(null);
  const [droppedCardId, setDroppedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Para admin_vertical: lista de empresas e empresa selecionada
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin_vertical';
  
  // Visualização: 'kanban' ou 'tabela'
  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('kanban');
  
  // Dialogs
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [colunaDialogOpen, setColunaDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ProspeccaoCard | null>(null);
  const [editingColuna, setEditingColuna] = useState<Coluna | null>(null);
  const [selectedColunaId, setSelectedColunaId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [viewingCard, setViewingCard] = useState<ProspeccaoCard | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [atividadePopupOpen, setAtividadePopupOpen] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);
  const [novaAtividade, setNovaAtividade] = useState({ 
    tipo: 'tarefa', 
    descricao: '', 
    responsavel_id: '',
    prazo: '',
    horario: '',
    checklist_items: [] as ChecklistItem[],
    membros_ids: [] as string[],
  });
  const [anexos, setAnexos] = useState<File[]>([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  
  // Estados para modelos de mensagens
  const [modelos, setModelos] = useState<{ id: string; tipo: string; titulo: string; conteudo: string }[]>([]);
  const [modelosOpen, setModelosOpen] = useState(false);
  const [novoModelo, setNovoModelo] = useState({ titulo: '', conteudo: '' });
  const [criarModeloOpen, setCriarModeloOpen] = useState(false);
  
  // Estados para responsáveis
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([]);
  
  // Estados para etiquetas
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [cardEtiquetas, setCardEtiquetas] = useState<CardEtiqueta[]>([]);
  const [allCardEtiquetas, setAllCardEtiquetas] = useState<Record<string, CardEtiqueta[]>>({});
  
  // Estado para informações da empresa lead do card visualizado
  const [viewingEmpresaLead, setViewingEmpresaLead] = useState<EmpresaLead | null>(null);
  const [etiquetasDialogOpen, setEtiquetasDialogOpen] = useState(false);
  const [novaEtiqueta, setNovaEtiqueta] = useState({ nome: '', cor: '#f59e0b' });
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [buscaEtiqueta, setBuscaEtiqueta] = useState('');
  
  // Estado para controlar se o formulário de atividade está expandido
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  
  // Estado para controlar o dialog de nova atividade
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  
  // Estado para atividades de todos os cards (para exibir indicadores no kanban)
  const [cardAtividades, setCardAtividades] = useState<Record<string, Atividade[]>>({});
  
  // Estado para histórico de movimentações do card
  const [cardMovimentacoes, setCardMovimentacoes] = useState<CardMovimentacao[]>([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  
  // Estado para dialog de justificativa de mudança de etapa
  const [mudancaEtapaDialog, setMudancaEtapaDialog] = useState<{
    open: boolean;
    colunaDestino: Coluna | null;
    colunaOrigem: Coluna | null;
    etapasMovidas: number;
    direcao: 'avanco' | 'retrocesso';
  }>({
    open: false,
    colunaDestino: null,
    colunaOrigem: null,
    etapasMovidas: 0,
    direcao: 'avanco',
  });
  const [justificativaMudanca, setJustificativaMudanca] = useState('');
  
  // Estados para confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'coluna' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  
  // Opções de origem para dropdown
  const ORIGENS_LEAD = [
    'Site',
    'Google (orgânico)',
    'Google Ads',
    'Instagram',
    'Facebook',
    'LinkedIn',
    'YouTube',
    'WhatsApp',
    'Indicação',
    'E-mail',
    'Telefone',
    'Evento',
    'Parceiro',
    'Marketplace',
    'Outro',
  ];

  // Estado para empresas do tipo Lead
  const [empresasLead, setEmpresasLead] = useState<{ id: string; nome: string }[]>([]);
  
  // Estado para contatos da empresa selecionada
  const [empresaContatos, setEmpresaContatos] = useState<{ id: string; nome: string; cargo: string; email: string; telefone: string; linkedin: string; principal: boolean }[]>([]);

  // Form states
  const [cardForm, setCardForm] = useState({
    titulo: '',
    descricao: '',
    empresa_lead_id: '',
    contatos: [{ nome: '', email: '', telefone: '' }],
    origem: '',
    temperatura: 'morno' as 'frio' | 'morno' | 'quente',
    data_contato: '',
    data_followup: '',
  });
  
  const [colunaForm, setColunaForm] = useState({
    nome: '',
    cor: '#6366f1',
    meta_valor: 0,
  });

  // SDR Prospecção é exclusivo da Toriq - sempre usar TORIQ_EMPRESA_ID
  const empresaId = TORIQ_EMPRESA_ID;

  // Buscar lista de empresas para admin e responsáveis
  useEffect(() => {
    if (isAdmin) {
      fetchEmpresas();
    }
    fetchEmpresasLead();
    fetchResponsaveisAndReturn();
  }, [isAdmin]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('empresas')
        .select('id, nome')
        .order('nome');
      
      if (error) throw error;
      setEmpresas(data || []);
      
      // Selecionar primeira empresa automaticamente
      if (data && data.length > 0 && !selectedEmpresaId) {
        setSelectedEmpresaId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  const fetchEmpresasLead = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('tipo', 'lead')
        .order('nome');
      
      if (error) throw error;
      setEmpresasLead(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas lead:', error);
    }
  };

  // Função para buscar dados da empresa e preencher contatos automaticamente
  const handleEmpresaLeadChange = async (empresaLeadId: string) => {
    setCardForm(prev => ({ ...prev, empresa_lead_id: empresaLeadId }));
    setEmpresaContatos([]);
    
    if (!empresaLeadId) return;
    
    try {
      // Buscar contatos cadastrados da empresa
      const { data: contatosData, error: contatosError } = await (supabase as any)
        .from('empresa_contatos')
        .select('*')
        .eq('empresa_id', empresaLeadId)
        .order('principal', { ascending: false });
      
      if (!contatosError && contatosData && contatosData.length > 0) {
        // Empresa tem contatos cadastrados
        setEmpresaContatos(contatosData);
        
        // Preencher o formulário com os contatos da empresa
        const contatosFormatados = contatosData.map((c: any) => ({
          nome: c.nome || '',
          email: c.email || '',
          telefone: c.telefone || '',
        }));
        
        setCardForm(prev => ({
          ...prev,
          contatos: contatosFormatados
        }));
      } else {
        // Empresa não tem contatos cadastrados - buscar dados básicos da empresa
        const { data: empresaData, error } = await supabase
          .from('empresas')
          .select('nome, email, telefone')
          .eq('id', empresaLeadId)
          .single();
        
        if (!error && empresaData) {
          const novoContato = {
            nome: '',
            email: empresaData.email || '',
            telefone: empresaData.telefone || '',
          };
          
          if (novoContato.email || novoContato.telefone) {
            setCardForm(prev => ({
              ...prev,
              contatos: [novoContato]
            }));
          } else {
            setCardForm(prev => ({
              ...prev,
              contatos: [{ nome: '', email: '', telefone: '' }]
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    }
  };
  
  // Função para salvar contato na empresa
  const handleSaveContatoToEmpresa = async (contato: { nome: string; email: string; telefone: string }) => {
    if (!cardForm.empresa_lead_id || !contato.nome) {
      toast({
        title: 'Erro',
        description: 'Selecione uma empresa e preencha o nome do contato.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('empresa_contatos')
        .insert({
          empresa_id: cardForm.empresa_lead_id,
          nome: contato.nome,
          email: contato.email || null,
          telefone: contato.telefone || null,
          principal: empresaContatos.length === 0,
        });
      
      if (error) throw error;
      
      // Recarregar contatos da empresa
      const { data: contatosData } = await (supabase as any)
        .from('empresa_contatos')
        .select('*')
        .eq('empresa_id', cardForm.empresa_lead_id)
        .order('principal', { ascending: false });
      
      setEmpresaContatos(contatosData || []);
      
      toast({
        title: 'Sucesso',
        description: 'Contato salvo na empresa!',
      });
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o contato.',
        variant: 'destructive',
      });
    }
  };

  // Sensors para drag and drop
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

  // Fetch data
  useEffect(() => {
    if (empresaId) {
      fetchData();
    }
  }, [empresaId]);

  const fetchData = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      // Buscar colunas
      const { data: colunasData, error: colunasError } = await (supabase as any)
        .from('prospeccao_colunas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });

      if (colunasError) throw colunasError;

      // Se não houver colunas, criar as padrões
      if (!colunasData || colunasData.length === 0) {
        await criarColunasPadrao();
        return;
      }

      setColunas(colunasData);

      // Buscar cards
      const { data: cardsData, error: cardsError } = await (supabase as any)
        .from('prospeccao_cards')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('arquivado', false)
        .order('ordem', { ascending: true });

      if (cardsError) throw cardsError;
      setCards(cardsData || []);
      
      // Buscar atividades de todos os cards para exibir indicadores
      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map((c: ProspeccaoCard) => c.id);
        const { data: atividadesData } = await supabase
          .from('prospeccao_atividades' as any)
          .select('*')
          .in('card_id', cardIds)
          .order('prazo', { ascending: true, nullsFirst: false });
        
        // Agrupar atividades por card_id
        const atividadesPorCard: Record<string, Atividade[]> = {};
        (atividadesData || []).forEach((atividade: any) => {
          if (!atividadesPorCard[atividade.card_id]) {
            atividadesPorCard[atividade.card_id] = [];
          }
          atividadesPorCard[atividade.card_id].push(atividade);
        });
        setCardAtividades(atividadesPorCard);
        
        // Buscar etiquetas de todos os cards para exibir no kanban
        const { data: etiquetasData, error: etiquetasError } = await (supabase as any)
          .from('prospeccao_card_etiquetas')
          .select('*, etiqueta:prospeccao_etiquetas(*)');
        
        if (etiquetasError) {
          console.error('Erro ao buscar etiquetas:', etiquetasError);
        }
        
        // Agrupar etiquetas por card_id
        const etiquetasPorCard: Record<string, CardEtiqueta[]> = {};
        (etiquetasData || []).forEach((ce: CardEtiqueta) => {
          if (!etiquetasPorCard[ce.card_id]) {
            etiquetasPorCard[ce.card_id] = [];
          }
          etiquetasPorCard[ce.card_id].push(ce);
        });
        setAllCardEtiquetas(etiquetasPorCard);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const criarColunasPadrao = async () => {
    if (!empresaId) return;

    const colunasPadrao = [
      { nome: 'Novo Lead', cor: '#6366f1', ordem: 0 },
      { nome: 'Contato Inicial', cor: '#8b5cf6', ordem: 1 },
      { nome: 'Qualificação', cor: '#a855f7', ordem: 2 },
      { nome: 'Proposta Enviada', cor: '#f59e0b', ordem: 3 },
      { nome: 'Negociação', cor: '#f97316', ordem: 4 },
      { nome: 'Fechado/Ganho', cor: '#22c55e', ordem: 5 },
      { nome: 'Perdido', cor: '#ef4444', ordem: 6 },
    ];

    try {
      const { error } = await (supabase as any)
        .from('prospeccao_colunas')
        .insert(colunasPadrao.map(c => ({ ...c, empresa_id: empresaId })));

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Erro ao criar colunas padrão:', error);
    }
  };

  // Funções para histórico de movimentações
  const fetchMovimentacoes = async (cardId: string) => {
    setLoadingMovimentacoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('prospeccao_card_movimentacoes')
        .select(`
          *,
          usuario:profiles(nome)
        `)
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCardMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    } finally {
      setLoadingMovimentacoes(false);
    }
  };

  const registrarMovimentacao = async (
    cardId: string,
    tipo: 'criacao' | 'mudanca_coluna' | 'mudanca_etapa' | 'encaminhamento' | 'edicao',
    descricao: string,
    dados?: {
      coluna_origem_id?: string;
      coluna_destino_id?: string;
      pagina_origem?: string;
      pagina_destino?: string;
      dados_anteriores?: any;
      dados_novos?: any;
    }
  ) => {
    try {
      await (supabase as any)
        .from('prospeccao_card_movimentacoes')
        .insert({
          card_id: cardId,
          usuario_id: profile?.id,
          tipo,
          descricao,
          coluna_origem_id: dados?.coluna_origem_id || null,
          coluna_destino_id: dados?.coluna_destino_id || null,
          pagina_origem: dados?.pagina_origem || null,
          pagina_destino: dados?.pagina_destino || null,
          dados_anteriores: dados?.dados_anteriores || null,
          dados_novos: dados?.dados_novos || null,
        });
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
    }
  };

  // Função para executar mudança de etapa (usada pela navegação e pelo dialog de justificativa)
  const executarMudancaEtapa = async (
    colunaDestino: Coluna,
    colunaOrigem: Coluna,
    justificativa?: string
  ) => {
    if (!viewingCard) return;
    
    try {
      // Atualizar card no banco
      await (supabase as any)
        .from('prospeccao_cards')
        .update({ coluna_id: colunaDestino.id })
        .eq('id', viewingCard.id);
      
      // Atualizar estado local
      setViewingCard({ ...viewingCard, coluna_id: colunaDestino.id });
      setCards(prev => prev.map(c => 
        c.id === viewingCard.id ? { ...c, coluna_id: colunaDestino.id } : c
      ));
      
      // Determinar direção
      const indexOrigem = colunas.findIndex(c => c.id === colunaOrigem.id);
      const indexDestino = colunas.findIndex(c => c.id === colunaDestino.id);
      const direcao = indexDestino > indexOrigem ? 'avançou' : 'retrocedeu';
      const etapasMovidas = Math.abs(indexDestino - indexOrigem);
      
      // Montar descrição
      let descricao = `Lead ${direcao} de "${colunaOrigem.nome}" para "${colunaDestino.nome}"`;
      if (etapasMovidas > 1) {
        descricao += ` (${etapasMovidas} etapas)`;
      }
      if (justificativa) {
        descricao += `. Justificativa: ${justificativa}`;
      }
      
      // Registrar no histórico de movimentações
      await registrarMovimentacao(
        viewingCard.id,
        'mudanca_etapa',
        descricao,
        {
          coluna_origem_id: colunaOrigem.id,
          coluna_destino_id: colunaDestino.id,
          dados_anteriores: { coluna_nome: colunaOrigem.nome, de: colunaOrigem.nome },
          dados_novos: { coluna_nome: colunaDestino.nome, para: colunaDestino.nome },
        }
      );
      
      // NOTA: Movimentações de etapa vão APENAS para a tabela de movimentações
      // Atividades são apenas tarefas criadas manualmente pelo usuário via "Nova Atividade"
      
      // Recarregar atividades e movimentações
      await fetchAtividades(viewingCard.id);
      await fetchMovimentacoes(viewingCard.id);
      
      toast({
        title: 'Etapa alterada',
        description: `Lead movido para "${colunaDestino.nome}"`,
      });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o card',
        variant: 'destructive',
      });
    }
  };

  // Handler para clique na navegação de etapas
  const handleMudarEtapa = (colunaDestino: Coluna) => {
    if (!viewingCard) return;
    
    const colunaOrigem = colunas.find(c => c.id === viewingCard.coluna_id);
    if (!colunaOrigem || colunaOrigem.id === colunaDestino.id) return;
    
    const indexOrigem = colunas.findIndex(c => c.id === colunaOrigem.id);
    const indexDestino = colunas.findIndex(c => c.id === colunaDestino.id);
    const etapasMovidas = Math.abs(indexDestino - indexOrigem);
    const direcao = indexDestino > indexOrigem ? 'avanco' : 'retrocesso';
    
    // Se mover mais de 1 etapa OU se for retrocesso, pedir justificativa
    if (etapasMovidas > 1 || direcao === 'retrocesso') {
      setMudancaEtapaDialog({
        open: true,
        colunaDestino,
        colunaOrigem,
        etapasMovidas,
        direcao,
      });
      setJustificativaMudanca('');
    } else {
      // Avançar 1 etapa não precisa de justificativa
      executarMudancaEtapa(colunaDestino, colunaOrigem);
    }
  };

  // Handlers de Drag and Drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
      setActiveColuna(null);
      // Armazenar a coluna de origem para rastrear movimentação
      setDragOriginColunaId(activeData.card.coluna_id);
    } else if (activeData?.type === 'column') {
      setActiveColuna(activeData.coluna);
      setActiveCard(null);
      setDragOriginColunaId(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Só processar se for um card sendo arrastado
    if (activeData?.type !== 'card') return;

    const activeCardData = activeData.card as ProspeccaoCard;
    const activeId = active.id as string;

    // Determinar a coluna de destino
    let targetColunaId: string | null = null;

    // Se estiver sobre uma área droppable de coluna
    if (over.id.toString().startsWith('droppable-')) {
      targetColunaId = over.id.toString().replace('droppable-', '');
    }
    // Se estiver sobre outro card
    else if (overData?.type === 'card') {
      const overCard = overData.card as ProspeccaoCard;
      targetColunaId = overCard.coluna_id;
    }
    // Se estiver sobre uma coluna diretamente
    else if (overData?.type === 'column') {
      targetColunaId = overData.coluna.id;
    }

    // Mover card para nova coluna se necessário
    if (targetColunaId && activeCardData.coluna_id !== targetColunaId) {
      setCards(prev => prev.map(c => 
        c.id === activeId ? { ...c, coluna_id: targetColunaId! } : c
      ));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    
    // Salvar a coluna de origem antes de limpar os estados
    const savedOriginColunaId = dragOriginColunaId;
    
    // Limpar estados
    setActiveCard(null);
    setActiveColuna(null);
    setDragOriginColunaId(null);

    if (!over) return;

    // Se for uma coluna sendo movida
    if (activeData?.type === 'column') {
      const activeId = active.id as string;
      const overId = over.id as string;
      
      if (activeId !== overId) {
        const oldIndex = colunas.findIndex(c => c.id === activeId);
        const newIndex = colunas.findIndex(c => c.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(colunas, oldIndex, newIndex);
          setColunas(reordered.map((c, i) => ({ ...c, ordem: i })));
          
          // Salvar ordem das colunas no banco
          try {
            for (let i = 0; i < reordered.length; i++) {
              await (supabase as any)
                .from('prospeccao_colunas')
                .update({ ordem: i })
                .eq('id', reordered[i].id);
            }
          } catch (error) {
            console.error('Erro ao reordenar colunas:', error);
            fetchData();
          }
        }
      }
      return;
    }

    // Se for um card sendo movido
    if (activeData?.type === 'card') {
      const activeId = active.id as string;
      const activeCardData = activeData.card as ProspeccaoCard;
      const overData = over.data.current;
      
      // Usar a coluna de origem armazenada no início do drag
      const colunaOrigemId = savedOriginColunaId || activeCardData.coluna_id;

      // Determinar coluna de destino
      let targetColunaId = colunaOrigemId;
      
      if (over.id.toString().startsWith('droppable-')) {
        targetColunaId = over.id.toString().replace('droppable-', '');
      } else if (overData?.type === 'card') {
        targetColunaId = (overData.card as ProspeccaoCard).coluna_id;
      } else if (overData?.type === 'column') {
        targetColunaId = overData.coluna.id;
      }

      // Verificar se realmente mudou de coluna
      const mudouDeColuna = colunaOrigemId !== targetColunaId;

      // Atualizar card com nova coluna
      const cardAtualizado = cards.find(c => c.id === activeId);
      if (cardAtualizado) {
        // Calcular nova ordem
        const cardsNaColuna = cards.filter(c => c.coluna_id === targetColunaId && c.id !== activeId);
        const novaOrdem = cardsNaColuna.length;

        // Atualizar estado local
        setCards(prev => prev.map(c => 
          c.id === activeId ? { ...c, coluna_id: targetColunaId, ordem: novaOrdem } : c
        ));

        // Ativar efeito gelatina
        setDroppedCardId(activeId);
        setTimeout(() => setDroppedCardId(null), 500);

        // Salvar no banco
        try {
          const { error: updateError } = await (supabase as any)
            .from('prospeccao_cards')
            .update({ 
              coluna_id: targetColunaId,
              ordem: novaOrdem
            })
            .eq('id', activeId);
          
          if (updateError) {
            console.error('Erro ao atualizar card:', updateError);
          }
          
          // Registrar movimentação como atividade concluída (se mudou de coluna)
          console.log('Verificando mudança de coluna:', { mudouDeColuna, colunaOrigemId, targetColunaId });
          
          if (mudouDeColuna) {
            const colunaOrigem = colunas.find(c => c.id === colunaOrigemId);
            const colunaDestino = colunas.find(c => c.id === targetColunaId);
            
            console.log('Registrando movimentação:', { 
              card_id: activeId, 
              de: colunaOrigem?.nome, 
              para: colunaDestino?.nome 
            });
            
            // Registrar apenas no histórico de movimentações do card (não no histórico de atividades)
            await registrarMovimentacao(
              activeId,
              'mudanca_coluna',
              `Lead movido de "${colunaOrigem?.nome || 'Coluna anterior'}" para "${colunaDestino?.nome || 'Nova coluna'}"`,
              {
                coluna_origem_id: colunaOrigemId,
                coluna_destino_id: targetColunaId,
                pagina_origem: 'prospeccao',
                pagina_destino: 'prospeccao',
                dados_anteriores: { coluna_nome: colunaOrigem?.nome },
                dados_novos: { coluna_nome: colunaDestino?.nome },
              }
            );
            
            // Atualizar cardAtividades local
            fetchData();
          }
        } catch (error) {
          console.error('Erro ao mover card:', error);
          fetchData();
        }
      }
    }
  };

  // Buscar modelos de mensagens
  const fetchModelos = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('prospeccao_modelos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('titulo');

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
    }
  };

  // Buscar responsáveis (colaboradores do setor Comercial da Toriq) e retornar os dados
  const fetchResponsaveisAndReturn = async (): Promise<{ id: string; nome: string }[]> => {
    try {
      // Primeiro tenta buscar colaboradores do setor Comercial
      let { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('empresa_id', TORIQ_EMPRESA_ID)
        .ilike('setor', '%comercial%')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      
      // Se não encontrar nenhum do setor Comercial, busca todos os colaboradores ativos da Toriq
      if (!data || data.length === 0) {
        const result = await supabase
          .from('colaboradores')
          .select('id, nome')
          .eq('empresa_id', TORIQ_EMPRESA_ID)
          .eq('ativo', true)
          .order('nome');
        
        if (result.error) throw result.error;
        data = result.data;
      }
      
      // Se ainda não encontrar, busca todos os colaboradores ativos (sem filtro de empresa)
      if (!data || data.length === 0) {
        const result = await supabase
          .from('colaboradores')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        
        if (result.error) throw result.error;
        data = result.data;
      }
      
      setResponsaveis(data || []);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
      return [];
    }
  };

  // Alias para compatibilidade
  const fetchResponsaveis = fetchResponsaveisAndReturn;

  // Buscar etiquetas da empresa
  const fetchEtiquetas = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('prospeccao_etiquetas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      setEtiquetas(data || []);
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
    }
  };

  // Buscar etiquetas de um card específico
  const fetchCardEtiquetas = async (cardId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('prospeccao_card_etiquetas')
        .select('*, etiqueta:prospeccao_etiquetas(*)')
        .eq('card_id', cardId);
      
      if (error) throw error;
      setCardEtiquetas(data || []);
    } catch (error) {
      console.error('Erro ao buscar etiquetas do card:', error);
    }
  };

  // Criar nova etiqueta
  const handleCriarEtiqueta = async () => {
    if (!empresaId || !novaEtiqueta.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a etiqueta.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('prospeccao_etiquetas')
        .insert({
          empresa_id: empresaId,
          nome: novaEtiqueta.nome.trim(),
          cor: novaEtiqueta.cor,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      setEtiquetas(prev => [...prev, data]);
      setNovaEtiqueta({ nome: '', cor: '#f59e0b' });
      setCriandoEtiqueta(false);
      toast({ title: 'Sucesso', description: 'Etiqueta criada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao criar etiqueta:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível criar a etiqueta.',
        variant: 'destructive',
      });
    }
  };

  // Alternar etiqueta no card (adicionar/remover)
  const handleToggleEtiqueta = async (etiquetaId: string) => {
    if (!viewingCard) return;

    const jaTemEtiqueta = cardEtiquetas.some(ce => ce.etiqueta_id === etiquetaId);

    try {
      if (jaTemEtiqueta) {
        // Remover etiqueta
        const { error } = await (supabase as any)
          .from('prospeccao_card_etiquetas')
          .delete()
          .eq('card_id', viewingCard.id)
          .eq('etiqueta_id', etiquetaId);

        if (error) throw error;
        const newCardEtiquetas = cardEtiquetas.filter(ce => ce.etiqueta_id !== etiquetaId);
        setCardEtiquetas(newCardEtiquetas);
        // Atualizar também o estado global para refletir no kanban
        setAllCardEtiquetas(prev => ({
          ...prev,
          [viewingCard.id]: newCardEtiquetas,
        }));
      } else {
        // Adicionar etiqueta
        const { data, error } = await (supabase as any)
          .from('prospeccao_card_etiquetas')
          .insert({
            card_id: viewingCard.id,
            etiqueta_id: etiquetaId,
          })
          .select('*, etiqueta:prospeccao_etiquetas(*)')
          .single();

        if (error) throw error;
        const newCardEtiquetas = [...cardEtiquetas, data];
        setCardEtiquetas(newCardEtiquetas);
        // Atualizar também o estado global para refletir no kanban
        setAllCardEtiquetas(prev => ({
          ...prev,
          [viewingCard.id]: newCardEtiquetas,
        }));
      }
    } catch (error: any) {
      console.error('Erro ao alternar etiqueta:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível atualizar a etiqueta.',
        variant: 'destructive',
      });
    }
  };

  // Handler para atualizar o responsável do lead
  const handleUpdateLeadResponsavel = async (responsavelId: string) => {
    if (!viewingCard) return;
    
    try {
      // Primeiro, verificar se o colaborador existe
      const colaboradorSelecionado = responsaveis.find(r => r.id === responsavelId);
      if (!colaboradorSelecionado && responsavelId) {
        throw new Error('Colaborador não encontrado. Recarregue a página.');
      }
      
      const { data, error } = await (supabase as any)
        .from('prospeccao_cards')
        .update({ responsavel_id: responsavelId || null })
        .eq('id', viewingCard.id)
        .select()
        .single();

      if (error) {
        console.error('Erro Supabase:', error);
        // Verificar se é erro de foreign key
        if (error.message?.includes('foreign key constraint')) {
          throw new Error('O colaborador selecionado não existe no sistema. Execute a migration no Supabase.');
        }
        throw error;
      }
      
      // Atualizar o card localmente com os dados retornados
      const updatedCard = { ...viewingCard, responsavel_id: data?.responsavel_id || responsavelId || null };
      setViewingCard(updatedCard);
      setCards(prev => prev.map(c => 
        c.id === viewingCard.id ? { ...c, responsavel_id: data?.responsavel_id || responsavelId || null } : c
      ));
      
      toast({ title: 'Sucesso', description: 'Responsável do Lead atualizado!' });
    } catch (error: any) {
      console.error('Erro ao atualizar responsável:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível atualizar o responsável.',
        variant: 'destructive',
      });
    }
  };

  // Handler para encaminhar card para o Funil CLOSER
  const handleEncaminharParaCloser = async () => {
    if (!viewingCard || !empresaId) return;
    
    try {
      // 1. Buscar ou criar a primeira coluna do Closer (Lead Qualificado)
      let { data: closerColunas, error: colunasError } = await (supabase as any)
        .from('closer_colunas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });
      
      if (colunasError) throw colunasError;
      
      // Se não existir colunas no Closer, criar as padrões
      if (!closerColunas || closerColunas.length === 0) {
        const colunasPadrao = [
          { nome: 'Lead Qualificado', cor: '#6366f1', ordem: 0, empresa_id: empresaId },
          { nome: 'Contato Inicial', cor: '#8b5cf6', ordem: 1, empresa_id: empresaId },
          { nome: 'Qualificação', cor: '#a855f7', ordem: 2, empresa_id: empresaId },
          { nome: 'Proposta Enviada', cor: '#f59e0b', ordem: 3, empresa_id: empresaId },
          { nome: 'Negociação', cor: '#f97316', ordem: 4, empresa_id: empresaId },
          { nome: 'Fechado/Ganho', cor: '#22c55e', ordem: 5, empresa_id: empresaId },
          { nome: 'Perdido', cor: '#ef4444', ordem: 6, empresa_id: empresaId },
        ];
        
        const { data: novasColunas, error: insertError } = await (supabase as any)
          .from('closer_colunas')
          .insert(colunasPadrao)
          .select();
        
        if (insertError) throw insertError;
        closerColunas = novasColunas;
      }
      
      // Pegar a primeira coluna (Lead Qualificado)
      const primeiraColuna = closerColunas[0];
      
      // 2. Contar quantos cards já existem na coluna para definir a ordem
      const { count } = await (supabase as any)
        .from('closer_cards')
        .select('*', { count: 'exact', head: true })
        .eq('coluna_id', primeiraColuna.id);
      
      // 3. Criar o card no Closer com referência ao card original
      const novoCard = {
        empresa_id: empresaId,
        coluna_id: primeiraColuna.id,
        titulo: viewingCard.titulo,
        descricao: viewingCard.descricao,
        valor: viewingCard.valor,
        responsavel_id: viewingCard.responsavel_id,
        contato_nome: viewingCard.contato_nome,
        contato_email: viewingCard.contato_email,
        contato_telefone: viewingCard.contato_telefone,
        contato_empresa: viewingCard.contato_empresa,
        origem: 'SDR - Prospecção',
        temperatura: viewingCard.temperatura,
        data_contato: viewingCard.data_contato,
        data_followup: viewingCard.data_followup,
        ordem: count || 0,
        empresa_lead_id: (viewingCard as any).empresa_lead_id,
        contatos: (viewingCard as any).contatos,
        origem_card_id: viewingCard.id,
        origem_kanban: 'prospeccao',
      };
      
      const { data: novoCardData, error: insertCardError } = await (supabase as any)
        .from('closer_cards')
        .insert(novoCard)
        .select()
        .single();
      
      if (insertCardError) throw insertCardError;
      
      const novoCardId = novoCardData.id;
      
      // 4. Copiar atividades do card original para o Closer
      const { data: atividadesOrigem, error: atividadesError } = await (supabase as any)
        .from('prospeccao_atividades')
        .select('*')
        .eq('card_id', viewingCard.id);
      
      if (!atividadesError && atividadesOrigem && atividadesOrigem.length > 0) {
        const atividadesParaCopiar = atividadesOrigem.map((atividade: any) => ({
          card_id: novoCardId,
          usuario_id: atividade.usuario_id,
          tipo: atividade.tipo,
          descricao: atividade.descricao,
          prazo: atividade.prazo,
          horario: atividade.horario,
          concluida: atividade.concluida,
          data_conclusao: atividade.data_conclusao,
          checklist_items: atividade.checklist_items,
          membros_ids: atividade.membros_ids,
          anexo_url: atividade.anexo_url,
          anexo_nome: atividade.anexo_nome,
          created_at: atividade.created_at,
        }));
        
        await (supabase as any)
          .from('closer_atividades')
          .insert(atividadesParaCopiar);
      }
      
      // 5. Copiar etiquetas do card original para o Closer
      // Primeiro, buscar as etiquetas associadas ao card
      const { data: cardEtiquetasOrigem, error: cardEtiquetasError } = await (supabase as any)
        .from('prospeccao_card_etiquetas')
        .select('etiqueta_id, prospeccao_etiquetas(id, nome, cor)')
        .eq('card_id', viewingCard.id);
      
      if (!cardEtiquetasError && cardEtiquetasOrigem && cardEtiquetasOrigem.length > 0) {
        // Para cada etiqueta, verificar se já existe no Closer ou criar
        for (const cardEtiqueta of cardEtiquetasOrigem) {
          const etiquetaOrigem = cardEtiqueta.prospeccao_etiquetas;
          if (!etiquetaOrigem) continue;
          
          // Verificar se já existe uma etiqueta com o mesmo nome no Closer
          let { data: etiquetaCloser } = await (supabase as any)
            .from('closer_etiquetas')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('nome', etiquetaOrigem.nome)
            .single();
          
          // Se não existir, criar a etiqueta no Closer
          if (!etiquetaCloser) {
            const { data: novaEtiqueta } = await (supabase as any)
              .from('closer_etiquetas')
              .insert({
                empresa_id: empresaId,
                nome: etiquetaOrigem.nome,
                cor: etiquetaOrigem.cor,
              })
              .select()
              .single();
            etiquetaCloser = novaEtiqueta;
          }
          
          // Associar a etiqueta ao novo card
          if (etiquetaCloser) {
            await (supabase as any)
              .from('closer_card_etiquetas')
              .insert({
                card_id: novoCardId,
                etiqueta_id: etiquetaCloser.id,
              });
          }
        }
      }
      
      // 6. Registrar MOVIMENTAÇÃO de encaminhamento no novo card do Closer (tabela de movimentações, NÃO atividades!)
      await (supabase as any)
        .from('closer_card_movimentacoes')
        .insert({
          card_id: novoCardId,
          usuario_id: profile?.id,
          tipo: 'mudanca_kanban',
          descricao: `Lead recebido do SDR - Prospecção → Closer (${primeiraColuna.nome})`,
          kanban_origem: 'Prospecção',
          kanban_destino: 'Closer',
          coluna_destino_id: primeiraColuna.id,
          dados_anteriores: {
            kanban_origem: 'Prospecção',
            origem_card_id: viewingCard.id,
          },
          dados_novos: {
            kanban_destino: 'Closer',
            coluna_destino_id: primeiraColuna.id,
            coluna_destino_nome: primeiraColuna.nome,
          },
        });
      
      // 7. Arquivar o card original no SDR
      const { error: archiveError } = await (supabase as any)
        .from('prospeccao_cards')
        .update({ arquivado: true })
        .eq('id', viewingCard.id);
      
      if (archiveError) throw archiveError;
      
      // 8. Registrar MOVIMENTAÇÃO de encaminhamento no card original (tabela de movimentações, NÃO atividades!)
      await (supabase as any)
        .from('prospeccao_card_movimentacoes')
        .insert({
          card_id: viewingCard.id,
          usuario_id: profile?.id,
          tipo: 'mudanca_kanban',
          descricao: `Lead encaminhado para Closer (${primeiraColuna.nome})`,
          kanban_origem: 'Prospecção',
          kanban_destino: 'Closer',
          dados_anteriores: {
            kanban_origem: 'Prospecção',
          },
          dados_novos: {
            kanban_destino: 'Closer',
            novo_card_id: novoCardId,
            coluna_destino_nome: primeiraColuna.nome,
          },
        });
      
      // 9. Atualizar estado local
      setCards(prev => prev.filter(c => c.id !== viewingCard.id));
      setDetailsDialogOpen(false);
      
      toast({ 
        title: 'Sucesso', 
        description: 'Lead encaminhado para o Funil CLOSER com sucesso! Atividades e etiquetas foram transferidas.' 
      });
      
    } catch (error: any) {
      console.error('Erro ao encaminhar para Closer:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível encaminhar o lead para o Closer.',
        variant: 'destructive',
      });
    }
  };

  // Handler para visualizar detalhes do lead
  const handleViewDetails = async (card: ProspeccaoCard) => {
    setViewingCard(card);
    setDetailsDialogOpen(true);
    setCardEtiquetas([]);
    setViewingEmpresaLead(null);
    
    // Buscar responsáveis primeiro para definir o padrão
    const responsaveisData = await fetchResponsaveisAndReturn();
    
    // Encontrar o colaborador correspondente ao usuário logado
    const usuarioColaborador = responsaveisData?.find(r => r.nome === profile?.nome);
    const defaultResponsavelId = usuarioColaborador?.id || responsaveisData?.[0]?.id || '';
    
    setNovaAtividade({ 
      tipo: 'tarefa', 
      descricao: '', 
      responsavel_id: defaultResponsavelId, 
      prazo: '', 
      horario: '', 
      checklist_items: [], 
      membros_ids: [] 
    });
    
    // Buscar informações da empresa lead se existir
    if ((card as any).empresa_lead_id) {
      try {
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('id, nome, cnpj, email, telefone, endereco, numero, complemento, bairro, cidade, estado, cep, porte, site, linkedin, instagram')
          .eq('id', (card as any).empresa_lead_id)
          .single();
        
        if (empresaData) {
          setViewingEmpresaLead(empresaData as EmpresaLead);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa lead:', error);
      }
    }
    
    await Promise.all([
      fetchAtividades(card.id),
      fetchModelos(),
      fetchEtiquetas(),
      fetchCardEtiquetas(card.id),
      fetchMovimentacoes(card.id),
    ]);
  };

  // Criar novo modelo
  const handleCriarModelo = async () => {
    if (!empresaId || !novoModelo.titulo.trim() || !novoModelo.conteudo.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o título e conteúdo do modelo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('prospeccao_modelos')
        .insert({
          empresa_id: empresaId,
          tipo: novaAtividade.tipo,
          titulo: novoModelo.titulo,
          conteudo: novoModelo.conteudo,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Modelo criado!' });
      setNovoModelo({ titulo: '', conteudo: '' });
      setCriarModeloOpen(false);
      await fetchModelos();
    } catch (error) {
      console.error('Erro ao criar modelo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o modelo.',
        variant: 'destructive',
      });
    }
  };

  // Aplicar modelo
  const handleAplicarModelo = (modelo: { conteudo: string }) => {
    setNovaAtividade(prev => ({ ...prev, descricao: modelo.conteudo }));
    setModelosOpen(false);
  };

  const fetchAtividades = async (cardId: string) => {
    setLoadingAtividades(true);
    try {
      // Buscar atividades - ordenar por created_at (mais recente primeiro)
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('prospeccao_atividades' as any)
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });
      
      if (atividadesError) throw atividadesError;
      
      // Buscar todos os usuários únicos de uma vez
      const usuarioIds = [...new Set((atividadesData || []).map((a: any) => a.usuario_id).filter(Boolean))];
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
      
      // Mapear atividades com usuários
      const atividadesComUsuario = (atividadesData || []).map((atividade: any) => ({
        ...atividade,
        usuario: atividade.usuario_id ? usuariosMap[atividade.usuario_id] || null : null,
      }));
      
      setAtividades(atividadesComUsuario);
      
      // Atualizar cardAtividades para refletir no kanban
      setCardAtividades(prev => ({
        ...prev,
        [cardId]: atividadesComUsuario,
      }));
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    } finally {
      setLoadingAtividades(false);
    }
  };

  // Atualizar status da atividade
  const handleUpdateAtividadeStatus = async (atividadeId: string, novoStatus: 'a_realizar' | 'programada' | 'pendente' | 'concluida') => {
    if (!viewingCard) return;
    
    try {
      // Atualizar apenas o status
      const { error } = await supabase
        .from('prospeccao_atividades' as any)
        .update({ status: novoStatus })
        .eq('id', atividadeId);

      if (error) throw error;
      
      // Atualizar lista local de atividades do dialog
      const novasAtividades = atividades.map(a => a.id === atividadeId ? { 
        ...a, 
        status: novoStatus
      } : a);
      setAtividades(novasAtividades as Atividade[]);
      
      // Atualizar cardAtividades para refletir no kanban imediatamente
      setCardAtividades(prev => ({
        ...prev,
        [viewingCard.id]: novasAtividades as Atividade[],
      }));
      
      toast({ 
        title: 'Sucesso', 
        description: novoStatus === 'concluida' ? 'Atividade concluída!' : 'Status atualizado!' 
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  // Handler para selecionar anexos
  const handleSelectAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles: File[] = [];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        toast({
          title: 'Arquivo inválido',
          description: `${file.name} não é um PDF ou imagem válida.`,
          variant: 'destructive',
        });
      }
    }
    
    setAnexos(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  // Handler para remover anexo
  const handleRemoveAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  // Upload de anexos para o storage
  const uploadAnexos = async (atividadeId: string): Promise<{ nome: string; url: string; tipo: string }[]> => {
    const uploadedFiles: { nome: string; url: string; tipo: string }[] = [];
    
    for (const file of anexos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${atividadeId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await (supabase as any).storage
        .from('prospeccao-anexos')
        .upload(fileName, file);
      
      if (error) {
        console.error('Erro ao fazer upload:', error);
        continue;
      }
      
      const { data: urlData } = (supabase as any).storage
        .from('prospeccao-anexos')
        .getPublicUrl(fileName);
      
      uploadedFiles.push({
        nome: file.name,
        url: urlData.publicUrl,
        tipo: file.type,
      });
    }
    
    return uploadedFiles;
  };

  const handleAddAtividade = async () => {
    if (!viewingCard || !novaAtividade.descricao.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma descrição para a atividade.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAnexo(true);
    
    try {
      // Calcular status baseado na data e hora do prazo
      let status: 'a_realizar' | 'programada' | 'pendente' | 'concluida' = 'a_realizar';
      if (novaAtividade.prazo) {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Usar parse para evitar problema de timezone
        const prazoDate = parse(novaAtividade.prazo, 'yyyy-MM-dd', new Date());
        prazoDate.setHours(0, 0, 0, 0);
        
        // Se tem horário, considerar a hora para determinar se já passou
        if (novaAtividade.horario && prazoDate.getTime() === today.getTime()) {
          const [hours, minutes] = novaAtividade.horario.split(':').map(Number);
          const prazoDateTime = new Date(prazoDate);
          prazoDateTime.setHours(hours, minutes, 0, 0);
          
          if (prazoDateTime > now) {
            status = 'a_realizar'; // Ainda não chegou a hora
          } else {
            status = 'pendente'; // Já passou a hora
          }
        } else if (prazoDate.getTime() === today.getTime()) {
          status = 'a_realizar'; // Hoje, sem horário específico
        } else if (prazoDate > today) {
          status = 'programada'; // Futuro
        } else {
          status = 'pendente'; // Passado
        }
      }
      
      const atividadeData: any = {
        card_id: viewingCard.id,
        usuario_id: profile?.id,
        tipo: novaAtividade.tipo,
        descricao: novaAtividade.descricao,
        status,
      };
      
      // Adicionar campos opcionais se preenchidos
      if (novaAtividade.responsavel_id) {
        atividadeData.responsavel_id = novaAtividade.responsavel_id;
      }
      if (novaAtividade.prazo) {
        atividadeData.prazo = novaAtividade.prazo;
      }
      if (novaAtividade.horario) {
        atividadeData.horario = novaAtividade.horario;
      }
      if (novaAtividade.checklist_items && novaAtividade.checklist_items.length > 0) {
        atividadeData.checklist_items = novaAtividade.checklist_items;
      }
      if (novaAtividade.membros_ids && novaAtividade.membros_ids.length > 0) {
        atividadeData.membros_ids = novaAtividade.membros_ids;
      }

      // Inserir atividade primeiro
      const { data: atividadeInserida, error } = await (supabase as any)
        .from('prospeccao_atividades')
        .insert(atividadeData)
        .select()
        .single();

      if (error) throw error;

      // Upload de anexos se houver
      if (anexos.length > 0) {
        const anexosUploadados = await uploadAnexos(atividadeInserida.id);
        
        // Atualizar atividade com anexos
        if (anexosUploadados.length > 0) {
          await (supabase as any)
            .from('prospeccao_atividades')
            .update({ anexos: anexosUploadados })
            .eq('id', atividadeInserida.id);
        }
      }

      toast({ title: 'Sucesso', description: 'Atividade registrada!' });
      setNovaAtividade({ tipo: 'tarefa', descricao: '', responsavel_id: '', prazo: '', horario: '', checklist_items: [], membros_ids: [] });
      setAnexos([]);
      await fetchAtividades(viewingCard.id);
    } catch (error: any) {
      console.error('Erro ao adicionar atividade:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível registrar a atividade. ${error?.message || ''}`,
        variant: 'destructive',
      });
    } finally {
      setUploadingAnexo(false);
    }
  };

  // Handlers de Card
  const handleAddCard = async (colunaId: string) => {
    setSelectedColunaId(colunaId);
    setEditingCard(null);
    setCardForm({
      titulo: '',
      descricao: '',
      empresa_lead_id: '',
      contatos: [{ nome: '', email: '', telefone: '' }],
      origem: '',
      temperatura: 'morno',
      data_contato: '',
      data_followup: '',
    });
    // Garantir que os responsáveis estejam carregados
    if (responsaveis.length === 0) {
      await fetchResponsaveisAndReturn();
    }
    setCardDialogOpen(true);
  };

  const handleEditCard = (card: ProspeccaoCard) => {
    setEditingCard(card);
    setSelectedColunaId(card.coluna_id);
    // Parse contatos from card or use legacy fields
    const contatos = (card as any).contatos?.length > 0 
      ? (card as any).contatos 
      : [{ 
          nome: card.contato_nome || '', 
          email: card.contato_email || '', 
          telefone: card.contato_telefone || '' 
        }];
    setCardForm({
      titulo: card.titulo,
      descricao: card.descricao || '',
      empresa_lead_id: (card as any).empresa_lead_id || '',
      contatos,
      origem: card.origem || '',
      temperatura: card.temperatura || 'morno',
      data_contato: card.data_contato || '',
      data_followup: card.data_followup || '',
    });
    setCardDialogOpen(true);
  };

  const handleAddContato = () => {
    setCardForm(prev => ({
      ...prev,
      contatos: [...prev.contatos, { nome: '', email: '', telefone: '' }]
    }));
  };

  const handleRemoveContato = (index: number) => {
    if (cardForm.contatos.length <= 1) return;
    setCardForm(prev => ({
      ...prev,
      contatos: prev.contatos.filter((_, i) => i !== index)
    }));
  };

  const handleContatoChange = (index: number, field: 'nome' | 'email' | 'telefone', value: string) => {
    setCardForm(prev => ({
      ...prev,
      contatos: prev.contatos.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const handleSaveCard = async () => {
    // Validações com feedback visual
    if (!empresaId) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedColunaId) {
      // Tentar selecionar primeira coluna automaticamente
      if (colunas.length > 0) {
        setSelectedColunaId(colunas[0].id);
      } else {
        toast({
          title: 'Erro',
          description: 'Crie uma coluna no Kanban primeiro.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    if (!cardForm.empresa_lead_id) {
      toast({
        title: 'Erro',
        description: 'Selecione uma empresa.',
        variant: 'destructive',
      });
      return;
    }

    setSavingCard(true);
    
    try {
      // Get empresa name for titulo
      const empresaSelecionada = empresasLead.find(e => e.id === cardForm.empresa_lead_id);
      const titulo = empresaSelecionada?.nome || 'Novo Lead';
      
      // Get first contact for legacy fields
      const primeiroContato = cardForm.contatos[0] || { nome: '', email: '', telefone: '' };
      
      // Use selectedColunaId or first column
      const colunaId = selectedColunaId || (colunas.length > 0 ? colunas[0].id : null);
      
      if (!colunaId) {
        toast({
          title: 'Erro',
          description: 'Nenhuma coluna disponível. Crie uma coluna primeiro.',
          variant: 'destructive',
        });
        return;
      }
      
      // Encontrar o colaborador correspondente ao usuário logado para definir como responsável padrão
      const colaboradorLogado = responsaveis.find(r => r.nome === profile?.nome);
      const responsavelPadrao = colaboradorLogado?.id || responsaveis[0]?.id || null;
      
      const cardData = {
        empresa_id: empresaId,
        coluna_id: colunaId,
        titulo,
        descricao: cardForm.descricao || null,
        empresa_lead_id: cardForm.empresa_lead_id,
        contatos: cardForm.contatos,
        contato_nome: primeiroContato.nome || null,
        contato_email: primeiroContato.email || null,
        contato_telefone: primeiroContato.telefone || null,
        contato_empresa: empresaSelecionada?.nome || null,
        origem: cardForm.origem || null,
        temperatura: cardForm.temperatura,
        data_contato: cardForm.data_contato || null,
        data_followup: cardForm.data_followup || null,
        responsavel_id: responsavelPadrao,
      };

      if (editingCard) {
        const { error } = await (supabase as any)
          .from('prospeccao_cards')
          .update(cardData)
          .eq('id', editingCard.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Lead atualizado!' });
      } else {
        const cardsNaColuna = cards.filter(c => c.coluna_id === colunaId);
        const { data: newCard, error } = await (supabase as any)
          .from('prospeccao_cards')
          .insert({ ...cardData, ordem: cardsNaColuna.length })
          .select()
          .single();
        if (error) throw error;
        
        // Registrar atividade de criação do lead
        if (newCard) {
          const colunaDestino = colunas.find(c => c.id === colunaId);
          await supabase
            .from('prospeccao_atividades' as any)
            .insert({
              card_id: newCard.id,
              usuario_id: profile?.id,
              tipo: 'criacao',
              descricao: `Lead criado na coluna "${colunaDestino?.nome || 'Novo Lead'}"`,
              dados_novos: { 
                coluna_id: colunaId, 
                coluna_nome: colunaDestino?.nome,
                empresa_lead: empresaSelecionada?.nome,
              },
              status: 'concluida',
            });
          
          // Registrar movimentação de criação
          await registrarMovimentacao(
            newCard.id,
            'criacao',
            `Lead criado na coluna "${colunaDestino?.nome || 'Novo Lead'}"`,
            {
              coluna_destino_id: colunaId,
              pagina_origem: 'prospeccao',
              dados_novos: {
                empresa_lead: empresaSelecionada?.nome,
                coluna_nome: colunaDestino?.nome,
              },
            }
          );
        }
        
        toast({ title: 'Sucesso', description: 'Lead criado!' });
      }

      setCardDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar card:', error);
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível salvar o lead. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingCard(false);
    }
  };

  // Handlers de Coluna
  const handleAddColuna = () => {
    if (colunas.length >= 20) {
      toast({
        title: 'Limite atingido',
        description: 'Você pode ter no máximo 20 colunas.',
        variant: 'destructive',
      });
      return;
    }
    setEditingColuna(null);
    setColunaForm({ nome: '', cor: '#6366f1', meta_valor: 0 });
    setColunaDialogOpen(true);
  };

  const handleEditColuna = (coluna: Coluna) => {
    setEditingColuna(coluna);
    setColunaForm({
      nome: coluna.nome,
      cor: coluna.cor,
      meta_valor: coluna.meta_valor || 0,
    });
    setColunaDialogOpen(true);
  };

  const handleSaveColuna = async () => {
    if (!empresaId) return;
    if (!colunaForm.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da coluna é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingColuna) {
        const { error } = await (supabase as any)
          .from('prospeccao_colunas')
          .update({
            nome: colunaForm.nome,
            cor: colunaForm.cor,
            meta_valor: colunaForm.meta_valor,
          })
          .eq('id', editingColuna.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna atualizada!' });
      } else {
        const { error } = await (supabase as any)
          .from('prospeccao_colunas')
          .insert({
            empresa_id: empresaId,
            nome: colunaForm.nome,
            cor: colunaForm.cor,
            meta_valor: colunaForm.meta_valor,
            ordem: colunas.length,
          });
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna criada!' });
      }

      setColunaDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar coluna:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a coluna.',
        variant: 'destructive',
      });
    }
  };

  // Abrir dialog de confirmação para excluir coluna
  const handleDeleteColunaConfirm = (id: string) => {
    const coluna = colunas.find(c => c.id === id);
    const cardsNaColuna = cards.filter(c => c.coluna_id === id);
    
    if (cardsNaColuna.length > 0) {
      toast({
        title: 'Erro',
        description: 'Não é possível excluir uma coluna com leads. Mova ou exclua os leads primeiro.',
        variant: 'destructive',
      });
      return;
    }
    
    setDeleteType('coluna');
    setDeleteId(id);
    setDeleteName(coluna?.nome || 'esta coluna');
    setDeleteDialogOpen(true);
  };

  // Abrir dialog de confirmação para excluir card
  const handleDeleteCardConfirm = (id: string) => {
    const card = cards.find(c => c.id === id);
    setDeleteType('card');
    setDeleteId(id);
    setDeleteName(card?.titulo || 'este lead');
    setDeleteDialogOpen(true);
  };

  // Executar exclusão após confirmação
  const handleConfirmDelete = async () => {
    if (!deleteId || !deleteType) return;

    try {
      if (deleteType === 'coluna') {
        const { error } = await (supabase as any)
          .from('prospeccao_colunas')
          .delete()
          .eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna excluída!' });
      } else if (deleteType === 'card') {
        // Primeiro excluir atividades relacionadas
        await (supabase as any)
          .from('prospeccao_atividades')
          .delete()
          .eq('card_id', deleteId);
        
        const { error } = await (supabase as any)
          .from('prospeccao_cards')
          .delete()
          .eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Lead excluído!' });
      }
      
      setDeleteDialogOpen(false);
      setDeleteType(null);
      setDeleteId(null);
      setDeleteName('');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível excluir ${deleteType === 'coluna' ? 'a coluna' : 'o lead'}.`,
        variant: 'destructive',
      });
    }
  };

  // Filtrar cards por busca
  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    const term = searchTerm.toLowerCase();
    return cards.filter(c => 
      c.titulo.toLowerCase().includes(term) ||
      c.contato_nome?.toLowerCase().includes(term) ||
      c.contato_empresa?.toLowerCase().includes(term)
    );
  }, [cards, searchTerm]);

  // Calcular totais de leads
  const totalLeads = cards.length;

  // Se for admin e ainda não carregou empresas, mostrar loading
  if (isAdmin && empresas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando empresas...</span>
      </div>
    );
  }

  // Se não tiver empresa selecionada (e não for admin sem empresas)
  if (!empresaId && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhuma empresa associada ao usuário.</p>
      </div>
    );
  }

  if (loading && empresaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span>SDR - Prospecção</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seus leads e oportunidades de prospecção
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Removido seletor de empresa - SDR Prospecção é exclusivo da Toriq */}
            <Badge variant="secondary" className="text-sm bg-primary/10 text-primary border-primary/20">
              {totalLeads} leads
            </Badge>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 py-3 px-4 bg-muted/30 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{totalLeads}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="h-8 w-px bg-border" />
          {colunas.slice(0, 4).map((col) => {
            const count = cards.filter(c => c.coluna_id === col.id).length;
            return (
              <div key={col.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.cor }} />
                <span className="text-sm font-medium">{count}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">{col.nome}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border focus:border-primary"
            />
          </div>
          <Button variant="outline" size="sm" className="border-border hover:border-primary hover:bg-primary/5">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          {/* Toggle de visualização */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('kanban')}
              className={`rounded-none ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'tabela' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('tabela')}
              className={`rounded-none ${viewMode === 'tabela' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddColuna} disabled={!empresaId} className="border-border hover:border-primary hover:bg-primary/5">
            <Plus className="h-4 w-4 mr-2" />
            Nova Coluna
          </Button>
          <Button onClick={() => {
            // Selecionar primeira coluna automaticamente se não houver seleção
            if (colunas.length > 0 && !selectedColunaId) {
              setSelectedColunaId(colunas[0].id);
            }
            setEditingCard(null);
            setCardForm({
              titulo: '',
              descricao: '',
              empresa_lead_id: '',
              contatos: [{ nome: '', email: '', telefone: '' }],
              origem: '',
              temperatura: 'morno',
              data_contato: '',
              data_followup: '',
            });
            setCardDialogOpen(true);
          }} size="sm" disabled={!empresaId || colunas.length === 0} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Injetar CSS para animação de gelatina */}
      <style dangerouslySetInnerHTML={{ __html: jellyKeyframes }} />

      {/* Tabela de Leads */}
      {viewMode === 'tabela' && (
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Lista de Leads</h3>
              <p className="text-sm text-muted-foreground">Todos os leads capturados para prospecção</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status Atividade</TableHead>
                  <TableHead>Próxima Atividade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCards.map((card) => {
                    const coluna = colunas.find(c => c.id === card.coluna_id);
                    const atividades = cardAtividades[card.id] || [];
                    const atividadesNaoConcluidas = atividades.filter(a => a.status !== 'concluida');
                    const proximaAtividade = atividadesNaoConcluidas.filter(a => a.prazo).sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];
                    
                    // Calcular status
                    let atividadeStatus = { label: 'Sem atividade', color: 'bg-red-500/15 text-red-500' };
                    if (atividades.length > 0) {
                      if (atividadesNaoConcluidas.length === 0) {
                        atividadeStatus = { label: 'Todas concluídas', color: 'bg-green-500/15 text-green-500' };
                      } else {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const hasToday = atividadesNaoConcluidas.some(a => {
                          if (!a.prazo) return false;
                          const prazoDate = new Date(a.prazo);
                          prazoDate.setHours(0, 0, 0, 0);
                          return prazoDate.getTime() === today.getTime();
                        });
                        const hasPastDue = atividadesNaoConcluidas.some(a => {
                          if (!a.prazo) return false;
                          const prazoDate = new Date(a.prazo);
                          prazoDate.setHours(0, 0, 0, 0);
                          return prazoDate < today;
                        });
                        
                        if (hasToday) {
                          atividadeStatus = { label: 'A ser realizada', color: 'bg-orange-500/15 text-orange-500' };
                        } else if (hasPastDue) {
                          atividadeStatus = { label: 'Pendente', color: 'bg-red-500/15 text-red-500' };
                        } else {
                          atividadeStatus = { label: 'Programada', color: 'bg-blue-500/15 text-blue-500' };
                        }
                      }
                    }
                    
                    return (
                      <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(card)}>
                        <TableCell className="font-medium">{card.titulo}</TableCell>
                        <TableCell>{card.contato_empresa || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{card.contato_nome || '-'}</span>
                            {card.contato_email && <span className="text-xs text-muted-foreground">{card.contato_email}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{card.origem || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${
                            card.temperatura === 'quente' ? 'bg-red-500/15 text-red-500' :
                            card.temperatura === 'morno' ? 'bg-orange-500/15 text-orange-500' :
                            'bg-blue-500/15 text-blue-500'
                          }`}>
                            {card.temperatura === 'quente' ? 'Quente' : card.temperatura === 'morno' ? 'Morno' : 'Frio'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ borderColor: coluna?.cor, color: coluna?.cor }}>
                            {coluna?.nome || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${atividadeStatus.color}`}>
                            {atividadeStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proximaAtividade ? (
                            <span className="text-sm">
                              {format(parse(proximaAtividade.prazo!.split('T')[0], 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                              {proximaAtividade.horario && ` às ${proximaAtividade.horario}`}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteCardConfirm(card.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
      <div className="flex-1 overflow-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={colunas.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 h-full overflow-x-auto pb-4">
              {colunas.map((coluna) => (
                <SortableColumn
                  key={coluna.id}
                  coluna={coluna}
                  cards={filteredCards.filter(c => c.coluna_id === coluna.id).sort((a, b) => {
                    // Ordenar por data da próxima atividade (mais próxima primeiro)
                    const atividadesA = cardAtividades[a.id] || [];
                    const atividadesB = cardAtividades[b.id] || [];
                    const proximaA = atividadesA.filter(at => at.status !== 'concluida' && at.prazo).sort((x, y) => new Date(x.prazo!).getTime() - new Date(y.prazo!).getTime())[0];
                    const proximaB = atividadesB.filter(at => at.status !== 'concluida' && at.prazo).sort((x, y) => new Date(x.prazo!).getTime() - new Date(y.prazo!).getTime())[0];
                    
                    if (proximaA && proximaB) {
                      return new Date(proximaA.prazo!).getTime() - new Date(proximaB.prazo!).getTime();
                    }
                    if (proximaA) return -1;
                    if (proximaB) return 1;
                    return a.ordem - b.ordem;
                  })}
                  onAddCard={handleAddCard}
                  onEditCard={handleEditCard}
                  onDeleteCard={handleDeleteCardConfirm}
                  onViewDetails={handleViewDetails}
                  onAddAtividade={(card) => {
                    setViewingCard(card);
                    setAtividadeDialogOpen(true);
                  }}
                  onEditColumn={handleEditColuna}
                  onDeleteColumn={handleDeleteColunaConfirm}
                  droppedCardId={droppedCardId}
                  cardAtividades={cardAtividades}
                  allCardEtiquetas={allCardEtiquetas}
                  allCards={cards}
              />
            ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard && (
              <div className="bg-card rounded-lg border border-primary/50 shadow-xl shadow-primary/10 p-3 w-72 opacity-95 rotate-3">
                <h4 className="font-medium text-sm">{activeCard.titulo}</h4>
                {activeCard.contato_empresa && (
                  <p className="text-xs text-muted-foreground">{activeCard.contato_empresa}</p>
                )}
              </div>
            )}
            {activeColuna && (
              <div 
                className="w-72 bg-card rounded-xl shadow-xl opacity-95 rotate-2 border border-border"
                style={{ borderTop: `3px solid ${activeColuna.cor}` }}
              >
                <div className="p-3" style={{ backgroundColor: activeColuna.cor + '15' }}>
                  <h3 className="font-semibold text-sm">{activeColuna.nome}</h3>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      )}

      {/* Dialog de Card */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
            <DialogDescription>
              {editingCard ? 'Atualize as informações do lead' : 'Preencha os dados do novo lead para prospecção'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empresa_lead">Empresa *</Label>
                <Select
                  value={cardForm.empresa_lead_id}
                  onValueChange={handleEmpresaLeadChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasLead.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Nenhuma empresa do tipo Lead cadastrada
                      </SelectItem>
                    ) : (
                      empresasLead.map(empresa => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {empresa.nome}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {empresasLead.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre uma empresa do tipo "Lead" primeiro.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coluna_lead">Coluna *</Label>
                <Select
                  value={selectedColunaId || ''}
                  onValueChange={(v) => setSelectedColunaId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {colunas.map(coluna => (
                      <SelectItem key={coluna.id} value={coluna.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: coluna.cor }}
                          />
                          {coluna.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Contatos</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddContato}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Contato
                </Button>
              </div>
              
              {/* Mostrar status dos contatos da empresa */}
              {cardForm.empresa_lead_id && (
                <div className={`p-2 rounded-lg text-xs ${empresaContatos.length > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {empresaContatos.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{empresaContatos.length} contato(s) cadastrado(s) na empresa</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      <span>Sem contato cadastrado na empresa</span>
                    </div>
                  )}
                </div>
              )}
              
              {cardForm.contatos.map((contato, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Contato {index + 1}</span>
                    <div className="flex items-center gap-1">
                      {/* Botão para salvar contato na empresa */}
                      {cardForm.empresa_lead_id && contato.nome && !empresaContatos.some(ec => ec.nome === contato.nome) && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSaveContatoToEmpresa(contato)}
                          className="h-6 px-2 text-xs text-primary hover:text-primary"
                          title="Salvar contato na empresa"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Salvar na empresa
                        </Button>
                      )}
                      {cardForm.contatos.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveContato(index)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={contato.nome}
                      onChange={(e) => handleContatoChange(index, 'nome', e.target.value)}
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="email"
                      value={contato.email}
                      onChange={(e) => handleContatoChange(index, 'email', e.target.value)}
                      placeholder="email@empresa.com"
                    />
                    <Input
                      value={contato.telefone}
                      onChange={(e) => handleContatoChange(index, 'telefone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  {/* Mostrar informações adicionais se o contato veio da empresa */}
                  {empresaContatos.some(ec => ec.nome === contato.nome) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Contato cadastrado na empresa
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Select
                  value={cardForm.origem}
                  onValueChange={(v) => setCardForm(prev => ({ ...prev, origem: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_LEAD.map(origem => (
                      <SelectItem key={origem} value={origem}>
                        {origem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperatura">Temperatura</Label>
                <Select
                  value={cardForm.temperatura}
                  onValueChange={(v) => setCardForm(prev => ({ ...prev, temperatura: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">
                      <div className="flex items-center gap-2">
                        <Snowflake className="h-4 w-4 text-blue-500" />
                        Frio
                      </div>
                    </SelectItem>
                    <SelectItem value="morno">
                      <div className="flex items-center gap-2">
                        <ThermometerSun className="h-4 w-4 text-orange-500" />
                        Morno
                      </div>
                    </SelectItem>
                    <SelectItem value="quente">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-red-500" />
                        Quente
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={cardForm.descricao}
                onChange={(e) => setCardForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Observações sobre o lead..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)} disabled={savingCard}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCard} disabled={empresasLead.length === 0 || savingCard}>
              {savingCard ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingCard ? 'Salvar' : 'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Coluna */}
      <Dialog open={colunaDialogOpen} onOpenChange={setColunaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColuna ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
            <DialogDescription>
              Configure as propriedades da coluna do Kanban
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coluna_nome">Nome da Coluna *</Label>
              <Input
                id="coluna_nome"
                value={colunaForm.nome}
                onChange={(e) => setColunaForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Qualificação"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_COLUNAS.map((cor) => (
                  <button
                    key={cor.key}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      colunaForm.cor === cor.value ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor.value }}
                    onClick={() => setColunaForm(prev => ({ ...prev, cor: cor.value }))}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_valor">Meta de Valor (R$)</Label>
              <Input
                id="meta_valor"
                type="number"
                value={colunaForm.meta_valor}
                onChange={(e) => setColunaForm(prev => ({ ...prev, meta_valor: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColunaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveColuna}>
              {editingColuna ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Lead */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
          {viewingCard && (
            <>
              {/* Header do Dialog */}
              <DialogHeader className="border-b pb-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingCard.titulo}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2">
                      {viewingCard.contato_empresa && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {viewingCard.contato_empresa}
                        </span>
                      )}
                      {viewingCard.contato_nome && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {viewingCard.contato_nome}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={viewingCard.temperatura === 'quente' ? 'destructive' : 'secondary'}
                      className={
                        viewingCard.temperatura === 'morno' ? 'bg-orange-100 text-orange-700' :
                        viewingCard.temperatura === 'frio' ? 'bg-blue-100 text-blue-700' : ''
                      }
                    >
                      {viewingCard.temperatura === 'quente' && <Flame className="h-3 w-3 mr-1" />}
                      {viewingCard.temperatura === 'morno' && <ThermometerSun className="h-3 w-3 mr-1" />}
                      {viewingCard.temperatura === 'frio' && <Snowflake className="h-3 w-3 mr-1" />}
                      {viewingCard.temperatura.charAt(0).toUpperCase() + viewingCard.temperatura.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Navegação por etapas */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {colunas.map((col, index) => {
                    const isAtual = viewingCard.coluna_id === col.id;
                    const indexAtual = colunas.findIndex(c => c.id === viewingCard.coluna_id);
                    const isAnterior = index < indexAtual;
                    const isPosterior = index > indexAtual;
                    
                    return (
                      <Button
                        key={col.id}
                        variant={isAtual ? 'default' : 'outline'}
                        size="sm"
                        className={`flex-shrink-0 text-xs ${isAnterior ? 'opacity-60' : ''}`}
                        style={isAtual ? { backgroundColor: col.cor } : {}}
                        onClick={() => handleMudarEtapa(col)}
                        disabled={isAtual}
                      >
                        {isAnterior && <ChevronRight className="h-3 w-3 mr-1 rotate-180" />}
                        {col.nome}
                        {isPosterior && <ChevronRight className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </DialogHeader>

              {/* Conteúdo Principal */}
              <div className="flex-1 overflow-hidden flex gap-4 mt-4">
                {/* Coluna Esquerda - Atividades e Movimentações */}
                <div className="flex-1 flex flex-col min-w-0 gap-4">
                  {/* Etiquetas do Card */}
                  {cardEtiquetas.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="flex flex-wrap gap-2">
                        {cardEtiquetas.map((ce) => (
                          ce.etiqueta && (
                            <div
                              key={ce.etiqueta_id}
                              className="px-3 py-1 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: ce.etiqueta.cor }}
                            >
                              {ce.etiqueta.nome}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Histórico de Atividades - 50% do espaço */}
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
                              setSelectedAtividade(atividade);
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
                                {atividade.responsavel_id && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <UserCheck className="h-2.5 w-2.5" />
                                    {responsaveis.find(r => r.id === atividade.responsavel_id)?.nome?.split(' ')[0] || ''}
                                  </span>
                                )}
                                {atividade.usuario && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Por: {atividade.usuario.nome?.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                              {/* Checklist items compacto */}
                              {atividade.checklist_items && Array.isArray(atividade.checklist_items) && atividade.checklist_items.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  {(atividade.checklist_items as ChecklistItem[]).filter(i => i.concluido).length}/{atividade.checklist_items.length} itens
                                </div>
                              )}
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
                  
                  {/* Histórico de Movimentações do Card - 50% do espaço */}
                  <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 flex-shrink-0">
                      <ArrowRightLeft className="h-4 w-4" />
                      Histórico de Movimentações
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto pr-1">
                    {loadingMovimentacoes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : cardMovimentacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma movimentação registrada
                      </p>
                    ) : (
                      <div className="relative">
                        {/* Linha vertical de conexão */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                        
                        <div className="space-y-3">
                          {cardMovimentacoes.map((mov, index) => {
                            const colunaOrigem = colunas.find(c => c.id === mov.coluna_origem_id);
                            const colunaDestino = colunas.find(c => c.id === mov.coluna_destino_id);
                            
                            return (
                              <div key={mov.id} className="relative flex gap-3 pl-1">
                                {/* Indicador */}
                                <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  mov.tipo === 'criacao' ? 'bg-teal-100 text-teal-700' :
                                  mov.tipo === 'mudanca_coluna' ? 'bg-indigo-100 text-indigo-700' :
                                  mov.tipo === 'encaminhamento' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {mov.tipo === 'criacao' && <Plus className="h-3 w-3" />}
                                  {mov.tipo === 'mudanca_coluna' && <ArrowRightLeft className="h-3 w-3" />}
                                  {mov.tipo === 'encaminhamento' && <ArrowRight className="h-3 w-3" />}
                                  {mov.tipo === 'edicao' && <Pencil className="h-3 w-3" />}
                                </div>
                                
                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0 pb-3">
                                  <p className="text-sm">{mov.descricao}</p>
                                  
                                  {/* Mostrar colunas de origem e destino */}
                                  {(colunaOrigem || colunaDestino) && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {colunaOrigem && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs"
                                          style={{ borderColor: colunaOrigem.cor, color: colunaOrigem.cor }}
                                        >
                                          {colunaOrigem.nome}
                                        </Badge>
                                      )}
                                      {colunaOrigem && colunaDestino && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      {colunaDestino && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs"
                                          style={{ borderColor: colunaDestino.cor, color: colunaDestino.cor }}
                                        >
                                          {colunaDestino.nome}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Mostrar páginas de origem e destino */}
                                  {mov.pagina_origem && mov.pagina_destino && (
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span className="capitalize">{mov.pagina_origem.replace('_', ' ')}</span>
                                      <ArrowRight className="h-3 w-3" />
                                      <span className="capitalize">{mov.pagina_destino.replace('_', ' ')}</span>
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
                </div>

                {/* Coluna Direita - Ações Rápidas e Informações do Lead */}
                <div className="w-72 flex-shrink-0 border-l pl-4 bg-muted/50 rounded-lg p-4 overflow-y-auto max-h-full">
                  {/* Ações Rápidas - Primeiro */}
                  <div className="space-y-2 mb-6">
                    <h4 className="font-semibold text-sm mb-3">Ações Rápidas</h4>
                    
                    {/* Botão Nova Atividade - Primeiro */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                      onClick={() => setAtividadeDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Atividade
                    </Button>
                    
                    {/* Botão Etiquetas */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setEtiquetasDialogOpen(true)}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Etiquetas
                      {cardEtiquetas.length > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {cardEtiquetas.length}
                        </Badge>
                      )}
                    </Button>
                    
                    {viewingCard.contato_email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => window.open(`mailto:${viewingCard.contato_email}`, '_blank')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar E-mail
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start text-orange-600 hover:text-orange-700"
                      onClick={handleEncaminharParaCloser}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Encaminhar para Closer
                    </Button>

                    </div>

                  {/* Dados do Lead - Depois */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm">Dados do Lead</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setDetailsDialogOpen(false);
                          handleEditCard(viewingCard);
                        }}
                        title="Editar Lead"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Responsável do Lead */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Responsável do Lead</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {viewingCard.responsavel_id ? (
                            <>
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                                {responsaveis.find(r => r.id === viewingCard.responsavel_id)?.nome?.substring(0, 2).toUpperCase() || '??'}
                              </div>
                              <span className="text-sm font-medium">
                                {responsaveis.find(r => r.id === viewingCard.responsavel_id)?.nome || 'Não identificado'}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nenhum responsável definido</span>
                          )}
                          <Select
                            value={viewingCard.responsavel_id || ''}
                            onValueChange={handleUpdateLeadResponsavel}
                          >
                            <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent hover:bg-muted">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                              {responsaveis.map((resp) => (
                                <SelectItem key={resp.id} value={resp.id}>
                                  {resp.id === profile?.id ? `Eu (${resp.nome})` : resp.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Informações da Empresa */}
                      {viewingEmpresaLead && (
                        <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{viewingEmpresaLead.nome}</span>
                          </div>
                          
                          {viewingEmpresaLead.cnpj && (
                            <div>
                              <Label className="text-xs text-muted-foreground">CNPJ</Label>
                              <p className="text-sm">{viewingEmpresaLead.cnpj}</p>
                            </div>
                          )}
                          
                          {viewingEmpresaLead.email && (
                            <div>
                              <Label className="text-xs text-muted-foreground">E-mail da Empresa</Label>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <a href={`mailto:${viewingEmpresaLead.email}`} className="text-sm text-primary hover:underline">
                                  {viewingEmpresaLead.email}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {viewingEmpresaLead.telefone && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Telefone da Empresa</Label>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <a href={`tel:${viewingEmpresaLead.telefone}`} className="text-sm text-primary hover:underline">
                                  {viewingEmpresaLead.telefone}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {(viewingEmpresaLead.endereco || viewingEmpresaLead.cidade) && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Endereço</Label>
                              <div className="flex items-start gap-2 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                                <p className="text-sm">
                                  {[
                                    viewingEmpresaLead.endereco,
                                    viewingEmpresaLead.numero,
                                    viewingEmpresaLead.complemento,
                                    viewingEmpresaLead.bairro,
                                    viewingEmpresaLead.cidade && viewingEmpresaLead.estado 
                                      ? `${viewingEmpresaLead.cidade}/${viewingEmpresaLead.estado}` 
                                      : viewingEmpresaLead.cidade,
                                    viewingEmpresaLead.cep
                                  ].filter(Boolean).join(', ')}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {viewingEmpresaLead.porte && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Porte da Empresa</Label>
                              <p className="text-sm">
                                {viewingEmpresaLead.porte === 'MEI' && 'MEI - Microempreendedor Individual'}
                                {viewingEmpresaLead.porte === 'ME' && 'ME - Microempresa'}
                                {viewingEmpresaLead.porte === 'EPP' && 'EPP - Empresa de Pequeno Porte'}
                                {viewingEmpresaLead.porte === 'MEDIO' && 'Médio Porte'}
                                {viewingEmpresaLead.porte === 'GRANDE' && 'Grande Porte'}
                                {!['MEI', 'ME', 'EPP', 'MEDIO', 'GRANDE'].includes(viewingEmpresaLead.porte) && viewingEmpresaLead.porte}
                              </p>
                            </div>
                          )}
                          
                          {/* Redes Sociais */}
                          {(viewingEmpresaLead.site || viewingEmpresaLead.linkedin || viewingEmpresaLead.instagram) && (
                            <div className="pt-2 border-t">
                              <Label className="text-xs text-muted-foreground mb-2 block">Redes Sociais</Label>
                              <div className="flex flex-wrap gap-2">
                                {viewingEmpresaLead.site && (
                                  <a 
                                    href={viewingEmpresaLead.site.startsWith('http') ? viewingEmpresaLead.site : `https://${viewingEmpresaLead.site}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                  >
                                    <Globe className="h-3 w-3" />
                                    Site
                                  </a>
                                )}
                                {viewingEmpresaLead.linkedin && (
                                  <a 
                                    href={viewingEmpresaLead.linkedin.startsWith('http') ? viewingEmpresaLead.linkedin : `https://${viewingEmpresaLead.linkedin}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                                  >
                                    <Linkedin className="h-3 w-3" />
                                    LinkedIn
                                  </a>
                                )}
                                {viewingEmpresaLead.instagram && (
                                  <a 
                                    href={viewingEmpresaLead.instagram.startsWith('http') ? viewingEmpresaLead.instagram : `https://${viewingEmpresaLead.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700 hover:bg-pink-200 transition-colors"
                                  >
                                    <Instagram className="h-3 w-3" />
                                    Instagram
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Contatos do Lead */}
                      {viewingCard.contatos && viewingCard.contatos.length > 0 ? (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Contatos ({viewingCard.contatos.length})</Label>
                          <div className="space-y-2">
                            {viewingCard.contatos.map((contato, index) => (
                              <div key={index} className="bg-muted/20 rounded-lg p-2 space-y-1">
                                {contato.nome && (
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">{contato.nome}</span>
                                  </div>
                                )}
                                {contato.email && (
                                  <div className="flex items-center gap-2 pl-5">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <a href={`mailto:${contato.email}`} className="text-xs text-primary hover:underline">
                                      {contato.email}
                                    </a>
                                  </div>
                                )}
                                {contato.telefone && (
                                  <div className="flex items-center gap-2 pl-5">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <a href={`tel:${contato.telefone}`} className="text-xs text-primary hover:underline">
                                      {contato.telefone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {viewingCard.contato_nome && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Contato</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{viewingCard.contato_nome}</span>
                              </div>
                            </div>
                          )}
                          
                          {viewingCard.contato_email && (
                            <div>
                              <Label className="text-xs text-muted-foreground">E-mail</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${viewingCard.contato_email}`} className="text-sm text-primary hover:underline">
                                  {viewingCard.contato_email}
                                </a>
                              </div>
                            </div>
                          )}

                          {viewingCard.contato_telefone && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Telefone</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${viewingCard.contato_telefone}`} className="text-sm text-primary hover:underline">
                                  {viewingCard.contato_telefone}
                                </a>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {viewingCard.origem && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Origem</Label>
                          <p className="text-sm mt-1">{viewingCard.origem}</p>
                        </div>
                      )}

                      {viewingCard.data_contato && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Data do Contato</Label>
                          <p className="text-sm mt-1">
                            {new Date(viewingCard.data_contato).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {viewingCard.data_followup && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Data Follow-up</Label>
                          <p className="text-sm mt-1">
                            {new Date(viewingCard.data_followup).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {viewingCard.descricao && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Descrição</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{viewingCard.descricao}</p>
                        </div>
                      )}

                      {viewingCard.created_at && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Data de Cadastro</Label>
                          <p className="text-sm mt-1">
                            {new Date(viewingCard.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

      {/* Dialog para Criar Novo Modelo */}
      <Dialog open={criarModeloOpen} onOpenChange={setCriarModeloOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Mensagem</DialogTitle>
            <DialogDescription>
              Crie um modelo para o tipo "{TIPOS_ATIVIDADE.find(t => t.id === novaAtividade.tipo)?.label || 'Nota'}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modelo_titulo">Título do Modelo</Label>
              <Input
                id="modelo_titulo"
                value={novoModelo.titulo}
                onChange={(e) => setNovoModelo(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Mensagem de follow-up"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo_conteudo">Conteúdo</Label>
              <Textarea
                id="modelo_conteudo"
                value={novoModelo.conteudo}
                onChange={(e) => setNovoModelo(prev => ({ ...prev, conteudo: e.target.value }))}
                placeholder="Digite o conteúdo do modelo..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCriarModeloOpen(false);
              setNovoModelo({ titulo: '', conteudo: '' });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCriarModelo}>
              Criar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Gerenciar Etiquetas */}
      <Dialog open={etiquetasDialogOpen} onOpenChange={(open) => {
        setEtiquetasDialogOpen(open);
        if (!open) {
          setCriandoEtiqueta(false);
          setNovaEtiqueta({ nome: '', cor: '#f59e0b' });
          setBuscaEtiqueta('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Etiquetas
            </DialogTitle>
          </DialogHeader>
          
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar etiquetas..."
              value={buscaEtiqueta}
              onChange={(e) => setBuscaEtiqueta(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lista de etiquetas */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <Label className="text-xs text-muted-foreground">Etiquetas</Label>
            {etiquetas
              .filter(e => e.nome.toLowerCase().includes(buscaEtiqueta.toLowerCase()))
              .map((etiqueta) => {
                const isSelected = cardEtiquetas.some(ce => ce.etiqueta_id === etiqueta.id);
                return (
                  <div
                    key={etiqueta.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleEtiqueta(etiqueta.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <div
                      className="flex-1 px-3 py-1.5 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: etiqueta.cor }}
                    >
                      {etiqueta.nome}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Editar etiqueta
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            {etiquetas.filter(e => e.nome.toLowerCase().includes(buscaEtiqueta.toLowerCase())).length === 0 && !criandoEtiqueta && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma etiqueta encontrada
              </p>
            )}
          </div>

          {/* Criar nova etiqueta */}
          {criandoEtiqueta ? (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Nova Etiqueta</Label>
              <Input
                placeholder="Nome da etiqueta"
                value={novaEtiqueta.nome}
                onChange={(e) => setNovaEtiqueta(prev => ({ ...prev, nome: e.target.value }))}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {CORES_ETIQUETAS.map((cor) => (
                  <button
                    key={cor.cor}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      novaEtiqueta.cor === cor.cor ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: cor.cor }}
                    onClick={() => setNovaEtiqueta(prev => ({ ...prev, cor: cor.cor }))}
                    title={cor.nome}
                  />
                ))}
              </div>
              {novaEtiqueta.nome && (
                <div
                  className="px-3 py-1.5 rounded text-sm font-medium text-white inline-block"
                  style={{ backgroundColor: novaEtiqueta.cor }}
                >
                  {novaEtiqueta.nome}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setCriandoEtiqueta(false);
                    setNovaEtiqueta({ nome: '', cor: '#f59e0b' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCriarEtiqueta}
                  disabled={!novaEtiqueta.nome.trim()}
                >
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCriandoEtiqueta(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar uma nova etiqueta
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Nova Atividade */}
      <Dialog open={atividadeDialogOpen} onOpenChange={setAtividadeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
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
          
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Tipo de Atividade */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo</Label>
              <Select value={novaAtividade.tipo} onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ATIVIDADE_SELECAO.map((tipo) => (
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
            <div className="relative">
              <Label className="text-sm font-medium mb-2 block">Descrição</Label>
              <Textarea
                placeholder="O que foi feito e qual o próximo passo?"
                value={novaAtividade.descricao}
                onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            {/* Checklist Items - apenas para tipo checklist */}
            {novaAtividade.tipo === 'checklist' && (
              <div className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Itens do Checklist
                </Label>
                
                {novaAtividade.checklist_items.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {novaAtividade.checklist_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded px-2 py-1.5">
                        <Checkbox
                          checked={item.concluido}
                          onCheckedChange={(checked) => {
                            setNovaAtividade(prev => ({
                              ...prev,
                              checklist_items: prev.checklist_items.map(i => 
                                i.id === item.id ? { ...i, concluido: !!checked } : i
                              )
                            }));
                          }}
                          className="h-4 w-4"
                        />
                        <span className={`flex-1 text-sm ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                          {item.texto}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setNovaAtividade(prev => ({
                              ...prev,
                              checklist_items: prev.checklist_items.filter(i => i.id !== item.id)
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar item..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const novoItem: ChecklistItem = {
                          id: crypto.randomUUID(),
                          texto: e.currentTarget.value.trim(),
                          concluido: false,
                        };
                        setNovaAtividade(prev => ({
                          ...prev,
                          checklist_items: [...prev.checklist_items, novoItem]
                        }));
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}

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

            {/* Responsável */}
            <div>
              <Label className="text-xs">Responsável</Label>
              <Select
                value={novaAtividade.responsavel_id}
                onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, responsavel_id: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar responsável..." />
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

            {/* Anexos */}
            <div>
              <input
                type="file"
                id="anexo-input-dialog"
                className="hidden"
                accept=".pdf,image/*"
                multiple
                onChange={handleSelectAnexo}
              />
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => document.getElementById('anexo-input-dialog')?.click()}
                disabled={uploadingAnexo}
              >
                <FileText className="h-4 w-4 mr-2" />
                Adicionar anexo
              </Button>
              
              {anexos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {anexos.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border rounded px-2 py-1 text-xs"
                    >
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="h-6 w-6 object-cover rounded"
                        />
                      ) : (
                        <FileText className="h-4 w-4 text-red-500" />
                      )}
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleRemoveAnexo(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAtividadeDialogOpen(false);
                setNovaAtividade({ tipo: 'tarefa', descricao: '', responsavel_id: '', prazo: '', horario: '', checklist_items: [], membros_ids: [] });
                setAnexos([]);
              }}
              disabled={uploadingAnexo}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleAddAtividade();
                setAtividadeDialogOpen(false);
              }}
              className="bg-primary"
              disabled={uploadingAnexo}
            >
              {uploadingAnexo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Atividade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Justificativa para Mudança de Etapa */}
      <Dialog 
        open={mudancaEtapaDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setMudancaEtapaDialog(prev => ({ ...prev, open: false }));
            setJustificativaMudanca('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mudancaEtapaDialog.direcao === 'retrocesso' ? (
                <ChevronLeft className="h-5 w-5 text-orange-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-blue-500" />
              )}
              {mudancaEtapaDialog.direcao === 'retrocesso' ? 'Retroceder Etapa' : 'Avançar Etapas'}
            </DialogTitle>
            <DialogDescription>
              {mudancaEtapaDialog.direcao === 'retrocesso' ? (
                <>
                  Você está <strong>retrocedendo</strong> o lead de{' '}
                  <strong>"{mudancaEtapaDialog.colunaOrigem?.nome}"</strong> para{' '}
                  <strong>"{mudancaEtapaDialog.colunaDestino?.nome}"</strong>.
                  {mudancaEtapaDialog.etapasMovidas > 1 && (
                    <span className="block mt-1 text-orange-600">
                      ({mudancaEtapaDialog.etapasMovidas} etapas para trás)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Você está avançando o lead{' '}
                  <strong>{mudancaEtapaDialog.etapasMovidas} etapas</strong> de{' '}
                  <strong>"{mudancaEtapaDialog.colunaOrigem?.nome}"</strong> para{' '}
                  <strong>"{mudancaEtapaDialog.colunaDestino?.nome}"</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="justificativa" className="text-sm font-medium">
                Justificativa {mudancaEtapaDialog.direcao === 'retrocesso' ? '(obrigatória)' : '(opcional)'}
              </Label>
              <Textarea
                id="justificativa"
                placeholder={
                  mudancaEtapaDialog.direcao === 'retrocesso'
                    ? 'Explique o motivo do retrocesso...'
                    : 'Explique o motivo de pular etapas...'
                }
                value={justificativaMudanca}
                onChange={(e) => setJustificativaMudanca(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMudancaEtapaDialog(prev => ({ ...prev, open: false }));
                setJustificativaMudanca('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (mudancaEtapaDialog.colunaDestino && mudancaEtapaDialog.colunaOrigem) {
                  executarMudancaEtapa(
                    mudancaEtapaDialog.colunaDestino,
                    mudancaEtapaDialog.colunaOrigem,
                    justificativaMudanca || undefined
                  );
                }
                setMudancaEtapaDialog(prev => ({ ...prev, open: false }));
                setJustificativaMudanca('');
              }}
              disabled={mudancaEtapaDialog.direcao === 'retrocesso' && !justificativaMudanca.trim()}
              className={mudancaEtapaDialog.direcao === 'retrocesso' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              {mudancaEtapaDialog.direcao === 'retrocesso' ? 'Retroceder' : 'Avançar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteType === 'coluna' ? 'a coluna' : 'o lead'} <strong>"{deleteName}"</strong>?
              {deleteType === 'card' && (
                <span className="block mt-2 text-destructive">
                  Todas as atividades relacionadas também serão excluídas.
                </span>
              )}
              <span className="block mt-2">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteType(null);
              setDeleteId(null);
              setDeleteName('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Popup de Atividade */}
      <AtividadePopup
        open={atividadePopupOpen}
        onOpenChange={setAtividadePopupOpen}
        atividade={selectedAtividade}
        onMarkComplete={(atividadeId) => {
          handleUpdateAtividadeStatus(atividadeId, 'concluida');
        }}
      />
    </div>
  );
}
