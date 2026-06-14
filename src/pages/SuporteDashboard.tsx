import { useCallback, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { opsApi } from '@/integrations/api/ops';
import { ApiError } from '@/integrations/api/client';

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
  const [opsStatus, setOpsStatus] = useState<'checking' | 'ready' | 'missing' | 'forbidden' | 'error'>('checking');
  const [opsError, setOpsError] = useState<string | null>(null);
  const podeAcessarOps = profile?.role === 'suporte' || profile?.role === 'admin_vertical';

  // Acesso: apenas suporte e admin_vertical. Demais voltam para /dashboard.
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && profile && !podeAcessarOps) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate, podeAcessarOps]);

  const verificarBackendOps = useCallback(async () => {
    if (!podeAcessarOps) return;

    setOpsStatus('checking');
    setOpsError(null);

    try {
      await opsApi.health();
      setOpsStatus('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setOpsStatus('missing');
        setOpsError('A API publicada ainda não expõe as rotas do módulo Ops.');
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        setOpsStatus('forbidden');
        setOpsError('Seu usuário autenticado não tem acesso ao backend do módulo Ops.');
        return;
      }
      setOpsStatus('error');
      setOpsError(error instanceof Error ? error.message : 'Falha ao validar o backend do módulo Ops.');
    }
  }, [podeAcessarOps]);

  useEffect(() => {
    if (!loading && profile && podeAcessarOps) {
      verificarBackendOps();
    }
  }, [loading, profile, podeAcessarOps, verificarBackendOps]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!profile || !podeAcessarOps) {
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
          <div className="p-6">
            {opsStatus === 'checking' ? (
              <div className="animate-pulse text-muted-foreground">Validando backend do Ops...</div>
            ) : opsStatus === 'ready' ? (
              renderSection()
            ) : (
              <div className="max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 p-6">
                <h2 className="text-lg font-semibold text-foreground">Módulo Ops indisponível</h2>
                <p className="mt-2 text-sm text-muted-foreground">{opsError}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Quando isso acontece com `404`, o frontend foi publicado antes do backend correspondente ou a API em produção está com uma imagem desatualizada.
                </p>
                <div className="mt-4">
                  <Button variant="outline" onClick={verificarBackendOps}>Tentar novamente</Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SuporteDashboard;
