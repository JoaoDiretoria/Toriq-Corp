import { ClipboardList } from 'lucide-react';
import { SetorDashboard } from './SetorDashboard';

interface ToriqCorpAdministrativoProps {
  onNavigateToFunil?: (funilId: string) => void;
  onBack?: () => void;
}

export function ToriqCorpAdministrativo({ onNavigateToFunil, onBack }: ToriqCorpAdministrativoProps) {
  const handleNavigateToFunil = (funilId: string) => {
    if (onNavigateToFunil) {
      onNavigateToFunil(funilId);
    }
  };

  return (
    <SetorDashboard
      titulo="Administrativo"
      descricao="Gestão administrativa da empresa SST - documentos e processos internos"
      setorNome="Administrativo"
      icon={ClipboardList}
      onNavigateToFunil={handleNavigateToFunil}
      onBack={onBack}
    />
  );
}
