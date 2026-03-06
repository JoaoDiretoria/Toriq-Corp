import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processingToken, setProcessingToken] = useState(false);
  const hasProcessedToken = useRef(false);
  const redirectedRef = useRef(false);

  // Processar tokens de autenticação na URL (convite, recovery, etc.)
  useEffect(() => {
    const processAuthToken = async () => {
      // Evitar processamento duplicado
      if (hasProcessedToken.current) return;
      
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;

      hasProcessedToken.current = true;
      setProcessingToken(true);

      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // Limpar hash da URL imediatamente
      window.history.replaceState(null, '', window.location.pathname);

      // Se há erro na URL, mostrar e limpar
      if (error) {
        console.error('Auth error:', error, errorDescription);
        redirectedRef.current = true;
        navigate('/auth?message=' + encodeURIComponent(errorDescription || 'Link inválido ou expirado'), { replace: true });
        return;
      }

      // Se há tokens na URL, processar
      if (accessToken) {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            redirectedRef.current = true;
            navigate('/auth?message=' + encodeURIComponent('Link inválido ou expirado'), { replace: true });
            return;
          }

          // Redirecionar baseado no tipo de token
          redirectedRef.current = true;
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
          } else if (type === 'invite' || type === 'signup' || type === 'magiclink') {
            // Convite de novo usuário - redirecionar para alterar senha
            navigate('/alterar-senha', { replace: true });
          } else {
            // Outros tipos - ir para dashboard
            navigate('/dashboard', { replace: true });
          }
        } catch (err) {
          console.error('Error processing token:', err);
          redirectedRef.current = true;
          navigate('/auth?message=' + encodeURIComponent('Erro ao processar link'), { replace: true });
        }
      }
      
      setProcessingToken(false);
    };

    processAuthToken();
  }, [navigate]);

  useEffect(() => {
    // Não redirecionar se já processou token ou está processando
    if (redirectedRef.current || processingToken || hasProcessedToken.current) return;
    
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, processingToken, navigate]);

  if (loading || processingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">
          {processingToken ? 'Processando convite...' : 'Carregando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/98 supports-[backdrop-filter]:bg-white/90 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-md border-b border-primary/12 shadow-[0_2px_12px_rgba(34,197,94,0.08)]">
        <div className="container mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="-my-2 h-16 w-auto overflow-hidden rounded-md">
              <img
                src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png"
                alt="TORIQ"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 bg-transparent hover:bg-transparent active:bg-transparent hover:text-primary"
            >
              Entrar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 pt-28 md:pt-32 min-h-[70vh] md:min-h-[80vh]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/IDTORIQCOMPLETA/TEXTURAS%20E%20ELEMENTOS/RENDER/LOGO2.mp4" type="video/mp4" />
        </video>
        <div className="relative container mx-auto px-4">
          <div className="grid items-center gap-10">
            <div className="text-left" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-card/80 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-heading text-3xl font-semibold text-card-foreground">
            Por que usar o tema TORIQ?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Paleta proprietária, tipografia futurista e assets prontos para aplicar no portal e na experiência white label.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">Aplicação imediata</h3>
              <p className="mt-2 text-muted-foreground">
                Preset de cores e logos pronto para o painel white label e para a landing page.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">Consistência visual</h3>
              <p className="mt-2 text-muted-foreground">
                Tipografia Conthrax + Outfit e ícones alinhados à paleta #16E17A / #0B5D4A.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">Marca em todo lugar</h3>
              <p className="mt-2 text-muted-foreground">
                Logos claras/pretas e favicons coloridos para headers, login e áreas públicas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Pronto para ativar o tema?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Aplique o preset TORIQ no painel white label e mantenha a identidade consistente em todo o portal.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Aplicar preset
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="border-secondary text-secondary hover:bg-secondary/10">
              Explorar módulos
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/80 py-10">
        <div className="container mx-auto px-4 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <div className="font-heading text-base text-foreground">TORIQ Identity</div>
          <p>© 2026 TORIQ. Identidade visual aplicada ao portal.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
