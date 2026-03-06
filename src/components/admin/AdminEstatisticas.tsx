import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Database, 
  Users, 
  Building2, 
  GraduationCap, 
  TrendingUp,
  Activity,
  HardDrive,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  User,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EstatisticasGerais {
  totalEmpresas: number;
  empresasSST: number;
  empresasClientes: number;
  empresasParceiras: number;
  totalUsuarios: number;
  totalTurmas: number;
  turmasAtivas: number;
  turmasConcluidas: number;
  totalTreinamentos: number;
  totalColaboradores: number;
}

interface EmpresaSSTStats {
  id: string;
  nome: string;
  totalClientes: number;
  totalTurmas: number;
  turmasAtivas: number;
  turmasConcluidas: number;
  totalColaboradores: number;
}

interface TreinamentoStats {
  id: string;
  nome: string;
  norma: string;
  totalTurmas: number;
  totalParticipantes: number;
}

interface ConsultasPorPeriodo {
  periodo: string;
  consultas: number;
}

interface TabelaStats {
  tabela: string;
  estimativa_linhas: number;
  tamanho: string;
}

interface UsuarioStats {
  id: string;
  nome: string;
  email: string;
  role: string;
  empresa_nome: string | null;
  ultimo_acesso: string | null;
  created_at: string;
}

interface AcessoLog {
  id: string;
  user_id: string;
  user_nome: string;
  pagina: string;
  acao: string;
  created_at: string;
}

// Lista reduzida de tabelas principais para monitoramento (otimização de performance)
const TABELAS_PRINCIPAIS = [
  'empresas',
  'profiles',
  'turmas_treinamento',
  'turmas_treinamento_colaboradores',
  'catalogo_treinamentos',
  'clientes_sst',
  'colaboradores_cliente',
  'certificados',
];

