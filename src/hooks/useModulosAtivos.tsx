import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';

interface ModuloAtivo {
  modulo_id: string;
  nome: string;
  ativo: boolean;
}

interface ModulosAtivosContextType {
  modulosAtivos: ModuloAtivo[];
  loading: boolean;
  isModuloAtivo: (nomeModulo: string) => boolean;
  recarregarModulos: () => Promise<void>;
}

const ModulosAtivosContext = createContext<ModulosAtivosContextType | undefined>(undefined);

// Mapeamento de nomes de módulos do banco para IDs usados no código
const MODULO_NOME_PARA_ID: Record<string, string> = {
  'Toriq Corp': 'toriq_corp',
  'Toriq Vendas': 'toriq_vendas',
};

// Mapeamento inverso: ID do código para nomes do banco
const ID_PARA_MODULO_NOMES: Record<string, string[]> = {
  'toriq_corp': ['Toriq Corp'],
  'toriq_vendas': ['Toriq Vendas'],
};

export function ModulosAtivosProvider({ children }: { children: ReactNode }) {
  const { profile, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  
  const [modulosAtivos, setModulosAtivos] = useState<ModuloAtivo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarModulos = useCallback(async () => {
    if (!empresaId) {
      setModulosAtivos([]);
      setLoading(false);
      return;
    }

    try {
      // Backend novo: os vínculos da empresa (/white-label/empresa-modulos, já
      // escopado por empresa_id do token) + o catálogo global de módulos
      // (/white-label/modulos) para resolver o nome de cada módulo. O filtro
      // ativo=true, que antes ia no .eq() do Supabase, é aplicado no cliente.
      const [vinculos, catalogo] = await Promise.all([
        api.get<any[]>('/white-label/empresa-modulos').catch(() => [] as any[]),
        api.get<any[]>('/white-label/modulos').catch(() => [] as any[]),
      ]);

      const nomePorModulo = new Map<string, string>(
        (catalogo || []).map((mod: any) => [mod.id, mod.nome])
      );

      const modulos = (vinculos || [])
        .filter((item: any) => item.ativo && nomePorModulo.has(item.modulo_id))
        .map((item: any) => ({
          modulo_id: item.modulo_id,
          nome: nomePorModulo.get(item.modulo_id) as string,
          ativo: item.ativo,
        }));

      setModulosAtivos(modulos);
    } catch (error) {
      console.error('Erro ao carregar módulos ativos:', error);
      setModulosAtivos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Carregar módulos quando empresaId mudar
  useEffect(() => {
    carregarModulos();
  }, [carregarModulos]);

  // NOTA (migração): a subscrição realtime do Supabase em `empresas_modulos`
  // foi removida. O backend novo não tem push; a atualização ao alternar um
  // módulo se dá via `recarregarModulos()` (chamado pelas telas de configuração)
  // ou no próximo carregamento. Toggles de módulo são ações raras de admin.

  // Verifica se um módulo está ativo pelo nome ou ID do código
  const isModuloAtivo = useCallback((moduloIdOuNome: string): boolean => {
    // Perfil da empresa é sempre ativo
    if (moduloIdOuNome === 'perfil_empresa') return true;
    
    // Buscar pelos nomes do banco que correspondem ao ID do código
    const nomesDoModulo = ID_PARA_MODULO_NOMES[moduloIdOuNome];
    if (nomesDoModulo) {
      // É um ID do código (ex: toriq_train), buscar pelos nomes correspondentes
      return modulosAtivos.some(m => nomesDoModulo.includes(m.nome));
    }
    
    // Buscar pelo nome direto ou pelo ID mapeado
    return modulosAtivos.some(m => {
      const idMapeado = MODULO_NOME_PARA_ID[m.nome];
      return m.nome === moduloIdOuNome || idMapeado === moduloIdOuNome;
    });
  }, [modulosAtivos]);

  return (
    <ModulosAtivosContext.Provider
      value={{
        modulosAtivos,
        loading,
        isModuloAtivo,
        recarregarModulos: carregarModulos,
      }}
    >
      {children}
    </ModulosAtivosContext.Provider>
  );
}

export function useModulosAtivos() {
  const context = useContext(ModulosAtivosContext);
  if (context === undefined) {
    throw new Error('useModulosAtivos deve ser usado dentro de ModulosAtivosProvider');
  }
  return context;
}
