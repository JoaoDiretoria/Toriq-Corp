import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useHierarquia } from '@/hooks/useHierarquia';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Mail, 
  Phone, 
  MessageSquare, 
  FileText, 
  MapPin, 
  Users, 
  CheckCircle2,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Building2,
  User,
  Clock,
  MoreVertical,
  Eye
} from 'lucide-react';

interface ToriqCorpTarefasProps {
  onNavigate?: (section: string, cardId?: string) => void;
}

interface Tarefa {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  horario: string | null;
  status: string;
  criador_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
  funil_origem: string;
  funil_nome: string;
  funil_id: string | null;
  empresa_id: string;
  card_titulo: string;
  // Dados do criador (join)
  criador?: {
    nome: string;
  };
}

interface Usuario {
  id: string;
  nome: string;
  grupo_acesso: 'administrador' | 'gestor' | 'colaborador' | null;
  setor?: { nome: string } | null;
  total_tarefas?: number;
}

interface Funil {
  id: string;
  nome: string;
  tipo: 'negocio' | 'fluxo_trabalho';
  setor_id: string;
  setor?: { nome: string };
}

const TIPO_ATIVIDADE_ICONS: Record<string, React.ReactNode> = {
  tarefa: <CheckCircle2 className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  ligacao: <Phone className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  reuniao: <Users className="h-4 w-4" />,
  visita: <MapPin className="h-4 w-4" />,
  outro: <FileText className="h-4 w-4" />,
};

const TIPO_ATIVIDADE_LABELS: Record<string, string> = {
  tarefa: 'Tarefa',
  email: 'E-mail',
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  reuniao: 'Reunião',
  visita: 'Visita',
  outro: 'Outro',
};

const STATUS_COLORS: Record<string, string> = {
  a_realizar: 'bg-orange-100 text-orange-700 border-orange-200',
  programada: 'bg-blue-100 text-blue-700 border-blue-200',
  pendente: 'bg-red-100 text-red-700 border-red-200',
  concluida: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  a_realizar: 'A realizar',
  programada: 'Programada',
  pendente: 'Pendente',
  concluida: 'Concluída',
};

