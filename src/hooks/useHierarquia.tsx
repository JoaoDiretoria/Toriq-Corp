import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/api/client';

export type GrupoAcesso = 'administrador' | 'gestor' | 'colaborador';

interface ProfileComHierarquia {
  id: string;
  nome: string;
  email: string;
  grupo_acesso: GrupoAcesso | null;
  gestor_id: string | null;
  setor_id: string | null;
  empresa_id: string | null;
}

interface UseHierarquiaReturn {
  loading: boolean;
  grupoAcesso: GrupoAcesso | null;
  isAdministrador: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  subordinados: string[];
  usuariosVisiveis: string[];
  podeVerUsuario: (userId: string) => boolean;
  podeEditarUsuario: (userId: string) => boolean;
  podeDeletarUsuario: (userId: string) => boolean;
  podeVerRegistro: (criadorId: string, responsavelId?: string | null) => boolean;
  podeEditarRegistro: (criadorId: string, responsavelId?: string | null) => boolean;
  podeDeletarRegistro: (criadorId: string) => boolean;
  getFiltroUsuarios: () => string[];
  reloadHierarquia: () => Promise<void>;
}

export function useHierarquia(): UseHierarquiaReturn {
  const { profile, empresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileCompleto, setProfileCompleto] = useState<ProfileComHierarquia | null>(null);
  const [subordinados, setSubordinados] = useState<string[]>([]);
  const [usuariosVisiveis, setUsuariosVisiveis] = useState<string[]>([]);

  const loadHierarquia = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Backend novo: /admin/users/hierarquia devolve, numa única chamada, o grafo
      // de profiles já escopado pelo token (admin_vertical → todos; demais papéis →
      // apenas a própria empresa). Substitui as várias queries recursivas ao Supabase:
      // o cálculo de subordinados passa a ser feito em memória sobre esse grafo.
      const profiles = await api
        .get<any[]>('/admin/users/hierarquia')
        .catch(() => [] as any[]);

      const self = (profiles || []).find((p: any) => p.id === profile.id) || null;
      setProfileCompleto(self);

      const grupoAcesso = (self?.grupo_acesso ?? null) as GrupoAcesso | null;

      // admin_vertical sempre tem acesso total (a lista já vem com todos)
      if (profile.role === 'admin_vertical') {
        const todosIds = (profiles || []).map((u: any) => u.id);
        setSubordinados(todosIds);
        setUsuariosVisiveis(todosIds);
        setLoading(false);
        return;
      }

      // Administrador da empresa OU cliente_torq sem grupo definido vê todos da empresa
      // (cliente_torq sem grupo_acesso é o dono/admin da empresa - comportamento legado).
      // A lista já é escopada por empresa; o filtro por empresa.id é redundante/defensivo.
      if ((grupoAcesso === 'administrador' || !grupoAcesso) && empresa?.id) {
        const ids = (profiles || [])
          .filter((u: any) => u.empresa_id === empresa.id)
          .map((u: any) => u.id);
        setSubordinados(ids.filter((id: string) => id !== profile.id));
        setUsuariosVisiveis(ids);
        setLoading(false);
        return;
      }

      // Gestor vê a si mesmo + subordinados diretos e indiretos (BFS em memória)
      if (grupoAcesso === 'gestor') {
        const subordinadosIds = getSubordinadosRecursivo(profile.id, profiles || []);
        setSubordinados(subordinadosIds);
        setUsuariosVisiveis([profile.id, ...subordinadosIds]);
        setLoading(false);
        return;
      }

      // Colaborador só vê a si mesmo
      setSubordinados([]);
      setUsuariosVisiveis([profile.id]);
    } catch (error) {
      console.error('Erro ao carregar hierarquia:', error);
      setSubordinados([]);
      setUsuariosVisiveis(profile?.id ? [profile.id] : []);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role, empresa?.id]);

  // Subordinados diretos e indiretos via BFS sobre o grafo de profiles já carregado
  // (cada nó tem gestor_id). Antes eram N consultas recursivas ao Supabase.
  const getSubordinadosRecursivo = (gestorId: string, profiles: any[]): string[] => {
    const filhosPorGestor = new Map<string, string[]>();
    for (const p of profiles) {
      if (!p.gestor_id) continue;
      const lista = filhosPorGestor.get(p.gestor_id) ?? [];
      lista.push(p.id);
      filhosPorGestor.set(p.gestor_id, lista);
    }

    const subordinadosIds: string[] = [];
    const queue = [gestorId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentGestorId = queue.shift()!;
      if (visited.has(currentGestorId)) continue;
      visited.add(currentGestorId);

      for (const filhoId of filhosPorGestor.get(currentGestorId) ?? []) {
        if (!subordinadosIds.includes(filhoId)) {
          subordinadosIds.push(filhoId);
          queue.push(filhoId);
        }
      }
    }

    return subordinadosIds;
  };

  useEffect(() => {
    loadHierarquia();
  }, [loadHierarquia]);

  const grupoAcesso = profileCompleto?.grupo_acesso || null;
  const isAdminVertical = profile?.role === 'admin_vertical';
  // cliente_torq sem grupo_acesso é considerado administrador (dono da empresa)
  const isAdministrador = isAdminVertical || grupoAcesso === 'administrador' || (!grupoAcesso && profile?.role === 'cliente_torq');
  const isGestor = grupoAcesso === 'gestor';
  const isColaborador = grupoAcesso === 'colaborador';

  // Verifica se pode ver um usuário específico
  const podeVerUsuario = useCallback((userId: string): boolean => {
    if (isAdminVertical) return true;
    return usuariosVisiveis.includes(userId);
  }, [isAdminVertical, usuariosVisiveis]);

  // Verifica se pode editar um usuário específico
  const podeEditarUsuario = useCallback((userId: string): boolean => {
    if (isAdminVertical) return true;
    if (isAdministrador) return usuariosVisiveis.includes(userId);
    // Gestor pode editar subordinados, colaborador só a si mesmo
    if (isGestor) return subordinados.includes(userId) || userId === profile?.id;
    return userId === profile?.id;
  }, [isAdminVertical, isAdministrador, isGestor, subordinados, usuariosVisiveis, profile?.id]);

  // Verifica se pode deletar um usuário específico
  const podeDeletarUsuario = useCallback((userId: string): boolean => {
    if (isAdminVertical) return true;
    if (isAdministrador) return usuariosVisiveis.includes(userId) && userId !== profile?.id;
    // Gestor pode deletar subordinados diretos
    if (isGestor) return subordinados.includes(userId);
    return false;
  }, [isAdminVertical, isAdministrador, isGestor, subordinados, usuariosVisiveis, profile?.id]);

  // Verifica se pode ver um registro baseado no criador/responsável
  const podeVerRegistro = useCallback((criadorId: string, responsavelId?: string | null): boolean => {
    if (isAdminVertical || isAdministrador) return true;
    
    // Pode ver se é o criador
    if (criadorId === profile?.id) return true;
    
    // Pode ver se é o responsável
    if (responsavelId && responsavelId === profile?.id) return true;
    
    // Gestor pode ver registros de subordinados
    if (isGestor) {
      if (subordinados.includes(criadorId)) return true;
      if (responsavelId && subordinados.includes(responsavelId)) return true;
    }
    
    return false;
  }, [isAdminVertical, isAdministrador, isGestor, subordinados, profile?.id]);

  // Verifica se pode editar um registro baseado no criador/responsável
  const podeEditarRegistro = useCallback((criadorId: string, responsavelId?: string | null): boolean => {
    if (isAdminVertical || isAdministrador) return true;
    
    // Pode editar se é o criador
    if (criadorId === profile?.id) return true;
    
    // Pode editar se é o responsável
    if (responsavelId && responsavelId === profile?.id) return true;
    
    // Gestor pode editar registros de subordinados
    if (isGestor) {
      if (subordinados.includes(criadorId)) return true;
      if (responsavelId && subordinados.includes(responsavelId)) return true;
    }
    
    return false;
  }, [isAdminVertical, isAdministrador, isGestor, subordinados, profile?.id]);

  // Verifica se pode deletar um registro baseado no criador
  const podeDeletarRegistro = useCallback((criadorId: string): boolean => {
    if (isAdminVertical || isAdministrador) return true;
    
    // Pode deletar se é o criador
    if (criadorId === profile?.id) return true;
    
    // Gestor pode deletar registros de subordinados
    if (isGestor && subordinados.includes(criadorId)) return true;
    
    return false;
  }, [isAdminVertical, isAdministrador, isGestor, subordinados, profile?.id]);

  // Retorna lista de IDs de usuários para filtrar consultas
  const getFiltroUsuarios = useCallback((): string[] => {
    if (isAdminVertical || isAdministrador) return []; // Vazio significa sem filtro
    return usuariosVisiveis;
  }, [isAdminVertical, isAdministrador, usuariosVisiveis]);

  return {
    loading,
    grupoAcesso,
    isAdministrador,
    isGestor,
    isColaborador,
    subordinados,
    usuariosVisiveis,
    podeVerUsuario,
    podeEditarUsuario,
    podeDeletarUsuario,
    podeVerRegistro,
    podeEditarRegistro,
    podeDeletarRegistro,
    getFiltroUsuarios,
    reloadHierarquia: loadHierarquia,
  };
}
