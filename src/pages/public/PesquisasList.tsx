import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { PublicPageCTA } from '@/components/shared/PublicPageCTA';
import '@/components/landing/landing.css';
import { 
  Search, 
  ClipboardList,
  Users,
  ChevronRight,
  Shield,
  Lock,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HelmetProvider, Helmet } from 'react-helmet-async';

interface Pesquisa {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  total_votos: number;
  created_at: string;
  categoria: {
    nome: string;
    cor: string;
  } | null;
  autor: {
    nome: string;
    sobrenome: string;
  } | null;
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

export default function PesquisasList() {
  const navigate = useNavigate();
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');

  useEffect(() => {
    fetchPesquisas();
    fetchCategorias();
  }, [search, categoriaFilter]);

  const fetchPesquisas = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('pesquisas_opiniao')
        .select(`
          id, titulo, slug, descricao, total_votos, created_at,
          categoria:blog_categorias(nome, cor),
          autor:blog_autores(nome, sobrenome)
        `)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      if (categoriaFilter) {
        query = query.eq('categoria_id', categoriaFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPesquisas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    const { data } = await (supabase as any)
      .from('blog_categorias')
      .select('id, nome, cor')
      .order('nome');
    setCategorias(data || []);
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Pesquisas de Opinião - TORIQ</title>
        <meta name="description" content="Participe das nossas pesquisas de opinião. Sua voz importa! Dados 100% anônimos seguindo a LGPD." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Pesquisas de Opinião - TORIQ" />
        <meta property="og:description" content="Participe das nossas pesquisas de opinião. Sua voz importa!" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://toriq.com.br/pesquisas" />
      </Helmet>

      <div className="landing-page min-h-screen">
        <LandingHeader />
        
        <main className="pt-24 pb-16">
          {/* Hero */}
          <section className="py-12 relative overflow-hidden">
            <div className="absolute inset-0 hero-gradient" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Pesquisas de Opinião</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                  Sua <span className="text-gradient">opinião</span> importa
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8">
                  Participe das nossas pesquisas e ajude a moldar o futuro. 
                  Seus dados são 100% anônimos e protegidos.
                </p>

                {/* Search */}
                <div className="max-w-xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar pesquisas..."
                      className="pl-12 h-12 bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LGPD Notice */}
          <section className="py-8 border-y border-border/30 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Dados 100% Anônimos</p>
                    <p className="text-sm text-muted-foreground">
                      Seguimos a{' '}
                      <a 
                        href="https://pt.wikipedia.org/wiki/Lei_Geral_de_Prote%C3%A7%C3%A3o_de_Dados_Pessoais"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        LGPD <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="hidden md:block h-8 w-px bg-border" />
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Lock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Privacidade Garantida</p>
                    <p className="text-sm text-muted-foreground">
                      Normas nacionais e internacionais
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Filtros */}
          <section className="py-6 border-b border-border/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-4">
                <Select value={categoriaFilter || "all"} onValueChange={(val) => setCategoriaFilter(val === "all" ? "" : val)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
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
                
                <span className="text-sm text-muted-foreground">
                  {pesquisas.length} {pesquisas.length === 1 ? 'pesquisa aberta' : 'pesquisas abertas'}
                </span>
              </div>
            </div>
          </section>

          {/* Lista de Pesquisas */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-pulse text-muted-foreground">Carregando pesquisas...</div>
                </div>
              ) : pesquisas.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma pesquisa disponível</h3>
                  <p className="text-muted-foreground">
                    {search || categoriaFilter 
                      ? 'Tente ajustar seus filtros'
                      : 'Em breve teremos novas pesquisas'}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pesquisas.map((pesquisa) => (
                    <Card 
                      key={pesquisa.id}
                      className="group cursor-pointer hover:border-primary/50 transition-all duration-300"
                      onClick={() => navigate(`/pesquisas/${pesquisa.slug}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          {pesquisa.categoria ? (
                            <Badge style={{ backgroundColor: pesquisa.categoria.cor }}>
                              {pesquisa.categoria.nome}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Geral</Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {pesquisa.total_votos}
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {pesquisa.titulo}
                        </h3>
                        
                        {pesquisa.descricao && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {pesquisa.descricao}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(pesquisa.created_at), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <Button variant="ghost" size="sm" className="group-hover:text-primary">
                            Participar
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Info Section */}
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-center">
                  Compromisso com a <span className="text-gradient">Proteção de Dados</span>
                </h2>
                
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <p className="text-muted-foreground">
                    A plataforma TORIQ segue rigorosamente todas as normas nacionais e internacionais 
                    de proteção de dados, incluindo a{' '}
                    <a 
                      href="https://pt.wikipedia.org/wiki/Lei_Geral_de_Prote%C3%A7%C3%A3o_de_Dados_Pessoais"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Lei Geral de Proteção de Dados (LGPD)
                    </a>.
                  </p>
                  
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Os dados das pesquisas são coletados de forma 100% anônima</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Utilizados exclusivamente para fins estatísticos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Baseados em participação voluntária</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Seguimos diretrizes e políticas de proteção de dados nacionais e internacionais</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* CTAs */}
          <PublicPageCTA 
            showPesquisas={false}
            showBlog={true}
            showEspecialista={true}
            title="Explore mais conteúdos"
            subtitle="Descubra artigos, dicas e fale com nossos especialistas"
          />
        </main>

        <LandingFooter />
      </div>
    </HelmetProvider>
  );
}
