/**
 * Hook e funções para gerenciamento do White Label
 * 
 * Este módulo re-exporta as funções do serviço centralizado
 * e fornece hooks React para uso nos componentes.
 */

import { useEffect, useCallback, useState } from 'react';
import { api } from '@/integrations/api/client';
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
        // NOTA (migração): rpc('get_empresa_sst_pai') não tem endpoint equivalente
        // para empresaId arbitrário. Resolvemos a config via /white-label/me (usuário
        // logado) e /empresas/{id} (fallback logo). Para branding pré-login sem
        // usuário autenticado, a UI receberá config=null e aplicará tema padrão.

        // Tentar resolver a config white-label do usuário logado via /white-label/me
        const meData = await api.get<any>('/white-label/me').catch(() => null);

        if (meData && meData.config && meData.config.logo_url) {
          setConfig({
            logoUrl: meData.config.logo_url || null,
            title: meData.config.title || null,
            subtitle: meData.config.subtitle || null,
          });
          return;
        }

        // Fallback: buscar logo_url direto da empresa pelo id informado
        const empresaData = await api.get<any>(`/empresas/${empresaId}`).catch(() => null);

        if (empresaData?.logo_url) {
          setConfig({
            logoUrl: empresaData.logo_url,
            title: meData?.config?.title || null,
            subtitle: meData?.config?.subtitle || null,
          });
        } else {
          setConfig(null);
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
