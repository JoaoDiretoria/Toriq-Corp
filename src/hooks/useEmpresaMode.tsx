import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmpresaModeData {
  empresaId: string;
  empresaNome: string;
  empresaTipo: string;
}

interface EmpresaModeContextType {
  empresaMode: EmpresaModeData | null;
  isInEmpresaMode: boolean;
  enterEmpresaMode: (empresa: EmpresaModeData) => void;
  exitEmpresaMode: () => void;
}

const EmpresaModeContext = createContext<EmpresaModeContextType | undefined>(undefined);

const STORAGE_KEY = 'vertical_empresa_mode';

export function EmpresaModeProvider({ children }: { children: ReactNode }) {
  // Funcionalidade desabilitada — limpar dados residuais do localStorage
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const enterEmpresaMode = (_empresa: EmpresaModeData) => {
    // Funcionalidade removida
  };

  const exitEmpresaMode = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <EmpresaModeContext.Provider
      value={{
        empresaMode: null,
        isInEmpresaMode: false,
        enterEmpresaMode,
        exitEmpresaMode,
      }}
    >
      {children}
    </EmpresaModeContext.Provider>
  );
}

export function useEmpresaMode() {
  const context = useContext(EmpresaModeContext);
  if (context === undefined) {
    throw new Error('useEmpresaMode must be used within an EmpresaModeProvider');
  }
  return context;
}

// Hook para obter o empresa_id efetivo (considera modo empresa)
export function useEmpresaEfetiva() {
  const { empresaMode, isInEmpresaMode } = useEmpresaMode();
  
  const getEmpresaIdEfetivo = (empresaIdOriginal: string | null | undefined): string | null => {
    if (isInEmpresaMode && empresaMode) {
      return empresaMode.empresaId;
    }
    return empresaIdOriginal ?? null;
  };
  
  return {
    empresaIdEfetivo: isInEmpresaMode && empresaMode ? empresaMode.empresaId : null,
    empresaNomeEfetivo: isInEmpresaMode && empresaMode ? empresaMode.empresaNome : null,
    empresaTipoEfetivo: isInEmpresaMode && empresaMode ? empresaMode.empresaTipo : null,
    getEmpresaIdEfetivo,
    isInEmpresaMode,
  };
}
