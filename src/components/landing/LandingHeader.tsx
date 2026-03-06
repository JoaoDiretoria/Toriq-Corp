import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import logoWhite from '@/assets/landing/logo-white.png';

const LandingHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (!isLandingPage) {
      navigate('/#' + id);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <img 
          src={logoWhite} 
          alt="TORIQ Platform" 
          className="h-10 md:h-14 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => navigate('/')}
        />

        <div className="hidden md:flex items-center gap-3">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="text-muted-foreground hover:text-primary"
          >
            Blog
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pesquisas')}
            className="text-muted-foreground hover:text-primary"
          >
            Pesquisas
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/sobre-nos')}
            className="text-muted-foreground hover:text-primary"
          >
            Sobre Nós
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="text-muted-foreground hover:text-primary"
          >
            Entrar
          </Button>
          <Button 
            size="sm"
            onClick={() => scrollToSection('contato')}
            className="bg-primary hover:bg-primary/90"
          >
            Falar com Especialista
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-border/20 animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <button 
              onClick={() => { navigate('/blog'); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              Blog
            </button>
            <button 
              onClick={() => { navigate('/pesquisas'); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              Pesquisas
            </button>
            <button 
              onClick={() => { navigate('/sobre-nos'); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              Sobre Nós
            </button>
            <div className="pt-4 border-t border-border/20 flex flex-col gap-3">
              <Button 
                variant="outline"
                onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                className="w-full"
              >
                Entrar
              </Button>
              <Button 
                onClick={() => { scrollToSection('contato'); setMobileMenuOpen(false); }}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingHeader;
