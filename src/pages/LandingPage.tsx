import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
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

          redirectedRef.current = true;
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
          } else if (type === 'invite' || type === 'signup' || type === 'magiclink') {
            navigate('/alterar-senha', { replace: true });
          } else {
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
