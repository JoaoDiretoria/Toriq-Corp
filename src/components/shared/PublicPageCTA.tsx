import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  BookOpen, 
  ClipboardList, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface CTAItem {
  title: string;
  description: string;
  buttonText: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
}

interface PublicPageCTAProps {
  showBlog?: boolean;
  showPesquisas?: boolean;
  showContato?: boolean;
  showEspecialista?: boolean;
  title?: string;
  subtitle?: string;
  customCTAs?: CTAItem[];
}

export function PublicPageCTA({
  showBlog = true,
  showPesquisas = true,
  showContato = true,
  showEspecialista = true,
  title = "Continue explorando",
  subtitle = "Descubra mais conteúdos e recursos da TORIQ",
  customCTAs = [],
}: PublicPageCTAProps) {
  const navigate = useNavigate();

  const scrollToContato = () => {
    const isLandingPage = window.location.pathname === '/';
    if (isLandingPage) {
      const element = document.getElementById('contato');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navegar para home e depois scrollar para contato
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById('contato');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  };

  const defaultCTAs: CTAItem[] = [];

  if (showEspecialista) {
    defaultCTAs.push({
      title: 'Fale com um Especialista',
      description: 'Tire suas dúvidas e descubra como podemos ajudar sua empresa',
      buttonText: 'Falar Agora',
      onClick: scrollToContato,
      icon: <MessageSquare className="h-6 w-6" />,
      variant: 'default',
    });
  }

  if (showBlog) {
    defaultCTAs.push({
      title: 'Blog TORIQ',
      description: 'Artigos, dicas e novidades sobre gestão de SST',
      buttonText: 'Ver Artigos',
      href: '/blog',
      icon: <BookOpen className="h-6 w-6" />,
      variant: 'outline',
    });
  }

  if (showPesquisas) {
    defaultCTAs.push({
      title: 'Pesquisas de Opinião',
      description: 'Participe e ajude a moldar o futuro do setor',
      buttonText: 'Ver Pesquisas',
      href: '/pesquisas',
      icon: <ClipboardList className="h-6 w-6" />,
      variant: 'outline',
    });
  }

  const allCTAs = [...defaultCTAs, ...customCTAs];

  if (allCTAs.length === 0) return null;

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Explore mais</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className={`grid gap-6 ${
          allCTAs.length === 1 ? 'max-w-md mx-auto' :
          allCTAs.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
          'md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {allCTAs.map((cta, index) => (
            <Card 
              key={index}
              className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className={`p-3 rounded-lg w-fit mb-4 ${
                  cta.variant === 'default' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                } transition-colors`}>
                  {cta.icon}
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{cta.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{cta.description}</p>
                
                <Button 
                  variant={cta.variant || 'outline'}
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    if (cta.onClick) {
                      cta.onClick();
                    } else if (cta.href) {
                      navigate(cta.href);
                    }
                  }}
                >
                  {cta.buttonText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
