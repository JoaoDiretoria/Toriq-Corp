import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RequireSenhaAlteradaProps {
  children: React.ReactNode;
}

/**
 * Componente global que protege rotas exigindo que o usuário tenha alterado a senha.
 * Se senha_alterada = FALSE, redireciona para /alterar-senha.
 * Deve ser usado para envolver dashboards e páginas protegidas.
 */
export function RequireSenhaAlterada({ children }: RequireSenhaAlteradaProps) {
  const { profile, loading, user } = useAuth();

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está logado, redirecionar para auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se profile ainda não carregou, aguardar
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se senha não foi alterada, redirecionar para /alterar-senha
  if (profile.senha_alterada === false) {
    return <Navigate to="/alterar-senha" replace />;
  }

  // Senha já foi alterada, renderizar children
  return <>{children}</>;
}
