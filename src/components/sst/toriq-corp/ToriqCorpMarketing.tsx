import { Megaphone } from 'lucide-react';
import { SetorDashboard } from './SetorDashboard';

interface ToriqCorpMarketingProps {
  onNavigateToFunil?: (funilId: string) => void;
  onBack?: () => void;
}

export function ToriqCorpMarketing({ onNavigateToFunil, onBack }: ToriqCorpMarketingProps) {
  const handleNavigateToFunil = (funilId: string) => {
    if (onNavigateToFunil) {
      onNavigateToFunil(funilId);
    }
  };

  return (
    <SetorDashboard
      titulo="Marketing"
      descricao="Gestão de marketing da empresa SST - campanhas, mídias sociais e estratégias"
      setorNome="Marketing"
      icon={Megaphone}
      onNavigateToFunil={handleNavigateToFunil}
      onBack={onBack}
    />
  );
}
