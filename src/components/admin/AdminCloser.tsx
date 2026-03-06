import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCardMovimentacoes } from '@/hooks/useCardMovimentacoes';
import { CardMovimentacoesHistory } from '@/components/shared/CardMovimentacoesHistory';
import { AtividadePopup } from './AtividadePopup';
import { CalculadoraLicencaVitalicia, DadosOrcamento } from './CalculadoraLicencaVitalicia';
import { CalculadoraCustoMensal, DadosCustoMensal } from './CalculadoraCustoMensal';
import { ComparadorEconomia, DadosComparacao } from './ComparadorEconomia';
import { PropostaComercial } from './PropostaComercial';
import { ContractBuilder } from './ContractBuilder';
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
  FileSpreadsheet,
  Calculator,
  BarChart3,
  FileCheck,
  Globe,
  Linkedin,
  Instagram,
  Package,
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
  forma_pagamento?: 'a_vista' | '3x' | 'leasing';
  valor_a_vista?: number;
  valor_3x?: number;
  valor_leasing?: number;
  dados_orcamento?: DadosOrcamento | null;
  dados_custo_mensal?: DadosCustoMensal | null;
  dados_comparacao?: DadosComparacao | null;
  dados_proposta?: any | null;
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
  { id: 'status_contrato', label: 'Status do Contrato', icon: FileCheck, cor: 'bg-cyan-100 text-cyan-700' },
];

// Opções de status do contrato
const STATUS_CONTRATO_OPCOES = [
  { id: 'a_elaborar', label: 'A Elaborar', cor: 'bg-gray-100 text-gray-700' },
  { id: 'rascunho', label: 'Rascunho', cor: 'bg-yellow-100 text-yellow-700' },
  { id: 'pronto', label: 'Pronto', cor: 'bg-blue-100 text-blue-700' },
  { id: 'enviado', label: 'Enviado', cor: 'bg-purple-100 text-purple-700' },
  { id: 'assinado', label: 'Assinado', cor: 'bg-green-100 text-green-700' },
  { id: 'cancelado', label: 'Cancelado', cor: 'bg-red-100 text-red-700' },
];

