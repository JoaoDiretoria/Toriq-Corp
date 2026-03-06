import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Sparkles, Send, BookOpen, BarChart3, Gift, Lightbulb, Bell, Zap } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import '@/components/landing/landing.css';

const benefits = [
  {
    icon: BookOpen,
    title: 'Artigos Exclusivos',
    description: 'Receba novos artigos do blog assim que forem publicados'
  },
  {
    icon: BarChart3,
    title: 'Pesquisas de Opinião',
    description: 'Seja o primeiro a participar das nossas pesquisas'
  },
  {
    icon: Lightbulb,
    title: 'Dicas de SST',
    description: 'Conteúdos práticos para melhorar sua gestão'
  },
  {
    icon: Gift,
    title: 'Ofertas Especiais',
    description: 'Promoções e novidades em primeira mão'
  }
];

export default function Newsletter() {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const [unsubscribeEmail, setUnsubscribeEmail] = useState('');
  const [notFoundError, setNotFoundError] = useState(false);
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cargo, setCargo] = useState('');

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    if (formatted.length <= 15) {
      setTelefone(formatted);
    }
  };

  const [userIp, setUserIp] = useState<string | null>(null);
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIp(data.ip))
      .catch(() => setUserIp(null));
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }
    if (!email.trim()) {
      toast.error('Por favor, informe seu e-mail');
      return;
    }
    if (!telefone.trim()) {
      toast.error('Por favor, informe seu telefone');
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await (supabase as any)
        .from('newsletter_inscricoes')
        .select('id, ativo')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        if (existing.ativo) {
          toast.info('Este e-mail já está cadastrado na newsletter!');
          setLoading(false);
          return;
        } else {
          await (supabase as any)
            .from('newsletter_inscricoes')
            .update({
              ativo: true,
              nome,
              telefone,
              data_nascimento: dataNascimento || null,
              empresa: empresa || null,
              cargo: cargo || null,
              ip_address: userIp,
              updated_at: new Date().toISOString(),
              unsubscribed_at: null,
            })
            .eq('id', existing.id);
          
          toast.success('Bem-vindo de volta! Seu cadastro foi reativado.');
          setSuccess(true);
          setLoading(false);
          return;
        }
      }

      const { error } = await (supabase as any)
        .from('newsletter_inscricoes')
        .insert({
          nome,
          email: email.toLowerCase(),
          telefone,
          data_nascimento: dataNascimento || null,
          empresa: empresa || null,
          cargo: cargo || null,
          ip_address: userIp,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Este e-mail já está cadastrado na newsletter!');
        } else {
          throw error;
        }
      } else {
        toast.success('Cadastro realizado com sucesso!');
        setSuccess(true);
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!unsubscribeEmail.trim()) {
      toast.error('Por favor, informe seu e-mail');
      return;
    }

    setLoading(true);
    setNotFoundError(false);
    try {
      const { data: existing } = await (supabase as any)
        .from('newsletter_inscricoes')
        .select('id, ativo')
        .eq('email', unsubscribeEmail.toLowerCase())
        .maybeSingle();

      if (!existing) {
        setNotFoundError(true);
        setLoading(false);
        return;
      }

      if (!existing.ativo) {
        toast.info('Este e-mail já foi descadastrado anteriormente.');
        setSuccess(true);
        setLoading(false);
        return;
      }

      await (supabase as any)
        .from('newsletter_inscricoes')
        .update({
          ativo: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      toast.success('Você foi descadastrado da newsletter.');
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao descadastrar:', error);
      toast.error('Erro ao realizar descadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso para cadastro
  if (success && action !== 'unsubscribe') {
    return (
      <div className="min-h-screen bg-background flex flex-col landing-page">
        <LandingHeader />
        <main className="flex-1">
          <section className="py-20 md:py-32">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-fade-in">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                  Cadastro Confirmado!
                </h1>
                <p className="text-xl text-muted-foreground mb-8 animate-fade-in">
                  Obrigado por se inscrever na nossa newsletter. Você receberá conteúdos exclusivos sobre SST diretamente no seu e-mail.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold">Fique atento!</span>
                  </div>
                  <p className="text-muted-foreground">
                    Você será notificado sempre que publicarmos novos artigos no blog ou lançarmos pesquisas de opinião.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                  <Button size="lg" asChild>
                    <Link to="/blog">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Explorar Blog
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/pesquisas">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Ver Pesquisas
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Tela de sucesso para descadastro
  if (success && action === 'unsubscribe') {
    return (
      <div className="min-h-screen bg-background flex flex-col landing-page">
        <LandingHeader />
        <main className="flex-1">
          <section className="py-20 md:py-32">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-8 animate-fade-in">
                  <XCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                  Descadastro Realizado
                </h1>
                <p className="text-xl text-muted-foreground mb-8 animate-fade-in">
                  Você foi removido da nossa lista de e-mails. Sentiremos sua falta!
                </p>
                <div className="bg-muted/50 rounded-2xl p-6 mb-8 animate-fade-in">
                  <p className="text-muted-foreground">
                    Mudou de ideia? Você pode se cadastrar novamente a qualquer momento.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                  <Button size="lg" asChild>
                    <Link to="/newsletter">
                      <Mail className="h-5 w-5 mr-2" />
                      Cadastrar Novamente
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/">
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Voltar ao Início
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Tela de descadastro
  if (action === 'unsubscribe') {
    return (
      <div className="min-h-screen bg-background flex flex-col landing-page">
        <LandingHeader />
        <main className="flex-1">
          <section className="py-20 md:py-32">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto">
                <Button variant="ghost" asChild className="mb-8">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao Início
                  </Link>
                </Button>

                {!showUnsubscribeConfirm ? (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-in">
                      <Mail className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                      Cancelar Inscrição
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
                      Informe seu e-mail para cancelar a inscrição na newsletter.
                    </p>
                    
                    <div className="bg-card border rounded-2xl p-8 animate-fade-in">
                      <div className="space-y-4">
                        <div className="space-y-2 text-left">
                          <Label htmlFor="email" className="text-base">Seu melhor e-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            value={unsubscribeEmail}
                            onChange={(e) => {
                              setUnsubscribeEmail(e.target.value);
                              setNotFoundError(false);
                            }}
                            placeholder="seu@email.com"
                            className="h-12 text-base"
                          />
                        </div>

                        {notFoundError && (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-left">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-amber-500">E-mail não encontrado</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Este e-mail não está cadastrado na nossa newsletter.
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                  Não deseja se cadastrar? Tudo bem! Mas se mudar de ideia, estamos aqui. 😊
                                </p>
                                <Button variant="link" asChild className="p-0 h-auto mt-2">
                                  <Link to="/newsletter">Quero me cadastrar!</Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => setShowUnsubscribeConfirm(true)}
                          variant="destructive"
                          size="lg"
                          className="w-full"
                          disabled={!unsubscribeEmail.trim()}
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-in">
                      <AlertTriangle className="h-10 w-10 text-amber-500" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                      Tem certeza?
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
                      Deseja realmente perder esse conteúdo de valor?
                    </p>
                    
                    <div className="bg-card border rounded-2xl p-8 animate-fade-in">
                      <div className="bg-muted/50 p-6 rounded-xl mb-6 text-left">
                        <p className="font-semibold mb-4">Você vai deixar de receber:</p>
                        <ul className="space-y-3">
                          <li className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <span>Dicas exclusivas sobre SST</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <span>Pesquisas e tendências do mercado</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <span>Conteúdos educativos</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <Gift className="h-5 w-5 text-primary" />
                            <span>Ofertas e novidades em primeira mão</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <Button
                          onClick={() => setShowUnsubscribeConfirm(false)}
                          size="lg"
                          className="w-full"
                        >
                          <Zap className="h-5 w-5 mr-2" />
                          Quero continuar recebendo!
                        </Button>
                        <Button
                          onClick={handleUnsubscribe}
                          variant="ghost"
                          size="lg"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={loading}
                        >
                          {loading ? 'Processando...' : 'Cancelar inscrição mesmo assim'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Tela de cadastro
  return (
    <div className="min-h-screen bg-background flex flex-col landing-page">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section - Estilo Landing Page */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          
          {/* Animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-up">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Fique por dentro das novidades</span>
              </div>
              
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight mb-6 animate-fade-up"
                style={{ animationDelay: '0.1s' }}
              >
                Cadastre-se na{' '}
                <span className="text-gradient">Newsletter</span>
              </h1>
              <p 
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up"
                style={{ animationDelay: '0.2s' }}
              >
                Receba conteúdos exclusivos sobre SST, dicas práticas, pesquisas de opinião e novidades diretamente no seu e-mail.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-12 md:py-16 relative">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 text-center hover:border-primary/50 transition-all hover:scale-105 animate-fade-up"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-12 md:py-20 relative">
          {/* Background orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="glass-card rounded-3xl p-8 md:p-12 shadow-2xl animate-fade-up" style={{ animationDelay: '0.4s' }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Preencha seus dados</h2>
                  <p className="text-muted-foreground">
                    Campos com * são obrigatórios
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-base">Nome *</Label>
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome completo"
                        className="h-12 text-base"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base">Seu melhor e-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-12 text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-base">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={handleTelefoneChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="h-12 text-base"
                      required
                    />
                  </div>

                  <div className="border-t pt-6">
                    <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Campos opcionais para personalizar sua experiência
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                        <Input
                          id="dataNascimento"
                          type="date"
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="empresa">Empresa</Label>
                        <Input
                          id="empresa"
                          value={empresa}
                          onChange={(e) => setEmpresa(e.target.value)}
                          placeholder="Nome da empresa"
                          className="h-12"
                        />
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                        id="cargo"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        placeholder="Seu cargo"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={loading}>
                    {loading ? (
                      'Cadastrando...'
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Cadastrar na Newsletter
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao se cadastrar, você concorda em receber nossos e-mails. 
                    Você pode cancelar a qualquer momento.
                  </p>
                </form>
              </div>

              <div className="mt-8 text-center">
                <p className="text-muted-foreground">
                  Já é inscrito e deseja cancelar?{' '}
                  <Link to="/newsletter?action=unsubscribe" className="text-primary hover:underline font-medium">
                    Cancelar inscrição
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
