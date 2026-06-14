import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SuporteSidebar, type OpsSection } from '@/components/suporte/SuporteSidebar';
import { OpsVisaoGeral } from '@/components/suporte/OpsVisaoGeral';
import { OpsBancoDados } from '@/components/suporte/OpsBancoDados';
import { OpsRedisFilas } from '@/components/suporte/OpsRedisFilas';
import { OpsTickets } from '@/components/suporte/OpsTickets';
import { OpsUsuarios } from '@/components/suporte/OpsUsuarios';
import { OpsSentry } from '@/components/suporte/OpsSentry';
import { OpsAuditoria } from '@/components/suporte/OpsAuditoria';

const TITLES: Record<OpsSection, string> = {
  'visao-geral': 'Visão Geral do Sistema',
  banco: 'Banco de Dados',
  redis: 'Redis, Filas & Jobs',
  tickets: 'Tickets de Suporte (Global)',
  usuarios: 'Usuários do Sistema',
  sentry: 'Sentry / Erros',
  auditoria: 'Log de Auditoria',
};

const SuporteDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<OpsSection>('visao-geral');

  // Acesso: apenas suporte e admin_vertical. Demais voltam para /dashboard.
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && profile && profile.role !== 'suporte' && profile.role !== 'admin_vertical') {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!profile || (profile.role !== 'suporte' && profile.role !== 'admin_vertical')) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'visao-geral': return <OpsVisaoGeral />;
      case 'banco': return <OpsBancoDados />;
      case 'redis': return <OpsRedisFilas />;
      case 'tickets': return <OpsTickets />;
      case 'usuarios': return <OpsUsuarios />;
      case 'sentry': return <OpsSentry />;
      case 'auditoria': return <OpsAuditoria />;
      default: return <OpsVisaoGeral />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SuporteSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-auto scrollbar-thin">
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-muted transition-colors" />
                <div className="h-6 w-px bg-border" />
                <h1 className="text-sm font-medium text-muted-foreground">{TITLES[activeSection]}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Toriq</span>
                <span className="text-primary">•</span>
                <span>Suporte</span>
              </div>
            </div>
          </header>
          <div className="p-6">{renderSection()}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SuporteDashboard;
