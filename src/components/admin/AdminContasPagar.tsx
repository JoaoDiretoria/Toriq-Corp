import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, DollarSign, Calendar as CalendarIcon, MoreVertical, Trash2, Eye, GripVertical, Edit, Target, CreditCard, Building2, Clock, ArrowRightLeft, ArrowRight, Loader2, Pencil, ClipboardList, Mail, PhoneCall, MessageSquare, Video, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface ContaPagar {
  id: string;
  numero: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_emissao: string;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento: string;
  forma_pagamento_id: string;
  categoria: string;
  conta_financeira: string;
  conta_financeira_id: string;
  coluna_id: string;
  observacoes: string;
  ordem: number;
  created_at: string;
  status_pagamento?: 'previsto' | 'realizado' | 'vencido';
}

const STATUS_PAGAMENTO = [
  { value: 'previsto', label: 'Previsto', cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'realizado', label: 'Realizado', cor: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'vencido', label: 'Vencido', cor: 'bg-red-100 text-red-700 border-red-200' },
];

interface KanbanColuna {
  id: string;
  empresa_id?: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
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

interface Atividade {
  id: string;
  conta_id: string;
  tipo: string;
  descricao: string;
  prazo?: string;
  horario?: string;
  status: string;
  created_at: string;
  usuario?: { nome: string };
}

interface Movimentacao {
  id: string;
  conta_id: string;
  tipo: string;
  descricao: string;
  coluna_origem_id?: string;
  coluna_destino_id?: string;
  created_at: string;
  usuario?: { nome: string };
}

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: ClipboardList, cor: 'bg-blue-100 text-blue-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-purple-100 text-purple-700' },
  { id: 'ligacao', label: 'Ligação', icon: PhoneCall, cor: 'bg-green-100 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-orange-100 text-orange-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-red-100 text-red-700' },
  { id: 'nota', label: 'Nota', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
];

// Colunas padrão do sistema para Contas a Pagar
const COLUNAS_PADRAO = [
  { nome: 'Nova Conta a Pagar', cor: '#6366f1', ordem: 0, slug: 'nova' },
  { nome: 'A Vencer', cor: '#3b82f6', ordem: 1, slug: 'a_vencer' },
  { nome: 'Vence Próxima Semana', cor: '#eab308', ordem: 2, slug: 'proxima_semana' },
  { nome: 'Vence Amanhã', cor: '#f97316', ordem: 3, slug: 'amanha' },
  { nome: 'Vence Hoje', cor: '#ef4444', ordem: 4, slug: 'hoje' },
  { nome: 'Vencidos', cor: '#dc2626', ordem: 5, slug: 'vencidos' },
  { nome: 'Pagos', cor: '#22c55e', ordem: 6, slug: 'pagos' },
];

