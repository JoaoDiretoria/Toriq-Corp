import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { PublicPageCTA } from '@/components/shared/PublicPageCTA';
import { BlogListSEO } from '@/components/seo/BlogSEO';
import { useTrendingBlogs } from '@/hooks/useBlogAnalytics';
import '@/components/landing/landing.css';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight,
  BookOpen,
  Filter,
  X,
  TrendingUp,
  Flame,
  SlidersHorizontal,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HelmetProvider } from 'react-helmet-async';

interface Blog {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  imagem_capa_url: string | null;
  publicado_em: string;
  tempo_leitura: number;
  visualizacoes?: number;
  autor: {
    id: string;
    nome: string;
    sobrenome: string;
    cargo: string;
  } | null;
  categoria: {
    id: string;
    nome: string;
    slug: string;
    cor: string;
  } | null;
}

interface Categoria {
  id: string;
  nome: string;
  slug: string;
  cor: string;
}

interface Autor {
  id: string;
  nome: string;
  sobrenome: string;
}

export default function BlogList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [autores, setAutores] = useState<Autor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtros
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoriaFilter, setCategoriaFilter] = useState(searchParams.get('categoria') || '');
  const [autorFilter, setAutorFilter] = useState(searchParams.get('autor') || '');
  const [tempoLeituraFilter, setTempoLeituraFilter] = useState(searchParams.get('tempo') || '');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(
    searchParams.get('de') ? new Date(searchParams.get('de')!) : undefined
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(
    searchParams.get('ate') ? new Date(searchParams.get('ate')!) : undefined
  );
  const [showFilters, setShowFilters] = useState(false);
  
  // Paginação
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 9;

  // Tab ativa
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'todos');

  // Trending blogs
  const { trending, loading: trendingLoading } = useTrendingBlogs('7d');

  useEffect(() => {
    fetchCategorias();
    fetchAutores();
  }, []);

  useEffect(() => {
    if (activeTab === 'todos') {
      fetchBlogs();
    }
  }, [page, search, categoriaFilter, autorFilter, tempoLeituraFilter, dataInicio, dataFim, activeTab]);

  useEffect(() => {
    // Atualizar URL com filtros
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (categoriaFilter) params.set('categoria', categoriaFilter);
    if (autorFilter) params.set('autor', autorFilter);
    if (tempoLeituraFilter) params.set('tempo', tempoLeituraFilter);
    if (dataInicio) params.set('de', format(dataInicio, 'yyyy-MM-dd'));
    if (dataFim) params.set('ate', format(dataFim, 'yyyy-MM-dd'));
    if (page > 1) params.set('page', page.toString());
    if (activeTab !== 'todos') params.set('tab', activeTab);
    setSearchParams(params);
  }, [search, categoriaFilter, autorFilter, tempoLeituraFilter, dataInicio, dataFim, page, activeTab]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('blogs')
        .select(`
          id, titulo, slug, descricao, imagem_capa_url, publicado_em, tempo_leitura, visualizacoes,
          autor:blog_autores(id, nome, sobrenome, cargo),
          categoria:blog_categorias(id, nome, slug, cor)
        `, { count: 'exact' })
        .eq('status', 'publicado')
        .order('publicado_em', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Filtro de busca
      if (search) {
        query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      // Filtro de categoria
      if (categoriaFilter) {
        query = query.eq('categoria_id', categoriaFilter);
      }

      // Filtro de autor
      if (autorFilter) {
        query = query.eq('autor_id', autorFilter);
      }

      // Filtro de tempo de leitura
      if (tempoLeituraFilter) {
        const [min, max] = tempoLeituraFilter.split('-').map(Number);
        if (max) {
          query = query.gte('tempo_leitura', min).lte('tempo_leitura', max);
        } else {
          query = query.gte('tempo_leitura', min);
        }
      }

      // Filtro de data
      if (dataInicio) {
        query = query.gte('publicado_em', format(dataInicio, 'yyyy-MM-dd'));
      }
      if (dataFim) {
        query = query.lte('publicado_em', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setBlogs(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Erro ao buscar blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_categorias')
        .select('*')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchAutores = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_autores')
        .select('id, nome, sobrenome')
        .order('nome');

      if (error) throw error;
      setAutores(data || []);
    } catch (error) {
      console.error('Erro ao buscar autores:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoriaFilter('');
    setAutorFilter('');
    setTempoLeituraFilter('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setPage(1);
  };

  const hasActiveFilters = search || categoriaFilter || autorFilter || tempoLeituraFilter || dataInicio || dataFim;

  const getCategoriaName = () => {
    const cat = categorias.find(c => c.id === categoriaFilter);
    return cat?.nome;
  };

  const renderBlogCard = (blog: Blog, showTrending = false) => (
    <article
      key={blog.id}
      className="group glass-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/blog/${blog.slug}`)}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {blog.imagem_capa_url ? (
          <img
            src={blog.imagem_capa_url}
            alt={blog.titulo}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/50" />
          </div>
        )}
        {blog.categoria && (
          <Badge 
            className="absolute top-4 left-4"
            style={{ backgroundColor: blog.categoria.cor }}
          >
            {blog.categoria.nome}
          </Badge>
        )}
        {showTrending && blog.visualizacoes && blog.visualizacoes > 0 && (
          <Badge 
            className="absolute top-4 right-4 bg-orange-500"
          >
            <Flame className="h-3 w-3 mr-1" />
            {blog.visualizacoes} views
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {blog.titulo}
        </h2>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {blog.descricao}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(blog.publicado_em), "dd MMM yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {blog.tempo_leitura} min
            </span>
          </div>
          {blog.autor && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {blog.autor.nome}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <HelmetProvider>
      <BlogListSEO 
        page={page} 
        categoria={getCategoriaName()} 
        searchQuery={search}
      />
      
      <div className="landing-page min-h-screen">
        <LandingHeader />
        
        <main className="pt-24 pb-16">
          {/* Hero */}
          <section className="py-12 relative overflow-hidden">
            <div className="absolute inset-0 hero-gradient" />
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Blog TORIQ</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                  Conteúdos sobre <span className="text-gradient">SST e Gestão</span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8">
                  Artigos, dicas e novidades sobre Saúde e Segurança do Trabalho, 
                  gestão empresarial e tecnologia.
                </p>

                {/* Search */}
                <form onSubmit={handleSearch} className="max-w-xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar artigos..."
                      className="pl-12 pr-24 h-12 bg-background/50 border-border/50"
                    />
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      Buscar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Tabs e Filtros */}
          <section className="border-b border-border/30">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full md:w-auto">
                  <TabsList className="grid w-full md:w-auto grid-cols-2">
                    <TabsTrigger value="todos" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Todos
                    </TabsTrigger>
                    <TabsTrigger value="em-alta" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Em Alta
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Filtros */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? 'bg-primary/10' : ''}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                        {[search, categoriaFilter, autorFilter, tempoLeituraFilter, dataInicio, dataFim].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Painel de Filtros */}
              {showFilters && (
                <div className="pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Categoria</Label>
                    <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                              {cat.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Autor */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Autor</Label>
                    <Select value={autorFilter} onValueChange={(v) => { setAutorFilter(v); setPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {autores.map((autor) => (
                          <SelectItem key={autor.id} value={autor.id}>
                            {autor.nome} {autor.sobrenome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tempo de Leitura */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tempo de Leitura</Label>
                    <Select value={tempoLeituraFilter} onValueChange={(v) => { setTempoLeituraFilter(v); setPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        <SelectItem value="1-5">Até 5 min</SelectItem>
                        <SelectItem value="5-10">5 a 10 min</SelectItem>
                        <SelectItem value="10-20">10 a 20 min</SelectItem>
                        <SelectItem value="20-">Mais de 20 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Início */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dataInicio}
                          onSelect={(d) => { setDataInicio(d); setPage(1); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Data Fim */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dataFim}
                          onSelect={(d) => { setDataFim(d); setPage(1); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Conteúdo */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {activeTab === 'todos' ? (
                <>
                  {/* Contador de resultados */}
                  {!loading && (
                    <p className="text-sm text-muted-foreground mb-6">
                      {totalCount} {totalCount === 1 ? 'artigo encontrado' : 'artigos encontrados'}
                      {hasActiveFilters && ' com os filtros aplicados'}
                    </p>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-pulse text-muted-foreground">Carregando artigos...</div>
                    </div>
                  ) : blogs.length === 0 ? (
                    <div className="text-center py-20">
                      <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h3>
                      <p className="text-muted-foreground mb-6">
                        {hasActiveFilters 
                          ? 'Tente ajustar seus filtros de busca'
                          : 'Em breve teremos novos conteúdos'}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {blogs.map((blog) => renderBlogCard(blog))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
                          <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Anterior
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (page <= 3) {
                                pageNum = i + 1;
                              } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = page - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={page === pageNum ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setPage(pageNum)}
                                  className="w-10 h-10"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Tab Em Alta */
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h2 className="text-xl font-semibold">Artigos em Alta</h2>
                    <span className="text-sm text-muted-foreground">• Mais lidos nos últimos 7 dias</span>
                  </div>

                  {trendingLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-pulse text-muted-foreground">Carregando artigos em alta...</div>
                    </div>
                  ) : trending.length === 0 ? (
                    <div className="text-center py-20">
                      <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Nenhum artigo em alta</h3>
                      <p className="text-muted-foreground">
                        Os artigos mais lidos aparecerão aqui
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {trending.map((blog) => renderBlogCard(blog, true))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* CTAs */}
          <PublicPageCTA 
            showBlog={false}
            showPesquisas={true}
            showEspecialista={true}
            title="Continue explorando"
            subtitle="Participe de pesquisas e fale com nossos especialistas"
          />
        </main>

        <LandingFooter />
      </div>
    </HelmetProvider>
  );
}
