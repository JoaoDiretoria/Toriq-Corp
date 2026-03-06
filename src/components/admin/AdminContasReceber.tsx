import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaEfetiva } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, DollarSign, Calendar as CalendarIcon, MoreVertical, Trash2, CheckCircle2, Clock, AlertTriangle, CreditCard, Eye, GripVertical, Edit, Target, X, Save, Building2, User, Mail, Phone, FileText, ArrowRightLeft, ArrowRight, Loader2, Tag, Pencil, ClipboardList, MessageSquare, PhoneCall, Video, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardMovimentacoesHistory } from '@/components/shared/CardMovimentacoesHistory';

const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface ContaReceber {
  id: string; numero: string; cliente_id: string; cliente_nome: string; cliente_cnpj: string;
  servico_produto: string; valor: number; valor_pago: number; data_emissao: string;
  data_competencia: string; data_recebimento: string; data_pagamento?: string;
  forma_pagamento: string; forma_pagamento_id: string; categoria: string;
  conta_financeira: string; conta_financeira_id: string; coluna_id: string;
  observacoes: string; origem?: 'manual' | 'closer' | 'pos-venda'; ordem: number; created_at: string;
  condicao_pagamento?: string; condicao_pagamento_id?: string;
  status_recebimento?: 'previsto' | 'realizado' | 'vencido';
  nfe_data_programada?: string; nfe_hora_programada?: string;
  closer_card_id?: string; origem_card_id?: string; origem_kanban?: string;
  // Campos de contato do Closer
  contato_nome?: string; contato_email?: string; contato_telefone?: string;
  // Campos da empresa do lead
  empresa_nome?: string; empresa_email?: string; empresa_telefone?: string;
  empresa_endereco?: string; empresa_numero?: string; empresa_complemento?: string;
  empresa_bairro?: string; empresa_cidade?: string; empresa_estado?: string; empresa_cep?: string;
}

const STATUS_RECEBIMENTO = [
  { value: 'previsto', label: 'Previsto', cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'realizado', label: 'Realizado', cor: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'vencido', label: 'Vencido', cor: 'bg-red-100 text-red-700 border-red-200' },
];

interface CondicaoPagamento {
  id: string;
  nome: string;
  descricao: string;
  parcelas: number;
  intervalo_dias: number;
  entrada_percentual: number;
  ativo: boolean;
}

interface KanbanColuna { id: string; empresa_id?: string; nome: string; cor: string; ordem: number; }
interface Empresa { id: string; nome: string; cnpj: string; tipo: string; }
interface FormaPagamento { id: string; nome: string; ativo: boolean; }
interface ContaBancaria { id: string; banco: string; agencia: string; conta: string; descricao: string; ativo: boolean; }
interface CentroCusto { id: string; nome: string; ativo: boolean; }
interface PlanoReceita { id: string; nome: string; descricao: string | null; tipo: string; ativo: boolean; }

