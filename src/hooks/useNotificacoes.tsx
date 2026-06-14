import { useState, useEffect, useCallback } from 'react';
import { api, API_URL } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';

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

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Carregar notificações.
  // Backend novo: GET /notificacoes já escopa por empresa_id do token (modelo
  // de isolamento estrutural que substitui o RLS) — o front não filtra mais por
  // empresa. NOTA: isso estreita o admin_vertical, que antes via notificações de
  // TODAS as empresas; agora vê apenas as da própria. Ordenação/limite (50) que
  // antes iam na query do Supabase passam para o cliente.
  const fetchNotificacoes = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await api
        .get<Notificacao[]>('/notificacoes')
        .catch(() => [] as Notificacao[]);

      const ordenadas = [...(data || [])]
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 50);

      setNotificacoes(ordenadas);
      setNaoLidas(ordenadas.filter((n: Notificacao) => !n.lida).length);
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Carregar ao montar e quando mudar o perfil.
  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  // PUSH em tempo real via SSE (GET /notificacoes/stream).
  // EventSource envia o cookie httpOnly de auth com `withCredentials` e reconecta
  // sozinho em queda de conexão. Em backend sem Redis o canal só emite heartbeats
  // (ping) — o sino continua funcionando via carregamento/refetch, sem push.
  useEffect(() => {
    if (!profile) return;
    if (typeof EventSource === 'undefined') return; // SSR / browser sem suporte

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/notificacoes/stream`, { withCredentials: true });
    } catch {
      return; // falha ao abrir → segue só com refetch
    }

    es.onmessage = (ev) => {
      let data: any;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return; // heartbeat / linha não-JSON
      }
      if (data?.tipo !== 'notificacao_nova' || !data.notificacao) return;

      const nova = data.notificacao as Notificacao;
      setNotificacoes((prev) => {
        if (prev.some((n) => n.id === nova.id)) return prev; // dedupe
        return [nova, ...prev].slice(0, 50);
      });
      setNaoLidas((prev) => prev + (nova.lida ? 0 : 1));
    };

    // EventSource reconecta automaticamente em erro; nada a fazer aqui.
    es.onerror = () => {};

    return () => {
      es?.close();
    };
  }, [profile]);

  // Marcar uma notificação como lida → PATCH /notificacoes/{id}/lida
  const marcarComoLida = useCallback(async (notificacaoId: string) => {
    if (!user) return;

    try {
      await api.patch(`/notificacoes/${notificacaoId}/lida`, { lida_por: user.id });

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

  // Marcar todas como lidas. Sem endpoint de bulk no backend novo → percorre as
  // não lidas carregadas chamando PATCH /{id}/lida (N pequeno, ≤50 carregadas).
  const marcarTodasComoLidas = useCallback(async () => {
    if (!user) return;

    const naoLidasIds = notificacoes.filter(n => !n.lida).map(n => n.id);

    try {
      await Promise.all(
        naoLidasIds.map(id =>
          api.patch(`/notificacoes/${id}/lida`, { lida_por: user.id }).catch(() => null)
        )
      );

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
  }, [user, notificacoes]);

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    refetch: fetchNotificacoes
  };
}
