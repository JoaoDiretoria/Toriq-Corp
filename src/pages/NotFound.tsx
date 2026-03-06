import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Card className="max-w-lg mx-4 shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2" />
        <CardContent className="pt-12 pb-10 px-8">
          <div className="flex flex-col items-center text-center gap-6">
            {/* Ícone animado */}
            <div className="relative">
              <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-25" />
              <div className="relative p-5 bg-gradient-to-br from-orange-100 to-red-100 rounded-full">
                <AlertTriangle className="h-16 w-16 text-orange-500" />
              </div>
            </div>

            {/* Código 404 */}
            <div className="space-y-2">
              <h1 className="text-7xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                404
              </h1>
              <h2 className="text-2xl font-bold text-slate-800">
                Página não encontrada
              </h2>
            </div>

            {/* Mensagem */}
            <p className="text-slate-600 max-w-sm leading-relaxed">
              Ops! A página que você está procurando não existe ou foi movida. 
              Verifique o endereço ou volte para a página inicial.
            </p>

            {/* Rota tentada */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-500">
              <Search className="h-4 w-4" />
              <code className="font-mono">{location.pathname}</code>
            </div>

            {/* Countdown */}
            <p className="text-sm text-slate-400">
              Redirecionando para a página inicial em{" "}
              <span className="font-bold text-orange-500">{countdown}</span> segundos...
            </p>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Home className="h-4 w-4" />
                Ir para Início
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
