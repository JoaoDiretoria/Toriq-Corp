import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, MailCheck } from 'lucide-react';

/**
 * Solicita o link de redefinição de senha por email.
 * O backend SEMPRE responde 204 (não revela se o email existe).
 */
const EsqueciSenha = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() });
      setEnviado(true);
    } catch {
      // Mesmo em erro, não revelamos nada — mostra a confirmação genérica.
      setEnviado(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Toriq</h1>
          <p className="mt-2 text-muted-foreground">Recuperação de senha</p>
        </div>

        <Card className="border-border shadow-lg">
          {enviado ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex justify-center mb-2">
                  <MailCheck className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl text-center">Verifique seu email</CardTitle>
                <CardDescription className="text-center">
                  Se houver uma conta com esse email, enviamos um link para você
                  redefinir a senha. O link expira em 24 horas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate('/auth')}>
                  Voltar para Login
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl text-center">Esqueci minha senha</CardTitle>
                <CardDescription className="text-center">
                  Informe seu email e enviaremos um link para redefinir a senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="voce@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar link de redefinição'
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Login
                  </button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EsqueciSenha;
