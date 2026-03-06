import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InstrutorSidebar, type InstrutorSection } from '@/components/instrutor/InstrutorSidebar';
import { InstrutorInicio } from '@/components/instrutor/InstrutorInicio';
import { InstrutorGestaoTurmas } from '@/components/instrutor/InstrutorGestaoTurmas';
import { InstrutorAgendaTreinamentos } from '@/components/instrutor/InstrutorAgendaTreinamentos';
import { InstrutorMeuPerfil } from '@/components/instrutor/InstrutorMeuPerfil';
import { InstrutorSolicitarIndisponibilidade } from '@/components/instrutor/InstrutorSolicitarIndisponibilidade';
import { Button } from '@/components/ui/button';
import SuporteTickets from '@/pages/shared/SuporteTickets';

const InstrutorDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { setCurrentScreen } = useCurrentScreen();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<InstrutorSection>('inicio');
  const [instrutorInativo, setInstrutorInativo] = useState<{ inativo: boolean; dataDesativacao?: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Atualizar tela atual quando a seção mudar
  useEffect(() => {
    setCurrentScreen(activeSection, 'instrutor');
  }, [activeSection, setCurrentScreen]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Verificar se o instrutor está ativo
  useEffect(() => {
    const checkInstrutorStatus = async () => {
      if (!user || !profile || profile.role !== 'instrutor') {
        setCheckingStatus(false);
        return;
      }

      try {
        const { data: instrutor, error } = await (supabase as any)
          .from('instrutores')
          .select('ativo, data_desativacao')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar status do instrutor:', error);
          setCheckingStatus(false);
          return;
        }

        if (instrutor && !instrutor.ativo) {
          setInstrutorInativo({
            inativo: true,
            dataDesativacao: instrutor.data_desativacao
          });
        }
        setCheckingStatus(false);
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setCheckingStatus(false);
      }
    };

    if (!loading && user && profile) {
      checkInstrutorStatus();
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (!loading && profile && user) {
      // Verificar se é instrutor - redirecionar para dashboard correto se não for
      if (profile.role !== 'instrutor') {
        if (profile.role === 'admin_vertical') {
          navigate('/admin');
        } else if (profile.role === 'empresa_sst') {
          navigate('/sst');
        } else if (profile.role === 'cliente_final') {
          navigate('/cliente');
        } else if (profile.role === 'empresa_parceira') {
          navigate('/parceira');
        }
      }
    }
  }, [profile, loading, navigate, user]);

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Exibir mensagem de acesso desativado
  if (instrutorInativo?.inativo) {
    const dataDesativacao = instrutorInativo.dataDesativacao 
      ? new Date(instrutorInativo.dataDesativacao)
      : null;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Desativado</h1>
            <p className="text-muted-foreground mb-4">
              Seu acesso à plataforma foi desativado.
            </p>
            {dataDesativacao && (
              <p className="text-sm text-muted-foreground mb-6">
                Data da desativação: {dataDesativacao.toLocaleDateString('pt-BR')} às {dataDesativacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Entre em contato com a empresa responsável para mais informações.
            </p>
            <Button 
              onClick={() => signOut()} 
              variant="outline"
              className="w-full"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'instrutor') {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'inicio':
        return <InstrutorInicio onNavigate={setActiveSection} />;
      case 'gestao-turmas':
        return <InstrutorGestaoTurmas />;
      case 'agenda':
        return <InstrutorAgendaTreinamentos />;
      case 'indisponibilidade':
        return <InstrutorSolicitarIndisponibilidade />;
      case 'perfil':
        return <InstrutorMeuPerfil />;
      case 'suporte':
        return <SuporteTickets />;
      default:
        return <InstrutorInicio onNavigate={setActiveSection} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <InstrutorSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-background">
          {renderSection()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default InstrutorDashboard;
