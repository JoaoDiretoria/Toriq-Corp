import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ParceiraSidebar } from '@/components/parceira/ParceiraSidebar';
import { ParceiraInicio } from '@/components/parceira/ParceiraInicio';
import { ParceiraInstrutores } from '@/components/parceira/ParceiraInstrutores';
import { ParceiraAgenda } from '@/components/parceira/ParceiraAgenda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2 } from 'lucide-react';
import SuporteTickets from '@/pages/shared/SuporteTickets';

type ParceiraSection = 'inicio' | 'instrutores' | 'agenda' | 'meu-perfil' | 'suporte';

const ParceiraDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, empresa, loading } = useAuth();
  const { setCurrentScreen } = useCurrentScreen();
  const [activeSection, setActiveSection] = useState<ParceiraSection>('inicio');

  // Atualizar tela atual quando a seção mudar
  useEffect(() => {
    setCurrentScreen(activeSection, 'parceira');
  }, [activeSection, setCurrentScreen]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    // Redirecionar se não for empresa_parceira
    if (!loading && profile && profile.role !== 'empresa_parceira') {
      if (profile.role === 'admin_vertical') {
        navigate('/admin');
      } else if (profile.role === 'empresa_sst') {
        navigate('/sst');
      } else if (profile.role === 'cliente_final') {
        navigate('/cliente');
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'inicio':
        return <ParceiraInicio onNavigate={setActiveSection} />;
      case 'meu-perfil':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6" />
                Meu Perfil
              </h1>
              <p className="text-muted-foreground">
                Informações do seu perfil e da empresa.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados do Usuário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Nome:</span>
                    <p className="font-medium">{profile?.nome}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">E-mail:</span>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo de Acesso:</span>
                    <p className="font-medium">Empresa Parceira</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Nome:</span>
                    <p className="font-medium">{empresa?.nome || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <p className="font-medium">Empresa Parceira</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'instrutores':
        return <ParceiraInstrutores />;
      case 'agenda':
        return <ParceiraAgenda />;
      case 'suporte':
        return <SuporteTickets />;
      default:
        return <ParceiraInicio onNavigate={setActiveSection} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ParceiraSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ParceiraDashboard;
