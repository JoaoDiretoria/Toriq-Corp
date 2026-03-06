import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, AlertTriangle, Check, X, LogOut } from 'lucide-react';

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

export default function AlterarSenha() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const requisitos = validarSenha(novaSenha);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senhaValida(novaSenha)) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não conferem');
      return;
    }

    setLoading(true);
    try {
      // 1. Atualizar senha no Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) throw updateError;

      // 2. Atualizar senha_alterada = TRUE no profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ senha_alterada: true })
        .eq('id', user!.id);

      if (profileError) {
        console.error('Erro ao atualizar profile:', profileError);
        // Não bloquear - senha já foi alterada
      }

      toast.success('Senha alterada com sucesso! Redirecionando...');
      
      // Usar window.location para forçar reload completo
      // Isso garante que o profile seja recarregado com senha_alterada = true
      let redirectUrl = '/';
      if (profile?.role === 'instrutor') {
        redirectUrl = '/instrutor';
      } else if (profile?.role === 'empresa_sst') {
        redirectUrl = '/sst';
      } else if (profile?.role === 'cliente_final') {
        redirectUrl = '/cliente';
      } else if (profile?.role === 'empresa_parceira') {
        redirectUrl = '/parceira';
      } else if (profile?.role === 'admin_vertical') {
        redirectUrl = '/admin';
      }
      
      // Pequeno delay para o toast aparecer e depois redirecionar
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Alterar Senha</CardTitle>
          <CardDescription>
            Por segurança, você precisa criar uma nova senha para continuar usando o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="novaSenha"
                  type={showPassword ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmarSenha"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha e Continuar'
              )}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
