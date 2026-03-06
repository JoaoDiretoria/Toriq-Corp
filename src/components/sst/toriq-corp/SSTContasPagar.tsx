import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, DollarSign, Calendar as CalendarIcon, MoreVertical, Trash2, Eye, GripVertical, Edit, Target, Info, RefreshCw, Building2, Mail, Phone, MessageSquare, Video, MapPin, FileText, Clock, ArrowRight, CheckCircle2, CalendarClock, ExternalLink, ArrowRightLeft, ListChecks, Loader2, X, Paperclip, Upload, BookTemplate, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ContaPagar {
  id: string;
  numero: string;
  fornecedor_id: string | null;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento: string;
  forma_pagamento_id: string | null;
  categoria: string;
  centro_custo_id: string | null;
  conta_financeira: string;
  conta_financeira_id: string | null;
  coluna_id: string;
  observacoes: string;
  ordem: number;
  created_at: string;
  status_pagamento: 'previsto' | 'realizado' | 'vencido';
  frequencia_cobranca?: 'unico' | 'recorrente';
}

interface KanbanColuna {
  id: string;
  empresa_id?: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj_cpf: string;
  classificacao_despesa_padrao?: string;
  descricao_despesa_padrao?: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
  ativo: boolean;
}

interface ContaBancaria {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  descricao: string;
  ativo: boolean;
}

interface PlanoDespesa {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativo: boolean;
}

