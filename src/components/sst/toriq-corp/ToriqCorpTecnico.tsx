import { Wrench } from 'lucide-react';
import { SetorDashboard } from './SetorDashboard';

interface ToriqCorpTecnicoProps {
  onNavigateToFunil?: (funilId: string) => void;
  onBack?: () => void;
}

export function ToriqCorpTecnico({ onNavigateToFunil, onBack }: ToriqCorpTecnicoProps) {
  const handleNavigateToFunil = (funilId: string) => {
    if (onNavigateToFunil) {
      onNavigateToFunil(funilId);
    }
  };

  return (
    <SetorDashboard
      titulo="Técnico"
      descricao="Gestão técnica da empresa SST - laudos e documentos"
      setorNome="Técnico"
      icon={Wrench}
      onNavigateToFunil={handleNavigateToFunil}
      onBack={onBack}
    />
  );
}
