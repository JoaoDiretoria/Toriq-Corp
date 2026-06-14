import { useEffect, useState } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Target, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  LayoutGrid,
  FileText,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminSentryPanel } from '@/components/admin/AdminSentryPanel';

interface KPIData {
  totalEmpresas: number;
  totalUsuarios: number;
  leadsNovos: number;
  leadsEmProgresso: number;
  conversaoMes: number;
  atividadesHoje: number;
}

interface AtividadeRecente {
  id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  usuario?: { nome: string };
}

interface AdminDashboardHomeProps {
  onNavigate: (section: string) => void;
}

export function AdminDashboardHome({ onNavigate }: AdminDashboardHomeProps) {
  const { profile } = useAuth();
  const [kpis, setKpis] = useState<KPIData>({
    totalEmpresas: 0,
    totalUsuarios: 0,
    leadsNovos: 0,
    leadsEmProgresso: 0,
    conversaoMes: 0,
    atividadesHoje: 0,
  });
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Backend novo: empresas e usuários (admin_vertical vê todos), cards e
      // colunas do kanban de prospecção para calcular os leads.
      const [empresas, usuarios, cards, colunas] = await Promise.all([
        api.get<any[]>('/empresas').catch(() => [] as any[]),
        api.get<any[]>('/admin/users').catch(() => [] as any[]),
        api.get<any[]>('/kanban/prospeccao').catch(() => [] as any[]),
        api.get<any[]>('/kanban/prospeccao/colunas').catch(() => [] as any[]),
      ]);

      const ordemPorColuna = new Map<string, number>(
        (colunas || []).map((c: any) => [c.id, c.ordem])
      );
      const leadsNovos = (cards || []).filter(
        (c: any) => ordemPorColuna.get(c.coluna_id) === 0
      ).length;
      const leadsEmProgresso = (cards || []).filter((c: any) => {
        const ord = ordemPorColuna.get(c.coluna_id);
        return ord !== undefined && ord > 0 && ord < 4;
      }).length;

      setKpis({
        totalEmpresas: empresas?.length || 0,
        totalUsuarios: usuarios?.length || 0,
        leadsNovos,
        leadsEmProgresso,
        conversaoMes: 12, // Placeholder - calcular baseado em dados reais
        atividadesHoje: 0,
      });

      // Atividades recentes do kanban legado ainda não têm endpoint dedicado —
      // mantém vazio (mesma exibição "Nenhuma atividade recente").
      setAtividades([]);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${diffDays}d`;
  };

  const getTipoAtividadeLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      nota: 'Nota',
      email: 'E-mail',
      ligacao: 'Ligação',
      whatsapp: 'WhatsApp',
      reuniao: 'Reunião',
      visita: 'Visita',
      tarefa: 'Tarefa',
      mudanca_etapa: 'Moveu lead',
    };
    return tipos[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header com saudação */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, <span className="text-gradient">{profile?.nome?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo do seu dia • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button 
          onClick={() => onNavigate('comercial-prospeccao')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Empresas */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => onNavigate('empresas')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-info/10 text-info">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +3
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{kpis.totalEmpresas}</p>
              <p className="text-sm text-muted-foreground">Empresas Ativas</p>
            </div>
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-info rounded-full" style={{ width: '75%' }} />
            </div>
          </CardContent>
        </Card>

        {/* Leads Novos */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => onNavigate('comercial-prospeccao')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{kpis.leadsNovos}
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{kpis.leadsNovos + kpis.leadsEmProgresso}</p>
              <p className="text-sm text-muted-foreground">Leads no Pipeline</p>
            </div>
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
            </div>
          </CardContent>
        </Card>

        {/* Atividades Hoje */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                <Activity className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                Hoje
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{kpis.atividadesHoje}</p>
              <p className="text-sm text-muted-foreground">Atividades Registradas</p>
            </div>
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(kpis.atividadesHoje * 10, 100)}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => onNavigate('usuarios')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                Total
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{kpis.totalUsuarios}</p>
              <p className="text-sm text-muted-foreground">Usuários Ativos</p>
            </div>
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: '85%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Atalhos e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atalhos Rápidos */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Atalhos Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => onNavigate('comercial-prospeccao')}
            >
              <Target className="h-5 w-5 text-primary" />
              <span className="text-xs">Ver Kanban</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-info hover:bg-info/5 transition-all"
              onClick={() => onNavigate('empresas')}
            >
              <Building2 className="h-5 w-5 text-info" />
              <span className="text-xs">Empresas</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-success hover:bg-success/5 transition-all"
              onClick={() => onNavigate('usuarios')}
            >
              <Users className="h-5 w-5 text-success" />
              <span className="text-xs">Usuários</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-secondary hover:bg-secondary/5 transition-all"
              onClick={() => onNavigate('financeiro')}
            >
              <FileText className="h-5 w-5 text-secondary" />
              <span className="text-xs">Financeiro</span>
            </Button>
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atividades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {atividades.map((atividade) => (
                  <div 
                    key={atividade.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <Activity className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {atividade.usuario?.nome || 'Sistema'}
                        </span>
                        <Badge variant="outline" className="text-2xs">
                          {getTipoAtividadeLabel(atividade.tipo)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {atividade.descricao || 'Sem descrição'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(atividade.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visual */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              Pipeline de Vendas
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate('comercial-prospeccao')}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Ver completo
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-info transition-all" 
              style={{ width: `${kpis.leadsNovos * 5}%` }}
              title={`Novos: ${kpis.leadsNovos}`}
            />
            <div 
              className="bg-primary transition-all" 
              style={{ width: `${kpis.leadsEmProgresso * 5}%` }}
              title={`Em progresso: ${kpis.leadsEmProgresso}`}
            />
            <div 
              className="bg-warning transition-all" 
              style={{ width: '15%' }}
              title="Proposta"
            />
            <div 
              className="bg-success transition-all" 
              style={{ width: '10%' }}
              title="Fechados"
            />
          </div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-info" />
              <span>Novos ({kpis.leadsNovos})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Em progresso ({kpis.leadsEmProgresso})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>Proposta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Fechados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Erros Sentry */}
              <AdminSentryPanel />
    </div>
  );
}
