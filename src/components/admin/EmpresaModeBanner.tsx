import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmpresaModeBanner() {
  const { empresaMode, isInEmpresaMode, exitEmpresaMode } = useEmpresaMode();
  const navigate = useNavigate();

  if (!isInEmpresaMode || !empresaMode) {
    return null;
  }

  const handleExit = () => {
    exitEmpresaMode();
    navigate('/admin');
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-4 min-h-[48px] w-full z-50 shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate md:whitespace-normal">
          Modo Super Admin: Você está acessando o painel da empresa <strong>{empresaMode.empresaNome}</strong> com privilégios administrativos.
        </span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExit}
        className="bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border-white shrink-0 whitespace-nowrap"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sair do Modo Empresa
      </Button>
    </div>
  );
}
