/**
 * Hook e funções para gerenciamento do White Label
 * 
 * Este módulo re-exporta as funções do serviço centralizado
 * e fornece hooks React para uso nos componentes.
 */

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WhiteLabelConfig } from '@/types/whiteLabel';
import {
  applyWhiteLabelConfig as applyConfig,
  clearWhiteLabelConfig,
  loadAndApplyFromCache,
  loadAndApplyFromDB,
} from '@/services/whiteLabelService';

// Re-exportar função de aplicação para manter compatibilidade
export { applyConfig as applyWhiteLabelConfig };

// Carrega e aplica as configurações salvas do localStorage
export function loadAndApplyWhiteLabelConfig() {
  loadAndApplyFromCache();
}

// Hook para usar as configurações White Label
export function useWhiteLabel() {
  // Aplicar configurações ao montar
  useEffect(() => {
    loadAndApplyFromCache();
  }, []);

  const applyConfigCallback = useCallback((config: WhiteLabelConfig) => {
    applyConfig(config);
  }, []);

  const resetConfig = useCallback(() => {
    clearWhiteLabelConfig();
  }, []);

  return { applyConfig: applyConfigCallback, resetConfig };
}

// Função para carregar e aplicar configuração white label do banco de dados
// Chamada ao fazer login para aplicar o tema automaticamente
// @param empresaId - ID da empresa do usuário
// @param userId - ID do usuário (opcional, usado para instrutores)
// @param userRole - Role do usuário (opcional, para verificar se é admin_vertical)
export async function loadAndApplyWhiteLabelFromDB(
  empresaId: string, 
  userId?: string, 
  userRole?: string
): Promise<boolean> {
  return loadAndApplyFromDB(empresaId, userId, userRole);
}

// Hook para buscar e usar a configuração White Label da empresa
// A configuração é buscada da empresa SST pai (hierarquia em cascata)
// empresa SST → seus clientes, parceiros, instrutores herdam o tema
// vertical_on (Toriq) e outras empresas SST usam tema padrão
// Se não houver white_label_config, busca a logo_url diretamente da tabela empresas
export function useEmpresaWhiteLabel(empresaId: string | undefined) {
  const [config, setConfig] = useState<{
    logoUrl: string | null;
    title: string | null;
    subtitle: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        // Primeiro, buscar a empresa SST pai usando a função do banco
        const { data: empresaSstData, error: empresaSstError } = await (supabase as any)
          .rpc('get_empresa_sst_pai', { p_empresa_id: empresaId });

        if (empresaSstError) {
          console.error('Erro ao buscar empresa SST pai:', empresaSstError);
          setLoading(false);
          return;
        }

        // Se não tem empresa SST pai (ex: vertical_on), usa tema padrão
        if (!empresaSstData) {
          setConfig(null);
          setLoading(false);
          return;
        }

        // Buscar configuração white label da empresa SST pai
        const { data, error } = await (supabase as any)
          .from('white_label_config')
          .select('logo_url, title, subtitle')
          .eq('empresa_id', empresaSstData)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar white label config:', error);
        }

        if (data && data.logo_url) {
          setConfig({
            logoUrl: data.logo_url || null,
            title: data.title || null,
            subtitle: data.subtitle || null,
          });
        } else {
          // Se não tem white_label_config ou não tem logo nele, buscar logo_url da tabela empresas
          const { data: empresaData, error: empresaError } = await (supabase as any)
            .from('empresas')
            .select('logo_url, nome')
            .eq('id', empresaSstData)
            .maybeSingle();

          if (empresaError && empresaError.code !== 'PGRST116') {
            console.error('Erro ao carregar logo da empresa:', empresaError);
          }

          if (empresaData?.logo_url) {
            setConfig({
              logoUrl: empresaData.logo_url,
              title: data?.title || null,
              subtitle: data?.subtitle || null,
            });
          } else {
            setConfig(null);
          }
        }
      } catch (error: any) {
        // Evitar log de objetos vazios
        if (error?.message) {
          console.error('Erro ao carregar white label config:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [empresaId]);

  return { config, loading };
}
