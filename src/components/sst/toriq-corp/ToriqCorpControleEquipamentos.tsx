import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { 
  HardHat, 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  Box, 
  Layers, 
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Filter,
  Download,
  Upload,
  RefreshCw,
  CheckSquare,
  ListTodo,
  CircleCheck,
  Circle,
  Paperclip,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MenuSection = 'dashboard' | 'cadastro-equipamento' | 'cadastro-kit' | 'movimentacoes' | 'consulta' | 'historico';

interface Equipamento {
  id: string;
  nome: string;
  codigo: string;
  numero_serie?: string;
  categoria: string;
  unidade_medida?: string;
  quantidade?: number;
  usado_para?: string[];
  status: string;
  local_base?: string;
  validade_calibracao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

interface KitEquipamento {
  equipamento_id: string;
  quantidade: number;
}

interface Kit {
  id: string;
  nome: string;
  codigo: string;
  tipo_servico: string[];
  descricao?: string;
  quantidade?: number;
  equipamentos: KitEquipamento[];
  created_at: string;
}

interface Movimentacao {
  id: string;
  numero_movimentacao?: string;
  kit_id?: string;
  equipamento_id?: string;
  equipamento?: Equipamento;
  equipamentos_lista?: Array<{ equipamento_id: string; quantidade: number }>;
  tipo: 'saida' | 'entrada';
  quantidade?: number;
  tipo_servico?: string;
  cliente_id?: string;
  responsavel_retirada?: string;
  usuario_separou_id?: string;
  usuario_separou?: { nome: string };
  usuario_utilizou_id?: string;
  usuario_utilizou?: { nome: string };
  usuario_recebeu_id?: string;
  usuario_recebeu?: { nome: string };
  data_saida?: string;
  data_retorno?: string;
  status: 'demanda' | 'separado' | 'retirado' | 'em_uso' | 'devolvido' | 'pendente';
  checklist_saida?: Record<string, boolean>;
  checklist_entrada?: Record<string, boolean>;
  observacoes?: string;
  created_at: string;
  atividades?: Atividade[];
  funil_card_id?: string;
}

interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

interface Atividade {
  id: string;
  movimentacao_id: string;
  tipo: 'tarefa' | 'checklist';
  descricao: string;
  itens_checklist?: ChecklistItem[];
  prazo?: string;
  horario?: string;
  membro_id?: string;
  membro_nome?: string;
  status: 'pendente' | 'concluida';
  created_at: string;
}

interface MovimentacaoHistorico {
  id: string;
  movimentacao_id: string;
  tipo: string;
  descricao: string;
  funil_id?: string;
  funil_nome?: string;
  card_id?: string;
  card_titulo?: string;
  status_anterior?: string;
  status_novo?: string;
  usuario_id?: string;
  usuario_nome?: string;
  dados_adicionais?: Record<string, any>;
  created_at: string;
}

interface FunilCardInfo {
  id: string;
  titulo: string;
  funil?: {
    id: string;
    nome: string;
  };
}

const CATEGORIAS_PADRAO = [
  'EPI',
  'EPC',
  'Medição',
  'Resgate',
  'Primeiros Socorros',
  'Sinalização',
  'Ferramentas',
  'Audiovisual',
  'Didático',
  'Outros'
];

const UNIDADES_PADRAO = [
  'Unidade',
  'Metro',
  'Par',
  'Conjunto',
  'Kit',
  'Litro',
  'Kg'
];

const STATUS_PADRAO = [
  { id: 'disponivel', nome: 'Disponível', cor: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'em_uso', nome: 'Em Uso', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'manutencao', nome: 'Manutenção', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'baixa', nome: 'Baixa', cor: 'bg-red-100 text-red-700 border-red-300' }
];

const USADO_PARA_PADRAO = [
  'Treinamentos',
  'Higiene Ocupacional',
  'Visita Técnica',
  'Cadastro de Espaço Confinado',
  'Atividade de Resgate em Altura ou E.C'
];

const STATUS_COLORS: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-700 border-green-300',
  em_uso: 'bg-blue-100 text-blue-700 border-blue-300',
  manutencao: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  baixa: 'bg-red-100 text-red-700 border-red-300',
  demanda: 'bg-gray-100 text-gray-700 border-gray-300',
  separado: 'bg-purple-100 text-purple-700 border-purple-300',
  retirado: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  devolvido: 'bg-green-100 text-green-700 border-green-300',
  pendente: 'bg-orange-100 text-orange-700 border-orange-300'
};

const STATUS_LABELS: Record<string, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  manutencao: 'Manutenção',
  baixa: 'Baixa',
  demanda: 'Demanda',
  separado: 'Separado',
  retirado: 'Retirado',
  devolvido: 'Devolvido',
  pendente: 'Pendente'
};

const KANBAN_COLUMNS = [
  { id: 'demanda', nome: 'Demanda', cor: 'bg-gray-50 border-gray-200' },
  { id: 'separado', nome: 'Separado', cor: 'bg-purple-50 border-purple-200' },
  { id: 'retirado', nome: 'Retirado', cor: 'bg-indigo-50 border-indigo-200' },
  { id: 'em_uso', nome: 'Em Uso', cor: 'bg-blue-50 border-blue-200' },
  { id: 'devolvido', nome: 'Devolvidos', cor: 'bg-green-50 border-green-200' },
  { id: 'pendente', nome: 'Pendentes', cor: 'bg-orange-50 border-orange-200' }
];

