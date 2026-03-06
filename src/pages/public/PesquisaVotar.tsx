import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { PublicPageCTA } from '@/components/shared/PublicPageCTA';
import '@/components/landing/landing.css';
import { 
  ArrowLeft,
  Shield,
  CheckCircle2,
  Users,
  ExternalLink,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  ChevronDown,
  User,
  Building2,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';

interface Pesquisa {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  tipo: string;
  permite_multiplas_respostas: boolean;
  anonima: boolean;
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

interface Opcao {
  id: string;
  texto: string;
  votos: number;
  ordem: number;
}

const SESSION_KEY = 'pesquisa_session_id';

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export default function PesquisaVotar() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Form state
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textoLivre, setTextoLivre] = useState('');
  const [escalaValue, setEscalaValue] = useState<number | null>(null);
  
  // Campos opcionais
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cargo, setCargo] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sistemaAtual, setSistemaAtual] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [userIp, setUserIp] = useState<string | null>(null);

  // Função para formatar telefone
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

  // Função para formatar CNPJ
  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    if (formatted.length <= 18) {
      setCnpj(formatted);
    }
  };

  // Validar data de nascimento (máximo 120 anos)
  const getMinDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    return date.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 16); // Mínimo 16 anos
    return date.toISOString().split('T')[0];
  };

  const sessionId = getSessionId();

  useEffect(() => {
    if (slug) {
      fetchPesquisaWithIpCheck();
    }
  }, [slug]);

  const fetchPesquisaWithIpCheck = async () => {
    setLoading(true);
    try {
      // Buscar IP primeiro
      let currentIp: string | null = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        currentIp = ipData.ip;
        setUserIp(currentIp);
      } catch {
        // Se falhar, continua sem IP
      }

      // Buscar pesquisa
      const { data: pesquisaData, error } = await (supabase as any)
        .from('pesquisas_opiniao')
        .select(`
          *,
          categoria:blog_categorias(nome, cor),
          autor:blog_autores(nome, sobrenome)
        `)
        .eq('slug', slug)
        .eq('status', 'aberta')
        .single();

      if (error || !pesquisaData) {
        navigate('/pesquisas');
        return;
      }

      setPesquisa(pesquisaData);

      // Buscar opções
      const { data: opcoesData } = await (supabase as any)
        .from('pesquisas_opcoes')
        .select('*')
        .eq('pesquisa_id', pesquisaData.id)
        .order('ordem');

      setOpcoes(opcoesData || []);

      // Verificar se já votou por session_id
      const { data: votoBySession } = await (supabase as any)
        .from('pesquisas_votos')
        .select('id')
        .eq('pesquisa_id', pesquisaData.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (votoBySession) {
        setHasVoted(true);
        setShowResults(true);
        return;
      }

      // Verificar se já votou por IP
      if (currentIp) {
        const { data: votoByIp } = await (supabase as any)
          .from('pesquisas_votos')
          .select('id')
          .eq('pesquisa_id', pesquisaData.id)
          .eq('ip_address', currentIp)
          .maybeSingle();

        if (votoByIp) {
          setHasVoted(true);
          setShowResults(true);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pesquisa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!pesquisa) return;

    // Validação
    if (pesquisa.tipo === 'multipla_escolha') {
      if (pesquisa.permite_multiplas_respostas) {
        if (selectedOptions.length === 0) {
          toast.error('Selecione pelo menos uma opção');
          return;
        }
      } else {
        if (!selectedOption) {
          toast.error('Selecione uma opção');
          return;
        }
      }
    } else if (pesquisa.tipo === 'sim_nao' && !selectedOption) {
      toast.error('Selecione uma opção');
      return;
    } else if (pesquisa.tipo === 'escala' && escalaValue === null) {
      toast.error('Selecione um valor na escala');
      return;
    } else if (pesquisa.tipo === 'texto_livre' && !textoLivre.trim()) {
      toast.error('Digite sua resposta');
      return;
    }

    setSubmitting(true);
    try {
      // Verificar novamente se já votou antes de enviar
      const { data: votoExistente } = await (supabase as any)
        .from('pesquisas_votos')
        .select('id')
        .eq('pesquisa_id', pesquisa.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (votoExistente) {
        toast.error('Você já votou nesta pesquisa');
        setHasVoted(true);
        setShowResults(true);
        setSubmitting(false);
        fetchPesquisaWithIpCheck();
        return;
      }

      // Determinar opção selecionada
      let opcaoId = null;
      let respostaTexto = null;

      if (pesquisa.tipo === 'multipla_escolha') {
        if (pesquisa.permite_multiplas_respostas) {
          // Para múltiplas respostas, a inserção é feita abaixo com os dados opcionais
        } else {
          opcaoId = selectedOption;
        }
      } else if (pesquisa.tipo === 'sim_nao') {
        opcaoId = selectedOption;
      } else if (pesquisa.tipo === 'escala') {
        // Para escala, encontrar a opção correspondente
        const opcaoEscala = opcoes.find(o => parseInt(o.texto) === escalaValue);
        opcaoId = opcaoEscala?.id;
      } else if (pesquisa.tipo === 'texto_livre') {
        respostaTexto = textoLivre;
      }

      // Dados do voto com campos opcionais
      const votoData = {
        pesquisa_id: pesquisa.id,
        opcao_id: opcaoId,
        resposta_texto: respostaTexto,
        session_id: sessionId,
        ip_address: userIp,
        user_agent: navigator.userAgent,
        nome: nome || null,
        email: email || null,
        telefone: telefone || null,
        empresa: empresa || null,
        cnpj: cnpj || null,
        cargo: cargo || null,
        data_nascimento: dataNascimento || null,
        sistema_atual: sistemaAtual || null,
        mensagem: mensagem || null,
      };

      // Inserir voto (se não for múltiplas respostas)
      if (!pesquisa.permite_multiplas_respostas || pesquisa.tipo !== 'multipla_escolha') {
        const { error } = await (supabase as any)
          .from('pesquisas_votos')
          .insert(votoData);

        if (error) {
          if (error.code === '23505') {
            toast.error('Você já votou nesta pesquisa');
            setHasVoted(true);
            setShowResults(true);
            return;
          }
          throw error;
        }
      } else {
        // Para múltiplas respostas, inserir com os dados opcionais
        for (const opcId of selectedOptions) {
          await (supabase as any)
            .from('pesquisas_votos')
            .insert({
              ...votoData,
              opcao_id: opcId,
            });
        }
      }

      toast.success('Voto registrado com sucesso!');
      setHasVoted(true);
      setShowResults(true);
      
      // Recarregar dados para mostrar resultados atualizados
      fetchPesquisaWithIpCheck();
    } catch (error) {
      console.error('Erro ao votar:', error);
      toast.error('Erro ao registrar voto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = pesquisa?.titulo || 'Pesquisa de Opinião';
    
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

  const getPercentage = (votos: number) => {
    const total = opcoes.reduce((sum, o) => sum + o.votos, 0);
    if (total === 0) return 0;
    return Math.round((votos / total) * 100);
  };

  if (loading) {
    return (
      <div className="landing-page min-h-screen">
        <LandingHeader />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-muted-foreground">Carregando pesquisa...</div>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (!pesquisa) {
    return null;
  }

  const totalVotos = opcoes.reduce((sum, o) => sum + o.votos, 0);

  return (
    <HelmetProvider>
      <Helmet>
        <title>{pesquisa.titulo} - Pesquisa de Opinião | TORIQ</title>
        <meta name="description" content={pesquisa.descricao || `Participe da pesquisa: ${pesquisa.titulo}`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={`${pesquisa.titulo} - Pesquisa de Opinião`} />
        <meta property="og:description" content={pesquisa.descricao || 'Participe e dê sua opinião!'} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://toriq.com.br/pesquisas/${pesquisa.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: pesquisa.titulo,
            description: pesquisa.descricao,
            url: `https://toriq.com.br/pesquisas/${pesquisa.slug}`,
          })}
        </script>
      </Helmet>

      <div className="landing-page min-h-screen">
        <LandingHeader />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              {/* Back button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/pesquisas')}
                className="mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar às Pesquisas
              </Button>

              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  {pesquisa.categoria && (
                    <Badge style={{ backgroundColor: pesquisa.categoria.cor }}>
                      {pesquisa.categoria.nome}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold mb-4">
                  {pesquisa.titulo}
                </h1>

                {pesquisa.descricao && (
                  <p className="text-muted-foreground">
                    {pesquisa.descricao}
                  </p>
                )}

                {pesquisa.autor && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Por {pesquisa.autor.nome} {pesquisa.autor.sobrenome}
                  </p>
                )}
              </div>

              {/* LGPD Notice */}
              <Card className="mb-6 border-green-500/30 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Pesquisa 100% Anônima
                      </p>
                      <p className="text-muted-foreground">
                        Esta pesquisa segue as diretrizes da{' '}
                        <a 
                          href="https://pt.wikipedia.org/wiki/Lei_Geral_de_Prote%C3%A7%C3%A3o_de_Dados_Pessoais"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          LGPD <ExternalLink className="h-3 w-3" />
                        </a>
                        . Seus dados são utilizados apenas para fins estatísticos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voting Form or Results */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {showResults ? 'Resultados' : 'Sua Resposta'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showResults ? (
                    /* Resultados */
                    <div className="space-y-4">
                      {hasVoted && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 mb-4">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Seu voto foi registrado!</span>
                        </div>
                      )}

                      {opcoes.map((opcao) => {
                        const percentage = getPercentage(opcao.votos);
                        return (
                          <div key={opcao.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{opcao.texto}</span>
                              <span className="text-muted-foreground">
                                {opcao.votos} ({percentage}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-3" />
                          </div>
                        );
                      })}

                      <p className="text-sm text-muted-foreground text-center pt-4">
                        Total de {totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}
                      </p>
                    </div>
                  ) : (
                    /* Formulário de Votação */
                    <div className="space-y-6">
                      {pesquisa.tipo === 'multipla_escolha' && !pesquisa.permite_multiplas_respostas && (
                        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                          {opcoes.map((opcao) => (
                            <div key={opcao.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value={opcao.id} id={opcao.id} />
                              <Label htmlFor={opcao.id} className="flex-1 cursor-pointer">
                                {opcao.texto}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {pesquisa.tipo === 'multipla_escolha' && pesquisa.permite_multiplas_respostas && (
                        <div className="space-y-3">
                          {opcoes.map((opcao) => (
                            <div key={opcao.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <Checkbox 
                                id={opcao.id}
                                checked={selectedOptions.includes(opcao.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOptions([...selectedOptions, opcao.id]);
                                  } else {
                                    setSelectedOptions(selectedOptions.filter(id => id !== opcao.id));
                                  }
                                }}
                              />
                              <Label htmlFor={opcao.id} className="flex-1 cursor-pointer">
                                {opcao.texto}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {pesquisa.tipo === 'sim_nao' && (
                        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                          {opcoes.map((opcao) => (
                            <div key={opcao.id} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value={opcao.id} id={opcao.id} />
                              <Label htmlFor={opcao.id} className="flex-1 cursor-pointer text-lg">
                                {opcao.texto}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {pesquisa.tipo === 'escala' && (
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setEscalaValue(n)}
                              className={`w-12 h-12 rounded-lg border-2 font-bold transition-all ${
                                escalaValue === n 
                                  ? 'border-primary bg-primary text-primary-foreground' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      )}

                      {pesquisa.tipo === 'texto_livre' && (
                        <Textarea
                          value={textoLivre}
                          onChange={(e) => setTextoLivre(e.target.value)}
                          placeholder="Digite sua resposta..."
                          rows={4}
                        />
                      )}

                      {/* Campos Opcionais */}
                      <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Informações adicionais (opcional)
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                          <p className="text-xs text-muted-foreground mb-4">
                            Estes campos são totalmente opcionais e ajudam a enriquecer nossa análise estatística.
                          </p>
                          
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nome" className="text-sm">Nome</Label>
                              <Input
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Seu nome"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-sm">E-mail</Label>
                              <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="telefone" className="text-sm">Telefone</Label>
                              <Input
                                id="telefone"
                                value={telefone}
                                onChange={handleTelefoneChange}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="empresa" className="text-sm">Empresa</Label>
                              <Input
                                id="empresa"
                                value={empresa}
                                onChange={(e) => setEmpresa(e.target.value)}
                                placeholder="Nome da empresa"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cnpj" className="text-sm">CNPJ</Label>
                              <Input
                                id="cnpj"
                                value={cnpj}
                                onChange={handleCnpjChange}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cargo" className="text-sm">Cargo</Label>
                              <Input
                                id="cargo"
                                value={cargo}
                                onChange={(e) => setCargo(e.target.value)}
                                placeholder="Seu cargo"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="dataNascimento" className="text-sm">Data de Nascimento</Label>
                              <Input
                                id="dataNascimento"
                                type="date"
                                value={dataNascimento}
                                onChange={(e) => setDataNascimento(e.target.value)}
                                min={getMinDate()}
                                max={getMaxDate()}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sistema" className="text-sm">Sistema Atual</Label>
                              <Input
                                id="sistema"
                                value={sistemaAtual}
                                onChange={(e) => setSistemaAtual(e.target.value)}
                                placeholder="Sistema que você usa"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="mensagem" className="text-sm">Mensagem / Comentário</Label>
                            <Textarea
                              id="mensagem"
                              value={mensagem}
                              onChange={(e) => setMensagem(e.target.value)}
                              placeholder="Deixe um comentário adicional..."
                              rows={3}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Button 
                        onClick={handleVote} 
                        disabled={submitting}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? 'Enviando...' : 'Enviar Voto'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Share */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">Compartilhe esta pesquisa</p>
                <div className="flex items-center justify-center gap-2">
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
              </div>
            </div>
          </div>

          {/* CTAs */}
          <PublicPageCTA 
            showPesquisas={true}
            showBlog={true}
            showEspecialista={true}
            title="Continue explorando"
            subtitle="Descubra mais conteúdos e recursos da TORIQ"
          />
        </main>

        <LandingFooter />
      </div>
    </HelmetProvider>
  );
}