// Função para determinar a coluna correta baseada na data de vencimento
const determinarColunaAutomatica = (dataVencimento: string, isPago: boolean, colunas: KanbanColuna[]): string | null => {
  if (isPago) {
    const colunaPagos = colunas.find(c => c.nome.toLowerCase().includes('pago'));
    return colunaPagos?.id || null;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  // Vencido (passou da data)
  if (diffDias < 0) {
    const colunaVencidos = colunas.find(c => c.nome.toLowerCase().includes('vencido'));
    return colunaVencidos?.id || null;
  }
  
  // Vence hoje
  if (diffDias === 0) {
    const colunaHoje = colunas.find(c => c.nome.toLowerCase().includes('hoje'));
    return colunaHoje?.id || null;
  }
  
  // Vence amanhã
  if (diffDias === 1) {
    const colunaAmanha = colunas.find(c => c.nome.toLowerCase().includes('amanhã') || c.nome.toLowerCase().includes('amanha'));
    return colunaAmanha?.id || null;
  }
  
  // Vence na próxima semana (2 a 7 dias)
  if (diffDias >= 2 && diffDias <= 7) {
    const colunaProximaSemana = colunas.find(c => c.nome.toLowerCase().includes('próxima semana') || c.nome.toLowerCase().includes('proxima semana'));
    return colunaProximaSemana?.id || null;
  }
  
  // A vencer (mais de 7 dias)
  const colunaAVencer = colunas.find(c => c.nome.toLowerCase() === 'a vencer');
  return colunaAVencer?.id || null;
};

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

// Classificações de Despesas (baseado no plano_despesas)
const CLASSIFICACOES_DESPESA = [
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

// Componente SortableCard
function SortableCard({ conta, onEdit, onDelete, onView, onStatusChange }: { 
  conta: ContaPagar; 
  onEdit: () => void; 
  onDelete: () => void; 
  onView: () => void; 
  onStatusChange: (status: 'previsto' | 'realizado' | 'vencido') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: conta.id, 
    data: { type: 'card', conta } 
  });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition: transition || 'transform 200ms ease', 
    opacity: isDragging ? 0.5 : 1 
  };
  
  const diasVencimento = Math.ceil((new Date(conta.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isVencido = diasVencimento < 0;
  const statusAtual = STATUS_PAGAMENTO.find(s => s.value === conta.status_pagamento) || STATUS_PAGAMENTO[0];

  return (
    <div ref={setNodeRef} style={style} className="relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group border-border hover:border-primary/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{conta.numero}</Badge>
            {conta.categoria && <Badge variant="secondary" className="text-xs">{conta.categoria === 'despesas_administrativas' ? 'Administrativo' : conta.categoria === 'despesas_pessoal' ? 'Pessoal' : conta.categoria === 'despesas_estrutura' ? 'Estrutura' : conta.categoria === 'despesas_comerciais' ? 'Comercial' : conta.categoria === 'despesas_financeiras' ? 'Financeiro' : 'Outros'}</Badge>}
            <Badge className={`text-xs border ${statusAtual.cor}`}>{statusAtual.label}</Badge>
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
              <span>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</span>
            </div>
            {conta.valor_pago < conta.valor && (
              <Badge variant={isVencido ? 'destructive' : diasVencimento <= 7 ? 'secondary' : 'outline'} className="text-xs">
                {isVencido ? `${Math.abs(diasVencimento)}d atraso` : diasVencimento === 0 ? 'Hoje' : `${diasVencimento}d`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{conta.forma_pagamento || '-'}</span>
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
                    <div className={`w-2 h-2 rounded-full mr-2 ${status.value === 'previsto' ? 'bg-blue-500' : status.value === 'realizado' ? 'bg-green-500' : 'bg-red-500'}`} />
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

// Componente SortableColumn
function SortableColumn({ coluna, cards, onAddCard, onEditCard, onDeleteCard, onViewCard, onStatusChange, onEditColumn, onDeleteColumn }: { 
  coluna: KanbanColuna; 
  cards: ContaPagar[]; 
  onAddCard: (colunaId: string) => void; 
  onEditCard: (card: ContaPagar) => void; 
  onDeleteCard: (id: string) => void; 
  onViewCard: (card: ContaPagar) => void; 
  onStatusChange: (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => void;
  onEditColumn: (coluna: KanbanColuna) => void; 
  onDeleteColumn: (id: string) => void; 
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ 
    id: coluna.id, 
    data: { type: 'column', coluna } 
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ 
    id: `droppable-${coluna.id}`, 
    data: { type: 'column', coluna } 
  });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition: transition || 'transform 250ms ease', 
    opacity: isDragging ? 0.5 : 1 
  };
  
  const total = cards.reduce((sum, c) => sum + c.valor, 0);

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
              <DropdownMenuItem onClick={() => onAddCard(coluna.id)}><Plus className="h-4 w-4 mr-2" />Adicionar Conta</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditColumn(coluna)}><Edit className="h-4 w-4 mr-2" />Editar Coluna</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteColumn(coluna.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir Coluna</DropdownMenuItem>
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

// Componente Principal
export function AdminContasPagar() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { empresaIdEfetivo, isInEmpresaMode } = useEmpresaEfetiva();
  const empresaId = isInEmpresaMode ? empresaIdEfetivo : (profile?.role === 'admin_vertical' ? TORIQ_EMPRESA_ID : profile?.empresa_id);

  // Estados principais
  const [colunas, setColunas] = useState<KanbanColuna[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<ContaPagar | null>(null);
  const [activeColuna, setActiveColuna] = useState<KanbanColuna | null>(null);
  const [dragOriginColunaId, setDragOriginColunaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');

  // Dados auxiliares
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planosDespesa, setPlanosDespesa] = useState<PlanoDespesa[]>([]);

  // Estados dos dialogs
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [colunaDialogOpen, setColunaDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContaPagar | null>(null);
  const [editingColuna, setEditingColuna] = useState<KanbanColuna | null>(null);
  const [viewingCard, setViewingCard] = useState<ContaPagar | null>(null);
  const [selectedColunaId, setSelectedColunaId] = useState<string | null>(null);

  // Estados para exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'coluna' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  // Estados para o dialog de detalhes
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });

  // Estados para Programar Pagamento
  const [programarDialogOpen, setProgramarDialogOpen] = useState(false);
  const [programarDatas, setProgramarDatas] = useState<string[]>([]);
  const [programarLoading, setProgramarLoading] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<'mensal' | 'esporadico' | 'anual'>('esporadico');

  // Estado para edição do valor
  const [editandoValor, setEditandoValor] = useState(false);
  const [novoValor, setNovoValor] = useState('');

  // Estados para confirmação de pagamento
  const [confirmarPagamentoOpen, setConfirmarPagamentoOpen] = useState(false);
  const [dataPagamentoConfirmacao, setDataPagamentoConfirmacao] = useState('');
  const [cardParaPagar, setCardParaPagar] = useState<ContaPagar | null>(null);

  // Formulários
  const [cardForm, setCardForm] = useState({
    fornecedor_id: '',
    fornecedor_nome: '',
    fornecedor_cnpj: '',
    classificacao_despesa: '',
    descricao: '',
    valor: 0,
    data_competencia: '',
    data_vencimento: '',
    forma_pagamento_id: '',
    forma_pagamento: '',
    conta_financeira_id: '',
    conta_financeira: '',
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

  // Executar classificação automática quando colunas e contas forem carregadas
  useEffect(() => {
    if (colunas.length > 0 && contas.length > 0 && !loading) {
      classificarCardsAutomaticamente();
    }
  }, [colunas.length, contas.length, loading]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadColunas(),
      loadContas(),
      loadFornecedores(),
      loadFormasPagamento(),
      loadContasBancarias(),
      loadPlanosDespesa(),
    ]);
    setLoading(false);
  };

  const loadColunas = async () => {
    try {
      const { data, error } = await (supabase as any).from('contas_pagar_colunas').select('*').eq('empresa_id', empresaId).order('ordem');
      if (error) throw error;
      if (data && data.length > 0) {
        setColunas(data);
      } else {
        // Criar colunas padrão do sistema
        const colunasPadrao = COLUNAS_PADRAO.map(col => ({
          empresa_id: empresaId,
          nome: col.nome,
          cor: col.cor,
          ordem: col.ordem,
        }));
        const { data: novasColunas, error: insertError } = await (supabase as any).from('contas_pagar_colunas').insert(colunasPadrao).select();
        if (insertError) throw insertError;
        setColunas(novasColunas || []);
      }
    } catch (e) {
      console.error('Erro ao carregar colunas:', e);
      toast({ title: 'Erro ao carregar colunas. Verifique se a migration foi executada.', variant: 'destructive' });
      setColunas([]);
    }
  };

  const loadContas = async () => {
    try {
      const { data, error } = await (supabase as any).from('contas_pagar').select('*').eq('empresa_id', empresaId).eq('arquivado', false).order('ordem');
      if (error) throw error;
      setContas(data || []);
    } catch (e) {
      console.error('Erro ao carregar contas:', e);
      setContas([]);
    }
  };

  // Função para classificar automaticamente os cards nas colunas corretas
  const classificarCardsAutomaticamente = async () => {
    if (colunas.length === 0 || contas.length === 0) return;
    
    const colunaNova = colunas.find(c => c.nome.toLowerCase().includes('nova conta'));
    const colunaPagos = colunas.find(c => c.nome.toLowerCase().includes('pago'));
    const colunaAVencer = colunas.find(c => c.nome.toLowerCase() === 'a vencer');
    const colunaIds = colunas.map(c => c.id);
    
    const cardsParaAtualizar: { id: string; coluna_id: string; coluna_origem_id: string }[] = [];
    
    for (const conta of contas) {
      // Verificar se o card está em uma coluna válida (existente)
      const colunaExiste = colunaIds.includes(conta.coluna_id);
      
      // Se já está pago, deve ir para coluna Pagos
      const isPago = conta.valor_pago >= conta.valor && conta.valor > 0;
      
      // Se está pago e não está na coluna Pagos, mover
      if (isPago && colunaPagos && conta.coluna_id !== colunaPagos.id) {
        cardsParaAtualizar.push({
          id: conta.id,
          coluna_id: colunaPagos.id,
          coluna_origem_id: conta.coluna_id,
        });
        continue;
      }
      
      // Se está pago, não precisa verificar mais nada
      if (isPago) continue;
      
      // Se a coluna não existe mais, classificar baseado na data de vencimento
      if (!colunaExiste) {
        const colunaCorreta = determinarColunaAutomatica(conta.data_vencimento, false, colunas);
        if (colunaCorreta) {
          cardsParaAtualizar.push({
            id: conta.id,
            coluna_id: colunaCorreta,
            coluna_origem_id: conta.coluna_id,
          });
        }
        continue;
      }
      
      // Se não tem data de vencimento, mover para Nova Conta a Pagar
      if (!conta.data_vencimento && colunaNova) {
        if (conta.coluna_id !== colunaNova.id) {
          cardsParaAtualizar.push({
            id: conta.id,
            coluna_id: colunaNova.id,
            coluna_origem_id: conta.coluna_id,
          });
        }
        continue;
      }
      
      // Determina a coluna correta baseada na data de vencimento
      // Cards com data de vencimento são SEMPRE movidos para a coluna correta automaticamente
      const colunaCorreta = determinarColunaAutomatica(conta.data_vencimento, false, colunas);
      
      // Se a coluna correta é diferente da atual, mover
      if (colunaCorreta && colunaCorreta !== conta.coluna_id) {
        cardsParaAtualizar.push({
          id: conta.id,
          coluna_id: colunaCorreta,
          coluna_origem_id: conta.coluna_id,
        });
      }
    }
    
    // Atualizar cards no banco de dados
    for (const card of cardsParaAtualizar) {
      try {
        await (supabase as any).from('contas_pagar').update({ coluna_id: card.coluna_id }).eq('id', card.id);
        
        // Registrar movimentação automática
        const colunaOrigem = colunas.find(c => c.id === card.coluna_origem_id);
        const colunaDestino = colunas.find(c => c.id === card.coluna_id);
        await (supabase as any).from('contas_pagar_movimentacoes').insert({
          conta_id: card.id,
          tipo: 'mudanca_automatica',
          descricao: `Card movido automaticamente de "${colunaOrigem?.nome || 'Desconhecida'}" para "${colunaDestino?.nome || 'Desconhecida'}" (baseado na data de vencimento)`,
          coluna_origem_id: card.coluna_origem_id,
          coluna_destino_id: card.coluna_id,
        });
      } catch (e) {
        console.error('Erro ao mover card automaticamente:', e);
      }
    }
    
    // Recarregar contas se houve atualizações
    if (cardsParaAtualizar.length > 0) {
      await loadContas();
    }
  };

  const loadFornecedores = async () => {
    try {
      // Buscar fornecedores da tabela de fornecedores incluindo classificação e descrição padrão
      const { data, error } = await (supabase as any).from('fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf, classificacao_despesa_padrao, descricao_despesa_padrao').eq('empresa_id', empresaId).eq('ativo', true).order('nome_fantasia');
      if (error) throw error;
      setFornecedores(data || []);
    } catch (e) {
      console.error(e);
      setFornecedores([]);
    }
  };

  const loadFormasPagamento = async () => {
    setFormasPagamento([
      { id: '1', nome: 'PIX', ativo: true },
      { id: '2', nome: 'Boleto', ativo: true },
      { id: '3', nome: 'Cartão de Crédito', ativo: true },
      { id: '4', nome: 'Cartão de Débito', ativo: true },
      { id: '5', nome: 'Transferência', ativo: true },
    ]);
  };

  const loadContasBancarias = async () => {
    try {
      const { data } = await (supabase as any)
        .from('contas_bancarias')
        .select('id, banco, agencia, conta, tipo, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('banco');
      setContasBancarias(data || []);
    } catch (e) {
      console.error('Erro ao carregar contas bancárias:', e);
      setContasBancarias([]);
    }
  };

  const loadPlanosDespesa = async () => {
    try {
      const { data } = await (supabase as any).from('plano_despesas').select('id, nome, descricao, tipo, ativo').eq('ativo', true).order('nome');
      setPlanosDespesa(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers de seleção
  const handleFornecedorChange = (fornecedorId: string) => {
    const forn = fornecedores.find(f => f.id === fornecedorId);
    if (forn) {
      setCardForm(prev => ({ 
        ...prev, 
        fornecedor_id: fornecedorId, 
        fornecedor_nome: forn.nome_fantasia || forn.razao_social, 
        fornecedor_cnpj: forn.cnpj_cpf || '',
        // Preencher automaticamente classificação e descrição se o fornecedor tiver valores padrão
        classificacao_despesa: forn.classificacao_despesa_padrao || prev.classificacao_despesa,
        descricao: forn.descricao_despesa_padrao || prev.descricao,
      }));
    }
  };

  const handleClassificacaoChange = (classificacao: string) => {
    setCardForm(prev => ({ ...prev, classificacao_despesa: classificacao, descricao: '' }));
  };

  // Filtrar descrições baseado na classificação selecionada
  const descricoesFiltradas = useMemo(() => {
    if (!cardForm.classificacao_despesa) return [];
    return planosDespesa.filter(p => p.tipo === cardForm.classificacao_despesa);
  }, [cardForm.classificacao_despesa, planosDespesa]);

  const handleFormaPagamentoChange = (id: string) => {
    const f = formasPagamento.find(x => x.id === id);
    if (f) setCardForm(prev => ({ ...prev, forma_pagamento_id: id, forma_pagamento: f.nome }));
  };

  const handleContaFinanceiraChange = (id: string) => {
    const c = contasBancarias.find(x => x.id === id);
    if (c) setCardForm(prev => ({ ...prev, conta_financeira_id: id, conta_financeira: `${c.banco} - ${c.agencia}` }));
  };

  // Filtros e cálculos
  const filteredContas = useMemo(() => contas.filter(c => {
    const ms = !searchTerm || c.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const mc = filterCategoria === 'all' || c.categoria === filterCategoria;
    return ms && mc;
  }), [contas, searchTerm, filterCategoria]);

  const contasByColuna = useMemo(() => colunas.reduce((acc, col) => {
    let contasDaColuna = filteredContas.filter(c => c.coluna_id === col.id);
    
    // Ordenar por data de vencimento (mais próximo primeiro) para colunas de vencimento
    const colunasOrdenarPorVencimento = ['a vencer', 'vence', 'vencido'];
    const deveOrdenar = colunasOrdenarPorVencimento.some(termo => col.nome.toLowerCase().includes(termo));
    
    if (deveOrdenar) {
      contasDaColuna = contasDaColuna.sort((a, b) => {
        const dataA = new Date(a.data_vencimento).getTime();
        const dataB = new Date(b.data_vencimento).getTime();
        return dataA - dataB; // Mais próximo de vencer primeiro
      });
    }
    
    acc[col.id] = contasDaColuna;
    return acc;
  }, {} as Record<string, ContaPagar[]>), [filteredContas, colunas]);

  const totals = useMemo(() => {
    const colunaAVencer = colunas.find(c => c.nome.toLowerCase().includes('vencer'));
    const colunaVencidos = colunas.find(c => c.nome.toLowerCase().includes('vencido'));
    const colunaPagos = colunas.find(c => c.nome.toLowerCase().includes('pago') && !c.nome.toLowerCase().includes('parcial'));
    return {
      total: contas.reduce((s, c) => s + Number(c.valor || 0), 0),
      pago: contas.reduce((s, c) => s + Number(c.valor_pago || 0), 0),
      pendente: contas.filter(c => c.coluna_id === colunaAVencer?.id).reduce((s, c) => s + Number(c.valor || 0), 0),
      vencido: contas.filter(c => c.coluna_id === colunaVencidos?.id).reduce((s, c) => s + Number(c.valor || 0), 0),
    };
  }, [contas, colunas]);

  // Drag and Drop handlers
  const handleDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current;
    if (d?.type === 'card') {
      setActiveCard(d.conta);
      setDragOriginColunaId(d.conta.coluna_id);
    } else if (d?.type === 'column') {
      setActiveColuna(d.coluna);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const ad = active.data.current;
    if (ad?.type !== 'card') return;
    
    let tid: string | null = null;
    const od = over.data.current;
    if (od?.type === 'column') tid = od.coluna.id;
    else if (od?.type === 'card') tid = od.conta.coluna_id;
    else if (over.id.toString().startsWith('droppable-')) tid = over.id.toString().replace('droppable-', '');
    
    if (!tid) return;
    const ac = contas.find(c => c.id === active.id);
    if (!ac || ac.coluna_id === tid) return;
    setContas(prev => prev.map(c => c.id === active.id ? { ...c, coluna_id: tid! } : c));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const savedOriginColunaId = dragOriginColunaId;
    setActiveCard(null);
    setActiveColuna(null);
    setDragOriginColunaId(null);
    
    if (!over) return;
    const ad = active.data.current;
    const od = over.data.current;
    
    if (ad?.type === 'column' && od?.type === 'column') {
      const ai = colunas.findIndex(c => c.id === active.id);
      const oi = colunas.findIndex(c => c.id === over.id);
      if (ai !== oi) {
        const reordered = arrayMove(colunas, ai, oi).map((c, i) => ({ ...c, ordem: i }));
        setColunas(reordered);
        try {
          for (const col of reordered) {
            await (supabase as any).from('contas_pagar_colunas').update({ ordem: col.ordem }).eq('id', col.id);
          }
        } catch (e) {
          console.error(e);
        }
        toast({ title: 'Coluna reordenada!' });
      }
      return;
    }
    
    if (ad?.type === 'card') {
      const card = contas.find(c => c.id === active.id);
      if (card && savedOriginColunaId && card.coluna_id !== savedOriginColunaId) {
        const colunaOrigem = colunas.find(c => c.id === savedOriginColunaId);
        const colunaDestino = colunas.find(c => c.id === card.coluna_id);
        try {
          await (supabase as any).from('contas_pagar').update({ coluna_id: card.coluna_id }).eq('id', card.id);
          // Registrar movimentação
          await (supabase as any).from('contas_pagar_movimentacoes').insert({
            conta_id: card.id,
            tipo: 'mudanca_coluna',
            descricao: `Card movido de "${colunaOrigem?.nome || 'Desconhecida'}" para "${colunaDestino?.nome || 'Desconhecida'}"`,
            coluna_origem_id: savedOriginColunaId,
            coluna_destino_id: card.coluna_id,
            usuario_id: profile?.id,
          });
        } catch (e) {
          console.error(e);
        }
        toast({ title: 'Conta movida!' });
      }
    }
  };

  // CRUD handlers
  const handleAddCard = (colunaId: string) => {
    setEditingCard(null);
    setSelectedColunaId(colunaId);
    setCardForm({
      fornecedor_id: '',
      fornecedor_nome: '',
      fornecedor_cnpj: '',
      classificacao_despesa: '',
      descricao: '',
      valor: 0,
      data_competencia: '',
      data_vencimento: '',
      forma_pagamento_id: '',
      forma_pagamento: '',
      conta_financeira_id: '',
      conta_financeira: '',
      observacoes: '',
    });
    setCardDialogOpen(true);
  };

  const handleEditCard = (card: ContaPagar) => {
    setEditingCard(card);
    setSelectedColunaId(card.coluna_id);
    setCardForm({
      fornecedor_id: card.fornecedor_id || '',
      fornecedor_nome: card.fornecedor_nome || '',
      fornecedor_cnpj: card.fornecedor_cnpj || '',
      classificacao_despesa: card.categoria || '',
      descricao: card.descricao || '',
      valor: card.valor || 0,
      data_competencia: card.data_competencia || '',
      data_vencimento: card.data_vencimento || '',
      forma_pagamento_id: card.forma_pagamento_id || '',
      forma_pagamento: card.forma_pagamento || '',
      conta_financeira_id: card.conta_financeira_id || '',
      conta_financeira: card.conta_financeira || '',
      observacoes: card.observacoes || '',
    });
    setCardDialogOpen(true);
  };

  const handleViewCard = async (card: ContaPagar) => {
    setViewingCard(card);
    setViewDialogOpen(true);
    setAtividades([]);
    setMovimentacoes([]);
    setAtividadeFormExpanded(false);
    setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
    await Promise.all([fetchAtividades(card.id), fetchMovimentacoes(card.id)]);
  };

  const fetchAtividades = async (contaId: string) => {
    setLoadingAtividades(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .select('*, usuario:profiles(nome)')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAtividades(data || []);
    } catch (e) { console.error('Erro ao carregar atividades:', e); setAtividades([]); }
    setLoadingAtividades(false);
  };

  const fetchMovimentacoes = async (contaId: string) => {
    setLoadingMovimentacoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contas_pagar_movimentacoes')
        .select('*, usuario:profiles(nome)')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (e) { console.error('Erro ao carregar movimentações:', e); setMovimentacoes([]); }
    setLoadingMovimentacoes(false);
  };

  const handleAddAtividade = async () => {
    if (!viewingCard || !novaAtividade.descricao.trim()) {
      toast({ title: 'Informe a descrição da atividade', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .insert({
          conta_id: viewingCard.id,
          tipo: novaAtividade.tipo,
          descricao: novaAtividade.descricao,
          prazo: novaAtividade.prazo || null,
          horario: novaAtividade.horario || null,
          status: novaAtividade.prazo ? 'programada' : 'concluida',
          usuario_id: profile?.id,
        });
      if (error) throw error;
      toast({ title: 'Atividade registrada!' });
      setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
      setAtividadeFormExpanded(false);
      await fetchAtividades(viewingCard.id);
    } catch (e) { console.error('Erro ao adicionar atividade:', e); toast({ title: 'Erro ao adicionar atividade', variant: 'destructive' }); }
  };

  const handleUpdateAtividadeStatus = async (atividadeId: string, novoStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('contas_pagar_atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId);
      if (error) throw error;
      setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, status: novoStatus } : a));
    } catch (e) { console.error('Erro ao atualizar status:', e); }
  };

  const handleMoverParaColuna = async (colunaId: string) => {
    if (!viewingCard || viewingCard.coluna_id === colunaId) return;
    const colunaOrigem = colunas.find(c => c.id === viewingCard.coluna_id);
    const colunaDestino = colunas.find(c => c.id === colunaId);
    try {
      await (supabase as any).from('contas_pagar').update({ coluna_id: colunaId }).eq('id', viewingCard.id);
      // Registrar movimentação
      await (supabase as any).from('contas_pagar_movimentacoes').insert({
        conta_id: viewingCard.id,
        tipo: 'mudanca_coluna',
        descricao: `Card movido de "${colunaOrigem?.nome || 'Desconhecida'}" para "${colunaDestino?.nome || 'Desconhecida'}"`,
        coluna_origem_id: viewingCard.coluna_id,
        coluna_destino_id: colunaId,
        usuario_id: profile?.id,
      });
      setViewingCard({ ...viewingCard, coluna_id: colunaId });
      setContas(prev => prev.map(c => c.id === viewingCard.id ? { ...c, coluna_id: colunaId } : c));
      // Recarregar movimentações
      await fetchMovimentacoes(viewingCard.id);
      toast({ title: 'Conta movida!' });
    } catch (e) { console.error('Erro ao mover conta:', e); }
  };

  // Abrir popup de confirmação de pagamento
  const handleAbrirConfirmarPagamento = (card: ContaPagar) => {
    setCardParaPagar(card);
    setDataPagamentoConfirmacao(format(new Date(), 'yyyy-MM-dd'));
    setConfirmarPagamentoOpen(true);
  };

  // Confirmar e registrar o pagamento
  const handleConfirmarPagamento = async () => {
    if (!cardParaPagar) return;
    try {
      // Encontrar coluna "Pagos"
      const colunaPagos = colunas.find(c => c.nome.toLowerCase().includes('pago'));
      
      await (supabase as any).from('contas_pagar').update({ 
        valor_pago: cardParaPagar.valor,
        data_pagamento: dataPagamentoConfirmacao,
        coluna_id: colunaPagos?.id || cardParaPagar.coluna_id,
      }).eq('id', cardParaPagar.id);
      
      // Registrar movimentação para coluna Pagos
      if (colunaPagos && cardParaPagar.coluna_id !== colunaPagos.id) {
        const colunaOrigem = colunas.find(c => c.id === cardParaPagar.coluna_id);
        await (supabase as any).from('contas_pagar_movimentacoes').insert({
          conta_id: cardParaPagar.id,
          tipo: 'pagamento_registrado',
          descricao: `Pagamento registrado em ${format(parse(dataPagamentoConfirmacao, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}. Card movido de "${colunaOrigem?.nome || 'Desconhecida'}" para "${colunaPagos.nome}"`,
          coluna_origem_id: cardParaPagar.coluna_id,
          coluna_destino_id: colunaPagos.id,
          usuario_id: profile?.id,
        });
      }
      
      setContas(prev => prev.map(c => c.id === cardParaPagar.id ? { 
        ...c, 
        valor_pago: c.valor, 
        data_pagamento: dataPagamentoConfirmacao,
        coluna_id: colunaPagos?.id || c.coluna_id,
      } : c));
      
      if (viewingCard?.id === cardParaPagar.id) {
        setViewingCard({ 
          ...viewingCard, 
          valor_pago: cardParaPagar.valor, 
          data_pagamento: dataPagamentoConfirmacao,
          coluna_id: colunaPagos?.id || viewingCard.coluna_id,
        });
        // Recarregar movimentações
        await fetchMovimentacoes(viewingCard.id);
      }
      
      setConfirmarPagamentoOpen(false);
      setCardParaPagar(null);
      toast({ title: 'Pagamento registrado com sucesso!' });
    } catch (e) { 
      console.error('Erro ao registrar pagamento:', e); 
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' }); 
    }
  };

  // Funções para Programar Pagamento
  const handleAbrirProgramarPagamento = () => {
    if (!viewingCard) return;
    setTipoPagamento('esporadico');
    setProgramarDatas([viewingCard.data_vencimento || format(new Date(), 'yyyy-MM-dd')]);
    setProgramarDialogOpen(true);
  };

  const handleProgramarDataChange = (index: number, novaData: string) => {
    setProgramarDatas(prev => prev.map((d, i) => i === index ? novaData : d));
  };

  const handleSalvarProgramacao = async () => {
    if (!viewingCard || programarDatas.length === 0) return;
    setProgramarLoading(true);
    try {
      if (tipoPagamento === 'mensal') {
        // Atualizar a conta original como pagamento mensal recorrente
        await (supabase as any).from('contas_pagar').update({
          data_vencimento: programarDatas[0],
          observacoes: `[PAGAMENTO MENSAL RECORRENTE] ${viewingCard.observacoes || ''}`,
        }).eq('id', viewingCard.id);
        toast({ title: 'Pagamento configurado como mensal recorrente!' });
      } else if (tipoPagamento === 'anual') {
        // Atualizar a conta original como pagamento anual
        await (supabase as any).from('contas_pagar').update({
          data_vencimento: programarDatas[0],
          observacoes: `[PAGAMENTO ANUAL] ${viewingCard.observacoes || ''}`,
        }).eq('id', viewingCard.id);
        toast({ title: 'Pagamento configurado como anual!' });
      } else {
        // Pagamento esporádico - criar múltiplas parcelas
        const valorParcela = viewingCard.valor / programarDatas.length;
        const primeiraColuna = colunas[0]?.id;
        
        // Criar contas para cada data programada (exceto a primeira que já existe)
        for (let i = 1; i < programarDatas.length; i++) {
          const ano = new Date().getFullYear();
          const numero = `CP-${ano}-${String(contas.length + i).padStart(3, '0')}`;
          await (supabase as any).from('contas_pagar').insert({
            empresa_id: empresaIdEfetivo,
            numero,
            fornecedor_id: viewingCard.fornecedor_id,
            fornecedor_nome: viewingCard.fornecedor_nome,
            fornecedor_cnpj: viewingCard.fornecedor_cnpj,
            descricao: viewingCard.descricao,
            valor: valorParcela,
            valor_pago: 0,
            data_emissao: new Date().toISOString().split('T')[0],
            data_competencia: programarDatas[i],
            data_vencimento: programarDatas[i],
            forma_pagamento: viewingCard.forma_pagamento,
            forma_pagamento_id: viewingCard.forma_pagamento_id,
            categoria: viewingCard.categoria,
            conta_financeira: viewingCard.conta_financeira,
            conta_financeira_id: viewingCard.conta_financeira_id,
            coluna_id: primeiraColuna,
            observacoes: `Parcela ${i + 1}/${programarDatas.length} - ${viewingCard.observacoes || ''}`,
            ordem: 0,
            arquivado: false,
            created_by: profile?.id,
          });
        }
        
        // Atualizar a conta original com a primeira data e valor da parcela
        await (supabase as any).from('contas_pagar').update({
          data_vencimento: programarDatas[0],
          valor: valorParcela,
          observacoes: `Parcela 1/${programarDatas.length} - ${viewingCard.observacoes || ''}`,
        }).eq('id', viewingCard.id);
        
        toast({ title: `${programarDatas.length} pagamentos programados com sucesso!` });
      }
      setProgramarDialogOpen(false);
      await loadContas();
    } catch (e) {
      console.error('Erro ao programar pagamentos:', e);
      toast({ title: 'Erro ao programar pagamentos', variant: 'destructive' });
    } finally {
      setProgramarLoading(false);
    }
  };

  // Função para editar valor
  const handleSalvarNovoValor = async () => {
    if (!viewingCard || !novoValor) return;
    const valorNumerico = parseFloat(novoValor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    try {
      await (supabase as any).from('contas_pagar').update({ valor: valorNumerico }).eq('id', viewingCard.id);
      setViewingCard({ ...viewingCard, valor: valorNumerico });
      setContas(prev => prev.map(c => c.id === viewingCard.id ? { ...c, valor: valorNumerico } : c));
      setEditandoValor(false);
      toast({ title: 'Valor atualizado!' });
    } catch (e) {
      console.error('Erro ao atualizar valor:', e);
      toast({ title: 'Erro ao atualizar valor', variant: 'destructive' });
    }
  };

  const handleSaveCard = async () => {
    if (!cardForm.fornecedor_nome || !cardForm.descricao || !cardForm.valor || !cardForm.data_vencimento) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (!selectedColunaId) {
      toast({ title: 'Erro: nenhuma coluna disponível. Crie uma coluna primeiro.', variant: 'destructive' });
      return;
    }

    try {
      if (editingCard) {
        const updateData: any = {
          fornecedor_nome: cardForm.fornecedor_nome,
          fornecedor_cnpj: cardForm.fornecedor_cnpj || null,
          descricao: cardForm.descricao,
          valor: cardForm.valor,
          data_competencia: cardForm.data_competencia || cardForm.data_vencimento,
          data_vencimento: cardForm.data_vencimento,
          forma_pagamento: cardForm.forma_pagamento || null,
          categoria: cardForm.classificacao_despesa || null,
          conta_financeira: cardForm.conta_financeira || null,
          observacoes: cardForm.observacoes || null,
        };
        
        // Função para validar UUID
        const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // Adicionar campos UUID apenas se forem UUIDs válidos
        if (cardForm.fornecedor_id && isValidUUID(cardForm.fornecedor_id)) {
          updateData.fornecedor_id = cardForm.fornecedor_id;
        } else {
          updateData.fornecedor_id = null;
        }
        if (cardForm.forma_pagamento_id && isValidUUID(cardForm.forma_pagamento_id)) {
          updateData.forma_pagamento_id = cardForm.forma_pagamento_id;
        } else {
          updateData.forma_pagamento_id = null;
        }
        if (cardForm.conta_financeira_id && isValidUUID(cardForm.conta_financeira_id)) {
          updateData.conta_financeira_id = cardForm.conta_financeira_id;
        } else {
          updateData.conta_financeira_id = null;
        }
        
        const { error } = await (supabase as any).from('contas_pagar').update(updateData).eq('id', editingCard.id);
        
        if (error) throw error;
        toast({ title: 'Conta atualizada!' });
      } else {
        const ano = new Date().getFullYear();
        const numero = `CP-${ano}-${String(contas.length + 1).padStart(3, '0')}`;
        
        const insertData: any = {
          empresa_id: empresaId,
          numero,
          fornecedor_nome: cardForm.fornecedor_nome,
          fornecedor_cnpj: cardForm.fornecedor_cnpj || null,
          descricao: cardForm.descricao,
          valor: cardForm.valor,
          valor_pago: 0,
          data_emissao: new Date().toISOString().split('T')[0],
          data_competencia: cardForm.data_competencia || cardForm.data_vencimento,
          data_vencimento: cardForm.data_vencimento,
          forma_pagamento: cardForm.forma_pagamento || null,
          categoria: cardForm.classificacao_despesa || null,
          conta_financeira: cardForm.conta_financeira || null,
          coluna_id: selectedColunaId,
          observacoes: cardForm.observacoes || null,
          ordem: 0,
          arquivado: false,
        };
        
        // Função para validar UUID
        const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // Adicionar campos UUID apenas se forem UUIDs válidos
        if (cardForm.fornecedor_id && isValidUUID(cardForm.fornecedor_id)) {
          insertData.fornecedor_id = cardForm.fornecedor_id;
        }
        if (cardForm.forma_pagamento_id && isValidUUID(cardForm.forma_pagamento_id)) {
          insertData.forma_pagamento_id = cardForm.forma_pagamento_id;
        }
        if (cardForm.conta_financeira_id && isValidUUID(cardForm.conta_financeira_id)) {
          insertData.conta_financeira_id = cardForm.conta_financeira_id;
        }
        if (profile?.id) {
          insertData.created_by = profile.id;
        }
        
        const { error } = await (supabase as any).from('contas_pagar').insert(insertData);
        
        if (error) throw error;
        toast({ title: 'Conta criada!' });
      }
      
      setCardDialogOpen(false);
      loadContas();
    } catch (e: any) {
      console.error('Erro ao salvar conta:', e);
      const errorMessage = e?.message || e?.details || 'Erro desconhecido';
      toast({ title: 'Erro ao salvar conta', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDeleteCard = (id: string) => {
    const card = contas.find(c => c.id === id);
    setDeleteType('card');
    setDeleteId(id);
    setDeleteName(card?.fornecedor_nome || '');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      if (deleteType === 'card') {
        const { error } = await (supabase as any).from('contas_pagar').update({ arquivado: true }).eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Conta excluída!' });
        loadContas();
      } else if (deleteType === 'coluna') {
        const cardsNaColuna = contas.filter(c => c.coluna_id === deleteId);
        if (cardsNaColuna.length > 0) {
          toast({ title: 'Não é possível excluir coluna com contas', variant: 'destructive' });
          setDeleteDialogOpen(false);
          return;
        }
        const { error } = await (supabase as any).from('contas_pagar_colunas').delete().eq('id', deleteId);
        if (error) throw error;
        toast({ title: 'Coluna excluída!' });
        loadColunas();
      }
    } catch (e) {
      console.error('Erro ao excluir:', e);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
    
    setDeleteDialogOpen(false);
    setDeleteType(null);
    setDeleteId(null);
    setDeleteName('');
  };

  // Colunas CRUD
  const handleAddColumn = () => {
    setEditingColuna(null);
    setColunaForm({ nome: '', cor: '#6366f1' });
    setColunaDialogOpen(true);
  };

  const handleEditColumn = (coluna: KanbanColuna) => {
    setEditingColuna(coluna);
    setColunaForm({ nome: coluna.nome, cor: coluna.cor });
    setColunaDialogOpen(true);
  };

  const handleDeleteColumn = (id: string) => {
    const coluna = colunas.find(c => c.id === id);
    setDeleteType('coluna');
    setDeleteId(id);
    setDeleteName(coluna?.nome || '');
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => {
    try {
      const { error } = await (supabase as any).from('contas_pagar').update({ status_pagamento: status }).eq('id', cardId);
      if (error) throw error;
      setContas(prev => prev.map(c => c.id === cardId ? { ...c, status_pagamento: status } : c));
      toast({ title: `Status alterado para ${STATUS_PAGAMENTO.find(s => s.value === status)?.label}` });
    } catch (e) { 
      console.error('Erro ao alterar status:', e); 
      toast({ title: 'Erro ao alterar status', variant: 'destructive' }); 
    }
  };

  const handleSaveColumn = async () => {
    if (!colunaForm.nome) {
      toast({ title: 'Informe o nome da coluna', variant: 'destructive' });
      return;
    }

    try {
      if (editingColuna) {
        const { error } = await (supabase as any).from('contas_pagar_colunas').update({
          nome: colunaForm.nome,
          cor: colunaForm.cor,
        }).eq('id', editingColuna.id);
        
        if (error) throw error;
        toast({ title: 'Coluna atualizada!' });
      } else {
        const { error } = await (supabase as any).from('contas_pagar_colunas').insert({
          empresa_id: empresaId,
          nome: colunaForm.nome,
          cor: colunaForm.cor,
          ordem: colunas.length,
        });
        
        if (error) throw error;
        toast({ title: 'Coluna criada!' });
      }
      
      setColunaDialogOpen(false);
      loadColunas();
    } catch (e) {
      console.error('Erro ao salvar coluna:', e);
      toast({ title: 'Erro ao salvar coluna', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com totais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-xl font-bold">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-xl font-bold text-green-600">R$ {totals.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">R$ {totals.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><DollarSign className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-xl font-bold text-red-600">R$ {totals.vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e ações */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por fornecedor ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CLASSIFICACOES_DESPESA.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddColumn}>
            <Plus className="h-4 w-4 mr-2" />Nova Coluna
          </Button>
          <Button onClick={() => {
            const colunaNova = colunas.find(c => c.nome.toLowerCase().includes('nova conta'));
            handleAddCard(colunaNova?.id || colunas[0]?.id || '');
          }}>
            <Plus className="h-4 w-4 mr-2" />Nova Conta
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 400px)' }}>
          <SortableContext items={colunas.map(c => c.id)}>
            {colunas.map((coluna) => (
              <SortableColumn
                key={coluna.id}
                coluna={coluna}
                cards={contasByColuna[coluna.id] || []}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                onViewCard={handleViewCard}
                onStatusChange={handleStatusChange}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
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
          {activeColuna && (
            <div className="bg-card/90 rounded-xl border shadow-lg p-4 w-80 opacity-90" style={{ borderTop: `3px solid ${activeColuna.cor}` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColuna.cor }} />
                <h3 className="font-semibold">{activeColuna.nome}</h3>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog de Conta */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <Select value={cardForm.fornecedor_id} onValueChange={handleFornecedorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!cardForm.fornecedor_id && (
                  <Input
                    placeholder="Ou digite o nome do fornecedor"
                    value={cardForm.fornecedor_nome}
                    onChange={(e) => setCardForm(prev => ({ ...prev, fornecedor_nome: e.target.value }))}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>CNPJ/CPF</Label>
                <Input
                  value={cardForm.fornecedor_cnpj}
                  onChange={(e) => setCardForm(prev => ({ ...prev, fornecedor_cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classificação das Despesas *</Label>
                <Select value={cardForm.classificacao_despesa} onValueChange={handleClassificacaoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICACOES_DESPESA.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição da Despesa *</Label>
                <Select 
                  value={cardForm.descricao} 
                  onValueChange={(v) => setCardForm(prev => ({ ...prev, descricao: v }))}
                  disabled={!cardForm.classificacao_despesa}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={cardForm.classificacao_despesa ? "Selecione a descrição" : "Selecione a classificação primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {descricoesFiltradas.map(d => (
                      <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={cardForm.valor}
                onChange={(e) => setCardForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
                      onSelect={(date) => setCardForm(prev => ({ ...prev, data_competencia: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
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
                      onSelect={(date) => setCardForm(prev => ({ ...prev, data_vencimento: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={cardForm.forma_pagamento_id} onValueChange={handleFormaPagamentoChange}>
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

            <div className="space-y-2">
              <Label>Conta Financeira</Label>
              <Select value={cardForm.conta_financeira_id} onValueChange={handleContaFinanceiraChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.banco} - {c.agencia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={cardForm.observacoes}
                onChange={(e) => setCardForm(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCard}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Coluna */}
      <Dialog open={colunaDialogOpen} onOpenChange={setColunaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColuna ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Coluna *</Label>
              <Input
                value={colunaForm.nome}
                onChange={(e) => setColunaForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Em Análise"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {CORES_COLUNAS.map(cor => (
                  <button
                    key={cor.key}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${colunaForm.cor === cor.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: cor.value }}
                    onClick={() => setColunaForm(prev => ({ ...prev, cor: cor.value }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColunaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Conta a Pagar - Padrão Completo */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
          {viewingCard && (
            <>
              {/* Header do Dialog */}
              <DialogHeader className="border-b pb-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingCard.fornecedor_nome}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {viewingCard.fornecedor_cnpj || 'CNPJ não informado'}
                      </span>
                      <Badge variant="outline">{viewingCard.numero}</Badge>
                      {viewingCard.categoria && (
                        <Badge variant="secondary" className="text-xs">
                          {CLASSIFICACOES_DESPESA.find(c => c.value === viewingCard.categoria)?.label || viewingCard.categoria}
                        </Badge>
                      )}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setViewDialogOpen(false);
                        handleEditCard(viewingCard);
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
                      onClick={() => handleMoverParaColuna(col.id)}
                    >
                      {col.nome}
                    </Button>
                  ))}
                </div>
              </DialogHeader>

              {/* Conteúdo Principal */}
              <div className="flex-1 overflow-hidden flex gap-4 mt-4">
                {/* Coluna Esquerda - Atividades */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                  {/* Título da Seção */}
                  <h3 className="font-semibold text-base mb-3 text-primary">ATIVIDADES</h3>
                  
                  {/* Botões de Tipo de Atividade */}
                  <div className="flex flex-wrap gap-2 mb-4 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    {TIPOS_ATIVIDADE.map((tipo) => (
                      <Button
                        key={tipo.id}
                        variant={novaAtividade.tipo === tipo.id && atividadeFormExpanded ? 'default' : 'outline'}
                        size="sm"
                        className={`text-xs ${novaAtividade.tipo === tipo.id && atividadeFormExpanded ? 'bg-primary hover:bg-primary/90 text-white' : ''}`}
                        onClick={() => {
                          if (novaAtividade.tipo === tipo.id && atividadeFormExpanded) {
                            setAtividadeFormExpanded(false);
                          } else {
                            setNovaAtividade(prev => ({ ...prev, tipo: tipo.id }));
                            setAtividadeFormExpanded(true);
                          }
                        }}
                      >
                        <tipo.icon className="h-3 w-3 mr-1" />
                        {tipo.label}
                      </Button>
                    ))}
                  </div>

                  {/* Campo de Nova Atividade - Colapsável */}
                  {atividadeFormExpanded && (
                    <div className="mb-4 border rounded-lg p-3">
                      <div className="text-sm font-medium mb-2 text-muted-foreground">
                        {TIPOS_ATIVIDADE.find(t => t.id === novaAtividade.tipo)?.label || 'Nota'}
                      </div>
                      
                      <Textarea
                        placeholder="O que foi feito e qual o próximo passo?"
                        value={novaAtividade.descricao}
                        onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                        className="min-h-[80px]"
                      />

                      {/* Campos extras: Prazo, Horário */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Prazo</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full h-9 text-xs justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
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
                                onSelect={(date) => setNovaAtividade(prev => ({ ...prev, prazo: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Horário</Label>
                          <Select value={novaAtividade.horario || ''} onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, horario: value }))}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {Array.from({ length: 48 }, (_, i) => {
                                const hour = Math.floor(i / 2);
                                const minute = i % 2 === 0 ? '00' : '30';
                                const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                                return <SelectItem key={timeValue} value={timeValue}>{timeValue}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => { setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' }); setAtividadeFormExpanded(false); }}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleAddAtividade} className="bg-primary">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Histórico de Atividades */}
                  <div className="flex-1 overflow-y-auto">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Histórico de Atividades
                    </h4>
                    
                    {loadingAtividades ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : atividades.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>Nenhuma atividade registrada</p>
                        <p className="text-xs mt-1">Registre a primeira atividade acima</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atividades.map((atividade) => {
                          const tipoInfo = TIPOS_ATIVIDADE.find(t => t.id === atividade.tipo) || TIPOS_ATIVIDADE[6];
                          const TipoIcon = tipoInfo.icon;
                          const isConcluida = atividade.status === 'concluida';
                          const statusColors: Record<string, string> = {
                            programada: 'bg-blue-100 text-blue-700',
                            pendente: 'bg-red-100 text-red-700',
                            concluida: 'bg-green-100 text-green-700',
                          };
                          const statusLabels: Record<string, string> = {
                            programada: 'Programada',
                            pendente: 'Pendente',
                            concluida: 'Concluída',
                          };
                          return (
                            <div key={atividade.id} className={`border rounded-lg p-3 bg-card ${isConcluida ? 'opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox
                                    checked={isConcluida}
                                    onCheckedChange={(checked) => handleUpdateAtividadeStatus(atividade.id, checked ? 'concluida' : 'programada')}
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
                                      <Badge className={`text-xs ${statusColors[atividade.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {statusLabels[atividade.status] || atividade.status}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(atividade.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isConcluida ? 'line-through' : ''}`}>
                                    {atividade.descricao}
                                  </p>
                                  {(atividade.prazo || atividade.horario) && (
                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                      {atividade.prazo && (
                                        <span className="flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3" />
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
                                    <p className="text-xs text-muted-foreground mt-2">Por: {atividade.usuario.nome}</p>
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
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma movimentação registrada
                      </p>
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
                                  {mov.tipo === 'edicao' && <Pencil className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0 pb-3">
                                  <p className="text-sm">{mov.descricao}</p>
                                  {(colunaOrigem || colunaDestino) && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {colunaOrigem && (
                                        <Badge variant="outline" className="text-xs" style={{ borderColor: colunaOrigem.cor, color: colunaOrigem.cor }}>
                                          {colunaOrigem.nome}
                                        </Badge>
                                      )}
                                      {colunaOrigem && colunaDestino && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                      {colunaDestino && (
                                        <Badge variant="outline" className="text-xs" style={{ borderColor: colunaDestino.cor, color: colunaDestino.cor }}>
                                          {colunaDestino.nome}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{new Date(mov.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    {mov.usuario && <><span>•</span><span>Por: {mov.usuario.nome}</span></>}
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

                {/* Coluna Direita - Ações Rápidas e Informações */}
                <div className="w-72 flex-shrink-0 border-l pl-4 bg-muted/50 rounded-lg p-4 overflow-y-auto max-h-full">
                  {/* Ações Rápidas */}
                  <div className="space-y-2 mb-6">
                    <h4 className="font-semibold text-sm mb-3">Ações Rápidas</h4>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setViewDialogOpen(false); handleEditCard(viewingCard); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Conta
                    </Button>
                    
                    {viewingCard.valor_pago < viewingCard.valor && (
                      <Button variant="outline" size="sm" className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleAbrirConfirmarPagamento(viewingCard)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Registrar Pagamento
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={handleAbrirProgramarPagamento}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Programar Pagamento
                    </Button>
                  </div>

                  {/* Valor a Pagar */}
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                      Valor a Pagar
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditandoValor(true); setNovoValor(viewingCard.valor.toString()); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </h4>
                    <div className="space-y-3">
                      {editandoValor ? (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={novoValor}
                            onChange={(e) => setNovoValor(e.target.value)}
                            placeholder="0,00"
                            className="text-lg font-bold"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditandoValor(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleSalvarNovoValor}>Salvar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-destructive">
                          R$ {Number(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      
                      {viewingCard.valor_pago > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Valor Pago:</span>
                          <span className="font-medium text-green-600">
                            R$ {Number(viewingCard.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados do Favorecido */}
                  <div className="pt-4 border-t mt-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                      Dados do Favorecido
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setViewDialogOpen(false); handleEditCard(viewingCard); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Fornecedor</p>
                        <p className="font-medium">{viewingCard.fornecedor_nome}</p>
                      </div>
                      {viewingCard.fornecedor_cnpj && (
                        <div>
                          <p className="text-muted-foreground text-xs">CNPJ/CPF</p>
                          <p className="font-medium">{viewingCard.fornecedor_cnpj}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Data de Vencimento</p>
                        <p className="font-medium">{viewingCard.data_vencimento ? format(new Date(viewingCard.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Forma de Pagamento</p>
                        <p className="font-medium">{viewingCard.forma_pagamento || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Categoria</p>
                        <p className="font-medium">{CLASSIFICACOES_DESPESA.find(c => c.value === viewingCard.categoria)?.label || viewingCard.categoria || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Conta Financeira</p>
                        <p className="font-medium">{viewingCard.conta_financeira || '-'}</p>
                      </div>
                      {viewingCard.descricao && (
                        <div>
                          <p className="text-muted-foreground text-xs">Descrição</p>
                          <p className="font-medium">{viewingCard.descricao}</p>
                        </div>
                      )}
                      {viewingCard.observacoes && (
                        <div>
                          <p className="text-muted-foreground text-xs">Observações</p>
                          <p className="font-medium text-xs">{viewingCard.observacoes}</p>
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

      {/* Dialog de Programar Pagamento */}
      <Dialog open={programarDialogOpen} onOpenChange={setProgramarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Programar Pagamento
            </DialogTitle>
            <DialogDescription>
              Configure as datas e tipo de pagamento
            </DialogDescription>
          </DialogHeader>
          
          {viewingCard && (
            <div className="space-y-4">
              {/* Info do Pagamento */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fornecedor:</span>
                  <span className="text-sm text-muted-foreground">{viewingCard.fornecedor_nome}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Valor Total:</span>
                  <span className="text-sm font-bold text-destructive">
                    R$ {Number(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {tipoPagamento === 'esporadico' && programarDatas.length > 1 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">Valor por Parcela:</span>
                    <span className="text-sm text-muted-foreground">
                      R$ {Number((viewingCard.valor || 0) / programarDatas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Tipo de Pagamento */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={tipoPagamento === 'mensal' ? 'default' : 'outline'}
                    size="sm"
                    className={tipoPagamento === 'mensal' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    onClick={() => setTipoPagamento('mensal')}
                  >
                    Mensal
                  </Button>
                  <Button
                    type="button"
                    variant={tipoPagamento === 'esporadico' ? 'default' : 'outline'}
                    size="sm"
                    className={tipoPagamento === 'esporadico' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    onClick={() => setTipoPagamento('esporadico')}
                  >
                    Esporádico
                  </Button>
                  <Button
                    type="button"
                    variant={tipoPagamento === 'anual' ? 'default' : 'outline'}
                    size="sm"
                    className={tipoPagamento === 'anual' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    onClick={() => setTipoPagamento('anual')}
                  >
                    Anual
                  </Button>
                </div>
              </div>

              {/* Descrição do tipo selecionado */}
              {tipoPagamento === 'mensal' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Pagamento Mensal:</strong> Este pagamento será recorrente todo mês. 
                    A primeira cobrança será na data selecionada abaixo.
                  </p>
                </div>
              )}
              {tipoPagamento === 'anual' && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    <strong>Pagamento Anual:</strong> Este pagamento será recorrente uma vez por ano. 
                    A cobrança será na data selecionada abaixo.
                  </p>
                </div>
              )}
              {tipoPagamento === 'esporadico' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Pagamento Esporádico:</strong> Adicione múltiplas datas para dividir o pagamento em parcelas.
                  </p>
                </div>
              )}

              {/* Lista de Datas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {tipoPagamento === 'esporadico' ? 'Datas de Vencimento' : 'Data de Início'}
                  </Label>
                  {tipoPagamento === 'esporadico' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProgramarDatas(prev => [...prev, format(new Date(), 'yyyy-MM-dd')])}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Parcela
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(tipoPagamento === 'esporadico' ? programarDatas : programarDatas.slice(0, 1)).map((data, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <span className="text-sm font-medium w-20">
                        {tipoPagamento === 'esporadico' ? `Parcela ${index + 1}` : 'Data'}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {data ? format(parse(data, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={data ? parse(data, 'yyyy-MM-dd', new Date()) : undefined}
                            onSelect={(d) => d && handleProgramarDataChange(index, format(d, 'yyyy-MM-dd'))}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      {tipoPagamento === 'esporadico' && programarDatas.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setProgramarDatas(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarProgramacao} 
              disabled={programarLoading || programarDatas.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {programarLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Salvar Programação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={confirmarPagamentoOpen} onOpenChange={setConfirmarPagamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirmar Pagamento
            </DialogTitle>
            <DialogDescription>
              Confirme a data em que o pagamento foi efetuado
            </DialogDescription>
          </DialogHeader>
          
          {cardParaPagar && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fornecedor:</span>
                  <span className="text-sm text-muted-foreground">{cardParaPagar.fornecedor_nome}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Valor:</span>
                  <span className="text-sm font-bold text-green-600">
                    R$ {Number(cardParaPagar.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Vencimento:</span>
                  <span className="text-sm text-muted-foreground">
                    {cardParaPagar.data_vencimento ? format(parse(cardParaPagar.data_vencimento, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : '-'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data do Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataPagamentoConfirmacao ? format(parse(dataPagamentoConfirmacao, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataPagamentoConfirmacao ? parse(dataPagamentoConfirmacao, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(d) => d && setDataPagamentoConfirmacao(format(d, 'yyyy-MM-dd'))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Ao confirmar, o card será movido automaticamente para a coluna <strong>"Pagos"</strong>.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarPagamentoOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarPagamento}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteType === 'coluna' ? 'a coluna' : 'a conta'} "{deleteName}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
