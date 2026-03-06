import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signIn, resetPassword, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetCaptchaToken, setResetCaptchaToken] = useState<string | null>(null);
  const resetTurnstileRef = useRef<TurnstileInstance>(null);

  // Session conflict state
  const [sessionConflictOpen, setSessionConflictOpen] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<{ email: string; password: string; captchaToken: string } | null>(null);

  // Exibir mensagem de desativação se vier na URL
  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast.error(message);
      // Limpar a mensagem da URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && profile) {
      // Redirecionar baseado no role do usuário
      if (profile.role === 'admin_vertical') {
        navigate('/admin', { replace: true });
      } else if (profile.role === 'empresa_sst') {
        navigate('/sst', { replace: true });
      } else if (profile.role === 'cliente_final') {
        navigate('/cliente', { replace: true });
      } else if (profile.role === 'empresa_parceira') {
        navigate('/parceira', { replace: true });
      } else if ((profile.role as string) === 'instrutor') {
        navigate('/instrutor', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse(loginForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (!captchaToken) {
      toast.error('Por favor, complete a verificação de segurança.');
      return;
    }

    setIsLoading(true);
    const result = await signIn(loginForm.email, loginForm.password, captchaToken);
    setIsLoading(false);

    // Se há conflito de sessão, mostrar popup de confirmação
    if (result.sessionConflict) {
      setPendingLoginData({ email: loginForm.email, password: loginForm.password, captchaToken });
      setSessionConflictOpen(true);
      return;
    }

    // Reset captcha após tentativa
    turnstileRef.current?.reset();
    setCaptchaToken(null);

    if (result.error) {
      if (result.error.message.includes('Invalid login credentials')) {
        toast.error('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        toast.error(result.error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
    }
  };

  // Confirmar derrubada de sessão e fazer login forçado
  const handleForceLogin = async () => {
    if (!pendingLoginData) return;

    setSessionConflictOpen(false);
    setIsLoading(true);
    
    // Fazer login com forceLogin = true
    const result = await signIn(pendingLoginData.email, pendingLoginData.password, pendingLoginData.captchaToken, true);
    setIsLoading(false);

    // Reset captcha após tentativa
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setPendingLoginData(null);

    if (result.error) {
      if (result.error.message.includes('Invalid login credentials')) {
        toast.error('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        toast.error(result.error.message);
      }
    } else {
      toast.success('Login realizado com sucesso! A sessão anterior foi encerrada.');
    }
  };

  // Cancelar login e resetar formulário
  const handleCancelLogin = () => {
    setSessionConflictOpen(false);
    setPendingLoginData(null);
    setLoginForm({ email: '', password: '' });
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const handleForgotPassword = async () => {
    try {
      forgotPasswordSchema.parse({ email: forgotPasswordEmail });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (!resetCaptchaToken) {
      toast.error('Por favor, complete a verificação de segurança.');
      return;
    }

    setIsResetLoading(true);
    
    // Verificar se email existe no sistema
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', forgotPasswordEmail)
      .maybeSingle();
      
    if (!profile) {
      toast.error('E-mail não encontrado no sistema.');
      setIsResetLoading(false);
      resetTurnstileRef.current?.reset();
      setResetCaptchaToken(null);
      return;
    }
    
    const { error } = await resetPassword(forgotPasswordEmail, resetCaptchaToken);
    setIsResetLoading(false);
    
    // Reset captcha após tentativa
    resetTurnstileRef.current?.reset();
    setResetCaptchaToken(null);
    
    if (error) {
      toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.');
    } else {
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <img
              src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png"
              alt="TORIQ"
              className="h-28 w-auto"
            />
          </div>
        </div>

        <Card className="border border-white/5 bg-[#1c1c1c] shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4 bg-[#1c1c1c]">
            <CardTitle className="text-2xl text-center text-white">Bem-vindo</CardTitle>
            <CardDescription className="text-center text-gray-300">
              Entre com sua conta para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-[#1c1c1c]">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-200">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="bg-black/30 text-white placeholder:text-gray-500 border-white/10 focus-visible:ring-primary/30 focus-visible:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-200">Senha</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-black/30 text-white placeholder:text-gray-500 border-white/10 focus-visible:ring-primary/30 focus-visible:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {/* Cloudflare Turnstile CAPTCHA */}
              <div className="flex justify-center rounded-lg overflow-hidden">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => {
                    setCaptchaToken(null);
                    toast.error('Erro na verificação de segurança. Tente novamente.');
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                  options={{
                    theme: 'auto',
                  }}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !captchaToken}>
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <span className="mr-1">Voltar para a</span>
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            página inicial
          </Link>
        </div>
      </div>

      {/* Dialog de Recuperação de Senha */}
      <Dialog open={forgotPasswordOpen} onOpenChange={(open) => {
        setForgotPasswordOpen(open);
        if (!open) {
          setForgotPasswordEmail('');
          setResetCaptchaToken(null);
          resetTurnstileRef.current?.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu e-mail cadastrado para receber o link de recuperação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
              />
            </div>
            
            {/* Cloudflare Turnstile CAPTCHA para recuperação */}
            <div className="flex justify-center rounded-lg overflow-hidden">
              <Turnstile
                ref={resetTurnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setResetCaptchaToken(token)}
                onError={() => {
                  setResetCaptchaToken(null);
                  toast.error('Erro na verificação de segurança. Tente novamente.');
                }}
                onExpire={() => {
                  setResetCaptchaToken(null);
                }}
                options={{
                  theme: 'light',
                }}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleForgotPassword}
              disabled={isResetLoading || !resetCaptchaToken}
            >
              {isResetLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Conflito de Sessão */}
      <AlertDialog open={sessionConflictOpen} onOpenChange={setSessionConflictOpen}>
        <AlertDialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-8 shadow-2xl">
          <AlertDialogHeader className="p-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-gray-900 m-0">
                Sessão Ativa Detectada
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed mb-2">
              Já existe uma sessão ativa para esta conta em outro dispositivo.
            </AlertDialogDescription>
            <p className="text-sm text-gray-800 font-medium leading-relaxed">
              Não é permitido login simultâneo. Tem certeza que deseja derrubar o acesso no outro dispositivo e fazer login neste?
            </p>
          </AlertDialogHeader>

          <div className="h-px bg-gray-200 my-6" />

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 p-0">
            <AlertDialogCancel
              onClick={handleCancelLogin}
              className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg"
            >
              Não, cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogin}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
            >
              Sim, derrubar e entrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Auth;
