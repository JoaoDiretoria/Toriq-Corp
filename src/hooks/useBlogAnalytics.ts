import { useCallback, useEffect, useState } from 'react';
import { api } from '@/integrations/api/client';

const SESSION_KEY = 'blog_session_id';

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
  try {
    // Buscar dados do blog para pegar categoria e tags
    const blog = await api.get<any>(`/blog/${blogId}`).catch(() => null);

    if (!blog) return;

    // Build the incremental payload for PUT /blog/preferences/{session_id}
    const payload: {
      categoria_ids?: string[];
      tags_interesse?: string[];
      blogs_visualizados?: string[];
    } = {
      blogs_visualizados: [blogId],
    };

    if (blog.categoria_id) {
      payload.categoria_ids = [blog.categoria_id];
    }
    if (blog.tags && blog.tags.length > 0) {
      payload.tags_interesse = blog.tags;
    }

    // Persist to backend — server merges arrays and enforces size limits
    await api.put<any>(`/blog/preferences/${sessionId}`, payload);
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
      // Build query params
      const params = new URLSearchParams({ session_id: sessionId, limit: '6' });
      if (currentBlogId) {
        params.set('exclude_id', currentBlogId);
      }

      const posts = await api
        .get<any[]>(`/blog/recommendations?${params.toString()}`)
        .catch(() => [] as any[]);

      setRecommendations(posts);
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
