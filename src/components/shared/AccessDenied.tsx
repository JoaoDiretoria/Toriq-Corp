import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Home } from 'lucide-react';

interface AccessDeniedProps {
  redirectTo?: string;
  countdownSeconds?: number;
}

export const AccessDenied = ({ 
  redirectTo = '/', 
  countdownSeconds = 10 
}: AccessDeniedProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(countdownSeconds);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Redirect when countdown reaches 0
  useEffect(() => {
    if (countdown <= 0) {
      navigate(redirectTo);
    }
  }, [countdown, navigate, redirectTo]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      <Card className="max-w-md mx-4 shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2" />
        <CardContent className="pt-10 pb-8 px-8">
          <div className="flex flex-col items-center text-center gap-5">
            {/* Ícone animado */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-200 rounded-full animate-ping opacity-25" />
              <div className="relative p-4 bg-gradient-to-br from-red-100 to-orange-100 rounded-full">
                <ShieldAlert className="h-12 w-12 text-red-500" />
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Acesso Negado
              </h1>
              <p className="text-slate-600 leading-relaxed">
                Você não tem permissão para acessar este recurso.
              </p>
            </div>

            {/* Countdown */}
            <p className="text-sm text-slate-400">
              Você será redirecionado para a página inicial em{" "}
              <span className="font-bold text-red-500">{countdown}</span> segundos...
            </p>

            {/* Botão */}
            <Button
              onClick={() => navigate(redirectTo)}
              className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 mt-2"
            >
              <Home className="h-4 w-4" />
              Voltar para Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
