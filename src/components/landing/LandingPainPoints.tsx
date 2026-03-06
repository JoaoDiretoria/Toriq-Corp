import { DollarSign, TrendingUp, Lock, Clock, Users, AlertCircle } from 'lucide-react';

const pains = [
  {
    icon: DollarSign,
    title: "Mensalidades Infinitas",
    description: "Você paga todo mês por um sistema que nunca será seu. É como pagar aluguel eterno por algo que você nunca vai possuir.",
    highlight: "Custo sem fim"
  },
  {
    icon: TrendingUp,
    title: "Quanto Mais Cresce, Mais Caro",
    description: "Cobrança por usuário? Por vida ativa? Seu sucesso vira seu maior custo. O sistema cresce junto com sua empresa... e a conta também.",
    highlight: "Crescimento = Custo"
  },
  {
    icon: Lock,
    title: "Refém do Fornecedor",
    description: "Seus dados estão lá. Seus processos dependem dele. Trocar? Quase impossível. Você trabalha para pagar o sistema.",
    highlight: "Sem liberdade"
  },
  {
    icon: Clock,
    title: "Aumentos Anuais Garantidos",
    description: "Todo ano a mesma história: reajuste de 10%, 15%, 20%... E você aceita porque não tem escolha.",
    highlight: "Inflação forçada"
  },
  {
    icon: Users,
    title: "Sistema Engessado",
    description: "Quer uma funcionalidade específica? Quer integrar com outro sistema? Quer personalizar? Pague mais. Ou espere... eternamente.",
    highlight: "Limitações constantes"
  },
  {
    icon: AlertCircle,
    title: "Zero Patrimônio",
    description: "Após anos pagando, o que sobra? Nada. O sistema continua sendo deles. Você só tem... faturas pagas.",
    highlight: "Investimento perdido"
  }
];

const LandingPainPoints = () => {
  return (
    <section id="dores" className="py-24 relative overflow-hidden noise-overlay">
      {/* Background effects */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-dark-lighter/50 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-sm font-semibold tracking-widest uppercase mb-4 block">
            O Diagnóstico
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Reconhece alguma{' '}
            <span className="text-gradient">dessas dores</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            Se você trabalha com SST, provavelmente já sentiu pelo menos uma dessas frustrações. 
            A questão é: até quando você vai aceitar isso?
          </p>
        </div>

        {/* Pain cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pains.map((pain, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl glass-card hover:border-primary/30 transition-all duration-500 hover:scale-[1.02] hover:glow-subtle"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Highlight badge */}
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                  {pain.highlight}
                </span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors mt-2">
                <pain.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                {pain.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {pain.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom emphasis */}
        <div className="mt-16 text-center">
          <div className="inline-block p-8 rounded-2xl glass-card max-w-2xl">
            <p className="text-xl md:text-2xl font-semibold mb-2">
              "Quanto mais sua empresa cresce,{' '}
              <span className="text-gradient">mais caro fica continuar existindo.</span>"
            </p>
            <p className="text-muted-foreground">
              Esse é o modelo atual. Mas não precisa ser assim.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPainPoints;
