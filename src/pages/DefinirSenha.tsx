import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Check, X, Lock, Loader2 } from 'lucide-react';

const validarSenha = (senha: string) => ({
  minLength: senha.length >= 8,
  hasLowercase: /[a-z]/.test(senha),
  hasUppercase: /[A-Z]/.test(senha),
  hasNumber: /[0-9]/.test(senha),
  hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
});

const senhaValida = (senha: string) => {
  const v = validarSenha(senha);
  return v.minLength && v.hasLowercase && v.hasUppercase && v.hasNumber && v.hasSpecial;
};

/**
 * Define a senha a partir do token recebido por email (convite/reset).
 * Chega via /definir-senha?token=... — não exige sessão.
 */
const DefinirSenha = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

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
      await api.post('/auth/definir-senha', { token, senha: formData.password });
      toast.success('Senha definida com sucesso! Faça login para continuar.');
      await api.post('/auth/logout').catch(() => null);
      navigate('/auth');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível definir a senha. O link pode ter expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Link inválido</CardTitle>
            <CardDescription className="text-center">
              O link de definição de senha é inválido ou está incompleto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
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
          <h1 className="text-3xl font-bold text-foreground">Toriq</h1>
          <p className="mt-2 text-muted-foreground">Defina sua senha de acesso</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-2">
              <KeyRound className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Crie uma senha forte para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="space-y-1 mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Requisitos da senha:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { ok: requisitos.minLength, label: 'Mínimo 8 caracteres' },
                      { ok: requisitos.hasLowercase, label: 'Letra minúscula' },
                      { ok: requisitos.hasUppercase, label: 'Letra maiúscula' },
                      { ok: requisitos.hasNumber, label: 'Número' },
                      { ok: requisitos.hasSpecial, label: 'Caractere especial' },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className={`flex items-center gap-1 text-xs ${r.ok ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    Salvando...
                  </>
                ) : (
                  'Definir Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DefinirSenha;
