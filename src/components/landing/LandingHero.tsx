import { Button } from '@/components/ui/button';
import { ArrowDown, AlertTriangle } from 'lucide-react';
import heroBg from '@/assets/landing/hero-bg.png';

const LandingHero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-up">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Exclusivo para empresas de SST
            </span>
          </div>

          {/* Headline */}
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight mb-6 animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            Você está{' '}
            <span className="text-gradient">pagando</span>
            {' '}para usar um sistema que{' '}
            <span className="text-gradient">nunca</span>
            {' '}será seu.
          </h1>

          {/* Subheadline */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            Mensalidades que só aumentam. Custo por usuário. Custo por vida. 
            Aumentos anuais. E no final, você fica refém de uma ferramenta que 
            limita seu crescimento.
          </p>

          {/* Stats */}
          <div 
            className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12 animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">87%</div>
              <div className="text-sm text-muted-foreground">das empresas SST<br/>sentem-se reféns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">3x</div>
              <div className="text-sm text-muted-foreground">aumento médio em<br/>5 anos de uso</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">R$ 0</div>
              <div className="text-sm text-muted-foreground">de patrimônio<br/>ao final</div>
            </div>
          </div>

          {/* CTA */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up"
            style={{ animationDelay: '0.4s' }}
          >
            <Button 
              size="lg"
              onClick={() => scrollToSection('contato')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg h-auto"
            >
              Quero entender minha situação
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('dores')}
              className="border-primary/30 text-foreground hover:bg-primary/10 px-8 py-6 text-lg h-auto"
            >
              Ver o diagnóstico
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float cursor-pointer"
          onClick={() => scrollToSection('dores')}
        >
          <ArrowDown className="w-6 h-6 text-primary" />
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