export function ToriqCorpTarefas({ onNavigate }: ToriqCorpTarefasProps) {
  const { profile, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const { toast } = useToast();
  
  // Hook de hierarquia para controle de acesso
  const { 
    loading: loadingHierarquia, 
    isAdministrador, 
    isGestor, 
    isColaborador,
    usuariosVisiveis,
    getFiltroUsuarios,
    podeVerRegistro 
  } = useHierarquia();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'concluida'>('todas');
  const [filtroTipoAtividade, setFiltroTipoAtividade] = useState<string | null>(null);
  const [filtroData, setFiltroData] = useState<'todas' | 'hoje' | 'semana' | 'definir'>('todas');
  const [filtroUsuario, setFiltroUsuario] = useState<string | null>(null);
  const [filtroFunil, setFiltroFunil] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  const [viewMode, setViewMode] = useState<'listagem' | 'calendario'>('listagem');
  const [mesAtual, setMesAtual] = useState(new Date());
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalTarefas, setTotalTarefas] = useState(0);
  const itensPorPagina = 20;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({
    descricao: '',
    tipo: 'tarefa',
    prazo: '',
    horario: '',
    responsavel_id: '',
  });
  const [exportingCSV, setExportingCSV] = useState(false);
  const [buscaUsuario, setBuscaUsuario] = useState('');

  // Carregar funis dinâmicos
  useEffect(() => {
    if (empresaId) {
      loadFunis();
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId && !loadingHierarquia) {
      loadTarefas();
      loadUsuarios();
    }
  }, [empresaId, loadingHierarquia, filtroStatus, filtroTipoAtividade, filtroData, filtroUsuario, filtroFunil, dataInicio, dataFim, paginaAtual]);

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroStatus, filtroTipoAtividade, filtroData, filtroUsuario, filtroFunil, dataInicio, dataFim]);

  const loadFunis = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('funis')
        .select('id, nome, tipo, setor_id, setor:setores(nome)')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFunis(data || []);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
    }
  };

  const loadTarefas = async () => {
    try {
      setLoading(true);
      
      // Função auxiliar para aplicar filtros comuns
      const aplicarFiltros = (query: any) => {
        // Aplicar filtro de hierarquia
        const filtroHierarquia = getFiltroUsuarios();
        if (filtroHierarquia.length > 0) {
          query = query.or(`criador_id.in.(${filtroHierarquia.join(',')}),responsavel_id.in.(${filtroHierarquia.join(',')})`);
        }

        if (filtroStatus === 'pendentes') {
          query = query.in('status', ['a_realizar', 'programada', 'pendente']);
        } else if (filtroStatus === 'concluida') {
          query = query.eq('status', 'concluida');
        }

        if (filtroTipoAtividade) {
          query = query.eq('tipo', filtroTipoAtividade);
        }

        if (filtroUsuario && filtroUsuario !== 'todos') {
          query = query.eq('responsavel_id', filtroUsuario);
        }

        if (filtroFunil && filtroFunil !== 'todos') {
          if (filtroFunil.startsWith('funil_')) {
            const funilId = filtroFunil.replace('funil_', '');
            query = query.eq('funil_id', funilId);
          } else {
            query = query.eq('funil_origem', filtroFunil);
          }
        }

        if (filtroData === 'hoje') {
          const hoje = new Date().toISOString().split('T')[0];
          query = query.eq('prazo', hoje);
        } else if (filtroData === 'semana') {
          const hoje = new Date();
          const inicioSemana = startOfWeek(hoje, { locale: ptBR }).toISOString().split('T')[0];
          const fimSemana = endOfWeek(hoje, { locale: ptBR }).toISOString().split('T')[0];
          query = query.gte('prazo', inicioSemana).lte('prazo', fimSemana);
        } else if (filtroData === 'definir' && dataInicio && dataFim) {
          query = query.gte('prazo', dataInicio.toISOString().split('T')[0]).lte('prazo', dataFim.toISOString().split('T')[0]);
        }

        return query;
      };

      // Buscar contagem total
      let countQuery = (supabase as any)
        .from('atividades_unificadas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      
      countQuery = aplicarFiltros(countQuery);
      const { count } = await countQuery;
      setTotalTarefas(count || 0);

      // Buscar dados paginados
      const offset = (paginaAtual - 1) * itensPorPagina;
      let query = (supabase as any)
        .from('atividades_unificadas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('prazo', { ascending: true, nullsFirst: false })
        .range(offset, offset + itensPorPagina - 1);

      query = aplicarFiltros(query);
      const { data, error } = await query;

      if (error) throw error;
      
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as tarefas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsuarios = async () => {
    try {
      // Buscar apenas usuários SST da empresa (role = 'empresa_sst')
      let query = (supabase as any)
        .from('profiles')
        .select('id, nome, grupo_acesso, setor:setores(nome)')
        .eq('empresa_id', empresaId)
        .eq('role', 'empresa_sst')
        .order('nome');

      // Aplicar filtro de hierarquia para usuários visíveis
      const filtroHierarquia = getFiltroUsuarios();
      if (filtroHierarquia.length > 0) {
        query = query.in('id', filtroHierarquia);
      }

      const { data: profilesData, error } = await query;

      if (error) throw error;

      // Buscar contagem de tarefas por usuário (responsável) - conforme filtro de status atual
      const usuariosComContagem: Usuario[] = await Promise.all(
        (profilesData || []).map(async (p: any) => {
          let countQuery = (supabase as any)
            .from('atividades_unificadas')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('responsavel_id', p.id);
          
          // Aplicar mesmo filtro de status usado na listagem
          if (filtroStatus === 'pendentes') {
            countQuery = countQuery.in('status', ['a_realizar', 'programada', 'pendente']);
          } else if (filtroStatus === 'concluida') {
            countQuery = countQuery.eq('status', 'concluida');
          }
          // Se 'todas', não aplica filtro de status

          const { count } = await countQuery;

          return {
            id: p.id,
            nome: p.nome,
            grupo_acesso: p.grupo_acesso,
            setor: p.setor,
            total_tarefas: count || 0,
          };
        })
      );

      // Filtrar para exibir apenas usuários que têm tarefas (conforme filtro atual)
      const usuariosComTarefas = usuariosComContagem.filter(u => (u.total_tarefas || 0) > 0);
      
      // Se não houver nenhum usuário com tarefas, mostrar todos da hierarquia
      setUsuarios(usuariosComTarefas.length > 0 ? usuariosComTarefas : usuariosComContagem);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleCriarTarefa = async () => {
    toast({
      title: 'Informação',
      description: 'Para criar tarefas, acesse um card no funil e adicione a atividade lá.',
    });
    setDialogOpen(false);
  };

  const handleFinalizarTarefa = async (tarefaId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .update({ status: 'concluida', updated_at: new Date().toISOString() })
        .eq('id', tarefaId);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Tarefa finalizada!' });
      loadTarefas();
    } catch (error) {
      console.error('Erro ao finalizar tarefa:', error);
      toast({ title: 'Erro', description: 'Não foi possível finalizar a tarefa.', variant: 'destructive' });
    }
  };

  const handleReabrirTarefa = async (tarefaId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('funil_card_atividades')
        .update({ status: 'a_realizar', updated_at: new Date().toISOString() })
        .eq('id', tarefaId);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Tarefa reaberta!' });
      loadTarefas();
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error);
      toast({ title: 'Erro', description: 'Não foi possível reabrir a tarefa.', variant: 'destructive' });
    }
  };

  const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getUsuarioNome = (userId: string | null) => {
    if (!userId) return null;
    return usuarios.find(u => u.id === userId)?.nome || null;
  };

  const getTarefasPorDia = (dia: Date) => tarefas.filter(t => t.prazo && isSameDay(parse(t.prazo.split('T')[0], 'yyyy-MM-dd', new Date()), dia));

  // Exportar tarefas para CSV
  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      
      // Se tiver muitas tarefas, avisar que será em background
      if (tarefas.length > 500) {
        toast({
          title: 'Exportação em andamento',
          description: 'A exportação será executada em background. Você receberá uma notificação quando finalizar.',
        });
      }

      // Cabeçalho do CSV
      const headers = [
        'ID',
        'Tipo',
        'Descrição',
        'Status',
        'Data/Prazo',
        'Horário',
        'Card',
        'Funil',
        'Responsável',
        'Criador',
        'Criado em'
      ];

      // Dados das tarefas
      const rows = tarefas.map(tarefa => [
        tarefa.id,
        TIPO_ATIVIDADE_LABELS[tarefa.tipo] || tarefa.tipo,
        `"${(tarefa.descricao || '').replace(/"/g, '""')}"`,
        STATUS_LABELS[tarefa.status] || tarefa.status,
        tarefa.prazo ? format(parse(tarefa.prazo.split('T')[0], 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }) : '',
        tarefa.horario || '',
        `"${(tarefa.card_titulo || '').replace(/"/g, '""')}"`,
        `"${(tarefa.funil_nome || '').replace(/"/g, '""')}"`,
        `"${(getUsuarioNome(tarefa.responsavel_id) || '').replace(/"/g, '""')}"`,
        `"${(tarefa.criador?.nome || '').replace(/"/g, '""')}"`,
        tarefa.created_at ? format(new Date(tarefa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''
      ]);

      // Montar CSV
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Criar blob e download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tarefas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: `${tarefas.length} tarefas exportadas com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar as tarefas.',
        variant: 'destructive'
      });
    } finally {
      setExportingCSV(false);
    }
  };

  // Navegar para o card no funil correspondente
  const handleNavigateToCard = (tarefa: Tarefa) => {
    if (!onNavigate) {
      toast({
        title: 'Informação',
        description: 'Navegação não disponível neste contexto.',
      });
      return;
    }

    // Mapear funil_origem para a section correta
    const funilSectionMap: Record<string, string> = {
      'prospeccao': 'comercial-prospeccao',
      'closer': 'comercial',
      'pos_venda': 'comercial-pos-venda',
      'cross_selling': 'comercial-cross-selling',
      'funil_generico': tarefa.funil_id ? `funil-${tarefa.funil_id}` : '',
    };

    const section = funilSectionMap[tarefa.funil_origem];
    
    if (section) {
      onNavigate(section, tarefa.card_id);
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível identificar o funil desta tarefa.',
        variant: 'destructive'
      });
    }
  };

  const diasDoMes = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mesAtual), { locale: ptBR }),
    end: endOfWeek(endOfMonth(mesAtual), { locale: ptBR }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie todas as tarefas da equipe</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <span className="text-sm font-medium text-muted-foreground">Filtrar por atividade:</span>
          <div className="flex items-center gap-1">
            {Object.entries(TIPO_ATIVIDADE_ICONS).map(([tipo, icon]) => (
              <Button
                key={tipo}
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg ${filtroTipoAtividade === tipo ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setFiltroTipoAtividade(filtroTipoAtividade === tipo ? null : tipo)}
                title={TIPO_ATIVIDADE_LABELS[tipo]}
              >
                {icon}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          {/* Filtro por Funil - Lista dinâmica do banco */}
          <Select value={filtroFunil || 'todos'} onValueChange={(v) => setFiltroFunil(v === 'todos' ? null : v)}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Todos os funis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os funis</SelectItem>
              {funis.length > 0 && (
                <>
                  {/* Agrupar funis por setor */}
                  {(() => {
                    const setoresUnicos = [...new Set(funis.map(f => f.setor?.nome || 'Sem setor'))];
                    return setoresUnicos.map(setorNome => {
                      const funisDoSetor = funis.filter(f => (f.setor?.nome || 'Sem setor') === setorNome);
                      return (
                        <div key={setorNome}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {setorNome}
                          </div>
                          {funisDoSetor.map(funil => (
                            <SelectItem key={funil.id} value={`funil_${funil.id}`}>
                              {funil.nome}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border mx-2" />

          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-md px-4 ${filtroStatus === 'todas' ? 'bg-background text-primary shadow-sm font-medium' : 'text-muted-foreground'}`}
              onClick={() => setFiltroStatus('todas')}
            >
              Todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-md px-4 ${filtroStatus === 'pendentes' ? 'bg-background text-warning shadow-sm font-medium' : 'text-muted-foreground'}`}
              onClick={() => setFiltroStatus('pendentes')}
            >
              Pendentes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-md px-4 ${filtroStatus === 'concluida' ? 'bg-background text-success shadow-sm font-medium' : 'text-muted-foreground'}`}
              onClick={() => setFiltroStatus('concluida')}
            >
              Finalizadas
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {['todas', 'hoje', 'semana'].map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${filtroData === d ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground'}`}
                onClick={() => setFiltroData(d as any)}
              >
                {d === 'todas' ? 'Todas' : d === 'hoje' ? 'Hoje' : 'Esta semana'}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-md px-3 ${filtroData === 'definir' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground'}`}
                  onClick={() => setFiltroData('definir')}
                >
                  Definir
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div>
                    <Label>Data Início</Label>
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{totalTarefas} tarefas {filtroStatus === 'pendentes' ? 'pendentes' : filtroStatus === 'concluida' ? 'finalizadas' : ''} por</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] h-9 justify-between bg-white">
                  <span className="truncate">
                    {filtroUsuario ? usuarios.find(u => u.id === filtroUsuario)?.nome || 'Usuário' : 'Todos os usuários'}
                  </span>
                  <User className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Buscar usuário..."
                    value={buscaUsuario}
                    onChange={(e) => setBuscaUsuario(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
                    onClick={() => { setFiltroUsuario(null); setBuscaUsuario(''); }}
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Todos os usuários</span>
                  </div>
                  {usuarios
                    .filter(u => u.nome.toLowerCase().includes(buscaUsuario.toLowerCase()))
                    .map(u => (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted ${filtroUsuario === u.id ? 'bg-primary/10' : ''}`}
                        onClick={() => { setFiltroUsuario(u.id); setBuscaUsuario(''); }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{u.nome}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {u.grupo_acesso === 'administrador' ? 'Admin' : u.grupo_acesso === 'gestor' ? 'Gestor' : u.grupo_acesso === 'colaborador' ? 'Colab.' : 'N/A'}
                            </Badge>
                            {u.setor?.nome && <span>{u.setor.nome}</span>}
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                          {u.total_tarefas || 0} tarefas
                        </Badge>
                      </div>
                    ))}
                  {usuarios.filter(u => u.nome.toLowerCase().includes(buscaUsuario.toLowerCase())).length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${viewMode === 'listagem' ? 'bg-background text-primary shadow-sm font-medium' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('listagem')}
              >
                <List className="h-4 w-4 mr-1" />
                Listagem
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${viewMode === 'calendario' ? 'bg-background text-primary shadow-sm font-medium' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('calendario')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Calendário
              </Button>
            </div>
            <Button variant="outline" size="sm" className="text-muted-foreground" onClick={handleExportCSV} disabled={exportingCSV}>
              <Download className="h-4 w-4 mr-1" />
              {exportingCSV ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {viewMode === 'listagem' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tarefas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">Nenhuma tarefa encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            tarefas.map(tarefa => (
              <div key={tarefa.id} className="bg-card border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      tarefa.status === 'concluida' ? 'bg-success border-success text-white' : 'border-muted-foreground/30'
                    }`}>
                      {tarefa.status === 'concluida' && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <div className={`p-2 rounded-lg ${tarefa.status === 'concluida' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                      {TIPO_ATIVIDADE_ICONS[tarefa.tipo] || <FileText className="h-4 w-4" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {tarefa.funil_nome && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Building2 className="h-3 w-3" />
                        <span className="font-medium text-primary">{tarefa.funil_nome}</span>
                        <span>|</span>
                        <span>{tarefa.card_titulo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold ${tarefa.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                        {tarefa.descricao}
                      </h3>
                      <Badge className={`text-xs border ${STATUS_COLORS[tarefa.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[tarefa.status] || tarefa.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Criada por {tarefa.criador?.nome || getUsuarioNome(tarefa.criador_id) || 'Desconhecido'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Responsável: {getUsuarioNome(tarefa.responsavel_id) || 'Não atribuído'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {tarefa.status === 'concluida' ? (
                      <Badge className="bg-success/10 text-success border border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluída {format(new Date(tarefa.updated_at), "dd/MMM", { locale: ptBR })}
                      </Badge>
                    ) : tarefa.prazo ? (
                      <Badge className="bg-primary/10 text-primary border border-primary/20">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(parse(tarefa.prazo.split('T')[0], 'yyyy-MM-dd', new Date()), "dd/MMM", { locale: ptBR })}
                        {tarefa.horario && ` às ${tarefa.horario}`}
                      </Badge>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-2">
                        {(tarefa.criador?.nome || getUsuarioNome(tarefa.criador_id)) && (
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(tarefa.criador?.nome || getUsuarioNome(tarefa.criador_id) || '')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleNavigateToCard(tarefa)}>
                            <Eye className="h-4 w-4 mr-2" />Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNavigateToCard(tarefa)}>
                            <ExternalLink className="h-4 w-4 mr-2" />Ir para o card
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Paginação */}
          {totalTarefas > itensPorPagina && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalTarefas)} de {totalTarefas} tarefas
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalTarefas / itensPorPagina)) }, (_, i) => {
                    const totalPaginas = Math.ceil(totalTarefas / itensPorPagina);
                    let pagina: number;
                    
                    if (totalPaginas <= 5) {
                      pagina = i + 1;
                    } else if (paginaAtual <= 3) {
                      pagina = i + 1;
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pagina = totalPaginas - 4 + i;
                    } else {
                      pagina = paginaAtual - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pagina}
                        variant={paginaAtual === pagina ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPaginaAtual(pagina)}
                      >
                        {pagina}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(p => Math.min(Math.ceil(totalTarefas / itensPorPagina), p + 1))}
                  disabled={paginaAtual >= Math.ceil(totalTarefas / itensPorPagina)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => setMesAtual(subMonths(mesAtual, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setMesAtual(addMonths(mesAtual, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <h2 className="text-xl font-semibold">{format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
            <div className="w-32" />
          </div>
          <div className="grid grid-cols-7">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
              <div key={dia} className="p-2 text-center text-sm font-medium text-muted-foreground border-b bg-muted/50">{dia}</div>
            ))}
            {diasDoMes.map((dia, index) => {
              const tarefasDoDia = getTarefasPorDia(dia);
              return (
                <div key={index} className={`min-h-[100px] p-1 border-b border-r ${!isSameMonth(dia, mesAtual) ? 'bg-muted/50' : ''} ${isToday(dia) ? 'bg-primary/5' : ''}`}>
                  <div className={`text-sm font-medium mb-1 ${!isSameMonth(dia, mesAtual) ? 'text-muted-foreground' : ''} ${isToday(dia) ? 'text-primary' : ''}`}>
                    {format(dia, 'd')}
                  </div>
                  <div className="space-y-1">
                    {tarefasDoDia.slice(0, 3).map(t => (
                      <div key={t.id} className={`text-xs p-1 rounded truncate ${t.status === 'concluida' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`} title={t.descricao}>
                        {t.horario && `${t.horario} `}{t.descricao}
                      </div>
                    ))}
                    {tarefasDoDia.length > 3 && <div className="text-xs text-muted-foreground">+{tarefasDoDia.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Textarea value={novaTarefa.descricao} onChange={(e) => setNovaTarefa({ ...novaTarefa, descricao: e.target.value })} placeholder="Descreva a tarefa..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={novaTarefa.tipo} onValueChange={(v) => setNovaTarefa({ ...novaTarefa, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_ATIVIDADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={novaTarefa.prazo} onChange={(e) => setNovaTarefa({ ...novaTarefa, prazo: e.target.value })} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Para criar tarefas vinculadas a negócios, acesse o card no funil.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarTarefa} className="bg-primary hover:bg-primary/90">Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
