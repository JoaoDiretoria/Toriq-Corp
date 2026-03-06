import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { 
  Loader2, 
  CalendarX, 
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  User,
  Trash2,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Instrutor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface Indisponibilidade {
  id: string;
  instrutor_id: string;
  instrutor_nome?: string;
  data: string;
  motivo: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  origem: 'admin' | 'instrutor';
  solicitado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
}

interface ControleIndisponibilidadeProps {
  empresaParceiraId?: string | null;
  empresaSstId?: string | null;
  tipo: 'sst' | 'parceira';
}

const db = supabase as any;

export function ControleIndisponibilidade({ 
  empresaParceiraId, 
  empresaSstId,
  tipo 
}: ControleIndisponibilidadeProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitacoes');
  
  // Instrutores
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [instrutorSelecionado, setInstrutorSelecionado] = useState<string>('');
  
  // Indisponibilidades
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Indisponibilidade[]>([]);
  const [indisponibilidadesAprovadas, setIndisponibilidadesAprovadas] = useState<Indisponibilidade[]>([]);
  
  // Filtros
  const [filtroInstrutor, setFiltroInstrutor] = useState<string>('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Dialog criar indisponibilidade
  const [dialogCriarOpen, setDialogCriarOpen] = useState(false);
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [motivoCriar, setMotivoCriar] = useState('');
  const [instrutorCriar, setInstrutorCriar] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  
  // Dialog aprovar/rejeitar
  const [dialogAprovarOpen, setDialogAprovarOpen] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Indisponibilidade | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processando, setProcessando] = useState(false);
  
  // Dialog excluir
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [indisponibilidadeExcluir, setIndisponibilidadeExcluir] = useState<Indisponibilidade | null>(null);
  
  // Visualização
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'calendario'>('lista');
  const [mesAtual, setMesAtual] = useState(new Date());

  useEffect(() => {
    fetchInstrutores();
  }, [empresaParceiraId, empresaSstId]);

  useEffect(() => {
    if (instrutores.length > 0) {
      fetchIndisponibilidades();
    }
  }, [instrutores, filtroInstrutor, filtroDataInicio, filtroDataFim]);

  const fetchInstrutores = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('instrutores')
        .select('id, nome, email, ativo, empresa_parceira_id, empresa_id')
        .eq('ativo', true)
        .order('nome');

      if (tipo === 'parceira' && empresaParceiraId) {
        query = query.eq('empresa_parceira_id', empresaParceiraId);
      } else if (tipo === 'sst' && empresaSstId) {
        query = query.eq('empresa_id', empresaSstId).is('empresa_parceira_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInstrutores(data || []);
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
      toast.error('Erro ao carregar instrutores');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndisponibilidades = async () => {
    if (instrutores.length === 0) return;

    try {
      const instrutorIds = instrutores.map(i => i.id);
      
      // Buscar solicitações pendentes
      let queryPendentes = db
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .in('instrutor_id', instrutorIds)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (filtroInstrutor !== 'todos') {
        queryPendentes = queryPendentes.eq('instrutor_id', filtroInstrutor);
      }

      const { data: pendentes, error: errorPendentes } = await queryPendentes;
      if (errorPendentes) throw errorPendentes;

      // Buscar indisponibilidades aprovadas
      let queryAprovadas = db
        .from('instrutor_datas_indisponiveis')
        .select('*')
        .in('instrutor_id', instrutorIds)
        .eq('status', 'aprovado')
        .order('data', { ascending: true });

      if (filtroInstrutor !== 'todos') {
        queryAprovadas = queryAprovadas.eq('instrutor_id', filtroInstrutor);
      }
      if (filtroDataInicio) {
        queryAprovadas = queryAprovadas.gte('data', filtroDataInicio);
      }
      if (filtroDataFim) {
        queryAprovadas = queryAprovadas.lte('data', filtroDataFim);
      }

      const { data: aprovadas, error: errorAprovadas } = await queryAprovadas;
      if (errorAprovadas) throw errorAprovadas;

      // Mapear nomes dos instrutores
      const instrutorMap = Object.fromEntries(instrutores.map(i => [i.id, i.nome]));

      setSolicitacoesPendentes((pendentes || []).map((s: any) => ({
        ...s,
        instrutor_nome: instrutorMap[s.instrutor_id] || 'Instrutor'
      })));

      setIndisponibilidadesAprovadas((aprovadas || []).map((s: any) => ({
        ...s,
        instrutor_nome: instrutorMap[s.instrutor_id] || 'Instrutor'
      })));

    } catch (error) {
      console.error('Erro ao buscar indisponibilidades:', error);
      toast.error('Erro ao carregar indisponibilidades');
    }
  };

  const handleCriarIndisponibilidade = async () => {
    if (!instrutorCriar || datasSelecionadas.length === 0) {
      toast.error('Selecione um instrutor e pelo menos uma data');
      return;
    }

    setSalvando(true);
    try {
      const insercoes = datasSelecionadas.map(data => ({
        instrutor_id: instrutorCriar,
        data: format(data, 'yyyy-MM-dd'),
        motivo: motivoCriar.trim() || null,
        status: 'aprovado',
        origem: 'admin',
        solicitado_por: profile?.id,
        aprovado_por: profile?.id,
        aprovado_em: new Date().toISOString()
      }));

      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .insert(insercoes);

      if (error) {
        if (error.code === '23505') {
          toast.error('Uma ou mais datas já estão cadastradas');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`${datasSelecionadas.length} indisponibilidade(s) criada(s) com sucesso!`);
      setDialogCriarOpen(false);
      setDatasSelecionadas([]);
      setMotivoCriar('');
      setInstrutorCriar('');
      fetchIndisponibilidades();
    } catch (error) {
      console.error('Erro ao criar indisponibilidade:', error);
      toast.error('Erro ao criar indisponibilidade');
    } finally {
      setSalvando(false);
    }
  };

  const handleAprovar = async () => {
    if (!solicitacaoSelecionada) return;

    setProcessando(true);
    try {
      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .update({
          status: 'aprovado',
          aprovado_por: profile?.id,
          aprovado_em: new Date().toISOString()
        })
        .eq('id', solicitacaoSelecionada.id);

      if (error) throw error;

      toast.success('Solicitação aprovada com sucesso!');
      setDialogAprovarOpen(false);
      setSolicitacaoSelecionada(null);
      fetchIndisponibilidades();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setProcessando(false);
    }
  };

  const handleRejeitar = async () => {
    if (!solicitacaoSelecionada) return;

    setProcessando(true);
    try {
      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .update({
          status: 'rejeitado',
          aprovado_por: profile?.id,
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao.trim() || null
        })
        .eq('id', solicitacaoSelecionada.id);

      if (error) throw error;

      toast.success('Solicitação rejeitada');
      setDialogAprovarOpen(false);
      setSolicitacaoSelecionada(null);
      setMotivoRejeicao('');
      fetchIndisponibilidades();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setProcessando(false);
    }
  };

  const handleExcluir = async () => {
    if (!indisponibilidadeExcluir) return;

    setProcessando(true);
    try {
      const { error } = await db
        .from('instrutor_datas_indisponiveis')
        .delete()
        .eq('id', indisponibilidadeExcluir.id);

      if (error) throw error;

      toast.success('Indisponibilidade excluída');
      setDialogExcluirOpen(false);
      setIndisponibilidadeExcluir(null);
      fetchIndisponibilidades();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir indisponibilidade');
    } finally {
      setProcessando(false);
    }
  };

  const formatarData = (dataStr: string) => {
    try {
      return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-warning" />
            Controle de Indisponibilidade
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as indisponibilidades e solicitações dos instrutores
          </p>
        </div>
        <Button onClick={() => setDialogCriarOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Indisponibilidade
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning">Solicitações Pendentes</p>
                <p className="text-2xl font-bold text-warning">{solicitacoesPendentes.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success">Indisponibilidades Ativas</p>
                <p className="text-2xl font-bold text-success">{indisponibilidadesAprovadas.length}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-success/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">Instrutores Ativos</p>
                <p className="text-2xl font-bold text-primary">{instrutores.length}</p>
              </div>
              <User className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Solicitações Pendentes
            {solicitacoesPendentes.length > 0 && (
              <Badge variant="destructive" className="ml-1">{solicitacoesPendentes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovadas" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Indisponibilidades
          </TabsTrigger>
        </TabsList>

        {/* Tab Solicitações Pendentes */}
        <TabsContent value="solicitacoes" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Solicitações Aguardando Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              {solicitacoesPendentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {solicitacoesPendentes.map((solicitacao) => (
                    <div 
                      key={solicitacao.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{solicitacao.instrutor_nome}</span>
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            Pendente
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">{formatarData(solicitacao.data)}</span>
                          {solicitacao.motivo && (
                            <span className="ml-2">• {solicitacao.motivo}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Solicitado em {format(parseISO(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success hover:text-success/80 hover:bg-success/5"
                          onClick={() => {
                            setSolicitacaoSelecionada(solicitacao);
                            setDialogAprovarOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                          onClick={() => {
                            setSolicitacaoSelecionada(solicitacao);
                            setMotivoRejeicao('');
                            setDialogAprovarOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Indisponibilidades Aprovadas */}
        <TabsContent value="aprovadas" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-lg">Indisponibilidades Cadastradas</CardTitle>
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      size="sm"
                      variant={modoVisualizacao === 'lista' ? 'default' : 'ghost'}
                      className="rounded-none"
                      onClick={() => setModoVisualizacao('lista')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={modoVisualizacao === 'calendario' ? 'default' : 'ghost'}
                      className="rounded-none"
                      onClick={() => setModoVisualizacao('calendario')}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filtroInstrutor} onValueChange={setFiltroInstrutor}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar instrutor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os instrutores</SelectItem>
                      {instrutores.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modoVisualizacao === 'lista' && (
                    <>
                      <Input
                        type="date"
                        value={filtroDataInicio}
                        onChange={(e) => setFiltroDataInicio(e.target.value)}
                        className="w-[150px]"
                        placeholder="Data início"
                      />
                      <Input
                        type="date"
                        value={filtroDataFim}
                        onChange={(e) => setFiltroDataFim(e.target.value)}
                        className="w-[150px]"
                        placeholder="Data fim"
                      />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {modoVisualizacao === 'lista' ? (
                // Visualização em Lista
                indisponibilidadesAprovadas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CalendarX className="h-10 w-10 mb-2 opacity-50" />
                    <p>Nenhuma indisponibilidade cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {indisponibilidadesAprovadas.map((ind) => (
                      <div 
                        key={ind.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{formatarData(ind.data)}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm">{ind.instrutor_nome}</span>
                            <Badge variant="outline" className={
                              ind.origem === 'admin' 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-secondary/10 text-secondary-foreground'
                            }>
                              {ind.origem === 'admin' ? 'Admin' : 'Solicitação'}
                            </Badge>
                          </div>
                          {ind.motivo && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {ind.motivo}
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                          onClick={() => {
                            setIndisponibilidadeExcluir(ind);
                            setDialogExcluirOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Visualização em Calendário
                <div className="space-y-4">
                  {/* Navegação do mês */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMesAtual(subMonths(mesAtual, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold capitalize">
                      {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMesAtual(addMonths(mesAtual, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Calendário */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Cabeçalho dias da semana */}
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                      <div key={dia} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {dia}
                      </div>
                    ))}
                    
                    {/* Dias do mês */}
                    {(() => {
                      const inicio = startOfMonth(mesAtual);
                      const fim = endOfMonth(mesAtual);
                      const dias = eachDayOfInterval({ start: inicio, end: fim });
                      
                      // Adicionar dias vazios no início
                      const diasVaziosInicio = inicio.getDay();
                      const celulas = [];
                      
                      for (let i = 0; i < diasVaziosInicio; i++) {
                        celulas.push(<div key={`empty-${i}`} className="h-24 bg-muted/20 rounded" />);
                      }
                      
                      dias.forEach((dia) => {
                        const indisponibilidadesDoDia = [...indisponibilidadesAprovadas, ...solicitacoesPendentes].filter(
                          (ind) => isSameDay(parseISO(ind.data), dia)
                        );
                        
                        celulas.push(
                          <div 
                            key={dia.toISOString()}
                            className={`h-24 border rounded p-1 overflow-hidden ${
                              isToday(dia) ? 'border-primary border-2' : ''
                            } ${!isSameMonth(dia, mesAtual) ? 'bg-muted/30' : 'bg-white'}`}
                          >
                            <div className={`text-xs font-medium mb-1 ${
                              isToday(dia) ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {format(dia, 'd')}
                            </div>
                            <div className="space-y-0.5 overflow-y-auto max-h-16">
                              {indisponibilidadesDoDia.map((ind) => (
                                <div 
                                  key={ind.id}
                                  className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${
                                    ind.status === 'pendente' 
                                      ? 'bg-warning/10 text-warning border border-warning/30' 
                                      : 'bg-destructive/10 text-destructive border border-destructive/30'
                                  }`}
                                  title={`${ind.instrutor_nome}${ind.motivo ? ` - ${ind.motivo}` : ''}`}
                                  onClick={() => {
                                    if (ind.status === 'pendente') {
                                      setSolicitacaoSelecionada(ind);
                                      setDialogAprovarOpen(true);
                                    } else {
                                      setIndisponibilidadeExcluir(ind);
                                      setDialogExcluirOpen(true);
                                    }
                                  }}
                                >
                                  {ind.instrutor_nome?.split(' ')[0]}
                                  {ind.status === 'pendente' && ' ⏳'}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                      
                      return celulas;
                    })()}
                  </div>
                  
                  {/* Legenda */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-destructive/10 border border-destructive/30 rounded" />
                      <span>Indisponível</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-warning/10 border border-warning/30 rounded" />
                      <span>Pendente</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Indisponibilidade */}
      <Dialog open={dialogCriarOpen} onOpenChange={setDialogCriarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX className="h-5 w-5" />
              Criar Indisponibilidade
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Instrutor</Label>
              <Select value={instrutorCriar} onValueChange={setInstrutorCriar}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o instrutor" />
                </SelectTrigger>
                <SelectContent>
                  {instrutores.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Selecione as datas</Label>
              <div className="border rounded-md p-2 flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={datasSelecionadas}
                  onSelect={(dates) => setDatasSelecionadas(dates || [])}
                  locale={ptBR}
                  className="rounded-md"
                />
              </div>
              {datasSelecionadas.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {datasSelecionadas.length} data(s) selecionada(s)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Informe o motivo da indisponibilidade"
                value={motivoCriar}
                onChange={(e) => setMotivoCriar(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCriarOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCriarIndisponibilidade}
              disabled={salvando || !instrutorCriar || datasSelecionadas.length === 0}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Criar Indisponibilidade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aprovar/Rejeitar */}
      <Dialog open={dialogAprovarOpen} onOpenChange={setDialogAprovarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Solicitação</DialogTitle>
          </DialogHeader>
          
          {solicitacaoSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">{solicitacaoSelecionada.instrutor_nome}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Data: <span className="font-medium">{formatarData(solicitacaoSelecionada.data)}</span>
                </div>
                {solicitacaoSelecionada.motivo && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Motivo: {solicitacaoSelecionada.motivo}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Motivo da rejeição (opcional)</Label>
                <Textarea
                  placeholder="Informe o motivo caso rejeite a solicitação"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogAprovarOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejeitar}
              disabled={processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rejeitar'}
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              onClick={handleAprovar}
              disabled={processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir */}
      <AlertDialog open={dialogExcluirOpen} onOpenChange={setDialogExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Indisponibilidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta indisponibilidade?
              {indisponibilidadeExcluir && (
                <div className="mt-2 p-3 bg-muted rounded">
                  <div className="font-medium">{indisponibilidadeExcluir.instrutor_nome}</div>
                  <div className="text-sm">{formatarData(indisponibilidadeExcluir.data)}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExcluir}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
