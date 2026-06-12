import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchGitHubReleases, ParsedRelease } from '@/services/githubReleasesService';

export interface ChangelogItem {
  type: 'feature' | 'fix' | 'improvement' | 'breaking';
  description: string;
}

export interface SystemUpdate {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changelog: ChangelogItem[];
  release_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  url?: string;
}

/**
 * Hook para gerenciar atualizações do sistema
 * 
 * - Busca releases automaticamente do GitHub
 * - Registra no banco de dados para controle de visualizações
 * - Verifica quais o usuário ainda não viu
 * - Permite marcar atualizações como visualizadas
 */
export function useSystemUpdates() {
  const { user, profile } = useAuth();
  const [pendingUpdates, setPendingUpdates] = useState<SystemUpdate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasFetchedGitHub = useRef(false);

  // Busca releases do GitHub e registra no banco
  const syncGitHubReleases = useCallback(async () => {
    if (hasFetchedGitHub.current) return;
    hasFetchedGitHub.current = true;

    try {
      const releases = await fetchGitHubReleases(10);
      
      // Registrar cada release no banco (se não existir)
      for (const release of releases) {
        try {
          await api.post<any>('/sistema/system-updates', {
            version: release.version,
            title: release.title,
            description: release.description || null,
            changelog: release.changelog,
            release_date: release.releaseDate,
          });
        } catch (e) {
          // Ignora erro de versão duplicada ou sem permissão (admin_vertical required)
        }
      }
      
      console.log('[useSystemUpdates] Sincronizadas', releases.length, 'releases do GitHub');
    } catch (e) {
      console.error('Erro ao sincronizar releases do GitHub:', e);
    }
  }, []);

  const fetchPendingUpdate = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Sincronizar releases do GitHub primeiro
      await syncGitHubReleases();

      const updates: SystemUpdate[] = await api.get<SystemUpdate[]>('/sistema/system-updates?apenas_ativos=true').catch(() => [] as SystemUpdate[]);

      if (!updates || updates.length === 0) {
        setPendingUpdates([]);
        setLoading(false);
        return;
      }

      const viewedData: { update_id: string }[] = await api.get<{ update_id: string }[]>('/sistema/system-updates/views/me').catch(() => [] as { update_id: string }[]);

      const viewedIds = new Set((viewedData || []).map((v: { update_id: string }) => v.update_id));

      // Filtrar notificações: não vistas E lançadas após a criação do usuário
      const userCreatedAt = profile?.created_at ? new Date(profile.created_at) : null;

      const unseenUpdates = updates.filter(u => {
        // Já foi vista? Ignorar
        if (viewedIds.has(u.id)) return false;
        
        // Se temos a data de criação do usuário, filtrar notificações antigas
        if (userCreatedAt) {
          const releaseDate = new Date(u.release_date);
          // Só mostrar notificações lançadas APÓS a criação do usuário
          if (releaseDate < userCreatedAt) {
            return false;
          }
        }
        
        return true;
      });

      console.log('[useSystemUpdates] Total ativas:', updates.length);
      console.log('[useSystemUpdates] Já vistas:', viewedIds.size);
      console.log('[useSystemUpdates] Pendentes (após filtro):', unseenUpdates.length);

      setPendingUpdates(unseenUpdates);
      setCurrentIndex(0);
    } catch (e) {
      console.error('Erro ao buscar atualizações do sistema:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile, syncGitHubReleases]);

  const pendingUpdate = pendingUpdates.length > 0 ? pendingUpdates[currentIndex] : null;
  const totalPending = pendingUpdates.length;
  const currentNumber = currentIndex + 1;

  useEffect(() => {
    fetchPendingUpdate();
  }, [fetchPendingUpdate]);

  const markAsViewed = useCallback(async (updateId: string) => {
    if (!user) {
      console.log('[markAsViewed] Sem usuário logado');
      return;
    }

    console.log('[markAsViewed] Marcando como vista:', updateId, 'para user:', user.id);

    try {
      const data = await api.post<any>(`/sistema/system-updates/${updateId}/visto`).catch(() => null);

      console.log('[markAsViewed] Resultado:', { data });

      // Avança para a próxima atualização ou limpa se era a última
      setPendingUpdates(prev => {
        const newList = prev.filter(u => u.id !== updateId);
        console.log('[markAsViewed] Atualizações restantes:', newList.length);
        return newList;
      });
    } catch (e) {
      console.error('Erro ao marcar atualização como vista:', e);
      // Mesmo com erro, remover da lista para não travar o usuário
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
    }
  }, [user]);

  return {
    pendingUpdate,
    totalPending,
    currentNumber,
    loading,
    markAsViewed,
    refetch: fetchPendingUpdate
  };
}