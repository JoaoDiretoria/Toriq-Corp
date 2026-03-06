import { useState, useEffect } from 'react';
import { 
  Headphones, 
  Search, 
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useHierarquia } from '@/hooks/useHierarquia';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_email: string;
  empresa_solicitante_id: string;
  empresa_destino_id: string | null;
  role_solicitante: string;
  tipo: string;
  prioridade: string;
  impacto_operacional: string;
  titulo: string;
  descricao: string;
  status: string;
  atendente_id: string | null;
  atendente_nome: string | null;
  resolucao: string | null;
  resolvido_em: string | null;
  tela_origem: string | null;
  modulo: string | null;
  tela: string | null;
  created_at: string;
  updated_at: string;
  // Dados da empresa (join)
  empresa_solicitante?: {
    nome: string;
    tipo: string;
  };
  empresa_destino?: {
    nome: string;
  };
}

interface Comentario {
  id: string;
  autor_id: string;
  autor_nome: string;
  conteudo: string;
  interno: boolean;
  created_at: string;
}

interface Anexo {
  id: string;
  nome_arquivo: string;
  url: string;
}

interface SLAConfig {
  id?: string;
  empresa_id: string;
  prioridade_baixa_horas: number;
  prioridade_media_horas: number;
  prioridade_alta_horas: number;
  prioridade_critica_horas: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  aberto: { label: 'Aberto', color: 'bg-info/10 text-info', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-warning/10 text-warning', icon: Loader2 },
  aguardando_resposta: { label: 'Aguardando', color: 'bg-secondary/10 text-secondary', icon: MessageSquare },
  resolvido: { label: 'Resolvido', color: 'bg-success/10 text-success', icon: CheckCircle2 },
  fechado: { label: 'Fechado', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  media: { label: 'Média', color: 'bg-info/10 text-info' },
  alta: { label: 'Alta', color: 'bg-warning/10 text-warning' },
  critica: { label: 'Crítica', color: 'bg-destructive/10 text-destructive' },
};

const IMPACTO_CONFIG: Record<string, { label: string; color: string }> = {
  nenhum: { label: 'Nenhum', color: 'text-muted-foreground' },
  baixo: { label: 'Baixo', color: 'text-info' },
  medio: { label: 'Médio', color: 'text-warning' },
  alto: { label: 'Alto', color: 'text-warning' },
  critico: { label: 'Crítico', color: 'text-destructive' },
};

// SLA padrão em horas por prioridade
const SLA_PADRAO: Record<string, number> = {
  baixa: 72,    // 3 dias
  media: 48,    // 2 dias
  alta: 24,     // 1 dia
  critica: 4,   // 4 horas
};

export default function SuporteTickets() {
  const { profile, user } = useAuth();
  const { isAdministrador, loading: loadingHierarquia } = useHierarquia();
  const isAdmin = profile?.role === 'admin_vertical';
  const isSST = profile?.role === 'empresa_sst';
  // Administrador da empresa SST pode gerenciar tickets de todos os usuários da empresa
  const canManageTickets = isAdmin || (isSST && isAdministrador);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [usuarioFilter, setUsuarioFilter] = useState<string>('todos');
  const [prazoFilter, setPrazoFilter] = useState<string>('todos'); // todos, atrasado, no_prazo, proximo
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  // Estados para ordenação
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'created_at', direcao: 'desc' });
  
  // Lista de usuários com tickets
  interface UsuarioComTickets {
    id: string;
    nome: string;
    total_tickets: number;
  }
  const [usuariosComTickets, setUsuariosComTickets] = useState<UsuarioComTickets[]>([]);
  
  // Estados para configuração de SLA
  const [slaConfig, setSlaConfig] = useState<SLAConfig | null>(null);
  const [showSlaConfig, setShowSlaConfig] = useState(false);
  const [slaForm, setSlaForm] = useState({
    prioridade_baixa_horas: 72,
    prioridade_media_horas: 48,
    prioridade_alta_horas: 24,
    prioridade_critica_horas: 4,
  });
  const [salvandoSla, setSalvandoSla] = useState(false);

