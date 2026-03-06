import { Sparkles, ArrowRight, Shield, Zap, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingSolution = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="solucao" className="py-24 relative overflow-hidden noise-overlay">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Uma nova perspectiva</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Imagine uma abordagem{' '}
              <span className="text-gradient">completamente diferente</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sem revelar detalhes, apenas imagine: e se o sistema trabalhasse para você crescer, 
              não para te cobrar mais?
            </p>
          </div>

          {/* Teaser cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="glass-card rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Previsibilidade</h3>
              <p className="text-sm text-muted-foreground">
                Sem surpresas no final do mês. Sem reajustes inesperados.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Economia Real</h3>
              <p className="text-sm text-muted-foreground">
                O crescimento da sua empresa não aumenta seus custos operacionais.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Autonomia</h3>
              <p className="text-sm text-muted-foreground">
                Você no controle. Sem depender de terceiros para crescer.
              </p>
            </div>
          </div>

          {/* Curiosity hook */}
          <div className="glass-card rounded-3xl p-8 md:p-12 text-center border-primary/20">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              "A TORIQ não aluga software.<br/>
              <span className="text-gradient">Nós construímos arquitetura para crescimento previsível.</span>"
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Quer entender como transformar seu sistema em um ativo ao invés de um custo? 
              Agende uma conversa sem compromisso.
            </p>
            <Button 
              size="lg"
              onClick={() => scrollToSection('contato')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg h-auto group"
            >
              Descobrir como funciona
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingSolution;
