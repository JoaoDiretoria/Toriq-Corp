import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboardHome } from '@/components/admin/AdminDashboardHome';
import { AdminEmpresas } from '@/components/admin/AdminEmpresas';
import { AdminUsuarios } from '@/components/admin/AdminUsuarios';
import { AdminCloser } from '@/components/admin/AdminCloser';
import { AdminFinanceiro } from '@/components/admin/AdminFinanceiro';
import { AdminModulos } from '@/components/admin/AdminModulos';
import { AdminProspeccao } from '@/components/admin/AdminProspeccao';
import { AdminPosVenda } from '@/components/admin/AdminPosVenda';
import { AdminCrossSelling } from '@/components/admin/AdminCrossSelling';
import { AdminColaboradores } from '@/components/admin/AdminColaboradores';
import { AdminServicos } from '@/components/admin/AdminServicos';
import { AdminComercialDashboard } from '@/components/admin/AdminComercialDashboard';
import { AdminFinanceiroCadastros } from '@/components/admin/AdminFinanceiroCadastros';
import { AdminContasReceber } from '@/components/admin/AdminContasReceber';
import { AdminContasPagar } from '@/components/admin/AdminContasPagar';
import { AdminDRE } from '@/components/admin/AdminDRE';
import { AdminFluxoCaixa } from '@/components/admin/AdminFluxoCaixa';
import { AdminFinanceiroDashboard } from '@/components/admin/AdminFinanceiroDashboard';
import { AdminTarefas } from '@/components/admin/AdminTarefas';
import { AdminEstatisticas } from '@/components/admin/AdminEstatisticas';
import SuporteTickets from '@/pages/shared/SuporteTickets';
import { AdminBlogList } from '@/components/admin/blog';
import { AdminPesquisasList } from '@/components/admin/pesquisas';
import { AdminNewsletterList } from '@/components/admin/newsletter';
import { AdminVagas } from '@/components/admin/vagas';
import { useState } from 'react';

type AdminSection = 'dashboard' | 'empresas' | 'usuarios' | 'colaboradores' | 'servicos' | 'modulos' | 'tarefas' | 'comercial-dashboard' | 'comercial' | 'comercial-prospeccao' | 'comercial-pos-venda' | 'comercial-cross-selling' | 'financeiro' | 'financeiro-dashboard' | 'financeiro-cadastros' | 'financeiro-contas-receber' | 'financeiro-contas-pagar' | 'financeiro-fluxo-caixa' | 'financeiro-dre' | 'estatisticas' | 'suporte' | 'conteudo-blogs' | 'conteudo-pesquisas' | 'conteudo-newsletter' | 'conteudo-vagas';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { logView } = useAccessLog();
  const { setCurrentScreen } = useCurrentScreen();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  // Atualizar tela atual quando a seção mudar
  useEffect(() => {
    setCurrentScreen(activeSection, 'admin');
  }, [activeSection, setCurrentScreen]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && profile?.role === 'admin_vertical') {
      logView('Dashboard', 'Admin Dashboard', 'Acessou o painel administrativo');
    }
  }, [user, loading, navigate, profile]);

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin_vertical') {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin_vertical') {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboardHome onNavigate={(section) => setActiveSection(section as AdminSection)} />;
      case 'empresas':
        return <AdminEmpresas />;
      case 'usuarios':
        return <AdminUsuarios />;
      case 'colaboradores':
        return <AdminColaboradores />;
      case 'servicos':
        return <AdminServicos />;
      case 'modulos':
        return <AdminModulos />;
      case 'tarefas':
        return <AdminTarefas />;
      case 'comercial-dashboard':
        return <AdminComercialDashboard />;
      case 'comercial':
        return <AdminCloser />;
      case 'comercial-prospeccao':
        return <AdminProspeccao />;
      case 'comercial-pos-venda':
        return <AdminPosVenda />;
      case 'comercial-cross-selling':
        return <AdminCrossSelling />;
      case 'financeiro':
        return <AdminFinanceiro />;
      case 'financeiro-dashboard':
        return <AdminFinanceiroDashboard />;
      case 'financeiro-cadastros':
        return <AdminFinanceiroCadastros />;
      case 'financeiro-contas-receber':
        return <AdminContasReceber />;
      case 'financeiro-contas-pagar':
        return <AdminContasPagar />;
      case 'financeiro-fluxo-caixa':
        return <AdminFluxoCaixa />;
      case 'financeiro-dre':
        return <AdminDRE />;
      case 'estatisticas':
        return <AdminEstatisticas />;
      case 'suporte':
        return <SuporteTickets />;
      case 'conteudo-blogs':
        return <AdminBlogList />;
      case 'conteudo-pesquisas':
        return <AdminPesquisasList />;
      case 'conteudo-newsletter':
        return <AdminNewsletterList />;
      case 'conteudo-vagas':
        return <AdminVagas />;
      default:
        return <AdminDashboardHome onNavigate={(section) => setActiveSection(section as AdminSection)} />;
    }
  };

  const getSectionTitle = () => {
    const titles: Record<AdminSection, string> = {
      dashboard: 'Dashboard',
      empresas: 'Empresas',
      usuarios: 'Usuários',
      colaboradores: 'Colaboradores',
      servicos: 'Serviços',
      modulos: 'Módulos',
      tarefas: 'Tarefas',
      'comercial-dashboard': 'Dashboard Comercial',
      comercial: 'Funil - CLOSER',
      'comercial-prospeccao': 'SDR - Prospecção',
      'comercial-pos-venda': 'Onboarding',
      'comercial-cross-selling': 'CS / Cross-selling',
      financeiro: 'Financeiro',
      'financeiro-dashboard': 'Dashboard Financeiro',
      'financeiro-cadastros': 'Cadastros Financeiros',
      'financeiro-contas-receber': 'Contas a Receber',
      'financeiro-contas-pagar': 'Contas a Pagar',
      'financeiro-fluxo-caixa': 'Fluxo de Caixa',
      'financeiro-dre': 'DRE',
      'estatisticas': 'Estatísticas do Sistema',
      'suporte': 'Tickets de Suporte',
      'conteudo-blogs': 'Blogs',
      'conteudo-pesquisas': 'Pesquisas de Opinião',
      'conteudo-newsletter': 'Newsletter',
      'conteudo-vagas': 'Vagas',
    };
    return titles[activeSection] || 'Dashboard';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-auto scrollbar-thin">
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-muted transition-colors" />
                <div className="h-6 w-px bg-border" />
                <h1 className="text-sm font-medium text-muted-foreground">
                  {getSectionTitle()}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Toriq</span>
                <span className="text-primary">•</span>
                <span>Admin</span>
              </div>
            </div>
          </header>
          <div className="p-6">
            {renderSection()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