  // Função para obter horas SLA por prioridade
  const getSlaHoras = (prioridade: string): number => {
    if (slaConfig) {
      switch (prioridade) {
        case 'baixa': return slaConfig.prioridade_baixa_horas;
        case 'media': return slaConfig.prioridade_media_horas;
        case 'alta': return slaConfig.prioridade_alta_horas;
        case 'critica': return slaConfig.prioridade_critica_horas;
        default: return 48;
      }
    }
    return SLA_PADRAO[prioridade] || 48;
  };

  // Função para calcular prazo estimado
  const calcularPrazoEstimado = (createdAt: string, prioridade: string): Date => {
    const horasSLA = getSlaHoras(prioridade);
    const dataAbertura = new Date(createdAt);
    return new Date(dataAbertura.getTime() + horasSLA * 60 * 60 * 1000);
  };

  // Função para verificar status do prazo
  const getStatusPrazo = (ticket: Ticket): { status: 'no_prazo' | 'atrasado' | 'proximo'; label: string; color: string } => {
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
      return { status: 'no_prazo', label: 'Concluído', color: 'text-success bg-success/5' };
    }
    
    const prazoEstimado = calcularPrazoEstimado(ticket.created_at, ticket.prioridade);
    const agora = new Date();
    const horasRestantes = (prazoEstimado.getTime() - agora.getTime()) / (1000 * 60 * 60);
    
