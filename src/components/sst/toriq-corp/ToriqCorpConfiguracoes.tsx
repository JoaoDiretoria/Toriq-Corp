import { useState } from 'react';
import { Zap, GitBranch } from 'lucide-react';
import { FunisFluxoTrabalho } from './configuracoes/FunisFluxoTrabalho';
import { Automacoes } from './configuracoes/Automacoes';

type ConfigSection = 'automacoes' | 'funis';

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  section: ConfigSection;
  activeSection: ConfigSection;
  onClick: (section: ConfigSection) => void;
}

const TabItem = ({ icon, label, section, activeSection, onClick }: TabItemProps) => (
  <button
    onClick={() => onClick(section)}
    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
      activeSection === section
        ? 'border-primary text-primary font-medium'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export function ToriqCorpConfiguracoes() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('automacoes');

  const renderContent = () => {
    switch (activeSection) {
      case 'automacoes':
        return <Automacoes />;

      case 'funis':
        return <FunisFluxoTrabalho />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Toriq Corp</h1>
        <p className="text-muted-foreground">Configure o módulo Toriq Corp</p>
      </div>

      {/* Abas de navegação */}
      <div className="border-b">
        <nav className="flex gap-1">
          <TabItem
            icon={<Zap className="h-4 w-4" />}
            label="Automações"
            section="automacoes"
            activeSection={activeSection}
            onClick={setActiveSection}
          />
          <TabItem
            icon={<GitBranch className="h-4 w-4" />}
            label="Funis / Fluxo de Trabalho"
            section="funis"
            activeSection={activeSection}
            onClick={setActiveSection}
          />
        </nav>
      </div>

      {/* Conteúdo */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