const STATUS_PAGAMENTO = [
  { value: 'previsto', label: 'Previsto', cor: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'realizado', label: 'Pago', cor: 'bg-success/10 text-success border-success/20' },
  { value: 'vencido', label: 'Vencido', cor: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const TIPOS_DESPESA = [
  { value: 'deducoes_sobre_vendas', label: 'Deduções sobre Vendas' },
  { value: 'custo_servico_prestado', label: 'Custo de Serviço Prestado' },
  { value: 'despesas_administrativas', label: 'Despesas Administrativas' },
  { value: 'despesas_estrutura', label: 'Despesas com Estrutura' },
  { value: 'despesas_pessoal', label: 'Despesas com Pessoal' },
  { value: 'despesas_comerciais', label: 'Despesas Comerciais' },
  { value: 'despesas_financeiras', label: 'Despesas Financeiras' },
  { value: 'despesas_nao_operacional', label: 'Despesas Não Operacional' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'participacao_dividendos', label: 'Participação e Dividendos' },
];

const CORES_COLUNAS = [
  { key: 'yellow', value: '#eab308' },
  { key: 'orange', value: '#f97316' },
  { key: 'red', value: '#ef4444' },
  { key: 'green', value: '#22c55e' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'purple', value: '#a855f7' },
  { key: 'pink', value: '#ec4899' },
  { key: 'cyan', value: '#06b6d4' },
  { key: 'indigo', value: '#6366f1' },
  { key: 'slate', value: '#64748b' },
];

const colunasIniciais: KanbanColuna[] = [
  { id: 'col-1', nome: 'Nova conta a pagar', cor: '#8b5cf6', ordem: 0 },
  { id: 'col-2', nome: 'Pagamentos Recorrentes', cor: '#6366f1', ordem: 1 },
  { id: 'col-3', nome: 'Contas A Vencer', cor: '#f59e0b', ordem: 2 },
  { id: 'col-4', nome: 'Contas a vencer na próxima semana', cor: '#3b82f6', ordem: 3 },
  { id: 'col-5', nome: 'Contas a vencer amanhã', cor: '#06b6d4', ordem: 4 },
  { id: 'col-6', nome: 'Contas a vencer hoje', cor: '#f97316', ordem: 5 },
  { id: 'col-7', nome: 'Vencidos', cor: '#ef4444', ordem: 6 },
  { id: 'col-8', nome: 'Pagos', cor: '#22c55e', ordem: 7 },
];

const COLUNAS_PADRAO = [
  'Nova conta a pagar',
  'Pagamentos Recorrentes',
  'Contas A Vencer',
  'Contas a vencer na próxima semana',
  'Contas a vencer amanhã',
  'Contas a vencer hoje',
  'Vencidos',
  'Pagos',
];

function SortableCard({ conta, onEdit, onDelete, onView, onStatusChange }: { 
  conta: ContaPagar; 
  onEdit: () => void; 
  onDelete: () => void; 
  onView: () => void; 
  onStatusChange: (status: 'previsto' | 'realizado' | 'vencido') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: conta.id, data: { type: 'card', conta } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms ease', opacity: isDragging ? 0.5 : 1 };
  const diasVencimento = Math.ceil((new Date(conta.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isVencido = diasVencimento < 0;
  const statusAtual = STATUS_PAGAMENTO.find(s => s.value === conta.status_pagamento) || STATUS_PAGAMENTO[0];
  const isRecorrente = conta.frequencia_cobranca === 'recorrente';

  return (
    <div ref={setNodeRef} style={style} className="relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group border-border hover:border-primary/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{conta.numero}</Badge>
            {conta.categoria && <Badge variant="secondary" className="text-xs">{conta.categoria}</Badge>}
            <Badge className={`text-xs border ${statusAtual.cor}`}>{statusAtual.label}</Badge>
            {isRecorrente && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors">
                    <RefreshCw className="h-3 w-3" />
                    <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p>Este é um pagamento recorrente. Todo dia 1 de cada mês, um novo card correspondente à cobrança do mês será exibido na coluna <strong>Pagamentos Recorrentes</strong>.</p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">{conta.fornecedor_nome}</h4>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{conta.descricao}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-destructive">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {conta.valor_pago > 0 && conta.valor_pago < conta.valor && (
              <span className="text-xs text-muted-foreground">Pago: R$ {conta.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</span>
            </div>
            {conta.valor_pago < conta.valor && (
              <Badge variant={isVencido ? 'destructive' : diasVencimento <= 7 ? 'secondary' : 'outline'} className="text-xs">
                {isVencido ? `${Math.abs(diasVencimento)}d atraso` : diasVencimento === 0 ? 'Hoje' : `${diasVencimento}d`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">{conta.forma_pagamento || 'Não definido'}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}><Eye className="h-4 w-4 mr-2" />Visualizar</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <div className="flex flex-col gap-1">
                {STATUS_PAGAMENTO.map(status => (
                  <DropdownMenuItem 
                    key={status.value} 
                    onClick={(e) => { e.stopPropagation(); onStatusChange(status.value as 'previsto' | 'realizado' | 'vencido'); }}
                    className={conta.status_pagamento === status.value ? 'bg-accent' : ''}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${status.value === 'previsto' ? 'bg-primary' : status.value === 'realizado' ? 'bg-success' : 'bg-destructive'}`} />
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SortableColumn({ coluna, cards, onEditCard, onDeleteCard, onViewCard, onStatusChange, onEditColumn, onDeleteColumn, podeExcluirColuna }: { 
  coluna: KanbanColuna; 
  cards: ContaPagar[]; 
  onEditCard: (card: ContaPagar) => void; 
  onDeleteCard: (id: string) => void; 
  onViewCard: (card: ContaPagar) => void; 
  onStatusChange: (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => void; 
  onEditColumn: (coluna: KanbanColuna) => void; 
  onDeleteColumn: (id: string) => void;
  podeExcluirColuna?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: coluna.id, data: { type: 'column', coluna } });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `droppable-${coluna.id}`, data: { type: 'column', coluna } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms ease', opacity: isDragging ? 0.5 : 1 };
  const total = cards.reduce((sum, c) => sum + c.valor, 0);
  const isColunaPersonalizada = !COLUNAS_PADRAO.includes(coluna.nome);

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
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0 opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onEditColumn(coluna)}><Edit className="h-4 w-4 mr-2" />Editar Coluna</DropdownMenuItem>
              {isColunaPersonalizada && podeExcluirColuna && (
                <DropdownMenuItem onClick={() => onDeleteColumn(coluna.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Excluir Coluna
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-sm mt-1 text-muted-foreground">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      </div>
      <div ref={setDroppableRef} className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors ${isOver ? 'bg-primary/5' : ''}`} style={{ maxHeight: 'calc(100vh - 350px)' }}>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard 
              key={card.id} 
              conta={card} 
              onEdit={() => onEditCard(card)} 
              onDelete={() => onDeleteCard(card.id)} 
              onView={() => onViewCard(card)} 
              onStatusChange={(status) => onStatusChange(card.id, status)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className={`text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
            <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>Arraste contas para cá</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SSTContasPagar() {
  const { toast } = useToast();
  const { profile, empresa } = useAuth();
  const { empresaIdEfetivo } = useEmpresaEfetiva();
  const empresaId = empresaIdEfetivo || empresa?.id;

  const [colunas, setColunas] = useState<KanbanColuna[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<ContaPagar | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planosDespesa, setPlanosDespesa] = useState<PlanoDespesa[]>([]);
  
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [colunaDialogOpen, setColunaDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContaPagar | null>(null);
  const [editingColuna, setEditingColuna] = useState<KanbanColuna | null>(null);
  const [viewingCard, setViewingCard] = useState<ContaPagar | null>(null);
  const [selectedColunaId, setSelectedColunaId] = useState<string | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'coluna' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  const [fornecedorSearch, setFornecedorSearch] = useState('');

  // Estados para Dialog de Atividade
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState({
    tipo: 'tarefa',
    descricao: '',
    prazo: '',
    horario: '',
  });
  
  // Estados para atividades e movimentações
  interface AtividadeAnexo {
    id: string;
    atividade_id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url: string;
    storage_path: string;
    created_at: string;
  }

  interface Atividade {
    id: string;
    conta_id: string;
    tipo: string;
    descricao: string;
    prazo: string | null;
    horario: string | null;
    status: 'a_realizar' | 'programada' | 'pendente' | 'concluida';
    created_at: string;
    usuario_id: string | null;
    usuario?: { nome: string } | null;
    anexos?: AtividadeAnexo[];
  }
  
  interface Movimentacao {
    id: string;
    conta_id: string;
    tipo: string;
    descricao: string;
    coluna_origem_id: string | null;
    coluna_destino_id: string | null;
    created_at: string;
    usuario_id: string | null;
    usuario?: { nome: string } | null;
  }
  
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  
  // Checklist items para atividade tipo checklist
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [novoChecklistItem, setNovoChecklistItem] = useState('');
  
  // Estado legado para compatibilidade
  const [atividadeForm, setAtividadeForm] = useState({
    tipo: 'tarefa',
    descricao: '',
    data: '',
    horario: '',
  });

  // Estados para modelos de atividade
  const [modelosDialogOpen, setModelosDialogOpen] = useState(false);
  const [modelos, setModelos] = useState<{ id: string; nome: string; descricao: string }[]>([]);
  const [novoModelo, setNovoModelo] = useState({ nome: '', descricao: '' });
  const [criarModeloMode, setCriarModeloMode] = useState(false);

  // Estados para anexos de atividade
  const [atividadeAnexos, setAtividadeAnexos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para programar pagamento
  const [programarPagamentoDialogOpen, setProgramarPagamentoDialogOpen] = useState(false);
  const [dataProgramada, setDataProgramada] = useState<Date | undefined>(undefined);
  const [salvandoProgramacao, setSalvandoProgramacao] = useState(false);

  const TIPOS_ATIVIDADE = [
    { id: 'tarefa', label: 'Tarefa', icon: FileText, cor: 'bg-muted text-muted-foreground' },
    { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-primary/10 text-primary' },
    { id: 'ligacao', label: 'Ligação', icon: Phone, cor: 'bg-success/10 text-success' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-success/10 text-success' },
    { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-secondary/10 text-secondary-foreground' },
    { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-warning/10 text-warning' },
    { id: 'checklist', label: 'Checklist', icon: ListChecks, cor: 'bg-warning/10 text-warning' },
    { id: 'nota', label: 'Nota', icon: FileText, cor: 'bg-muted text-muted-foreground' },
  ];

  const [cardForm, setCardForm] = useState({
    fornecedor_id: '',
    fornecedor_nome: '',
    fornecedor_cnpj: '',
    descricao: '',
    descricao_id: '',
    valor: 0,
    valor_pago: 0,
    data_competencia: '',
    data_vencimento: '',
    forma_pagamento_id: '',
    forma_pagamento: '',
    categoria_tipo: '',
    categoria: '',
    conta_financeira_id: '',
    conta_financeira: '',
    frequencia_cobranca: 'unico',
    tipo_valor_recorrente: '',
    observacoes: '',
  });
  const [colunaForm, setColunaForm] = useState({ nome: '', cor: '#6366f1' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { 
    if (empresaId) { 
      loadData(); 
    } 
  }, [empresaId]);

  // Carregar modelos quando o dialog de modelos abrir
  useEffect(() => {
    if (modelosDialogOpen && empresaId) {
      const fetchModelos = async () => {
        try {
          const { data, error } = await (supabase as any)
            .from('modelos_atividade')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nome');
          
          if (error) throw error;
          setModelos(data || []);
        } catch (error) {
          console.error('Erro ao carregar modelos:', error);
        }
      };
      fetchModelos();
    }
  }, [modelosDialogOpen, empresaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar colunas
      const { data: colunasData, error: colunasError } = await (supabase as any)
        .from('contas_pagar_colunas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem');

      if (colunasError) throw colunasError;

      if (colunasData && colunasData.length > 0) {
        setColunas(colunasData);
      } else {
        // Criar colunas iniciais - remover id para deixar o banco gerar
        const colunasParaCriar = colunasIniciais.map(({ id, ...rest }) => ({
          ...rest,
          empresa_id: empresaId,
        }));
        
        const { data: novasColunas, error: createError } = await (supabase as any)
          .from('contas_pagar_colunas')
          .insert(colunasParaCriar)
          .select();

        if (createError) throw createError;
        setColunas(novasColunas || []);
      }

      // Carregar contas a pagar
      const { data: contasData, error: contasError } = await (supabase as any)
        .from('contas_pagar')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (contasError) throw contasError;
      setContas(contasData || []);

      // Carregar fornecedores
      const { data: fornecedoresData } = await (supabase as any)
        .from('fornecedores')
        .select('id, nome_fantasia, razao_social, cnpj_cpf, classificacao_despesa_padrao, descricao_despesa_padrao')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome_fantasia');
      setFornecedores(fornecedoresData || []);

      // Carregar formas de pagamento
      const { data: formasData } = await (supabase as any)
        .from('formas_pagamento')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setFormasPagamento(formasData || []);

      // Carregar contas bancárias
      const { data: contasData2 } = await (supabase as any)
        .from('contas_bancarias')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('banco');
      setContasBancarias(contasData2 || []);

      // Carregar planos de despesa
      const { data: planosData } = await (supabase as any)
        .from('plano_despesas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setPlanosDespesa(planosData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const gerarNumero = () => {
    const ano = new Date().getFullYear();
    const seq = String(contas.length + 1).padStart(3, '0');
    return `CP-${ano}-${seq}`;
  };

  const handleSaveCard = async () => {
    if (!cardForm.fornecedor_nome || !cardForm.valor || !cardForm.data_vencimento) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const colunaInicial = colunas.find(c => c.nome === 'Nova conta a pagar') || colunas[0];
      
      if (editingCard) {
        const { error } = await (supabase as any)
          .from('contas_pagar')
          .update({
            fornecedor_id: cardForm.fornecedor_id || null,
            fornecedor_nome: cardForm.fornecedor_nome,
            fornecedor_cnpj: cardForm.fornecedor_cnpj,
            descricao: cardForm.descricao,
            valor: cardForm.valor,
            valor_pago: cardForm.valor_pago,
            data_competencia: cardForm.data_competencia || null,
            data_vencimento: cardForm.data_vencimento,
            forma_pagamento_id: cardForm.forma_pagamento_id || null,
            forma_pagamento: cardForm.forma_pagamento,
            centro_custo_id: cardForm.descricao_id || null,
            categoria: cardForm.categoria,
            conta_financeira_id: cardForm.conta_financeira_id || null,
            conta_financeira: cardForm.conta_financeira,
            frequencia_cobranca: cardForm.frequencia_cobranca,
            tipo_valor_recorrente: cardForm.tipo_valor_recorrente || null,
            observacoes: cardForm.observacoes,
          })
          .eq('id', editingCard.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta atualizada com sucesso' });
      } else {
        const { error } = await (supabase as any)
          .from('contas_pagar')
          .insert({
            empresa_id: empresaId,
            numero: gerarNumero(),
            fornecedor_id: cardForm.fornecedor_id || null,
            fornecedor_nome: cardForm.fornecedor_nome,
            fornecedor_cnpj: cardForm.fornecedor_cnpj,
            descricao: cardForm.descricao,
            valor: cardForm.valor,
            valor_pago: 0,
            data_competencia: cardForm.data_competencia || null,
            data_vencimento: cardForm.data_vencimento,
            forma_pagamento_id: cardForm.forma_pagamento_id || null,
            forma_pagamento: cardForm.forma_pagamento,
            centro_custo_id: cardForm.descricao_id || null,
            categoria: cardForm.categoria,
            conta_financeira_id: cardForm.conta_financeira_id || null,
            conta_financeira: cardForm.conta_financeira,
            frequencia_cobranca: cardForm.frequencia_cobranca,
            tipo_valor_recorrente: cardForm.tipo_valor_recorrente || null,
            observacoes: cardForm.observacoes,
            coluna_id: selectedColunaId || colunaInicial?.id,
            status_pagamento: 'previsto',
            ordem: 0,
          });

        if (error) throw error;
        
        // Mensagem especial para pagamentos recorrentes
        if (cardForm.frequencia_cobranca === 'recorrente') {
          toast({ 
            title: 'Conta Recorrente Criada', 
            description: 'Todo dia 1 de cada mês, o card correspondente à cobrança do mês será exibido na coluna Pagamentos Recorrentes.',
            duration: 6000,
          });
        } else {
          toast({ title: 'Sucesso', description: 'Conta criada com sucesso' });
        }
      }

      setCardDialogOpen(false);
      resetCardForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar conta', variant: 'destructive' });
    }
  };

  const handleSaveColuna = async () => {
    if (!colunaForm.nome) {
      toast({ title: 'Erro', description: 'Informe o nome da coluna', variant: 'destructive' });
      return;
    }

    try {
      if (editingColuna) {
        const { error } = await (supabase as any)
          .from('contas_pagar_colunas')
          .update({ nome: colunaForm.nome, cor: colunaForm.cor })
          .eq('id', editingColuna.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna atualizada' });
      } else {
        const { error } = await (supabase as any)
          .from('contas_pagar_colunas')
          .insert({
            empresa_id: empresaId,
            nome: colunaForm.nome,
            cor: colunaForm.cor,
            ordem: colunas.length,
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna criada' });
      }

      setColunaDialogOpen(false);
      setColunaForm({ nome: '', cor: '#6366f1' });
      setEditingColuna(null);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar coluna:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar coluna', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return;

    try {
      if (deleteType === 'card') {
        const { error } = await (supabase as any)
          .from('contas_pagar')
          .delete()
          .eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conta excluída' });
      } else {
        const { error } = await (supabase as any)
          .from('contas_pagar_colunas')
          .delete()
          .eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Coluna excluída' });
      }

      setDeleteDialogOpen(false);
      setDeleteId(null);
      setDeleteType(null);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => {
    try {
      const updates: any = { status_pagamento: status };
      
      if (status === 'realizado') {
        const conta = contas.find(c => c.id === cardId);
        if (conta) {
          updates.valor_pago = conta.valor;
          updates.data_pagamento = format(new Date(), 'yyyy-MM-dd');
          const colunaPagos = colunas.find(c => c.nome === 'Pagos');
          if (colunaPagos) updates.coluna_id = colunaPagos.id;
        }
      }

      const { error } = await (supabase as any)
        .from('contas_pagar')
        .update(updates)
        .eq('id', cardId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const handleProgramarPagamento = async () => {
    if (!viewingCard || !dataProgramada) return;
    
    setSalvandoProgramacao(true);
    try {
      const { error } = await (supabase as any)
        .from('contas_pagar')
        .update({ 
          data_pagamento_programado: format(dataProgramada, 'yyyy-MM-dd')
        })
        .eq('id', viewingCard.id);

      if (error) throw error;
      
      toast({ 
        title: 'Pagamento programado', 
        description: `Pagamento programado para ${format(dataProgramada, 'dd/MM/yyyy', { locale: ptBR })}` 
      });
      
      setProgramarPagamentoDialogOpen(false);
      setDataProgramada(undefined);
      loadData();
    } catch (error) {
      console.error('Erro ao programar pagamento:', error);
      toast({ title: 'Erro', description: 'Erro ao programar pagamento', variant: 'destructive' });
    } finally {
      setSalvandoProgramacao(false);
    }
  };

  const resetCardForm = () => {
    setCardForm({
      fornecedor_id: '',
      fornecedor_nome: '',
      fornecedor_cnpj: '',
      descricao: '',
      descricao_id: '',
      valor: 0,
      valor_pago: 0,
      data_competencia: '',
      data_vencimento: '',
      forma_pagamento_id: '',
      forma_pagamento: '',
      categoria_tipo: '',
      categoria: '',
      conta_financeira_id: '',
      conta_financeira: '',
      frequencia_cobranca: 'unico',
      tipo_valor_recorrente: '',
      observacoes: '',
    });
    setEditingCard(null);
    setSelectedColunaId(null);
    setFornecedorSearch('');
  };

  // Funções para carregar atividades e movimentações
  const fetchAtividades = async (contaId: string) => {
    setLoadingAtividades(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .select('*')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Erro ao buscar atividades:', error.message);
        setAtividades([]);
        return;
      }

      // Buscar nomes dos usuários
      const usuarioIds = [...new Set((data || []).map((a: any) => a.usuario_id).filter(Boolean))] as string[];
      let usuariosMap: Record<string, { nome: string }> = {};
      
      if (usuarioIds.length > 0) {
        const { data: usuarios } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', usuarioIds);
        
        if (usuarios) {
          usuariosMap = usuarios.reduce((acc: any, u: any) => {
            acc[u.id] = { nome: u.nome };
            return acc;
          }, {});
        }
      }

      // Buscar anexos de todas as atividades
      const atividadeIds = (data || []).map((a: any) => a.id);
      let anexosMap: Record<string, any[]> = {};
      
      if (atividadeIds.length > 0) {
        const { data: anexos } = await (supabase as any)
          .from('contas_pagar_atividades_anexos')
          .select('*')
          .in('atividade_id', atividadeIds);
        
        if (anexos) {
          anexosMap = anexos.reduce((acc: any, anexo: any) => {
            if (!acc[anexo.atividade_id]) {
              acc[anexo.atividade_id] = [];
            }
            acc[anexo.atividade_id].push(anexo);
            return acc;
          }, {});
        }
      }

      const atividadesComUsuario = (data || []).map((atividade: any) => ({
        ...atividade,
        usuario: atividade.usuario_id ? usuariosMap[atividade.usuario_id] || null : null,
        anexos: anexosMap[atividade.id] || [],
      }));

      setAtividades(atividadesComUsuario);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      setAtividades([]);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const fetchMovimentacoes = async (contaId: string) => {
    setLoadingMovimentacoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contas_pagar_movimentacoes')
        .select('*')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Erro ao buscar movimentações:', error.message);
        setMovimentacoes([]);
        return;
      }

      // Buscar nomes dos usuários
      const usuarioIds = [...new Set((data || []).map((m: any) => m.usuario_id).filter(Boolean))] as string[];
      let usuariosMap: Record<string, { nome: string }> = {};
      
      if (usuarioIds.length > 0) {
        const { data: usuarios } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', usuarioIds);
        
        if (usuarios) {
          usuariosMap = usuarios.reduce((acc: any, u: any) => {
            acc[u.id] = { nome: u.nome };
            return acc;
          }, {});
        }
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

  // Função para abrir detalhes do card
  const handleViewCard = (card: ContaPagar) => {
    setViewingCard(card);
    setViewDialogOpen(true);
    setAtividadeFormExpanded(false);
    setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
    
    // Carregar dados em paralelo
    Promise.all([
      fetchAtividades(card.id),
      fetchMovimentacoes(card.id),
    ]);
  };

  // Função para adicionar atividade
  const handleAddAtividade = async () => {
    if (!viewingCard || !novaAtividade.descricao.trim()) {
      toast({ title: 'Erro', description: 'Preencha a descrição da atividade', variant: 'destructive' });
      return;
    }

    try {
      let descricaoFinal = novaAtividade.descricao;
      
      // Se for checklist, salvar os itens como JSON
      if (novaAtividade.tipo === 'checklist' && checklistItems.length > 0) {
        descricaoFinal = JSON.stringify({
          titulo: novaAtividade.descricao,
          itens: checklistItems.map(item => ({ texto: item, concluido: false }))
        });
      }

      const { error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .insert({
          conta_id: viewingCard.id,
          tipo: novaAtividade.tipo,
          descricao: descricaoFinal,
          prazo: novaAtividade.prazo || null,
          horario: novaAtividade.horario || null,
          status: novaAtividade.prazo ? 'programada' : 'a_realizar',
          usuario_id: profile?.id,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Atividade registrada com sucesso' });
      setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
      setChecklistItems([]);
      setNovoChecklistItem('');
      setAtividadeFormExpanded(false);
      await fetchAtividades(viewingCard.id);
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast({ title: 'Erro', description: 'Erro ao registrar atividade', variant: 'destructive' });
    }
  };

  // Função para atualizar status da atividade
  const handleUpdateAtividadeStatus = async (atividadeId: string, novoStatus: 'a_realizar' | 'programada' | 'pendente' | 'concluida') => {
    if (!viewingCard) return;

    try {
      const { error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.map(a => 
        a.id === atividadeId ? { ...a, status: novoStatus } : a
      ));

      toast({ 
        title: novoStatus === 'concluida' ? 'Atividade concluída!' : 'Status atualizado',
        description: novoStatus === 'concluida' ? 'Atividade marcada como concluída.' : 'Status da atividade atualizado.'
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Funções para checklist
  const handleAddChecklistItem = () => {
    if (novoChecklistItem.trim()) {
      setChecklistItems([...checklistItems, novoChecklistItem.trim()]);
      setNovoChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleToggleChecklistItem = async (atividadeId: string, itemIndex: number) => {
    const atividade = atividades.find(a => a.id === atividadeId);
    if (!atividade || atividade.tipo !== 'checklist') return;

    try {
      const checklistData = JSON.parse(atividade.descricao);
      checklistData.itens[itemIndex].concluido = !checklistData.itens[itemIndex].concluido;

      const { error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .update({ descricao: JSON.stringify(checklistData) })
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(prev => prev.map(a => 
        a.id === atividadeId ? { ...a, descricao: JSON.stringify(checklistData) } : a
      ));
    } catch (error) {
      console.error('Erro ao atualizar checklist:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.conta);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Reordenar colunas
    if (activeData?.type === 'column' && overData?.type === 'column') {
      if (active.id !== over.id) {
        const oldIndex = colunas.findIndex(c => c.id === active.id);
        const newIndex = colunas.findIndex(c => c.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newColunas = arrayMove(colunas, oldIndex, newIndex);
          setColunas(newColunas);
          
          // Salvar nova ordem no banco
          try {
            for (let i = 0; i < newColunas.length; i++) {
              await (supabase as any)
                .from('contas_pagar_colunas')
                .update({ ordem: i })
                .eq('id', newColunas[i].id);
            }
          } catch (error) {
            console.error('Erro ao salvar ordem das colunas:', error);
          }
        }
      }
      return;
    }

    // Mover cards entre colunas
    if (activeData?.type === 'card') {
      let targetColunaId: string | null = null;

      if (overData?.type === 'column') {
        targetColunaId = overData.coluna.id;
      } else if (over.id.toString().startsWith('droppable-')) {
        targetColunaId = over.id.toString().replace('droppable-', '');
      }

      if (targetColunaId && activeData.conta.coluna_id !== targetColunaId) {
        const colunaOrigem = colunas.find(c => c.id === activeData.conta.coluna_id);
        const colunaDestino = colunas.find(c => c.id === targetColunaId);
        
        try {
          // Atualizar coluna do card
          const { error } = await (supabase as any)
            .from('contas_pagar')
            .update({ coluna_id: targetColunaId })
            .eq('id', activeData.conta.id);

          if (error) throw error;
          
          // Registrar movimentação
          const { error: movError } = await (supabase as any)
            .from('contas_pagar_movimentacoes')
            .insert({
              conta_id: activeData.conta.id,
              tipo: 'mudanca_etapa',
              descricao: `Card movido de "${colunaOrigem?.nome || 'Desconhecida'}" para "${colunaDestino?.nome || 'Desconhecida'}"`,
              coluna_origem_id: activeData.conta.coluna_id,
              coluna_destino_id: targetColunaId,
              usuario_id: profile?.id
            });
          
          if (movError) {
            console.error('Erro ao registrar movimentação:', movError);
          }
          
          loadData();
        } catch (error) {
          console.error('Erro ao mover card:', error);
        }
      }
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchSearch = !searchTerm || 
      conta.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filterCategoria === 'all' || conta.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  const getCardsByColuna = (colunaId: string) => filteredContas.filter(c => c.coluna_id === colunaId);

  // Calcular totais
  const totalAPagar = contas.filter(c => c.status_pagamento !== 'realizado').reduce((sum, c) => sum + c.valor, 0);
  const totalPago = contas.filter(c => c.status_pagamento === 'realizado').reduce((sum, c) => sum + c.valor_pago, 0);
  const totalPendente = contas.filter(c => c.status_pagamento === 'previsto').reduce((sum, c) => sum + c.valor, 0);
  const totalVencido = contas.filter(c => c.status_pagamento === 'vencido').reduce((sum, c) => sum + c.valor, 0);

  const categoriasUnicas = [...new Set(contas.map(c => c.categoria).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas contas a pagar</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-xl font-bold">R$ {totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-xl font-bold">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-xl font-bold">R$ {totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e ações */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categoriasUnicas.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => { setColunaForm({ nome: '', cor: '#6366f1' }); setEditingColuna(null); setColunaDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Coluna
          </Button>
          <Button onClick={() => { resetCardForm(); setCardDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nova Conta
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 400px)' }}>
          <SortableContext items={colunas.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {colunas.map(coluna => (
              <SortableColumn
                key={coluna.id}
                coluna={coluna}
                cards={getCardsByColuna(coluna.id)}
                onEditCard={(card) => {
                  setEditingCard(card);
                  const planoSelecionado = planosDespesa.find(p => p.id === card.centro_custo_id);
                  setCardForm({
                    fornecedor_id: card.fornecedor_id || '',
                    fornecedor_nome: card.fornecedor_nome,
                    fornecedor_cnpj: card.fornecedor_cnpj,
                    descricao: card.descricao,
                    descricao_id: card.centro_custo_id || '',
                    valor: card.valor,
                    valor_pago: card.valor_pago,
                    data_competencia: card.data_competencia,
                    data_vencimento: card.data_vencimento,
                    forma_pagamento_id: card.forma_pagamento_id || '',
                    forma_pagamento: card.forma_pagamento,
                    categoria_tipo: planoSelecionado?.tipo || '',
                    categoria: card.categoria,
                    conta_financeira_id: card.conta_financeira_id || '',
                    conta_financeira: card.conta_financeira,
                    frequencia_cobranca: (card as any).frequencia_cobranca || 'unico',
                    tipo_valor_recorrente: (card as any).tipo_valor_recorrente || '',
                    observacoes: card.observacoes,
                  });
                  setCardDialogOpen(true);
                }}
                onDeleteCard={(id) => {
                  const conta = contas.find(c => c.id === id);
                  setDeleteId(id);
                  setDeleteType('card');
                  setDeleteName(conta?.numero || '');
                  setDeleteDialogOpen(true);
                }}
                onViewCard={(card) => handleViewCard(card)}
                onStatusChange={handleStatusChange}
                onEditColumn={(col) => { setEditingColuna(col); setColunaForm({ nome: col.nome, cor: col.cor }); setColunaDialogOpen(true); }}
                onDeleteColumn={(id) => {
                  const col = colunas.find(c => c.id === id);
                  setDeleteId(id);
                  setDeleteType('coluna');
                  setDeleteName(col?.nome || '');
                  setDeleteDialogOpen(true);
                }}
                podeExcluirColuna={getCardsByColuna(coluna.id).length === 0}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="bg-card rounded-lg border shadow-lg p-3 w-72 opacity-90">
              <Badge variant="outline" className="text-xs mb-1">{activeCard.numero}</Badge>
              <h4 className="font-medium text-sm">{activeCard.fornecedor_nome}</h4>
              <p className="text-lg font-bold text-destructive">R$ {activeCard.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog Nova/Editar Conta */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Fornecedor *</Label>
                <Select
                  value={cardForm.fornecedor_id}
                  onValueChange={(value) => {
                    const fornecedor = fornecedores.find(f => f.id === value);
                    if (fornecedor) {
                      // Buscar classificação e despesa padrão do fornecedor
                      const classificacaoPadrao = fornecedor.classificacao_despesa_padrao || '';
                      const descricaoPadrao = fornecedor.descricao_despesa_padrao || '';
                      const tipoLabel = TIPOS_DESPESA.find(t => t.value === classificacaoPadrao)?.label || '';
                      const planoEncontrado = planosDespesa.find(p => p.nome === descricaoPadrao && p.tipo === classificacaoPadrao);
                      
                      setCardForm({
                        ...cardForm,
                        fornecedor_id: value,
                        fornecedor_nome: fornecedor.nome_fantasia || fornecedor.razao_social || '',
                        fornecedor_cnpj: fornecedor.cnpj_cpf || '',
                        categoria_tipo: classificacaoPadrao,
                        categoria: tipoLabel,
                        descricao_id: planoEncontrado?.id || '',
                        descricao: descricaoPadrao,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia || f.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou digite o nome do fornecedor"
                  value={cardForm.fornecedor_nome}
                  onChange={(e) => setCardForm({ ...cardForm, fornecedor_nome: e.target.value, fornecedor_id: '' })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>CNPJ/CPF</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cardForm.fornecedor_cnpj}
                  onChange={(e) => setCardForm({ ...cardForm, fornecedor_cnpj: e.target.value })}
                  disabled={!!cardForm.fornecedor_id}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Classificação das Despesas *</Label>
                <Select
                  value={cardForm.categoria_tipo}
                  onValueChange={(value) => {
                    const tipoLabel = TIPOS_DESPESA.find(t => t.value === value)?.label || '';
                    setCardForm({
                      ...cardForm,
                      categoria_tipo: value,
                      categoria: tipoLabel,
                      descricao_id: '',
                      descricao: '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DESPESA.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Despesa *</Label>
                <Select
                  value={cardForm.descricao_id}
                  onValueChange={(value) => {
                    const plano = planosDespesa.find(p => p.id === value);
                    setCardForm({
                      ...cardForm,
                      descricao_id: value,
                      descricao: plano?.nome || '',
                    });
                  }}
                  disabled={!cardForm.categoria_tipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={cardForm.categoria_tipo ? "Selecione a despesa" : "Selecione a classificação primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {planosDespesa
                      .filter(p => p.tipo === cardForm.categoria_tipo)
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                placeholder="0"
                value={cardForm.valor || ''}
                onChange={(e) => setCardForm({ ...cardForm, valor: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Competência</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {cardForm.data_competencia ? format(new Date(cardForm.data_competencia + 'T00:00:00'), 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={cardForm.data_competencia ? new Date(cardForm.data_competencia + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dataCompetencia = format(date, 'yyyy-MM-dd');
                          // Calcular data de vencimento (30 dias após a competência)
                          const dataVencimento = new Date(date);
                          dataVencimento.setDate(dataVencimento.getDate() + 30);
                          setCardForm({ 
                            ...cardForm, 
                            data_competencia: dataCompetencia,
                            data_vencimento: format(dataVencimento, 'yyyy-MM-dd')
                          });
                        } else {
                          setCardForm({ ...cardForm, data_competencia: '' });
                        }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Data de Vencimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {cardForm.data_vencimento ? format(new Date(cardForm.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={cardForm.data_vencimento ? new Date(cardForm.data_vencimento + 'T00:00:00') : undefined}
                      onSelect={(date) => setCardForm({ ...cardForm, data_vencimento: date ? format(date, 'yyyy-MM-dd') : '' })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={cardForm.forma_pagamento_id}
                onValueChange={(value) => {
                  const forma = formasPagamento.find(f => f.id === value);
                  setCardForm({
                    ...cardForm,
                    forma_pagamento_id: value,
                    forma_pagamento: forma?.nome || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Financeira</Label>
              <Select
                value={cardForm.conta_financeira_id}
                onValueChange={(value) => {
                  const conta = contasBancarias.find(c => c.id === value);
                  setCardForm({
                    ...cardForm,
                    conta_financeira_id: value,
                    conta_financeira: conta ? `${conta.banco} - ${conta.conta}` : '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequência de Cobrança</Label>
                <Select
                  value={cardForm.frequencia_cobranca}
                  onValueChange={(value) => {
                    setCardForm({
                      ...cardForm,
                      frequencia_cobranca: value,
                      tipo_valor_recorrente: value === 'unico' ? '' : cardForm.tipo_valor_recorrente,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Pagamento Único</SelectItem>
                    <SelectItem value="recorrente">Pagamento Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cardForm.frequencia_cobranca === 'recorrente' && (
                <div>
                  <Label>Tipo de Valor</Label>
                  <Select
                    value={cardForm.tipo_valor_recorrente}
                    onValueChange={(value) => setCardForm({ ...cardForm, tipo_valor_recorrente: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Valor Fixo</SelectItem>
                      <SelectItem value="variavel">Valor Variável (por utilização)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais"
                value={cardForm.observacoes}
                onChange={(e) => setCardForm({ ...cardForm, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCard}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova/Editar Coluna */}
      <Dialog open={colunaDialogOpen} onOpenChange={setColunaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColuna ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Coluna</Label>
              <Input
                value={colunaForm.nome}
                onChange={(e) => setColunaForm({ ...colunaForm, nome: e.target.value })}
                placeholder="Nome da coluna"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CORES_COLUNAS.map(cor => (
                  <button
                    key={cor.key}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${colunaForm.cor === cor.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: cor.value }}
                    onClick={() => setColunaForm({ ...colunaForm, cor: cor.value })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColunaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveColuna}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <VisuallyHidden>
            <DialogTitle>Detalhes da Conta a Pagar</DialogTitle>
            <DialogDescription>Visualização detalhada da conta a pagar</DialogDescription>
          </VisuallyHidden>
          {viewingCard && (
            <>
              {/* Header do Dialog */}
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingCard.fornecedor_nome}
                    </DialogTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {viewingCard.fornecedor_cnpj || 'CNPJ não informado'}
                      </span>
                      <Badge variant="outline">{viewingCard.numero}</Badge>
                      {viewingCard.categoria && (
                        <Badge variant="secondary" className="text-xs">
                          {viewingCard.categoria}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setViewDialogOpen(false);
                        setEditingCard(viewingCard);
                        const planoSelecionado = planosDespesa.find(p => p.id === viewingCard.centro_custo_id);
                        setCardForm({
                          fornecedor_id: viewingCard.fornecedor_id || '',
                          fornecedor_nome: viewingCard.fornecedor_nome,
                          fornecedor_cnpj: viewingCard.fornecedor_cnpj,
                          descricao: viewingCard.descricao,
                          descricao_id: viewingCard.centro_custo_id || '',
                          valor: viewingCard.valor,
                          valor_pago: viewingCard.valor_pago,
                          data_competencia: viewingCard.data_competencia,
                          data_vencimento: viewingCard.data_vencimento,
                          forma_pagamento_id: viewingCard.forma_pagamento_id || '',
                          forma_pagamento: viewingCard.forma_pagamento,
                          categoria_tipo: planoSelecionado?.tipo || '',
                          categoria: viewingCard.categoria,
                          conta_financeira_id: viewingCard.conta_financeira_id || '',
                          conta_financeira: viewingCard.conta_financeira,
                          frequencia_cobranca: viewingCard.frequencia_cobranca || 'unico',
                          tipo_valor_recorrente: (viewingCard as any).tipo_valor_recorrente || '',
                          observacoes: viewingCard.observacoes,
                        });
                        setCardDialogOpen(true);
                      }}
                      title="Editar Conta"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Navegação por etapas/colunas */}
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
                  {colunas.map((col) => (
                    <Button
                      key={col.id}
                      variant={viewingCard.coluna_id === col.id ? 'default' : 'outline'}
                      size="sm"
                      className="flex-shrink-0 text-xs"
                      style={viewingCard.coluna_id === col.id ? { backgroundColor: col.cor } : {}}
                      onClick={async () => {
                        if (viewingCard.coluna_id !== col.id) {
                          try {
                            await (supabase as any)
                              .from('contas_pagar')
                              .update({ coluna_id: col.id })
                              .eq('id', viewingCard.id);
                            loadData();
                            setViewingCard({ ...viewingCard, coluna_id: col.id });
                          } catch (error) {
                            console.error('Erro ao mover card:', error);
                          }
                        }
                      }}
                    >
                      {col.nome}
                    </Button>
                  ))}
                </div>
              </DialogHeader>
              
              {/* Conteúdo principal - Layout em 2 colunas */}
              <div className="flex flex-col lg:flex-row max-h-[calc(90vh-180px)]">
                {/* Coluna esquerda - Atividades e Históricos */}
                <ScrollArea className="flex-1 lg:w-2/3">
                  <div className="p-6 space-y-4">
                    {/* Histórico de Atividades */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico de Atividades
                      </h4>
                      
                      {/* Aviso para agendar próximo passo */}
                      {!loadingAtividades && !atividades.some(a => 
                        a.status === 'programada' || a.status === 'a_realizar' || a.status === 'pendente'
                      ) && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <CalendarIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                Que tal agendar um próximo passo?
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                                onClick={() => {
                                  setAtividadeForm({ tipo: 'tarefa', descricao: '', data: '', horario: '' });
                                  setAtividadeDialogOpen(true);
                                }}
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
                      ) : atividades.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                          <p>Nenhuma atividade registrada</p>
                          <p className="text-xs mt-1">Registre a primeira atividade acima</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {atividades.map((atividade) => {
                            const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[0];
                            const TipoIcon = tipoInfo.icon;
                            const isConcluida = atividade.status === 'concluida';
                            const statusColors: Record<string, string> = {
                              a_realizar: 'bg-warning/10 text-warning',
                              programada: 'bg-primary/10 text-primary',
                              pendente: 'bg-destructive/10 text-destructive',
                              concluida: 'bg-success/10 text-success',
                            };
                            const statusLabels: Record<string, string> = {
                              a_realizar: 'A ser realizada',
                              programada: 'Programada',
                              pendente: 'Pendente',
                              concluida: 'Concluída',
                            };
                            
                            const prazoDate = atividade.prazo ? new Date(atividade.prazo + 'T00:00:00') : null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isToday = prazoDate && prazoDate.toDateString() === today.toDateString();
                            const isPastDue = prazoDate && prazoDate < today && atividade.status !== 'concluida';
                            
                            // Verificar se é checklist
                            let checklistData = null;
                            if (atividade.tipo === 'checklist') {
                              try {
                                checklistData = JSON.parse(atividade.descricao);
                              } catch (e) {
                                checklistData = null;
                              }
                            }
                            
                            return (
                              <div key={atividade.id} className={`border rounded-lg p-3 bg-card ${isConcluida ? 'opacity-60' : ''} ${isToday ? 'border-warning border-2 bg-warning/5' : isPastDue ? 'border-destructive border-2 bg-destructive/5' : 'border-border'}`}>
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col items-center gap-2">
                                    <Checkbox
                                      checked={isConcluida}
                                      onCheckedChange={(checked) => {
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
                                        <span className={`font-medium text-sm ${isConcluida ? 'line-through' : ''}`}>{tipoInfo.label}</span>
                                        <Badge className={`text-xs ${statusColors[atividade.status || 'a_realizar']}`}>
                                          {statusLabels[atividade.status || 'a_realizar']}
                                        </Badge>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(atividade.created_at), 'dd/MM/yyyy, HH:mm')}
                                      </span>
                                    </div>
                                    
                                    {/* Conteúdo da atividade */}
                                    {checklistData ? (
                                      <div className="mt-2">
                                        <p className={`text-sm text-muted-foreground ${isConcluida ? 'line-through' : ''}`}>
                                          {checklistData.titulo}
                                        </p>
                                        <div className="mt-2 space-y-1">
                                          {checklistData.itens?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2">
                                              <Checkbox
                                                checked={item.concluido}
                                                onCheckedChange={() => handleToggleChecklistItem(atividade.id, idx)}
                                                className="h-4 w-4"
                                              />
                                              <span className={`text-sm ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                                                {item.texto}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isConcluida ? 'line-through' : ''}`}>
                                        {atividade.descricao}
                                      </p>
                                    )}
                                    
                                    {(atividade.prazo || atividade.horario) && (
                                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                        {atividade.prazo && (
                                          <span className="flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            {format(new Date(atividade.prazo + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
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

                                    {/* Anexos da atividade */}
                                    {atividade.anexos && atividade.anexos.length > 0 && (
                                      <div className="mt-3 pt-2 border-t border-dashed">
                                        <div className="flex flex-wrap gap-2">
                                          {atividade.anexos.map((anexo: any) => {
                                            const isImage = anexo.tipo_arquivo?.startsWith('image/');
                                            return (
                                              <button
                                                key={anexo.id}
                                                onClick={() => window.open(anexo.url, '_blank')}
                                                className="flex items-center gap-2 px-2 py-1.5 bg-warning/5 hover:bg-warning/10 border border-warning/20 rounded-md text-xs text-warning transition-colors"
                                              >
                                                <Paperclip className="h-3 w-3" />
                                                <span className="max-w-[150px] truncate">{anexo.nome_arquivo}</span>
                                                <ExternalLink className="h-3 w-3 opacity-60" />
                                              </button>
                                            );
                                          })}
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
                    
                    {/* Histórico de Movimentações do Card */}
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Histórico de Movimentações do Card
                      </h4>
                      
                      {loadingMovimentacoes ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : movimentacoes.length === 0 ? (
                        <div className="relative">
                          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                          <div className="space-y-3">
                            <div className="relative flex gap-3 pl-1">
                              <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-teal-100 text-teal-700">
                                <Plus className="h-3 w-3" />
                              </div>
                              <div className="flex-1 min-w-0 pb-3">
                                <p className="text-sm">Card criado em "{colunas.find(c => c.id === viewingCard.coluna_id)?.nome || 'Nova conta a pagar'}"</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {colunas.find(c => c.id === viewingCard.coluna_id)?.nome}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(viewingCard.created_at), 'dd/MM/yyyy, HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                          <div className="space-y-3">
                            {movimentacoes.map((mov) => {
                              const colunaOrigem = colunas.find(c => c.id === mov.coluna_origem_id);
                              const colunaDestino = colunas.find(c => c.id === mov.coluna_destino_id);
                              
                              return (
                                <div key={mov.id} className="relative flex gap-3 pl-1">
                                  <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    mov.tipo === 'criacao' ? 'bg-teal-100 text-teal-700' :
                                    mov.tipo === 'mudanca_coluna' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {mov.tipo === 'criacao' && <Plus className="h-3 w-3" />}
                                    {mov.tipo === 'mudanca_coluna' && <ArrowRightLeft className="h-3 w-3" />}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 pb-3">
                                    <p className="text-sm">{mov.descricao}</p>
                                    
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
                                    
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span>
                                        {format(new Date(mov.created_at), 'dd/MM/yyyy, HH:mm')}
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
                </ScrollArea>
                
                {/* Coluna direita - Ações Rápidas e Dados (sticky) */}
                <div className="lg:w-80 flex-shrink-0 border-l bg-muted/30 overflow-y-auto max-h-full">
                  <div className="p-4 space-y-4 sticky top-0">
                    {/* Ações Rápidas */}
                    <div className="rounded-lg border bg-card p-4">
                      <h4 className="font-semibold text-sm mb-3">Ações Rápidas</h4>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start gap-2 text-warning hover:text-warning/80 border-warning/20 hover:border-warning/30 hover:bg-warning/5" 
                          onClick={() => {
                            setAtividadeForm({ tipo: 'tarefa', descricao: '', data: '', horario: '' });
                            setAtividadeDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" /> Nova Atividade
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start gap-2" 
                          onClick={() => {
                            setViewDialogOpen(false);
                            setEditingCard(viewingCard);
                            const planoSelecionado = planosDespesa.find(p => p.id === viewingCard.centro_custo_id);
                            setCardForm({
                              fornecedor_id: viewingCard.fornecedor_id || '',
                              fornecedor_nome: viewingCard.fornecedor_nome,
                              fornecedor_cnpj: viewingCard.fornecedor_cnpj,
                              descricao: viewingCard.descricao,
                              descricao_id: viewingCard.centro_custo_id || '',
                              valor: viewingCard.valor,
                              valor_pago: viewingCard.valor_pago,
                              data_competencia: viewingCard.data_competencia,
                              data_vencimento: viewingCard.data_vencimento,
                              forma_pagamento_id: viewingCard.forma_pagamento_id || '',
                              forma_pagamento: viewingCard.forma_pagamento,
                              categoria_tipo: planoSelecionado?.tipo || '',
                              categoria: viewingCard.categoria,
                              conta_financeira_id: viewingCard.conta_financeira_id || '',
                              conta_financeira: viewingCard.conta_financeira,
                              frequencia_cobranca: viewingCard.frequencia_cobranca || 'unico',
                              tipo_valor_recorrente: (viewingCard as any).tipo_valor_recorrente || '',
                              observacoes: viewingCard.observacoes,
                            });
                            setCardDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" /> Editar Conta
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start gap-2 text-success hover:text-success/80" 
                          onClick={() => handleStatusChange(viewingCard.id, 'realizado')}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Registrar Pagamento
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full justify-start gap-2 text-primary hover:text-primary/80"
                          onClick={() => {
                            setDataProgramada(viewingCard.data_vencimento ? new Date(viewingCard.data_vencimento + 'T00:00:00') : undefined);
                            setProgramarPagamentoDialogOpen(true);
                          }}
                        >
                          <CalendarClock className="h-4 w-4" /> Programar Pagamento
                        </Button>
                      </div>
                    </div>
                    
                    {/* Valor a Pagar */}
                    <div className="rounded-lg border bg-card p-4">
                      <h4 className="font-medium text-sm">Valor a Pagar</h4>
                      <p className="text-2xl font-bold text-warning mt-2">
                        R$ {(viewingCard.valor - viewingCard.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {viewingCard.valor_pago > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Já pago: R$ {viewingCard.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    
                    {/* Dados do Favorecido */}
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">Dados do Favorecido</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setViewDialogOpen(false);
                            setEditingCard(viewingCard);
                            const planoSelecionado = planosDespesa.find(p => p.id === viewingCard.centro_custo_id);
                            setCardForm({
                              fornecedor_id: viewingCard.fornecedor_id || '',
                              fornecedor_nome: viewingCard.fornecedor_nome,
                              fornecedor_cnpj: viewingCard.fornecedor_cnpj,
                              descricao: viewingCard.descricao,
                              descricao_id: viewingCard.centro_custo_id || '',
                              valor: viewingCard.valor,
                              valor_pago: viewingCard.valor_pago,
                              data_competencia: viewingCard.data_competencia,
                              data_vencimento: viewingCard.data_vencimento,
                              forma_pagamento_id: viewingCard.forma_pagamento_id || '',
                              forma_pagamento: viewingCard.forma_pagamento,
                              categoria_tipo: planoSelecionado?.tipo || '',
                              categoria: viewingCard.categoria,
                              conta_financeira_id: viewingCard.conta_financeira_id || '',
                              conta_financeira: viewingCard.conta_financeira,
                              frequencia_cobranca: viewingCard.frequencia_cobranca || 'unico',
                              tipo_valor_recorrente: (viewingCard as any).tipo_valor_recorrente || '',
                              observacoes: viewingCard.observacoes,
                            });
                            setCardDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Fornecedor</p>
                          <p className="font-medium">{viewingCard.fornecedor_nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CNPJ/CPF</p>
                          <p className="font-medium">{viewingCard.fornecedor_cnpj || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data de Vencimento</p>
                          <p className="font-medium">{format(new Date(viewingCard.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                          <p className="font-medium">{viewingCard.forma_pagamento || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Categoria</p>
                          <p className="font-medium">{viewingCard.categoria || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Conta Financeira</p>
                          <p className="font-medium">{viewingCard.conta_financeira || 'Não informado'}</p>
                        </div>
                        {viewingCard.descricao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Descrição</p>
                            <p className="font-medium">{viewingCard.descricao}</p>
                          </div>
                        )}
                        {viewingCard.observacoes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <p className="font-medium">{viewingCard.observacoes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Atividade */}
      <Dialog open={atividadeDialogOpen} onOpenChange={setAtividadeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-warning" />
              Nova Tarefa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Botões de Tipo de Atividade */}
            <div className="flex flex-wrap gap-2">
              {TIPOS_ATIVIDADE.filter(t => t.id !== 'checklist').map((tipo) => (
                <Button
                  key={tipo.id}
                  variant={atividadeForm.tipo === tipo.id ? 'default' : 'outline'}
                  size="sm"
                  className={`text-sm ${atividadeForm.tipo === tipo.id ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                  onClick={() => setAtividadeForm({ ...atividadeForm, tipo: tipo.id })}
                >
                  <tipo.icon className="h-4 w-4 mr-1" />
                  {tipo.label}
                </Button>
              ))}
            </div>

            {/* Descrição */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Descrição</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => setModelosDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Modelo
                </Button>
              </div>
              <Textarea
                value={atividadeForm.descricao}
                onChange={(e) => setAtividadeForm({ ...atividadeForm, descricao: e.target.value })}
                placeholder="O que foi feito e qual o próximo passo?"
                rows={4}
                className="mt-1.5"
              />
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1.5">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {atividadeForm.data ? format(new Date(atividadeForm.data + 'T00:00:00'), 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={atividadeForm.data ? new Date(atividadeForm.data + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setAtividadeForm({ ...atividadeForm, data: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium">Horário</Label>
                <Select
                  value={atividadeForm.horario}
                  onValueChange={(value) => setAtividadeForm({ ...atividadeForm, horario: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 48 }, (_, i) => {
                      const hour = Math.floor(i / 2);
                      const minute = i % 2 === 0 ? '00' : '30';
                      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                      return (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Anexo */}
            <div>
              <Label className="text-sm font-medium text-orange-600">Anexo</Label>
              <div 
                className="mt-1.5 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setAtividadeAnexos(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
                {atividadeAnexos.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p>Clique para anexar arquivos ou imagens</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {atividadeAnexos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-orange-500" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAtividadeAnexos(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">Clique para adicionar mais</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAtividadeDialogOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={async () => {
                if (!viewingCard || !atividadeForm.descricao.trim()) {
                  toast({ 
                    title: 'Erro', 
                    description: 'Preencha a descrição da atividade',
                    variant: 'destructive'
                  });
                  return;
                }

                try {
                  // Inserir atividade
                  const { data: atividadeData, error } = await (supabase as any)
                    .from('contas_pagar_atividades')
                    .insert({
                      conta_id: viewingCard.id,
                      tipo: atividadeForm.tipo,
                      descricao: atividadeForm.descricao,
                      prazo: atividadeForm.data || null,
                      horario: atividadeForm.horario || null,
                      status: atividadeForm.data ? 'programada' : 'a_realizar',
                      usuario_id: profile?.id,
                    })
                    .select()
                    .single();

                  if (error) throw error;

                  // Upload dos anexos se houver
                  if (atividadeAnexos.length > 0 && atividadeData) {
                    for (const file of atividadeAnexos) {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${atividadeData.id}/${Date.now()}_${file.name}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('atividades-anexos')
                        .upload(fileName, file);

                      if (uploadError) {
                        console.error('Erro ao fazer upload:', uploadError);
                        continue;
                      }

                      const { data: urlData } = supabase.storage
                        .from('atividades-anexos')
                        .getPublicUrl(fileName);

                      // Salvar referência do anexo no banco
                      await (supabase as any)
                        .from('contas_pagar_atividades_anexos')
                        .insert({
                          atividade_id: atividadeData.id,
                          nome_arquivo: file.name,
                          tipo_arquivo: file.type,
                          tamanho: file.size,
                          url: urlData.publicUrl,
                          storage_path: fileName,
                        });
                    }
                  }

                  toast({ 
                    title: 'Atividade registrada', 
                    description: `${TIPOS_ATIVIDADE.find(t => t.id === atividadeForm.tipo)?.label || 'Atividade'} salva com sucesso.` 
                  });
                  
                  setAtividadeForm({ tipo: 'tarefa', descricao: '', data: '', horario: '' });
                  setAtividadeAnexos([]);
                  setAtividadeDialogOpen(false);
                  await fetchAtividades(viewingCard.id);
                } catch (error) {
                  console.error('Erro ao salvar atividade:', error);
                  toast({ 
                    title: 'Erro', 
                    description: 'Erro ao salvar atividade',
                    variant: 'destructive'
                  });
                }
              }}
            >
              Salvar Atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Modelos de Atividade */}
      <Dialog open={modelosDialogOpen} onOpenChange={setModelosDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookTemplate className="h-5 w-5 text-orange-500" />
              Modelos de Atividade
            </DialogTitle>
          </DialogHeader>
          
          {!criarModeloMode ? (
            <div className="space-y-4">
              {/* Lista de Modelos */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {modelos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookTemplate className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhum modelo criado</p>
                    <p className="text-xs">Crie um modelo para usar em suas atividades</p>
                  </div>
                ) : (
                  modelos.map((modelo) => (
                    <div 
                      key={modelo.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setAtividadeForm(prev => ({ ...prev, descricao: modelo.descricao }));
                        setModelosDialogOpen(false);
                      }}
                    >
                      <p className="font-medium text-sm">{modelo.nome}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{modelo.descricao}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Botão Criar Modelo */}
              <Button
                variant="outline"
                className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => setCriarModeloMode(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Modelo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Formulário de Criar Modelo */}
              <div>
                <Label className="text-sm font-medium">Nome do Modelo</Label>
                <Input
                  value={novoModelo.nome}
                  onChange={(e) => setNovoModelo(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Acompanhamento mensal"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Descrição do Modelo</Label>
                <Textarea
                  value={novoModelo.descricao}
                  onChange={(e) => setNovoModelo(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Texto que será usado como descrição da atividade"
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCriarModeloMode(false);
                    setNovoModelo({ nome: '', descricao: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={async () => {
                    if (!novoModelo.nome.trim() || !novoModelo.descricao.trim()) {
                      toast({
                        title: 'Erro',
                        description: 'Preencha o nome e a descrição do modelo',
                        variant: 'destructive'
                      });
                      return;
                    }

                    try {
                      const { data, error } = await (supabase as any)
                        .from('modelos_atividade')
                        .insert({
                          empresa_id: empresaId,
                          nome: novoModelo.nome,
                          descricao: novoModelo.descricao,
                        })
                        .select()
                        .single();

                      if (error) throw error;

                      setModelos(prev => [...prev, data]);
                      setNovoModelo({ nome: '', descricao: '' });
                      setCriarModeloMode(false);
                      toast({
                        title: 'Modelo criado',
                        description: 'Modelo de atividade criado com sucesso'
                      });
                    } catch (error) {
                      console.error('Erro ao criar modelo:', error);
                      toast({
                        title: 'Erro',
                        description: 'Erro ao criar modelo de atividade',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Modelo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Programar Pagamento */}
      <Dialog open={programarPagamentoDialogOpen} onOpenChange={setProgramarPagamentoDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              Programar Pagamento
            </DialogTitle>
            <DialogDescription>
              Selecione a data em que deseja realizar o pagamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="text-sm font-medium mb-2 block">Data do Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataProgramada ? format(dataProgramada, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dataProgramada}
                  onSelect={setDataProgramada}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {viewingCard && (
              <p className="text-xs text-muted-foreground mt-2">
                Vencimento original: {viewingCard.data_vencimento ? format(new Date(viewingCard.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramarPagamentoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProgramarPagamento}
              disabled={!dataProgramada || salvandoProgramacao}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {salvandoProgramacao ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Programar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteType === 'card' ? 'a conta' : 'a coluna'} "{deleteName}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
