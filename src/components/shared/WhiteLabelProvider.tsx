import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loadAndApplyFromCache, loadAndApplyFromDB, clearWhiteLabelConfig, clearCache } from '@/services/whiteLabelService';

/**
 * Componente que aplica o white label de forma reativa
 * 
 * Regras de herança:
 * - Empresa SST: usa sua própria configuração
 * - Cliente Final: herda da empresa SST que o criou
 * - Empresa Parceira: herda da empresa SST que a criou
 * - Instrutor: herda da empresa SST à qual está vinculado
 * - Admin Vertical (Toriq): NUNCA recebe white label, usa tema padrão
 * 
 * Quando o usuário loga, carrega e aplica o tema da empresa SST pai
 * Quando o usuário desloga, limpa o tema
 */
export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { empresa, user, profile, loading } = useAuth();

  useEffect(() => {
    // Primeiro, tentar carregar do localStorage (para persistência entre reloads)
    // Mas só se não for admin_vertical e se temos um usuário logado
    if (!loading && user?.id && profile?.role !== 'admin_vertical') {
      loadAndApplyFromCache();
    }
  }, [loading, user?.id, profile?.role]);

  useEffect(() => {
    // Admin vertical NUNCA recebe white label
    if (!loading && profile?.role === 'admin_vertical') {
      clearCache();
      clearWhiteLabelConfig();
      return;
    }

    // Quando o usuário loga, recarregar o white label
    // Passa userId e role para busca correta (especialmente para instrutores)
    if (!loading && user?.id && profile?.role) {
      loadAndApplyFromDB(
        empresa?.id || '', 
        user.id, 
        profile.role
      );
    }

    // Quando o usuário desloga, limpar o white label
    if (!loading && !user) {
      clearCache();
      clearWhiteLabelConfig();
    }
  }, [empresa?.id, user?.id, profile?.role, loading]);

  return <>{children}</>;
}
