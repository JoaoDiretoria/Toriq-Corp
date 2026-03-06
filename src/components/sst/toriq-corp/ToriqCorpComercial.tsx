import { TrendingUp } from 'lucide-react';
import { SetorDashboard } from './SetorDashboard';

interface ToriqCorpComercialProps {
  onNavigateToFunil?: (funilId: string) => void;
  onBack?: () => void;
}

export function ToriqCorpComercial({ onNavigateToFunil, onBack }: ToriqCorpComercialProps) {
  const handleNavigateToFunil = (funilId: string) => {
    if (onNavigateToFunil) {
      onNavigateToFunil(funilId);
    }
  };

  return (
    <SetorDashboard
      titulo="Comercial"
      descricao="Gestão comercial da empresa SST - vendas e relacionamento com clientes"
      setorNome="Comercial"
      icon={TrendingUp}
      onNavigateToFunil={handleNavigateToFunil}
      onBack={onBack}
    />
  );
}
