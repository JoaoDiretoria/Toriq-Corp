import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { useAccessLog } from '@/hooks/useAccessLog';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ClienteSidebar } from '@/components/cliente/ClienteSidebar';
import { ClienteModulos } from '@/components/cliente/ClienteModulos';
import { ClienteFinanceiro } from '@/components/cliente/ClienteFinanceiro';
import { ClientePerfil } from '@/components/cliente/ClientePerfil';
import { ClienteColaboradores } from '@/components/cliente/ClienteColaboradores';
import { ClienteSetores } from '@/components/cliente/ClienteSetores';
import { ClienteCargos } from '@/components/cliente/ClienteCargos';
import { ClienteSolicitacaoTreinamento } from '@/components/cliente/ClienteSolicitacaoTreinamento';
import { ClienteMeuPerfil } from '@/components/cliente/ClienteMeuPerfil';
import { ClienteTurmas } from '@/components/cliente/ClienteTurmas';
import { ClienteRelatoriosCertificados } from '@/components/cliente/ClienteRelatoriosCertificados';
import { ClienteControleValidade } from '@/components/cliente/ClienteControleValidade';
import SuporteTickets from '@/pages/shared/SuporteTickets';

export type ClienteSection = 'modulos' | 'financeiro' | 'perfil' | 'colaboradores' | 'setores' | 'cargos' | 'solicitacao-treinamento' | 'meu-perfil' | 'turmas' | 'relatorios-certificados' | 'controle-validade' | 'suporte';

const ClienteDashboard = () => {
  const { user, profile, loading } = useAuth();
  const { setCurrentScreen } = useCurrentScreen();
  const { logView } = useAccessLog();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ClienteSection>('meu-perfil');

  // Atualizar tela atual quando a seção mudar
  useEffect(() => {
    setCurrentScreen(activeSection, 'cliente');
  }, [activeSection, setCurrentScreen]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && profile) {
      logView('Dashboard', 'Cliente Dashboard', 'Acessou o painel do cliente');
    }
  }, [user, loading, navigate, profile]);

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'admin_vertical') {
        navigate('/admin');
      } else if (profile.role === 'empresa_sst') {
        navigate('/sst');
      }
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canAccess = profile?.role === 'cliente_final';
  
  if (!profile || !canAccess) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'modulos':
        return <ClienteModulos />;
      case 'setores':
        return <ClienteSetores />;
      case 'cargos':
        return <ClienteCargos />;
      case 'colaboradores':
        return <ClienteColaboradores />;
      case 'financeiro':
        return <ClienteFinanceiro />;
      case 'perfil':
        return <ClientePerfil />;
      case 'solicitacao-treinamento':
        return <ClienteSolicitacaoTreinamento />;
      case 'meu-perfil':
        return <ClienteMeuPerfil />;
      case 'turmas':
        return <ClienteTurmas />;
      case 'relatorios-certificados':
        return <ClienteRelatoriosCertificados />;
      case 'controle-validade':
        return <ClienteControleValidade />;
      case 'suporte':
        return <SuporteTickets />;
      default:
        return <ClienteMeuPerfil />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <div className="flex flex-1">
          <ClienteSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {renderSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ClienteDashboard;
