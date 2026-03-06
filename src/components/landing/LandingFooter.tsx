import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import logoWhite from '@/assets/landing/logo-white.png';

const LandingFooter = () => {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const institutionalLinks = [
    { label: 'Quem somos', href: '/sobre-nos' },
    { label: 'Pesquisas de opinião', href: '/pesquisas' },
    { label: 'Avaliações', href: '#' },
  ];

  const contactLinks = [
    { label: 'Suporte', href: '#' },
    { label: 'Solução de problemas', href: '#' },
  ];

  const contentLinks = [
    { label: 'Blog', href: '/blog' },
    { label: 'Newsletter', href: '/newsletter' },
    { label: 'Comunidade', href: '#' },
  ];

  const socialLinks = [
    { label: 'X', href: 'https://x.com/toriq' },
    { label: 'Facebook', href: 'https://facebook.com/toriq' },
    { label: 'Instagram', href: 'https://instagram.com/toriq' },
    { label: 'Youtube', href: 'https://youtube.com/toriq' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/toriq' },
    { label: 'Reclame Aqui', href: 'https://reclameaqui.com.br/empresa/toriq' },
  ];

  const accountLinks = [
    { label: 'Entrar', onClick: () => navigate('/auth') },
    { label: 'Home', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  ];

  const bottomLinks = [
    { label: 'Trabalhe conosco', href: '/trabalhe-conosco' },
    { label: 'Termos e condições', href: '#' },
    { label: 'Como cuidamos da sua privacidade', href: '#' },
    { label: 'Contato', href: '#' },
    { label: 'Informações sobre seguros', href: '#' },
  ];

  return (
    <footer className="border-t border-border/30 bg-background/50">
      {/* Toggle Button */}
      <div className="flex justify-center py-4 border-b border-border/20">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
        >
          Mais informações
          {showMore ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {showMore && (
        <div className="container mx-auto px-4 py-10 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {/* Institucional */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Institucional</h4>
              <ul className="space-y-2">
                {institutionalLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Contato</h4>
              <ul className="space-y-2">
                {contactLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Redes Sociais */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Redes sociais</h4>
              <ul className="space-y-2">
                {socialLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conteúdo */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Conteúdo</h4>
              <ul className="space-y-2">
                {contentLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Minha Conta */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Minha conta</h4>
              <ul className="space-y-2">
                {accountLinks.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={link.onClick}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Logo */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1 flex items-start justify-center lg:justify-end">
              <img 
                src={logoWhite} 
                alt="TORIQ Platform" 
                className="h-16 md:h-20 opacity-70"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Links */}
      <div className="border-t border-border/20 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4">
            {bottomLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
                      </div>
          
          {/* Copyright */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Copyright © 2025-2026 toriq.com.br LTDA.
            </p>
            {/* Temporariamente oculto
            <p className="text-xs text-muted-foreground px-4">
              CNPJ n.º 03.007.331/0001-41 / Av. das Nações Unidas, nº 3.003, Bonfim, Osasco/SP - CEP 06233-903
            </p>
            */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
