import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useCallback } from 'react';
import { logAccess, LogData } from '@/lib/accessLog';

// Re-exportar logAccess para compatibilidade
export { logAccess } from '@/lib/accessLog';

// Hook para usar em componentes React - usa contexto automaticamente
export const useAccessLog = () => {
  const { user, profile } = useAuth();
  const { empresaMode } = useEmpresaMode();

  const log = useCallback(async (data: LogData) => {
    const targetEmpresaId = empresaMode?.empresaId || profile?.empresa_id;
    if (!targetEmpresaId) return;
    
    await logAccess(
      targetEmpresaId,
      user?.id || null,
      user?.email || null,
      profile?.nome || null,
      data
    );
  }, [empresaMode, profile, user]);

  // Helpers para ações comuns
  const logView = useCallback((modulo: string, pagina: string, descricao?: string) => {
    log({ acao: 'view', modulo, pagina, descricao: descricao || `Visualizou ${pagina}` });
  }, [log]);

  const logCreate = useCallback((modulo: string, pagina: string, descricao?: string, metadata?: Record<string, any>) => {
    log({ acao: 'create', modulo, pagina, descricao: descricao || `Criou registro em ${pagina}`, metadata });
  }, [log]);

  const logUpdate = useCallback((modulo: string, pagina: string, descricao?: string, metadata?: Record<string, any>) => {
    log({ acao: 'update', modulo, pagina, descricao: descricao || `Atualizou registro em ${pagina}`, metadata });
  }, [log]);

  const logDelete = useCallback((modulo: string, pagina: string, descricao?: string, metadata?: Record<string, any>) => {
    log({ acao: 'delete', modulo, pagina, descricao: descricao || `Excluiu registro em ${pagina}`, metadata });
  }, [log]);

  return { log, logView, logCreate, logUpdate, logDelete, logAccess };
};

export default useAccessLog;
