import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Construction } from 'lucide-react';
import { useEffect } from 'react';

const moduleNames: Record<string, string> = {
  documentos: 'Gestão de Documentos',
  treinamentos: 'Treinamentos',
  relatorios: 'Relatórios',
  agenda: 'Agenda',
  comunicados: 'Comunicados',
};

const ModuloPage = () => {
  const navigate = useNavigate();
  const { moduloSlug } = useParams<{ moduloSlug: string }>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const moduleName = moduloSlug ? moduleNames[moduloSlug] || moduloSlug : 'Módulo';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold text-card-foreground">{moduleName}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="border-border border-dashed max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
              <Construction className="h-10 w-10 text-accent-foreground" />
            </div>
            <CardTitle className="mt-4 text-2xl text-card-foreground">{moduleName}</CardTitle>
            <CardDescription className="text-base">
              Este módulo está em desenvolvimento
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Em breve você terá acesso a todas as funcionalidades deste módulo. 
              Fique atento às atualizações!
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="mt-6"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ModuloPage;
