import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';

export interface Notificacao {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  tipo: 'info' | 'success' | 'warning' | 'error';
  categoria: string;
  titulo: string;
  mensagem: string;
  modulo: string | null;
  tela: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  referencia_dados: Record<string, any>;
  lida: boolean;
  lida_em: string | null;
  lida_por: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para gerenciar notificações no frontend
 * 
 * IMPORTANTE: Este hook apenas LÊ e MARCA COMO LIDA as notificações.
 * A criação de notificações é feita exclusivamente no backend via triggers SQL.
 * Cada empresa vê apenas suas próprias notificações (RLS configurado no banco).
 * Admin Vertical vê todas as notificações de todas as empresas.
 */
export function useNotificacoes() {
  const { profile, user } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || profile?.empresa_id;
  const isAdminVertical = profile?.role === 'admin_vertical';

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Carregar notificações
  const fetchNotificacoes = useCallback(async () => {
    if (!profile) return;

    try {
      let query = (supabase as any)
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Admin Vertical vê todas, outros veem apenas da sua empresa
      if (!isAdminVertical && empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar notificações:', error);
        return;
      }

      setNotificacoes(data || []);
      setNaoLidas((data || []).filter((n: Notificacao) => !n.lida).length);
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    } finally {
      setLoading(false);
    }
  }, [profile, empresaId, isAdminVertical]);

  // Carregar ao montar e quando mudar empresa
  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  // Realtime subscription para novas notificações (apenas escuta, não cria)
  useEffect(() => {
    if (!profile || !empresaId) return;

    // Filtro por empresa (exceto admin que vê tudo)
    const filter = isAdminVertical ? undefined : `empresa_id=eq.${empresaId}`;

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          ...(filter ? { filter } : {})
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes(prev => [novaNotificacao, ...prev].slice(0, 50));
          setNaoLidas(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacoes',
          ...(filter ? { filter } : {})
        },
        (payload) => {
          const notificacaoAtualizada = payload.new as Notificacao;
          setNotificacoes(prev => {
            const updated = prev.map(n => 
              n.id === notificacaoAtualizada.id ? notificacaoAtualizada : n
            );
            setNaoLidas(updated.filter(n => !n.lida).length);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, empresaId, isAdminVertical]);

  // Marcar uma notificação como lida
  const marcarComoLida = useCallback(async (notificacaoId: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('notificacoes')
        .update({
          lida: true,
          lida_em: new Date().toISOString(),
          lida_por: user.id
        })
        .eq('id', notificacaoId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return;
      }

      setNotificacoes(prev =>
        prev.map(n =>
          n.id === notificacaoId
            ? { ...n, lida: true, lida_em: new Date().toISOString(), lida_por: user.id }
            : n
        )
      );
      setNaoLidas(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Erro ao marcar notificação como lida:', e);
    }
  }, [user]);

  // Marcar todas como lidas
  const marcarTodasComoLidas = useCallback(async () => {
    if (!user || !empresaId) return;

    try {
      let query = (supabase as any)
        .from('notificacoes')
        .update({
          lida: true,
          lida_em: new Date().toISOString(),
          lida_por: user.id
        })
        .eq('lida', false);

      if (!isAdminVertical) {
        query = query.eq('empresa_id', empresaId);
      }

      const { error } = await query;

      if (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        return;
      }

      setNotificacoes(prev =>
        prev.map(n => ({
          ...n,
          lida: true,
          lida_em: new Date().toISOString(),
          lida_por: user.id
        }))
      );
      setNaoLidas(0);
    } catch (e) {
      console.error('Erro ao marcar todas como lidas:', e);
    }
  }, [user, empresaId, isAdminVertical]);

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    refetch: fetchNotificacoes
  };
}