interface RecebiveisProgramados {
  data: string;
  valor: number;
  parcela: number;
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

const TIPOS_ATIVIDADE = [
  { id: 'tarefa', label: 'Tarefa', icon: ClipboardList, cor: 'bg-blue-100 text-blue-700' },
  { id: 'email', label: 'E-mail', icon: Mail, cor: 'bg-purple-100 text-purple-700' },
  { id: 'ligacao', label: 'Ligação', icon: PhoneCall, cor: 'bg-green-100 text-green-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, cor: 'bg-emerald-100 text-emerald-700' },
  { id: 'reuniao', label: 'Reunião', icon: Video, cor: 'bg-orange-100 text-orange-700' },
  { id: 'visita', label: 'Visita', icon: MapPin, cor: 'bg-red-100 text-red-700' },
  { id: 'nota', label: 'Nota', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
];

const CORES_COLUNAS = [
  { key: 'yellow', value: '#eab308' }, { key: 'orange', value: '#f97316' }, { key: 'red', value: '#ef4444' },
  { key: 'green', value: '#22c55e' }, { key: 'blue', value: '#3b82f6' }, { key: 'purple', value: '#a855f7' },
  { key: 'pink', value: '#ec4899' }, { key: 'cyan', value: '#06b6d4' }, { key: 'indigo', value: '#6366f1' }, { key: 'slate', value: '#64748b' },
];

const CATEGORIAS_RECEITA = [
  { value: 'receitas_operacionais', label: 'Receitas Operacionais' },
  { value: 'outras_receitas_operacionais', label: 'Outras Receitas Operacionais' },
  { value: 'receitas_financeiras', label: 'Receitas Financeiras' },
  { value: 'receitas_nao_operacionais', label: 'Receitas não Operacionais' },
];

const colunasIniciais: KanbanColuna[] = [
  { id: 'col-1', nome: 'Nova Conta a Receber', cor: '#8b5cf6', ordem: 0 },
  { id: 'col-2', nome: 'Aguardando confirmação para emitir Nfe', cor: '#f59e0b', ordem: 1 },
  { id: 'col-3', nome: 'Emitir Nfe', cor: '#ef4444', ordem: 2 },
  { id: 'col-4', nome: 'Emitir Boleto', cor: '#ec4899', ordem: 3 },
  { id: 'col-5', nome: 'Programar Recebíveis', cor: '#3b82f6', ordem: 4 },
  { id: 'col-6', nome: 'Receber na próxima semana', cor: '#06b6d4', ordem: 5 },
  { id: 'col-7', nome: 'Receber amanhã', cor: '#14b8a6', ordem: 6 },
  { id: 'col-8', nome: 'Receber hoje', cor: '#f97316', ordem: 7 },
  { id: 'col-9', nome: 'Vencidos', cor: '#dc2626', ordem: 8 },
  { id: 'col-10', nome: 'Cobrança', cor: '#7c2d12', ordem: 9 },
  { id: 'col-11', nome: 'Recebidos', cor: '#22c55e', ordem: 10 },
];

// Nomes das colunas para identificação no fluxo
const COLUNA_NOVA_CONTA = 'Nova Conta a Receber';
const COLUNA_AGUARDANDO_NFE = 'Aguardando confirmação para emitir Nfe';
const COLUNA_EMITIR_NFE = 'Emitir Nfe';
const COLUNA_EMITIR_BOLETO = 'Emitir Boleto';
const COLUNA_PROGRAMAR_RECEBIVEIS = 'Programar Recebíveis';
const COLUNA_RECEBER_PROXIMA_SEMANA = 'Receber na próxima semana';
const COLUNA_RECEBER_AMANHA = 'Receber amanhã';
const COLUNA_RECEBER_HOJE = 'Receber hoje';
const COLUNA_VENCIDOS = 'Vencidos';
const COLUNA_COBRANCA = 'Cobrança';
const COLUNA_RECEBIDOS = 'Recebidos';

const initialContas: ContaReceber[] = [
  { id: '1', numero: 'CR-2025-001', cliente_id: '', cliente_nome: 'Empresa ABC Ltda', cliente_cnpj: '12.345.678/0001-90', servico_produto: 'Licença Vitalícia', valor: 43478.26, valor_pago: 0, data_emissao: '2024-12-01', data_competencia: '2024-12-01', data_recebimento: '2025-01-15', forma_pagamento: 'PIX', forma_pagamento_id: '', categoria: 'receitas_operacionais', conta_financeira: 'Banco do Brasil', conta_financeira_id: '', coluna_id: 'col-1', observacoes: '', origem: 'closer', ordem: 0, created_at: new Date().toISOString() },
  { id: '2', numero: 'CR-2025-002', cliente_id: '', cliente_nome: 'Tech Solutions SA', cliente_cnpj: '98.765.432/0001-10', servico_produto: 'Consultoria', valor: 15000, valor_pago: 5000, data_emissao: '2024-12-10', data_competencia: '2024-12-10', data_recebimento: '2025-01-10', forma_pagamento: 'Boleto', forma_pagamento_id: '', categoria: 'receitas_operacionais', conta_financeira: 'Itaú', conta_financeira_id: '', coluna_id: 'col-3', observacoes: '', origem: 'pos-venda', ordem: 0, created_at: new Date().toISOString() },
  { id: '3', numero: 'CR-2024-050', cliente_id: '', cliente_nome: 'Indústria XYZ', cliente_cnpj: '11.222.333/0001-44', servico_produto: 'Manutenção', valor: 5400, valor_pago: 0, data_emissao: '2024-11-01', data_competencia: '2024-11-01', data_recebimento: '2024-12-01', forma_pagamento: 'Cartão', forma_pagamento_id: '', categoria: 'outras_receitas_operacionais', conta_financeira: 'Banco do Brasil', conta_financeira_id: '', coluna_id: 'col-2', observacoes: '', origem: 'manual', ordem: 0, created_at: new Date().toISOString() },
  { id: '4', numero: 'CR-2024-045', cliente_id: '', cliente_nome: 'Comércio Beta', cliente_cnpj: '55.666.777/0001-88', servico_produto: 'Licença Módulo', valor: 25000, valor_pago: 25000, data_emissao: '2024-11-15', data_competencia: '2024-11-15', data_recebimento: '2024-12-15', data_pagamento: '2024-12-10', forma_pagamento: 'PIX', forma_pagamento_id: '', categoria: 'receitas_operacionais', conta_financeira: 'Banco do Brasil', conta_financeira_id: '', coluna_id: 'col-4', observacoes: '', origem: 'closer', ordem: 0, created_at: new Date().toISOString() },
];

function SortableCard({ conta, onEdit, onDelete, onView, onStatusChange, isDropped, isEmitirNfe, nfeProgramada }: { conta: ContaReceber; onEdit: () => void; onDelete: () => void; onView: () => void; onStatusChange: (status: 'previsto' | 'realizado' | 'vencido') => void; isDropped?: boolean; isEmitirNfe?: boolean; nfeProgramada?: boolean; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: conta.id, data: { type: 'card', conta } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms ease', opacity: isDragging ? 0.5 : 1 };
  const diasVencimento = Math.ceil((new Date(conta.data_recebimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isVencido = diasVencimento < 0;
  const statusAtual = STATUS_RECEBIMENTO.find(s => s.value === conta.status_recebimento) || STATUS_RECEBIMENTO[0];

  return (
    <div ref={setNodeRef} style={style} className={`relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group ${isEmitirNfe ? 'border-red-500 border-2 ring-2 ring-red-200 animate-pulse' : 'border-border hover:border-primary/50'}`}>
      {/* Alerta visual para cards na coluna "Emitir NFe" */}
      {isEmitirNfe && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg animate-bounce">
          <AlertTriangle className="h-4 w-4" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{conta.numero}</Badge>
            {conta.origem && <Badge variant="secondary" className="text-xs">{conta.origem === 'closer' ? 'Closer' : conta.origem === 'pos-venda' ? 'Pós-Venda' : 'Manual'}</Badge>}
            <Badge className={`text-xs border ${statusAtual.cor}`}>{statusAtual.label}</Badge>
          </div>
          {/* Alerta de NFe para emitir */}
          {isEmitirNfe && (
            <div className="bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-2 py-1 mb-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                NFe pendente de emissão!
              </p>
            </div>
          )}
          {/* Mostrar data programada de NFe */}
          {nfeProgramada && conta.nfe_data_programada && !isEmitirNfe && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 mb-2">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                NFe agendada: {format(new Date(conta.nfe_data_programada + 'T00:00:00'), 'dd/MM/yyyy')} às {conta.nfe_hora_programada || '08:00'}
              </p>
            </div>
          )}
          <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">{conta.cliente_nome}</h4>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{conta.servico_produto}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-primary">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {conta.valor_pago > 0 && conta.valor_pago < conta.valor && <span className="text-xs text-muted-foreground">Pago: R$ {conta.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground"><CalendarIcon className="h-3 w-3" /><span>{format(new Date(conta.data_recebimento), 'dd/MM/yyyy')}</span></div>
            {conta.valor_pago < conta.valor && <Badge variant={isVencido ? 'destructive' : diasVencimento <= 7 ? 'secondary' : 'outline'} className="text-xs">{isVencido ? `${Math.abs(diasVencimento)}d atraso` : diasVencimento === 0 ? 'Hoje' : `${diasVencimento}d`}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t"><CreditCard className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{conta.forma_pagamento}</span></div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}><Eye className="h-4 w-4 mr-2" />Visualizar</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <div className="flex flex-col gap-1">
                {STATUS_RECEBIMENTO.map(status => (
                  <DropdownMenuItem 
                    key={status.value} 
                    onClick={(e) => { e.stopPropagation(); onStatusChange(status.value as 'previsto' | 'realizado' | 'vencido'); }}
                    className={conta.status_recebimento === status.value ? 'bg-accent' : ''}
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

function SortableColumn({ coluna, cards, onAddCard, onEditCard, onDeleteCard, onViewCard, onStatusChange, onEditColumn, onDeleteColumn, droppedCardId, isEmitirNfeColuna, isAguardandoNfeColuna }: { coluna: KanbanColuna; cards: ContaReceber[]; onAddCard: (colunaId: string) => void; onEditCard: (card: ContaReceber) => void; onDeleteCard: (id: string) => void; onViewCard: (card: ContaReceber) => void; onStatusChange: (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => void; onEditColumn: (coluna: KanbanColuna) => void; onDeleteColumn: (id: string) => void; droppedCardId: string | null; isEmitirNfeColuna?: boolean; isAguardandoNfeColuna?: boolean; }) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: coluna.id, data: { type: 'column', coluna } });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `droppable-${coluna.id}`, data: { type: 'column', coluna } });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || 'transform 250ms ease', opacity: isDragging ? 0.5 : 1 };
  const total = cards.reduce((sum, c) => sum + c.valor, 0);

  return (
    <div ref={setSortableRef} style={style} className={`flex-shrink-0 w-80 bg-card/50 rounded-xl border border-border flex flex-col max-h-full transition-all ${isOver ? 'ring-2 ring-primary/50 border-primary/50 bg-primary/5' : ''} ${isDragging ? 'z-50 shadow-xl' : ''}`}>
      <div className="p-4 rounded-t-xl cursor-grab active:cursor-grabbing border-b border-border/50" style={{ borderTop: `3px solid ${coluna.cor}` }} {...attributes} {...listeners}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: coluna.cor }} /><h3 className="font-semibold text-sm truncate">{coluna.nome}</h3><Badge variant="secondary" className="text-xs flex-shrink-0 bg-muted/50">{cards.length}</Badge></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0 opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onAddCard(coluna.id)}><Plus className="h-4 w-4 mr-2" />Adicionar Recebível</DropdownMenuItem>
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
          {cards.map((card) => (<SortableCard key={card.id} conta={card} onEdit={() => onEditCard(card)} onDelete={() => onDeleteCard(card.id)} onView={() => onViewCard(card)} onStatusChange={(status) => onStatusChange(card.id, status)} isDropped={droppedCardId === card.id} isEmitirNfe={isEmitirNfeColuna} nfeProgramada={isAguardandoNfeColuna && !!card.nfe_data_programada} />))}
        </SortableContext>
        {cards.length === 0 && (<div className={`text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}><Target className="h-6 w-6 mx-auto mb-2 opacity-50" /><p>Arraste recebíveis para cá</p></div>)}
      </div>
    </div>
  );
}

export function AdminContasReceber() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { empresaIdEfetivo, isInEmpresaMode } = useEmpresaEfetiva();
  const empresaId = isInEmpresaMode ? empresaIdEfetivo : (profile?.role === 'admin_vertical' ? TORIQ_EMPRESA_ID : profile?.empresa_id);

  const [colunas, setColunas] = useState<KanbanColuna[]>([]);
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<ContaReceber | null>(null);
  const [activeColuna, setActiveColuna] = useState<KanbanColuna | null>(null);
  const [dragOriginColunaId, setDragOriginColunaId] = useState<string | null>(null);
  const [droppedCardId, setDroppedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [planosReceita, setPlanosReceita] = useState<PlanoReceita[]>([]);
  
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [colunaDialogOpen, setColunaDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContaReceber | null>(null);
  const [editingColuna, setEditingColuna] = useState<KanbanColuna | null>(null);
  const [viewingCard, setViewingCard] = useState<ContaReceber | null>(null);
  const [selectedColunaId, setSelectedColunaId] = useState<string | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'coluna' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  // Estados para o novo dialog de detalhes
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [atividadeFormExpanded, setAtividadeFormExpanded] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
  const [novaAtividadeDialogOpen, setNovaAtividadeDialogOpen] = useState(false);

  // Estados para Condições de Pagamento
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  
  // Estados para Programar Recebíveis
  const [programarDialogOpen, setProgramarDialogOpen] = useState(false);
  const [programarDatas, setProgramarDatas] = useState<string[]>([]);
  const [programarLoading, setProgramarLoading] = useState(false);
  const [isRecorrente, setIsRecorrente] = useState(false);

  // Estados para Confirmar Recebimento
  const [confirmarRecebimentoOpen, setConfirmarRecebimentoOpen] = useState(false);
  const [contaParaReceber, setContaParaReceber] = useState<ContaReceber | null>(null);
  const [dataRecebimentoConfirmacao, setDataRecebimentoConfirmacao] = useState<Date | undefined>(undefined);
  const [confirmandoRecebimento, setConfirmandoRecebimento] = useState(false);

  // Estados para Programar Emissão NFe
  const [programarNfeDialogOpen, setProgramarNfeDialogOpen] = useState(false);
  const [nfeDataEmissao, setNfeDataEmissao] = useState<Date | undefined>(undefined);
  const [nfeHoraEmissao, setNfeHoraEmissao] = useState<string>('08:00');
  const [salvandoNfe, setSalvandoNfe] = useState(false);

  // Estados para fluxo de movimentação de cards
  const [cardPendenteMovimentacao, setCardPendenteMovimentacao] = useState<ContaReceber | null>(null);
  const [colunaDestinoMovimentacao, setColunaDestinoMovimentacao] = useState<string | null>(null);
  const [aguardandoNfeDialogOpen, setAguardandoNfeDialogOpen] = useState(false);
  const [programarRecebiveisDialogOpen, setProgramarRecebiveisDialogOpen] = useState(false);

  // Estados para dialog de justificativa de mudança de etapa
  const [mudancaEtapaDialog, setMudancaEtapaDialog] = useState<{
    open: boolean;
    colunaDestino: KanbanColuna | null;
    colunaOrigem: KanbanColuna | null;
    etapasMovidas: number;
    direcao: 'avanco' | 'retrocesso';
    cardId: string | null;
  }>({ open: false, colunaDestino: null, colunaOrigem: null, etapasMovidas: 0, direcao: 'avanco', cardId: null });
  const [justificativaMudanca, setJustificativaMudanca] = useState('');
  const [movimentacoesKey, setMovimentacoesKey] = useState(0); // Key para forçar atualização do componente de movimentações

  const [cardForm, setCardForm] = useState({ cliente_id: '', cliente_nome: '', cliente_cnpj: '', servico_produto: '', valor: 0, valor_pago: 0, data_competencia: '', data_recebimento: '', forma_pagamento_id: '', forma_pagamento: '', categoria: '', conta_financeira_id: '', conta_financeira: '', observacoes: '', origem: 'manual' as 'manual' | 'closer' | 'pos-venda', condicao_pagamento_id: '', condicao_pagamento: '' });
  const [colunaForm, setColunaForm] = useState({ nome: '', cor: '#6366f1' });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => { if (empresaId) { loadData(); } }, [empresaId]);

  // REGRA 3: Verificar cards que devem ser movidos para "Emitir NFe" quando chegar o dia agendado
  useEffect(() => {
    const verificarCardsParaEmitirNfe = async () => {
      if (!colunas.length || !contas.length) return;
      
      const colunaAguardandoNfe = colunas.find(c => c.nome === COLUNA_AGUARDANDO_NFE);
      const colunaEmitirNfe = colunas.find(c => c.nome === COLUNA_EMITIR_NFE);
      
      if (!colunaAguardandoNfe || !colunaEmitirNfe) return;
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      
      // Encontrar cards na coluna "Aguardando NFe" que têm data de emissão para hoje ou anterior
      const cardsParaMover = contas.filter(c => 
        c.coluna_id === colunaAguardandoNfe.id && 
        c.nfe_data_programada && 
        c.nfe_data_programada <= hoje
      );
      
      if (cardsParaMover.length > 0) {
        // Mover cards automaticamente para "Emitir NFe"
        for (const card of cardsParaMover) {
          try {
            await (supabase as any).from('contas_receber').update({
              coluna_id: colunaEmitirNfe.id,
            }).eq('id', card.id);
          } catch (e) {
            console.error('Erro ao mover card para Emitir NFe:', e);
          }
        }
        
        // Atualizar estado local
        setContas(prev => prev.map(c => 
          cardsParaMover.some(cm => cm.id === c.id) 
            ? { ...c, coluna_id: colunaEmitirNfe.id } 
            : c
        ));
        
        if (cardsParaMover.length === 1) {
          toast({ 
            title: '⚠️ NFe para emitir!', 
            description: `O recebível ${cardsParaMover[0].numero} foi movido para "Emitir NFe"`,
            variant: 'destructive'
          });
        } else {
          toast({ 
            title: '⚠️ NFes para emitir!', 
            description: `${cardsParaMover.length} recebíveis foram movidos para "Emitir NFe"`,
            variant: 'destructive'
          });
        }
      }
    };
    
    verificarCardsParaEmitirNfe();
  }, [colunas, contas.length]); // Executa quando colunas ou quantidade de contas mudar

  // REGRAS 6-10: Automação de movimentação baseada em datas de vencimento
  useEffect(() => {
    const verificarCardsParaMovimentacao = async () => {
      if (!colunas.length || !contas.length) return;
      
      // Encontrar todas as colunas necessárias
      const colunaProximaSemana = colunas.find(c => c.nome === COLUNA_RECEBER_PROXIMA_SEMANA);
      const colunaAmanha = colunas.find(c => c.nome === COLUNA_RECEBER_AMANHA);
      const colunaHoje = colunas.find(c => c.nome === COLUNA_RECEBER_HOJE);
      const colunaVencidos = colunas.find(c => c.nome === COLUNA_VENCIDOS);
      const colunaCobranca = colunas.find(c => c.nome === COLUNA_COBRANCA);
      const colunaRecebidos = colunas.find(c => c.nome === COLUNA_RECEBIDOS);
      
      // Colunas que não devem ser afetadas pela automação de datas
      const colunasExcluidas = [
        colunas.find(c => c.nome === COLUNA_NOVA_CONTA)?.id,
        colunas.find(c => c.nome === COLUNA_AGUARDANDO_NFE)?.id,
        colunas.find(c => c.nome === COLUNA_EMITIR_NFE)?.id,
        colunas.find(c => c.nome === COLUNA_EMITIR_BOLETO)?.id,
        colunas.find(c => c.nome === COLUNA_PROGRAMAR_RECEBIVEIS)?.id,
        colunaRecebidos?.id,
      ].filter(Boolean);
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const proximaSemanaInicio = new Date(hoje);
      proximaSemanaInicio.setDate(proximaSemanaInicio.getDate() + 2);
      const proximaSemanaFim = new Date(hoje);
      proximaSemanaFim.setDate(proximaSemanaFim.getDate() + 7);
      
      const cardsParaAtualizar: { id: string; novaColuna: string }[] = [];
      
      for (const card of contas) {
        // Pular cards que já estão em colunas excluídas ou já foram pagos
        if (colunasExcluidas.includes(card.coluna_id)) continue;
        if (card.valor_pago >= card.valor) continue; // Já foi pago totalmente
        
        const dataRecebimento = new Date(card.data_recebimento + 'T00:00:00');
        const diffDias = Math.ceil((dataRecebimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        let novaColunaId: string | undefined;
        
        // REGRA 10: Vencidos há mais de 3 dias -> Cobrança
        if (diffDias < -3 && colunaCobranca && card.coluna_id !== colunaCobranca.id) {
          novaColunaId = colunaCobranca.id;
        }
        // REGRA 9: Vencidos (1-3 dias) -> Vencidos
        else if (diffDias < 0 && diffDias >= -3 && colunaVencidos && card.coluna_id !== colunaVencidos.id && card.coluna_id !== colunaCobranca?.id) {
          novaColunaId = colunaVencidos.id;
        }
        // REGRA 8: Vence hoje -> Receber hoje
        else if (diffDias === 0 && colunaHoje && card.coluna_id !== colunaHoje.id) {
          novaColunaId = colunaHoje.id;
        }
        // REGRA 7: Vence amanhã -> Receber amanhã
        else if (diffDias === 1 && colunaAmanha && card.coluna_id !== colunaAmanha.id) {
          novaColunaId = colunaAmanha.id;
        }
        // REGRA 6: Vence na próxima semana (2-7 dias) -> Receber na próxima semana
        else if (diffDias >= 2 && diffDias <= 7 && colunaProximaSemana && card.coluna_id !== colunaProximaSemana.id) {
          novaColunaId = colunaProximaSemana.id;
        }
        
        if (novaColunaId && novaColunaId !== card.coluna_id) {
          cardsParaAtualizar.push({ id: card.id, novaColuna: novaColunaId });
        }
      }
      
      // Atualizar cards no banco e no estado local
      if (cardsParaAtualizar.length > 0) {
        for (const { id, novaColuna } of cardsParaAtualizar) {
          try {
            await (supabase as any).from('contas_receber').update({
              coluna_id: novaColuna,
            }).eq('id', id);
          } catch (e) {
            console.error('Erro ao mover card automaticamente:', e);
          }
        }
        
        // Atualizar estado local
        setContas(prev => prev.map(c => {
          const atualizacao = cardsParaAtualizar.find(a => a.id === c.id);
          return atualizacao ? { ...c, coluna_id: atualizacao.novaColuna } : c;
        }));
        
        // Notificações
        const cardsHoje = cardsParaAtualizar.filter(c => c.novaColuna === colunaHoje?.id);
        const cardsVencidos = cardsParaAtualizar.filter(c => c.novaColuna === colunaVencidos?.id);
        const cardsCobranca = cardsParaAtualizar.filter(c => c.novaColuna === colunaCobranca?.id);
        
        if (cardsHoje.length > 0) {
          toast({ 
            title: '📅 Recebíveis para hoje!', 
            description: `${cardsHoje.length} recebível(is) vence(m) hoje`,
          });
        }
        if (cardsVencidos.length > 0) {
          toast({ 
            title: '⚠️ Recebíveis vencidos!', 
            description: `${cardsVencidos.length} recebível(is) vencido(s)`,
            variant: 'destructive'
          });
        }
        if (cardsCobranca.length > 0) {
          toast({ 
            title: '🚨 Recebíveis para cobrança!', 
            description: `${cardsCobranca.length} recebível(is) vencido(s) há mais de 3 dias`,
            variant: 'destructive'
          });
        }
      }
    };
    
    verificarCardsParaMovimentacao();
  }, [colunas, contas.length]); // Executa quando colunas ou quantidade de contas mudar

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadColunas(), loadContas(), loadEmpresas(), loadFormasPagamento(), loadContasBancarias(), loadCentrosCusto(), loadPlanosReceita(), loadCondicoesPagamento()]);
    setLoading(false);
  };

  const loadColunas = async () => {
    try {
      const { data, error } = await (supabase as any).from('contas_receber_colunas').select('*').eq('empresa_id', empresaId).order('ordem');
      if (error) throw error;
      if (data && data.length > 0) {
        setColunas(data);
      } else {
        // Criar colunas padrão se não existirem
        const colunasPadrao = [
          { empresa_id: empresaId, nome: COLUNA_NOVA_CONTA, cor: '#8b5cf6', ordem: 0 },
          { empresa_id: empresaId, nome: COLUNA_AGUARDANDO_NFE, cor: '#f59e0b', ordem: 1 },
          { empresa_id: empresaId, nome: COLUNA_EMITIR_NFE, cor: '#ef4444', ordem: 2 },
          { empresa_id: empresaId, nome: COLUNA_EMITIR_BOLETO, cor: '#ec4899', ordem: 3 },
          { empresa_id: empresaId, nome: COLUNA_PROGRAMAR_RECEBIVEIS, cor: '#3b82f6', ordem: 4 },
          { empresa_id: empresaId, nome: COLUNA_RECEBER_PROXIMA_SEMANA, cor: '#06b6d4', ordem: 5 },
          { empresa_id: empresaId, nome: COLUNA_RECEBER_AMANHA, cor: '#14b8a6', ordem: 6 },
          { empresa_id: empresaId, nome: COLUNA_RECEBER_HOJE, cor: '#f97316', ordem: 7 },
          { empresa_id: empresaId, nome: COLUNA_VENCIDOS, cor: '#dc2626', ordem: 8 },
          { empresa_id: empresaId, nome: COLUNA_COBRANCA, cor: '#7c2d12', ordem: 9 },
          { empresa_id: empresaId, nome: COLUNA_RECEBIDOS, cor: '#22c55e', ordem: 10 },
        ];
        const { data: novasColunas, error: insertError } = await (supabase as any).from('contas_receber_colunas').insert(colunasPadrao).select();
        if (insertError) throw insertError;
        setColunas(novasColunas || []);
      }
    } catch (e) { console.error('Erro ao carregar colunas:', e); setColunas(colunasIniciais); }
  };

  const loadContas = async () => {
    try {
      const { data, error } = await (supabase as any).from('contas_receber').select('*').eq('empresa_id', empresaId).eq('arquivado', false).order('ordem');
      if (error) throw error;
      setContas(data || []);
    } catch (e) { console.error('Erro ao carregar contas:', e); setContas([]); }
  };

  const loadEmpresas = async () => { 
    try { 
      // Buscar empresas cadastradas (tabela empresas)
      const { data: empresasData, error: empresasError } = await (supabase as any)
        .from('empresas')
        .select('id, nome, cnpj')
        .order('nome');
      
      if (empresasError) throw empresasError;
      
      // Mapear para o formato esperado
      const empresasMapeadas = (empresasData || []).map((emp: any) => ({
        id: emp.id,
        nome: emp.nome,
        cnpj: emp.cnpj || '',
        tipo: 'empresa'
      }));
      
      setEmpresas(empresasMapeadas); 
    } catch (e) { 
      console.error('Erro ao carregar empresas:', e); 
      setEmpresas([]);
    } 
  };
  const loadFormasPagamento = async () => { setFormasPagamento([{ id: '1', nome: 'PIX', ativo: true }, { id: '2', nome: 'Boleto', ativo: true }, { id: '3', nome: 'Cartão de Crédito', ativo: true }, { id: '4', nome: 'Cartão de Débito', ativo: true }, { id: '5', nome: 'Transferência', ativo: true }]); };
  const loadContasBancarias = async () => { try { const { data } = await (supabase as any).from('contas_bancarias').select('id, banco, agencia, conta, tipo, ativo').eq('empresa_id', empresaId).eq('ativo', true).order('banco'); setContasBancarias(data || []); } catch (e) { console.error('Erro ao carregar contas bancárias:', e); setContasBancarias([]); } };
  const loadCentrosCusto = async () => { setCentrosCusto([{ id: '1', nome: 'Licença de Software', ativo: true }, { id: '2', nome: 'Consultoria', ativo: true }, { id: '3', nome: 'Manutenção', ativo: true }, { id: '4', nome: 'Treinamento', ativo: true }]); };
  const loadPlanosReceita = async () => { try { const { data } = await (supabase as any).from('plano_receitas').select('id, nome, descricao, tipo, ativo').eq('ativo', true).eq('tipo', 'receitas_operacionais').order('nome'); setPlanosReceita(data || []); } catch (e) { console.error(e); } };
  const loadCondicoesPagamento = async () => { try { const { data } = await (supabase as any).from('condicoes_pagamento').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'); setCondicoesPagamento(data || []); } catch (e) { console.error(e); } };

  const handleClienteChange = (clienteId: string) => { const emp = empresas.find(e => e.id === clienteId); if (emp) setCardForm(prev => ({ ...prev, cliente_id: clienteId, cliente_nome: emp.nome, cliente_cnpj: emp.cnpj || '' })); };
  const handleFormaPagamentoChange = (id: string) => { const f = formasPagamento.find(x => x.id === id); if (f) setCardForm(prev => ({ ...prev, forma_pagamento_id: id, forma_pagamento: f.nome })); };
  const handleContaFinanceiraChange = (id: string) => { const c = contasBancarias.find(x => x.id === id); if (c) setCardForm(prev => ({ ...prev, conta_financeira_id: id, conta_financeira: `${c.banco} - ${c.agencia}` })); };
  const handleCondicaoPagamentoChange = (id: string) => { const c = condicoesPagamento.find(x => x.id === id); if (c) setCardForm(prev => ({ ...prev, condicao_pagamento_id: id, condicao_pagamento: c.nome })); };

  const filteredContas = useMemo(() => contas.filter(c => { const ms = !searchTerm || c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase()); const mc = filterCategoria === 'all' || c.categoria === filterCategoria; const mo = filterOrigem === 'all' || c.origem === filterOrigem; return ms && mc && mo; }), [contas, searchTerm, filterCategoria, filterOrigem]);
  const contasByColuna = useMemo(() => colunas.reduce((acc, col) => { acc[col.id] = filteredContas.filter(c => c.coluna_id === col.id); return acc; }, {} as Record<string, ContaReceber[]>), [filteredContas, colunas]);
  const totals = useMemo(() => {
    // Colunas que contam como "A Receber" (Nova Conta até Receber Hoje)
    const colunasAReceber = [
      COLUNA_NOVA_CONTA,
      COLUNA_AGUARDANDO_NFE,
      COLUNA_EMITIR_NFE,
      COLUNA_EMITIR_BOLETO,
      COLUNA_PROGRAMAR_RECEBIVEIS,
      COLUNA_RECEBER_PROXIMA_SEMANA,
      COLUNA_RECEBER_AMANHA,
      COLUNA_RECEBER_HOJE
    ];
    const idsColunasAReceber = colunas.filter(c => colunasAReceber.includes(c.nome)).map(c => c.id);
    const colunaRecebidos = colunas.find(c => c.nome === COLUNA_RECEBIDOS);
    const colunaVencidos = colunas.find(c => c.nome === COLUNA_VENCIDOS);
    const colunaCobranca = colunas.find(c => c.nome === COLUNA_COBRANCA);
    
    return {
      total: contas.filter(c => idsColunasAReceber.includes(c.coluna_id)).reduce((s, c) => s + Number(c.valor || 0), 0),
      recebido: contas.filter(c => c.coluna_id === colunaRecebidos?.id).reduce((s, c) => s + Number(c.valor || 0), 0),
      vencido: contas.filter(c => c.coluna_id === colunaVencidos?.id).reduce((s, c) => s + Number(c.valor || 0), 0),
      cobranca: contas.filter(c => c.coluna_id === colunaCobranca?.id).reduce((s, c) => s + Number(c.valor || 0), 0)
    };
  }, [contas, colunas]);

  const handleDragStart = (e: DragStartEvent) => { const d = e.active.data.current; if (d?.type === 'card') { setActiveCard(d.conta); setDragOriginColunaId(d.conta.coluna_id); } else if (d?.type === 'column') setActiveColuna(d.coluna); };
  const handleDragOver = (e: DragOverEvent) => { const { active, over } = e; if (!over) return; const ad = active.data.current; if (ad?.type !== 'card') return; let tid: string | null = null; const od = over.data.current; if (od?.type === 'column') tid = od.coluna.id; else if (od?.type === 'card') tid = od.conta.coluna_id; else if (over.id.toString().startsWith('droppable-')) tid = over.id.toString().replace('droppable-', ''); if (!tid) return; const ac = contas.find(c => c.id === active.id); if (!ac || ac.coluna_id === tid) return; setContas(prev => prev.map(c => c.id === active.id ? { ...c, coluna_id: tid! } : c)); };
  // Função auxiliar para encontrar coluna por nome
  const findColunaByNome = (nome: string) => colunas.find(c => c.nome.toLowerCase() === nome.toLowerCase());

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const savedOriginColunaId = dragOriginColunaId;
    setActiveCard(null); setActiveColuna(null); setDragOriginColunaId(null);
    if (!over) return;
    const ad = active.data.current; const od = over.data.current;
    if (ad?.type === 'column' && od?.type === 'column') {
      const ai = colunas.findIndex(c => c.id === active.id); const oi = colunas.findIndex(c => c.id === over.id);
      if (ai !== oi) {
        const reordered = arrayMove(colunas, ai, oi).map((c, i) => ({ ...c, ordem: i }));
        setColunas(reordered);
        try { for (const col of reordered) { await (supabase as any).from('contas_receber_colunas').update({ ordem: col.ordem }).eq('id', col.id); } } catch (e) { console.error(e); }
        toast({ title: 'Coluna reordenada!' });
      }
      return;
    }
    if (ad?.type === 'card') {
      const card = contas.find(c => c.id === active.id);
      if (card && savedOriginColunaId && card.coluna_id !== savedOriginColunaId) {
        const colunaDestino = colunas.find(c => c.id === card.coluna_id);
        const colunaOrigem = colunas.find(c => c.id === savedOriginColunaId);
        
        // REGRA 2: Ao mover para "Aguardando confirmação para emitir Nfe" - abrir popup para agendar data
        if (colunaDestino?.nome === COLUNA_AGUARDANDO_NFE) {
          // Reverter a movimentação visual temporariamente
          setContas(prev => prev.map(c => c.id === card.id ? { ...c, coluna_id: savedOriginColunaId } : c));
          // Guardar card e coluna destino para processar após o popup
          setCardPendenteMovimentacao(card);
          setColunaDestinoMovimentacao(card.coluna_id);
          setNfeDataEmissao(undefined);
          setNfeHoraEmissao('08:00');
          setAguardandoNfeDialogOpen(true);
          return;
        }
        
        // REGRA 4: Ao mover para "Programar Recebíveis" - exibir aviso para programar data
        if (colunaDestino?.nome === COLUNA_PROGRAMAR_RECEBIVEIS) {
          // Reverter a movimentação visual temporariamente
          setContas(prev => prev.map(c => c.id === card.id ? { ...c, coluna_id: savedOriginColunaId } : c));
          // Guardar card e coluna destino para processar após o popup
          setCardPendenteMovimentacao(card);
          setColunaDestinoMovimentacao(card.coluna_id);
          // Configurar datas para programar recebíveis
          const condicao = condicoesPagamento.find(c => c.id === card.condicao_pagamento_id);
          if (condicao) {
            const datas: string[] = [];
            const dataBase = card.data_recebimento ? new Date(card.data_recebimento + 'T00:00:00') : new Date();
            for (let i = 0; i < condicao.parcelas; i++) {
              const novaData = new Date(dataBase);
              novaData.setDate(novaData.getDate() + (condicao.intervalo_dias * i));
              datas.push(format(novaData, 'yyyy-MM-dd'));
            }
            setProgramarDatas(datas);
          } else {
            setProgramarDatas([card.data_recebimento || format(new Date(), 'yyyy-MM-dd')]);
          }
          setIsRecorrente(false);
          setProgramarRecebiveisDialogOpen(true);
          return;
        }
        
        // Verificar se é retrocesso ou múltiplas etapas (precisa de justificativa)
        const indexOrigem = colunas.findIndex(c => c.id === savedOriginColunaId);
        const indexDestino = colunas.findIndex(c => c.id === card.coluna_id);
        const etapasMovidas = Math.abs(indexDestino - indexOrigem);
        const isRetrocesso = indexDestino < indexOrigem;
        
        console.log('=== DRAG END - Verificando justificativa ===');
        console.log('indexOrigem:', indexOrigem, 'indexDestino:', indexDestino);
        console.log('etapasMovidas:', etapasMovidas, 'isRetrocesso:', isRetrocesso);
        console.log('colunaOrigem:', colunaOrigem?.nome, 'colunaDestino:', colunaDestino?.nome);
        
        // Se é retrocesso OU avançar mais de 1 etapa, pedir justificativa
        if ((isRetrocesso || etapasMovidas > 1) && colunaOrigem && colunaDestino) {
          console.log('>>> ABRINDO DIALOG DE JUSTIFICATIVA');
          // Reverter a movimentação visual temporariamente
          setContas(prev => prev.map(c => c.id === card.id ? { ...c, coluna_id: savedOriginColunaId } : c));
          setMudancaEtapaDialog({
            open: true,
            colunaDestino,
            colunaOrigem,
            etapasMovidas,
            direcao: isRetrocesso ? 'retrocesso' : 'avanco',
            cardId: card.id,
          });
          setJustificativaMudanca('');
          return;
        }
        
        // Movimentação normal (1 etapa para frente)
        setDroppedCardId(active.id as string); setTimeout(() => setDroppedCardId(null), 500);
        try { 
          await (supabase as any).from('contas_receber').update({ coluna_id: card.coluna_id }).eq('id', card.id);
          
          // Registrar movimentação como atividade
          await registrarMovimentacaoContaReceber(
            card.id,
            colunaOrigem?.nome || 'Coluna anterior',
            colunaDestino?.nome || 'Nova coluna',
            savedOriginColunaId,
            card.coluna_id
          );
        } catch (e) { console.error(e); }
        toast({ title: 'Recebível movido!' });
      }
    }
  };

  // Função para registrar movimentação no Contas a Receber
  const registrarMovimentacaoContaReceber = async (
    contaId: string,
    colunaOrigemNome: string,
    colunaDestinoNome: string,
    colunaOrigemId: string,
    colunaDestinoId: string,
    justificativa?: string,
    etapasMovidas?: number,
    direcao?: 'avanco' | 'retrocesso'
  ) => {
    try {
      // Construir descrição com informação de etapas
      let descricao = `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}"`;
      
      if (etapasMovidas && etapasMovidas > 1) {
        if (direcao === 'retrocesso') {
          descricao = `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}" (voltou ${etapasMovidas} etapas)`;
        } else {
          descricao = `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}" (pulou ${etapasMovidas} etapas)`;
        }
      } else if (direcao === 'retrocesso') {
        descricao = `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}" (voltou 1 etapa)`;
      }
      
      if (justificativa) {
        descricao += `. Justificativa: ${justificativa}`;
      }
      
      // Registrar na tabela de movimentações
      await (supabase as any).from('contas_receber_movimentacoes').insert({
        conta_id: contaId,
        usuario_id: profile?.id,
        tipo: 'mudanca_coluna',
        descricao,
        coluna_origem_id: colunaOrigemId,
        coluna_destino_id: colunaDestinoId,
        dados_anteriores: { coluna_nome: colunaOrigemNome },
        dados_novos: { coluna_nome: colunaDestinoNome, justificativa, etapasMovidas, direcao },
      });
      
      // Registrar também como atividade concluída
      await (supabase as any).from('contas_receber_atividades').insert({
        conta_id: contaId,
        usuario_id: profile?.id,
        tipo: 'movimentacao',
        descricao,
        status: 'concluida',
      });
    } catch (e) {
      console.error('Erro ao registrar movimentação:', e);
    }
  };

  // Função para confirmar mudança de etapa com justificativa
  const handleConfirmarMudancaEtapa = async () => {
    if (!mudancaEtapaDialog.cardId || !mudancaEtapaDialog.colunaDestino || !mudancaEtapaDialog.colunaOrigem) return;
    
    // Justificativa só é obrigatória para retrocesso
    if (mudancaEtapaDialog.direcao === 'retrocesso' && !justificativaMudanca.trim()) {
      toast({ title: 'Informe a justificativa', variant: 'destructive' });
      return;
    }
    
    try {
      // Atualizar card no banco
      await (supabase as any).from('contas_receber').update({ 
        coluna_id: mudancaEtapaDialog.colunaDestino.id 
      }).eq('id', mudancaEtapaDialog.cardId);
      
      // Atualizar estado local das contas
      setContas(prev => prev.map(c => 
        c.id === mudancaEtapaDialog.cardId 
          ? { ...c, coluna_id: mudancaEtapaDialog.colunaDestino!.id } 
          : c
      ));
      
      // Atualizar viewingCard se estiver aberto
      const cardAtualizado = viewingCard && viewingCard.id === mudancaEtapaDialog.cardId;
      if (cardAtualizado) {
        setViewingCard({ ...viewingCard, coluna_id: mudancaEtapaDialog.colunaDestino.id });
      }
      
      // Registrar movimentação com justificativa e informação de etapas
      await registrarMovimentacaoContaReceber(
        mudancaEtapaDialog.cardId,
        mudancaEtapaDialog.colunaOrigem.nome,
        mudancaEtapaDialog.colunaDestino.nome,
        mudancaEtapaDialog.colunaOrigem.id,
        mudancaEtapaDialog.colunaDestino.id,
        justificativaMudanca || undefined,
        mudancaEtapaDialog.etapasMovidas,
        mudancaEtapaDialog.direcao
      );
      
      // Recarregar atividades e movimentações se o card estiver aberto para atualizar o histórico
      if (cardAtualizado && viewingCard) {
        fetchAtividades(viewingCard.id, viewingCard.origem_card_id, viewingCard.origem_kanban, viewingCard.closer_card_id);
        setMovimentacoesKey(prev => prev + 1); // Forçar atualização do componente de movimentações
      }
      
      toast({ title: 'Recebível movido!' });
      setMudancaEtapaDialog({ open: false, colunaDestino: null, colunaOrigem: null, etapasMovidas: 0, direcao: 'avanco', cardId: null });
      setJustificativaMudanca('');
    } catch (e) {
      console.error('Erro ao mover card:', e);
      toast({ title: 'Erro ao mover recebível', variant: 'destructive' });
    }
  };

  // Função para confirmar movimentação para "Aguardando NFe" após agendar data
  const handleConfirmarAguardandoNfe = async () => {
    if (!cardPendenteMovimentacao || !colunaDestinoMovimentacao || !nfeDataEmissao) {
      toast({ title: 'Selecione a data de emissão da NFe', variant: 'destructive' });
      return;
    }
    setSalvandoNfe(true);
    try {
      const dataFormatada = format(nfeDataEmissao, 'yyyy-MM-dd');
      await (supabase as any).from('contas_receber').update({
        coluna_id: colunaDestinoMovimentacao,
        nfe_data_programada: dataFormatada,
        nfe_hora_programada: nfeHoraEmissao,
      }).eq('id', cardPendenteMovimentacao.id);
      
      setContas(prev => prev.map(c => 
        c.id === cardPendenteMovimentacao.id 
          ? { ...c, coluna_id: colunaDestinoMovimentacao, nfe_data_programada: dataFormatada, nfe_hora_programada: nfeHoraEmissao } 
          : c
      ));
      
      toast({ title: 'Recebível movido e emissão de NFe agendada!' });
      setAguardandoNfeDialogOpen(false);
      setCardPendenteMovimentacao(null);
      setColunaDestinoMovimentacao(null);
    } catch (e) { 
      console.error('Erro ao mover card:', e); 
      toast({ title: 'Erro ao mover recebível', variant: 'destructive' }); 
    }
    setSalvandoNfe(false);
  };

  // Função para confirmar movimentação para "Programar Recebíveis" e depois mover para "A Receber"
  const handleConfirmarProgramarRecebiveis = async () => {
    if (!cardPendenteMovimentacao || programarDatas.length === 0) {
      toast({ title: 'Configure as datas de recebimento', variant: 'destructive' });
      return;
    }
    setProgramarLoading(true);
    try {
      // Encontrar a coluna "Receber na próxima semana" para mover o card após programar
      const colunaAReceber = findColunaByNome(COLUNA_RECEBER_PROXIMA_SEMANA);
      const colunaDestinoFinal = colunaAReceber?.id || colunaDestinoMovimentacao;
      
      await (supabase as any).from('contas_receber').update({
        coluna_id: colunaDestinoFinal,
        data_recebimento: programarDatas[0],
      }).eq('id', cardPendenteMovimentacao.id);
      
      setContas(prev => prev.map(c => 
        c.id === cardPendenteMovimentacao.id 
          ? { ...c, coluna_id: colunaDestinoFinal!, data_recebimento: programarDatas[0] } 
          : c
      ));
      
      toast({ title: 'Recebimento programado! Card movido para "A Receber"' });
      setProgramarRecebiveisDialogOpen(false);
      setCardPendenteMovimentacao(null);
      setColunaDestinoMovimentacao(null);
    } catch (e) { 
      console.error('Erro ao programar recebíveis:', e); 
      toast({ title: 'Erro ao programar recebíveis', variant: 'destructive' }); 
    }
    setProgramarLoading(false);
  };

  // Cancelar movimentação pendente
  const handleCancelarMovimentacao = () => {
    setAguardandoNfeDialogOpen(false);
    setProgramarRecebiveisDialogOpen(false);
    setCardPendenteMovimentacao(null);
    setColunaDestinoMovimentacao(null);
  };

  const handleAddCard = (colunaId: string) => { setEditingCard(null); setSelectedColunaId(colunaId); setCardForm({ cliente_id: '', cliente_nome: '', cliente_cnpj: '', servico_produto: '', valor: 0, valor_pago: 0, data_competencia: '', data_recebimento: '', forma_pagamento_id: '', forma_pagamento: '', categoria: '', conta_financeira_id: '', conta_financeira: '', observacoes: '', origem: 'manual', condicao_pagamento_id: '', condicao_pagamento: '' }); setCardDialogOpen(true); };
  const handleEditCard = (card: ContaReceber) => { 
    setEditingCard(card); 
    setSelectedColunaId(card.coluna_id); 
    // Buscar forma_pagamento_id pelo nome se não tiver o ID
    let formaPagamentoId = card.forma_pagamento_id || '';
    if (!formaPagamentoId && card.forma_pagamento) {
      const formaEncontrada = formasPagamento.find(f => f.nome.toLowerCase() === card.forma_pagamento.toLowerCase());
      if (formaEncontrada) formaPagamentoId = formaEncontrada.id;
    }
    // Buscar CNPJ pelo nome do cliente se não tiver CNPJ
    let clienteCnpj = card.cliente_cnpj || '';
    let clienteId = card.cliente_id || '';
    if (!clienteCnpj && card.cliente_nome && empresas.length > 0) {
      const clienteEncontrado = empresas.find(e => 
        e.nome.toLowerCase() === card.cliente_nome.toLowerCase() ||
        e.nome.toLowerCase().includes(card.cliente_nome.toLowerCase()) ||
        card.cliente_nome.toLowerCase().includes(e.nome.toLowerCase())
      );
      if (clienteEncontrado) {
        clienteCnpj = clienteEncontrado.cnpj || '';
        if (!clienteId) clienteId = clienteEncontrado.id;
      }
    }
    setCardForm({ 
      cliente_id: clienteId, 
      cliente_nome: card.cliente_nome, 
      cliente_cnpj: clienteCnpj, 
      servico_produto: card.servico_produto, 
      valor: card.valor, 
      valor_pago: card.valor_pago, 
      data_competencia: card.data_competencia, 
      data_recebimento: card.data_recebimento, 
      forma_pagamento_id: formaPagamentoId, 
      forma_pagamento: card.forma_pagamento, 
      categoria: card.categoria, 
      conta_financeira_id: card.conta_financeira_id, 
      conta_financeira: card.conta_financeira, 
      observacoes: card.observacoes, 
      origem: card.origem || 'manual', 
      condicao_pagamento_id: card.condicao_pagamento_id || '', 
      condicao_pagamento: card.condicao_pagamento || '' 
    }); 
    setCardDialogOpen(true); 
  };
  const handleViewCard = async (card: ContaReceber) => {
    setViewingCard(card);
    setViewDialogOpen(true);
    setAtividades([]);
    setAtividadeFormExpanded(false);
    setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' });
    // Buscar atividades incluindo as do card de origem (movimentações são carregadas pelo CardMovimentacoesHistory)
    await fetchAtividades(card.id, card.origem_card_id, card.origem_kanban, card.closer_card_id);
  };

  const fetchAtividades = async (contaId: string, origemCardId?: string, origemKanban?: string, closerCardId?: string) => {
    setLoadingAtividades(true);
    try {
      // Buscar atividades do Contas a Receber
      const { data: atividadesContaReceber, error } = await (supabase as any)
        .from('contas_receber_atividades')
        .select('*, usuario:profiles(nome)')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      let todasAtividades: any[] = (atividadesContaReceber || []).map((a: any) => ({ ...a, _origem_kanban: null }));
      
      // Buscar atividades do Closer (se veio de lá)
      let prospeccaoCardId: string | null = null;
      if (closerCardId) {
        const { data: atividadesCloser } = await (supabase as any)
          .from('closer_atividades')
          .select('*, usuario:profiles(nome)')
          .eq('card_id', closerCardId)
          .order('created_at', { ascending: false });
        
        if (atividadesCloser) {
          todasAtividades = [...todasAtividades, ...atividadesCloser.map((a: any) => ({ ...a, _origem_kanban: 'closer' }))];
        }
        
        // Buscar o card do Closer para pegar o origem_card_id (Prospecção)
        const { data: closerCard } = await (supabase as any)
          .from('closer_cards')
          .select('origem_card_id, origem_kanban')
          .eq('id', closerCardId)
          .single();
        
        if (closerCard?.origem_card_id && closerCard?.origem_kanban === 'prospeccao') {
          prospeccaoCardId = closerCard.origem_card_id;
        }
      }
      
      // Buscar atividades da Prospecção (se o Closer veio de lá)
      if (prospeccaoCardId) {
        const { data: atividadesProspeccao } = await (supabase as any)
          .from('prospeccao_atividades')
          .select('*, usuario:profiles(nome)')
          .eq('card_id', prospeccaoCardId)
          .order('created_at', { ascending: false });
        
        if (atividadesProspeccao) {
          todasAtividades = [...todasAtividades, ...atividadesProspeccao.map((a: any) => ({ ...a, _origem_kanban: 'prospeccao' }))];
        }
      }
      
      // Buscar atividades do card de origem direto (caso não seja via Closer)
      if (origemCardId && origemKanban && origemCardId !== prospeccaoCardId) {
        const tabelaAtividades = origemKanban === 'prospeccao' ? 'prospeccao_atividades' : `${origemKanban}_atividades`;
        const { data: atividadesOrigem } = await (supabase as any)
          .from(tabelaAtividades)
          .select('*, usuario:profiles(nome)')
          .eq('card_id', origemCardId)
          .order('created_at', { ascending: false });
        
        if (atividadesOrigem) {
          todasAtividades = [...todasAtividades, ...atividadesOrigem.map((a: any) => ({ ...a, _origem_kanban: origemKanban }))];
        }
      }
      
      // Remover duplicatas por ID e ordenar por data (mais recentes primeiro)
      const atividadesUnicas = todasAtividades.filter((a, index, self) => 
        index === self.findIndex(t => t.id === a.id)
      );
      atividadesUnicas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAtividades(atividadesUnicas);
    } catch (e) { console.error('Erro ao carregar atividades:', e); setAtividades([]); }
    setLoadingAtividades(false);
  };

  const handleAddAtividade = async () => {
    if (!viewingCard || !novaAtividade.descricao.trim()) {
      toast({ title: 'Informe a descrição da atividade', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('contas_receber_atividades')
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
        .from('contas_receber_atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId);
      if (error) throw error;
      setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, status: novoStatus } : a));
    } catch (e) { console.error('Erro ao atualizar status:', e); }
  };

  const handleAbrirProgramarNfe = () => {
    if (!viewingCard) return;
    setNfeDataEmissao(undefined);
    setNfeHoraEmissao('08:00');
    setProgramarNfeDialogOpen(true);
  };

  const handleSalvarProgramacaoNfe = async () => {
    if (!viewingCard || !nfeDataEmissao) {
      toast({ title: 'Selecione a data de emissão', variant: 'destructive' });
      return;
    }
    setSalvandoNfe(true);
    try {
      const dataFormatada = format(nfeDataEmissao, 'yyyy-MM-dd');
      await (supabase as any).from('contas_receber').update({
        nfe_data_programada: dataFormatada,
        nfe_hora_programada: nfeHoraEmissao,
      }).eq('id', viewingCard.id);
      
      // Atualizar o card local
      setContas(prev => prev.map(c => 
        c.id === viewingCard.id 
          ? { ...c, nfe_data_programada: dataFormatada, nfe_hora_programada: nfeHoraEmissao } 
          : c
      ));
      
      toast({ title: 'Emissão de NFe programada com sucesso!' });
      setProgramarNfeDialogOpen(false);
    } catch (e) { 
      console.error('Erro ao programar NFe:', e); 
      toast({ title: 'Erro ao programar emissão de NFe', variant: 'destructive' }); 
    }
    setSalvandoNfe(false);
  };

  const handleAbrirProgramarRecebiveis = () => {
    if (!viewingCard) return;
    setIsRecorrente(false);
    // Buscar a condição de pagamento do card
    const condicao = condicoesPagamento.find(c => c.id === viewingCard.condicao_pagamento_id);
    if (condicao) {
      // Gerar datas baseadas na condição de pagamento
      const datas: string[] = [];
      const dataBase = viewingCard.data_recebimento ? new Date(viewingCard.data_recebimento + 'T00:00:00') : new Date();
      for (let i = 0; i < condicao.parcelas; i++) {
        const novaData = new Date(dataBase);
        novaData.setDate(novaData.getDate() + (condicao.intervalo_dias * i));
        datas.push(format(novaData, 'yyyy-MM-dd'));
      }
      setProgramarDatas(datas);
    } else {
      // Se não tem condição, iniciar com uma data
      setProgramarDatas([viewingCard.data_recebimento || format(new Date(), 'yyyy-MM-dd')]);
    }
    setProgramarDialogOpen(true);
  };

  const handleProgramarDataChange = (index: number, novaData: string) => {
    setProgramarDatas(prev => prev.map((d, i) => i === index ? novaData : d));
  };

  const handleSalvarProgramacao = async () => {
    if (!viewingCard || programarDatas.length === 0) return;
    setProgramarLoading(true);
    try {
      if (isRecorrente) {
        // Atualizar o recebível original como recorrente
        await (supabase as any).from('contas_receber').update({
          data_recebimento: programarDatas[0],
          observacoes: `[RECORRENTE MENSAL] ${viewingCard.observacoes || ''}`,
          recorrente: true,
        }).eq('id', viewingCard.id);
        
        toast({ title: 'Recebível configurado como recorrente mensal!' });
      } else {
        const valorParcela = viewingCard.valor / programarDatas.length;
        const primeiraColuna = colunas[0]?.id;
        
        // Criar recebíveis para cada data programada (exceto o primeiro que já existe)
        for (let i = 1; i < programarDatas.length; i++) {
          const ano = new Date().getFullYear();
          const numero = `CR-${ano}-${String(contas.length + i).padStart(3, '0')}`;
          await (supabase as any).from('contas_receber').insert({
            empresa_id: empresaId,
            numero,
            cliente_id: viewingCard.cliente_id,
            cliente_nome: viewingCard.cliente_nome,
            cliente_cnpj: viewingCard.cliente_cnpj,
            servico_produto: viewingCard.servico_produto,
            valor: valorParcela,
            valor_pago: 0,
            data_emissao: new Date().toISOString().split('T')[0],
            data_competencia: programarDatas[i],
            data_recebimento: programarDatas[i],
            forma_pagamento: viewingCard.forma_pagamento,
            forma_pagamento_id: viewingCard.forma_pagamento_id,
            categoria: viewingCard.categoria,
            conta_financeira: viewingCard.conta_financeira,
            conta_financeira_id: viewingCard.conta_financeira_id,
            coluna_id: primeiraColuna,
            observacoes: `Parcela ${i + 1}/${programarDatas.length} - ${viewingCard.observacoes || ''}`,
            origem: 'manual',
            ordem: 0,
            condicao_pagamento: viewingCard.condicao_pagamento,
            condicao_pagamento_id: viewingCard.condicao_pagamento_id,
            created_by: profile?.id,
          });
        }
        
        // Atualizar o recebível original com a primeira data e valor da parcela
        await (supabase as any).from('contas_receber').update({
          data_recebimento: programarDatas[0],
          valor: valorParcela,
          observacoes: `Parcela 1/${programarDatas.length} - ${viewingCard.observacoes || ''}`,
        }).eq('id', viewingCard.id);
        
        toast({ title: `${programarDatas.length} recebíveis programados com sucesso!` });
      }
      setProgramarDialogOpen(false);
      await loadContas();
    } catch (e) {
      console.error('Erro ao programar recebíveis:', e);
      toast({ title: 'Erro ao programar recebíveis', variant: 'destructive' });
    } finally {
      setProgramarLoading(false);
    }
  };

  const handleMoverParaColuna = async (colunaId: string) => {
    if (!viewingCard || viewingCard.coluna_id === colunaId) return;
    
    const colunaOrigem = colunas.find(c => c.id === viewingCard.coluna_id);
    const colunaDestino = colunas.find(c => c.id === colunaId);
    
    if (!colunaOrigem || !colunaDestino) return;
    
    // Verificar se é retrocesso ou múltiplas etapas (precisa de justificativa)
    const indexOrigem = colunas.findIndex(c => c.id === viewingCard.coluna_id);
    const indexDestino = colunas.findIndex(c => c.id === colunaId);
    const etapasMovidas = Math.abs(indexDestino - indexOrigem);
    const isRetrocesso = indexDestino < indexOrigem;
    
    // Se é retrocesso OU avançar mais de 1 etapa, pedir justificativa
    if (isRetrocesso || etapasMovidas > 1) {
      setMudancaEtapaDialog({
        open: true,
        colunaDestino,
        colunaOrigem,
        etapasMovidas,
        direcao: isRetrocesso ? 'retrocesso' : 'avanco',
        cardId: viewingCard.id,
      });
      setJustificativaMudanca('');
      return;
    }
    
    // Movimentação normal (1 etapa para frente)
    try {
      await (supabase as any).from('contas_receber').update({ coluna_id: colunaId }).eq('id', viewingCard.id);
      
      // Registrar movimentação
      await registrarMovimentacaoContaReceber(
        viewingCard.id,
        colunaOrigem.nome,
        colunaDestino.nome,
        viewingCard.coluna_id,
        colunaId
      );
      
      setViewingCard({ ...viewingCard, coluna_id: colunaId });
      setContas(prev => prev.map(c => c.id === viewingCard.id ? { ...c, coluna_id: colunaId } : c));
      toast({ title: `Movido para ${colunaDestino.nome}` });
    } catch (e) { 
      console.error('Erro ao mover:', e); 
      toast({ title: 'Erro ao mover', variant: 'destructive' }); 
    }
  };
  const handleSaveCard = async () => {
    if (!cardForm.cliente_nome || !cardForm.valor || !cardForm.data_recebimento) { toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' }); return; }
    try {
      // Função para validar se é um UUID válido
      const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      // Nota: cliente_id não é atualizado pois a FK referencia clientes_sst
      // mas os dados vêm da tabela empresas. Mantemos apenas nome e CNPJ.
      const dadosParaSalvar: Record<string, any> = {
        cliente_nome: cardForm.cliente_nome,
        cliente_cnpj: cardForm.cliente_cnpj || null,
        servico_produto: cardForm.servico_produto || null,
        valor: cardForm.valor,
        valor_pago: cardForm.valor_pago || 0,
        data_competencia: cardForm.data_competencia || null,
        data_recebimento: cardForm.data_recebimento,
        forma_pagamento: cardForm.forma_pagamento || null,
        forma_pagamento_id: cardForm.forma_pagamento_id && isValidUUID(cardForm.forma_pagamento_id) ? cardForm.forma_pagamento_id : null,
        categoria: cardForm.categoria || null,
        conta_financeira: cardForm.conta_financeira || null,
        conta_financeira_id: cardForm.conta_financeira_id && isValidUUID(cardForm.conta_financeira_id) ? cardForm.conta_financeira_id : null,
        observacoes: cardForm.observacoes || null,
        coluna_id: selectedColunaId,
      };
      // Adicionar campos de condição de pagamento apenas se tiverem valor e forem UUIDs válidos
      if (cardForm.condicao_pagamento) {
        dadosParaSalvar.condicao_pagamento = cardForm.condicao_pagamento;
      }
      if (cardForm.condicao_pagamento_id && isValidUUID(cardForm.condicao_pagamento_id)) {
        dadosParaSalvar.condicao_pagamento_id = cardForm.condicao_pagamento_id;
      }
      if (editingCard) {
        console.log('Dados para salvar:', dadosParaSalvar);
        console.log('ID do card:', editingCard.id);
        const { error, data } = await (supabase as any).from('contas_receber').update(dadosParaSalvar).eq('id', editingCard.id).select();
        console.log('Resposta do update:', { error, data });
        if (error) {
          console.error('Erro detalhado:', error);
          throw error;
        }
        toast({ title: 'Recebível atualizado!' });
      } else {
        const ano = new Date().getFullYear();
        const numero = `CR-${ano}-${String(contas.length + 1).padStart(3, '0')}`;
        const primeiraColuna = colunas[0]?.id;
        const { error } = await (supabase as any).from('contas_receber').insert({ 
          empresa_id: empresaId, 
          numero, 
          ...dadosParaSalvar, 
          coluna_id: selectedColunaId || primeiraColuna, 
          data_emissao: new Date().toISOString().split('T')[0], 
          ordem: contasByColuna[selectedColunaId || primeiraColuna]?.length || 0, 
          origem: 'manual', 
          created_by: profile?.id 
        });
        if (error) throw error;
        toast({ title: 'Recebível cadastrado!' });
      }
      await loadContas();
      setCardDialogOpen(false);
    } catch (e) { console.error('Erro ao salvar:', e); toast({ title: 'Erro ao salvar', variant: 'destructive' }); }
  };
  const handleDeleteCard = (id: string) => { const c = contas.find(x => x.id === id); if (c) { setDeleteType('card'); setDeleteId(id); setDeleteName(c.cliente_nome); setDeleteDialogOpen(true); } };
  const confirmDeleteCard = async () => {
    if (deleteId) {
      try {
        const { error } = await (supabase as any).from('contas_receber').delete().eq('id', deleteId);
        if (error) throw error;
        await loadContas();
        toast({ title: 'Recebível excluído!' });
      } catch (e) { console.error('Erro ao excluir:', e); toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
    }
    setDeleteDialogOpen(false);
  };
  const handleAddColuna = () => { setEditingColuna(null); setColunaForm({ nome: '', cor: '#6366f1' }); setColunaDialogOpen(true); };
  const handleEditColuna = (col: KanbanColuna) => { setEditingColuna(col); setColunaForm({ nome: col.nome, cor: col.cor }); setColunaDialogOpen(true); };
  const handleSaveColuna = async () => {
    if (!colunaForm.nome) { toast({ title: 'Informe o nome da coluna', variant: 'destructive' }); return; }
    try {
      if (editingColuna) {
        const { error } = await (supabase as any).from('contas_receber_colunas').update({ nome: colunaForm.nome, cor: colunaForm.cor }).eq('id', editingColuna.id);
        if (error) throw error;
        toast({ title: 'Coluna atualizada!' });
      } else {
        const { error } = await (supabase as any).from('contas_receber_colunas').insert({ empresa_id: empresaId, nome: colunaForm.nome, cor: colunaForm.cor, ordem: colunas.length });
        if (error) throw error;
        toast({ title: 'Coluna criada!' });
      }
      await loadColunas();
      setColunaDialogOpen(false);
    } catch (e) { console.error('Erro ao salvar coluna:', e); toast({ title: 'Erro ao salvar coluna', variant: 'destructive' }); }
  };
  const handleDeleteColuna = (id: string) => { const col = colunas.find(c => c.id === id); if (contas.filter(c => c.coluna_id === id).length > 0) { toast({ title: 'Não é possível excluir', description: 'Mova os recebíveis para outra coluna antes.', variant: 'destructive' }); return; } if (col) { setDeleteType('coluna'); setDeleteId(id); setDeleteName(col.nome); setDeleteDialogOpen(true); } };
  const confirmDeleteColuna = async () => {
    if (deleteId) {
      try {
        const { error } = await (supabase as any).from('contas_receber_colunas').delete().eq('id', deleteId);
        if (error) throw error;
        await loadColunas();
        toast({ title: 'Coluna excluída!' });
      } catch (e) { console.error('Erro ao excluir coluna:', e); toast({ title: 'Erro ao excluir coluna', variant: 'destructive' }); }
    }
    setDeleteDialogOpen(false);
  };
  const handleAbrirConfirmarRecebimento = (card: ContaReceber) => {
    setContaParaReceber(card);
    setDataRecebimentoConfirmacao(new Date());
    setConfirmarRecebimentoOpen(true);
  };

  const handleConfirmarRecebimento = async () => {
    if (!contaParaReceber || !dataRecebimentoConfirmacao) return;
    
    setConfirmandoRecebimento(true);
    try {
      // REGRA 11: Mover para coluna "Recebidos" após confirmar recebimento
      const colunaRecebidos = colunas.find(c => c.nome === COLUNA_RECEBIDOS);
      const dataFormatada = format(dataRecebimentoConfirmacao, 'yyyy-MM-dd');
      
      const { error } = await (supabase as any).from('contas_receber').update({ 
        valor_pago: contaParaReceber.valor, 
        coluna_id: colunaRecebidos?.id || contaParaReceber.coluna_id, 
        data_pagamento: dataFormatada,
        status_recebimento: 'realizado'
      }).eq('id', contaParaReceber.id);
      
      if (error) throw error;
      await loadContas();
      toast({ title: '✅ Recebimento confirmado!', description: 'Card movido para "Recebidos"' });
      setConfirmarRecebimentoOpen(false);
      setViewDialogOpen(false);
      setContaParaReceber(null);
    } catch (e) { 
      console.error('Erro ao confirmar recebimento:', e); 
      toast({ title: 'Erro ao confirmar recebimento', variant: 'destructive' }); 
    } finally {
      setConfirmandoRecebimento(false);
    }
  };

  const handleStatusChange = async (cardId: string, status: 'previsto' | 'realizado' | 'vencido') => {
    try {
      const { error } = await (supabase as any).from('contas_receber').update({ status_recebimento: status }).eq('id', cardId);
      if (error) throw error;
      setContas(prev => prev.map(c => c.id === cardId ? { ...c, status_recebimento: status } : c));
      toast({ title: `Status alterado para ${STATUS_RECEBIMENTO.find(s => s.value === status)?.label}` });
    } catch (e) { 
      console.error('Erro ao alterar status:', e); 
      toast({ title: 'Erro ao alterar status', variant: 'destructive' }); 
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-2xl font-bold text-foreground">Contas a Receber</h1><p className="text-muted-foreground">Gerencie suas contas a receber via Kanban</p></div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddColuna} variant="outline"><Plus className="h-4 w-4 mr-2" />Nova Coluna</Button>
            <Button onClick={() => handleAddCard(colunas[0]?.id || '')} className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]"><Plus className="h-4 w-4 mr-2" />Novo Recebível</Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total a Receber</p><p className="text-2xl font-bold">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Recebido</p><p className="text-2xl font-bold text-green-600">R$ {totals.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Vencido</p><p className="text-2xl font-bold text-red-600">R$ {totals.vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-600" /></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cobrança</p><p className="text-2xl font-bold text-[#00E676]">R$ {totals.cobranca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00E6761A' }}><Clock className="h-5 w-5 text-[#00E676]" /></div></div></CardContent></Card>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}><SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="all">Todas Categorias</SelectItem>{CATEGORIAS_RECEITA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
          <Select value={filterOrigem} onValueChange={setFilterOrigem}><SelectTrigger className="w-40"><SelectValue placeholder="Origem" /></SelectTrigger><SelectContent><SelectItem value="all">Todas Origens</SelectItem><SelectItem value="manual">Manual</SelectItem><SelectItem value="closer">Closer</SelectItem><SelectItem value="pos-venda">Pós-Venda</SelectItem></SelectContent></Select>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            <SortableContext items={colunas.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {colunas.sort((a, b) => a.ordem - b.ordem).map(col => <SortableColumn key={col.id} coluna={col} cards={contasByColuna[col.id] || []} onAddCard={handleAddCard} onEditCard={handleEditCard} onDeleteCard={handleDeleteCard} onViewCard={handleViewCard} onStatusChange={handleStatusChange} onEditColumn={handleEditColuna} onDeleteColumn={handleDeleteColuna} droppedCardId={droppedCardId} isEmitirNfeColuna={col.nome === COLUNA_EMITIR_NFE} isAguardandoNfeColuna={col.nome === COLUNA_AGUARDANDO_NFE} />)}
            </SortableContext>
          </div>
          <DragOverlay>{activeCard && <div className="bg-card border rounded-lg p-3 shadow-lg opacity-90 w-72"><Badge variant="outline" className="text-xs mb-2">{activeCard.numero}</Badge><h4 className="font-medium text-sm">{activeCard.cliente_nome}</h4><p className="text-lg font-bold text-primary">R$ {activeCard.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>}{activeColuna && <div className="bg-card border rounded-lg p-3 shadow-lg opacity-90 w-80" style={{ borderTop: `3px solid ${activeColuna.cor}` }}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColuna.cor }} /><span className="font-semibold">{activeColuna.nome}</span></div></div>}</DragOverlay>
        </DndContext>
      </div>
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCard ? 'Editar Recebível' : 'Novo Recebível'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Cliente *</Label><div className="space-y-2"><Input value={cardForm.cliente_nome || ''} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_nome: e.target.value }))} placeholder="Nome do cliente" />{empresas.length > 0 && <Select value={cardForm.cliente_id || ''} onValueChange={handleClienteChange}><SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ou vincular a um cliente cadastrado" /></SelectTrigger><SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}{e.cnpj ? ` - ${e.cnpj}` : ''}</SelectItem>)}</SelectContent></Select>}</div></div>
            <div><Label>CNPJ/CPF</Label><Input value={cardForm.cliente_cnpj || ''} onChange={(e) => setCardForm(prev => ({ ...prev, cliente_cnpj: e.target.value }))} placeholder="Digite o CNPJ/CPF" /></div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={cardForm.valor || ''} onChange={(e) => setCardForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))} placeholder="0.00" /></div>
            <div className="col-span-2"><Label>Serviço / Produto Contratado</Label><div className="space-y-2"><Input value={cardForm.servico_produto || ''} onChange={(e) => setCardForm(prev => ({ ...prev, servico_produto: e.target.value }))} placeholder="Digite ou selecione o serviço" list="servicos-list" /><datalist id="servicos-list">{planosReceita.map(p => <option key={p.id} value={p.nome} />)}</datalist></div></div>
            <div><Label>Data de Competência</Label><Input type="text" value={cardForm.data_competencia ? format(new Date(cardForm.data_competencia + 'T00:00:00'), 'dd/MM/yyyy') : ''} onChange={(e) => { const v = e.target.value; const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (match) { setCardForm(prev => ({ ...prev, data_competencia: `${match[3]}-${match[2]}-${match[1]}` })); } else if (v === '') { setCardForm(prev => ({ ...prev, data_competencia: '' })); } }} placeholder="dd/mm/aaaa" maxLength={10} onKeyDown={(e) => { const input = e.currentTarget; const val = input.value.replace(/\D/g, ''); if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && !/\d/.test(e.key)) { e.preventDefault(); return; } if (/\d/.test(e.key) && val.length < 8) { e.preventDefault(); const newVal = val + e.key; let formatted = ''; if (newVal.length >= 1) formatted = newVal.substring(0, Math.min(2, newVal.length)); if (newVal.length >= 3) formatted += '/' + newVal.substring(2, Math.min(4, newVal.length)); if (newVal.length >= 5) formatted += '/' + newVal.substring(4, 8); input.value = formatted; if (newVal.length === 8) { const day = newVal.substring(0, 2); const month = newVal.substring(2, 4); const year = newVal.substring(4, 8); setCardForm(prev => ({ ...prev, data_competencia: `${year}-${month}-${day}` })); } } }} /></div>
            <div><Label>Data de Recebimento *</Label><Input type="text" value={cardForm.data_recebimento ? format(new Date(cardForm.data_recebimento + 'T00:00:00'), 'dd/MM/yyyy') : ''} onChange={(e) => { const v = e.target.value; const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (match) { setCardForm(prev => ({ ...prev, data_recebimento: `${match[3]}-${match[2]}-${match[1]}` })); } else if (v === '') { setCardForm(prev => ({ ...prev, data_recebimento: '' })); } }} placeholder="dd/mm/aaaa" maxLength={10} onKeyDown={(e) => { const input = e.currentTarget; const val = input.value.replace(/\D/g, ''); if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && !/\d/.test(e.key)) { e.preventDefault(); return; } if (/\d/.test(e.key) && val.length < 8) { e.preventDefault(); const newVal = val + e.key; let formatted = ''; if (newVal.length >= 1) formatted = newVal.substring(0, Math.min(2, newVal.length)); if (newVal.length >= 3) formatted += '/' + newVal.substring(2, Math.min(4, newVal.length)); if (newVal.length >= 5) formatted += '/' + newVal.substring(4, 8); input.value = formatted; if (newVal.length === 8) { const day = newVal.substring(0, 2); const month = newVal.substring(2, 4); const year = newVal.substring(4, 8); setCardForm(prev => ({ ...prev, data_recebimento: `${year}-${month}-${day}` })); } } }} /></div>
            <div><Label>Categoria</Label><Select value={cardForm.categoria} onValueChange={(v) => setCardForm(prev => ({ ...prev, categoria: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{CATEGORIAS_RECEITA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Forma de Pagamento</Label><Select value={cardForm.forma_pagamento_id} onValueChange={handleFormaPagamentoChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{formasPagamento.filter(f => f.ativo).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Condição de Pagamento</Label><Select value={cardForm.condicao_pagamento_id} onValueChange={handleCondicaoPagamentoChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{condicoesPagamento.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Conta Financeira</Label><Select value={cardForm.conta_financeira_id} onValueChange={handleContaFinanceiraChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{contasBancarias.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.banco} - Ag: {c.agencia}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Coluna</Label><Select value={selectedColunaId || ''} onValueChange={setSelectedColunaId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{colunas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={cardForm.observacoes || ''} onChange={(e) => setCardForm(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Observações adicionais" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCardDialogOpen(false)}><X className="h-4 w-4 mr-2" />Cancelar</Button><Button onClick={handleSaveCard} className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]"><Save className="h-4 w-4 mr-2" />Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={colunaDialogOpen} onOpenChange={setColunaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingColuna ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome da Coluna *</Label><Input value={colunaForm.nome} onChange={(e) => setColunaForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Em Negociação" /></div>
            <div><Label>Cor</Label><div className="flex flex-wrap gap-2 mt-2">{CORES_COLUNAS.map(c => <button key={c.key} type="button" className={`w-8 h-8 rounded-full border-2 transition-all ${colunaForm.cor === c.value ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} onClick={() => setColunaForm(prev => ({ ...prev, cor: c.value }))} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setColunaDialogOpen(false)}><X className="h-4 w-4 mr-2" />Cancelar</Button><Button onClick={handleSaveColuna} className="bg-warning hover:bg-warning/90 text-white"><Save className="h-4 w-4 mr-2" />Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de Detalhes do Recebível - Padrão Closer */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {viewingCard && (
            <>
              {/* Header do Dialog */}
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingCard.cliente_nome}
                    </DialogTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {viewingCard.cliente_cnpj || 'CNPJ não informado'}
                      </span>
                      <Badge variant="outline">{viewingCard.numero}</Badge>
                      {viewingCard.origem && (
                        <Badge variant="secondary" className="text-xs">
                          {viewingCard.origem === 'closer' ? 'Closer' : viewingCard.origem === 'pos-venda' ? 'Pós-Venda' : 'Manual'}
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
                        handleEditCard(viewingCard);
                      }}
                      title="Editar Recebível"
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
                  <h3 className="font-semibold text-base mb-3 text-gray-900">ATIVIDADES</h3>

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
                    ) : atividades.filter(a => !['movimentacao', 'mudanca_coluna', 'mudanca_etapa', 'encaminhamento', 'criacao'].includes(a.tipo)).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>Nenhuma atividade registrada</p>
                        <p className="text-xs mt-1">Registre a primeira atividade acima</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atividades.filter(a => !['movimentacao', 'mudanca_coluna', 'mudanca_etapa', 'encaminhamento', 'criacao'].includes(a.tipo)).map((atividade) => {
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
                          // Identificar funil de origem da atividade
                          const funilOrigem = (atividade as any)._origem_kanban;
                          const funilLabels: Record<string, string> = {
                            prospeccao: 'Prospecção',
                            closer: 'Closer',
                            pos_venda: 'Pós-Venda',
                            cross_selling: 'Cross-Selling',
                          };
                          const funilLabel = funilOrigem ? funilLabels[funilOrigem] || funilOrigem : 'Contas a Receber';
                          const isFromOtherKanban = !!funilOrigem;
                          
                          return (
                            <div key={atividade.id} className={`border rounded-lg p-3 bg-card ${isConcluida ? 'opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox
                                    checked={isConcluida}
                                    onCheckedChange={(checked) => {
                                      // Só permite alterar status de atividades do Contas a Receber (não de outros kanbans)
                                      if (!isFromOtherKanban) {
                                        handleUpdateAtividadeStatus(atividade.id, checked ? 'concluida' : 'programada');
                                      }
                                    }}
                                    className="h-5 w-5"
                                    disabled={isFromOtherKanban}
                                  />
                                  <div className={`p-2 rounded-full ${tipoInfo.cor}`}>
                                    <TipoIcon className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium text-sm ${isConcluida ? 'line-through' : ''}`}>{tipoInfo.label}</span>
                                      <Badge className={`text-xs ${statusColors[atividade.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {statusLabels[atividade.status] || atividade.status}
                                      </Badge>
                                      {/* Badge indicando o funil de origem */}
                                      <Badge variant="outline" className={`text-xs ${isFromOtherKanban ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
                                        {funilLabel}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                  
                  {/* Histórico de Movimentações do Card - Usando componente compartilhado */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Histórico de Movimentações
                    </h4>
                    {viewingCard && (
                      <CardMovimentacoesHistory 
                        key={`movimentacoes-${viewingCard.id}-${movimentacoesKey}`}
                        cardId={viewingCard.id} 
                        cardTipo="contas_receber"
                        closerCardId={viewingCard.closer_card_id}
                        origemCardId={viewingCard.origem_card_id}
                        origemKanban={viewingCard.origem_kanban}
                        maxHeight="300px"
                      />
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Ações Rápidas e Informações */}
                <div className="w-72 flex-shrink-0 border-l pl-4 bg-muted/50 rounded-lg p-4 -mr-4 overflow-y-auto max-h-full">
                  {/* Ações Rápidas */}
                  <div className="space-y-2 mb-6">
                    <h4 className="font-semibold text-sm mb-3">Ações Rápidas</h4>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setNovaAtividadeDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Atividade
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setViewDialogOpen(false); handleEditCard(viewingCard); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Recebível
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start text-[#00E676] hover:text-[#00c868] hover:bg-[#00E676]/10" onClick={() => handleAbrirProgramarNfe()}>
                      <FileText className="h-4 w-4 mr-2" />
                      Programar Emissão da NFe
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full justify-start text-[#00E676] hover:text-[#00c868] hover:bg-[#00E676]/10" onClick={() => handleAbrirProgramarRecebiveis()}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Programar Recebíveis
                    </Button>
                    
                    {viewingCard.valor_pago < viewingCard.valor && (
                      <Button variant="outline" size="sm" className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleAbrirConfirmarRecebimento(viewingCard)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Registrar Recebimento
                      </Button>
                    )}
                  </div>

                  {/* Valor do Recebível */}
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-3">Valor do Recebível</h4>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-primary">
                        R$ {Number(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      
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

                  {/* Dados da Empresa (do Lead) */}
                  {(viewingCard.empresa_nome || viewingCard.cliente_cnpj || viewingCard.empresa_email || viewingCard.empresa_telefone) && (
                    <div className="pt-4 border-t mt-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Dados da Empresa
                      </h4>
                      <div className="space-y-2 text-sm">
                        {viewingCard.empresa_nome && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{viewingCard.empresa_nome}</span>
                          </div>
                        )}
                        {viewingCard.cliente_cnpj && (
                          <div>
                            <p className="text-muted-foreground text-xs">CNPJ</p>
                            <p className="font-medium">{viewingCard.cliente_cnpj}</p>
                          </div>
                        )}
                        {viewingCard.empresa_email && (
                          <div>
                            <p className="text-muted-foreground text-xs">E-mail da Empresa</p>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a href={`mailto:${viewingCard.empresa_email}`} className="text-primary hover:underline">
                                {viewingCard.empresa_email}
                              </a>
                            </div>
                          </div>
                        )}
                        {viewingCard.empresa_telefone && (
                          <div>
                            <p className="text-muted-foreground text-xs">Telefone da Empresa</p>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${viewingCard.empresa_telefone}`} className="text-primary hover:underline">
                                {viewingCard.empresa_telefone}
                              </a>
                            </div>
                          </div>
                        )}
                        {(viewingCard.empresa_endereco || viewingCard.empresa_cidade) && (
                          <div>
                            <p className="text-muted-foreground text-xs">Endereço</p>
                            <p className="text-sm">
                              {[
                                viewingCard.empresa_endereco,
                                viewingCard.empresa_numero,
                                viewingCard.empresa_complemento,
                                viewingCard.empresa_bairro,
                                viewingCard.empresa_cidade && viewingCard.empresa_estado 
                                  ? `${viewingCard.empresa_cidade}/${viewingCard.empresa_estado}` 
                                  : viewingCard.empresa_cidade,
                                viewingCard.empresa_cep
                              ].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dados do Contato (do Closer) */}
                  {(viewingCard.contato_nome || viewingCard.contato_email || viewingCard.contato_telefone) && (
                    <div className="pt-4 border-t mt-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Contatos ({[viewingCard.contato_nome].filter(Boolean).length})
                      </h4>
                      <div className="space-y-2 text-sm">
                        {viewingCard.contato_nome && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{viewingCard.contato_nome}</span>
                          </div>
                        )}
                        {viewingCard.contato_email && (
                          <div className="flex items-center gap-2 pl-6">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${viewingCard.contato_email}`} className="text-primary hover:underline">
                              {viewingCard.contato_email}
                            </a>
                          </div>
                        )}
                        {viewingCard.contato_telefone && (
                          <div className="flex items-center gap-2 pl-6">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${viewingCard.contato_telefone}`} className="text-primary hover:underline">
                              {viewingCard.contato_telefone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dados do Recebível */}
                  <div className="pt-4 border-t mt-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                      Dados do Recebível
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setViewDialogOpen(false); handleEditCard(viewingCard); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Data de Recebimento</p>
                        <p className="font-medium">{viewingCard.data_recebimento ? format(new Date(viewingCard.data_recebimento + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Forma de Pagamento</p>
                        <p className="font-medium">{viewingCard.forma_pagamento || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Condição de Pagamento</p>
                        <p className="font-medium">{viewingCard.condicao_pagamento || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Categoria</p>
                        <p className="font-medium">{CATEGORIAS_RECEITA.find(c => c.value === viewingCard.categoria)?.label || viewingCard.categoria || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Conta Financeira</p>
                        <p className="font-medium">{viewingCard.conta_financeira || '-'}</p>
                      </div>
                      {viewingCard.servico_produto && (
                        <div>
                          <p className="text-muted-foreground text-xs">Serviço/Produto</p>
                          <p className="font-medium">{viewingCard.servico_produto}</p>
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

      {/* Dialog de Programar Emissão NFe */}
      <Dialog open={programarNfeDialogOpen} onOpenChange={setProgramarNfeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#00E676]" />
              Programar Emissão da NFe
            </DialogTitle>
            <DialogDescription>
              Defina a data e hora para emissão automática da nota fiscal
            </DialogDescription>
          </DialogHeader>
          
          {viewingCard && (
            <div className="space-y-4">
              {/* Info do Recebível */}
              <div className="p-3 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Recebível:</span>
                  <span className="text-sm font-semibold text-gray-900">{viewingCard.numero}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-gray-700">Cliente:</span>
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{viewingCard.cliente_nome}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-gray-700">Valor:</span>
                  <span className="text-sm font-bold text-[#00E676]">
                    R$ {Number(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Data de Emissão */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data de Emissão *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nfeDataEmissao ? format(nfeDataEmissao, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={nfeDataEmissao}
                      onSelect={setNfeDataEmissao}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora de Emissão */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hora de Emissão *</Label>
                <Input
                  type="time"
                  value={nfeHoraEmissao}
                  onChange={(e) => setNfeHoraEmissao(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Aviso */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Atenção:</strong> A nota fiscal será emitida automaticamente na data e hora programadas.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProgramarNfeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarProgramacaoNfe} 
              disabled={salvandoNfe || !nfeDataEmissao}
              className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]"
            >
              {salvandoNfe ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Programação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Programar Recebíveis */}
      <Dialog open={programarDialogOpen} onOpenChange={setProgramarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-[#00E676]" />
              Programar Recebíveis
            </DialogTitle>
            <DialogDescription>
              Configure as datas de vencimento para cada parcela
            </DialogDescription>
          </DialogHeader>
          
          {viewingCard && (
            <div className="space-y-4">
              {/* Info da Condição de Pagamento */}
              <div className="p-3 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Condição de Pagamento:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewingCard.condicao_pagamento || 'Não definida'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-gray-700">Valor Total:</span>
                  <span className="text-sm font-bold text-[#00E676]">
                    R$ {Number(viewingCard.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-gray-700">Valor por Parcela:</span>
                  <span className="text-sm font-bold text-[#00E676]">
                    R$ {Number((viewingCard.valor || 0) / (programarDatas.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Checkbox de Recorrência */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-emerald-50/60">
                <Checkbox 
                  id="recorrente" 
                  checked={isRecorrente} 
                  onCheckedChange={(checked) => setIsRecorrente(checked === true)}
                  className="data-[state=checked]:bg-[#00E676] data-[state=checked]:border-[#00E676]"
                />
                <label 
                  htmlFor="recorrente" 
                  className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Serviço com recebimento recorrente
                </label>
              </div>
              
              {isRecorrente && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Recorrência mensal ativada:</strong> Este recebível será cobrado mensalmente sem prazo pré-determinado. 
                    A primeira cobrança será na data selecionada abaixo.
                  </p>
                </div>
              )}

              {/* Lista de Datas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {isRecorrente ? 'Data da Primeira Cobrança' : 'Datas de Vencimento'}
                  </Label>
                  {!isRecorrente && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#00E676] border-[#00E676] hover:bg-[#00E676]/10"
                      onClick={() => setProgramarDatas(prev => [...prev, format(new Date(), 'yyyy-MM-dd')])}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Parcela
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(isRecorrente ? programarDatas.slice(0, 1) : programarDatas).map((data, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <span className="text-sm font-medium w-20">
                        {isRecorrente ? 'Início' : `Parcela ${index + 1}`}
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {!isRecorrente && programarDatas.length > 1 && (
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
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarProgramacao} 
              disabled={programarLoading || programarDatas.length === 0}
              className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]"
            >
              {programarLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Programação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {deleteType === 'coluna' ? 'a coluna' : 'o recebível'} "{deleteName}"? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteType === 'coluna' ? confirmDeleteColuna : confirmDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmar Recebimento */}
      <Dialog open={confirmarRecebimentoOpen} onOpenChange={setConfirmarRecebimentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirmar Recebimento
            </DialogTitle>
            <DialogDescription>
              Confirme a data em que o recebimento foi efetuado
            </DialogDescription>
          </DialogHeader>

          {contaParaReceber && (
            <div className="space-y-4">
              {/* Informações do Recebível */}
              <div className="rounded-lg p-4 space-y-2 bg-[#f3f4f6] border border-[#e5e7eb]">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Cliente:</span>
                  <span className="text-sm font-semibold text-gray-900">{contaParaReceber.cliente_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Valor:</span>
                  <span className="text-sm font-bold text-[#00E676]">R$ {contaParaReceber.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Vencimento:</span>
                  <span className="text-sm font-semibold text-gray-900">{format(new Date(contaParaReceber.data_recebimento), 'dd/MM/yyyy')}</span>
                </div>
              </div>

              {/* Seletor de Data */}
              <div className="space-y-2">
                <Label>Data do Recebimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataRecebimentoConfirmacao ? format(dataRecebimentoConfirmacao, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataRecebimentoConfirmacao}
                      onSelect={setDataRecebimentoConfirmacao}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Aviso */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Ao confirmar, o card será movido automaticamente para a coluna "Pagos".
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmarRecebimentoOpen(false)} disabled={confirmandoRecebimento}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarRecebimento} 
              disabled={confirmandoRecebimento || !dataRecebimentoConfirmacao}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirmandoRecebimento ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Aguardando NFe - ao mover card para coluna "Aguardando confirmação para emitir Nfe" */}
      <Dialog open={aguardandoNfeDialogOpen} onOpenChange={(open) => { if (!open) handleCancelarMovimentacao(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Agendar Emissão da NFe
            </DialogTitle>
            <DialogDescription>
              Para mover o card para esta coluna, é necessário agendar a data de emissão da NFe
            </DialogDescription>
          </DialogHeader>
          
          {cardPendenteMovimentacao && (
            <div className="space-y-4">
              {/* Info do Recebível */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recebível:</span>
                  <span className="text-sm text-muted-foreground">{cardPendenteMovimentacao.numero}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Cliente:</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[180px]">{cardPendenteMovimentacao.cliente_nome}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Valor:</span>
                  <span className="text-sm font-bold text-primary">
                    R$ {Number(cardPendenteMovimentacao.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Data de Emissão */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data de Emissão da NFe *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nfeDataEmissao ? format(nfeDataEmissao, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={nfeDataEmissao}
                      onSelect={setNfeDataEmissao}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora de Emissão */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hora de Emissão *</Label>
                <Input
                  type="time"
                  value={nfeHoraEmissao}
                  onChange={(e) => setNfeHoraEmissao(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Aviso */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Importante:</strong> Quando chegar a data agendada, o card será automaticamente movido para a coluna "Emitir NFe" com um alerta visual.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelarMovimentacao}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarAguardandoNfe} 
              disabled={salvandoNfe || !nfeDataEmissao}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {salvandoNfe ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Confirmar e Mover
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Programar Recebíveis - ao mover card para coluna "Programar Recebíveis" */}
      <Dialog open={programarRecebiveisDialogOpen} onOpenChange={(open) => { if (!open) handleCancelarMovimentacao(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Programar Data de Recebimento
            </DialogTitle>
            <DialogDescription>
              Para mover o card, é necessário programar a data de recebimento
            </DialogDescription>
          </DialogHeader>
          
          {cardPendenteMovimentacao && (
            <div className="space-y-4">
              {/* Info do Recebível */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recebível:</span>
                  <span className="text-sm text-muted-foreground">{cardPendenteMovimentacao.numero}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Cliente:</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[180px]">{cardPendenteMovimentacao.cliente_nome}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Valor:</span>
                  <span className="text-sm font-bold text-primary">
                    R$ {Number(cardPendenteMovimentacao.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {cardPendenteMovimentacao.condicao_pagamento && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">Condição:</span>
                    <span className="text-sm text-muted-foreground">{cardPendenteMovimentacao.condicao_pagamento}</span>
                  </div>
                )}
              </div>

              {/* Data de Recebimento */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data de Recebimento *</Label>
                {programarDatas.map((data, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-20">Parcela {index + 1}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data ? format(new Date(data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={data ? new Date(data + 'T00:00:00') : undefined}
                          onSelect={(d) => d && setProgramarDatas(prev => prev.map((dt, i) => i === index ? format(d, 'yyyy-MM-dd') : dt))}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
              </div>

              {/* Aviso */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Importante:</strong> Após programar a data, o card será automaticamente movido para a coluna "A Receber".
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelarMovimentacao}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarProgramarRecebiveis} 
              disabled={programarLoading || programarDatas.length === 0}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {programarLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Confirmar e Mover para "A Receber"
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Atividade */}
      <Dialog open={novaAtividadeDialogOpen} onOpenChange={setNovaAtividadeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Nova {TIPOS_ATIVIDADE.find(t => t.id === novaAtividade.tipo)?.label || 'Atividade'}
            </DialogTitle>
          </DialogHeader>
          
          {/* Botões de Tipo de Atividade */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TIPOS_ATIVIDADE.map((tipo) => (
              <Button
                key={tipo.id}
                variant={novaAtividade.tipo === tipo.id ? 'default' : 'outline'}
                size="sm"
                className={`text-xs ${novaAtividade.tipo === tipo.id ? 'bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]' : ''}`}
                onClick={() => setNovaAtividade(prev => ({ ...prev, tipo: tipo.id }))}
              >
                <tipo.icon className="h-3 w-3 mr-1" />
                {tipo.label}
              </Button>
            ))}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="O que foi feito e qual o próximo passo?"
              value={novaAtividade.descricao}
              onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          {/* Campos extras: Data, Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Select value={novaAtividade.horario || ''} onValueChange={(value) => setNovaAtividade(prev => ({ ...prev, horario: value }))}>
                <SelectTrigger>
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

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setNovaAtividade({ tipo: 'tarefa', descricao: '', prazo: '', horario: '' }); setNovaAtividadeDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => { handleAddAtividade(); setNovaAtividadeDialogOpen(false); }} 
              className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]"
            >
              Salvar Atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Justificativa para Mudança de Etapa (retrocesso ou múltiplas etapas) - Igual ao Closer */}
      <Dialog open={mudancaEtapaDialog.open} onOpenChange={(open) => { if (!open) setMudancaEtapaDialog({ open: false, colunaDestino: null, colunaOrigem: null, etapasMovidas: 0, direcao: 'avanco', cardId: null }); }}>
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
                  Você está <strong>retrocedendo</strong> o recebível de{' '}
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
                  Você está avançando o recebível{' '}
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
            <Button variant="outline" onClick={() => setMudancaEtapaDialog({ open: false, colunaDestino: null, colunaOrigem: null, etapasMovidas: 0, direcao: 'avanco', cardId: null })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarMudancaEtapa} 
              disabled={mudancaEtapaDialog.direcao === 'retrocesso' && !justificativaMudanca.trim()}
              className={mudancaEtapaDialog.direcao === 'retrocesso' ? 'bg-warning hover:bg-warning/90' : ''}
            >
              {mudancaEtapaDialog.direcao === 'retrocesso' ? 'Retroceder' : 'Avançar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
