import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      await (supabase as any)
        .from('blog_visualizacoes')
        .insert({
          blog_id: blogId,
          session_id: sessionId,
          user_agent: deviceInfo.userAgent,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          referer: document.referrer || null,
        });

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
    const { data: blog } = await (supabase as any)
      .from('blogs')
      .select('categoria_id, tags')
      .eq('id', blogId)
      .single();

    if (!blog) return;

    // Buscar preferências existentes
    const { data: existingPrefs } = await (supabase as any)
      .from('blog_user_preferences')
      .select('*')
      .eq('session_id', sessionId)
      .single();

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

      await (supabase as any)
        .from('blog_user_preferences')
        .update({
          categoria_ids: categoriaIds.slice(-10), // Manter últimas 10 categorias
          tags_interesse: tagsInteresse.slice(-30), // Manter últimas 30 tags
          blogs_visualizados: recentBlogs,
          ultimo_acesso: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
    } else {
      // Criar novas preferências
      await (supabase as any)
        .from('blog_user_preferences')
        .insert({
          session_id: sessionId,
          categoria_ids: blog.categoria_id ? [blog.categoria_id] : [],
          tags_interesse: blog.tags || [],
          blogs_visualizados: [blogId],
        });
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
      // Buscar preferências do usuário
      const { data: prefs } = await (supabase as any)
        .from('blog_user_preferences')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      let query = (supabase as any)
        .from('blogs')
        .select(`
          id, titulo, slug, descricao, imagem_capa_url, publicado_em, tempo_leitura,
          categoria:blog_categorias(nome, slug, cor)
        `)
        .eq('status', 'publicado')
        .order('publicado_em', { ascending: false })
        .limit(6);

      // Excluir blog atual
      if (currentBlogId) {
        query = query.neq('id', currentBlogId);
      }

      // Excluir blogs já visualizados
      if (prefs?.blogs_visualizados?.length > 0) {
        query = query.not('id', 'in', `(${prefs.blogs_visualizados.join(',')})`);
      }

      // Priorizar categorias de interesse
      if (prefs?.categoria_ids?.length > 0) {
        query = query.in('categoria_id', prefs.categoria_ids);
      }

      const { data } = await query;

      // Se não houver resultados suficientes, buscar mais
      if (!data || data.length < 3) {
        const { data: fallback } = await (supabase as any)
          .from('blogs')
          .select(`
            id, titulo, slug, descricao, imagem_capa_url, publicado_em, tempo_leitura,
            categoria:blog_categorias(nome, slug, cor)
          `)
          .eq('status', 'publicado')
          .neq('id', currentBlogId || '')
          .order('publicado_em', { ascending: false })
          .limit(6);

        setRecommendations(fallback || []);
      } else {
        setRecommendations(data);
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
      const intervalMap = {
        '24h': '1 day',
        '7d': '7 days',
        '30d': '30 days',
      };

      const { data } = await (supabase as any).rpc('get_trending_blogs', {
        period_interval: intervalMap[period],
        limit_count: 10,
      });

      if (data) {
        setTrending(data);
      } else {
        // Fallback: buscar blogs mais recentes se a função não existir
        const { data: fallback } = await (supabase as any)
          .from('blogs')
          .select(`
            id, titulo, slug, descricao, imagem_capa_url, publicado_em, tempo_leitura, visualizacoes,
            categoria:blog_categorias(nome, slug, cor),
            autor:blog_autores(nome, sobrenome)
          `)
          .eq('status', 'publicado')
          .order('visualizacoes', { ascending: false })
          .limit(10);

        setTrending(fallback || []);
      }
    } catch (error) {
      console.error('Erro ao buscar trending:', error);
      // Fallback
      const { data: fallback } = await (supabase as any)
        .from('blogs')
        .select(`
          id, titulo, slug, descricao, imagem_capa_url, publicado_em, tempo_leitura, visualizacoes,
          categoria:blog_categorias(nome, slug, cor),
          autor:blog_autores(nome, sobrenome)
        `)
        .eq('status', 'publicado')
        .order('visualizacoes', { ascending: false })
        .limit(10);

      setTrending(fallback || []);
    } finally {
      setLoading(false);
    }
  };

  return { trending, loading };
}