// Todos os tipos de atividades (incluindo automáticos para histórico)
const TIPOS_ATIVIDADE = [
  ...TIPOS_ATIVIDADE_SELECAO,
  { id: 'nota', label: 'Tarefa', icon: FileText, cor: 'bg-gray-100 text-gray-700' }, // Legado - mapeia para Tarefa
  { id: 'movimentacao', label: 'Movimentação', icon: ArrowRightLeft, cor: 'bg-indigo-100 text-indigo-700' },
  { id: 'mudanca_etapa', label: 'Mudança de Etapa', icon: ArrowRightLeft, cor: 'bg-indigo-100 text-indigo-700' },
  { id: 'criacao', label: 'Criação', icon: Plus, cor: 'bg-teal-100 text-teal-700' },
  { id: 'proposta', label: 'Proposta Comercial', icon: FileText, cor: 'bg-green-100 text-green-700' },
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
  isDropped,
  atividades = [],
  etiquetas = [],
  cardIndex,
}: { 
  card: ProspeccaoCard; 
  onEdit: (card: ProspeccaoCard) => void;
  onDelete: (id: string) => void;
  onViewDetails: (card: ProspeccaoCard) => void;
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
      case 'frio':
        return <Snowflake className="h-3 w-3 text-blue-500" />;
      case 'morno':
      default:
        return <ThermometerSun className="h-3 w-3 text-orange-500" />;
    }
  };

  const getTemperaturaBadge = () => {
    switch (card.temperatura) {
      case 'quente':
        return <Badge className="text-2xs bg-error/15 text-error border-error/30">Quente</Badge>;
      case 'frio':
        return <Badge className="text-2xs bg-info/15 text-info border-info/30">Frio</Badge>;
      case 'morno':
      default:
        return <Badge className="text-2xs bg-warning/15 text-warning border-warning/30">Morno</Badge>;
    }
  };

  const getTemperaturaColor = () => {
    switch (card.temperatura) {
      case 'quente': return 'hsl(var(--temp-quente))';
      case 'frio': return 'hsl(var(--temp-frio))';
      case 'morno':
      default: return 'hsl(var(--temp-morno))';
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
      return { status: 'a_realizar', label: 'A ser realizada', color: 'text-warning', bgColor: 'bg-warning' };
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

          {/* Módulos contratados */}
          {card.dados_orcamento && (card.dados_orcamento as any).modulos && (card.dados_orcamento as any).modulos.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              {((card.dados_orcamento as any).modulos as any[]).map((mod: any, i: number) => (
                <Badge key={i} variant="outline" className="text-2xs px-1.5 py-0 bg-primary/5 border-primary/20 text-primary">
                  {mod.nome}
                </Badge>
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
          {proximaAtividade && proximaAtividade.prazo && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${atividadeStatus.status === 'pendente' ? 'text-red-500' : atividadeStatus.status === 'a_realizar' ? 'text-orange-500' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              <span>{(() => {
                try {
                  const prazoStr = String(proximaAtividade.prazo).split('T')[0];
                  return format(parse(prazoStr, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
                } catch {
                  return String(proximaAtividade.prazo).split('T')[0];
                }
              })()}</span>
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
        {/* Valor total do negócio da coluna */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-green-600">
            R$ {cards.reduce((total, card) => {
              const formaPagamento = card.forma_pagamento || '3x';
              if (formaPagamento === 'a_vista') {
                return total + (card.valor_a_vista || card.valor || 0);
              } else if (formaPagamento === 'leasing') {
                return total + (card.valor_leasing || card.valor || 0);
              } else {
                return total + (card.valor_3x || card.valor || 0);
              }
            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Cards da Coluna - área de drop com scroll interno */}
      <div 
        ref={setDroppableRef}
        className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors ${
          isOver ? 'bg-primary/5' : ''
        }`}
        style={{ maxHeight: 'calc(100vh - 350px)' }}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onViewDetails={onViewDetails}
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
export function AdminCloser() {
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
    status_contrato: 'a_elaborar',
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
  const [orcamentoDialogOpen, setOrcamentoDialogOpen] = useState(false);
  const [orcamentoView, setOrcamentoView] = useState<'menu' | 'calculadora-licenca' | 'calculadora-mensal' | 'comparacao' | 'proposta'>('menu');
  const [dadosOrcamentoSalvos, setDadosOrcamentoSalvos] = useState<DadosOrcamento | null>(null);
  const [dadosCustoMensalSalvos, setDadosCustoMensalSalvos] = useState<DadosCustoMensal | null>(null);
  const [dadosComparacaoSalvos, setDadosComparacaoSalvos] = useState<DadosComparacao | null>(null);
  const [propostaComercialOpen, setPropostaComercialOpen] = useState(false);
  const [dadosPropostaSalvos, setDadosPropostaSalvos] = useState<any | null>(null);
  const [contractBuilderOpen, setContractBuilderOpen] = useState(false);
  
  // Funções para persistir dados do orçamento no localStorage
  const getOrcamentoStorageKey = (cardId: string) => `closer_orcamento_${cardId}`;
  const getCustoMensalStorageKey = (cardId: string) => `closer_custo_mensal_${cardId}`;
  const getComparacaoStorageKey = (cardId: string) => `closer_comparacao_${cardId}`;
  
  const salvarOrcamentoNoStorage = (cardId: string, dados: DadosOrcamento) => {
    localStorage.setItem(getOrcamentoStorageKey(cardId), JSON.stringify(dados));
  };
  
  const salvarCustoMensalNoStorage = (cardId: string, dados: DadosCustoMensal) => {
    localStorage.setItem(getCustoMensalStorageKey(cardId), JSON.stringify(dados));
  };
  
  const salvarComparacaoNoStorage = (cardId: string, dados: DadosComparacao) => {
    localStorage.setItem(getComparacaoStorageKey(cardId), JSON.stringify(dados));
  };
  
  const carregarOrcamentoDoStorage = (cardId: string): DadosOrcamento | null => {
    const dados = localStorage.getItem(getOrcamentoStorageKey(cardId));
    return dados ? JSON.parse(dados) : null;
  };
  
  const carregarCustoMensalDoStorage = (cardId: string): DadosCustoMensal | null => {
    const dados = localStorage.getItem(getCustoMensalStorageKey(cardId));
    return dados ? JSON.parse(dados) : null;
  };
  
  const carregarComparacaoDoStorage = (cardId: string): DadosComparacao | null => {
    const dados = localStorage.getItem(getComparacaoStorageKey(cardId));
    return dados ? JSON.parse(dados) : null;
  };
  
  const atualizarValoresCardNoBanco = async (cardId: string, dados: DadosOrcamento) => {
    try {
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({
          valor: dados.resultados.precoCheio,
          valor_a_vista: dados.resultados.precoAVista,
          valor_3x: dados.resultados.precoCheio,
          valor_leasing: dados.resultados.precoLeasing,
          dados_orcamento: dados
        })
        .eq('id', cardId);
      
      if (error) {
        console.error('Erro ao atualizar valores no banco:', error);
        return;
      }
      
      // Atualizar o card local também
      setCards(prev => prev.map(c => 
        c.id === cardId 
          ? { 
              ...c, 
              valor: dados.resultados.precoCheio,
              valor_a_vista: dados.resultados.precoAVista,
              valor_3x: dados.resultados.precoCheio,
              valor_leasing: dados.resultados.precoLeasing,
              dados_orcamento: dados
            } 
          : c
      ));
      
      if (viewingCard?.id === cardId) {
        setViewingCard(prev => prev ? {
          ...prev,
          valor: dados.resultados.precoCheio,
          valor_a_vista: dados.resultados.precoAVista,
          valor_3x: dados.resultados.precoCheio,
          valor_leasing: dados.resultados.precoLeasing,
          dados_orcamento: dados
        } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar valores no banco:', error);
    }
  };
  
  const atualizarCustoMensalNoBanco = async (cardId: string, dados: DadosCustoMensal) => {
    try {
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({
          dados_custo_mensal: dados
        })
        .eq('id', cardId);
      
      if (error) {
        console.error('Erro ao atualizar custo mensal no banco:', error);
        return;
      }
      
      // Atualizar o card local também
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, dados_custo_mensal: dados } : c
      ));
      
      if (viewingCard?.id === cardId) {
        setViewingCard(prev => prev ? { ...prev, dados_custo_mensal: dados } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar custo mensal no banco:', error);
    }
  };
  
  const atualizarComparacaoNoBanco = async (cardId: string, dados: DadosComparacao) => {
    try {
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({
          dados_comparacao: dados
        })
        .eq('id', cardId);
      
      if (error) {
        console.error('Erro ao atualizar comparação no banco:', error);
        return;
      }
      
      // Atualizar o card local também
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, dados_comparacao: dados } : c
      ));
      
      if (viewingCard?.id === cardId) {
        setViewingCard(prev => prev ? { ...prev, dados_comparacao: dados } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar comparação no banco:', error);
    }
  };

  const atualizarFormaPagamentoNoBanco = async (cardId: string, formaPagamento: string) => {
    try {
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({
          forma_pagamento: formaPagamento
        })
        .eq('id', cardId);
      
      if (error) {
        console.error('Erro ao atualizar forma de pagamento no banco:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento no banco:', error);
    }
  };

  const atualizarPropostaNoBanco = async (cardId: string, dados: any) => {
    try {
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({
          dados_proposta: dados
        })
        .eq('id', cardId);
      
      if (error) {
        console.error('Erro ao atualizar proposta no banco:', error);
        return;
      }
      
      // Atualizar o card local também
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, dados_proposta: dados } : c
      ));
      
      if (viewingCard?.id === cardId) {
        setViewingCard(prev => prev ? { ...prev, dados_proposta: dados } : null);
      }
      
      setDadosPropostaSalvos(dados);
    } catch (error) {
      console.error('Erro ao atualizar proposta no banco:', error);
    }
  };
  
  const [novaEtiqueta, setNovaEtiqueta] = useState({ nome: '', cor: '#f59e0b' });
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [buscaEtiqueta, setBuscaEtiqueta] = useState('');
  
  // Estado para controlar se o formulário de atividade está expandido
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  
  // Estado para atividades de todos os cards (para exibir indicadores no kanban)
  const [cardAtividades, setCardAtividades] = useState<Record<string, Atividade[]>>({});
  
  // Hook para histórico de movimentações do card (reutilizável)
  const { registrarMudancaColuna, registrarCriacao, registrarMudancaKanban } = useCardMovimentacoes();
  
  // Estado para dialog de justificativa de mudança de etapa
  const [mudancaEtapaDialog, setMudancaEtapaDialog] = useState<{
    open: boolean;
    colunaDestino: Coluna | null;
    colunaOrigem: Coluna | null;
    etapasMovidas: number;
    direcao: 'avanco' | 'retrocesso';
    cardId?: string;
    isDrag?: boolean;
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
      // Buscar todas as empresas (não apenas leads) para permitir vincular qualquer empresa
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .order('nome');
      
      if (error) throw error;
      setEmpresasLead(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Função para buscar dados da empresa e preencher contatos automaticamente
  const handleEmpresaLeadChange = async (empresaLeadId: string) => {
    setCardForm(prev => ({ ...prev, empresa_lead_id: empresaLeadId }));
    
    if (!empresaLeadId) return;
    
    try {
      // Buscar dados completos da empresa
      const { data: empresaData, error } = await supabase
        .from('empresas')
        .select('nome, email, telefone')
        .eq('id', empresaLeadId)
        .single();
      
      if (error) throw error;
      
      if (empresaData) {
        // Preencher contatos com os dados da empresa
        const novoContato = {
          nome: '', // Será preenchido manualmente pelo usuário
          email: empresaData.email || '',
          telefone: empresaData.telefone || '',
        };
        
        // Se tem email ou telefone, preencher o primeiro contato
        if (novoContato.email || novoContato.telefone) {
          setCardForm(prev => ({
            ...prev,
            contatos: [novoContato]
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
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
        .from('closer_colunas')
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
        .from('closer_cards')
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
          .from('closer_atividades' as any)
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
          .from('closer_card_etiquetas')
          .select('*, etiqueta:closer_etiquetas(*)');
        
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
        .from('closer_colunas')
        .insert(colunasPadrao.map(c => ({ ...c, empresa_id: empresaId })));

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Erro ao criar colunas padrão:', error);
    }
  };


  // Função para executar mudança de etapa via drag com justificativa
  const executarMudancaEtapaDrag = async (
    cardId: string,
    colunaDestino: Coluna,
    colunaOrigem: Coluna,
    justificativa?: string
  ) => {
    try {
      // Registrar movimentação usando hook reutilizável
      await registrarMudancaColuna(
        cardId,
        'closer',
        'closer',
        colunaOrigem.nome,
        colunaDestino.nome,
        colunaOrigem.id,
        colunaDestino.id,
        justificativa
      );

      // Verificar se a coluna de destino é "Fechado/Ganho" para criar conta a receber e card no onboarding
      const nomeColuna = colunaDestino.nome?.toLowerCase().trim() || '';
      const isColunaFechadoGanho = nomeColuna.includes('fechado') || nomeColuna.includes('ganho');
      
      if (isColunaFechadoGanho) {
        const cardAtualizado = cards.find(c => c.id === cardId);
        if (cardAtualizado) {
          console.log('>>> [executarMudancaEtapaDrag] Coluna Fechado/Ganho detectada, criando card no Onboarding e Conta a Receber...');
          await criarCardNoOnboarding(cardAtualizado);
          await criarContaReceber(cardAtualizado);
        }
      }

      toast({ title: 'Sucesso', description: `Card movido para "${colunaDestino.nome}"` });
    } catch (error) {
      console.error('Erro ao registrar mudança de etapa:', error);
    }
  };

  // Função para executar mudança de etapa com justificativa
  const executarMudancaEtapa = async (
    colunaDestino: Coluna,
    colunaOrigem: Coluna,
    justificativa?: string
  ) => {
    if (!viewingCard) return;
    
    try {
      // Atualizar coluna do card
      const { error } = await (supabase as any)
        .from('closer_cards')
        .update({ coluna_id: colunaDestino.id })
        .eq('id', viewingCard.id);

      if (error) throw error;

      // Registrar movimentação usando hook reutilizável
      await registrarMudancaColuna(
        viewingCard.id,
        'closer',
        'closer',
        colunaOrigem.nome,
        colunaDestino.nome,
        colunaOrigem.id,
        colunaDestino.id,
        justificativa
      );

      // Verificar se a coluna de destino é "Fechado/Ganho" para criar conta a receber e card no onboarding
      const nomeColuna = colunaDestino.nome?.toLowerCase().trim() || '';
      const isColunaFechadoGanho = nomeColuna.includes('fechado') || nomeColuna.includes('ganho');
      
      if (isColunaFechadoGanho) {
        console.log('>>> [executarMudancaEtapa] Coluna Fechado/Ganho detectada, criando card no Onboarding e Conta a Receber...');
        await criarCardNoOnboarding(viewingCard);
        await criarContaReceber(viewingCard);
      }

      // Atualizar card local
      setViewingCard({ ...viewingCard, coluna_id: colunaDestino.id });
      setCards(prev => prev.map(c => c.id === viewingCard.id ? { ...c, coluna_id: colunaDestino.id } : c));

      // Atualizar histórico de atividades (incluindo as do card de origem)
      await fetchAtividades(viewingCard.id, (viewingCard as any).origem_card_id, (viewingCard as any).origem_kanban);

      toast({ title: 'Sucesso', description: `Card movido para "${colunaDestino.nome}"` });
    } catch (error) {
      console.error('Erro ao mudar etapa:', error);
      toast({ title: 'Erro', description: 'Não foi possível mover o card', variant: 'destructive' });
    }
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

    // Se retroceder ou avançar mais de 1 etapa, pedir justificativa
    if (direcao === 'retrocesso' || etapasMovidas > 1) {
      setMudancaEtapaDialog({
        open: true,
        colunaDestino,
        colunaOrigem,
        etapasMovidas,
        direcao,
      });
    } else {
      // Avançar 1 etapa não precisa de justificativa
      executarMudancaEtapa(colunaDestino, colunaOrigem);
    }
  };

  // Função para criar card no Onboarding quando negócio é fechado/ganho
  const criarCardNoOnboarding = async (card: ProspeccaoCard) => {
    console.log('=== INICIANDO criarCardNoOnboarding ===');
    console.log('Card recebido:', card);
    console.log('Empresa ID:', empresaId);
    
    try {
      // Buscar a primeira coluna do Onboarding (Novo Cliente)
      const { data: colunasOnboarding, error: colunasError } = await (supabase as any)
        .from('pos_venda_colunas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true })
        .limit(1);

      console.log('Colunas Onboarding encontradas:', colunasOnboarding);
      if (colunasError) {
        console.error('Erro ao buscar colunas:', colunasError);
        throw colunasError;
      }

      let colunaDestinoId = colunasOnboarding?.[0]?.id;
      console.log('Coluna destino ID:', colunaDestinoId);

      // Se não existir coluna, criar as colunas padrão do Onboarding
      if (!colunaDestinoId) {
        const colunasPadraoOnboarding = [
          { nome: 'Novo Cliente', cor: '#6366f1', ordem: 0 },
          { nome: 'Onboarding', cor: '#8b5cf6', ordem: 1 },
          { nome: 'Implementação', cor: '#a855f7', ordem: 2 },
          { nome: 'Acompanhamento', cor: '#f59e0b', ordem: 3 },
          { nome: 'Sucesso', cor: '#22c55e', ordem: 4 },
          { nome: 'Churn Risk', cor: '#ef4444', ordem: 5 },
        ];

        const { data: novasColunas, error: insertError } = await (supabase as any)
          .from('pos_venda_colunas')
          .insert(colunasPadraoOnboarding.map(c => ({ ...c, empresa_id: empresaId })))
          .select();

        if (insertError) throw insertError;
        colunaDestinoId = novasColunas?.[0]?.id;
      }

      if (!colunaDestinoId) {
        console.error('Não foi possível obter coluna de destino no Onboarding');
        return;
      }

      // Contar cards na coluna para definir ordem
      const { count } = await (supabase as any)
        .from('pos_venda_cards')
        .select('*', { count: 'exact', head: true })
        .eq('coluna_id', colunaDestinoId)
        .eq('arquivado', false);

      console.log('Contagem de cards na coluna:', count);

      // Criar card no Onboarding com TODOS os dados do card do Closer
      const cardData: any = {
        empresa_id: empresaId,
        coluna_id: colunaDestinoId,
        titulo: card.titulo || card.contato_nome || 'Novo Cliente',
        descricao: card.descricao || null,
        valor: card.valor || 0,
        cliente_nome: card.contato_nome || null,
        cliente_email: card.contato_email || null,
        cliente_telefone: card.contato_telefone || null,
        cliente_empresa: card.contato_empresa || null,
        tipo_servico: card.origem || null,
        origem: card.origem || null,
        temperatura: card.temperatura || 'morno',
        data_venda: new Date().toISOString().split('T')[0],
        status_satisfacao: 'pendente',
        ordem: count || 0,
        arquivado: false,
        // Campos de pagamento do Closer
        forma_pagamento: card.forma_pagamento || null,
        valor_a_vista: card.valor_a_vista || null,
        valor_3x: card.valor_3x || null,
        valor_leasing: card.valor_leasing || null,
        // Dados de orçamento do Closer (JSON)
        dados_orcamento: card.dados_orcamento || null,
        dados_custo_mensal: card.dados_custo_mensal || null,
        dados_comparacao: card.dados_comparacao || null,
        dados_proposta: card.dados_proposta || null,
        // Contatos adicionais
        contatos: card.contatos || [],
        // Referência ao card original do Closer
        closer_card_id: card.id,
      };
      
      // Adicionar campos opcionais apenas se tiverem valor válido
      if (profile?.id) cardData.created_by = profile.id;
      
      console.log('Dados do card a ser criado no Onboarding:', cardData);
      
      const { data: insertedCard, error: cardError } = await (supabase as any)
        .from('pos_venda_cards')
        .insert(cardData)
        .select();

      console.log('Resultado da inserção:', { insertedCard, cardError });

      if (cardError) throw cardError;

      const novoCardId = insertedCard?.[0]?.id;
      console.log('Novo card ID no Onboarding:', novoCardId);

      // Copiar histórico de atividades do Closer para o Onboarding
      if (novoCardId) {
        const { data: atividadesCloser, error: atividadesError } = await (supabase as any)
          .from('closer_atividades')
          .select('*')
          .eq('card_id', card.id)
          .order('created_at', { ascending: true });

        console.log('Atividades do Closer encontradas:', atividadesCloser?.length || 0);

        if (!atividadesError && atividadesCloser && atividadesCloser.length > 0) {
          // Mapear atividades para o formato do pos_venda_atividades
          // Nota: não incluir created_at pois é gerado automaticamente pelo banco
          const atividadesOnboarding = atividadesCloser.map((ativ: any) => {
            // Formatar data original no início da descrição para manter histórico
            const dataOriginal = ativ.created_at ? new Date(ativ.created_at).toLocaleString('pt-BR') : '';
            const descricaoComData = ativ.descricao 
              ? `[Histórico Closer - ${dataOriginal}] ${ativ.descricao}` 
              : `[Histórico Closer - ${dataOriginal}]`;
            
            return {
              card_id: novoCardId,
              usuario_id: ativ.usuario_id,
              tipo: ativ.tipo || 'movimentacao',
              descricao: descricaoComData,
              dados_anteriores: ativ.dados_anteriores || null,
              dados_novos: ativ.dados_novos || null,
              responsavel_id: ativ.responsavel_id || null,
              prazo: ativ.prazo || null,
              horario: ativ.horario || null,
              anexos: ativ.anexos || null,
              checklist_items: ativ.checklist_items || null,
              membros_ids: ativ.membros_ids || null,
              status: ativ.status || (ativ.concluida ? 'concluida' : 'pendente'),
              data_conclusao: ativ.data_conclusao || null,
            };
          });

          console.log('[Onboarding] Tentando inserir atividades:', atividadesOnboarding.length);
          
          const { error: insertAtividadesError } = await (supabase as any)
            .from('pos_venda_atividades')
            .insert(atividadesOnboarding);

          if (insertAtividadesError) {
            console.error('[Onboarding] Erro ao copiar atividades:', insertAtividadesError);
          } else {
            console.log(`[Onboarding] ${atividadesOnboarding.length} atividades copiadas com sucesso`);
          }
        } else {
          console.log('[Onboarding] Nenhuma atividade encontrada no Closer para copiar');
        }

        // Registrar atividade de origem no novo card
        await (supabase as any)
          .from('pos_venda_atividades')
          .insert({
            card_id: novoCardId,
            usuario_id: profile?.id,
            tipo: 'movimentacao',
            descricao: `Card movido do Closer (Fechado/Ganho) para Onboarding`,
            dados_anteriores: { funil: 'closer', card_id: card.id },
            dados_novos: { funil: 'onboarding', card_id: novoCardId },
            status: 'concluida',
            data_conclusao: new Date().toISOString(),
          });
      }

      // Arquivar o card do Closer (mover, não duplicar)
      const { error: archiveError } = await (supabase as any)
        .from('closer_cards')
        .update({ arquivado: true })
        .eq('id', card.id);
      
      if (archiveError) {
        console.error('Erro ao arquivar card do Closer:', archiveError);
      } else {
        console.log('Card do Closer arquivado com sucesso');
        // Remover o card da lista local
        setCards(prev => prev.filter(c => c.id !== card.id));
      }

      console.log('=== Card movido com sucesso para o Onboarding! ===');
      toast({
        title: 'Negócio Fechado!',
        description: 'Cliente movido para o Onboarding com todo o histórico.',
      });

    } catch (error) {
      console.error('Erro ao criar card no Onboarding:', error);
      toast({
        title: 'Aviso',
        description: 'Negócio fechado, mas houve erro ao encaminhar para Onboarding.',
        variant: 'destructive',
      });
    }
  };

  // Função para criar conta a receber quando negócio é fechado/ganho
  const criarContaReceber = async (card: ProspeccaoCard) => {
    console.log('=== INICIANDO criarContaReceber ===');
    console.log('Card recebido:', card);
    
    try {
      // Verificar se já existe uma conta a receber para este card do Closer
      const { data: contaExistente, error: checkError } = await (supabase as any)
        .from('contas_receber')
        .select('id, numero')
        .eq('closer_card_id', card.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Erro ao verificar conta existente:', checkError);
      }
      
      if (contaExistente) {
        console.log('Conta a receber já existe para este card:', contaExistente);
        toast({
          title: 'Recebível já existe',
          description: `O recebível ${contaExistente.numero} já foi criado para este negócio.`,
        });
        return;
      }
      
      // Buscar todas as colunas do Contas a Receber para encontrar "Nova Conta a Receber" ou a primeira
      const { data: colunasReceber, error: colunasError } = await (supabase as any)
        .from('contas_receber_colunas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });

      console.log('Colunas Contas a Receber encontradas:', colunasReceber);
      if (colunasError) {
        console.error('Erro ao buscar colunas:', colunasError);
        throw colunasError;
      }

      // Procurar coluna "Nova Conta a Receber" ou usar a primeira disponível
      let colunaDestinoId = colunasReceber?.find((c: any) => 
        c.nome?.toLowerCase().includes('nova') || 
        c.nome?.toLowerCase().includes('a receber')
      )?.id || colunasReceber?.[0]?.id;

      // Se não existir coluna, criar as colunas padrão
      if (!colunaDestinoId) {
        const colunasPadrao = [
          { nome: 'Nova Conta a Receber', cor: '#8b5cf6', ordem: 0 },
          { nome: 'A Vencer', cor: '#eab308', ordem: 1 },
          { nome: 'Vencidos', cor: '#ef4444', ordem: 2 },
          { nome: 'Recebidos', cor: '#22c55e', ordem: 3 },
        ];

        const { data: novasColunas, error: insertError } = await (supabase as any)
          .from('contas_receber_colunas')
          .insert(colunasPadrao.map(c => ({ ...c, empresa_id: empresaId })))
          .select();

        if (insertError) throw insertError;
        colunaDestinoId = novasColunas?.[0]?.id;
      }
      
      console.log('Coluna de destino selecionada:', colunaDestinoId);

      if (!colunaDestinoId) {
        console.error('Não foi possível obter coluna de destino no Contas a Receber');
        return;
      }

      // Contar contas na coluna para definir ordem
      const { count } = await (supabase as any)
        .from('contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('coluna_id', colunaDestinoId)
        .eq('arquivado', false);

      // Gerar número do recebível
      const ano = new Date().getFullYear();
      const { count: totalContas } = await (supabase as any)
        .from('contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      
      const numeroRecebivel = `CR-${ano}-${String((totalContas || 0) + 1).padStart(3, '0')}`;

      // Determinar valor baseado na forma de pagamento selecionada
      // Prioridade: valor específico da forma de pagamento > valor geral
      let valorFinal = card.valor || 0;
      let formaPagamentoLabel = 'Boleto';
      
      console.log('=== DETERMINANDO VALOR FINAL ===');
      console.log('Forma de pagamento:', card.forma_pagamento);
      console.log('Valor geral:', card.valor);
      console.log('Valor à vista:', card.valor_a_vista);
      console.log('Valor 3x:', card.valor_3x);
      console.log('Valor leasing:', card.valor_leasing);
      
      if (card.forma_pagamento === 'a_vista') {
        valorFinal = card.valor_a_vista || card.valor || 0;
        formaPagamentoLabel = 'PIX';
      } else if (card.forma_pagamento === '3x') {
        valorFinal = card.valor_3x || card.valor || 0;
        formaPagamentoLabel = 'Cartão de Crédito';
      } else if (card.forma_pagamento === 'leasing') {
        valorFinal = card.valor_leasing || card.valor || 0;
        formaPagamentoLabel = 'Boleto';
      }
      
      console.log('Valor final determinado:', valorFinal);

      // Criar conta a receber
      const contaData: any = {
        empresa_id: empresaId,
        coluna_id: colunaDestinoId,
        numero: numeroRecebivel,
        cliente_nome: card.contato_empresa || card.contato_nome || card.titulo || 'Cliente',
        cliente_cnpj: null, // Será preenchido se tiver empresa_lead
        servico_produto: card.descricao || 'Licença Vitalícia',
        valor: valorFinal,
        valor_pago: 0,
        data_emissao: new Date().toISOString().split('T')[0],
        data_competencia: new Date().toISOString().split('T')[0],
        data_recebimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
        forma_pagamento: formaPagamentoLabel,
        categoria: 'receitas_operacionais',
        observacoes: `Originado do Closer - Card: ${card.titulo}`,
        origem: 'closer',
        ordem: count || 0,
        arquivado: false,
        closer_card_id: card.id,
        // Campos de contato do Closer
        contato_nome: card.contato_nome || null,
        contato_email: card.contato_email || null,
        contato_telefone: card.contato_telefone || null,
      };

      // Adicionar campos opcionais
      if (profile?.id) contaData.created_by = profile.id;

      // Nota: O CNPJ deve ser preenchido manualmente ao editar o recebível no Contas a Receber
      // pois não há tabela de empresas/leads com CNPJ no fluxo atual

      console.log('Dados da conta a receber:', contaData);

      const { data: insertedConta, error: contaError } = await (supabase as any)
        .from('contas_receber')
        .insert(contaData)
        .select();

      console.log('Resultado da inserção:', { insertedConta, contaError });

      if (contaError) throw contaError;

      console.log('=== Conta a Receber criada com sucesso! ===');
      
      // Nota: O arquivamento do card é feito na função criarCardNoOnboarding
      // para evitar duplicação, já que ambas funções são chamadas juntas
      
      toast({
        title: 'Recebível Criado!',
        description: `${numeroRecebivel} - R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} adicionado ao Contas a Receber.`,
      });

    } catch (error) {
      console.error('Erro ao criar conta a receber:', error);
      toast({
        title: 'Aviso',
        description: 'Negócio fechado, mas houve erro ao criar conta a receber.',
        variant: 'destructive',
      });
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
                .from('closer_colunas')
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
            .from('closer_cards')
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
            
            // Verificar se é retrocesso (precisa de justificativa)
            const indexOrigem = colunas.findIndex(c => c.id === colunaOrigemId);
            const indexDestino = colunas.findIndex(c => c.id === targetColunaId);
            const etapasMovidas = Math.abs(indexDestino - indexOrigem);
            const isRetrocesso = indexDestino < indexOrigem;
            
            console.log('Registrando movimentação:', { 
              card_id: activeId, 
              de: colunaOrigem?.nome, 
              para: colunaDestino?.nome,
              isRetrocesso,
              etapasMovidas
            });
            
            // Se é retrocesso OU avançar mais de 1 etapa, pedir justificativa antes de registrar
            if ((isRetrocesso || etapasMovidas > 1) && colunaOrigem && colunaDestino) {
              setMudancaEtapaDialog({
                open: true,
                colunaDestino,
                colunaOrigem,
                etapasMovidas,
                direcao: isRetrocesso ? 'retrocesso' : 'avanco',
                cardId: activeId,
                isDrag: true,
              });
              return; // Não registrar movimentação ainda, esperar justificativa
            }
            
            // Registrar movimentação usando hook reutilizável
            await registrarMudancaColuna(
              activeId,
              'closer',
              'closer',
              colunaOrigem?.nome || 'Coluna anterior',
              colunaDestino?.nome || 'Nova coluna',
              colunaOrigemId,
              targetColunaId
            );
            
            // Se o card foi movido para "Fechado/Ganho", criar automaticamente um card no Onboarding
            const nomeColuna = colunaDestino?.nome?.toLowerCase().trim() || '';
            const isColunaFechadoGanho = nomeColuna.includes('fechado') || nomeColuna.includes('ganho');
            console.log('=== VERIFICAÇÃO FECHADO/GANHO ===');
            console.log('Nome da coluna destino:', colunaDestino?.nome);
            console.log('Nome normalizado:', nomeColuna);
            console.log('É coluna Fechado/Ganho?:', isColunaFechadoGanho);
            console.log('Card a ser enviado:', cardAtualizado);
            
            if (isColunaFechadoGanho) {
              console.log('>>> INICIANDO criação de card no Onboarding...');
              await criarCardNoOnboarding(cardAtualizado);
              console.log('>>> FINALIZADO criação de card no Onboarding');
              
              console.log('>>> INICIANDO criação de conta a receber...');
              await criarContaReceber(cardAtualizado);
              console.log('>>> FINALIZADO criação de conta a receber');
            } else {
              console.log('>>> Coluna NÃO é Fechado/Ganho, pulando criação no Onboarding e Contas a Receber');
            }
            
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
        .from('closer_etiquetas')
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
        .from('closer_card_etiquetas')
        .select('*, etiqueta:closer_etiquetas(*)')
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
        .from('closer_etiquetas')
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
          .from('closer_card_etiquetas')
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
          .from('closer_card_etiquetas')
          .insert({
            card_id: viewingCard.id,
            etiqueta_id: etiquetaId,
          })
          .select('*, etiqueta:closer_etiquetas(*)')
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
        .from('closer_cards')
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
      membros_ids: [],
      status_contrato: 'a_elaborar',
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
    
    // Buscar atividades incluindo as do card de origem para manter histórico completo
    const origemCardId = (card as any).origem_card_id;
    const origemKanban = (card as any).origem_kanban;
    
    await Promise.all([
      fetchAtividades(card.id, origemCardId, origemKanban),
      fetchModelos(),
      fetchEtiquetas(),
      fetchCardEtiquetas(card.id),
    ]);
    
    // Carregar dados do orçamento - priorizar banco de dados, fallback para localStorage
    // Dados do orçamento
    if (card.dados_orcamento) {
      setDadosOrcamentoSalvos(card.dados_orcamento);
    } else {
      const orcamentoSalvo = carregarOrcamentoDoStorage(card.id);
      setDadosOrcamentoSalvos(orcamentoSalvo);
    }
    
    // Dados do custo mensal
    if (card.dados_custo_mensal) {
      setDadosCustoMensalSalvos(card.dados_custo_mensal);
    } else {
      const custoMensalSalvo = carregarCustoMensalDoStorage(card.id);
      setDadosCustoMensalSalvos(custoMensalSalvo);
    }
    
    // Dados da comparação
    if (card.dados_comparacao) {
      setDadosComparacaoSalvos(card.dados_comparacao);
    } else {
      const comparacaoSalva = carregarComparacaoDoStorage(card.id);
      setDadosComparacaoSalvos(comparacaoSalva);
    }
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

  const fetchAtividades = async (cardId: string, origemCardId?: string, origemKanban?: string) => {
    setLoadingAtividades(true);
    try {
      // Buscar atividades do card atual - ordenar por created_at (mais recente primeiro)
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('closer_atividades' as any)
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });
      
      if (atividadesError) throw atividadesError;
      
      let todasAtividades: any[] = atividadesData || [];
      
      // IMPORTANTE: Se existe card de origem, buscar atividades dele também para manter histórico completo
      if (origemCardId && origemKanban) {
        const tabelaOrigem = origemKanban === 'prospeccao' ? 'prospeccao_atividades' : `${origemKanban}_atividades`;
        
        const { data: atividadesOrigem, error: errorOrigem } = await supabase
          .from(tabelaOrigem as any)
          .select('*')
          .eq('card_id', origemCardId)
          .order('created_at', { ascending: false });
        
        if (!errorOrigem && atividadesOrigem) {
          // Marcar atividades de origem com flag para identificação visual
          const atividadesOrigemMarcadas = atividadesOrigem.map((a: any) => ({
            ...a,
            _origem_kanban: origemKanban,
          }));
          todasAtividades = [...todasAtividades, ...atividadesOrigemMarcadas];
        }
      }
      
      // Ordenar todas por data (mais recente primeiro)
      todasAtividades.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Buscar todos os usuários únicos de uma vez
      const usuarioIds = [...new Set(todasAtividades.map((a: any) => a.usuario_id).filter(Boolean))];
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
      const atividadesComUsuario = todasAtividades.map((atividade: any) => ({
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
        .from('closer_atividades' as any)
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
    // Para status_contrato, a descrição é opcional (será gerada automaticamente)
    const isStatusContrato = novaAtividade.tipo === 'status_contrato';
    if (!viewingCard || (!isStatusContrato && !novaAtividade.descricao.trim())) {
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
      
      // Para status_contrato, gerar descrição automaticamente se não preenchida
      let descricaoFinal = novaAtividade.descricao;
      if (isStatusContrato) {
        const statusLabel = STATUS_CONTRATO_OPCOES.find(s => s.id === novaAtividade.status_contrato)?.label || novaAtividade.status_contrato;
        descricaoFinal = novaAtividade.descricao.trim() 
          ? `${statusLabel}: ${novaAtividade.descricao}` 
          : `Status do contrato: ${statusLabel}`;
      }
      
      const atividadeData: any = {
        card_id: viewingCard.id,
        usuario_id: profile?.id,
        tipo: novaAtividade.tipo,
        descricao: descricaoFinal,
        status,
      };
      
      // Adicionar dados_novos com status_contrato se for esse tipo
      if (isStatusContrato) {
        atividadeData.dados_novos = { status_contrato: novaAtividade.status_contrato };
      }
      
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
        .from('closer_atividades')
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
            .from('closer_atividades')
            .update({ anexos: anexosUploadados })
            .eq('id', atividadeInserida.id);
        }
      }

      toast({ title: 'Sucesso', description: 'Atividade registrada!' });
      setNovaAtividade({ tipo: 'tarefa', descricao: '', responsavel_id: '', prazo: '', horario: '', checklist_items: [], membros_ids: [], status_contrato: 'a_elaborar' });
      setAnexos([]);
      await fetchAtividades(viewingCard.id, (viewingCard as any).origem_card_id, (viewingCard as any).origem_kanban);
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
          .from('closer_cards')
          .update(cardData)
          .eq('id', editingCard.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Lead atualizado!' });
      } else {
        const cardsNaColuna = cards.filter(c => c.coluna_id === colunaId);
        const { data: newCard, error } = await (supabase as any)
          .from('closer_cards')
          .insert({ ...cardData, ordem: cardsNaColuna.length })
          .select()
          .single();
        if (error) throw error;
        
        // Registrar atividade de criação do lead
        if (newCard) {
          const colunaDestino = colunas.find(c => c.id === colunaId);
          await supabase
            .from('closer_atividades' as any)
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
          .from('closer_colunas')
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
          .from('closer_colunas')
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
          .from('closer_colunas')
          .delete()
          .eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna excluída!' });
      } else if (deleteType === 'card') {
        // Primeiro excluir atividades relacionadas
        await (supabase as any)
          .from('closer_atividades')
          .delete()
          .eq('card_id', deleteId);
        
        const { error } = await (supabase as any)
          .from('closer_cards')
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
              <span>Funil - CLOSER</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seus leads qualificados e oportunidades de fechamento
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
            Lead Qualificado
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
                          {proximaAtividade && proximaAtividade.prazo ? (
                            <span className="text-sm">
                              {(() => {
                                try {
                                  const prazoStr = String(proximaAtividade.prazo).split('T')[0];
                                  return format(parse(prazoStr, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });
                                } catch {
                                  return String(proximaAtividade.prazo).split('T')[0];
                                }
                              })()}
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
            <DialogTitle>{editingCard ? 'Editar Lead' : 'Novo Lead Qualificado'}</DialogTitle>
            <DialogDescription>
              {editingCard ? 'Atualize as informações do lead qualificado' : 'Preencha os dados do novo lead qualificado'}
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
                        Nenhuma empresa cadastrada
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
                    Cadastre uma empresa primeiro.
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
              
              {cardForm.contatos.map((contato, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Contato {index + 1}</span>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    {/* Botões de status do negócio */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={async () => {
                        const colunaPerdido = colunas.find(c => c.nome.toLowerCase().includes('perdido'));
                        if (colunaPerdido) {
                          try {
                            await (supabase as any)
                              .from('closer_cards')
                              .update({ coluna_id: colunaPerdido.id })
                              .eq('id', viewingCard.id);
                            
                            // Registrar atividade de movimentação
                            const colunaAtual = colunas.find(c => c.id === viewingCard.coluna_id);
                            await (supabase as any)
                              .from('closer_atividades')
                              .insert({
                                card_id: viewingCard.id,
                                tipo: 'mudanca_etapa',
                                descricao: `Card marcado como Perdido`,
                                dados_anteriores: { coluna_id: viewingCard.coluna_id, coluna_nome: colunaAtual?.nome },
                                dados_novos: { coluna_id: colunaPerdido.id, coluna_nome: colunaPerdido.nome },
                                status: 'concluida'
                              });
                            
                            setViewingCard({ ...viewingCard, coluna_id: colunaPerdido.id });
                            setCards(prev => prev.map(c => 
                              c.id === viewingCard.id ? { ...c, coluna_id: colunaPerdido.id } : c
                            ));
                            toast({ title: 'Card movido para Perdido' });
                          } catch (error) {
                            console.error('Erro ao mover card:', error);
                          }
                        } else {
                          toast({ title: 'Coluna "Perdido" não encontrada', variant: 'destructive' });
                        }
                      }}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Perdido
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Em andamento
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={async () => {
                        const colunaAceito = colunas.find(c => 
                          c.nome.toLowerCase().includes('negócio aceito') || 
                          c.nome.toLowerCase().includes('negocio aceito') ||
                          c.nome.toLowerCase().includes('aceito')
                        );
                        if (colunaAceito) {
                          try {
                            await (supabase as any)
                              .from('closer_cards')
                              .update({ coluna_id: colunaAceito.id })
                              .eq('id', viewingCard.id);
                            
                            // Registrar atividade de movimentação
                            const colunaAtual = colunas.find(c => c.id === viewingCard.coluna_id);
                            await (supabase as any)
                              .from('closer_atividades')
                              .insert({
                                card_id: viewingCard.id,
                                tipo: 'mudanca_etapa',
                                descricao: `Card marcado como Negócio Aceito`,
                                dados_anteriores: { coluna_id: viewingCard.coluna_id, coluna_nome: colunaAtual?.nome },
                                dados_novos: { coluna_id: colunaAceito.id, coluna_nome: colunaAceito.nome },
                                status: 'concluida'
                              });
                            
                            setViewingCard({ ...viewingCard, coluna_id: colunaAceito.id });
                            setCards(prev => prev.map(c => 
                              c.id === viewingCard.id ? { ...c, coluna_id: colunaAceito.id } : c
                            ));
                            toast({ title: 'Card movido para Negócio Aceito' });
                          } catch (error) {
                            console.error('Erro ao mover card:', error);
                          }
                        } else {
                          toast({ title: 'Coluna "Negócio Aceito" não encontrada', variant: 'destructive' });
                        }
                      }}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Aceito
                    </Button>
                    
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
                      {(viewingCard.temperatura || 'morno').charAt(0).toUpperCase() + (viewingCard.temperatura || 'morno').slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Navegação por etapas */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
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
                        {isAnterior && <ArrowRight className="h-3 w-3 mr-1 rotate-180" />}
                        {col.nome}
                        {isPosterior && <ArrowRight className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </DialogHeader>

              {/* Conteúdo Principal */}
              <div className="flex-1 overflow-hidden flex gap-4 mt-4">
                {/* Coluna Esquerda - Atividades e Movimentações */}
                <div className="flex-1 flex flex-col min-w-0 gap-4">
                  {/* Etiquetas do Card - Antes do título ATIVIDADES */}
                  {cardEtiquetas.length > 0 && (
                    <div className="mb-3">
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

                  {/* Campo de Nova Atividade - Colapsável (ativado pelo botão Nova Atividade no menu rápido) */}
                  {atividadeFormExpanded && (
                  <div className="mb-4 border rounded-lg p-3">
                    {/* Tipo selecionado como título */}
                    <div className="text-sm font-medium mb-2 text-muted-foreground">
                      {TIPOS_ATIVIDADE.find(t => t.id === novaAtividade.tipo)?.label || 'Nota'}
                    </div>
                    
                    {/* Textarea com botão de modelos */}
                    <div className="relative">
                      <Textarea
                        placeholder="O que foi feito e qual o próximo passo?"
                        value={novaAtividade.descricao}
                        onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                        className="min-h-[80px] pr-24"
                      />
                      {/* Botão de Modelos */}
                      <DropdownMenu open={modelosOpen} onOpenChange={setModelosOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="absolute right-2 bottom-2 text-xs text-primary"
                          >
                            + Modelos
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <div className="px-2 py-1.5 text-sm font-semibold">Modelos de anotação</div>
                          <DropdownMenuSeparator />
                          {modelos.filter(m => m.tipo === novaAtividade.tipo).length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                              Nenhum modelo para este tipo
                            </div>
                          ) : (
                            modelos.filter(m => m.tipo === novaAtividade.tipo).map((modelo) => (
                              <DropdownMenuItem 
                                key={modelo.id}
                                onClick={() => handleAplicarModelo(modelo)}
                              >
                                {modelo.titulo}
                              </DropdownMenuItem>
                            ))
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setModelosOpen(false);
                            setCriarModeloOpen(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar novo modelo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Checklist Items - apenas para tipo checklist */}
                    {novaAtividade.tipo === 'checklist' && (
                      <div className="mt-3 border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                        <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Itens do Checklist
                        </Label>
                        
                        {/* Lista de itens */}
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
                        
                        {/* Adicionar novo item */}
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              if (input && input.value.trim()) {
                                const novoItem: ChecklistItem = {
                                  id: crypto.randomUUID(),
                                  texto: input.value.trim(),
                                  concluido: false,
                                };
                                setNovaAtividade(prev => ({
                                  ...prev,
                                  checklist_items: [...prev.checklist_items, novoItem]
                                }));
                                input.value = '';
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Status do Contrato - apenas para tipo status_contrato */}
                    {novaAtividade.tipo === 'status_contrato' && (
                      <div className="mt-3 border rounded-lg p-3 bg-cyan-50 dark:bg-cyan-900/20">
                        <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          Status do Contrato
                        </Label>
                        <Select
                          value={novaAtividade.status_contrato}
                          onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, status_contrato: value }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_CONTRATO_OPCOES.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${status.cor}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Campos extras: Prazo, Horário */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Prazo - Formato dd/mm/aaaa */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Prazo</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-9 text-xs justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {novaAtividade.prazo ? (
                                format(parse(novaAtividade.prazo, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span className="text-muted-foreground">dd/mm/aaaa</span>
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

                      {/* Horário - Formato 24 horas */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Horário</Label>
                        <div className="flex items-center gap-1">
                          <Select
                            value={novaAtividade.horario || ''}
                            onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, horario: value }))}
                          >
                            <SelectTrigger className="h-9 text-xs flex-1">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {Array.from({ length: 48 }, (_, i) => {
                                const hour = Math.floor(i / 2);
                                const minute = i % 2 === 0 ? '00' : '30';
                                const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                                return (
                                  <SelectItem key={timeValue} value={timeValue}>
                                    {timeValue}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {novaAtividade.horario && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => setNovaAtividade(prev => ({ ...prev, horario: '' }))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Atribuição de Membros */}
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Atribuir Membros
                      </Label>
                      <div className="flex flex-col gap-2">
                        {/* Dropdown para selecionar membros (exclui o responsável) */}
                        <Select
                          value=""
                          onValueChange={(membroId) => {
                            if (membroId && !novaAtividade.membros_ids.includes(membroId)) {
                              const membro = responsaveis.find(r => r.id === membroId);
                              if (membro) {
                                // Adicionar membro aos IDs
                                setNovaAtividade(prev => ({
                                  ...prev,
                                  membros_ids: [...prev.membros_ids, membroId],
                                  // Adicionar @nome na descrição
                                  descricao: prev.descricao 
                                    ? `${prev.descricao} @${membro.nome}`
                                    : `@${membro.nome}`
                                }));
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecionar membro para atribuir..." />
                          </SelectTrigger>
                          <SelectContent>
                            {responsaveis
                              .filter(m => m.id !== novaAtividade.responsavel_id && !novaAtividade.membros_ids.includes(m.id))
                              .map((membro) => (
                                <SelectItem key={membro.id} value={membro.id}>
                                  {membro.nome}
                                </SelectItem>
                              ))}
                            {responsaveis.filter(m => m.id !== novaAtividade.responsavel_id && !novaAtividade.membros_ids.includes(m.id)).length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                Nenhum membro disponível
                              </div>
                            )}
                          </SelectContent>
                        </Select>

                        {/* Membros atribuídos */}
                        {novaAtividade.membros_ids.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            {novaAtividade.membros_ids.map((membroId) => {
                              const membro = responsaveis.find(r => r.id === membroId);
                              return membro ? (
                                <div
                                  key={membroId}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-primary text-primary-foreground"
                                >
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium bg-primary-foreground/20">
                                    {membro.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <span>@{membro.nome}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-primary-foreground/20"
                                    onClick={() => {
                                      setNovaAtividade(prev => ({
                                        ...prev,
                                        membros_ids: prev.membros_ids.filter(id => id !== membroId),
                                        // Remover @nome da descrição
                                        descricao: prev.descricao.replace(new RegExp(`\\s*@${membro.nome}`, 'g'), '').trim()
                                      }));
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Anexos selecionados */}
                    {anexos.length > 0 && (
                      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <Label className="text-xs text-muted-foreground mb-2 block">Anexos ({anexos.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {anexos.map((file, index) => (
                            <div 
                              key={index} 
                              className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded px-2 py-1 text-xs"
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
                      </div>
                    )}

                    {/* Botões de ação */}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <input
                          type="file"
                          id="anexo-input"
                          className="hidden"
                          accept=".pdf,image/*"
                          multiple
                          onChange={handleSelectAnexo}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                          onClick={() => document.getElementById('anexo-input')?.click()}
                          disabled={uploadingAnexo}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Adicionar anexo
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setNovaAtividade({ tipo: 'tarefa', descricao: '', responsavel_id: '', prazo: '', horario: '', checklist_items: [], membros_ids: [], status_contrato: 'a_elaborar' });
                            setAnexos([]);
                          }}
                          disabled={uploadingAnexo}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleAddAtividade}
                          className="bg-primary"
                          disabled={uploadingAnexo}
                        >
                          {uploadingAnexo ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                      </div>
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
                    
                    {/* Aviso para agendar próximo passo se não houver atividade agendada/programada (excluindo movimentações) */}
                    {!loadingAtividades && !atividades.some(a => 
                      a.tipo !== 'movimentacao' && 
                      (a.status === 'programada' || a.status === 'a_realizar' || a.status === 'pendente')
                    ) && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-amber-800 font-medium">
                              Que tal agendar um próximo passo para conduzir o lead para uma reunião?
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                              onClick={() => setAtividadeDialogOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agendar Atividade
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {loadingAtividades ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : atividades.filter(a => !['movimentacao', 'mudanca_coluna', 'mudanca_etapa', 'encaminhamento', 'criacao'].includes(a.tipo)).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>Nenhuma atividade registrada</p>
                        <p className="text-xs mt-1">Registre a primeira atividade acima</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atividades.filter(a => !['movimentacao', 'mudanca_coluna', 'mudanca_etapa', 'encaminhamento', 'criacao'].includes(a.tipo)).map((atividade) => {
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
                          // Verificar se é tarefa do dia atual (usando parse para evitar problema de timezone)
                          const prazoDate = atividade.prazo ? parse(atividade.prazo.split('T')[0], 'yyyy-MM-dd', new Date()) : null;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isToday = prazoDate && prazoDate.toDateString() === today.toDateString();
                          const isPastDue = prazoDate && prazoDate < today && atividade.status !== 'concluida';
                          // Identificar funil de origem da atividade
                          const funilOrigem = (atividade as any)._origem_kanban;
                          const funilLabels: Record<string, string> = {
                            prospeccao: 'Prospecção',
                            closer: 'Closer',
                            pos_venda: 'Pós-Venda',
                            cross_selling: 'Cross-Selling',
                          };
                          const funilLabel = funilOrigem ? funilLabels[funilOrigem] || funilOrigem : 'Closer';
                          
                          return (
                            <div 
                              key={atividade.id} 
                              className={`border rounded-lg p-3 bg-card cursor-pointer hover:bg-muted/50 transition-colors ${isConcluida ? 'opacity-60' : ''} ${isToday ? 'border-orange-500 border-2 bg-orange-500/5' : isPastDue ? 'border-red-500 border-2 bg-red-500/5' : 'border-border'}`}
                              onClick={() => {
                                setSelectedAtividade(atividade);
                                setAtividadePopupOpen(true);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox
                                    checked={isConcluida}
                                    onCheckedChange={(checked) => {
                                      // Só permite alterar status de atividades do card atual (não do card de origem)
                                      if (!funilOrigem) {
                                        handleUpdateAtividadeStatus(
                                          atividade.id, 
                                          checked ? 'concluida' : 'a_realizar'
                                        );
                                      }
                                    }}
                                    className="h-5 w-5"
                                    disabled={!!funilOrigem}
                                  />
                                  <div className={`p-2 rounded-full ${tipoInfo.cor}`}>
                                    <TipoIcon className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium text-sm ${isConcluida ? 'line-through' : ''}`}>{tipoInfo.label}</span>
                                      <Badge className={`text-xs ${statusColors[atividade.status || 'criada']}`}>
                                        {statusLabels[atividade.status || 'criada']}
                                      </Badge>
                                      {/* Badge indicando o funil de origem */}
                                      <Badge variant="outline" className={`text-xs ${funilOrigem ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
                                        {funilLabel}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {new Date(atividade.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isConcluida ? 'line-through' : ''}`}>
                                    {atividade.descricao}
                                  </p>
                                  
                                  {/* Exibir anexos da atividade */}
                                  {atividade.anexos && Array.isArray(atividade.anexos) && atividade.anexos.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(atividade.anexos as { nome: string; url: string; tipo: string }[]).map((anexo, idx) => (
                                        <a
                                          key={idx}
                                          href={anexo.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 bg-background border border-border rounded px-2 py-1 text-xs hover:bg-muted transition-colors"
                                        >
                                          {anexo.tipo.startsWith('image/') ? (
                                            <img 
                                              src={anexo.url} 
                                              alt={anexo.nome}
                                              className="h-8 w-8 object-cover rounded"
                                            />
                                          ) : (
                                            <FileText className="h-4 w-4 text-red-500" />
                                          )}
                                          <span className="max-w-[80px] truncate">{anexo.nome}</span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Exibir informações de movimentação */}
                                  {(atividade.tipo === 'movimentacao' || atividade.tipo === 'mudanca_etapa') && (
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                      {atividade.dados_anteriores && atividade.dados_novos ? (
                                        <>
                                          <Badge variant="outline" className="bg-muted">
                                            {atividade.dados_anteriores.coluna_nome || 'Origem'}
                                          </Badge>
                                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                            {atividade.dados_novos.coluna_nome || 'Destino'}
                                          </Badge>
                                        </>
                                      ) : (
                                        <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                                          Etapa alterada
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* Exibir prazo e horário se existirem */}
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

                                  {/* Exibir responsável atribuído */}
                                  {atividade.responsavel_id && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                      <UserCheck className="h-3 w-3" />
                                      <span>Responsável: {responsaveis.find(r => r.id === atividade.responsavel_id)?.nome || 'Não identificado'}</span>
                                    </div>
                                  )}

                                  {/* Exibir checklist items */}
                                  {atividade.checklist_items && Array.isArray(atividade.checklist_items) && atividade.checklist_items.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {(atividade.checklist_items as ChecklistItem[]).map((item) => (
                                        <div key={item.id} className="flex items-center gap-2 text-xs">
                                          <Checkbox
                                            checked={item.concluido}
                                            disabled
                                            className="h-3 w-3"
                                          />
                                          <span className={item.concluido ? 'line-through text-muted-foreground' : ''}>
                                            {item.texto}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Exibir membros atribuídos */}
                                  {atividade.membros_ids && Array.isArray(atividade.membros_ids) && atividade.membros_ids.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {(atividade.membros_ids as string[]).map((membroId) => {
                                        const membro = responsaveis.find(r => r.id === membroId);
                                        return membro ? (
                                          <div
                                            key={membroId}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary"
                                          >
                                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-medium">
                                              {membro.nome.charAt(0).toUpperCase()}
                                            </div>
                                            {membro.nome}
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  )}
                                  
                                  {atividade.usuario && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Por: {atividade.usuario.nome}
                                    </p>
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
                  
                  {/* Histórico de Movimentações do Card - 50% do espaço */}
                  <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 flex-shrink-0">
                      <ArrowRightLeft className="h-4 w-4" />
                      Histórico de Movimentações do Card
                    </h4>
                    {viewingCard && (
                      <CardMovimentacoesHistory 
                        cardId={viewingCard.id} 
                        cardTipo="closer"
                        origemCardId={(viewingCard as any).origem_card_id}
                        origemKanban={(viewingCard as any).origem_kanban}
                        maxHeight="100%"
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Ações Rápidas e Informações do Lead */}
                <div className="w-72 flex-shrink-0 border-l pl-4 bg-muted/50 rounded-lg p-4 -mr-4 overflow-y-auto max-h-full">
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
                      className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => setOrcamentoDialogOpen(true)}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Elaborar Orçamento
                    </Button>

                    {/* Botão Elaborar Contrato - aparece apenas na coluna "Elaborar Contrato" ou similar */}
                    {(() => {
                      const colunaAtual = colunas.find(c => c.id === viewingCard.coluna_id);
                      const nomeColuna = colunaAtual?.nome?.toLowerCase() || '';
                      const isElaboracaoContrato = nomeColuna.includes('elaborar contrato') || 
                                                   nomeColuna.includes('elaboração do contrato') || 
                                                   nomeColuna.includes('elaboracao do contrato') ||
                                                   nomeColuna.includes('elaboração contrato') ||
                                                   nomeColuna.includes('elaboracao contrato');
                      if (isElaboracaoContrato) {
                        return (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setContractBuilderOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Elaborar Contrato
                          </Button>
                        );
                      }
                      return null;
                    })()}

                    </div>

                  {/* Valor do Negócio */}
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-3">Valor do Negócio</h4>
                    <div className="space-y-3">
                      {/* Valor em destaque baseado na forma de pagamento selecionada */}
                      <div className="text-2xl font-bold text-primary">
                        {(() => {
                          const formaPagamento = viewingCard.forma_pagamento || '3x';
                          if (dadosOrcamentoSalvos?.resultados) {
                            if (formaPagamento === 'a_vista') {
                              return `R$ ${(dadosOrcamentoSalvos.resultados.precoAVista || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            } else if (formaPagamento === 'leasing') {
                              return `R$ ${(dadosOrcamentoSalvos.resultados.precoLeasing || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            } else {
                              return `R$ ${(dadosOrcamentoSalvos.resultados.precoCheio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                          }
                          return `R$ ${(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                      </div>
                      
                      {/* Checkboxes de Forma de Pagamento */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                        <div className="space-y-2">
                          {/* Valor Cheio (3x) */}
                          <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            viewingCard.forma_pagamento === '3x' || !viewingCard.forma_pagamento 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={viewingCard.forma_pagamento === '3x' || !viewingCard.forma_pagamento}
                              onChange={() => {
                                setViewingCard({ ...viewingCard, forma_pagamento: '3x' });
                                setCards(cards.map(c => c.id === viewingCard.id ? { ...c, forma_pagamento: '3x' } : c));
                                atualizarFormaPagamentoNoBanco(viewingCard.id, '3x');
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">Valor Cheio (3x)</span>
                              {dadosOrcamentoSalvos?.resultados && (
                                <span className={`ml-2 text-sm ${viewingCard.forma_pagamento === '3x' || !viewingCard.forma_pagamento ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                  R$ {(dadosOrcamentoSalvos.resultados.precoCheio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </label>
                          
                          {/* À Vista */}
                          <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            viewingCard.forma_pagamento === 'a_vista' 
                              ? 'border-green-500 bg-green-500/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={viewingCard.forma_pagamento === 'a_vista'}
                              onChange={() => {
                                setViewingCard({ ...viewingCard, forma_pagamento: 'a_vista' });
                                setCards(cards.map(c => c.id === viewingCard.id ? { ...c, forma_pagamento: 'a_vista' } : c));
                                atualizarFormaPagamentoNoBanco(viewingCard.id, 'a_vista');
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">À Vista</span>
                              {dadosOrcamentoSalvos?.resultados && (
                                <span className={`ml-2 text-sm ${viewingCard.forma_pagamento === 'a_vista' ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>
                                  R$ {(dadosOrcamentoSalvos.resultados.precoAVista || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </label>
                          
                          {/* Leasing */}
                          <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                            viewingCard.forma_pagamento === 'leasing' 
                              ? 'border-orange-500 bg-orange-500/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={viewingCard.forma_pagamento === 'leasing'}
                              onChange={() => {
                                setViewingCard({ ...viewingCard, forma_pagamento: 'leasing' });
                                setCards(cards.map(c => c.id === viewingCard.id ? { ...c, forma_pagamento: 'leasing' } : c));
                                atualizarFormaPagamentoNoBanco(viewingCard.id, 'leasing');
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">Leasing</span>
                              {dadosOrcamentoSalvos?.resultados && (
                                <span className={`ml-2 text-sm ${viewingCard.forma_pagamento === 'leasing' ? 'text-orange-600 font-bold' : 'text-muted-foreground'}`}>
                                  R$ {(dadosOrcamentoSalvos.resultados.precoLeasing || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                        
                        {!dadosOrcamentoSalvos && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Calcule o orçamento em "Elaborar Orçamento" para ver os valores.
                          </p>
                        )}
                      </div>
                    </div>
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

      {/* Dialog para Elaborar Orçamento */}
      <Dialog open={orcamentoDialogOpen} onOpenChange={(open) => {
        setOrcamentoDialogOpen(open);
        if (!open) {
          setOrcamentoView('menu');
        }
      }}>
        <DialogContent className={orcamentoView === 'calculadora-licenca' ? 'max-w-6xl max-h-[90vh]' : 'max-w-4xl'}>
          {orcamentoView === 'menu' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  Elaborar Orçamento
                </DialogTitle>
                <DialogDescription>
                  Selecione uma das opções abaixo para elaborar o orçamento do lead
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6 py-4">
                {/* Coluna Esquerda - Ações */}
                <div className="space-y-4">
                  {/* 1 - Calcular Licença Vitalícia */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Calculator className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Sistema Modular Licença Vitalícia</h4>
                        <p className="text-xs text-muted-foreground">Calcular o preço do sistema</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => setOrcamentoView('calculadora-licenca')}
                    >
                      Calcular
                    </Button>
                  </div>

                  {/* 2 - Calcular Custo Mensal */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <Calculator className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Custo Mensal Pós-Licença</h4>
                        <p className="text-xs text-muted-foreground">Calcular custo mensal após pagamento da licença</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={() => setOrcamentoView('calculadora-mensal')}
                    >
                      Calcular
                    </Button>
                  </div>

                  {/* 3 - Comparação SaaS x TORIQ */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <BarChart3 className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Comparação de Economia</h4>
                        <p className="text-xs text-muted-foreground">SaaS convencional x TORIQ</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => setOrcamentoView('comparacao')}
                    >
                      Comparar
                    </Button>
                  </div>

                  {/* 4 - Proposta Comercial */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <FileCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Proposta Comercial</h4>
                        <p className="text-xs text-muted-foreground">Gerar proposta comercial completa</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setDadosPropostaSalvos(viewingCard?.dados_proposta || null);
                        setOrcamentoDialogOpen(false);
                        setPropostaComercialOpen(true);
                      }}
                    >
                      Elaborar
                    </Button>
                  </div>
                </div>

                {/* Coluna Direita - Preview/Resultado */}
                <div className="border rounded-lg p-4 bg-muted/30 flex flex-col">
                  <h4 className="font-semibold text-sm mb-4 flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resultado
                  </h4>
                  
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Seção 1 - Sistema Modular Licença Vitalícia */}
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <h5 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Sistema Modular - Licença Vitalícia
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-[10px] text-muted-foreground">Valor Cheio (3x)</p>
                          <p className="text-sm font-bold text-primary">
                            {dadosOrcamentoSalvos?.resultados 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosOrcamentoSalvos.resultados.precoCheio || 0)
                              : 'R$ —'}
                          </p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-[10px] text-muted-foreground">À Vista (c/ desc.)</p>
                          <p className="text-sm font-bold text-green-600">
                            {dadosOrcamentoSalvos?.resultados 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosOrcamentoSalvos.resultados.precoAVista || 0)
                              : 'R$ —'}
                          </p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-[10px] text-muted-foreground">Leasing</p>
                          <p className="text-sm font-bold text-orange-600">
                            {dadosOrcamentoSalvos?.resultados 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosOrcamentoSalvos.resultados.precoLeasing || 0)
                              : 'R$ —'}
                          </p>
                        </div>
                      </div>
                      {dadosOrcamentoSalvos?.resultados && dadosOrcamentoSalvos?.modulos && (
                        <div className="mt-2 text-[10px] text-muted-foreground text-center">
                          {dadosOrcamentoSalvos.modulos.length} módulo(s) • Mensalidade Leasing: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosOrcamentoSalvos.resultados.mensalidadeLeasing || 0)}
                        </div>
                      )}
                    </div>

                    {/* Seção 2 - Custo Mensal Pós-Licença */}
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <h5 className="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Custo Mensal Pós-Licença
                      </h5>
                      {dadosCustoMensalSalvos?.resultados ? (
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-[10px] text-muted-foreground">Preço Mensal</p>
                            <p className="text-sm font-bold text-purple-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosCustoMensalSalvos.resultados.precoSugerido || 0)}
                            </p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-[10px] text-muted-foreground">Lucro Líquido</p>
                            <p className="text-sm font-bold text-green-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosCustoMensalSalvos.resultados.lucroLiquido || 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-12 text-muted-foreground">
                          <p className="text-xs text-center">Clique em "Calcular" para ver o resultado</p>
                        </div>
                      )}
                    </div>

                    {/* Seção 3 - Comparação SaaS x TORIQ */}
                    <div className="flex-1 border rounded-lg p-3 bg-card">
                      <h5 className="text-xs font-semibold text-orange-600 mb-2 flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Comparação de Economia: SaaS x TORIQ
                      </h5>
                      {dadosComparacaoSalvos?.resultados ? (
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-[10px] text-muted-foreground">Economia</p>
                            <p className={`text-sm font-bold ${(dadosComparacaoSalvos.resultados.economia || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosComparacaoSalvos.resultados.economia || 0)}
                            </p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-[10px] text-muted-foreground">Dif. Mensal</p>
                            <p className="text-sm font-bold text-purple-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosComparacaoSalvos.resultados.diferencaMensal || 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-12 text-muted-foreground">
                          <p className="text-xs text-center">Clique em "Comparar" para ver o resultado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOrcamentoDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          ) : orcamentoView === 'calculadora-licenca' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setOrcamentoView('menu')}
                  className="h-8 px-2"
                >
                  <ArrowRight className="h-4 w-4 rotate-180 mr-1" />
                  Voltar
                </Button>
              </div>
              <CalculadoraLicencaVitalicia 
                onClose={() => setOrcamentoView('menu')} 
                onSave={(dados) => {
                  setDadosOrcamentoSalvos(dados);
                  // Persistir no localStorage e atualizar banco
                  if (viewingCard?.id) {
                    salvarOrcamentoNoStorage(viewingCard.id, dados);
                    atualizarValoresCardNoBanco(viewingCard.id, dados);
                  }
                  toast({ title: 'Orçamento salvo', description: 'Os valores foram salvos com sucesso!' });
                  setOrcamentoView('menu');
                }}
                dadosSalvos={dadosOrcamentoSalvos}
              />
            </>
          ) : orcamentoView === 'calculadora-mensal' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setOrcamentoView('menu')}
                  className="h-8 px-2"
                >
                  <ArrowRight className="h-4 w-4 rotate-180 mr-1" />
                  Voltar
                </Button>
              </div>
              <CalculadoraCustoMensal 
                onClose={() => setOrcamentoView('menu')} 
                onSave={(dados) => {
                  setDadosCustoMensalSalvos(dados);
                  // Persistir no localStorage e banco
                  if (viewingCard?.id) {
                    salvarCustoMensalNoStorage(viewingCard.id, dados);
                    atualizarCustoMensalNoBanco(viewingCard.id, dados);
                  }
                  toast({ title: 'Custo mensal salvo', description: 'Os valores foram salvos com sucesso!' });
                  setOrcamentoView('menu');
                }}
                dadosSalvos={dadosCustoMensalSalvos}
              />
            </>
          ) : orcamentoView === 'comparacao' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setOrcamentoView('menu')}
                  className="h-8 px-2"
                >
                  <ArrowRight className="h-4 w-4 rotate-180 mr-1" />
                  Voltar
                </Button>
              </div>
              <ComparadorEconomia 
                onClose={() => setOrcamentoView('menu')} 
                onSave={async (dados) => {
                  setDadosComparacaoSalvos(dados);
                  // Persistir no localStorage e banco
                  if (viewingCard?.id) {
                    salvarComparacaoNoStorage(viewingCard.id, dados);
                    atualizarComparacaoNoBanco(viewingCard.id, dados);
                  }
                  toast({ title: 'Comparação salva', description: 'Gerando PDF e registrando atividade...' });
                  
                  // Gerar PDF automaticamente ao salvar (igual ao botão "Salvar em PDF")
                  // O PDF será gerado pelo onSavePDF que será chamado internamente
                }}
                valoresOrcamento={dadosOrcamentoSalvos?.resultados ? {
                  precoCheio: dadosOrcamentoSalvos.resultados.precoCheio,
                  precoAVista: dadosOrcamentoSalvos.resultados.precoAVista,
                  valorLeasing: dadosOrcamentoSalvos.resultados.precoLeasing,
                  mensalidadeLeasing: dadosOrcamentoSalvos.resultados.mensalidadeLeasing,
                  prazoLeasing: dadosOrcamentoSalvos.leasing?.leaseMonths
                } : undefined}
                onSavePDF={async (pdfBlob, fileName) => {
                  if (!viewingCard?.id) return;
                  
                  try {
                    let anexos: { nome: string; url: string; tipo: string }[] = [];
                    
                    // Upload do PDF para o Supabase Storage
                    const filePath = `comparacoes/${viewingCard.id}/${fileName}`;
                    const { data: uploadData, error: uploadError } = await (supabase as any)
                      .storage
                      .from('prospeccao-anexos')
                      .upload(filePath, pdfBlob, {
                        contentType: 'application/pdf',
                        upsert: true
                      });
                    
                    if (uploadError) {
                      console.error('Erro ao fazer upload do PDF:', uploadError);
                      toast({ title: 'Erro', description: 'Não foi possível fazer upload do PDF', variant: 'destructive' });
                      return;
                    }
                    
                    // Criar URL assinada com validade de 1 ano
                    const { data: signedUrlData, error: signedUrlError } = await (supabase as any)
                      .storage
                      .from('prospeccao-anexos')
                      .createSignedUrl(filePath, 31536000);
                    
                    if (signedUrlData?.signedUrl) {
                      anexos = [{
                        nome: fileName,
                        url: signedUrlData.signedUrl,
                        tipo: 'application/pdf'
                      }];
                    } else if (signedUrlError) {
                      console.error('Erro ao criar URL assinada:', signedUrlError);
                      // Tentar URL pública como fallback
                      const { data: urlData } = (supabase as any)
                        .storage
                        .from('prospeccao-anexos')
                        .getPublicUrl(filePath);
                      
                      if (urlData?.publicUrl) {
                        anexos = [{
                          nome: fileName,
                          url: urlData.publicUrl,
                          tipo: 'application/pdf'
                        }];
                      }
                    }

                    // Criar atividade com anexo PDF
                    const economia = dadosComparacaoSalvos?.resultados?.economia || 0;
                    const descricao = `Comparação de Economia gerada. Economia estimada: R$ ${economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no horizonte de ${dadosComparacaoSalvos?.toriq?.horizonYears || 5} anos.`;
                    
                    const { error } = await (supabase as any)
                      .from('closer_atividades')
                      .insert({
                        card_id: viewingCard.id,
                        tipo: 'comparacao',
                        descricao: descricao,
                        dados_novos: dadosComparacaoSalvos,
                        status: 'concluida',
                        anexos: anexos
                      });
                    
                    if (error) {
                      console.error('Erro ao criar atividade de comparação:', error);
                      toast({ title: 'PDF salvo', description: 'PDF salvo mas não foi possível criar a atividade' });
                      return;
                    }
                    
                    // Recarregar atividades do card (incluindo as do card de origem)
                    if (viewingCard?.id) {
                      fetchAtividades(viewingCard.id, (viewingCard as any).origem_card_id, (viewingCard as any).origem_kanban);
                    }
                    
                    toast({ title: 'Sucesso', description: 'Comparação salva como PDF e registrada nas atividades!' });
                  } catch (error) {
                    console.error('Erro ao salvar PDF da comparação:', error);
                    toast({ title: 'Erro', description: 'Erro ao salvar PDF', variant: 'destructive' });
                  }
                }}
                dadosSalvos={dadosComparacaoSalvos}
                valorLicencaVitalicia={dadosOrcamentoSalvos?.resultados?.precoCheio}
                precoMensalPosLicenca={dadosCustoMensalSalvos?.resultados?.precoSugerido}
              />
            </>
          ) : null}
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
                <ArrowRight className="h-5 w-5 text-orange-500 rotate-180" />
              ) : (
                <ArrowRight className="h-5 w-5 text-blue-500" />
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
                // Se foi drag and drop, reverter o card para a coluna original
                if (mudancaEtapaDialog.isDrag && mudancaEtapaDialog.cardId && mudancaEtapaDialog.colunaOrigem) {
                  setCards(prev => prev.map(c => 
                    c.id === mudancaEtapaDialog.cardId 
                      ? { ...c, coluna_id: mudancaEtapaDialog.colunaOrigem!.id } 
                      : c
                  ));
                  // Reverter no banco também
                  (supabase as any)
                    .from('closer_cards')
                    .update({ coluna_id: mudancaEtapaDialog.colunaOrigem.id })
                    .eq('id', mudancaEtapaDialog.cardId);
                }
                setMudancaEtapaDialog(prev => ({ ...prev, open: false }));
                setJustificativaMudanca('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (mudancaEtapaDialog.colunaDestino && mudancaEtapaDialog.colunaOrigem) {
                  if (mudancaEtapaDialog.isDrag && mudancaEtapaDialog.cardId) {
                    // Mudança via drag and drop
                    executarMudancaEtapaDrag(
                      mudancaEtapaDialog.cardId,
                      mudancaEtapaDialog.colunaDestino,
                      mudancaEtapaDialog.colunaOrigem,
                      justificativaMudanca || undefined
                    );
                  } else {
                    // Mudança via navegação no dialog
                    executarMudancaEtapa(
                      mudancaEtapaDialog.colunaDestino,
                      mudancaEtapaDialog.colunaOrigem,
                      justificativaMudanca || undefined
                    );
                  }
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

      {/* Proposta Comercial */}
      {propostaComercialOpen && viewingCard && (
        <PropostaComercial
          cardId={viewingCard.id}
          cardNome={viewingCard.titulo}
          empresaNome={viewingEmpresaLead?.nome || viewingCard.contato_empresa || ''}
          contatoNome={viewingCard.contato_nome || ''}
          dadosOrcamento={dadosOrcamentoSalvos}
          dadosCustoMensal={dadosCustoMensalSalvos}
          dadosComparacao={dadosComparacaoSalvos}
          propostaSalva={dadosPropostaSalvos}
          onSave={(dados) => {
            atualizarPropostaNoBanco(viewingCard.id, dados);
          }}
          onSaveAtividade={async (descricao, dados, pdfBlob, pdfFileName) => {
            try {
              let anexos: { nome: string; url: string; tipo: string }[] = [];
              
              // Upload do PDF para o Supabase Storage
              if (pdfBlob && pdfFileName) {
                const filePath = `propostas/${viewingCard.id}/${pdfFileName}`;
                const { data: uploadData, error: uploadError } = await (supabase as any)
                  .storage
                  .from('prospeccao-anexos')
                  .upload(filePath, pdfBlob, {
                    contentType: 'application/pdf',
                    upsert: true
                  });
                
                if (uploadError) {
                  console.error('Erro ao fazer upload do PDF:', uploadError);
                  // Continuar mesmo sem o anexo
                } else {
                  // Criar URL assinada com validade de 1 ano (31536000 segundos)
                  const { data: signedUrlData, error: signedUrlError } = await (supabase as any)
                    .storage
                    .from('prospeccao-anexos')
                    .createSignedUrl(filePath, 31536000);
                  
                  if (signedUrlData?.signedUrl) {
                    anexos = [{
                      nome: pdfFileName,
                      url: signedUrlData.signedUrl,
                      tipo: 'application/pdf'
                    }];
                  } else if (signedUrlError) {
                    console.error('Erro ao criar URL assinada:', signedUrlError);
                    // Tentar URL pública como fallback
                    const { data: urlData } = (supabase as any)
                      .storage
                      .from('prospeccao-anexos')
                      .getPublicUrl(filePath);
                    
                    if (urlData?.publicUrl) {
                      anexos = [{
                        nome: pdfFileName,
                        url: urlData.publicUrl,
                        tipo: 'application/pdf'
                      }];
                    }
                  }
                }
              }

              // Criar atividade com anexo - status 'a_realizar' para que seja encaminhada ao cliente
              const { error } = await (supabase as any)
                .from('closer_atividades')
                .insert({
                  card_id: viewingCard.id,
                  tipo: 'proposta',
                  descricao: descricao,
                  dados_novos: dados,
                  status: 'a_realizar',
                  anexos: anexos
                });
              
              if (error) {
                console.error('Erro ao criar atividade de proposta:', error);
                return;
              }
              
              // Recarregar atividades do card
              if (viewingCard?.id) {
                const { data: atividadesData } = await (supabase as any)
                  .from('closer_atividades')
                  .select('*, usuario:usuarios(nome)')
                  .eq('card_id', viewingCard.id)
                  .order('created_at', { ascending: false });
                
                if (atividadesData) {
                  setAtividades(atividadesData);
                }
              }
            } catch (error) {
              console.error('Erro ao criar atividade de proposta:', error);
            }
          }}
          onClose={() => setPropostaComercialOpen(false)}
        />
      )}

      {/* Contract Builder */}
      {viewingCard && (
        <ContractBuilder
          isOpen={contractBuilderOpen}
          onClose={() => setContractBuilderOpen(false)}
          empresaId={empresaId}
          cardData={{
            id: viewingCard.id,
            titulo: viewingCard.titulo || '',
            cliente_nome: viewingCard.contato_nome,
            cliente_email: viewingCard.contato_email,
            cliente_telefone: viewingCard.contato_telefone,
            cliente_empresa: viewingCard.contato_empresa,
            valor: viewingCard.valor,
            valor_a_vista: viewingCard.valor_a_vista,
            valor_3x: viewingCard.valor_3x,
            valor_leasing: viewingCard.valor_leasing,
            forma_pagamento: viewingCard.forma_pagamento,
            responsavel_nome: responsaveis.find(r => r.id === viewingCard.responsavel_id)?.nome,
            empresa_lead_id: viewingCard.empresa_lead_id,
            dados_orcamento: dadosOrcamentoSalvos || viewingCard.dados_orcamento,
            dados_proposta: dadosPropostaSalvos || viewingCard.dados_proposta,
            dados_custo_mensal: dadosCustoMensalSalvos || viewingCard.dados_custo_mensal,
          }}
        />
      )}

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
                setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '', responsavel_id: '', checklist_items: [], membros_ids: [] });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleAddAtividade();
                setAtividadeDialogOpen(false);
              }}
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
    </div>
  );
}
