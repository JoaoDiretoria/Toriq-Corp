import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  Loader2,
  Building2,
  Clock,
  Eye,
  TrendingUp,
  Award,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  Target,
  BarChart3
} from 'lucide-react';
import { format, parseISO, isThisWeek, isThisMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Turma {
  id: string;
  numero_turma: number;
  cliente_nome: string;
  treinamento_nome: string;
  treinamento_norma: string;
  tipo_treinamento: string;
  carga_horaria_total: number;
  quantidade_participantes: number;
  status: string;
  data_inicio?: string;
  data_fim?: string;
}

interface ProximoTreinamento {
  id: string;
  treinamento_nome: string;
  cliente_nome: string;
  data: string;
  horario: string;
  participantes: number;
}

const db = supabase as any;

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

type InstrutorSection = 'inicio' | 'gestao-turmas' | 'agenda' | 'perfil' | 'suporte';

interface InstrutorInicioProps {
  onNavigate?: (section: InstrutorSection) => void;
}

export function InstrutorInicio({ onNavigate }: InstrutorInicioProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [proximosTreinamentos, setProximosTreinamentos] = useState<ProximoTreinamento[]>([]);
  const [totalColaboradoresTreinados, setTotalColaboradoresTreinados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      fetchDados();
    }
  }, [profile]);

  const fetchDados = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);

      // Buscar turmas do instrutor
      const { data: turmasData, error: turmasError } = await db
        .rpc('get_turmas_instrutor', { p_user_id: profile.id });

      if (turmasError) throw turmasError;

      const turmasComDatas: Turma[] = [];
      const proximos: ProximoTreinamento[] = [];
      let totalColaboradores = 0;
      const hoje = new Date();

      for (const turma of turmasData || []) {
        const { data: aulasData } = await db
          .from('turmas_treinamento_aulas')
          .select('data, hora_inicio, hora_fim')
          .eq('turma_id', turma.id)
          .order('data');

        const datas = aulasData?.map((a: any) => a.data) || [];
        const primeiraAula = aulasData?.[0];

        turmasComDatas.push({
          id: turma.id,
          numero_turma: turma.numero_turma,
          cliente_nome: turma.cliente_nome || 'Cliente não encontrado',
          treinamento_nome: turma.treinamento_nome || 'Treinamento não encontrado',
          treinamento_norma: turma.treinamento_norma || '',
          tipo_treinamento: turma.tipo_treinamento,
          carga_horaria_total: 0,
          quantidade_participantes: turma.quantidade_participantes,
          status: turma.status,
          data_inicio: datas[0],
          data_fim: datas[datas.length - 1]
        });

        // Contar colaboradores treinados (turmas concluídas)
        if (turma.status === 'concluido') {
          totalColaboradores += turma.quantidade_participantes || 0;
        }

        // Próximos treinamentos (aulas futuras)
        if (primeiraAula && new Date(primeiraAula.data) >= hoje && proximos.length < 5) {
          proximos.push({
            id: turma.id,
            treinamento_nome: `NR ${turma.treinamento_norma} - ${turma.treinamento_nome}`,
            cliente_nome: turma.cliente_nome,
            data: primeiraAula.data,
            horario: primeiraAula.hora_inicio ? `${primeiraAula.hora_inicio.substring(0,5)}` : '',
            participantes: turma.quantidade_participantes || 0
          });
        }
      }

      // Ordenar próximos treinamentos por data
      proximos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      // Gerar dados para o gráfico de evolução mensal
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const dadosMensais = meses.map((mes, index) => {
        const turmasMes = turmasComDatas.filter(t => {
          if (!t.data_inicio) return false;
          const data = new Date(t.data_inicio);
          return data.getMonth() === index && data.getFullYear() === hoje.getFullYear();
        });
        return {
          mes,
          turmas: turmasMes.length,
          colaboradores: turmasMes.reduce((acc, t) => acc + (t.quantidade_participantes || 0), 0)
        };
      });

      setTurmas(turmasComDatas);
      setProximosTreinamentos(proximos);
      setTotalColaboradoresTreinados(totalColaboradores);
      setDadosGrafico(dadosMensais);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const turmasAgendadas = turmas.filter(t => t.status === 'agendado').length;
  const turmasEmAndamento = turmas.filter(t => t.status === 'em_andamento').length;
  const turmasConcluidas = turmas.filter(t => t.status === 'concluido').length;

  const dadosPizza = [
    { name: 'Agendadas', value: turmasAgendadas, color: 'hsl(var(--primary))' },
    { name: 'Em Andamento', value: turmasEmAndamento, color: 'hsl(var(--warning))' },
    { name: 'Concluídas', value: turmasConcluidas, color: 'hsl(var(--success))' },
  ].filter(d => d.value > 0);

  const totalParticipantes = turmas.reduce((acc, t) => acc + (t.quantidade_participantes || 0), 0);
  const taxaConclusao = turmas.length > 0 ? Math.round((turmasConcluidas / turmas.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-primary-foreground">
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
              onClick={() => onNavigate?.('gestao-turmas')}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Minhas Turmas
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
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-3xl font-bold text-success">{turmasConcluidas}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Colaboradores Treinados</p>
                <p className="text-3xl font-bold text-secondary">{totalColaboradoresTreinados}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-full">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução de Treinamentos
            </CardTitle>
            <CardDescription>Colaboradores treinados por mês em {new Date().getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico}>
                  <defs>
                    <linearGradient id="colorColaboradores" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    formatter={(value: number) => [`${value} colaboradores`, 'Treinados']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="colaboradores" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorColaboradores)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Distribuição
            </CardTitle>
            <CardDescription>Status das turmas</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosPizza.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {dadosPizza.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <BarChart3 className="h-10 w-10 mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm">Nenhuma turma ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos Treinamentos e Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Treinamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-warning" />
                  Próximos Treinamentos
                </CardTitle>
                <CardDescription>Seus treinamentos agendados</CardDescription>
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
                {proximosTreinamentos.slice(0, 4).map((treino) => (
                  <div 
                    key={treino.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/instrutor/turma/${treino.id}`)}
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-warning/10 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-warning">
                        {format(parseISO(treino.data), 'dd', { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-warning/80 uppercase">
                        {format(parseISO(treino.data), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{treino.treinamento_nome}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{treino.cliente_nome}</span>
                        {treino.horario && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{treino.horario}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      <Users className="h-3 w-3 mr-1" />
                      {treino.participantes}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              Sua Performance
            </CardTitle>
            <CardDescription>Métricas de desempenho</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Taxa de Conclusão */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Conclusão</span>
                <span className="text-sm font-bold text-success">{taxaConclusao}%</span>
              </div>
              <Progress value={taxaConclusao} className="h-2" />
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Award className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold">{turmas.length}</p>
                <p className="text-xs text-muted-foreground">Total de Turmas</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalParticipantes}</p>
                <p className="text-xs text-muted-foreground">Total Participantes</p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Ações Rápidas</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('gestao-turmas')}>
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Turmas
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('agenda')}>
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Agenda
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('perfil')}>
                  <Eye className="h-4 w-4 mr-1" />
                  Perfil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