    if (horasRestantes < 0) {
      return { status: 'atrasado', label: 'Atrasado', color: 'text-destructive bg-destructive/5' };
    } else if (horasRestantes <= 4) {
      return { status: 'proximo', label: 'Próximo do prazo', color: 'text-warning bg-warning/5' };
    }
    return { status: 'no_prazo', label: 'No prazo', color: 'text-success bg-success/5' };
  };
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todos');
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('tickets_suporte')
        .select(`
          *,
          empresa_solicitante:empresas!tickets_suporte_empresa_solicitante_id_fkey(nome, tipo),
          empresa_destino:empresas!tickets_suporte_empresa_destino_id_fkey(nome)
        `)
        .order('created_at', { ascending: false });
      
      // Filtrar tickets baseado na role do usuário e hierarquia
      if (profile?.role === 'admin_vertical') {
        // Admin global vê apenas tickets de empresa_sst (empresa_destino_id = NULL)
        query = query.is('empresa_destino_id', null);
      } else if (profile?.role === 'empresa_sst') {
        if (isAdministrador) {
          // Administrador da empresa SST vê todos os tickets da empresa (para resolver)
          // Tickets destinados à empresa OU criados por usuários da empresa
          query = query.or(`empresa_destino_id.eq.${profile.empresa_id},empresa_solicitante_id.eq.${profile.empresa_id}`);
        } else {
          // Gestor/Colaborador vê apenas seus próprios tickets
          query = query.eq('solicitante_id', user?.id);
        }
      } else {
        // Outros usuários (cliente, instrutor, parceiro) veem apenas seus próprios tickets
        query = query.eq('solicitante_id', user?.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTickets(data || []);
      
      // Extrair usuários únicos com tickets abertos
      const usuariosMap = new Map<string, { nome: string; total: number }>();
      (data || []).forEach((ticket: Ticket) => {
        const existing = usuariosMap.get(ticket.solicitante_id);
        if (existing) {
          existing.total++;
        } else {
          usuariosMap.set(ticket.solicitante_id, { nome: ticket.solicitante_nome, total: 1 });
        }
      });
      
      const usuarios: UsuarioComTickets[] = Array.from(usuariosMap.entries())
        .map(([id, info]) => ({ id, nome: info.nome, total_tickets: info.total }))
        .sort((a, b) => b.total_tickets - a.total_tickets);
      
      setUsuariosComTickets(usuarios);
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  // Buscar configuração de SLA da empresa
  const fetchSlaConfig = async () => {
    if (!profile?.empresa_id) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('tickets_sla_config')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .single();
      
      if (data) {
        setSlaConfig(data);
        setSlaForm({
          prioridade_baixa_horas: data.prioridade_baixa_horas,
          prioridade_media_horas: data.prioridade_media_horas,
          prioridade_alta_horas: data.prioridade_alta_horas,
          prioridade_critica_horas: data.prioridade_critica_horas,
        });
      }
    } catch (error) {
      // Sem config, usar padrão
    }
  };

  // Salvar configuração de SLA
  const handleSaveSlaConfig = async () => {
    if (!profile?.empresa_id) return;
    
    setSalvandoSla(true);
    try {
      const configData = {
        empresa_id: profile.empresa_id,
        ...slaForm,
      };

      if (slaConfig?.id) {
        // Atualizar existente
        const { error } = await (supabase as any)
          .from('tickets_sla_config')
          .update(slaForm)
          .eq('id', slaConfig.id);
        
        if (error) throw error;
      } else {
        // Inserir novo
        const { error } = await (supabase as any)
          .from('tickets_sla_config')
          .insert(configData);
        
        if (error) throw error;
      }

      await fetchSlaConfig();
      setShowSlaConfig(false);
      toast.success('Configuração de SLA salva com sucesso');
    } catch (error) {
      console.error('Erro ao salvar SLA:', error);
      toast.error('Erro ao salvar configuração de SLA');
    } finally {
      setSalvandoSla(false);
    }
  };

  useEffect(() => {
    // Aguardar hierarquia carregar antes de buscar tickets
    if (loadingHierarquia) return;
    
    fetchTickets();
    fetchSlaConfig();
    
    // Realtime subscription
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets_suporte' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadingHierarquia, isAdministrador]);


  const fetchTicketDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    
    // Buscar comentários
    const { data: comentariosData } = await (supabase as any)
      .from('tickets_suporte_comentarios')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    
    setComentarios(comentariosData || []);
    
    // Buscar anexos
    const { data: anexosData } = await (supabase as any)
      .from('tickets_suporte_anexos')
      .select('*')
      .eq('ticket_id', ticket.id);
    
    setAnexos(anexosData || []);
  };

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !selectedTicket || !profile) return;
    
    setEnviandoComentario(true);
    try {
      const { error } = await (supabase as any)
        .from('tickets_suporte_comentarios')
        .insert({
          ticket_id: selectedTicket.id,
          autor_id: user?.id,
          autor_nome: profile.nome || user?.email,
          conteudo: novoComentario,
          interno: false,
        });
      
      if (error) throw error;
      
      setNovoComentario('');
      fetchTicketDetails(selectedTicket);
      toast.success('Comentário enviado');
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      toast.error('Erro ao enviar comentário');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const handleAtualizarStatus = async (novoStatus: string) => {
    if (!selectedTicket) return;
    
    setAtualizandoStatus(true);
    try {
      const updates: any = {
        status: novoStatus,
        atendente_id: user?.id,
        atendente_nome: profile?.nome || user?.email,
      };
      
      if (novoStatus === 'resolvido') {
        updates.resolvido_em = new Date().toISOString();
      }
      
      const { error } = await (supabase as any)
        .from('tickets_suporte')
        .update(updates)
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
      
      // Criar notificação para o solicitante
      await criarNotificacaoAlteracao(selectedTicket, 'status', selectedTicket.status, novoStatus);
      
      setSelectedTicket({ ...selectedTicket, ...updates });
      fetchTickets();
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const handleAtualizarPrioridade = async (novaPrioridade: string) => {
    if (!selectedTicket || !canManageTickets) return;
    
    try {
      const { error } = await (supabase as any)
        .from('tickets_suporte')
        .update({ prioridade: novaPrioridade })
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
      
      await criarNotificacaoAlteracao(selectedTicket, 'prioridade', selectedTicket.prioridade, novaPrioridade);
      
      setSelectedTicket({ ...selectedTicket, prioridade: novaPrioridade });
      fetchTickets();
      toast.success('Prioridade atualizada');
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Erro ao atualizar prioridade');
    }
  };

  const handleAtualizarImpacto = async (novoImpacto: string) => {
    if (!selectedTicket || !canManageTickets) return;
    
    try {
      const { error } = await (supabase as any)
        .from('tickets_suporte')
        .update({ impacto_operacional: novoImpacto })
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
      
      await criarNotificacaoAlteracao(selectedTicket, 'impacto', selectedTicket.impacto_operacional, novoImpacto);
      
      setSelectedTicket({ ...selectedTicket, impacto_operacional: novoImpacto });
      fetchTickets();
      toast.success('Impacto atualizado');
    } catch (error) {
      console.error('Erro ao atualizar impacto:', error);
      toast.error('Erro ao atualizar impacto');
    }
  };

  const criarNotificacaoAlteracao = async (ticket: Ticket, campo: string, valorAntigo: string, valorNovo: string) => {
    try {
      // Não criar notificação se não houver empresa_id válido
      if (!ticket.empresa_solicitante_id) {
        console.warn('Notificação não criada: empresa_solicitante_id não encontrado');
        return;
      }
      
      const campoLabel = campo === 'status' ? 'Status' : campo === 'prioridade' ? 'Prioridade' : 'Impacto';
      const configAntigo = campo === 'status' ? STATUS_CONFIG[valorAntigo] : campo === 'prioridade' ? PRIORIDADE_CONFIG[valorAntigo] : IMPACTO_CONFIG[valorAntigo];
      const configNovo = campo === 'status' ? STATUS_CONFIG[valorNovo] : campo === 'prioridade' ? PRIORIDADE_CONFIG[valorNovo] : IMPACTO_CONFIG[valorNovo];
      
      await (supabase as any)
        .from('notificacoes')
        .insert({
          user_id: ticket.solicitante_id,
          empresa_id: ticket.empresa_solicitante_id,
          tipo: 'ticket_atualizado',
          titulo: `Ticket #${ticket.id.slice(0, 8)} atualizado`,
          mensagem: `${campoLabel} alterado de "${configAntigo?.label || valorAntigo}" para "${configNovo?.label || valorNovo}"`,
          dados: { ticket_id: ticket.id, campo, valor_antigo: valorAntigo, valor_novo: valorNovo },
        });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, statusFilter, prioridadeFilter, usuarioFilter, prazoFilter, ordenacao]);

  const ticketsFiltrados = tickets
    .filter(ticket => {
      const matchSearch = ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.solicitante_nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'todos' || ticket.status === statusFilter;
      const matchPrioridade = prioridadeFilter === 'todos' || ticket.prioridade === prioridadeFilter;
      const matchUsuario = usuarioFilter === 'todos' || ticket.solicitante_id === usuarioFilter;
      
      // Filtro por prazo (atrasado, no_prazo, proximo)
      let matchPrazo = true;
      if (prazoFilter !== 'todos') {
        const statusPrazo = getStatusPrazo(ticket);
        matchPrazo = statusPrazo.status === prazoFilter;
      }
      
      return matchSearch && matchStatus && matchPrioridade && matchUsuario && matchPrazo;
    })
    .sort((a, b) => {
      const { campo, direcao } = ordenacao;
      let valorA: any;
      let valorB: any;
      
      switch (campo) {
        case 'created_at':
          valorA = new Date(a.created_at).getTime();
          valorB = new Date(b.created_at).getTime();
          break;
        case 'titulo':
          valorA = a.titulo.toLowerCase();
          valorB = b.titulo.toLowerCase();
          break;
        case 'prioridade':
          const prioridadeOrdem = { critica: 4, alta: 3, media: 2, baixa: 1 };
          valorA = prioridadeOrdem[a.prioridade as keyof typeof prioridadeOrdem] || 0;
          valorB = prioridadeOrdem[b.prioridade as keyof typeof prioridadeOrdem] || 0;
          break;
        case 'status':
          valorA = a.status;
          valorB = b.status;
          break;
        case 'solicitante_nome':
          valorA = a.solicitante_nome.toLowerCase();
          valorB = b.solicitante_nome.toLowerCase();
          break;
        default:
          valorA = a.created_at;
          valorB = b.created_at;
      }
      
      if (direcao === 'asc') {
        return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
      } else {
        return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
      }
    });

  // Paginação
  const totalPaginas = Math.ceil(ticketsFiltrados.length / itensPorPagina);
  const ticketsPaginados = ticketsFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Função para alternar ordenação
  const toggleOrdenacao = (campo: string) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Ícone de ordenação
  const getIconeOrdenacao = (campo: string) => {
    if (ordenacao.campo !== campo) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return ordenacao.direcao === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Métricas calculadas
  const metricas = {
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento').length,
    aguardando: tickets.filter(t => t.status === 'aguardando_resposta').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido').length,
    fechados: tickets.filter(t => t.status === 'fechado').length,
    atrasados: tickets.filter(t => {
      if (t.status === 'resolvido' || t.status === 'fechado') return false;
      return getStatusPrazo(t).status === 'atrasado';
    }).length,
    noPrazo: tickets.filter(t => {
      if (t.status === 'resolvido' || t.status === 'fechado') return true;
      return getStatusPrazo(t).status === 'no_prazo';
    }).length,
  };

  // Dados para gráfico de pizza (status)
  const dadosGraficoStatus = [
    { name: 'Abertos', value: metricas.abertos, color: '#3b82f6' },
    { name: 'Em Andamento', value: metricas.emAndamento, color: '#eab308' },
    { name: 'Aguardando', value: metricas.aguardando, color: '#a855f7' },
    { name: 'Resolvidos', value: metricas.resolvidos, color: '#22c55e' },
    { name: 'Fechados', value: metricas.fechados, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Dados para gráfico de barras (prioridade)
  const dadosGraficoPrioridade = [
    { name: 'Baixa', quantidade: tickets.filter(t => t.prioridade === 'baixa').length, fill: '#94a3b8' },
    { name: 'Média', quantidade: tickets.filter(t => t.prioridade === 'media').length, fill: '#3b82f6' },
    { name: 'Alta', quantidade: tickets.filter(t => t.prioridade === 'alta').length, fill: '#f97316' },
    { name: 'Crítica', quantidade: tickets.filter(t => t.prioridade === 'critica').length, fill: '#ef4444' },
  ];

  // Tempo médio de resolução (em horas)
  const ticketsResolvidos = tickets.filter(t => t.status === 'resolvido' && t.resolvido_em);
  const tempoMedioResolucao = ticketsResolvidos.length > 0
    ? ticketsResolvidos.reduce((acc, t) => {
        const horas = differenceInHours(new Date(t.resolvido_em!), new Date(t.created_at));
        return acc + horas;
      }, 0) / ticketsResolvidos.length
    : 0;

  // Para compatibilidade
  const contadores = metricas;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Headphones className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tickets de Suporte</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Gerencie todos os tickets recebidos' : 'Acompanhe seus tickets'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageTickets && (
            <Button variant="outline" size="sm" onClick={() => setShowSlaConfig(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar SLA
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchTickets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Dialog de configuração de SLA */}
      <Dialog open={showSlaConfig} onOpenChange={setShowSlaConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Prazos de SLA
            </DialogTitle>
            <DialogDescription>
              Defina o tempo máximo (em horas) para resolução de tickets por prioridade.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground">Baixa</Badge>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={slaForm.prioridade_baixa_horas}
                    onChange={(e) => setSlaForm(prev => ({ ...prev, prioridade_baixa_horas: parseInt(e.target.value) || 72 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-info/10 text-info">Média</Badge>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={slaForm.prioridade_media_horas}
                    onChange={(e) => setSlaForm(prev => ({ ...prev, prioridade_media_horas: parseInt(e.target.value) || 48 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-warning/10 text-warning">Alta</Badge>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={slaForm.prioridade_alta_horas}
                    onChange={(e) => setSlaForm(prev => ({ ...prev, prioridade_alta_horas: parseInt(e.target.value) || 24 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700">Crítica</Badge>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={slaForm.prioridade_critica_horas}
                    onChange={(e) => setSlaForm(prev => ({ ...prev, prioridade_critica_horas: parseInt(e.target.value) || 4 }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                Valores padrão: Baixa (72h), Média (48h), Alta (24h), Crítica (4h)
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSlaConfig(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSlaConfig} disabled={salvandoSla}>
                  {salvandoSla ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Abertos
            </CardDescription>
            <CardTitle className="text-2xl text-info">{metricas.abertos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Loader2 className="h-3 w-3" /> Em Andamento
            </CardDescription>
            <CardTitle className="text-2xl text-warning">{metricas.emAndamento}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Resolvidos
            </CardDescription>
            <CardTitle className="text-2xl text-success">{metricas.resolvidos}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={metricas.atrasados > 0 ? 'border-destructive/20 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Atrasados
            </CardDescription>
            <CardTitle className={cn('text-2xl', metricas.atrasados > 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {metricas.atrasados}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>No Prazo</CardDescription>
            <CardTitle className="text-2xl text-success">{metricas.noPrazo}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo Médio</CardDescription>
            <CardTitle className="text-2xl text-primary">
              {tempoMedioResolucao > 0 ? `${Math.round(tempoMedioResolucao)}h` : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de Pizza - Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tickets por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGraficoStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dadosGraficoStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Barras - Prioridade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tickets por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoPrioridade} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                    <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando_resposta">Aguardando</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="fechado">Fechados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={prazoFilter} onValueChange={setPrazoFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os prazos</SelectItem>
            <SelectItem value="atrasado">Atrasados</SelectItem>
            <SelectItem value="proximo">Próximo do prazo</SelectItem>
            <SelectItem value="no_prazo">No prazo</SelectItem>
          </SelectContent>
        </Select>
        {canManageTickets && usuariosComTickets.length > 1 && (
          <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os usuários</SelectItem>
              {usuariosComTickets.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{u.nome}</span>
                    <Badge variant="secondary" className="text-[10px] ml-2">{u.total_tickets}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cabeçalho de ordenação */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
        <span className="font-medium">Ordenar por:</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => toggleOrdenacao('created_at')}
        >
          Data {getIconeOrdenacao('created_at')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => toggleOrdenacao('titulo')}
        >
          Título {getIconeOrdenacao('titulo')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => toggleOrdenacao('prioridade')}
        >
          Prioridade {getIconeOrdenacao('prioridade')}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => toggleOrdenacao('status')}
        >
          Status {getIconeOrdenacao('status')}
        </Button>
        {canManageTickets && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => toggleOrdenacao('solicitante_nome')}
          >
            Solicitante {getIconeOrdenacao('solicitante_nome')}
          </Button>
        )}
        <div className="ml-auto text-muted-foreground">
          {ticketsFiltrados.length} ticket{ticketsFiltrados.length !== 1 ? 's' : ''} encontrado{ticketsFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ticketsFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Headphones className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum ticket encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {ticketsPaginados.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.aberto;
                const prioridadeConfig = PRIORIDADE_CONFIG[ticket.prioridade] || PRIORIDADE_CONFIG.media;
                const impactoConfig = IMPACTO_CONFIG[ticket.impacto_operacional] || IMPACTO_CONFIG.nenhum;
                const StatusIcon = statusConfig.icon;
                const isCritico = ticket.prioridade === 'critica' || ticket.impacto_operacional === 'critico';
                const statusPrazo = getStatusPrazo(ticket);
                const prazoEstimado = calcularPrazoEstimado(ticket.created_at, ticket.prioridade);
                
                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      'group relative bg-card border rounded-xl p-4 cursor-pointer transition-all duration-200',
                      'hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5',
                      isCritico && 'border-l-4 border-l-red-500'
                    )}
                    onClick={() => fetchTicketDetails(ticket)}
                  >
                    {/* Header com ID e badges */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          #{ticket.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={cn('text-[10px] px-2 py-0', prioridadeConfig.color)}>
                          {prioridadeConfig.label}
                        </Badge>
                        <Badge variant="secondary" className={cn('text-[10px] px-2 py-0', statusConfig.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Título e descrição */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {ticket.titulo}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {ticket.descricao}
                      </p>
                    </div>
                    
                    {/* Footer com info do solicitante e prazo */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{ticket.solicitante_nome}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Badge de prazo */}
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusPrazo.color)}>
                          {statusPrazo.label}
                        </span>
                        {/* Prazo estimado */}
                        {ticket.status !== 'resolvido' && ticket.status !== 'fechado' && (
                          <span className="text-[10px] text-muted-foreground">
                            Prazo: {format(prazoEstimado, 'dd/MM HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    {ticket.impacto_operacional !== 'nenhum' && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <span className={cn('text-xs font-medium', impactoConfig.color)}>
                          Impacto: {impactoConfig.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, ticketsFiltrados.length)} de {ticketsFiltrados.length} tickets
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
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
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
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog de detalhes do ticket */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 flex flex-col">
          {selectedTicket && (
            <>
              <div className="p-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTicket.titulo}</DialogTitle>
                    <DialogDescription>
                      Ticket #{selectedTicket.id.slice(0, 8)} • Aberto {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true, locale: ptBR })}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORIDADE_CONFIG[selectedTicket.prioridade]?.color}>
                      {PRIORIDADE_CONFIG[selectedTicket.prioridade]?.label}
                    </Badge>
                    <Badge className={STATUS_CONFIG[selectedTicket.status]?.color}>
                      {STATUS_CONFIG[selectedTicket.status]?.label}
                    </Badge>
                    {selectedTicket.tela_origem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(selectedTicket.tela_origem!, '_blank')}
                        title="Abrir tela reportada em nova aba"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4 pb-4">
                  {/* Info do solicitante */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{selectedTicket.solicitante_nome}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {selectedTicket.role_solicitante === 'empresa_sst' ? 'Empresa SST' :
                             selectedTicket.role_solicitante === 'cliente_final' ? 'Cliente' :
                             selectedTicket.role_solicitante === 'instrutor' ? 'Instrutor' :
                             selectedTicket.role_solicitante === 'empresa_parceira' ? 'Parceiro' :
                             selectedTicket.role_solicitante}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedTicket.solicitante_email}</p>
                      </div>
                    </div>
                    
                    {/* Informações da empresa */}
                    {selectedTicket.empresa_solicitante && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="font-medium">{selectedTicket.empresa_solicitante.nome}</span>
                          {selectedTicket.empresa_destino && (
                            <span className="text-muted-foreground"> → {selectedTicket.empresa_destino.nome}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Descrição */}
                  <div>
                    <h4 className="font-medium mb-2">Descrição</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTicket.descricao}
                    </p>
                  </div>
                  
                  {/* Detalhes */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="ml-2 capitalize">{selectedTicket.tipo?.replace('_', ' ') || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impacto:</span>
                      <span className={cn('ml-2', IMPACTO_CONFIG[selectedTicket.impacto_operacional]?.color)}>
                        {IMPACTO_CONFIG[selectedTicket.impacto_operacional]?.label}
                      </span>
                    </div>
                    {selectedTicket.modulo && (
                      <div>
                        <span className="text-muted-foreground">Módulo:</span>
                        <span className="ml-2">{selectedTicket.modulo}</span>
                      </div>
                    )}
                    {selectedTicket.tela && (
                      <div>
                        <span className="text-muted-foreground">Tela:</span>
                        <span className="ml-2">{selectedTicket.tela}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Anexos */}
                  {anexos.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Anexos</h4>
                      <div className="flex gap-2 flex-wrap">
                        {anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-20 h-20 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                          >
                            <img
                              src={anexo.url}
                              alt={anexo.nome_arquivo}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Controles de gerenciamento (apenas para SST/Admin) */}
                  {canManageTickets && selectedTicket.status !== 'fechado' && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Gerenciar Ticket</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Status */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Status</label>
                          <Select value={selectedTicket.status} onValueChange={handleAtualizarStatus}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberto">Aberto</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                              <SelectItem value="resolvido">Resolvido</SelectItem>
                              <SelectItem value="fechado">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Prioridade */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                          <Select value={selectedTicket.prioridade} onValueChange={handleAtualizarPrioridade}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baixa">Baixa</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="critica">Crítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Impacto */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Impacto</label>
                          <Select value={selectedTicket.impacto_operacional} onValueChange={handleAtualizarImpacto}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhum">Nenhum</SelectItem>
                              <SelectItem value="baixo">Baixo</SelectItem>
                              <SelectItem value="medio">Médio</SelectItem>
                              <SelectItem value="alto">Alto</SelectItem>
                              <SelectItem value="critico">Crítico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Comentários */}
                  <div>
                    <h4 className="font-medium mb-3">Comentários ({comentarios.length})</h4>
                    
                    {comentarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comentário ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comentarios.map((comentario) => (
                          <div
                            key={comentario.id}
                            className={cn(
                              'p-3 rounded-lg',
                              comentario.autor_id === user?.id
                                ? 'bg-primary/10 ml-8'
                                : 'bg-muted/50 mr-8'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{comentario.autor_nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comentario.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm">{comentario.conteudo}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Novo comentário */}
                    {selectedTicket.status !== 'fechado' && selectedTicket.status !== 'resolvido' ? (
                      <div className="mt-4 space-y-2">
                        <Textarea
                          placeholder="Escreva sua mensagem..."
                          value={novoComentario}
                          onChange={(e) => setNovoComentario(e.target.value)}
                          className="min-h-[80px] resize-y"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleEnviarComentario}
                            disabled={!novoComentario.trim() || enviandoComentario}
                            size="sm"
                          >
                            {enviandoComentario ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Enviar Mensagem
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Este ticket está {selectedTicket.status === 'resolvido' ? 'resolvido' : 'fechado'} e não aceita novas mensagens.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
