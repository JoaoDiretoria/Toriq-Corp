import { CheckCircle2 } from 'lucide-react';

const audiences = [
  {
    title: "Consultorias de SST",
    description: "Que gerenciam múltiplos clientes e sentem o peso do custo por vida/usuário"
  },
  {
    title: "Assessorias e Auditorias",
    description: "Que precisam de agilidade para gerar evidências e relatórios"
  },
  {
    title: "Empresas de Treinamentos",
    description: "Que oferecem NRs e precisam controlar certificações e vencimentos"
  },
  {
    title: "Clínicas Ocupacionais",
    description: "Que gerenciam exames, ASOs e integração com eSocial"
  },
  {
    title: "Empresas com equipe interna de SST",
    description: "Que buscam profissionalizar e centralizar a gestão de segurança"
  }
];

const LandingTargetAudience = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-dark-lighter/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-primary text-sm font-semibold tracking-widest uppercase mb-4 block">
              Para quem é
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Essa conversa é para você se...
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {audiences.map((audience, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl glass-card hover:border-primary/30 transition-all duration-300"
              >
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{audience.title}</h3>
                  <p className="text-sm text-muted-foreground">{audience.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingTargetAudience;
