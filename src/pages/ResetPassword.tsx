import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Check, X, Lock, Loader2 } from 'lucide-react';

// Validação de requisitos de senha
const validarSenha = (senha: string) => {
  return {
    minLength: senha.length >= 8,
    hasLowercase: /[a-z]/.test(senha),
    hasUppercase: /[A-Z]/.test(senha),
    hasNumber: /[0-9]/.test(senha),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
  };
};

const senhaValida = (senha: string) => {
  const validacao = validarSenha(senha);
  return validacao.minLength && validacao.hasLowercase && validacao.hasUppercase && validacao.hasNumber && validacao.hasSpecial;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Verificar se há uma sessão válida de recuperação de senha
    const checkSession = async () => {
      // NOTA (migração): o fluxo de recovery via hash (#access_token=...&type=recovery)
      // era específico do Supabase Auth e não tem equivalente no backend Python.
      // Links de recuperação por e-mail gerados pelo Supabase não funcionam mais.
      // O reset de senha agora ocorre via senha temporária (primeiro acesso) ou
      // por admin em /admin/users/{id}/reset-password.

      // Verificar se já há uma sessão existente via /auth/me
      try {
        await api.get('/auth/me');
        setIsValidSession(true);
      } catch {
        toast.error('Link de recuperação inválido ou expirado.');
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const requisitos = validarSenha(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senhaValida(formData.password)) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar senha via /auth/first-access-password (não exige senha atual —
      // equivalente ao updateUser do Supabase no contexto de recuperação de senha).
      // O backend já atualiza senha_alterada = true internamente.
      await api.post('/auth/first-access-password', {
        new_password: formData.password,
      });

      toast.success('Senha atualizada com sucesso!');

      // Fazer logout para forçar novo login com a nova senha
      await api.post('/auth/logout').catch(() => null);
      navigate('/auth');
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      toast.error('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Verificando...</div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-card-foreground">
              Link Inválido
            </CardTitle>
            <CardDescription className="text-center">
              O link de recuperação de senha é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Portal de Módulos</h1>
          <p className="mt-2 text-muted-foreground">Defina sua nova senha</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-2">
              <KeyRound className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center text-card-foreground">
              Nova Senha
            </CardTitle>
            <CardDescription className="text-center">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Requisitos de senha */}
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Requisitos da senha:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`flex items-center gap-1 text-xs ${requisitos.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {requisitos.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${requisitos.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {requisitos.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Letra minúscula
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${requisitos.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {requisitos.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Letra maiúscula
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${requisitos.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {requisitos.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Número
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${requisitos.hasSpecial ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {requisitos.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Caractere especial
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading || !senhaValida(formData.password)}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
