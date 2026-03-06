import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  GraduationCap, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  PlayCircle,
  UserCheck,
  CalendarDays,
  Building2,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  Cell
} from 'recharts';

type ParceiraSection = 'inicio' | 'instrutores' | 'agenda' | 'meu-perfil' | 'suporte';

interface ParceiraInicioProps {
  onNavigate?: (section: ParceiraSection) => void;
}

interface ProximoTreinamento {
  id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  cliente_nome: string;
  instrutor_nome: string;
  data: string;
  horario: string;
}

const db = supabase as any;

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

export function ParceiraInicio({ onNavigate }: ParceiraInicioProps) {
  const { profile, empresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [empresaParceiraId, setEmpresaParceiraId] = useState<string | null>(null);
  
  // Métricas
  const [totalInstrutores, setTotalInstrutores] = useState(0);
  const [instrutoresAtivos, setInstrutoresAtivos] = useState(0);
  const [turmasAgendadas, setTurmasAgendadas] = useState(0);
  const [turmasEmAndamento, setTurmasEmAndamento] = useState(0);
  const [turmasConcluidas, setTurmasConcluidas] = useState(0);
  const [proximosTreinamentos, setProximosTreinamentos] = useState<ProximoTreinamento[]>([]);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmpresaParceiraId = async () => {
      const empresaIdToUse = empresa?.id || profile?.empresa_id;
      if (!empresaIdToUse) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empresas_parceiras')
          .select('id, empresa_sst_id')
          .eq('parceira_empresa_id', empresaIdToUse)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setEmpresaParceiraId(data.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa parceira:', error);
        setLoading(false);
      }
    };

    fetchEmpresaParceiraId();
  }, [empresa?.id, profile?.empresa_id]);

  useEffect(() => {
    if (empresaParceiraId) {
      fetchDados();
    }
  }, [empresaParceiraId]);

  const fetchDados = async () => {
    if (!empresaParceiraId) return;

    try {
      setLoading(true);

      // Buscar instrutores
      const { data: instrutores, error: instrutoresError } = await supabase
        .from('instrutores')
        .select('id, nome, ativo')
        .eq('empresa_parceira_id', empresaParceiraId);

      if (instrutoresError) throw instrutoresError;

      const instrutoresData = instrutores || [];
      setTotalInstrutores(instrutoresData.length);
      setInstrutoresAtivos(instrutoresData.filter(i => i.ativo).length);

      if (instrutoresData.length === 0) {
        setLoading(false);
        return;
      }

      const instrutorIds = instrutoresData.map(i => i.id);
      const instrutorMap = Object.fromEntries(instrutoresData.map(i => [i.id, i.nome]));

      // Buscar turmas dos instrutores
      const { data: turmasData, error: turmasError } = await db
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          instrutor_id,
          status,
          cliente_id,
          treinamento_id
        `)
        .in('instrutor_id', instrutorIds);

      if (turmasError) throw turmasError;

      const turmas = turmasData || [];
      
      // Contar por status
      const agendadas = turmas.filter((t: any) => t.status === 'agendado').length;
      const emAndamento = turmas.filter((t: any) => t.status === 'em_andamento').length;
      const concluidas = turmas.filter((t: any) => t.status === 'concluido').length;

      setTurmasAgendadas(agendadas);
      setTurmasEmAndamento(emAndamento);
      setTurmasConcluidas(concluidas);

      // Dados para gráfico de pizza
      setDadosGrafico([
        { name: 'Agendadas', value: agendadas, color: '#3B82F6' },
        { name: 'Em Andamento', value: emAndamento, color: '#F59E0B' },
        { name: 'Concluídas', value: concluidas, color: '#10B981' }
      ]);

      // Buscar próximos treinamentos
      const turmasAtivas = turmas.filter((t: any) => ['agendado', 'em_andamento'].includes(t.status));
      
      if (turmasAtivas.length > 0) {
        const turmaIds = turmasAtivas.map((t: any) => t.id);
        
        // Buscar aulas futuras
        const hoje = format(new Date(), 'yyyy-MM-dd');
        const { data: aulasData } = await supabase
          .from('turmas_treinamento_aulas')
          .select('turma_id, data, hora_inicio')
          .in('turma_id', turmaIds)
          .gte('data', hoje)
          .order('data')
          .order('hora_inicio')
          .limit(10);

        // Buscar clientes e treinamentos
        const clienteIds = [...new Set(turmasAtivas.map((t: any) => t.cliente_id).filter(Boolean))] as string[];
        const treinamentoIds = [...new Set(turmasAtivas.map((t: any) => t.treinamento_id).filter(Boolean))] as string[];

        const [clientesRes, treinamentosRes] = await Promise.all([
          supabase.from('clientes_sst').select('id, nome').in('id', clienteIds),
          supabase.from('catalogo_treinamentos').select('id, nome, norma').in('id', treinamentoIds)
        ]);

        const clienteMap = Object.fromEntries((clientesRes.data || []).map(c => [c.id, c.nome]));
        const treinamentoMap = Object.fromEntries((treinamentosRes.data || []).map(t => [t.id, { nome: t.nome, norma: t.norma }]));

        // Montar próximos treinamentos
        const proximos: ProximoTreinamento[] = [];
        const turmasJaAdicionadas = new Set<string>();

        (aulasData || []).forEach((aula: any) => {
          if (turmasJaAdicionadas.has(aula.turma_id)) return;
          
          const turma = turmasAtivas.find((t: any) => t.id === aula.turma_id);
          if (!turma) return;

          const treinamento = treinamentoMap[turma.treinamento_id] || { nome: '', norma: '' };
          
          proximos.push({
            id: turma.id,
            treinamento_nome: treinamento.nome,
            treinamento_norma: treinamento.norma,
            cliente_nome: clienteMap[turma.cliente_id] || '',
            instrutor_nome: instrutorMap[turma.instrutor_id] || '',
            data: aula.data,
            horario: aula.hora_inicio || ''
          });

          turmasJaAdicionadas.add(aula.turma_id);
        });

        setProximosTreinamentos(proximos.slice(0, 5));
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!empresaParceiraId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Empresa não vinculada</h3>
          <p className="text-muted-foreground">
            Sua empresa não está vinculada como parceira de nenhuma empresa SST.
          </p>
        </div>
      </div>
    );
  }

  const totalTurmas = turmasAgendadas + turmasEmAndamento + turmasConcluidas;

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Olá, {profile?.nome?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => onNavigate?.('agenda')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Ver Agenda
            </Button>
            <Button 
              variant="secondary"
              className="bg-background hover:bg-background/90 text-primary"
              onClick={() => onNavigate?.('instrutores')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Meus Instrutores
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Instrutores</p>
                <p className="text-3xl font-bold text-primary">{totalInstrutores}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Instrutores Ativos</p>
                <p className="text-3xl font-bold text-success">{instrutoresAtivos}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Turmas Agendadas</p>
                <p className="text-3xl font-bold text-primary">{turmasAgendadas}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-3xl font-bold text-warning">{turmasEmAndamento}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-full">
                <PlayCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Gráficos e Próximos Treinamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Distribuição de Turmas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Distribuição de Turmas
            </CardTitle>
            <CardDescription>Status das turmas dos seus instrutores</CardDescription>
          </CardHeader>
          <CardContent>
            {totalTurmas === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma turma registrada</p>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dadosGrafico.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4">
              {dadosGrafico.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximos Treinamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-orange-600" />
                  Próximos Treinamentos
                </CardTitle>
                <CardDescription>Treinamentos agendados dos seus instrutores</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.('agenda')}>
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {proximosTreinamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Nenhum treinamento agendado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proximosTreinamentos.map((treino) => (
                  <div 
                    key={treino.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-orange-600">
                        {format(parseISO(treino.data), 'dd', { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-orange-500 uppercase">
                        {format(parseISO(treino.data), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        NR {treino.treinamento_norma} - {treino.treinamento_nome}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserCheck className="h-3 w-3" />
                        <span className="truncate">{treino.instrutor_nome}</span>
                        {treino.horario && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{treino.horario}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{treino.cliente_nome}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo e Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Resumo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Resumo Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalInstrutores}</p>
                <p className="text-xs text-muted-foreground">Instrutores</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{turmasAgendadas}</p>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
              <div className="text-center p-4 bg-warning/5 rounded-lg">
                <PlayCircle className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold">{turmasEmAndamento}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
              <div className="text-center p-4 bg-success/5 rounded-lg">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold">{turmasConcluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onNavigate?.('instrutores')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Gerenciar Instrutores
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onNavigate?.('agenda')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Ver Agenda Completa
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onNavigate?.('meu-perfil')}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Meu Perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
