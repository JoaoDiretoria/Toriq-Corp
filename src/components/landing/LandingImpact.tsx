import { useState, useEffect, useRef } from 'react';
import { Calculator } from 'lucide-react';

const LandingImpact = () => {
  const [yearsCount, setYearsCount] = useState(0);
  const [multiplierCount, setMultiplierCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const yearsInterval = setInterval(() => {
      setYearsCount(prev => {
        if (prev >= 10) {
          clearInterval(yearsInterval);
          return 10;
        }
        return prev + 1;
      });
    }, 100);

    const multiplierInterval = setInterval(() => {
      setMultiplierCount(prev => {
        if (prev >= 300) {
          clearInterval(multiplierInterval);
          return 300;
        }
        return prev + 15;
      });
    }, 50);

    return () => {
      clearInterval(yearsInterval);
      clearInterval(multiplierInterval);
    };
  }, [isVisible]);

  return (
    <section id="impacto" ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-background to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold tracking-widest uppercase mb-4 block">
              O Impacto Real
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Faça as contas e{' '}
              <span className="text-gradient">assuste-se</span>
            </h2>
          </div>

          {/* Calculator visualization */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Numbers */}
            <div className="space-y-8">
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-destructive/20 flex items-center justify-center">
                    <Calculator className="w-7 h-7 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Em {yearsCount} anos de uso</h3>
                    <p className="text-muted-foreground text-sm">Projeção baseada em dados reais</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-border/50 pb-4">
                    <span className="text-muted-foreground">Custo inicial anual</span>
                    <span className="text-2xl font-bold">R$ X</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border/50 pb-4">
                    <span className="text-muted-foreground">Reajustes acumulados</span>
                    <span className="text-2xl font-bold text-destructive">+{multiplierCount}%</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border/50 pb-4">
                    <span className="text-muted-foreground">Patrimônio acumulado</span>
                    <span className="text-2xl font-bold">R$ 0</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-lg font-semibold">Total investido</span>
                    <span className="text-3xl font-bold text-primary">R$ XXXXX</span>
                  </div>
                </div>
              </div>

              <p className="text-center text-muted-foreground italic">
                * Os valores variam conforme cada empresa. Mas o padrão é o mesmo.
              </p>
            </div>

            {/* Right: Impact statement */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-8 border-destructive/30">
                <h3 className="text-2xl font-bold mb-4">O que você tem no final?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Nenhum ativo</strong> — o sistema continua sendo do fornecedor
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Margem reduzida</strong> — seus custos operacionais só aumentam
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Dependência total</strong> — o fornecedor controla seu ritmo
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Crescimento limitado</strong> — cada novo cliente custa mais
                    </span>
                  </li>
                </ul>
              </div>

              <div className="glass-card rounded-2xl p-6 border-primary/30">
                <p className="text-lg font-semibold text-center">
                  E se existisse uma forma de{' '}
                  <span className="text-gradient">inverter essa lógica</span>?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingImpact;
