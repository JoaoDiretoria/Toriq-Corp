import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, Users, Building, UserCheck, Calendar,
  TrendingUp, ArrowRight, Clock, CheckCircle, AlertTriangle,
  CalendarDays, FileCheck, ClipboardList, BookOpen, Grid3X3,
  ListChecks, FileText, Loader2, Target, Menu
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ToriqTrainingDashboardProps {
  onNavigate: (section: string) => void;
}

interface DashboardStats {
  totalClientes: number;
  totalParceiros: number;
  totalInstrutores: number;
  instrutoresAptos: number;
  instrutoresInaptos: number;
  turmasAgendadas: number;
  turmasEmAndamento: number;
  turmasConcluidas: number;
  solicitacoesPendentes: number;
}

// Links rápidos do módulo - reutilizável
const MENU_ITEMS = [
  { id: 'toriq-training-dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'agenda-treinamentos', label: 'Agenda de Treinamentos', icon: CalendarDays },
  { id: 'gestao-turmas', label: 'Gestão de Turmas', icon: FileCheck },
  { id: 'solicitacoes-treinamentos', label: 'Solicitações', icon: ClipboardList },
  { id: 'nr', label: 'NR', icon: FileText },
  { id: 'catalogo-treinamentos', label: 'Treinamentos', icon: BookOpen },
  { id: 'matriz-treinamentos', label: 'Matriz de Treinamentos', icon: Grid3X3 },
  { id: 'grupos-homogeneos', label: 'Grupos Homogêneos', icon: Users },
  { id: 'provas', label: 'Provas', icon: ListChecks },
  { id: 'instrutores', label: 'Instrutores', icon: UserCheck },
  { id: 'empresas-parceiras', label: 'Empresas Parceiras', icon: Building },
];

export function ToriqTrainingDashboard({ onNavigate }: ToriqTrainingDashboardProps) {
  const { profile, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const { podeVisualizar } = usePermissoes();
  const empresaId = empresaMode?.empresaId || empresa?.id;

  const [loading, setLoading] = useState(true);
  const [showAllPages, setShowAllPages] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    totalParceiros: 0,
    totalInstrutores: 0,
    instrutoresAptos: 0,
    instrutoresInaptos: 0,
    turmasAgendadas: 0,
    turmasEmAndamento: 0,
    turmasConcluidas: 0,
    solicitacoesPendentes: 0,
  });

  useEffect(() => {
    if (empresaId) {
      loadDashboardData();
    }
  }, [empresaId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Primeiro buscar dados básicos
      const [
        clientesRes,
        parceirosRes,
        instrutoresRes,
        turmasRes
      ] = await Promise.all([
        // Clientes SST
        supabase
          .from('clientes_sst')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_sst_id', empresaId),
        // Empresas Parceiras
        (supabase as any)
          .from('empresas_parceiras')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_sst_id', empresaId),
        // Instrutores ativos
        supabase
          .from('instrutores')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('ativo', true),
        // Turmas de Treinamento
        supabase
          .from('turmas_treinamento')
          .select('id, status')
          .eq('empresa_id', empresaId),
      ]);

      const instrutores = instrutoresRes.data || [];
      const turmas = turmasRes.data || [];
      const instrutorIds = instrutores.map((i: any) => i.id);

      // Buscar formações e vínculos formação-treinamento dos instrutores da empresa
      // A tabela correta para treinamentos é instrutor_formacao_treinamento (não instrutor_treinamentos)
      let formacoes: any[] = [];
      let vinculosTreinamentos: any[] = [];

      if (instrutorIds.length > 0) {
        const [formacoesRes, vinculosRes] = await Promise.all([
          (supabase as any)
            .from('instrutor_formacoes')
            .select('id, instrutor_id, anexo_url')
            .in('instrutor_id', instrutorIds),
          (supabase as any)
            .from('instrutor_formacao_treinamento')
            .select('id, instrutor_id, anexo_url')
            .in('instrutor_id', instrutorIds),
        ]);
        formacoes = formacoesRes.data || [];
        vinculosTreinamentos = vinculosRes.data || [];
      }

      // Calcular aptidão para cada instrutor ativo
      // Um instrutor está APTO se:
      // 1. Tem pelo menos uma formação cadastrada
      // 2. Todas as formações têm anexo (anexo_url não nulo e não vazio)
      // 3. Tem pelo menos um treinamento vinculado (via instrutor_formacao_treinamento)
      // 4. Todos os treinamentos têm anexo (anexo_url não nulo e não vazio)
      let instrutoresAptos = 0;
      let instrutoresInaptos = 0;

      instrutores.forEach((instrutor: any) => {
        const formacoesDoInstrutor = formacoes.filter((f: any) => f.instrutor_id === instrutor.id);
        const treinamentosDoInstrutor = vinculosTreinamentos.filter((t: any) => t.instrutor_id === instrutor.id);
        
        const temFormacao = formacoesDoInstrutor.length > 0;
        const formacoesSemAnexo = formacoesDoInstrutor.filter((f: any) => !f.anexo_url || f.anexo_url.trim() === '');
        const todasFormacoesComAnexo = temFormacao && formacoesSemAnexo.length === 0;
        
        const temTreinamento = treinamentosDoInstrutor.length > 0;
        const treinamentosSemAnexo = treinamentosDoInstrutor.filter((t: any) => !t.anexo_url || t.anexo_url.trim() === '');
        const todosTreinamentosComAnexo = temTreinamento && treinamentosSemAnexo.length === 0;
        
        const apto = temFormacao && todasFormacoesComAnexo && temTreinamento && todosTreinamentosComAnexo;
        
        if (apto) {
          instrutoresAptos++;
        } else {
          instrutoresInaptos++;
        }
      });

      // Calcular estatísticas de turmas (status: agendado, em_andamento, concluido)
      const turmasAgendadas = turmas.filter((t: any) => t.status === 'agendado').length;
      const turmasEmAndamento = turmas.filter((t: any) => t.status === 'em_andamento').length;
      const turmasConcluidas = turmas.filter((t: any) => t.status === 'concluido').length;

      setStats({
        totalClientes: clientesRes.count || 0,
        totalParceiros: parceirosRes.count || 0,
        totalInstrutores: instrutores.length,
        instrutoresAptos,
        instrutoresInaptos,
        turmasAgendadas,
        turmasEmAndamento,
        turmasConcluidas,
        solicitacoesPendentes: 0,
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
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

  // Links rápidos principais (mais usados) - filtrados por permissão
  const quickLinks = MENU_ITEMS.filter(item => 
    ['agenda-treinamentos', 'gestao-turmas', 'solicitacoes-treinamentos', 'instrutores', 'empresas-parceiras'].includes(item.id) &&
    podeVisualizar(item.id)
  );

  // Todos os itens do menu filtrados por permissão
  const menuItemsVisiveis = MENU_ITEMS.filter(item => 
    item.id !== 'toriq-training-dashboard' && podeVisualizar(item.id)
  );

  // Verificar permissões dos botões do header
  const podeAgenda = podeVisualizar('agenda-treinamentos');
  const podeTurmas = podeVisualizar('gestao-turmas');
  const podeClientes = podeVisualizar('cadastros');
  const podeParceiros = podeVisualizar('empresas-parceiras');
  const podeInstrutores = podeVisualizar('instrutores');
  const podeSolicitacoes = podeVisualizar('solicitacoes-treinamentos');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              Toriq Training
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestão de Treinamentos • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-3">
            {podeAgenda && (
              <Button 
                variant="secondary" 
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => onNavigate('agenda-treinamentos')}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Agenda
              </Button>
            )}
            {podeTurmas && (
              <Button 
                variant="secondary"
                className="bg-primary hover:bg-primary/90 text-white border-none"
                onClick={() => onNavigate('gestao-turmas')}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Turmas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Métricas - apenas os que o usuário pode ver */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {podeClientes && (
          <Card className="border-l-4 border-l-primary cursor-pointer hover:shadow-md" onClick={() => onNavigate('cadastros')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalClientes}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {podeParceiros && (
          <Card className="border-l-4 border-l-secondary cursor-pointer hover:shadow-md" onClick={() => onNavigate('empresas-parceiras')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Parceiros</p>
                  <p className="text-3xl font-bold text-secondary-foreground">{stats.totalParceiros}</p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-full">
                  <Building className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {podeInstrutores && (
          <Card className="border-l-4 border-l-success cursor-pointer hover:shadow-md" onClick={() => onNavigate('instrutores')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Instrutores</p>
                  <p className="text-3xl font-bold text-success">{stats.totalInstrutores}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                      {stats.instrutoresAptos} aptos
                    </Badge>
                    {stats.instrutoresInaptos > 0 && (
                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                        {stats.instrutoresInaptos} inaptos
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-success/10 rounded-full">
                  <UserCheck className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {podeTurmas && (
          <Card className="border-l-4 border-l-warning cursor-pointer hover:shadow-md" onClick={() => onNavigate('gestao-turmas')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Turmas Agendadas</p>
                  <p className="text-3xl font-bold text-warning">{stats.turmasAgendadas}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-full">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alertas e Status - apenas os que o usuário pode ver */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Solicitações Pendentes */}
        {podeSolicitacoes && (
        <Card className={`cursor-pointer hover:shadow-md ${stats.solicitacoesPendentes > 0 ? 'border-warning/20 bg-warning/5' : ''}`} onClick={() => onNavigate('solicitacoes-treinamentos')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Solicitações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.solicitacoesPendentes}</div>
              {stats.solicitacoesPendentes > 0 ? (
                <Badge className="bg-warning text-warning-foreground">Requer atenção</Badge>
              ) : (
                <Badge variant="outline" className="bg-success/10 text-success">Em dia</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Turmas em Andamento */}
        {podeTurmas && (
        <Card className="cursor-pointer hover:shadow-md" onClick={() => onNavigate('gestao-turmas')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Turmas em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.turmasEmAndamento}</div>
              <Badge variant="outline" className="bg-primary/10 text-primary">Ativas</Badge>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Turmas Concluídas */}
        {podeTurmas && (
        <Card className="cursor-pointer hover:shadow-md" onClick={() => onNavigate('gestao-turmas')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Turmas Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.turmasConcluidas}</div>
              <Badge variant="outline" className="bg-success/10 text-success">Finalizadas</Badge>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Links Rápidos - filtrados por permissão */}
      {(showAllPages ? menuItemsVisiveis : quickLinks).length > 0 && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Acesso Rápido
              </CardTitle>
              <CardDescription>Navegue para as principais áreas do Toriq Training</CardDescription>
            </div>
            {menuItemsVisiveis.length > quickLinks.length && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllPages(!showAllPages)}
              >
                <Menu className="h-4 w-4 mr-2" />
                {showAllPages ? 'Menos' : 'Ver Todas'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {(showAllPages ? menuItemsVisiveis : quickLinks).map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-primary hover:bg-primary/90 rounded-xl p-4 text-primary-foreground cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                  onClick={() => onNavigate(item.id)}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Resumo do Módulo - apenas os que o usuário pode ver */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instrutores */}
        {podeInstrutores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              Instrutores
            </CardTitle>
            <CardDescription>Visão geral dos instrutores cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border text-center">
                <div className="text-xl font-bold">{stats.totalInstrutores}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 rounded-lg border text-center bg-success/10">
                <div className="text-xl font-bold text-success">{stats.instrutoresAptos}</div>
                <div className="text-xs text-success">Aptos</div>
              </div>
              <div className="p-3 rounded-lg border text-center bg-destructive/10">
                <div className="text-xl font-bold text-destructive">{stats.instrutoresInaptos}</div>
                <div className="text-xs text-destructive">Inaptos</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('instrutores')}
            >
              Ver Instrutores
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Turmas */}
        {podeTurmas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Turmas de Treinamento
            </CardTitle>
            <CardDescription>Status das turmas cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border text-center bg-primary/10">
                <div className="text-xl font-bold text-primary">{stats.turmasAgendadas}</div>
                <div className="text-xs text-primary">Agendadas</div>
              </div>
              <div className="p-3 rounded-lg border text-center bg-warning/10">
                <div className="text-xl font-bold text-warning">{stats.turmasEmAndamento}</div>
                <div className="text-xs text-warning">Em Andamento</div>
              </div>
              <div className="p-3 rounded-lg border text-center bg-success/10">
                <div className="text-xl font-bold text-success">{stats.turmasConcluidas}</div>
                <div className="text-xs text-success">Concluídas</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('gestao-turmas')}
            >
              Ver Turmas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
