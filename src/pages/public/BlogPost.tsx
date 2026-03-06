import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { BlogSEO } from '@/components/seo/BlogSEO';
import { useBlogAnalytics, useRecommendedBlogs } from '@/hooks/useBlogAnalytics';
import '@/components/landing/landing.css';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Share2, 
  Linkedin,
  Twitter,
  Facebook,
  Link as LinkIcon,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HelmetProvider } from 'react-helmet-async';

interface Blog {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  conteudo: string;
  imagem_capa_url: string | null;
  publicado_em: string;
  updated_at: string;
  tempo_leitura: number;
  tags: string[];
  autor: {
    nome: string;
    sobrenome: string;
    cargo: string;
    bio: string;
    avatar_url: string;
    linkedin_url: string;
  } | null;
  categoria: {
    nome: string;
    slug: string;
    cor: string;
  } | null;
}

interface RelatedBlog {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  imagem_capa_url: string | null;
  publicado_em: string;
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<RelatedBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackView } = useBlogAnalytics();
  const { recommendations } = useRecommendedBlogs(blog?.id);

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  // Registrar visualização quando o blog carregar
  useEffect(() => {
    if (blog?.id) {
      trackView(blog.id);
    }
  }, [blog?.id]);

  const fetchBlog = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('blogs')
        .select(`
          *,
          autor:blog_autores(nome, sobrenome, cargo, bio, avatar_url, linkedin_url),
          categoria:blog_categorias(nome, slug, cor)
        `)
        .eq('slug', slug)
        .eq('status', 'publicado')
        .single();

      if (error) throw error;

      setBlog(data);

      // Incrementar visualizações no campo da tabela blogs
      await (supabase as any)
        .from('blogs')
        .update({ visualizacoes: (data.visualizacoes || 0) + 1 })
        .eq('id', data.id);

      // Buscar posts relacionados
      if (data.categoria_id) {
        const { data: related } = await (supabase as any)
          .from('blogs')
          .select('id, titulo, slug, descricao, imagem_capa_url, publicado_em')
          .eq('status', 'publicado')
          .eq('categoria_id', data.categoria_id)
          .neq('id', data.id)
          .order('publicado_em', { ascending: false })
          .limit(3);

        setRelatedBlogs(related || []);
      }
    } catch (error) {
      console.error('Erro ao buscar blog:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = blog?.titulo || '';
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const getInitials = (nome: string, sobrenome?: string) => {
    const first = nome?.charAt(0) || '';
    const last = sobrenome?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  if (loading) {
    return (
      <div className="landing-page min-h-screen">
        <LandingHeader />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-muted-foreground">Carregando artigo...</div>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="landing-page min-h-screen">
        <LandingHeader />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Artigo não encontrado</h1>
              <p className="text-muted-foreground mb-6">
                O artigo que você está procurando não existe ou foi removido.
              </p>
              <Button onClick={() => navigate('/blog')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Blog
              </Button>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <HelmetProvider>
      <BlogSEO
        title={`${blog.titulo} - Blog TORIQ`}
        description={blog.descricao}
        image={blog.imagem_capa_url || undefined}
        url={`https://toriq.com.br/blog/${blog.slug}`}
        type="article"
        publishedTime={blog.publicado_em}
        modifiedTime={blog.updated_at}
        author={blog.autor ? `${blog.autor.nome} ${blog.autor.sobrenome}` : undefined}
        tags={blog.tags || []}
        section={blog.categoria?.nome}
      />
      
      <div className="landing-page min-h-screen">
        <LandingHeader />
        
        <main className="pt-24 pb-16">
          {/* Hero */}
        <section className="relative">
          {blog.imagem_capa_url ? (
            <div className="relative h-[400px] md:h-[500px]">
              <img
                src={blog.imagem_capa_url}
                alt={blog.titulo}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>
          ) : (
            <div className="h-[200px] bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
          
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto -mt-32 relative z-10">
              {/* Back button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/blog')}
                className="mb-6 bg-background/80 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Blog
              </Button>

              {/* Category */}
              {blog.categoria && (
                <Badge 
                  className="mb-4"
                  style={{ backgroundColor: blog.categoria.cor }}
                >
                  {blog.categoria.nome}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                {blog.titulo}
              </h1>

              {/* Description */}
              {blog.descricao && (
                <p className="text-xl text-muted-foreground mb-6">
                  {blog.descricao}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(blog.publicado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {blog.tempo_leitura} min de leitura
                </span>
              </div>

              {/* Author */}
              {blog.autor && (
                <div className="flex items-center gap-4 p-4 rounded-xl glass-card mb-8">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={blog.autor.avatar_url} />
                    <AvatarFallback>
                      {getInitials(blog.autor.nome, blog.autor.sobrenome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {blog.autor.nome} {blog.autor.sobrenome}
                    </p>
                    {blog.autor.cargo && (
                      <p className="text-sm text-muted-foreground">{blog.autor.cargo}</p>
                    )}
                  </div>
                  {blog.autor.linkedin_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(blog.autor?.linkedin_url, '_blank')}
                    >
                      <Linkedin className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Share buttons */}
              <div className="flex items-center gap-2 mb-8 pb-8 border-b border-border/30">
                <span className="text-sm text-muted-foreground mr-2">Compartilhar:</span>
                <Button variant="outline" size="icon" onClick={() => handleShare('twitter')}>
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('facebook')}>
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('linkedin')}>
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleShare('copy')}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Article content */}
              <article className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>,
                    p: ({ children }) => <p className="text-foreground/90 leading-relaxed mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-6">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>
                      ) : (
                        <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          {children}
                        </code>
                      );
                    },
                    img: ({ src, alt }) => (
                      <img 
                        src={src} 
                        alt={alt} 
                        className="rounded-lg w-full my-6"
                      />
                    ),
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {blog.conteudo || ''}
                </ReactMarkdown>
              </article>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-border/30">
                  {blog.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Updated date */}
              <p className="text-sm text-muted-foreground mt-8">
                Última atualização: {format(new Date(blog.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </section>

        {/* Related posts */}
        {relatedBlogs.length > 0 && (
          <section className="py-16 border-t border-border/30">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-8">Artigos Relacionados</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedBlogs.map((related) => (
                    <article
                      key={related.id}
                      className="group glass-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
                      onClick={() => navigate(`/blog/${related.slug}`)}
                    >
                      <div className="relative h-40 overflow-hidden">
                        {related.imagem_capa_url ? (
                          <img
                            src={related.imagem_capa_url}
                            alt={related.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-primary/50" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {related.titulo}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {related.descricao}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Gostou do conteúdo?
              </h2>
              <p className="text-muted-foreground mb-6">
                Descubra como a TORIQ pode transformar a gestão da sua empresa de SST.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/#contato')}>
                  Falar com Especialista
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/blog')}>
                  Ver mais artigos
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
      </div>
    </HelmetProvider>
  );
}
