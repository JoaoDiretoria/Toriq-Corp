import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
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
  Upload,
  ExternalLink,
  Building2,
  User,
  Clock,
  MoreVertical,
  Eye
} from 'lucide-react';

interface Tarefa {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  prazo: string | null;
  horario: string | null;
  status: string;
  usuario_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
  card?: {
    titulo: string;
    coluna?: {
      nome: string;
    };
  };
}

interface Usuario {
  id: string;
  nome: string;
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
  a_realizar: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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

export function AdminTarefas() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'concluida'>('pendentes');
  const [filtroTipoAtividade, setFiltroTipoAtividade] = useState<string | null>(null);
  const [filtroData, setFiltroData] = useState<'todas' | 'hoje' | 'semana' | 'definir'>('todas');
  const [filtroUsuario, setFiltroUsuario] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  const [viewMode, setViewMode] = useState<'listagem' | 'calendario'>('listagem');
  const [mesAtual, setMesAtual] = useState(new Date());
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({
    descricao: '',
    tipo: 'tarefa',
    prazo: '',
    horario: '',
    responsavel_id: '',
  });

  useEffect(() => {
    loadTarefas();
    loadUsuarios();
  }, [filtroStatus, filtroTipoAtividade, filtroData, filtroUsuario, dataInicio, dataFim]);

