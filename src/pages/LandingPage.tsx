import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LandingHeader,
  LandingHero,
  LandingPainPoints,
  LandingImpact,
  LandingSolution,
  LandingTargetAudience,
  LandingContactForm,
  LandingFooter
} from '@/components/landing';
import '@/components/landing/landing.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processingToken, setProcessingToken] = useState(false);
  const hasProcessedToken = useRef(false);
  const redirectedRef = useRef(false);

  // Processar tokens de autenticação na URL (convite, recovery, etc.)
  useEffect(() => {
    const processAuthToken = async () => {
      if (hasProcessedToken.current) return;
      
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;

      hasProcessedToken.current = true;
      setProcessingToken(true);

      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      window.history.replaceState(null, '', window.location.pathname);

      if (error) {
        console.error('Auth error:', error, errorDescription);
        redirectedRef.current = true;
        navigate('/auth?message=' + encodeURIComponent(errorDescription || 'Link inválido ou expirado'), { replace: true });
        return;
      }

      if (accessToken) {
        // NOTA (migração): supabase.auth.setSession removido — o backend novo usa
        // cookies JWT próprios e não aceita tokens hash do Supabase. Links de
        // convite/recovery/magiclink via hash precisam ser reemitidos pelo novo backend.
        // Por ora, redireciona para /auth com mensagem orientando novo login.
        redirectedRef.current = true;
        navigate('/auth?message=' + encodeURIComponent('Por favor, faça login para continuar'), { replace: true });
      }
      
      setProcessingToken(false);
    };

    processAuthToken();
  }, [navigate]);

  useEffect(() => {
    if (redirectedRef.current || processingToken || hasProcessedToken.current) return;
    
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, processingToken, navigate]);

  if (loading || processingToken) {
    return (
      <div className="landing-page flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {processingToken ? 'Processando convite...' : 'Carregando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingPainPoints />
        <LandingImpact />
        <LandingSolution />
        <LandingTargetAudience />
        <LandingContactForm />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
