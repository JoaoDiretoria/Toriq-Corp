import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Send,
  Users,
  Sparkles,
  GraduationCap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Star,
  User,
  Building,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { PublicPageCTA } from '@/components/shared/PublicPageCTA';
import '@/components/landing/landing.css';

interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  requisitos: string;
  beneficios: string;
  tipo_contrato: string;
  modalidade: string;
  local: string;
  salario_faixa: string;
  exibir_salario: boolean;
  created_at: string;
}

interface Formacao {
  id: string;
  instituicao: string;
  curso: string;
  status: string;
  data_inicio: string;
  data_fim: string;
}

interface Curso {
  id: string;
  nome: string;
  instituicao: string;
  carga_horaria: string;
  data_conclusao: string;
}

interface Experiencia {
  id: string;
  empresa: string;
  cargo: string;
  periodo: string;
  descricao: string;
}

const grausEscolaridade = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Técnico Incompleto',
  'Ensino Técnico Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-Graduação Incompleta',
  'Pós-Graduação Completa',
  'Mestrado Incompleto',
  'Mestrado Completo',
  'Doutorado Incompleto',
  'Doutorado Completo',
];

const statusFormacao = [
  'Em Andamento',
  'Finalizado',
  'Trancado',
  'Abandonado',
];

export default function TrabalheConosco() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loadingVagas, setLoadingVagas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedVaga, setExpandedVaga] = useState<string | null>(null);
  const [selectedVagaId, setSelectedVagaId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Form fields
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [grauEscolaridade, setGrauEscolaridade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Formações (faculdade)
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);

  // Cursos
  const [cursos, setCursos] = useState<Curso[]>([]);

  // Experiências profissionais
  const [experiencias, setExperiencias] = useState<Experiencia[]>([]);

  // Sobre você / Diferenciais
  const [sobreVoce, setSobreVoce] = useState('');
  const [diferenciais, setDiferenciais] = useState('');

  useEffect(() => {
    fetchVagas();
  }, []);

  const fetchVagas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('vagas')
        .select('*')
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
    } finally {
      setLoadingVagas(false);
    }
  };

  const formatTelefone = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  };

  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setLogradouro(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setEstado(data.uf || '');
      setComplemento(data.complemento || '');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const addFormacao = () => {
    setFormacoes([...formacoes, {
      id: crypto.randomUUID(),
      instituicao: '',
      curso: '',
      status: '',
      data_inicio: '',
      data_fim: '',
    }]);
  };

  const removeFormacao = (id: string) => {
    setFormacoes(formacoes.filter(f => f.id !== id));
  };

  const updateFormacao = (id: string, field: keyof Formacao, value: string) => {
    setFormacoes(formacoes.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addCurso = () => {
    setCursos([...cursos, {
      id: crypto.randomUUID(),
      nome: '',
      instituicao: '',
      carga_horaria: '',
      data_conclusao: '',
    }]);
  };

  const removeCurso = (id: string) => {
    setCursos(cursos.filter(c => c.id !== id));
  };

  const updateCurso = (id: string, field: keyof Curso, value: string) => {
    setCursos(cursos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addExperiencia = () => {
    setExperiencias([...experiencias, {
      id: crypto.randomUUID(),
      empresa: '',
      cargo: '',
      periodo: '',
      descricao: '',
    }]);
  };

  const removeExperiencia = (id: string) => {
    setExperiencias(experiencias.filter(e => e.id !== id));
  };

  const updateExperiencia = (id: string, field: keyof Experiencia, value: string) => {
    setExperiencias(experiencias.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async () => {
    if (!nomeCompleto.trim()) {
      toast.error('Informe seu nome completo');
      return;
    }
    if (!email.trim()) {
      toast.error('Informe seu e-mail');
      return;
    }
    if (!telefone.trim()) {
      toast.error('Informe seu telefone');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('candidaturas')
        .insert({
          vaga_id: selectedVagaId || null,
          nome_completo: nomeCompleto.trim(),
          data_nascimento: dataNascimento || null,
          email: email.trim(),
          telefone: telefone.trim(),
          cep: cep.replace(/\D/g, '') || null,
          logradouro: logradouro.trim() || null,
          numero: numero.trim() || null,
          complemento: complemento.trim() || null,
          bairro: bairro.trim() || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          grau_escolaridade: grauEscolaridade || null,
          formacoes: formacoes.map(({ id, ...rest }) => rest),
          cursos: cursos.map(({ id, ...rest }) => rest),
          experiencias: experiencias.map(({ id, ...rest }) => rest),
          sobre_voce: sobreVoce.trim() || null,
          diferenciais: diferenciais.trim() || null,
          observacoes: observacoes.trim() || null,
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Candidatura enviada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar candidatura:', error);
      toast.error('Erro ao enviar candidatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="landing-page min-h-screen">
        <LandingHeader />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="glass-card text-center p-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Candidatura Enviada!</h2>
              <p className="text-muted-foreground mb-6">
                Recebemos seus dados com sucesso. Nossa equipe analisará seu perfil e, caso haja uma oportunidade compatível, entraremos em contato.
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Voltar ao Início
              </Button>
            </Card>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen">
      <LandingHeader />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Faça parte do time</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Trabalhe <span className="text-gradient">Conosco</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Confira nossas vagas em aberto ou cadastre-se no nosso banco de talentos.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-4xl space-y-12">
          {/* Vagas */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Vagas em Aberto</h2>
            </div>

            {loadingVagas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : vagas.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma vaga em aberto no momento</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Não encontrou uma vaga? Cadastre-se no nosso banco de talentos abaixo. Quando surgir uma oportunidade compatível com seu perfil, entraremos em contato.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {vagas.map((vaga) => (
                  <Card key={vaga.id} className="glass-card hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{vaga.titulo}</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {vaga.tipo_contrato && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {vaga.tipo_contrato}
                              </Badge>
                            )}
                            {vaga.modalidade && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {vaga.modalidade}
                              </Badge>
                            )}
                            {vaga.local && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {vaga.local}
                              </Badge>
                            )}
                            {vaga.salario_faixa && vaga.exibir_salario !== false && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {vaga.salario_faixa}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedVaga(expandedVaga === vaga.id ? null : vaga.id)}
                        >
                          {expandedVaga === vaga.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      {expandedVaga === vaga.id && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          {vaga.descricao && (
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Descrição</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{vaga.descricao}</p>
                            </div>
                          )}
                          {vaga.requisitos && (
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Requisitos</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{vaga.requisitos}</p>
                            </div>
                          )}
                          {vaga.beneficios && (
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Benefícios</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{vaga.beneficios}</p>
                            </div>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedVagaId(vaga.id);
                              setFormOpen(true);
                              setTimeout(() => {
                                document.getElementById('formulario-candidatura')?.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Candidatar-se a esta vaga
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Formulário de Candidatura / Banco de Talentos */}
          <section id="formulario-candidatura">
            <Collapsible open={formOpen || !!selectedVagaId} onOpenChange={setFormOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full glass-card rounded-xl p-6 flex items-center justify-between hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Send className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold">
                        {selectedVagaId ? 'Candidatar-se' : 'Banco de Talentos'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedVagaId
                          ? `Candidatura para: ${vagas.find(v => v.id === selectedVagaId)?.titulo}`
                          : 'Não encontrou uma vaga? Cadastre-se e entraremos em contato'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${(formOpen || !!selectedVagaId) ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4">
                {selectedVagaId && (
                  <div className="mb-4">
                    <Button variant="outline" size="sm" onClick={() => setSelectedVagaId(null)}>
                      Cancelar candidatura específica — enviar para banco de talentos
                    </Button>
                  </div>
                )}

                <Card className="glass-card">
              <CardContent className="p-6 space-y-6">
                {/* Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone *</Label>
                      <Input
                        value={telefone}
                        onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input
                          value={cep}
                          onChange={(e) => {
                            const formatted = formatCep(e.target.value);
                            setCep(formatted);
                            if (formatted.replace(/\D/g, '').length === 8) {
                              buscarCep(formatted);
                            }
                          }}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {buscandoCep && (
                          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label>Logradouro</Label>
                      <Input
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        placeholder="Rua, Avenida..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Número</Label>
                      <Input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="Nº"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Complemento</Label>
                      <Input
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Apto, Bloco..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bairro</Label>
                      <Input
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cidade</Label>
                      <Input
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Input
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Escolaridade */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Escolaridade
                  </h3>
                  <div className="space-y-1.5">
                    <Label>Grau de Escolaridade</Label>
                    <Select value={grauEscolaridade} onValueChange={setGrauEscolaridade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {grausEscolaridade.map((grau) => (
                          <SelectItem key={grau} value={grau}>{grau}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Formações (Faculdade) */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Formação Acadêmica
                    </h3>
                    <Button variant="outline" size="sm" onClick={addFormacao}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {formacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma formação adicionada. Clique em "Adicionar" para incluir.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {formacoes.map((formacao, index) => (
                        <Card key={formacao.id} className="border-dashed">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Formação {index + 1}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeFormacao(formacao.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Instituição</Label>
                                <Input
                                  value={formacao.instituicao}
                                  onChange={(e) => updateFormacao(formacao.id, 'instituicao', e.target.value)}
                                  placeholder="Nome da instituição"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Curso</Label>
                                <Input
                                  value={formacao.curso}
                                  onChange={(e) => updateFormacao(formacao.id, 'curso', e.target.value)}
                                  placeholder="Nome do curso"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Status</Label>
                                <Select value={formacao.status} onValueChange={(v) => updateFormacao(formacao.id, 'status', v)}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusFormacao.map((s) => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Início</Label>
                                  <Input
                                    type="date"
                                    value={formacao.data_inicio}
                                    onChange={(e) => updateFormacao(formacao.id, 'data_inicio', e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Fim</Label>
                                  <Input
                                    type="date"
                                    value={formacao.data_fim}
                                    onChange={(e) => updateFormacao(formacao.id, 'data_fim', e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cursos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Cursos Complementares
                    </h3>
                    <Button variant="outline" size="sm" onClick={addCurso}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {cursos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum curso adicionado. Clique em "Adicionar" para incluir.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {cursos.map((curso, index) => (
                        <Card key={curso.id} className="border-dashed">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Curso {index + 1}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeCurso(curso.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Nome do Curso</Label>
                                <Input
                                  value={curso.nome}
                                  onChange={(e) => updateCurso(curso.id, 'nome', e.target.value)}
                                  placeholder="Nome do curso"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Instituição</Label>
                                <Input
                                  value={curso.instituicao}
                                  onChange={(e) => updateCurso(curso.id, 'instituicao', e.target.value)}
                                  placeholder="Onde realizou"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Carga Horária</Label>
                                <Input
                                  value={curso.carga_horaria}
                                  onChange={(e) => updateCurso(curso.id, 'carga_horaria', e.target.value)}
                                  placeholder="Ex: 40h"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Data de Conclusão</Label>
                                <Input
                                  type="date"
                                  value={curso.data_conclusao}
                                  onChange={(e) => updateCurso(curso.id, 'data_conclusao', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sobre Você */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Sobre Você
                  </h3>
                  <Textarea
                    value={sobreVoce}
                    onChange={(e) => setSobreVoce(e.target.value)}
                    placeholder="Conte um pouco sobre você, seus objetivos profissionais, o que te motiva..."
                    rows={4}
                  />
                </div>

                {/* Experiência Profissional */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      Experiência Profissional
                    </h3>
                    <Button variant="outline" size="sm" onClick={addExperiencia}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {experiencias.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma experiência adicionada. Clique em "Adicionar" para incluir.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {experiencias.map((exp, index) => (
                        <Card key={exp.id} className="border-dashed">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Experiência {index + 1}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeExperiencia(exp.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Empresa</Label>
                                <Input
                                  value={exp.empresa}
                                  onChange={(e) => updateExperiencia(exp.id, 'empresa', e.target.value)}
                                  placeholder="Nome da empresa"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Cargo</Label>
                                <Input
                                  value={exp.cargo}
                                  onChange={(e) => updateExperiencia(exp.id, 'cargo', e.target.value)}
                                  placeholder="Cargo exercido"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Período</Label>
                                <Input
                                  value={exp.periodo}
                                  onChange={(e) => updateExperiencia(exp.id, 'periodo', e.target.value)}
                                  placeholder="Ex: Jan/2020 - Dez/2023"
                                  className="h-9"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs">Descrição das atividades</Label>
                                <Textarea
                                  value={exp.descricao}
                                  onChange={(e) => updateExperiencia(exp.id, 'descricao', e.target.value)}
                                  placeholder="Descreva suas principais atividades e responsabilidades..."
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Diferenciais */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Diferenciais
                  </h3>
                  <Textarea
                    value={diferenciais}
                    onChange={(e) => setDiferenciais(e.target.value)}
                    placeholder="O que te diferencia dos demais candidatos? Habilidades, conquistas, idiomas..."
                    rows={4}
                  />
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Informações adicionais, pretensão salarial..."
                    rows={3}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {selectedVagaId ? 'Enviar Candidatura' : 'Cadastrar no Banco de Talentos'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>

        {/* CTA */}
        <PublicPageCTA
          showBlog
          showPesquisas
          showContato={false}
          showEspecialista
          title="Continue explorando"
          subtitle="Participe de pesquisas e fale com nossos especialistas"
        />
      </main>

      <LandingFooter />
    </div>
  );
}
