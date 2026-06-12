import { useCallback, useEffect, useState } from 'react';
import { api } from '@/integrations/api/client';

const SESSION_KEY = 'blog_session_id';
const PREFERENCES_KEY = 'blog_user_preferences';

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Device type
  if (/Mobi|Android/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  // OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { deviceType, browser, os, userAgent: ua };
}

export function useBlogAnalytics() {
  const [sessionId] = useState(getSessionId);

  const trackView = useCallback(async (blogId: string) => {
    try {
      const deviceInfo = getDeviceInfo();

      // Registrar visualização
      await api.post<any>(`/blog/${blogId}/visualizacoes`, {
        session_id: sessionId,
        user_agent: deviceInfo.userAgent,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        referer: document.referrer || null,
      }).catch(() => null);

      // Atualizar preferências do usuário
      await updateUserPreferences(blogId, sessionId);
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  }, [sessionId]);

  return { trackView, sessionId };
}

async function updateUserPreferences(blogId: string, sessionId: string) {
  // NOTA (migração): blog_user_preferences não tem endpoint no backend — lógica
  // de preferências persiste localmente via localStorage para manter comportamento.
  try {
    // Buscar dados do blog para pegar categoria e tags
    const blog = await api.get<any>(`/blog/${blogId}`).catch(() => null);

    if (!blog) return;

    // Buscar preferências existentes do localStorage
    const prefsRaw = localStorage.getItem(PREFERENCES_KEY);
    const existingPrefs = prefsRaw ? JSON.parse(prefsRaw) : null;

    if (existingPrefs) {
      // Atualizar preferências existentes
      const categoriaIds = existingPrefs.categoria_ids || [];
      const tagsInteresse = existingPrefs.tags_interesse || [];
      const blogsVisualizados = existingPrefs.blogs_visualizados || [];

      // Adicionar categoria se não existir
      if (blog.categoria_id && !categoriaIds.includes(blog.categoria_id)) {
        categoriaIds.push(blog.categoria_id);
      }

      // Adicionar tags se não existirem
      if (blog.tags) {
        blog.tags.forEach((tag: string) => {
          if (!tagsInteresse.includes(tag)) {
            tagsInteresse.push(tag);
          }
        });
      }

      // Adicionar blog visualizado
      if (!blogsVisualizados.includes(blogId)) {
        blogsVisualizados.push(blogId);
      }

      // Manter apenas os últimos 50 blogs visualizados
      const recentBlogs = blogsVisualizados.slice(-50);

      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({
          ...existingPrefs,
          categoria_ids: categoriaIds.slice(-10), // Manter últimas 10 categorias
          tags_interesse: tagsInteresse.slice(-30), // Manter últimas 30 tags
          blogs_visualizados: recentBlogs,
          ultimo_acesso: new Date().toISOString(),
        })
      );
    } else {
      // Criar novas preferências
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({
          session_id: sessionId,
          categoria_ids: blog.categoria_id ? [blog.categoria_id] : [],
          tags_interesse: blog.tags || [],
          blogs_visualizados: [blogId],
        })
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
  }
}

export function useRecommendedBlogs(currentBlogId?: string) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  useEffect(() => {
    fetchRecommendations();
  }, [currentBlogId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // NOTA (migração): blog_user_preferences não tem endpoint no backend —
      // preferências são lidas do localStorage (persistidas por updateUserPreferences).
      const prefsRaw = localStorage.getItem(PREFERENCES_KEY);
      const prefs = prefsRaw ? JSON.parse(prefsRaw) : null;

      // Buscar posts publicados (backend já filtra status='publicado')
      let posts: any[] = await api.get<any[]>('/blog').catch(() => [] as any[]);

      // Excluir blog atual
      if (currentBlogId) {
        posts = posts.filter((p: any) => p.id !== currentBlogId);
      }

      // Excluir blogs já visualizados
      if (prefs?.blogs_visualizados?.length > 0) {
        posts = posts.filter((p: any) => !prefs.blogs_visualizados.includes(p.id));
      }

      // Priorizar categorias de interesse
      let prioritized = posts;
      if (prefs?.categoria_ids?.length > 0) {
        const preferred = posts.filter((p: any) =>
          prefs.categoria_ids.includes(p.categoria_id)
        );
        prioritized = preferred.length > 0 ? preferred : posts;
      }

      // Ordenar por publicado_em desc e limitar
      prioritized = prioritized
        .sort((a: any, b: any) => {
          const da = a.publicado_em ? new Date(a.publicado_em).getTime() : 0;
          const db_ = b.publicado_em ? new Date(b.publicado_em).getTime() : 0;
          return db_ - da;
        })
        .slice(0, 6);

      // Se não houver resultados suficientes, buscar mais sem filtros
      if (prioritized.length < 3) {
        const fallback = await api.get<any[]>('/blog').catch(() => [] as any[]);
        const filtered = fallback
          .filter((p: any) => p.id !== (currentBlogId || ''))
          .sort((a: any, b: any) => {
            const da = a.publicado_em ? new Date(a.publicado_em).getTime() : 0;
            const db_ = b.publicado_em ? new Date(b.publicado_em).getTime() : 0;
            return db_ - da;
          })
          .slice(0, 6);

        setRecommendations(filtered);
      } else {
        setRecommendations(prioritized);
      }
    } catch (error) {
      console.error('Erro ao buscar recomendações:', error);
    } finally {
      setLoading(false);
    }
  };

  return { recommendations, loading };
}

export function useTrendingBlogs(period: '24h' | '7d' | '30d' = '7d') {
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, [period]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      // Buscar blogs com contagem de visualizações
      const periodDaysMap = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
      };

      const data = await api
        .get<any[]>(`/blog/trending?period_days=${periodDaysMap[period]}&limit=10`)
        .catch(() => null);

      if (data && data.length > 0) {
        setTrending(data);
      } else {
        // Fallback: buscar blogs mais recentes se o endpoint não retornar dados
        const fallback = await api.get<any[]>('/blog').catch(() => [] as any[]);
        const sorted = fallback
          .filter((p: any) => p.status === 'publicado')
          .sort((a: any, b: any) => (b.visualizacoes || 0) - (a.visualizacoes || 0))
          .slice(0, 10);

        setTrending(sorted);
      }
    } catch (error) {
      console.error('Erro ao buscar trending:', error);
      // Fallback
      const fallback = await api.get<any[]>('/blog').catch(() => [] as any[]);
      const sorted = fallback
        .filter((p: any) => p.status === 'publicado')
        .sort((a: any, b: any) => (b.visualizacoes || 0) - (a.visualizacoes || 0))
        .slice(0, 10);

      setTrending(sorted);
    } finally {
      setLoading(false);
    }
  };

  return { trending, loading };
}
