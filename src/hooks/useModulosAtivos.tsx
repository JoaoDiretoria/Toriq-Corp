import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  'Toriq Training': 'toriq_train',
  'Gestão de Treinamentos': 'toriq_train',
  'Toriq Corp': 'toriq_corp',
  'Toriq EPI': 'gestao_epi',
  'Gestão de EPI': 'gestao_epi',
  'Toriq EPI - Gestão Completa': 'gestao_epi',
};

// Mapeamento inverso: ID do código para nomes do banco
const ID_PARA_MODULO_NOMES: Record<string, string[]> = {
  'toriq_train': ['Toriq Training', 'Gestão de Treinamentos'],
  'toriq_corp': ['Toriq Corp'],
  'gestao_epi': ['Toriq EPI', 'Gestão de EPI', 'Toriq EPI - Gestão Completa'],
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
      const { data, error } = await supabase
        .from('empresas_modulos')
        .select(`
          modulo_id,
          ativo,
          modulos (
            id,
            nome
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true);

      if (error) throw error;

      const modulos = (data || [])
        .filter((item: any) => item.modulos)
        .map((item: any) => ({
          modulo_id: item.modulo_id,
          nome: item.modulos.nome,
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

  // Subscrever a mudanças em tempo real na tabela empresas_modulos
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`modulos-changes-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'empresas_modulos',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          // Recarregar módulos quando houver mudança
          carregarModulos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, carregarModulos]);

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