  const loadTarefas = async () => {
    try {
      setLoading(true);
      
      // Buscar atividades da tabela closer_atividades (funis do Admin)
      let query = (supabase as any)
        .from('closer_atividades')
        .select(`
          *,
          card:closer_cards(
            titulo,
            coluna:closer_colunas(nome)
          )
        `)
        .order('prazo', { ascending: true, nullsFirst: false });

      if (filtroStatus === 'pendentes') {
        query = query.in('status', ['a_realizar', 'programada', 'pendente']);
      } else {
        query = query.eq('status', 'concluida');
      }

      if (filtroTipoAtividade) {
        query = query.eq('tipo', filtroTipoAtividade);
      }

      if (filtroUsuario && filtroUsuario !== 'todos') {
        query = query.eq('responsavel_id', filtroUsuario);
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
      // Buscar todos os usuários do sistema
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .not('nome', 'is', null)
        .order('nome');

      if (error) throw error;
      setUsuarios(data || []);
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
        .from('closer_atividades')
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
        .from('closer_atividades')
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

  const getTarefasPorDia = (dia: Date) => tarefas.filter(t => t.prazo && isSameDay(new Date(t.prazo), dia));

  const diasDoMes = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mesAtual), { locale: ptBR }),
    end: endOfWeek(endOfMonth(mesAtual), { locale: ptBR }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-gray-500">Gerencie todas as tarefas da equipe</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar tarefa
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-500">Filtrar por atividade:</span>
          <div className="flex items-center gap-1">
            {Object.entries(TIPO_ATIVIDADE_ICONS).map(([tipo, icon]) => (
              <Button
                key={tipo}
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg ${filtroTipoAtividade === tipo ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setFiltroTipoAtividade(filtroTipoAtividade === tipo ? null : tipo)}
                title={TIPO_ATIVIDADE_LABELS[tipo]}
              >
                {icon}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-md px-4 ${filtroStatus === 'pendentes' ? 'bg-white text-emerald-700 shadow-sm font-medium' : 'text-gray-600'}`}
              onClick={() => setFiltroStatus('pendentes')}
            >
              Pendentes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-md px-4 ${filtroStatus === 'concluida' ? 'bg-white text-green-600 shadow-sm font-medium' : 'text-gray-600'}`}
              onClick={() => setFiltroStatus('concluida')}
            >
              Finalizadas
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['todas', 'hoje', 'semana'].map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${filtroData === d ? 'bg-emerald-50 text-emerald-700 shadow-sm font-medium' : 'text-gray-600'}`}
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
                  className={`rounded-md px-3 ${filtroData === 'definir' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600'}`}
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
            <span className="text-sm text-gray-500">{tarefas.length} tarefas {filtroStatus === 'pendentes' ? 'pendentes' : 'finalizadas'} por</span>
            <Select value={filtroUsuario || 'todos'} onValueChange={(v) => setFiltroUsuario(v === 'todos' ? null : v)}>
              <SelectTrigger className="w-[180px] h-9 bg-white">
                <SelectValue placeholder="Selecione usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${viewMode === 'listagem' ? 'bg-white text-emerald-700 shadow-sm font-medium' : 'text-gray-600'}`}
                onClick={() => setViewMode('listagem')}
              >
                <List className="h-4 w-4 mr-1" />
                Listagem
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-md px-3 ${viewMode === 'calendario' ? 'bg-white text-emerald-700 shadow-sm font-medium' : 'text-gray-600'}`}
                onClick={() => setViewMode('calendario')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Calendário
              </Button>
            </div>
            <Button variant="outline" size="sm" className="text-gray-600"><Upload className="h-4 w-4 mr-1" />Importar</Button>
            <Button variant="outline" size="sm" className="text-gray-600"><Download className="h-4 w-4 mr-1" />Exportar</Button>
            <Button variant="outline" size="sm" className="text-gray-600"><ExternalLink className="h-4 w-4 mr-1" />Google Agenda</Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {viewMode === 'listagem' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : tarefas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Nenhuma tarefa encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            tarefas.map(tarefa => (
              <div key={tarefa.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-emerald-200">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => tarefa.status === 'concluida' ? handleReabrirTarefa(tarefa.id) : handleFinalizarTarefa(tarefa.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        tarefa.status === 'concluida' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      {tarefa.status === 'concluida' && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <div className={`p-2 rounded-lg ${tarefa.status === 'concluida' ? 'bg-green-100 text-green-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {TIPO_ATIVIDADE_ICONS[tarefa.tipo] || <FileText className="h-4 w-4" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {tarefa.card && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <Building2 className="h-3 w-3" />
                        <span className="font-medium text-emerald-700">{tarefa.card.coluna?.nome}</span>
                        <span>|</span>
                        <span>{tarefa.card.titulo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-gray-900 ${tarefa.status === 'concluida' ? 'line-through text-gray-400' : ''}`}>
                        {tarefa.descricao}
                      </h3>
                      <Badge className={`text-xs border ${STATUS_COLORS[tarefa.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[tarefa.status] || tarefa.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Criada por {getUsuarioNome(tarefa.usuario_id) || 'Desconhecido'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Responsável: {getUsuarioNome(tarefa.responsavel_id) || 'Não atribuído'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {tarefa.status === 'concluida' ? (
                      <Badge className="bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluída {format(new Date(tarefa.updated_at), "dd/MMM", { locale: ptBR })}
                      </Badge>
                    ) : tarefa.prazo ? (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(tarefa.prazo), "dd/MMM", { locale: ptBR })}
                        {tarefa.horario && ` às ${tarefa.horario}`}
                      </Badge>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-2">
                        {getUsuarioNome(tarefa.usuario_id) && (
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700">
                              {getInitials(getUsuarioNome(tarefa.usuario_id)!)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />Ver detalhes</DropdownMenuItem>
                          {tarefa.status !== 'concluida' ? (
                            <DropdownMenuItem onClick={() => handleFinalizarTarefa(tarefa.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Finalizar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReabrirTarefa(tarefa.id)}>
                              <Clock className="h-4 w-4 mr-2" />Reabrir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => setMesAtual(subMonths(mesAtual, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setMesAtual(addMonths(mesAtual, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
            <div className="w-32" />
          </div>
          <div className="grid grid-cols-7">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
              <div key={dia} className="p-2 text-center text-sm font-medium text-gray-500 border-b bg-gray-50">{dia}</div>
            ))}
            {diasDoMes.map((dia, index) => {
              const tarefasDoDia = getTarefasPorDia(dia);
              return (
                <div key={index} className={`min-h-[100px] p-1 border-b border-r ${!isSameMonth(dia, mesAtual) ? 'bg-gray-50' : ''} ${isToday(dia) ? 'bg-emerald-50' : ''}`}>
                  <div className={`text-sm font-medium mb-1 ${!isSameMonth(dia, mesAtual) ? 'text-gray-400' : ''} ${isToday(dia) ? 'text-emerald-700' : ''}`}>
                    {format(dia, 'd')}
                  </div>
                  <div className="space-y-1">
                    {tarefasDoDia.slice(0, 3).map(t => (
                      <div key={t.id} className={`text-xs p-1 rounded truncate ${t.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-emerald-50 text-emerald-700'}`} title={t.descricao}>
                        {t.horario && `${t.horario} `}{t.descricao}
                      </div>
                    ))}
                    {tarefasDoDia.length > 3 && <div className="text-xs text-gray-400">+{tarefasDoDia.length - 3}</div>}
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
            <p className="text-sm text-gray-500">Para criar tarefas vinculadas a negócios, acesse o card no funil.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarTarefa} className="bg-[#00E676] hover:bg-[#00c868] text-[#0b3322]">Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