export function AdminEstatisticas() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null);
  const [empresasSST, setEmpresasSST] = useState<EmpresaSSTStats[]>([]);
  const [treinamentos, setTreinamentos] = useState<TreinamentoStats[]>([]);
  const [tabelasStats, setTabelasStats] = useState<TabelaStats[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioStats[]>([]);
  const [acessosRecentes, setAcessosRecentes] = useState<AcessoLog[]>([]);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    await Promise.all([
      fetchEstatisticasGerais(),
      fetchEmpresasSSTStats(),
      fetchTreinamentosStats(),
      fetchTabelasStats(),
      fetchUsuariosStats(),
      fetchAcessosRecentes(),
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllStats();
    setRefreshing(false);
  };

  const fetchEstatisticasGerais = async () => {
    try {
      // Total de empresas por tipo
      const { data: empresas } = await supabase
        .from('empresas')
        .select('tipo');

      const totalEmpresas = empresas?.length || 0;
      const empresasSST = empresas?.filter(e => e.tipo === 'sst').length || 0;
      const empresasClientes = empresas?.filter(e => e.tipo === 'cliente_final').length || 0;
      const empresasParceiras = empresas?.filter(e => e.tipo === 'empresa_parceira').length || 0;

      // Total de usuários
      const { count: totalUsuarios } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total de turmas
      const { data: turmas } = await supabase
        .from('turmas_treinamento')
        .select('status');

      const totalTurmas = turmas?.length || 0;
      const turmasAtivas = turmas?.filter(t => t.status === 'em_andamento' || t.status === 'agendada').length || 0;
      const turmasConcluidas = turmas?.filter(t => t.status === 'concluida').length || 0;

      // Total de treinamentos
      const { count: totalTreinamentos } = await supabase
        .from('catalogo_treinamentos')
        .select('*', { count: 'exact', head: true });

      // Total de colaboradores em turmas
      const { count: totalColaboradores } = await supabase
        .from('turmas_treinamento_colaboradores')
        .select('*', { count: 'exact', head: true });

      setEstatisticas({
        totalEmpresas,
        empresasSST,
        empresasClientes,
        empresasParceiras,
        totalUsuarios: totalUsuarios || 0,
        totalTurmas,
        turmasAtivas,
        turmasConcluidas,
        totalTreinamentos: totalTreinamentos || 0,
        totalColaboradores: totalColaboradores || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
    }
  };

  const fetchEmpresasSSTStats = async () => {
    try {
      // Buscar empresas SST com dados agregados em uma única query
      const { data: empresasData } = await supabase
        .from('empresas')
        .select(`
          id, 
          nome,
          clientes_sst(id),
          turmas_treinamento(id, status)
        `)
        .eq('tipo', 'sst');

      if (!empresasData) return;

      const stats: EmpresaSSTStats[] = empresasData.map((empresa: any) => {
        const turmas = empresa.turmas_treinamento || [];
        const totalTurmas = turmas.length;
        const turmasAtivas = turmas.filter((t: any) => t.status === 'em_andamento' || t.status === 'agendada').length;
        const turmasConcluidas = turmas.filter((t: any) => t.status === 'concluida').length;

        return {
          id: empresa.id,
          nome: empresa.nome,
          totalClientes: empresa.clientes_sst?.length || 0,
          totalTurmas,
          turmasAtivas,
          turmasConcluidas,
          totalColaboradores: 0, // Será calculado separadamente se necessário
        };
      });

      // Ordenar por total de turmas
      stats.sort((a, b) => b.totalTurmas - a.totalTurmas);
      setEmpresasSST(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de empresas SST:', error);
    }
  };

  const fetchTreinamentosStats = async () => {
    try {
      // Buscar treinamentos com turmas em uma única query
      const { data: treinamentosData } = await supabase
        .from('catalogo_treinamentos')
        .select(`
          id,
          nome,
          norma_regulamentadora:nr_id (numero),
          turmas_treinamento(id)
        `);

      if (!treinamentosData) return;

      const stats: TreinamentoStats[] = treinamentosData.map((treinamento: any) => {
        const norma = treinamento.norma_regulamentadora?.numero || '-';
        const totalTurmas = treinamento.turmas_treinamento?.length || 0;

        return {
          id: treinamento.id,
          nome: treinamento.nome,
          norma: `NR ${norma}`,
          totalTurmas,
          totalParticipantes: 0, // Simplificado para performance
        };
      });

      // Ordenar por total de turmas e pegar top 20
      stats.sort((a, b) => b.totalTurmas - a.totalTurmas);
      setTreinamentos(stats.slice(0, 20));
    } catch (error) {
      console.error('Erro ao buscar estatísticas de treinamentos:', error);
    }
  };

  const fetchTabelasStats = async () => {
    try {
      // Buscar contagem das tabelas principais em paralelo (otimizado)
      const promises = TABELAS_PRINCIPAIS.map(async (tabela) => {
        const { count, error } = await (supabase as any)
          .from(tabela)
          .select('*', { count: 'exact', head: true });
        
        // Ignorar erros silenciosamente (tabela pode não existir)
        if (error) {
          return {
            tabela,
            estimativa_linhas: 0,
            tamanho: '-',
          };
        }
        
        return {
          tabela,
          estimativa_linhas: count || 0,
          tamanho: '-',
        };
      });

      const stats = await Promise.all(promises);
      stats.sort((a, b) => b.estimativa_linhas - a.estimativa_linhas);
      setTabelasStats(stats);
    } catch (error) {
      // Silenciar erro - não é crítico
      setTabelasStats([]);
    }
  };

  const fetchUsuariosStats = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          role,
          created_at,
          empresa:empresa_id (nome)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const usuariosFormatados: UsuarioStats[] = data.map((u: any) => ({
          id: u.id,
          nome: u.nome || 'Sem nome',
          email: u.email || '-',
          role: u.role || '-',
          empresa_nome: u.empresa?.nome || null,
          ultimo_acesso: null,
          created_at: u.created_at,
        }));
        setUsuarios(usuariosFormatados);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const fetchAcessosRecentes = async () => {
    try {
      const { data } = await (supabase as any)
        .from('access_logs')
        .select(`
          id,
          user_id,
          pagina,
          acao,
          created_at,
          profile:user_id (nome)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const acessosFormatados: AcessoLog[] = data.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          user_nome: a.profile?.nome || 'Usuário',
          pagina: a.pagina || '-',
          acao: a.acao || '-',
          created_at: a.created_at,
        }));
        setAcessosRecentes(acessosFormatados);
      }
    } catch (error) {
      console.error('Erro ao buscar acessos recentes:', error);
      // Tabela pode não existir
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_vertical':
        return <Badge className="bg-purple-500">Admin Toriq</Badge>;
      case 'empresa_sst':
        return <Badge className="bg-blue-500">SST</Badge>;
      case 'cliente_final':
        return <Badge className="bg-green-500">Cliente</Badge>;
      case 'empresa_parceira':
        return <Badge className="bg-orange-500">Parceira</Badge>;
      case 'instrutor':
        return <Badge className="bg-cyan-500">Instrutor</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Estatísticas do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de uso, ocupação e métricas do sistema
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-lg bg-muted p-1 min-w-max">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">
              <Activity className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="por-empresa" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">
              <Building2 className="h-4 w-4" />
              Por Empresa
            </TabsTrigger>
            <TabsTrigger value="por-usuario" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">
              <Users className="h-4 w-4" />
              Por Usuário
            </TabsTrigger>
            <TabsTrigger value="banco-dados" className="flex items-center gap-2 px-4 py-2.5 rounded-md whitespace-nowrap text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border">
              <Database className="h-4 w-4" />
              Banco de Dados
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="mt-6 space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas?.totalEmpresas || 0}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">{estatisticas?.empresasSST || 0} SST</Badge>
                  <Badge variant="outline">{estatisticas?.empresasClientes || 0} Clientes</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas?.totalUsuarios || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Usuários cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Turmas</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas?.totalTurmas || 0}</div>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-blue-500">{estatisticas?.turmasAtivas || 0} Ativas</Badge>
                  <Badge className="bg-green-500">{estatisticas?.turmasConcluidas || 0} Concluídas</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Colaboradores Treinados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas?.totalColaboradores || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Participantes em turmas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Treinamentos mais realizados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Treinamentos Mais Realizados
              </CardTitle>
              <CardDescription>
                Top 20 treinamentos com mais turmas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>NR</TableHead>
                    <TableHead className="text-right">Turmas</TableHead>
                    <TableHead className="text-right">Participantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum treinamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    treinamentos.map((treinamento, index) => (
                      <TableRow key={treinamento.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                            {treinamento.nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{treinamento.norma}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{treinamento.totalTurmas}</TableCell>
                        <TableCell className="text-right">{treinamento.totalParticipantes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Empresa */}
        <TabsContent value="por-empresa" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Empresas SST - Ranking
              </CardTitle>
              <CardDescription>
                Empresas SST ordenadas por número de turmas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa SST</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Turmas</TableHead>
                    <TableHead className="text-right">Ativas</TableHead>
                    <TableHead className="text-right">Concluídas</TableHead>
                    <TableHead className="text-right">Colaboradores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresasSST.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma empresa SST encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    empresasSST.map((empresa, index) => (
                      <TableRow key={empresa.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                            {empresa.nome}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{empresa.totalClientes}</TableCell>
                        <TableCell className="text-right font-medium">{empresa.totalTurmas}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-blue-500">{empresa.turmasAtivas}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-green-500">{empresa.turmasConcluidas}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{empresa.totalColaboradores}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Gráfico de ocupação por empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Turmas por Empresa</CardTitle>
              <CardDescription>
                Percentual de turmas por empresa SST
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {empresasSST.slice(0, 10).map((empresa) => {
                  const totalTurmas = empresasSST.reduce((acc, e) => acc + e.totalTurmas, 0);
                  const percentual = totalTurmas > 0 ? (empresa.totalTurmas / totalTurmas) * 100 : 0;
                  
                  return (
                    <div key={empresa.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[200px]">{empresa.nome}</span>
                        <span className="text-muted-foreground">{percentual.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentual} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Usuário */}
        <TabsContent value="por-usuario" className="mt-6 space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usuarios.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins Toriq</CardTitle>
                <User className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'admin_vertical').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários SST</CardTitle>
                <User className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'empresa_sst').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Instrutores</CardTitle>
                <User className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'instrutor').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Acessos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Acessos Recentes
              </CardTitle>
              <CardDescription>
                Últimos 50 acessos ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {acessosRecentes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum registro de acesso encontrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Página</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="text-right">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acessosRecentes.map((acesso) => (
                      <TableRow key={acesso.id}>
                        <TableCell className="font-medium">{acesso.user_nome}</TableCell>
                        <TableCell>{acesso.pagina}</TableCell>
                        <TableCell>{acesso.acao}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(acesso.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Lista de Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuários Cadastrados
              </CardTitle>
              <CardDescription>
                Últimos 100 usuários cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                        <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                        <TableCell>{usuario.empresa_nome || '-'}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(usuario.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banco de Dados */}
        <TabsContent value="banco-dados" className="mt-6 space-y-6">
          {/* Cards de métricas do banco */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tabelas Monitoradas</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tabelasStats.length}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tabelas principais do sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tabelasStats.reduce((acc, t) => acc + t.estimativa_linhas, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Linhas nas tabelas monitoradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {format(new Date(), 'HH:mm', { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de estatísticas por tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Estatísticas por Tabela
              </CardTitle>
              <CardDescription>
                Contagem de registros por tabela do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabelasStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma estatística disponível
                      </TableCell>
                    </TableRow>
                  ) : (
                    tabelasStats.map((tabela) => {
                      const total = tabelasStats.reduce((acc, t) => acc + t.estimativa_linhas, 0);
                      const percentual = total > 0 ? (tabela.estimativa_linhas / total) * 100 : 0;
                      
                      return (
                        <TableRow key={tabela.tabela}>
                          <TableCell className="font-mono text-sm">{tabela.tabela}</TableCell>
                          <TableCell className="text-right font-medium">
                            {tabela.estimativa_linhas.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={percentual} className="w-20 h-2" />
                              <span className="text-xs text-muted-foreground w-12">
                                {percentual.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Informações do Supabase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Informações do Supabase
              </CardTitle>
              <CardDescription>
                Métricas de uso do banco de dados Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Projeto</p>
                  <p className="text-xs text-muted-foreground mt-1">xraggzqaddfiymqgrtha</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Região</p>
                  <p className="text-xs text-muted-foreground mt-1">South America (São Paulo)</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Plano</p>
                  <p className="text-xs text-muted-foreground mt-1">Pro</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Status</p>
                  <Badge className="bg-green-500 mt-1">Ativo</Badge>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Nota:</strong> Para métricas detalhadas de uso (leitura/escrita, CDN, bandwidth), 
                  acesse o dashboard do Supabase diretamente em{' '}
                  <a 
                    href="https://supabase.com/dashboard/project/xraggzqaddfiymqgrtha" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    supabase.com/dashboard
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
