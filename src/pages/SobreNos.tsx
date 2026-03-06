import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  GraduationCap, 
  Building2, 
  HardHat, 
  Truck, 
  FileText,
  Target,
  Eye,
  Heart,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Mail,
  BookOpen
} from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing';
import '@/components/landing/landing.css';

const modules = [
  {
    icon: Shield,
    title: 'Gestão de SST',
    description: 'Controle completo de documentação, laudos e conformidade legal em SST.'
  },
  {
    icon: GraduationCap,
    title: 'Gestão de Treinamentos',
    description: 'Turmas, certificados, validades e controle de capacitações.'
  },
  {
    icon: Building2,
    title: 'Gestão Empresarial',
    description: 'Comercial, financeiro, administrativo e indicadores gerenciais.'
  },
  {
    icon: HardHat,
    title: 'Gestão de EPI',
    description: 'Catálogo, estoque, entregas, devoluções e rastreabilidade.'
  },
  {
    icon: Truck,
    title: 'Gestão de Frotas',
    description: 'Controle de veículos, manutenções e documentação.'
  },
  {
    icon: FileText,
    title: 'Gestão de Documentação',
    description: 'Centralização e organização de todos os documentos da empresa.'
  }
];

const objectives = [
  'Automatizar processos operacionais',
  'Centralizar informações em um único sistema',
  'Apoiar o cumprimento de obrigações legais',
  'Facilitar a gestão e a análise de dados',
  'Reduzir retrabalho e aumentar produtividade'
];

const values = [
  'Inovação contínua',
  'Confiabilidade e segurança',
  'Praticidade e eficiência',
  'Compromisso com o cliente',
  'Evolução constante dos sistemas'
];

const SobreNos = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page min-h-screen">
      <LandingHeader />
      
      <main className="pt-24">
        {/* Hero - Quem Somos */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Conheça a TORIQ</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
                Quem <span className="text-gradient">Somos</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed px-2 sm:px-0">
                A TORIQ é uma empresa de tecnologia especializada no desenvolvimento de sistemas 
                para empresas de <strong className="text-foreground">Saúde e Segurança do Trabalho (SST)</strong> e 
                gestão corporativa. Criamos soluções digitais que auxiliam empresas a organizar processos, 
                centralizar informações e garantir mais controle, eficiência e conformidade legal em suas operações.
              </p>
            </div>
          </div>
        </section>

        {/* Fundação */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                <span className="text-gradient">Fundação</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A TORIQ foi fundada com o propósito de simplificar a gestão de SST e processos empresariais, 
                oferecendo uma plataforma moderna, confiável e adaptável. Desde sua fundação, a empresa investe 
                no desenvolvimento contínuo de soluções tecnológicas voltadas à praticidade, organização e 
                tomada de decisão estratégica.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Atuamos com foco em tecnologia aplicada à gestão, desenvolvendo ferramentas que atendem às 
                necessidades reais do mercado e acompanham a evolução das exigências legais e operacionais das empresas.
              </p>
            </div>
          </div>
        </section>

        {/* Objetivos */}
        <section className="py-16 relative overflow-hidden noise-overlay">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-dark-lighter/50 to-background" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8">
                <span className="text-gradient">Objetivos</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Nosso principal objetivo é fornecer sistemas eficientes e flexíveis que apoiem empresas de SST 
                e organizações em geral na gestão de suas rotinas, reduzindo retrabalho, aumentando o controle 
                e promovendo maior segurança e produtividade.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {objectives.map((objective, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-xl glass-card"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{objective}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* O Que Oferecemos */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                  O Que <span className="text-gradient">Oferecemos</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  A TORIQ disponibiliza um sistema modularizado, permitindo que cada empresa utilize 
                  apenas os módulos necessários para sua realidade.
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {modules.map((module, index) => (
                  <div 
                    key={index}
                    className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <module.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                ))}
              </div>
              
              <p className="text-center text-muted-foreground mt-8">
                Todos os módulos são integrados, proporcionando mais controle, organização e eficiência operacional.
              </p>
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-background to-background" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Missão, Visão e <span className="text-gradient">Valores</span>
                </h2>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Missão */}
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Missão</h3>
                  <p className="text-muted-foreground">
                    Desenvolver soluções tecnológicas que simplifiquem a gestão de SST e processos empresariais, 
                    contribuindo para a eficiência, organização e conformidade das empresas.
                  </p>
                </div>

                {/* Visão */}
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Eye className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Visão</h3>
                  <p className="text-muted-foreground">
                    Ser referência em sistemas de gestão para empresas de SST e gestão corporativa, 
                    reconhecida pela qualidade, inovação e confiabilidade de suas soluções.
                  </p>
                </div>

                {/* Valores */}
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Valores</h3>
                  <ul className="text-muted-foreground space-y-2 text-left">
                    {values.map((value, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Informações da Empresa */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                Informações Sobre a <span className="text-gradient">Empresa</span>
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  A TORIQ atua de forma estratégica, com foco em <strong className="text-foreground">tecnologia, 
                  usabilidade e segurança da informação</strong>. Nossos sistemas são desenvolvidos para atender 
                  empresas de diferentes portes, oferecendo escalabilidade e flexibilidade conforme o crescimento do negócio.
                </p>
                <p>
                  Trabalhamos de forma contínua na evolução da plataforma, acompanhando mudanças legais, 
                  tecnológicas e operacionais do mercado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Diagnóstico */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                Diagnóstico e <span className="text-gradient">Próximos Passos</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Quer entender como a TORIQ pode atender às necessidades da sua empresa?
                Realize um diagnóstico e descubra quais módulos e funcionalidades são mais adequados para a sua operação.
              </p>
              <Button 
                size="lg"
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    const element = document.getElementById('contato');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }, 500);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg h-auto group w-full sm:w-auto"
              >
                Solicitar Diagnóstico
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>

        {/* Conteúdo e Atualizações */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                Conteúdo e <span className="text-gradient">Atualizações</span>
              </h2>
              <p className="text-center text-muted-foreground mb-8">
                Fique por dentro de novidades, conteúdos e atualizações da plataforma:
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <button 
                  onClick={() => navigate('/newsletter')}
                  className="glass-card rounded-2xl p-4 sm:p-6 flex items-center gap-4 hover:border-primary/30 transition-all duration-300 group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">Newsletter</h3>
                    <p className="text-sm text-muted-foreground">Inscreva-se e receba novidades</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => navigate('/blog')}
                  className="glass-card rounded-2xl p-4 sm:p-6 flex items-center gap-4 hover:border-primary/30 transition-all duration-300 group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">Blog</h3>
                    <p className="text-sm text-muted-foreground">Conteúdos sobre SST, gestão e tecnologia</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default SobreNos;