export function ToriqCorpControleEquipamentos() {
  const { toast } = useToast();
  const { profile, empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  
  // Usar empresa_id do modo empresa quando ativo, senão usar do contexto de auth
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [activeSection, setActiveSection] = useState<MenuSection>('dashboard');
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{id: string; nome: string}[]>([]);
  
  // Estados para equipamentos
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipamentoForm, setEquipamentoForm] = useState<Partial<Equipamento>>({
    status: 'disponivel',
    categoria: ''
  });
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [showEquipamentoDialog, setShowEquipamentoDialog] = useState(false);
  
  // Estados para kits
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitForm, setKitForm] = useState<Partial<Kit>>({
    tipo_servico: [],
    equipamentos: [],
    quantidade: 1
  });
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [showKitDialog, setShowKitDialog] = useState(false);
  
  // Estados para movimentações
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [movimentacaoForm, setMovimentacaoForm] = useState<Partial<Movimentacao>>({
    tipo: 'saida',
    status: 'separado'
  });
  const [showMovimentacaoDialog, setShowMovimentacaoDialog] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'kit' | 'equipamentos'>('kit');
  const [equipamentosMovimentacao, setEquipamentosMovimentacao] = useState<Array<{ equipamento_id: string; quantidade: number }>>([]);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState({ de: '', ate: '' });

  // Estados para categorias e unidades customizáveis
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_PADRAO);
  const [unidades, setUnidades] = useState<string[]>(UNIDADES_PADRAO);
  const [showCategoriaDialog, setShowCategoriaDialog] = useState(false);
  const [showUnidadeDialog, setShowUnidadeDialog] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('');
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null);
  const [editingUnidade, setEditingUnidade] = useState<string | null>(null);

  // Estados para status customizáveis
  const [statusList, setStatusList] = useState<{id: string; nome: string; cor: string}[]>(STATUS_PADRAO);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [novoStatus, setNovoStatus] = useState({ id: '', nome: '', cor: 'bg-gray-100 text-gray-700 border-gray-300' });
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  // Estados para "Usado para" customizáveis
  const [usadoParaList, setUsadoParaList] = useState<string[]>(USADO_PARA_PADRAO);
  const [showUsadoParaDialog, setShowUsadoParaDialog] = useState(false);
  const [novoUsadoPara, setNovoUsadoPara] = useState('');
  const [editingUsadoPara, setEditingUsadoPara] = useState<string | null>(null);

  // Estados para Kanban drag and drop e modal de detalhes
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<Movimentacao | null>(null);
  const [showMovimentacaoDetalhes, setShowMovimentacaoDetalhes] = useState(false);
  const [movimentacaoHistorico, setMovimentacaoHistorico] = useState<MovimentacaoHistorico[]>([]);
  const [funilCardInfo, setFunilCardInfo] = useState<FunilCardInfo | null>(null);

  // Estados para atividades (Tarefa e Checklist)
  const [showAtividadeDialog, setShowAtividadeDialog] = useState(false);
  const [tipoAtividade, setTipoAtividade] = useState<'tarefa' | 'checklist'>('tarefa');
  const [atividadeForm, setAtividadeForm] = useState<Partial<Atividade>>({
    descricao: '',
    prazo: '',
    horario: '',
    membro_nome: '',
    itens_checklist: []
  });
  const [novoItemChecklist, setNovoItemChecklist] = useState('');
  
  // Estados para modelos de atividades
  const [modelosAtividade, setModelosAtividade] = useState<{id: string; tipo: 'tarefa' | 'checklist'; nome: string; descricao: string; itens?: string[]}[]>([]);
  const [showModelosDialog, setShowModelosDialog] = useState(false);
  const [novoModelo, setNovoModelo] = useState({ nome: '', descricao: '', itens: [] as string[] });
  
  // Estados para membros da empresa
  const [membrosEmpresa, setMembrosEmpresa] = useState<{id: string; nome: string; email?: string}[]>([]);
  
  // Estados para anexos
  const [anexosAtividade, setAnexosAtividade] = useState<{id: string; nome: string; url: string; tipo: string}[]>([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  
  // Estado para detalhes do Kit
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [showKitDetalhes, setShowKitDetalhes] = useState(false);

  // Carregar dados do Supabase
  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    if (!empresaId) return;
    setLoading(true);
    
    try {
      // Carregar equipamentos
      const { data: equipamentosData, error: equipamentosError } = await (supabase as any)
        .from('equipamentos_sst')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (equipamentosError) throw equipamentosError;
      if (equipamentosData) setEquipamentos(equipamentosData);

      // Carregar kits com seus itens
      const { data: kitsData, error: kitsError } = await (supabase as any)
        .from('equipamentos_kits')
        .select('*, equipamentos_kit_itens(equipamento_id, quantidade)')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (kitsError) throw kitsError;
      if (kitsData) {
        const kitsFormatados = kitsData.map((kit: any) => ({
          ...kit,
          equipamentos: kit.equipamentos_kit_itens || []
        }));
        setKits(kitsFormatados);
      }

      // Carregar movimentações
      const { data: movimentacoesData, error: movimentacoesError } = await (supabase as any)
        .from('equipamentos_movimentacoes')
        .select(`
          *,
          equipamento:equipamentos_sst(*),
          usuario_separou:profiles!equipamentos_movimentacoes_usuario_separou_id_fkey(nome),
          usuario_utilizou:profiles!equipamentos_movimentacoes_usuario_utilizou_id_fkey(nome),
          usuario_recebeu:profiles!equipamentos_movimentacoes_usuario_recebeu_id_fkey(nome)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      
      if (movimentacoesError) throw movimentacoesError;
      if (movimentacoesData) setMovimentacoes(movimentacoesData);

      // Carregar categorias
      const { data: categoriasData, error: categoriasError } = await (supabase as any)
        .from('equipamentos_categorias')
        .select('nome')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (!categoriasError && categoriasData && categoriasData.length > 0) {
        setCategorias(categoriasData.map((c: any) => c.nome));
      }

      // Carregar unidades
      const { data: unidadesData, error: unidadesError } = await (supabase as any)
        .from('equipamentos_unidades')
        .select('nome')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (!unidadesError && unidadesData && unidadesData.length > 0) {
        setUnidades(unidadesData.map((u: any) => u.nome));
      }

      // Carregar status
      const { data: statusData, error: statusError } = await (supabase as any)
        .from('equipamentos_status')
        .select('codigo, nome, cor')
        .eq('empresa_id', empresaId);
      
      if (!statusError && statusData && statusData.length > 0) {
        setStatusList(statusData.map((s: any) => ({ id: s.codigo, nome: s.nome, cor: s.cor })));
      }

      // Carregar finalidades (usado para)
      const { data: finalidadesData, error: finalidadesError } = await (supabase as any)
        .from('equipamentos_finalidades')
        .select('nome')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (!finalidadesError && finalidadesData && finalidadesData.length > 0) {
        setUsadoParaList(finalidadesData.map((f: any) => f.nome));
      }

      // Carregar modelos de atividades
      const { data: modelosData, error: modelosError } = await (supabase as any)
        .from('equipamentos_modelos_atividade')
        .select('*')
        .eq('empresa_id', empresaId);
      
      if (!modelosError && modelosData) {
        setModelosAtividade(modelosData.map((m: any) => ({
          id: m.id,
          tipo: m.tipo,
          nome: m.nome,
          descricao: m.descricao || '',
          itens: m.itens || []
        })));
      }

      // Carregar membros da empresa
      await loadMembrosEmpresa();
      
      // Carregar clientes
      await loadClientes();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ 
        title: 'Erro ao carregar dados', 
        description: 'Não foi possível carregar os dados. Verifique sua conexão.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar membros da empresa SST
  const loadMembrosEmpresa = async () => {
    try {
      if (!empresaId) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      if (data) setMembrosEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  // Carregar clientes da empresa SST
  const loadClientes = async () => {
    try {
      if (!empresaId) return;
      
      const { data, error } = await supabase
        .from('clientes_sst')
        .select('id, nome')
        .eq('empresa_sst_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      if (data) setClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Carregar histórico de uma movimentação
  const loadMovimentacaoHistorico = async (movimentacaoId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('equipamentos_movimentacoes_historico')
        .select('*')
        .eq('movimentacao_id', movimentacaoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMovimentacaoHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setMovimentacaoHistorico([]);
    }
  };

  // Carregar informações do funil/card atrelado à movimentação
  const loadFunilCardInfo = async (funilCardId: string | null | undefined) => {
    if (!funilCardId) {
      setFunilCardInfo(null);
      return;
    }
    
    try {
      const { data, error } = await (supabase as any)
        .from('funil_cards')
        .select('id, titulo, funil:funis(id, nome)')
        .eq('id', funilCardId)
        .single();
      
      if (error) throw error;
      setFunilCardInfo(data);
    } catch (error) {
      console.error('Erro ao carregar info do funil/card:', error);
      setFunilCardInfo(null);
    }
  };

  // Registrar histórico de movimentação
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
      const { error } = await (supabase as any)
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
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
    }
  };

  // Gerar código automático: EQ-AAAA-NNN
  const gerarCodigoEquipamento = () => {
    const ano = new Date().getFullYear();
    const equipamentosDoAno = equipamentos.filter(e => e.codigo.includes(`EQ-${ano}`));
    const proximoNumero = equipamentosDoAno.length + 1;
    return `EQ-${ano}-${String(proximoNumero).padStart(3, '0')}`;
  };

  // Gerar código automático para Kit: KIT-001, KIT-002...
  const gerarCodigoKit = () => {
    // Encontrar o maior número existente nos códigos de kit
    let maxNumero = 0;
    kits.forEach(kit => {
      const match = kit.codigo?.match(/KIT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumero) maxNumero = num;
      }
    });
    const proximoNumero = maxNumero + 1;
    return `KIT-${String(proximoNumero).padStart(3, '0')}`;
  };

  // Calcular quantidade de equipamentos já alocados em outros kits
  const calcularQuantidadeAlocadaEmKits = (equipamentoId: string, kitIdAtual?: string): number => {
    let totalAlocado = 0;
    kits.forEach(kit => {
      // Ignorar o kit atual (se estiver editando)
      if (kitIdAtual && kit.id === kitIdAtual) return;
      
      const itemNoKit = kit.equipamentos?.find(item => item.equipamento_id === equipamentoId);
      if (itemNoKit) {
        totalAlocado += itemNoKit.quantidade;
      }
    });
    return totalAlocado;
  };

  // Calcular quantidade livre de um equipamento (não alocada em kits)
  const calcularQuantidadeLivre = (equipamentoId: string, kitIdAtual?: string): number => {
    const equipamento = equipamentos.find(eq => eq.id === equipamentoId);
    if (!equipamento) return 0;
    
    const quantidadeTotal = equipamento.quantidade || 0;
    const quantidadeAlocada = calcularQuantidadeAlocadaEmKits(equipamentoId, kitIdAtual);
    
    return Math.max(0, quantidadeTotal - quantidadeAlocada);
  };

  // CRUD Categorias
  const handleSaveCategoria = async () => {
    if (!novaCategoria.trim() || !empresaId) {
      toast({ title: 'Erro', description: 'Digite o nome da categoria.', variant: 'destructive' });
      return;
    }
    
    try {
      if (editingCategoria) {
        // Atualizar categoria existente
        const { error } = await (supabase as any)
          .from('equipamentos_categorias')
          .update({ nome: novaCategoria.trim() })
          .eq('empresa_id', empresaId)
          .eq('nome', editingCategoria);
        
        if (error) throw error;
        
        // Atualizar equipamentos com a categoria antiga
        await (supabase as any)
          .from('equipamentos_sst')
          .update({ categoria: novaCategoria.trim() })
          .eq('empresa_id', empresaId)
          .eq('categoria', editingCategoria);
        
      } else {
        if (categorias.includes(novaCategoria.trim())) {
          toast({ title: 'Erro', description: 'Categoria já existe.', variant: 'destructive' });
          return;
        }
        
        const { error } = await (supabase as any)
          .from('equipamentos_categorias')
          .insert({ empresa_id: empresaId, nome: novaCategoria.trim() });
        
        if (error) throw error;
      }
      
      await loadData();
      setNovaCategoria('');
      setEditingCategoria(null);
      toast({ title: 'Sucesso', description: editingCategoria ? 'Categoria atualizada.' : 'Categoria adicionada.' });
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a categoria.', variant: 'destructive' });
    }
  };

  const handleDeleteCategoria = async (cat: string) => {
    const emUso = equipamentos.some(e => e.categoria === cat);
    if (emUso) {
      toast({ title: 'Erro', description: 'Categoria em uso. Remova os equipamentos primeiro.', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_categorias')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('nome', cat);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Categoria removida.' });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a categoria.', variant: 'destructive' });
    }
  };

  // CRUD Unidades
  const handleSaveUnidade = async () => {
    if (!novaUnidade.trim() || !empresaId) {
      toast({ title: 'Erro', description: 'Digite o nome da unidade.', variant: 'destructive' });
      return;
    }
    
    try {
      if (editingUnidade) {
        const { error } = await (supabase as any)
          .from('equipamentos_unidades')
          .update({ nome: novaUnidade.trim() })
          .eq('empresa_id', empresaId)
          .eq('nome', editingUnidade);
        
        if (error) throw error;
        
        await (supabase as any)
          .from('equipamentos_sst')
          .update({ unidade_medida: novaUnidade.trim() })
          .eq('empresa_id', empresaId)
          .eq('unidade_medida', editingUnidade);
      } else {
        if (unidades.includes(novaUnidade.trim())) {
          toast({ title: 'Erro', description: 'Unidade já existe.', variant: 'destructive' });
          return;
        }
        
        const { error } = await (supabase as any)
          .from('equipamentos_unidades')
          .insert({ empresa_id: empresaId, nome: novaUnidade.trim() });
        
        if (error) throw error;
      }
      
      await loadData();
      setNovaUnidade('');
      setEditingUnidade(null);
      toast({ title: 'Sucesso', description: editingUnidade ? 'Unidade atualizada.' : 'Unidade adicionada.' });
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a unidade.', variant: 'destructive' });
    }
  };

  const handleDeleteUnidade = async (uni: string) => {
    const emUso = equipamentos.some(e => e.unidade_medida === uni);
    if (emUso) {
      toast({ title: 'Erro', description: 'Unidade em uso. Remova os equipamentos primeiro.', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_unidades')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('nome', uni);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Unidade removida.' });
    } catch (error) {
      console.error('Erro ao remover unidade:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a unidade.', variant: 'destructive' });
    }
  };

  // CRUD Status
  const handleSaveStatus = async () => {
    if (!novoStatus.nome.trim() || !empresaId) {
      toast({ title: 'Erro', description: 'Digite o nome do status.', variant: 'destructive' });
      return;
    }
    
    const statusId = novoStatus.id || novoStatus.nome.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    try {
      if (editingStatus) {
        const { error } = await (supabase as any)
          .from('equipamentos_status')
          .update({ codigo: statusId, nome: novoStatus.nome.trim(), cor: novoStatus.cor })
          .eq('empresa_id', empresaId)
          .eq('codigo', editingStatus);
        
        if (error) throw error;
        
        await (supabase as any)
          .from('equipamentos_sst')
          .update({ status: statusId })
          .eq('empresa_id', empresaId)
          .eq('status', editingStatus);
      } else {
        if (statusList.some(s => s.id === statusId)) {
          toast({ title: 'Erro', description: 'Status já existe.', variant: 'destructive' });
          return;
        }
        
        const { error } = await (supabase as any)
          .from('equipamentos_status')
          .insert({ empresa_id: empresaId, codigo: statusId, nome: novoStatus.nome.trim(), cor: novoStatus.cor });
        
        if (error) throw error;
      }
      
      await loadData();
      setNovoStatus({ id: '', nome: '', cor: 'bg-gray-100 text-gray-700 border-gray-300' });
      setEditingStatus(null);
      toast({ title: 'Sucesso', description: editingStatus ? 'Status atualizado.' : 'Status adicionado.' });
    } catch (error) {
      console.error('Erro ao salvar status:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o status.', variant: 'destructive' });
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    const emUso = equipamentos.some(e => e.status === statusId);
    if (emUso) {
      toast({ title: 'Erro', description: 'Status em uso. Remova os equipamentos primeiro.', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_status')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('codigo', statusId);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Status removido.' });
    } catch (error) {
      console.error('Erro ao remover status:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover o status.', variant: 'destructive' });
    }
  };

  // CRUD Usado Para
  const handleSaveUsadoPara = async () => {
    if (!novoUsadoPara.trim() || !empresaId) {
      toast({ title: 'Erro', description: 'Digite o nome da finalidade.', variant: 'destructive' });
      return;
    }
    
    try {
      if (editingUsadoPara) {
        const { error } = await (supabase as any)
          .from('equipamentos_finalidades')
          .update({ nome: novoUsadoPara.trim() })
          .eq('empresa_id', empresaId)
          .eq('nome', editingUsadoPara);
        
        if (error) throw error;
      } else {
        if (usadoParaList.includes(novoUsadoPara.trim())) {
          toast({ title: 'Erro', description: 'Finalidade já existe.', variant: 'destructive' });
          return;
        }
        
        const { error } = await (supabase as any)
          .from('equipamentos_finalidades')
          .insert({ empresa_id: empresaId, nome: novoUsadoPara.trim() });
        
        if (error) throw error;
      }
      
      await loadData();
      setNovoUsadoPara('');
      setEditingUsadoPara(null);
      toast({ title: 'Sucesso', description: editingUsadoPara ? 'Finalidade atualizada.' : 'Finalidade adicionada.' });
    } catch (error) {
      console.error('Erro ao salvar finalidade:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a finalidade.', variant: 'destructive' });
    }
  };

  const handleDeleteUsadoPara = async (item: string) => {
    const emUso = equipamentos.some(e => e.usado_para?.includes(item));
    if (emUso) {
      toast({ title: 'Erro', description: 'Finalidade em uso. Remova dos equipamentos primeiro.', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_finalidades')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('nome', item);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Finalidade removida.' });
    } catch (error) {
      console.error('Erro ao remover finalidade:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a finalidade.', variant: 'destructive' });
    }
  };

  // CRUD Equipamentos
  const handleSaveEquipamento = async () => {
    if (!equipamentoForm.nome || !equipamentoForm.categoria || !empresaId) {
      toast({ title: 'Erro', description: 'Preencha nome e categoria.', variant: 'destructive' });
      return;
    }

    try {
      if (editingEquipamento) {
        const { error } = await (supabase as any)
          .from('equipamentos_sst')
          .update({
            nome: equipamentoForm.nome,
            codigo: equipamentoForm.codigo,
            numero_serie: equipamentoForm.numero_serie,
            categoria: equipamentoForm.categoria,
            unidade_medida: equipamentoForm.unidade_medida,
            quantidade: equipamentoForm.quantidade,
            usado_para: equipamentoForm.usado_para,
            status: equipamentoForm.status,
            local_base: equipamentoForm.local_base,
            validade_calibracao: equipamentoForm.validade_calibracao,
            observacoes: equipamentoForm.observacoes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEquipamento.id);
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Equipamento atualizado.' });
      } else {
        const { error } = await (supabase as any)
          .from('equipamentos_sst')
          .insert({
            empresa_id: empresaId,
            nome: equipamentoForm.nome,
            codigo: equipamentoForm.codigo || gerarCodigoEquipamento(),
            numero_serie: equipamentoForm.numero_serie,
            categoria: equipamentoForm.categoria,
            unidade_medida: equipamentoForm.unidade_medida,
            quantidade: equipamentoForm.quantidade || 1,
            usado_para: equipamentoForm.usado_para,
            status: equipamentoForm.status || 'disponivel',
            local_base: equipamentoForm.local_base,
            validade_calibracao: equipamentoForm.validade_calibracao,
            observacoes: equipamentoForm.observacoes
          });
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Equipamento cadastrado.' });
      }

      await loadData();
      setShowEquipamentoDialog(false);
      setEquipamentoForm({ status: 'disponivel', categoria: '' });
      setEditingEquipamento(null);
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o equipamento.', variant: 'destructive' });
    }
  };

  const handleDeleteEquipamento = async (id: string) => {
    if (!confirm('Deseja realmente excluir este equipamento?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_sst')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Equipamento excluído.' });
    } catch (error) {
      console.error('Erro ao excluir equipamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o equipamento.', variant: 'destructive' });
    }
  };

  // Validar se há estoque suficiente para criar a quantidade de kits
  const validarEstoqueParaKits = (qtdKits: number): { valido: boolean; mensagem: string } => {
    if (!kitForm.equipamentos || kitForm.equipamentos.length === 0) {
      return { valido: true, mensagem: '' };
    }
    
    const equipamentosInsuficientes: string[] = [];
    
    for (const item of kitForm.equipamentos) {
      const equipamento = equipamentos.find(eq => eq.id === item.equipamento_id);
      if (!equipamento) continue;
      
      const quantidadeNecessaria = item.quantidade * qtdKits;
      // Usar quantidade LIVRE (não alocada em outros kits)
      const quantidadeLivre = calcularQuantidadeLivre(item.equipamento_id, editingKit?.id);
      
      if (quantidadeNecessaria > quantidadeLivre) {
        equipamentosInsuficientes.push(
          `${equipamento.nome}: necessário ${quantidadeNecessaria}, livre ${quantidadeLivre}`
        );
      }
    }
    
    if (equipamentosInsuficientes.length > 0) {
      return {
        valido: false,
        mensagem: `Estoque insuficiente para criar ${qtdKits} kit(s):\n${equipamentosInsuficientes.join('\n')}`
      };
    }
    
    return { valido: true, mensagem: '' };
  };

  // Calcular quantidade máxima de kits possíveis
  const calcularMaxKitsPossiveis = (): number => {
    if (!kitForm.equipamentos || kitForm.equipamentos.length === 0) {
      return 99;
    }
    
    let maxKits = Infinity;
    
    for (const item of kitForm.equipamentos) {
      // Usar quantidade LIVRE (não alocada em outros kits)
      const quantidadeLivre = calcularQuantidadeLivre(item.equipamento_id, editingKit?.id);
      const kitsPossiveis = Math.floor(quantidadeLivre / item.quantidade);
      maxKits = Math.min(maxKits, kitsPossiveis);
    }
    
    return maxKits === Infinity ? 99 : Math.max(0, maxKits);
  };

  // CRUD Kits
  const handleSaveKit = async () => {
    if (!kitForm.nome || !kitForm.tipo_servico || !empresaId) {
      toast({ title: 'Erro', description: 'Preencha nome e tipo de serviço.', variant: 'destructive' });
      return;
    }

    try {
      if (editingKit) {
        const { error } = await (supabase as any)
          .from('equipamentos_kits')
          .update({
            nome: kitForm.nome,
            codigo: kitForm.codigo,
            tipo_servico: kitForm.tipo_servico,
            descricao: kitForm.descricao,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingKit.id);
        
        if (error) throw error;
        
        // Atualizar itens do kit
        await (supabase as any)
          .from('equipamentos_kit_itens')
          .delete()
          .eq('kit_id', editingKit.id);
        
        if (kitForm.equipamentos && kitForm.equipamentos.length > 0) {
          const itens = kitForm.equipamentos.map(item => ({
            kit_id: editingKit.id,
            equipamento_id: item.equipamento_id,
            quantidade: item.quantidade
          }));
          
          await (supabase as any)
            .from('equipamentos_kit_itens')
            .insert(itens);
        }

        toast({ title: 'Sucesso', description: 'Kit atualizado.' });
      } else {
        const { data: newKit, error } = await (supabase as any)
          .from('equipamentos_kits')
          .insert({
            empresa_id: empresaId,
            nome: kitForm.nome,
            codigo: gerarCodigoKit(),
            tipo_servico: kitForm.tipo_servico,
            descricao: kitForm.descricao
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Inserir itens do kit
        if (kitForm.equipamentos && kitForm.equipamentos.length > 0 && newKit) {
          const itens = kitForm.equipamentos.map(item => ({
            kit_id: newKit.id,
            equipamento_id: item.equipamento_id,
            quantidade: item.quantidade
          }));
          
          await (supabase as any)
            .from('equipamentos_kit_itens')
            .insert(itens);
        }
        
        toast({ title: 'Sucesso', description: 'Kit cadastrado com sucesso.' });
      }

      await loadData();
      setShowKitDialog(false);
      setKitForm({ tipo_servico: [], equipamentos: [] });
      setEditingKit(null);
    } catch (error) {
      console.error('Erro ao salvar kit:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o kit.', variant: 'destructive' });
    }
  };

  const handleDeleteKit = async (id: string) => {
    if (!confirm('Deseja realmente excluir este kit?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('equipamentos_kits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadData();
      toast({ title: 'Sucesso', description: 'Kit excluído.' });
    } catch (error) {
      console.error('Erro ao excluir kit:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o kit.', variant: 'destructive' });
    }
  };

  // Movimentações - Kits ou Equipamentos Individuais
  const handleSaveMovimentacao = async () => {
    // Validação comum
    if (!movimentacaoForm.tipo_servico || !movimentacaoForm.cliente_id || !empresaId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    // Validação específica por tipo
    if (tipoMovimentacao === 'kit') {
      if (!movimentacaoForm.kit_id) {
        toast({ title: 'Erro', description: 'Selecione um Kit.', variant: 'destructive' });
        return;
      }
      
      const kit = kits.find(k => k.id === movimentacaoForm.kit_id);
      if (!kit) {
        toast({ title: 'Erro', description: 'Kit não encontrado.', variant: 'destructive' });
        return;
      }
      
      // Se for movimentação de saída, verificar disponibilidade de todos os equipamentos do kit
      if (movimentacaoForm.tipo === 'saida') {
        const qtdKits = movimentacaoForm.quantidade || 1;
        const estoqueInsuficiente = kit.equipamentos.some(item => {
          const { disponivel } = calcularDisponibilidade(item.equipamento_id);
          const qtdNecessaria = item.quantidade * qtdKits;
          return disponivel < qtdNecessaria;
        });
        
        if (estoqueInsuficiente) {
          toast({ 
            title: 'Estoque Insuficiente', 
            description: 'Um ou mais equipamentos do kit não possuem estoque disponível para esta movimentação.', 
            variant: 'destructive' 
          });
          return;
        }
      }

      try {
        const now = new Date().toISOString();
        
        // Inserir movimentação de kit
        const { data: newMovimentacao, error } = await (supabase as any)
          .from('equipamentos_movimentacoes')
          .insert({
            empresa_id: empresaId,
            kit_id: movimentacaoForm.kit_id,
            tipo: movimentacaoForm.tipo || 'saida',
            quantidade: movimentacaoForm.quantidade || 1,
            tipo_servico: movimentacaoForm.tipo_servico,
            cliente_id: movimentacaoForm.cliente_id,
            responsavel_retirada: movimentacaoForm.responsavel_retirada,
            usuario_separou_id: profile?.id,
            data_saida: movimentacaoForm.tipo === 'saida' ? now : null,
            data_retorno: movimentacaoForm.tipo === 'entrada' ? now : null,
            status: movimentacaoForm.status || 'demanda',
            observacoes: movimentacaoForm.observacoes
          })
          .select()
          .single();
        
        if (error) throw error;

        await loadData();
        toast({ 
          title: 'Sucesso', 
          description: `Movimentação ${newMovimentacao?.numero_movimentacao || ''} registrada com sucesso!` 
        });
        setShowMovimentacaoDialog(false);
        setMovimentacaoForm({ tipo: 'saida', status: 'demanda' });
        setTipoMovimentacao('kit');
      } catch (error) {
        console.error('Erro ao salvar movimentação:', error);
        toast({ title: 'Erro', description: 'Não foi possível salvar a movimentação.', variant: 'destructive' });
      }
    } else {
      // Movimentação de equipamentos individuais - cria UMA única movimentação com lista de equipamentos
      if (equipamentosMovimentacao.length === 0) {
        toast({ title: 'Erro', description: 'Adicione pelo menos um equipamento.', variant: 'destructive' });
        return;
      }

      // Verificar disponibilidade de todos os equipamentos
      if (movimentacaoForm.tipo === 'saida') {
        const estoqueInsuficiente = equipamentosMovimentacao.some(item => {
          const { disponivel } = calcularDisponibilidade(item.equipamento_id);
          return disponivel < item.quantidade;
        });
        
        if (estoqueInsuficiente) {
          toast({ 
            title: 'Estoque Insuficiente', 
            description: 'Um ou mais equipamentos não possuem estoque disponível.', 
            variant: 'destructive' 
          });
          return;
        }
      }

      try {
        const now = new Date().toISOString();
        
        // Calcular quantidade total de itens
        const qtdTotal = equipamentosMovimentacao.reduce((acc, item) => acc + item.quantidade, 0);
        
        // Criar UMA única movimentação com a lista de equipamentos em JSON
        const { data: newMovimentacao, error } = await (supabase as any)
          .from('equipamentos_movimentacoes')
          .insert({
            empresa_id: empresaId,
            equipamentos_lista: equipamentosMovimentacao,
            tipo: movimentacaoForm.tipo || 'saida',
            quantidade: qtdTotal,
            tipo_servico: movimentacaoForm.tipo_servico,
            cliente_id: movimentacaoForm.cliente_id,
            responsavel_retirada: movimentacaoForm.responsavel_retirada,
            usuario_separou_id: profile?.id,
            data_saida: movimentacaoForm.tipo === 'saida' ? now : null,
            data_retorno: movimentacaoForm.tipo === 'entrada' ? now : null,
            status: movimentacaoForm.status || 'demanda',
            observacoes: movimentacaoForm.observacoes
          })
          .select()
          .single();
        
        if (error) throw error;

        await loadData();
        toast({ 
          title: 'Sucesso', 
          description: `Movimentação ${newMovimentacao?.numero_movimentacao || ''} registrada com ${equipamentosMovimentacao.length} equipamento(s)!` 
        });
        setShowMovimentacaoDialog(false);
        setMovimentacaoForm({ tipo: 'saida', status: 'demanda' });
        setEquipamentosMovimentacao([]);
        setTipoMovimentacao('kit');
      } catch (error) {
        console.error('Erro ao salvar movimentação:', error);
        toast({ title: 'Erro', description: 'Não foi possível salvar a movimentação.', variant: 'destructive' });
      }
    }
  };

  // Função para calcular quantidade disponível de um equipamento
  // Disponível = Total - Em Uso (movimentações ativas, não devolvidas)
  const calcularDisponibilidade = (equipamentoId: string): { total: number; emUso: number; disponivel: number } => {
    const equip = equipamentos.find(e => e.id === equipamentoId);
    const qtdTotal = equip?.quantidade || 0;
    
    // Calcular quantidade em uso baseado nas movimentações ativas
    let qtdEmUso = 0;
    
    // Movimentações de equipamentos individuais (campo equipamento_id)
    movimentacoes
      .filter(m => m.equipamento_id === equipamentoId && m.status !== 'devolvido')
      .forEach(m => {
        qtdEmUso += m.quantidade || 1;
      });
    
    // Movimentações de kits que contêm este equipamento
    movimentacoes
      .filter(m => m.kit_id && m.status !== 'devolvido')
      .forEach(m => {
        const kitMov = kits.find(k => k.id === m.kit_id);
        if (kitMov) {
          const itemKit = kitMov.equipamentos.find(item => item.equipamento_id === equipamentoId);
          if (itemKit) {
            qtdEmUso += itemKit.quantidade * (m.quantidade || 1);
          }
        }
      });
    
    // Movimentações com lista de equipamentos (campo equipamentos_lista)
    movimentacoes
      .filter(m => m.equipamentos_lista && m.status !== 'devolvido')
      .forEach(m => {
        const itemLista = m.equipamentos_lista?.find(item => item.equipamento_id === equipamentoId);
        if (itemLista) {
          qtdEmUso += itemLista.quantidade;
        }
      });
    
    return {
      total: qtdTotal,
      emUso: qtdEmUso,
      disponivel: Math.max(0, qtdTotal - qtdEmUso)
    };
  };

  // Função para calcular quantos kits é possível formar com o estoque disponível
  const calcularKitsPossiveis = (kitId: string): number => {
    const kit = kits.find(k => k.id === kitId);
    if (!kit || !kit.equipamentos.length) return 0;
    
    let maxKits = Infinity;
    
    for (const item of kit.equipamentos) {
      const { disponivel } = calcularDisponibilidade(item.equipamento_id);
      const kitsPossiveis = Math.floor(disponivel / item.quantidade);
      maxKits = Math.min(maxKits, kitsPossiveis);
    }
    
    return maxKits === Infinity ? 0 : maxKits;
  };

  // Filtros
  const equipamentosFiltrados = equipamentos.filter(e => {
    if (filtroCategoria && e.categoria !== filtroCategoria) return false;
    if (filtroStatus && e.status !== filtroStatus) return false;
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      if (!e.nome.toLowerCase().includes(busca) && 
          !e.codigo.toLowerCase().includes(busca) &&
          !(e.numero_serie?.toLowerCase().includes(busca))) {
        return false;
      }
    }
    return true;
  });

  // Dashboard stats
  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(e => e.status === 'disponivel').length,
    emUso: equipamentos.filter(e => e.status === 'em_uso').length,
    manutencao: equipamentos.filter(e => e.status === 'manutencao').length,
    movimentacoesHoje: movimentacoes.filter(m => 
      m.created_at.startsWith(new Date().toISOString().split('T')[0])
    ).length,
    kitsAtivos: kits.length
  };

  // Menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'cadastro-equipamento', label: 'Cadastro de Equipamento', icon: Package },
    { id: 'cadastro-kit', label: 'Cadastro de Kit', icon: Layers },
    { id: 'movimentacoes', label: 'Movimentações', icon: ArrowRightLeft },
    { id: 'consulta', label: 'Consulta e Controle', icon: Search },
    { id: 'historico', label: 'Histórico', icon: History }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <HardHat className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Controle de Equipamentos SST</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro, movimentação e controle de equipamentos de segurança
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {stats.total} equipamentos • {stats.movimentacoesHoje} movimentações hoje
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Total</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-100 border-green-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
              <span className="text-sm font-medium text-green-800">Disponíveis</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.disponiveis}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-100 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-700" />
              <span className="text-sm font-medium text-blue-800">Em Uso</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.emUso}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-100 border-amber-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Manutenção</span>
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.manutencao}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-100 border-orange-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-orange-700" />
              <span className="text-sm font-medium text-orange-800">Mov. Hoje</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-1">{stats.movimentacoesHoje}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-indigo-100 border-indigo-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-700" />
              <span className="text-sm font-medium text-indigo-800">Kits</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.kitsAtivos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Horizontal - Tabs */}
      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as MenuSection)}>
        <TabsList className="w-full inline-flex h-10 items-center justify-start rounded-md bg-primary p-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Área de Conteúdo */}
      <div>
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
                <CardDescription>Resumo do controle de equipamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Equipamentos por categoria */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categorias.map(cat => {
                          const count = equipamentos.filter(e => e.categoria === cat).length;
                          if (count === 0) return null;
                          return (
                            <div key={cat} className="flex justify-between items-center">
                              <span className="text-sm">{cat}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          );
                        })}
                        {equipamentos.length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Últimas movimentações */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Últimas Movimentações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {movimentacoes.slice(-5).reverse().map(mov => (
                          <div key={mov.id} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{mov.equipamento?.nome || 'Equipamento'}</span>
                              <span className="text-muted-foreground ml-2">
                                {mov.tipo === 'saida' ? '→ Saída' : '← Entrada'}
                              </span>
                            </div>
                            <Badge className={STATUS_COLORS[mov.status]}>
                              {STATUS_LABELS[mov.status]}
                            </Badge>
                          </div>
                        ))}
                        {movimentacoes.length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Controle do Almoxarifado */}
                <Card className="mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Box className="h-4 w-4 text-primary" />
                      Controle do Almoxarifado
                    </CardTitle>
                    <CardDescription className="text-xs">Materiais e quantidades disponíveis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 text-xs font-medium">Material</th>
                            <th className="text-left p-2 text-xs font-medium">Código</th>
                            <th className="text-left p-2 text-xs font-medium">Categoria</th>
                            <th className="text-center p-2 text-xs font-medium">Qtd. Total</th>
                            <th className="text-center p-2 text-xs font-medium">Qtd. em Uso</th>
                            <th className="text-center p-2 text-xs font-medium">Qtd. Disponível</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equipamentos.filter(eq => (eq.quantidade || 0) > 0).map(eq => {
                            const qtdTotal = eq.quantidade || 0;
                            
                            // Calcular quantidade em uso (equipamento individual + kits)
                            let qtdEmUso = 0;
                            
                            // Movimentações de equipamento individual
                            qtdEmUso += movimentacoes
                              .filter(m => m.equipamento_id === eq.id && m.tipo === 'saida' && m.status !== 'devolvido')
                              .reduce((acc, m) => acc + (m.quantidade || 1), 0);
                            
                            // Movimentações de Kits que contêm este equipamento
                            movimentacoes
                              .filter(m => m.kit_id && m.tipo === 'saida' && m.status !== 'devolvido')
                              .forEach(m => {
                                const kitMov = kits.find(k => k.id === m.kit_id);
                                if (kitMov) {
                                  const itemKit = kitMov.equipamentos.find(item => item.equipamento_id === eq.id);
                                  if (itemKit) {
                                    qtdEmUso += itemKit.quantidade * (m.quantidade || 1);
                                  }
                                }
                              });
                            
                            const qtdDisponivel = Math.max(0, qtdTotal - qtdEmUso);
                            
                            return (
                              <tr key={eq.id} className="border-t hover:bg-muted/30">
                                <td className="p-2">
                                  <span className="text-sm font-medium">{eq.nome}</span>
                                </td>
                                <td className="p-2">
                                  <span className="text-xs font-mono text-muted-foreground">{eq.codigo}</span>
                                </td>
                                <td className="p-2">
                                  <span className="text-xs">{eq.categoria}</span>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline">{qtdTotal}</Badge>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant={qtdEmUso > 0 ? 'secondary' : 'outline'} className={qtdEmUso > 0 ? 'bg-blue-100 text-blue-700' : ''}>
                                    {qtdEmUso}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant={qtdDisponivel > 5 ? 'default' : qtdDisponivel > 0 ? 'secondary' : 'destructive'}>
                                    {qtdDisponivel}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                          {equipamentos.filter(eq => (eq.quantidade || 0) > 0).length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                                Nenhum material cadastrado no almoxarifado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                      <span>
                        Total de itens: {equipamentos.reduce((acc, eq) => acc + (eq.quantidade || 0), 0)}
                      </span>
                      <span>
                        {equipamentos.filter(eq => (eq.quantidade || 0) > 0).length} materiais cadastrados
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ações rápidas */}
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Button onClick={() => { setActiveSection('cadastro-equipamento'); setShowEquipamentoDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Equipamento
                  </Button>
                  <Button variant="outline" onClick={() => { setActiveSection('movimentacoes'); setShowMovimentacaoDialog(true); }}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Nova Movimentação
                  </Button>
                  <Button variant="outline" onClick={() => { setActiveSection('cadastro-kit'); setShowKitDialog(true); }}>
                    <Layers className="h-4 w-4 mr-1" />
                    Novo Kit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cadastro de Equipamento */}
          {activeSection === 'cadastro-equipamento' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cadastro de Equipamentos</CardTitle>
                  <CardDescription>Gerencie os equipamentos de SST</CardDescription>
                </div>
                <Button onClick={() => { setEditingEquipamento(null); setEquipamentoForm({ status: 'disponivel', categoria: '' }); setShowEquipamentoDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Equipamento
                </Button>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Input
                    placeholder="Buscar por nome, código ou série..."
                    value={filtroBusca}
                    onChange={e => setFiltroBusca(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={filtroCategoria || "__all__"} onValueChange={(v) => setFiltroCategoria(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categorias.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroStatus || "__all__"} onValueChange={(v) => setFiltroStatus(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lista de equipamentos */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Equipamento</th>
                        <th className="text-left p-3 text-sm font-medium">Código</th>
                        <th className="text-left p-3 text-sm font-medium">Categoria</th>
                        <th className="text-center p-3 text-sm font-medium">Qtd. Total</th>
                        <th className="text-center p-3 text-sm font-medium">Em Uso</th>
                        <th className="text-center p-3 text-sm font-medium">Disponível</th>
                        <th className="text-left p-3 text-sm font-medium">Local</th>
                        <th className="text-left p-3 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosFiltrados.map(eq => {
                        const qtdTotal = eq.quantidade || 0;
                        
                        // Calcular quantidade em uso usando a função centralizada
                        const { emUso: qtdEmUso, disponivel: qtdDisponivel } = calcularDisponibilidade(eq.id);
                        
                        return (
                          <tr key={eq.id} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{eq.nome}</p>
                                {eq.numero_serie && (
                                  <p className="text-xs text-muted-foreground">S/N: {eq.numero_serie}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-sm">{eq.codigo}</td>
                            <td className="p-3 text-sm">{eq.categoria}</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-mono">{qtdTotal}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge 
                                variant={qtdEmUso > 0 ? 'secondary' : 'outline'} 
                                className={`font-mono ${qtdEmUso > 0 ? 'bg-blue-100 text-blue-700' : ''}`}
                              >
                                {qtdEmUso}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge 
                                variant={qtdDisponivel > 5 ? 'default' : qtdDisponivel > 0 ? 'secondary' : 'destructive'}
                                className={`font-mono ${qtdDisponivel > 5 ? 'bg-green-100 text-green-700' : qtdDisponivel > 0 ? 'bg-yellow-100 text-yellow-700' : ''}`}
                              >
                                {qtdDisponivel}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{eq.local_base || '-'}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingEquipamento(eq);
                                    setEquipamentoForm(eq);
                                    setShowEquipamentoDialog(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEquipamento(eq.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {equipamentosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Nenhum equipamento encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cadastro de Kit */}
          {activeSection === 'cadastro-kit' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cadastro de Kits</CardTitle>
                  <CardDescription>Monte kits de equipamentos para serviços</CardDescription>
                </div>
                <Button onClick={() => { setEditingKit(null); setKitForm({ tipo_servico: [], equipamentos: [] }); setShowKitDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Kit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kits.map(kit => (
                    <Card 
                      key={kit.id} 
                      className="border-2 cursor-pointer hover:border-orange-300 transition-colors"
                      onClick={() => {
                        setSelectedKit(kit);
                        setShowKitDetalhes(true);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{kit.nome}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono">{kit.codigo}</p>
                          </div>
                          <Badge variant="secondary">
                            {Array.isArray(kit.tipo_servico) ? kit.tipo_servico.join(', ') : kit.tipo_servico}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {kit.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">{kit.descricao}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span><span className="font-medium">{kit.equipamentos.length}</span> equipamento(s)</span>
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingKit(kit);
                              setKitForm(kit);
                              setShowKitDialog(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteKit(kit.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {kits.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Nenhum kit cadastrado. Clique em "Novo Kit" para começar.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movimentações - Kanban */}
          {activeSection === 'movimentacoes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Movimentações</h2>
                  <p className="text-muted-foreground">Gerencie o fluxo de equipamentos</p>
                </div>
                <Button onClick={() => { setMovimentacaoForm({ tipo: 'saida', status: 'demanda' }); setShowMovimentacaoDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Movimentação
                </Button>
              </div>
              
              {/* Kanban Board */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map(coluna => {
                  const cardsColuna = movimentacoes.filter(m => m.status === coluna.id);
                  return (
                    <div 
                      key={coluna.id} 
                      className={`flex-shrink-0 w-72 rounded-lg border-2 ${coluna.cor} ${draggedCard ? 'transition-all' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('ring-2', 'ring-primary');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('ring-2', 'ring-primary');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-primary');
                        if (draggedCard) {
                          // Verificar se o card arrastado está devolvido
                          const cardArrastado = movimentacoes.find(m => m.id === draggedCard);
                          if (cardArrastado?.status === 'devolvido') {
                            toast({ title: 'Ação bloqueada', description: 'Cards devolvidos não podem ser movimentados.', variant: 'destructive' });
                            setDraggedCard(null);
                            return;
                          }
                          
                          const updated = movimentacoes.map(m => 
                            m.id === draggedCard ? { ...m, status: coluna.id as Movimentacao['status'] } : m
                          );
                          setMovimentacoes(updated);
                          // Atualizar no Supabase
                          await (supabase as any)
                            .from('equipamentos_movimentacoes')
                            .update({ status: coluna.id })
                            .eq('id', draggedCard);
                          setDraggedCard(null);
                          toast({ title: 'Card movido para ' + coluna.nome });
                        }
                      }}
                    >
                      {/* Header da Coluna */}
                      <div className="p-3 border-b bg-background/50 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{coluna.nome}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {cardsColuna.length}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Cards da Coluna */}
                      <div className="p-2 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                        {cardsColuna.map((mov, index) => {
                          const kit = kits.find(k => k.id === mov.kit_id);
                          const getStatusColor = () => {
                            switch (mov.status) {
                              case 'demanda': return 'hsl(220, 14%, 50%)';
                              case 'separado': return 'hsl(270, 60%, 50%)';
                              case 'retirado': return 'hsl(230, 60%, 50%)';
                              case 'em_uso': return 'hsl(200, 80%, 50%)';
                              case 'devolvido': return 'hsl(140, 60%, 40%)';
                              case 'pendente': return 'hsl(30, 80%, 50%)';
                              default: return 'hsl(220, 14%, 50%)';
                            }
                          };
                          const isDevolvido = mov.status === 'devolvido';
                          return (
                            <div 
                              key={mov.id} 
                              draggable={!isDevolvido}
                              onDragStart={() => !isDevolvido && setDraggedCard(mov.id)}
                              onDragEnd={() => setDraggedCard(null)}
                              onClick={async () => {
                                setSelectedMovimentacao(mov);
                                setShowMovimentacaoDetalhes(true);
                                await loadMovimentacaoHistorico(mov.id);
                                await loadFunilCardInfo(mov.funil_card_id);
                              }}
                              className={`relative bg-card rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-all group cursor-pointer border-border hover:border-primary/50 max-h-48 overflow-y-auto ${draggedCard === mov.id ? 'opacity-50 rotate-1 scale-105' : ''} ${isDevolvido ? 'opacity-75 cursor-not-allowed' : ''}`}
                              title={isDevolvido ? 'Este card foi devolvido e não pode ser movimentado' : undefined}
                            >
                              {/* Indicador de status na lateral */}
                              <div 
                                className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                                style={{ backgroundColor: getStatusColor() }}
                              />
                              
                              <div className="pl-3 overflow-hidden">
                                {/* ID da Movimentação */}
                                <div className="flex items-center gap-1 mb-1">
                                  <Badge variant="outline" className="text-2xs font-mono bg-muted/50">
                                    ID: {mov.id.slice(0, 8)}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1 min-w-0 flex-1">
                                    {mov.tipo === 'saida' ? (
                                      <ArrowRightLeft className="h-3 w-3 text-red-500 flex-shrink-0" />
                                    ) : (
                                      <ArrowRightLeft className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    )}
                                    <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">
                                      {mov.numero_movimentacao || `#${index + 1}`} - {
                                        mov.equipamentos_lista && mov.equipamentos_lista.length > 0
                                          ? `${mov.equipamentos_lista.length} equipamento(s)`
                                          : mov.equipamento?.nome || kit?.nome || 'Equipamento'
                                      }
                                    </h4>
                                  </div>
                                  <Badge variant={mov.tipo === 'saida' ? 'destructive' : 'default'} className="text-2xs flex-shrink-0">
                                    {mov.tipo === 'saida' ? 'Saída' : 'Entrada'}
                                  </Badge>
                                </div>
                                
                                {/* Mostrar lista de equipamentos se for movimentação com equipamentos_lista */}
                                {mov.equipamentos_lista && mov.equipamentos_lista.length > 0 ? (
                                  <div className="space-y-0.5 mb-1">
                                    {mov.equipamentos_lista.slice(0, 3).map((item, idx) => {
                                      const equip = equipamentos.find(e => e.id === item.equipamento_id);
                                      return (
                                        <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Package className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{equip?.nome || 'Equipamento'}</span>
                                          <Badge variant="outline" className="text-2xs ml-auto">{item.quantidade}x</Badge>
                                        </div>
                                      );
                                    })}
                                    {mov.equipamentos_lista.length > 3 && (
                                      <p className="text-2xs text-muted-foreground">+{mov.equipamentos_lista.length - 3} mais...</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <Package className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate font-mono">{mov.equipamento?.codigo || kit?.codigo || '-'}</span>
                                  </div>
                                )}
                                
                                {mov.tipo_servico && (
                                  <div className="mt-1 mb-1">
                                    <div className="px-1.5 py-0.5 rounded text-2xs font-medium bg-warning/10 text-warning inline-block truncate max-w-full">
                                      {mov.tipo_servico}
                                    </div>
                                  </div>
                                )}
                                
                                {mov.cliente_id && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{clientes.find(c => c.id === mov.cliente_id)?.nome || 'Cliente'}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1 mt-2 flex-wrap">
                                  {mov.quantidade && (
                                    <Badge variant="outline" className="text-2xs">
                                      Qtd: {mov.quantidade}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between mt-2 gap-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{mov.created_at ? format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm('Deseja excluir esta movimentação?')) {
                                        try {
                                          // Se foi saída, devolver estoque no Supabase
                                          if (mov.tipo === 'saida' && kit) {
                                            const qtdKits = mov.quantidade || 1;
                                            for (const itemKit of kit.equipamentos) {
                                              const equip = equipamentos.find(eq => eq.id === itemKit.equipamento_id);
                                              if (equip) {
                                                await (supabase as any)
                                                  .from('equipamentos_sst')
                                                  .update({ 
                                                    quantidade: (equip.quantidade || 0) + (itemKit.quantidade * qtdKits),
                                                    status: 'disponivel'
                                                  })
                                                  .eq('id', itemKit.equipamento_id);
                                              }
                                            }
                                          }
                                          
                                          // Excluir movimentação no Supabase
                                          await (supabase as any)
                                            .from('equipamentos_movimentacoes')
                                            .delete()
                                            .eq('id', mov.id);
                                          
                                          await loadData();
                                          toast({ title: 'Movimentação excluída' });
                                        } catch (error) {
                                          console.error('Erro ao excluir movimentação:', error);
                                          toast({ title: 'Erro', description: 'Não foi possível excluir a movimentação.', variant: 'destructive' });
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {cardsColuna.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                            <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            <p>Arraste cards para cá</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consulta e Controle */}
          {activeSection === 'consulta' && (
            <Card>
              <CardHeader>
                <CardTitle>Consulta e Controle</CardTitle>
                <CardDescription>Visualize o status de todos os equipamentos</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros avançados */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Input
                    placeholder="Buscar..."
                    value={filtroBusca}
                    onChange={e => setFiltroBusca(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={filtroStatus || "__all__"} onValueChange={(v) => setFiltroStatus(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtroCategoria || "__all__"} onValueChange={(v) => setFiltroCategoria(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categorias.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid de equipamentos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipamentosFiltrados.map(eq => (
                    <Card key={eq.id} className={`border-l-4 ${
                      eq.status === 'disponivel' ? 'border-l-green-500' :
                      eq.status === 'em_uso' ? 'border-l-blue-500' :
                      eq.status === 'manutencao' ? 'border-l-yellow-500' :
                      'border-l-red-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{eq.nome}</p>
                            <p className="text-xs text-muted-foreground font-mono">{eq.codigo}</p>
                          </div>
                          <Badge className={STATUS_COLORS[eq.status]}>
                            {STATUS_LABELS[eq.status]}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">Categoria:</span> {eq.categoria}</p>
                          {eq.local_base && <p><span className="text-muted-foreground">Local:</span> {eq.local_base}</p>}
                          {eq.validade_calibracao && (
                            <p><span className="text-muted-foreground">Calibração:</span> {eq.validade_calibracao}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          {activeSection === 'historico' && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Movimentações</CardTitle>
                <CardDescription>Registro completo de todas as movimentações</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtros de período */}
                <div className="flex gap-3 mb-4 flex-wrap items-end">
                  <div>
                    <Label className="text-xs">De</Label>
                    <Input
                      type="date"
                      value={filtroPeriodo.de}
                      onChange={e => setFiltroPeriodo(p => ({ ...p, de: e.target.value }))}
                      className="w-40"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Até</Label>
                    <Input
                      type="date"
                      value={filtroPeriodo.ate}
                      onChange={e => setFiltroPeriodo(p => ({ ...p, ate: e.target.value }))}
                      className="w-40"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </div>

                {/* Tabela de histórico */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Data/Hora</th>
                        <th className="text-left p-3 text-sm font-medium">Equipamento</th>
                        <th className="text-left p-3 text-sm font-medium">Tipo</th>
                        <th className="text-left p-3 text-sm font-medium">Finalidade</th>
                        <th className="text-left p-3 text-sm font-medium">Profissional</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentacoes.slice().reverse().map(mov => {
                        const kitMov = mov.kit_id ? kits.find(k => k.id === mov.kit_id) : null;
                        
                        return (
                          <tr key={mov.id} className="border-t hover:bg-muted/30">
                            <td className="p-3 text-sm">
                              {format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </td>
                            <td className="p-3">
                              {kitMov ? (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Layers className="h-3 w-3 text-primary" />
                                    <p className="font-medium text-sm text-primary">{kitMov.nome}</p>
                                    <Badge variant="outline" className="text-2xs">{kitMov.codigo}</Badge>
                                  </div>
                                  <div className="pl-5 space-y-0.5">
                                    {kitMov.equipamentos.map((item, idx) => {
                                      const equip = equipamentos.find(e => e.id === item.equipamento_id);
                                      return (
                                        <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                          <span>{equip?.nome || 'Equipamento'}</span>
                                          <span className="text-2xs">({item.quantidade}x)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium text-sm">{mov.equipamento?.nome || '-'}</p>
                                  <p className="text-xs text-muted-foreground">{mov.equipamento?.codigo || '-'}</p>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant={mov.tipo === 'saida' ? 'destructive' : 'default'}>
                                {mov.tipo === 'saida' ? 'Saída' : 'Entrada'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{mov.tipo_servico}</td>
                            <td className="p-3 text-sm">{mov.usuario_separou?.nome || '-'}</td>
                            <td className="p-3">
                              <Badge className={STATUS_COLORS[mov.status]}>
                                {STATUS_LABELS[mov.status]}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {movimentacoes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Nenhuma movimentação registrada
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Dialog: Cadastro de Equipamento */}
      <Dialog open={showEquipamentoDialog} onOpenChange={setShowEquipamentoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
            <DialogDescription>Preencha os dados do equipamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome / Descrição *</Label>
                <Input
                  value={equipamentoForm.nome || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Detector de gases, Tripé de resgate..."
                />
              </div>
              <div>
                <Label>Código interno</Label>
                <Input
                  value={editingEquipamento ? (equipamentoForm.codigo || '') : gerarCodigoEquipamento()}
                  readOnly
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente</p>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Categoria *
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-primary/10"
                    onClick={() => setShowCategoriaDialog(true)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </Label>
                <Select
                  value={equipamentoForm.categoria || '__placeholder__'}
                  onValueChange={v => {
                    if (v !== '__placeholder__') {
                      setEquipamentoForm(f => ({ 
                        ...f, 
                        categoria: v,
                        numero_serie: v === 'EPI' ? '' : 'N/A'
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" disabled>Selecione...</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CA</Label>
                <Input
                  value={equipamentoForm.numero_serie || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, numero_serie: e.target.value }))}
                  placeholder={equipamentoForm.categoria === 'EPI' ? 'Informe o CA' : ''}
                  disabled={equipamentoForm.categoria !== 'EPI' && equipamentoForm.categoria !== '' && equipamentoForm.categoria !== undefined}
                  className={equipamentoForm.categoria !== 'EPI' && equipamentoForm.categoria ? 'bg-muted' : ''}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Unidade de Medida
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-primary/10"
                    onClick={() => setShowUnidadeDialog(true)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </Label>
                <Select
                  value={equipamentoForm.unidade_medida || '__placeholder__'}
                  onValueChange={v => v !== '__placeholder__' && setEquipamentoForm(f => ({ ...f, unidade_medida: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" disabled>Selecione...</SelectItem>
                    {unidades.map(uni => (
                      <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={equipamentoForm.quantidade || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, quantidade: parseInt(e.target.value) || undefined }))}
                  placeholder="Ex.: 1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Status
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-primary/10"
                    onClick={() => setShowStatusDialog(true)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </Label>
                <Select
                  value={equipamentoForm.status || 'disponivel'}
                  onValueChange={v => setEquipamentoForm(f => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local / Base</Label>
                <Input
                  value={equipamentoForm.local_base || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, local_base: e.target.value }))}
                  placeholder="Ex.: Matriz / Almoxarifado"
                />
              </div>
              <div>
                <Label>Validade / Calibração</Label>
                <Input
                  type="date"
                  value={equipamentoForm.validade_calibracao || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, validade_calibracao: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label className="flex items-center gap-2">
                  Tipo de Serviço
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-primary/10"
                    onClick={() => setShowUsadoParaDialog(true)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </Label>
                <div className="border rounded-lg p-3 max-h-32 overflow-auto space-y-2">
                  {usadoParaList.map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={equipamentoForm.usado_para?.includes(item) || false}
                        onChange={e => {
                          if (e.target.checked) {
                            setEquipamentoForm(f => ({ ...f, usado_para: [...(f.usado_para || []), item] }));
                          } else {
                            setEquipamentoForm(f => ({ ...f, usado_para: (f.usado_para || []).filter(u => u !== item) }));
                          }
                        }}
                        className="rounded"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={equipamentoForm.observacoes || ''}
                  onChange={e => setEquipamentoForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Condições, acessórios, cuidados, etc."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquipamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEquipamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cadastro de Kit */}
      <Dialog open={showKitDialog} onOpenChange={setShowKitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
            <DialogDescription>Monte um kit de equipamentos para serviços</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Kit *</Label>
              <Input
                value={kitForm.nome || ''}
                onChange={e => setKitForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Kit NR-35, Kit Espaço Confinado..."
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={editingKit ? (kitForm.codigo || '') : gerarCodigoKit()}
                readOnly
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente</p>
            </div>
            
            {/* Info: Kits não têm quantidade própria */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Kits não possuem quantidade própria. A disponibilidade é calculada automaticamente com base no estoque dos equipamentos que compõem o kit.
              </p>
              {kitForm.equipamentos && kitForm.equipamentos.length > 0 && (
                <p className="text-sm text-blue-600 mt-1">
                  Com o estoque atual, é possível formar até <strong>{calcularMaxKitsPossiveis()}</strong> kit(s) deste tipo.
                </p>
              )}
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                Tipo de Serviço *
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-primary/10"
                  onClick={() => setShowUsadoParaDialog(true)}
                >
                  <Plus className="h-4 w-4 text-primary" />
                </Button>
              </Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-auto space-y-2">
                {usadoParaList.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kitForm.tipo_servico?.includes(item) || false}
                      onChange={e => {
                        if (e.target.checked) {
                          setKitForm(f => ({ ...f, tipo_servico: [...(f.tipo_servico || []), item] }));
                        } else {
                          setKitForm(f => ({ ...f, tipo_servico: (f.tipo_servico || []).filter(t => t !== item) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={kitForm.descricao || ''}
                onChange={e => setKitForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva os itens e finalidade do kit..."
              />
            </div>
            <div>
              <Label>Equipamentos do Kit</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-auto space-y-2">
                {equipamentos.map(eq => {
                  const kitEquip = kitForm.equipamentos?.find(ke => ke.equipamento_id === eq.id);
                  const isSelected = !!kitEquip;
                  const quantidadeTotal = eq.quantidade || 0;
                  const quantidadeLivre = calcularQuantidadeLivre(eq.id, editingKit?.id);
                  const quantidadeAlocada = quantidadeTotal - quantidadeLivre;
                  const semEstoqueLivre = quantidadeLivre === 0;
                  
                  return (
                    <div key={eq.id} className={`flex items-center gap-2 text-sm p-2 rounded ${semEstoqueLivre && !isSelected ? 'bg-red-50 opacity-60' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={semEstoqueLivre && !isSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            setKitForm(f => ({ 
                              ...f, 
                              equipamentos: [...(f.equipamentos || []), { equipamento_id: eq.id, quantidade: 1 }] 
                            }));
                          } else {
                            setKitForm(f => ({ 
                              ...f, 
                              equipamentos: (f.equipamentos || []).filter(ke => ke.equipamento_id !== eq.id) 
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <Input
                        type="number"
                        min="1"
                        max={quantidadeLivre + (kitEquip?.quantidade || 0)}
                        value={kitEquip?.quantidade || 1}
                        onChange={e => {
                          const maxPermitido = quantidadeLivre + (kitEquip?.quantidade || 0);
                          const qtd = Math.min(parseInt(e.target.value) || 1, maxPermitido);
                          setKitForm(f => ({
                            ...f,
                            equipamentos: (f.equipamentos || []).map(ke => 
                              ke.equipamento_id === eq.id ? { ...ke, quantidade: qtd } : ke
                            )
                          }));
                        }}
                        disabled={!isSelected}
                        className="w-16 h-7 text-center"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={!isSelected ? 'text-muted-foreground' : ''}>{eq.nome}</span>
                        <span className="text-muted-foreground ml-1">({eq.codigo})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        <Badge variant={quantidadeLivre > 0 ? 'outline' : 'destructive'} className="text-2xs">
                          {quantidadeLivre} livre
                        </Badge>
                        {quantidadeAlocada > 0 && (
                          <Badge variant="secondary" className="text-2xs">
                            {quantidadeAlocada} em kits
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {equipamentos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKitDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveKit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Movimentação */}
      <Dialog open={showMovimentacaoDialog} onOpenChange={(open) => {
        setShowMovimentacaoDialog(open);
        if (!open) {
          setTipoMovimentacao('kit');
          setEquipamentosMovimentacao([]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>Registre saída ou entrada de equipamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimentação *</Label>
              <Select
                value={movimentacaoForm.tipo || 'saida'}
                onValueChange={v => setMovimentacaoForm(f => ({ ...f, tipo: v as 'saida' | 'entrada' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Seletor: Kit ou Equipamentos Individuais */}
            <div>
              <Label>O que deseja movimentar? *</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={tipoMovimentacao === 'kit' ? 'default' : 'outline'}
                  size="sm"
                  className={tipoMovimentacao === 'kit' ? 'bg-primary hover:bg-primary/90' : ''}
                  onClick={() => {
                    setTipoMovimentacao('kit');
                    setEquipamentosMovimentacao([]);
                  }}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Kit
                </Button>
                <Button
                  type="button"
                  variant={tipoMovimentacao === 'equipamentos' ? 'default' : 'outline'}
                  size="sm"
                  className={tipoMovimentacao === 'equipamentos' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  onClick={() => {
                    setTipoMovimentacao('equipamentos');
                    setMovimentacaoForm(f => ({ ...f, kit_id: undefined }));
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Equipamentos Individuais
                </Button>
              </div>
            </div>

            {/* Seleção de Kit */}
            {tipoMovimentacao === 'kit' && (
              <div className="space-y-3">
                <div>
                  <Label>Kit *</Label>
                  <Select
                    value={movimentacaoForm.kit_id || ''}
                    onValueChange={v => setMovimentacaoForm(f => ({ ...f, kit_id: v, quantidade: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um kit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kits.map(kit => {
                        const kitsPossiveis = calcularKitsPossiveis(kit.id);
                        return (
                          <SelectItem key={kit.id} value={kit.id}>
                            {kit.nome} ({kit.codigo}) - Máx: {kitsPossiveis} kit(s)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {movimentacaoForm.kit_id && (() => {
                  const kitSelecionado = kits.find(k => k.id === movimentacaoForm.kit_id);
                  const kitsPossiveis = calcularKitsPossiveis(movimentacaoForm.kit_id);
                  const qtdSolicitada = movimentacaoForm.quantidade || 1;
                  const podeFormar = qtdSolicitada <= kitsPossiveis;
                  
                  return (
                    <>
                      {/* Quantidade de kits */}
                      <div>
                        <Label>Quantidade de Kits *</Label>
                        <Input
                          type="number"
                          min="1"
                          max={kitsPossiveis}
                          value={movimentacaoForm.quantidade || 1}
                          onChange={e => setMovimentacaoForm(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))}
                          placeholder="Quantos kits?"
                        />
                        <div className={`mt-1 p-2 rounded-lg ${podeFormar ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`text-xs font-medium ${podeFormar ? 'text-green-700' : 'text-red-700'}`}>
                            {podeFormar 
                              ? `✓ Possível formar ${qtdSolicitada} kit(s) (máximo: ${kitsPossiveis})`
                              : `✗ Estoque insuficiente! Máximo possível: ${kitsPossiveis} kit(s)`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Detalhes dos equipamentos */}
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-medium text-orange-700 mb-2">Equipamentos necessários para {qtdSolicitada} kit(s):</p>
                        <div className="space-y-1">
                          {kitSelecionado?.equipamentos.map(item => {
                            const { total, disponivel } = calcularDisponibilidade(item.equipamento_id);
                            const equip = equipamentos.find(e => e.id === item.equipamento_id);
                            const qtdNecessaria = item.quantidade * qtdSolicitada;
                            const suficiente = disponivel >= qtdNecessaria;
                            
                            return (
                              <div key={item.equipamento_id} className="flex justify-between text-xs items-center">
                                <span className="truncate flex-1">{equip?.nome || 'Equipamento'}</span>
                                <div className="flex items-center gap-2">
                                  <span className={suficiente ? 'text-green-600' : 'text-red-600'}>
                                    {qtdNecessaria}x necessário
                                  </span>
                                  <Badge variant={suficiente ? 'default' : 'destructive'} className="text-2xs">
                                    {disponivel}/{total} disp.
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Seleção de Equipamentos Individuais */}
            {tipoMovimentacao === 'equipamentos' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Equipamentos *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEquipamentosMovimentacao([...equipamentosMovimentacao, { equipamento_id: '', quantidade: 1 }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                {equipamentosMovimentacao.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    Clique em "Adicionar" para incluir equipamentos
                  </p>
                )}
                
                <div className="space-y-2">
                  {equipamentosMovimentacao.map((item, index) => {
                    const equipSelecionado = equipamentos.find(e => e.id === item.equipamento_id);
                    const equipamentosJaSelecionados = equipamentosMovimentacao
                      .filter((_, i) => i !== index)
                      .map(e => e.equipamento_id);
                    
                    return (
                      <div key={index} className="flex gap-2 items-start p-2 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <Select
                            value={item.equipamento_id}
                            onValueChange={v => {
                              const updated = [...equipamentosMovimentacao];
                              updated[index].equipamento_id = v;
                              setEquipamentosMovimentacao(updated);
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {equipamentos
                                .filter(eq => !equipamentosJaSelecionados.includes(eq.id))
                                .map(eq => {
                                  const { disponivel } = calcularDisponibilidade(eq.id);
                                  return (
                                    <SelectItem key={eq.id} value={eq.id}>
                                      {eq.nome} ({eq.codigo}) - Disp: {disponivel}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min="1"
                            max={item.equipamento_id ? calcularDisponibilidade(item.equipamento_id).disponivel : 999}
                            value={item.quantidade}
                            onChange={e => {
                              const updated = [...equipamentosMovimentacao];
                              updated[index].quantidade = parseInt(e.target.value) || 1;
                              setEquipamentosMovimentacao(updated);
                            }}
                            className="h-9"
                            placeholder="Qtd"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setEquipamentosMovimentacao(equipamentosMovimentacao.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                {equipamentosMovimentacao.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {equipamentosMovimentacao.length} equipamento(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Tipo de Serviço *</Label>
              <Select
                value={movimentacaoForm.tipo_servico || ''}
                onValueChange={v => setMovimentacaoForm(f => ({ ...f, tipo_servico: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {usadoParaList.map(item => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente / Local *</Label>
              <Select
                value={movimentacaoForm.cliente_id || ''}
                onValueChange={v => setMovimentacaoForm(f => ({ ...f, cliente_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente/local..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 ? (
                    <SelectItem value="" disabled>Nenhum cliente cadastrado</SelectItem>
                  ) : (
                    clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável pela Retirada</Label>
              <Input
                value={movimentacaoForm.responsavel_retirada || ''}
                onChange={e => setMovimentacaoForm(f => ({ ...f, responsavel_retirada: e.target.value }))}
                placeholder="Nome da pessoa responsável"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={movimentacaoForm.observacoes || ''}
                onChange={e => setMovimentacaoForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovimentacaoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveMovimentacao}>Registrar Movimentação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerenciar Categorias */}
      <Dialog open={showCategoriaDialog} onOpenChange={(open) => { setShowCategoriaDialog(open); if (!open) { setNovaCategoria(''); setEditingCategoria(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>Adicione, edite ou remova categorias de equipamentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                placeholder={editingCategoria ? 'Editar categoria...' : 'Nova categoria...'}
                onKeyDown={e => e.key === 'Enter' && handleSaveCategoria()}
              />
              <Button onClick={handleSaveCategoria}>
                {editingCategoria ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingCategoria && (
                <Button variant="outline" onClick={() => { setNovaCategoria(''); setEditingCategoria(null); }}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="border rounded-lg max-h-60 overflow-auto">
              {categorias.map(cat => (
                <div key={cat} className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0">
                  <span className="text-sm">{cat}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNovaCategoria(cat); setEditingCategoria(cat); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategoria(cat)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoriaDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerenciar Unidades de Medida */}
      <Dialog open={showUnidadeDialog} onOpenChange={(open) => { setShowUnidadeDialog(open); if (!open) { setNovaUnidade(''); setEditingUnidade(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Unidades de Medida</DialogTitle>
            <DialogDescription>Adicione, edite ou remova unidades de medida</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={novaUnidade}
                onChange={e => setNovaUnidade(e.target.value)}
                placeholder={editingUnidade ? 'Editar unidade...' : 'Nova unidade...'}
                onKeyDown={e => e.key === 'Enter' && handleSaveUnidade()}
              />
              <Button onClick={handleSaveUnidade}>
                {editingUnidade ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingUnidade && (
                <Button variant="outline" onClick={() => { setNovaUnidade(''); setEditingUnidade(null); }}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="border rounded-lg max-h-60 overflow-auto">
              {unidades.map(uni => (
                <div key={uni} className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0">
                  <span className="text-sm">{uni}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNovaUnidade(uni); setEditingUnidade(uni); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUnidade(uni)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnidadeDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerenciar Status */}
      <Dialog open={showStatusDialog} onOpenChange={(open) => { setShowStatusDialog(open); if (!open) { setNovoStatus({ id: '', nome: '', cor: 'bg-gray-100 text-gray-700 border-gray-300' }); setEditingStatus(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Status</DialogTitle>
            <DialogDescription>Adicione, edite ou remova status de equipamentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={novoStatus.nome}
                onChange={e => setNovoStatus(s => ({ ...s, nome: e.target.value }))}
                placeholder={editingStatus ? 'Editar status...' : 'Nome do status...'}
              />
              <div className="flex gap-2">
                <Select
                  value={novoStatus.cor}
                  onValueChange={v => setNovoStatus(s => ({ ...s, cor: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Cor do status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-green-100 text-green-700 border-green-300">Verde</SelectItem>
                    <SelectItem value="bg-blue-100 text-blue-700 border-blue-300">Azul</SelectItem>
                    <SelectItem value="bg-yellow-100 text-yellow-700 border-yellow-300">Amarelo</SelectItem>
                    <SelectItem value="bg-red-100 text-red-700 border-red-300">Vermelho</SelectItem>
                    <SelectItem value="bg-purple-100 text-purple-700 border-purple-300">Roxo</SelectItem>
                    <SelectItem value="bg-orange-100 text-orange-700 border-orange-300">Laranja</SelectItem>
                    <SelectItem value="bg-gray-100 text-gray-700 border-gray-300">Cinza</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveStatus}>
                  {editingStatus ? 'Salvar' : 'Adicionar'}
                </Button>
                {editingStatus && (
                  <Button variant="outline" onClick={() => { setNovoStatus({ id: '', nome: '', cor: 'bg-gray-100 text-gray-700 border-gray-300' }); setEditingStatus(null); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
            <div className="border rounded-lg max-h-60 overflow-auto">
              {statusList.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Badge className={s.cor}>{s.nome}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNovoStatus(s); setEditingStatus(s.id); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStatus(s.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerenciar Usado Para */}
      <Dialog open={showUsadoParaDialog} onOpenChange={(open) => { setShowUsadoParaDialog(open); if (!open) { setNovoUsadoPara(''); setEditingUsadoPara(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Finalidades</DialogTitle>
            <DialogDescription>Adicione, edite ou remova finalidades de uso dos equipamentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={novoUsadoPara}
                onChange={e => setNovoUsadoPara(e.target.value)}
                placeholder={editingUsadoPara ? 'Editar finalidade...' : 'Nova finalidade...'}
                onKeyDown={e => e.key === 'Enter' && handleSaveUsadoPara()}
              />
              <Button onClick={handleSaveUsadoPara}>
                {editingUsadoPara ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingUsadoPara && (
                <Button variant="outline" onClick={() => { setNovoUsadoPara(''); setEditingUsadoPara(null); }}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="border rounded-lg max-h-60 overflow-auto">
              {usadoParaList.map(item => (
                <div key={item} className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0">
                  <span className="text-sm">{item}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNovoUsadoPara(item); setEditingUsadoPara(item); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUsadoPara(item)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsadoParaDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Movimentação */}
      <Dialog open={showMovimentacaoDetalhes} onOpenChange={setShowMovimentacaoDetalhes}>
        <DialogContent className="max-w-2xl">
          {selectedMovimentacao && (
            <>
              <DialogHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      {selectedMovimentacao.equipamento?.nome || kits.find(k => k.id === selectedMovimentacao.kit_id)?.nome || 'Equipamento'}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{selectedMovimentacao.equipamento?.codigo || kits.find(k => k.id === selectedMovimentacao.kit_id)?.codigo || '-'}</span>
                      <span>•</span>
                      <User className="h-4 w-4" />
                      <span>{selectedMovimentacao.responsavel_retirada || selectedMovimentacao.usuario_separou?.nome || '-'}</span>
                    </div>
                  </div>
                  <Badge variant={selectedMovimentacao.tipo === 'saida' ? 'destructive' : 'default'} className="text-sm px-3 py-1">
                    {selectedMovimentacao.tipo === 'saida' ? 'Saída' : 'Entrada'}
                  </Badge>
                </div>
                
                {/* Status Tabs */}
                {selectedMovimentacao.status === 'devolvido' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <strong>Kit devolvido</strong> - Este card não pode mais ser movimentado.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {KANBAN_COLUMNS.map(col => (
                    <Button
                      key={col.id}
                      variant={selectedMovimentacao.status === col.id ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs whitespace-nowrap"
                      disabled={selectedMovimentacao.status === 'devolvido'}
                      onClick={async () => {
                        if (selectedMovimentacao.status === 'devolvido') {
                          toast({ title: 'Ação bloqueada', description: 'Cards devolvidos não podem ser movimentados.', variant: 'destructive' });
                          return;
                        }
                        const updated = movimentacoes.map(m => 
                          m.id === selectedMovimentacao.id ? { ...m, status: col.id as Movimentacao['status'] } : m
                        );
                        setMovimentacoes(updated);
                        await (supabase as any)
                          .from('equipamentos_movimentacoes')
                          .update({ status: col.id })
                          .eq('id', selectedMovimentacao.id);
                        setSelectedMovimentacao({ ...selectedMovimentacao, status: col.id as Movimentacao['status'] });
                        toast({ title: 'Status atualizado para ' + col.nome });
                      }}
                    >
                      {col.nome}
                    </Button>
                  ))}
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                {/* Coluna Principal */}
                <div className="md:col-span-2 space-y-6">
                  {/* Seção de Equipamentos do Kit (apenas se for movimentação de Kit) */}
                  {selectedMovimentacao.kit_id && (() => {
                    const kitMov = kits.find(k => k.id === selectedMovimentacao.kit_id);
                    if (!kitMov) return null;
                    return (
                      <div>
                        <h3 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          EQUIPAMENTOS DO KIT
                        </h3>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {kitMov.equipamentos.map((item, idx) => {
                              const equip = equipamentos.find(e => e.id === item.equipamento_id);
                              return (
                                <div key={idx} className="flex items-center justify-between bg-white rounded p-2 border">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-orange-500" />
                                    <div>
                                      <p className="text-sm font-medium">{equip?.nome || 'Equipamento'}</p>
                                      <p className="text-2xs text-muted-foreground font-mono">{equip?.codigo || '-'}</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                    {item.quantidade}x
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 pt-2 border-t border-orange-200 flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Total de equipamentos no kit:</span>
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {kitMov.equipamentos.reduce((acc, item) => acc + item.quantidade, 0)} itens
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Seção de Atividades */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      ATIVIDADES
                    </h3>
                    
                    {/* Botões para adicionar atividades */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setTipoAtividade('tarefa');
                          setAtividadeForm({ descricao: '', prazo: '', horario: '', membro_nome: '', itens_checklist: [] });
                          setShowAtividadeDialog(true);
                        }}
                      >
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Tarefa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setTipoAtividade('checklist');
                          setAtividadeForm({ descricao: '', prazo: '', horario: '', membro_nome: '', itens_checklist: [] });
                          setNovoItemChecklist('');
                          setShowAtividadeDialog(true);
                        }}
                      >
                        <ClipboardList className="h-3 w-3 mr-1" />
                        Checklist
                      </Button>
                    </div>

                    {/* Lista de Atividades */}
                    <div className="space-y-2">
                      {(selectedMovimentacao.atividades || []).map(atividade => (
                          <div key={atividade.id} className="bg-white border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {atividade.status === 'concluida' ? (
                                  <CircleCheck className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-green-500" 
                                    onClick={() => {
                                      const updatedAtividades = (selectedMovimentacao.atividades || []).map(a =>
                                        a.id === atividade.id ? { ...a, status: 'concluida' as const } : a
                                      );
                                      const updatedMov = { ...selectedMovimentacao, atividades: updatedAtividades };
                                      const updated = movimentacoes.map(m => m.id === selectedMovimentacao.id ? updatedMov : m);
                                      setMovimentacoes(updated);
                                      setSelectedMovimentacao(updatedMov);
                                      toast({ title: 'Atividade concluída!' });
                                    }}
                                  />
                                )}
                                <div>
                                  <p className={`font-medium text-sm ${atividade.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                                    {atividade.tipo === 'tarefa' ? 'Tarefa' : 'Checklist'}
                                  </p>
                                  <Badge variant={atividade.status === 'concluida' ? 'default' : 'secondary'} className="text-2xs">
                                    {atividade.status === 'concluida' ? 'Concluída' : 'Pendente'}
                                  </Badge>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {atividade.prazo ? format(new Date(atividade.prazo), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                {atividade.horario && ` às ${atividade.horario}`}
                              </span>
                            </div>
                            <p className="text-sm mt-2 text-muted-foreground">{atividade.descricao}</p>
                            
                            {/* Itens do Checklist */}
                            {atividade.tipo === 'checklist' && atividade.itens_checklist && atividade.itens_checklist.length > 0 && (
                              <div className="mt-2 space-y-1 pl-7">
                                {atividade.itens_checklist.map(item => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm">
                                    {item.concluido ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-green-500"
                                        onClick={() => {
                                          const updatedItens = atividade.itens_checklist!.map(i =>
                                            i.id === item.id ? { ...i, concluido: true } : i
                                          );
                                          const updatedAtividades = (selectedMovimentacao.atividades || []).map(a =>
                                            a.id === atividade.id ? { ...a, itens_checklist: updatedItens } : a
                                          );
                                          const updatedMov = { ...selectedMovimentacao, atividades: updatedAtividades };
                                          const updated = movimentacoes.map(m => m.id === selectedMovimentacao.id ? updatedMov : m);
                                          setMovimentacoes(updated);
                                          setSelectedMovimentacao(updatedMov);
                                        }}
                                      />
                                    )}
                                    <span className={item.concluido ? 'line-through text-muted-foreground' : ''}>{item.texto}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {atividade.membro_nome && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Atribuído a: {atividade.membro_nome}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Informações da Movimentação */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      INFORMAÇÕES DA MOVIMENTAÇÃO
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                          <p className="font-medium text-lg">{selectedMovimentacao.quantidade || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Tipo de Serviço</Label>
                          <p className="font-medium">{selectedMovimentacao.tipo_servico || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Data de Saída</Label>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {selectedMovimentacao.data_saida 
                              ? format(new Date(selectedMovimentacao.data_saida), 'dd/MM/yyyy HH:mm', { locale: ptBR }) 
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Data de Retorno</Label>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {selectedMovimentacao.data_retorno 
                              ? format(new Date(selectedMovimentacao.data_retorno), 'dd/MM/yyyy HH:mm', { locale: ptBR }) 
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  {selectedMovimentacao.observacoes && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Observações</h3>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm">{selectedMovimentacao.observacoes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna Lateral */}
                <div className="space-y-4">
                  {/* Dados da Movimentação */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Dados da Movimentação
                        <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">ID da Movimentação</Label>
                        <p className="font-mono text-xs mt-1 bg-gray-100 px-2 py-1 rounded">{selectedMovimentacao.id}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Responsável</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">{selectedMovimentacao.usuario_separou?.nome || '-'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Cliente / Local</Label>
                        <p className="font-medium text-sm flex items-center gap-1 mt-1">
                          <Box className="h-3 w-3" />
                          {clientes.find(c => c.id === selectedMovimentacao.cliente_id)?.nome || '-'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Responsável pela Retirada</Label>
                        <p className="font-medium text-sm mt-1">{selectedMovimentacao.responsavel_retirada || '-'}</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Categoria</Label>
                        <p className="font-medium text-sm mt-1">{selectedMovimentacao.equipamento?.categoria || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Funil/Card Atrelado */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-500" />
                        Card de Funil Atrelado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {funilCardInfo ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="font-medium text-sm">{funilCardInfo.titulo}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-2xs">
                              Funil: {funilCardInfo.funil?.nome || '-'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum card atrelado</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Histórico Completo de Iterações */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico Completo de Iterações
                </h3>
                <div className="border-l-2 border-primary/30 pl-4 space-y-3 max-h-[200px] overflow-y-auto">
                  {movimentacaoHistorico.length > 0 ? (
                    movimentacaoHistorico.map((hist) => (
                      <div key={hist.id} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm">{hist.descricao}</p>
                          {hist.funil_nome && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-2xs">
                                Funil: {hist.funil_nome}
                              </Badge>
                              {hist.card_titulo && (
                                <Badge variant="outline" className="text-2xs">
                                  Card: {hist.card_titulo}
                                </Badge>
                              )}
                            </div>
                          )}
                          {hist.status_anterior && hist.status_novo && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-2xs">{STATUS_LABELS[hist.status_anterior as keyof typeof STATUS_LABELS] || hist.status_anterior}</Badge>
                              <span className="text-xs">→</span>
                              <Badge variant="outline" className="text-2xs">{STATUS_LABELS[hist.status_novo as keyof typeof STATUS_LABELS] || hist.status_novo}</Badge>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {hist.created_at ? format(new Date(hist.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR }) : '-'}
                            {hist.usuario_nome && ` • Por: ${hist.usuario_nome}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div>
                        <p className="text-sm">Movimentação criada na coluna "{STATUS_LABELS[selectedMovimentacao.status]}"</p>
                        <Badge variant="outline" className="text-2xs mt-1">{STATUS_LABELS[selectedMovimentacao.status]}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedMovimentacao.created_at 
                            ? format(new Date(selectedMovimentacao.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR }) 
                            : '-'} • Por: {selectedMovimentacao.usuario_separou?.nome || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="border-t pt-4">
                <div className="flex justify-between w-full">
                  <p className="text-xs text-muted-foreground">
                    Criado em: {selectedMovimentacao.created_at 
                      ? format(new Date(selectedMovimentacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) 
                      : '-'}
                  </p>
                  <Button variant="outline" onClick={() => setShowMovimentacaoDetalhes(false)}>Fechar</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Atividade (Tarefa ou Checklist) */}
      <Dialog open={showAtividadeDialog} onOpenChange={setShowAtividadeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-500">
              {tipoAtividade === 'tarefa' ? 'Tarefa' : 'Checklist'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Descrição */}
            <div>
              <Textarea
                placeholder="O que foi feito e qual o próximo passo?"
                value={atividadeForm.descricao || ''}
                onChange={(e) => setAtividadeForm({ ...atividadeForm, descricao: e.target.value })}
                className="min-h-[80px]"
              />
              <div className="flex justify-end mt-1">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-orange-500 text-xs p-0 h-auto"
                  onClick={() => setShowModelosDialog(true)}
                >
                  + Modelos
                </Button>
              </div>
            </div>

            {/* Itens do Checklist (apenas para tipo checklist) */}
            {tipoAtividade === 'checklist' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">Itens do Checklist</span>
                </div>
                
                {/* Lista de itens adicionados */}
                {(atividadeForm.itens_checklist || []).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 mb-2 pl-6">
                    <Circle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm flex-1">{item.texto}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => {
                        const updatedItens = (atividadeForm.itens_checklist || []).filter((_, i) => i !== index);
                        setAtividadeForm({ ...atividadeForm, itens_checklist: updatedItens });
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Input para adicionar novo item */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={novoItemChecklist}
                    onChange={(e) => setNovoItemChecklist(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novoItemChecklist.trim()) {
                        e.preventDefault();
                        const newItem: ChecklistItem = {
                          id: Date.now().toString(),
                          texto: novoItemChecklist.trim(),
                          concluido: false
                        };
                        setAtividadeForm({
                          ...atividadeForm,
                          itens_checklist: [...(atividadeForm.itens_checklist || []), newItem]
                        });
                        setNovoItemChecklist('');
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (novoItemChecklist.trim()) {
                        const newItem: ChecklistItem = {
                          id: Date.now().toString(),
                          texto: novoItemChecklist.trim(),
                          concluido: false
                        };
                        setAtividadeForm({
                          ...atividadeForm,
                          itens_checklist: [...(atividadeForm.itens_checklist || []), newItem]
                        });
                        setNovoItemChecklist('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Prazo e Horário */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Prazo</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={atividadeForm.prazo || ''}
                    onChange={(e) => setAtividadeForm({ ...atividadeForm, prazo: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Horário</Label>
                <Select
                  value={atividadeForm.horario || ''}
                  onValueChange={(v) => setAtividadeForm({ ...atividadeForm, horario: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, h) => 
                      ['00', '30'].map(m => {
                        const time = `${h.toString().padStart(2, '0')}:${m}`;
                        return <SelectItem key={time} value={time}>{time}</SelectItem>;
                      })
                    ).flat()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Atribuir Membros */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Atribuir Membros
              </Label>
              <Select
                value={atividadeForm.membro_nome || ''}
                onValueChange={(v) => setAtividadeForm({ ...atividadeForm, membro_nome: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar membro para atribuir..." />
                </SelectTrigger>
                <SelectContent>
                  {membrosEmpresa.length === 0 ? (
                    <SelectItem value="__none__" disabled>Nenhum membro encontrado</SelectItem>
                  ) : (
                    membrosEmpresa.map(membro => (
                      <SelectItem key={membro.id} value={membro.nome}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{membro.nome}</span>
                          {membro.email && <span className="text-xs text-muted-foreground">({membro.email})</span>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de anexos */}
            {anexosAtividade.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Anexos</Label>
                {anexosAtividade.map(anexo => (
                  <div key={anexo.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3" />
                      <span className="text-sm">{anexo.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => setAnexosAtividade(anexosAtividade.filter(a => a.id !== anexo.id))}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar anexo */}
            <div>
              <input
                type="file"
                id="anexo-input"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setUploadingAnexo(true);
                  try {
                    // Simular upload - em produção usar Supabase Storage
                    const novoAnexo = {
                      id: Date.now().toString(),
                      nome: file.name,
                      url: URL.createObjectURL(file),
                      tipo: file.type
                    };
                    setAnexosAtividade([...anexosAtividade, novoAnexo]);
                    toast({ title: 'Anexo adicionado!' });
                  } catch (error) {
                    toast({ title: 'Erro ao adicionar anexo', variant: 'destructive' });
                  } finally {
                    setUploadingAnexo(false);
                    e.target.value = '';
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="text-muted-foreground"
                disabled={uploadingAnexo}
                onClick={() => document.getElementById('anexo-input')?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {uploadingAnexo ? 'Enviando...' : 'Adicionar anexo'}
              </Button>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAtividadeDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (!atividadeForm.descricao?.trim()) {
                  toast({ title: 'Erro', description: 'Preencha a descrição da atividade', variant: 'destructive' });
                  return;
                }
                
                if (!selectedMovimentacao) return;
                
                const novaAtividade: Atividade = {
                  id: Date.now().toString(),
                  movimentacao_id: selectedMovimentacao.id,
                  tipo: tipoAtividade,
                  descricao: atividadeForm.descricao || '',
                  itens_checklist: tipoAtividade === 'checklist' ? atividadeForm.itens_checklist : undefined,
                  prazo: atividadeForm.prazo,
                  horario: atividadeForm.horario,
                  membro_nome: atividadeForm.membro_nome,
                  status: 'pendente',
                  created_at: new Date().toISOString()
                };
                
                const updatedAtividades = [...(selectedMovimentacao.atividades || []), novaAtividade];
                const updatedMov = { ...selectedMovimentacao, atividades: updatedAtividades };
                const updated = movimentacoes.map(m => m.id === selectedMovimentacao.id ? updatedMov : m);
                
                setMovimentacoes(updated);
                setSelectedMovimentacao(updatedMov);
                setShowAtividadeDialog(false);
                setAtividadeForm({ descricao: '', prazo: '', horario: '', membro_nome: '', itens_checklist: [] });
                setNovoItemChecklist('');
                
                toast({ title: `${tipoAtividade === 'tarefa' ? 'Tarefa' : 'Checklist'} criado com sucesso!` });
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Modelos de Atividades */}
      <Dialog open={showModelosDialog} onOpenChange={setShowModelosDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-orange-500">Modelos de {tipoAtividade === 'tarefa' ? 'Tarefa' : 'Checklist'}</DialogTitle>
            <DialogDescription>Selecione um modelo ou crie um novo</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="selecionar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="selecionar">Selecionar Modelo</TabsTrigger>
              <TabsTrigger value="criar">Criar Modelo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="selecionar" className="space-y-3 mt-4">
              {modelosAtividade.filter(m => m.tipo === tipoAtividade).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum modelo criado ainda</p>
                  <p className="text-xs">Crie seu primeiro modelo na aba "Criar Modelo"</p>
                </div>
              ) : (
                modelosAtividade.filter(m => m.tipo === tipoAtividade).map(modelo => (
                  <div 
                    key={modelo.id} 
                    className="border rounded-lg p-3 hover:border-orange-300 cursor-pointer transition-colors"
                    onClick={() => {
                      setAtividadeForm({
                        ...atividadeForm,
                        descricao: modelo.descricao,
                        itens_checklist: modelo.itens?.map((texto, i) => ({
                          id: `${Date.now()}-${i}`,
                          texto,
                          concluido: false
                        })) || []
                      });
                      setShowModelosDialog(false);
                      toast({ title: 'Modelo aplicado!' });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{modelo.nome}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await (supabase as any)
                              .from('equipamentos_modelos_atividade')
                              .delete()
                              .eq('id', modelo.id);
                            const updated = modelosAtividade.filter(m => m.id !== modelo.id);
                            setModelosAtividade(updated);
                            toast({ title: 'Modelo excluído' });
                          } catch (error) {
                            console.error('Erro ao excluir modelo:', error);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{modelo.descricao}</p>
                    {modelo.itens && modelo.itens.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {modelo.itens.length} itens no checklist
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="criar" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs">Nome do Modelo</Label>
                <Input
                  placeholder="Ex: Checklist de Inspeção"
                  value={novoModelo.nome}
                  onChange={(e) => setNovoModelo({ ...novoModelo, nome: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Descrição / Texto Padrão</Label>
                <Textarea
                  placeholder="Descrição que será preenchida automaticamente..."
                  value={novoModelo.descricao}
                  onChange={(e) => setNovoModelo({ ...novoModelo, descricao: e.target.value })}
                  className="mt-1 min-h-[60px]"
                />
              </div>
              
              {tipoAtividade === 'checklist' && (
                <div>
                  <Label className="text-xs">Itens do Checklist (um por linha)</Label>
                  <Textarea
                    placeholder="Item 1&#10;Item 2&#10;Item 3"
                    value={novoModelo.itens.join('\n')}
                    onChange={(e) => setNovoModelo({ ...novoModelo, itens: e.target.value.split('\n').filter(i => i.trim()) })}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              )}
              
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  if (!novoModelo.nome.trim()) {
                    toast({ title: 'Erro', description: 'Digite o nome do modelo', variant: 'destructive' });
                    return;
                  }
                  
                  const modelo = {
                    id: Date.now().toString(),
                    tipo: tipoAtividade,
                    nome: novoModelo.nome.trim(),
                    descricao: novoModelo.descricao.trim(),
                    itens: tipoAtividade === 'checklist' ? novoModelo.itens : undefined
                  };
                  
                  // Salvar no Supabase
                  (supabase as any)
                    .from('equipamentos_modelos_atividade')
                    .insert({
                      empresa_id: empresaId,
                      tipo: modelo.tipo,
                      nome: modelo.nome,
                      descricao: modelo.descricao,
                      itens: modelo.itens
                    })
                    .then(() => {
                      const updated = [...modelosAtividade, modelo];
                      setModelosAtividade(updated);
                      setNovoModelo({ nome: '', descricao: '', itens: [] });
                      toast({ title: 'Modelo criado com sucesso!' });
                    })
                    .catch((error: any) => {
                      console.error('Erro ao criar modelo:', error);
                      toast({ title: 'Erro', description: 'Não foi possível criar o modelo.', variant: 'destructive' });
                    });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Salvar Modelo
              </Button>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelosDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Kit */}
      <Dialog open={showKitDetalhes} onOpenChange={setShowKitDetalhes}>
        <DialogContent className="max-w-2xl">
          {selectedKit && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedKit.nome}</DialogTitle>
                    <p className="text-sm text-muted-foreground font-mono">{selectedKit.codigo}</p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {Array.isArray(selectedKit.tipo_servico) ? selectedKit.tipo_servico.join(', ') : selectedKit.tipo_servico}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedKit.descricao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm mt-1">{selectedKit.descricao}</p>
                  </div>
                )}
                
                {/* Equipamentos do Kit */}
                <div>
                  <h3 className="text-sm font-semibold text-orange-500 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    EQUIPAMENTOS DO KIT ({selectedKit.equipamentos.length})
                  </h3>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-xs font-medium">Equipamento</th>
                          <th className="text-left p-3 text-xs font-medium">Código</th>
                          <th className="text-center p-3 text-xs font-medium">Qtd no Kit</th>
                          <th className="text-center p-3 text-xs font-medium">Estoque Atual</th>
                          <th className="text-center p-3 text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedKit.equipamentos.map((item, index) => {
                          const equip = equipamentos.find(e => e.id === item.equipamento_id);
                          const estoqueAtual = equip?.quantidade || 0;
                          const temEstoque = estoqueAtual >= item.quantidade;
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-3 text-sm font-medium">{equip?.nome || 'Equipamento não encontrado'}</td>
                              <td className="p-3 text-sm text-muted-foreground font-mono">{equip?.codigo || '-'}</td>
                              <td className="p-3 text-sm text-center font-medium">{item.quantidade}</td>
                              <td className="p-3 text-sm text-center">{estoqueAtual}</td>
                              <td className="p-3 text-center">
                                {temEstoque ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Disponível</Badge>
                                ) : (
                                  <Badge variant="destructive">Insuficiente</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Resumo de Disponibilidade */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Status do Kit</p>
                      <p className="text-xs text-muted-foreground">Verificação de disponibilidade de todos os equipamentos</p>
                    </div>
                    {selectedKit.equipamentos.every(item => {
                      const equip = equipamentos.find(e => e.id === item.equipamento_id);
                      return (equip?.quantidade || 0) >= item.quantidade;
                    }) ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Pronto para Uso
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Estoque Insuficiente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingKit(selectedKit);
                    setKitForm(selectedKit);
                    setShowKitDetalhes(false);
                    setShowKitDialog(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar Kit
                </Button>
                <Button variant="outline" onClick={() => setShowKitDetalhes(false)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
