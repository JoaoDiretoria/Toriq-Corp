import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Send, MessageCircle, Calendar, CheckCircle, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LandingContactForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCnpj, setShowCnpj] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    segment: '',
    message: '',
    cnpj: ''
  });

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('leads_landing')
        .insert({
          nome: formData.name,
          empresa: formData.company,
          email: formData.email,
          telefone: formData.phone,
          segmento: formData.segment || null,
          mensagem: formData.message || null,
          cnpj: formData.cnpj || null
        });

      if (error) throw error;

      setSubmitted(true);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (submitted) {
    return (
      <section id="contato" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-xl mx-auto text-center glass-card rounded-3xl p-12">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Recebemos seu contato!</h3>
            <p className="text-muted-foreground mb-6">
              Nossa equipe entrará em contato em até 24 horas para agendar uma conversa 
              e entender melhor sua situação atual.
            </p>
            <p className="text-sm text-primary">
              Fique atento ao seu e-mail e WhatsApp.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contato" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Info */}
            <div>
              <span className="text-primary text-sm font-semibold tracking-widest uppercase mb-4 block">
                Próximo Passo
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Vamos conversar sobre o{' '}
                <span className="text-gradient">futuro da sua empresa</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Não é uma ligação de vendas. É um diagnóstico gratuito para entender 
                sua situação atual e mostrar se existe um caminho melhor para você.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Conversa Personalizada</h4>
                    <p className="text-sm text-muted-foreground">Entendemos seu contexto específico</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Resposta em 24h</h4>
                    <p className="text-sm text-muted-foreground">Retornamos rapidamente para agendar</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="glass-card rounded-3xl p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Seu nome *</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Como podemos te chamar?"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Empresa *</label>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Nome da empresa"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">E-mail *</label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">WhatsApp *</label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Segmento</label>
                  <select
                    name="segment"
                    value={formData.segment}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/50 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  >
                    <option value="">Selecione seu segmento</option>
                    <option value="consultoria">Consultoria de SST</option>
                    <option value="assessoria">Assessoria / Auditoria</option>
                    <option value="treinamentos">Empresa de Treinamentos</option>
                    <option value="clinica">Clínica Ocupacional</option>
                    <option value="interno">Equipe interna de SST</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Toggle para informar CNPJ */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-background/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Informar CNPJ da empresa</p>
                      <p className="text-xs text-muted-foreground">Opcional - para proposta personalizada</p>
                    </div>
                  </div>
                  <Switch
                    checked={showCnpj}
                    onCheckedChange={setShowCnpj}
                  />
                </div>

                {/* Campo CNPJ */}
                {showCnpj && (
                  <div className="animate-fade-in">
                    <label className="text-sm font-medium mb-2 block">CNPJ</label>
                    <Input
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCnpj(e.target.value) }))}
                      placeholder="00.000.000/0000-00"
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Conte um pouco sobre sua situação atual</label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Quais sistemas usa hoje? Quais suas maiores frustrações?"
                    rows={4}
                    className="bg-background/50 border-border/50 focus:border-primary resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg h-auto group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Quero receber o diagnóstico
                      <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Seus dados estão seguros. Não compartilhamos com terceiros.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingContactForm;
