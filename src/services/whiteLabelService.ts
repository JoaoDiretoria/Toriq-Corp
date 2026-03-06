/**
 * Serviço centralizado para gerenciamento do White Label
 * 
 * Responsável por:
 * - Carregar configurações do banco de dados
 * - Aplicar estilos CSS ao DOM
 * - Gerenciar cache local (localStorage)
 * - Converter entre formatos DB (snake_case) e Frontend (camelCase)
 */

import { supabase } from '@/integrations/supabase/client';
import { hexToHSL, formatHSL } from '@/utils/colorUtils';
import type { WhiteLabelConfig, WhiteLabelDBRecord } from '@/types/whiteLabel';
import { CSS_VARIABLES, STORAGE_KEYS } from '@/types/whiteLabel';

const DEBUG = false; // Desabilitar logs em produção

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[WhiteLabelService]', ...args);
  }
}

/**
 * Converte dados do banco (snake_case) para formato frontend (camelCase)
 */
export function dbToFrontend(data: WhiteLabelDBRecord): WhiteLabelConfig {
  return {
    bgColor: data.bg_color,
    surfaceColor: data.surface_color,
    borderColor: data.border_color,
    textColor: data.text_color,
    mutedColor: data.muted_color,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    successColor: data.success_color,
    warningColor: data.warning_color,
    errorColor: data.error_color,
    infoColor: data.info_color,
    radius: data.radius,
    fontBody: data.font_body,
    fontHeading: data.font_heading,
    baseFontSize: data.base_font_size,
    fontWeight: data.font_weight,
    lineHeight: data.line_height,
    logoUrl: data.logo_url,
    title: data.title,
    subtitle: data.subtitle,
  };
}

/**
 * Aplica uma propriedade CSS com prioridade 'important'
 */
function setProperty(name: string, value: string) {
  document.documentElement.style.setProperty(name, value, 'important');
}

/**
 * Remove uma propriedade CSS
 */
function removeProperty(name: string) {
  document.documentElement.style.removeProperty(name);
}

/**
 * Aplica uma cor ao DOM convertendo de HEX para HSL
 */
function applyColor(cssVar: string, hexColor: string | undefined) {
  if (!hexColor) return;
  
  const hsl = hexToHSL(hexColor);
  if (hsl) {
    setProperty(cssVar, formatHSL(hsl));
  }
}

/**
 * Aplica as configurações White Label ao documento
 */
export function applyWhiteLabelConfig(config: WhiteLabelConfig) {
  log('Aplicando configurações ao documento:', config);

  // Cor de fundo (background)
  applyColor(CSS_VARIABLES.BACKGROUND, config.bgColor);

  // Cor de superfície (card)
  if (config.surfaceColor) {
    applyColor(CSS_VARIABLES.CARD, config.surfaceColor);
    applyColor(CSS_VARIABLES.POPOVER, config.surfaceColor);
    applyColor(CSS_VARIABLES.SIDEBAR_BACKGROUND, config.surfaceColor);
  }

  // Cor de borda
  if (config.borderColor) {
    applyColor(CSS_VARIABLES.BORDER, config.borderColor);
    applyColor(CSS_VARIABLES.INPUT, config.borderColor);
    applyColor(CSS_VARIABLES.SIDEBAR_BORDER, config.borderColor);
  }

  // Cor do texto
  if (config.textColor) {
    applyColor(CSS_VARIABLES.FOREGROUND, config.textColor);
    applyColor(CSS_VARIABLES.CARD_FOREGROUND, config.textColor);
    applyColor(CSS_VARIABLES.POPOVER_FOREGROUND, config.textColor);
    applyColor(CSS_VARIABLES.SIDEBAR_FOREGROUND, config.textColor);
  }

  // Cor do texto secundário (muted) e fundo muted
  applyColor(CSS_VARIABLES.MUTED_FOREGROUND, config.mutedColor);
  
  // Aplicar fundo muted baseado na cor de superfície (um tom mais escuro/claro)
  // Se temos surfaceColor, usar uma versão levemente diferente para muted
  if (config.surfaceColor) {
    const hsl = hexToHSL(config.surfaceColor);
    if (hsl) {
      // Ajustar luminosidade para criar contraste sutil
      const mutedL = hsl.l > 50 ? hsl.l - 5 : hsl.l + 5;
      setProperty(CSS_VARIABLES.MUTED, `${hsl.h} ${hsl.s}% ${Math.max(0, Math.min(100, mutedL))}%`);
    }
  } else if (config.bgColor) {
    // Fallback: usar bgColor com ajuste
    const hsl = hexToHSL(config.bgColor);
    if (hsl) {
      const mutedL = hsl.l > 50 ? hsl.l - 8 : hsl.l + 8;
      setProperty(CSS_VARIABLES.MUTED, `${hsl.h} ${hsl.s}% ${Math.max(0, Math.min(100, mutedL))}%`);
    }
  }

  // Cor primária
  if (config.primaryColor) {
    applyColor(CSS_VARIABLES.PRIMARY, config.primaryColor);
    applyColor(CSS_VARIABLES.RING, config.primaryColor);
    applyColor(CSS_VARIABLES.SIDEBAR_PRIMARY, config.primaryColor);
    applyColor(CSS_VARIABLES.SIDEBAR_RING, config.primaryColor);
    // Sidebar accent usa a cor secundária para background (se existir) ou primária
    // O foreground deve ser uma cor contrastante (branco ou preto baseado na luminosidade)
    const accentColor = config.secondaryColor || config.primaryColor;
    applyColor(CSS_VARIABLES.SIDEBAR_ACCENT, accentColor);
    // Usar cor de superfície (branco) para o texto do item ativo no sidebar
    // para garantir contraste adequado
    if (config.surfaceColor) {
      applyColor(CSS_VARIABLES.SIDEBAR_ACCENT_FOREGROUND, config.surfaceColor);
    } else {
      // Fallback: usar branco para garantir contraste
      setProperty(CSS_VARIABLES.SIDEBAR_ACCENT_FOREGROUND, '0 0% 98%');
    }
  }

  // Cor secundária
  if (config.secondaryColor) {
    applyColor(CSS_VARIABLES.ACCENT, config.secondaryColor);
    applyColor(CSS_VARIABLES.SECONDARY, config.secondaryColor);
  }

  // Cores de estado
  applyColor(CSS_VARIABLES.SUCCESS, config.successColor);
  applyColor(CSS_VARIABLES.WARNING, config.warningColor);
  applyColor(CSS_VARIABLES.DESTRUCTIVE, config.errorColor);
  applyColor(CSS_VARIABLES.INFO, config.infoColor);

  // Raio de borda
  if (config.radius !== undefined) {
    setProperty(CSS_VARIABLES.RADIUS, `${config.radius / 16}rem`);
  }

  // Tipografia
  if (config.fontBody) {
    setProperty(CSS_VARIABLES.FONT_BODY, config.fontBody);
    document.documentElement.style.fontFamily = config.fontBody;
  }

  if (config.fontHeading) {
    setProperty(CSS_VARIABLES.FONT_HEADING, config.fontHeading);
  }

  if (config.baseFontSize) {
    setProperty(CSS_VARIABLES.FONT_SIZE_BASE, `${config.baseFontSize}px`);
  }

  if (config.fontWeight) {
    setProperty(CSS_VARIABLES.FONT_WEIGHT_BASE, String(config.fontWeight));
  }

  if (config.lineHeight) {
    setProperty(CSS_VARIABLES.LINE_HEIGHT_BASE, String(config.lineHeight));
  }

  log('Configurações aplicadas com sucesso');
}

/**
 * Remove todas as configurações White Label do documento
 */
export function clearWhiteLabelConfig() {
  const allVariables = Object.values(CSS_VARIABLES);
  
  allVariables.forEach(cssVar => {
    removeProperty(cssVar);
  });
  
  document.documentElement.style.fontFamily = '';
  log('Configurações removidas');
}

/**
 * Salva configuração no cache local
 */
export function cacheConfig(config: WhiteLabelConfig, empresaSstId?: string) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  if (empresaSstId) {
    localStorage.setItem(STORAGE_KEYS.EMPRESA_SST_ID, empresaSstId);
  }
  log('Config salva no cache');
}

/**
 * Obtém configuração do cache local
 */
export function getCachedConfig(): WhiteLabelConfig | null {
  const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      log('Erro ao parsear config do cache:', e);
    }
  }
  return null;
}

/**
 * Limpa o cache local
 */
export function clearCache() {
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.EMPRESA_SST_ID);
  log('Cache limpo');
}

/**
 * Carrega e aplica configuração do cache local
 */
export function loadAndApplyFromCache(): boolean {
  const config = getCachedConfig();
  if (config) {
    applyWhiteLabelConfig(config);
    return true;
  }
  return false;
}

/**
 * Carrega e aplica configuração do banco de dados
 * Busca a empresa SST pai para herança de estilos
 * @param empresaId - ID da empresa do usuário
 * @param userId - ID do usuário (opcional, usado para instrutores)
 * @param userRole - Role do usuário (opcional, para verificar se é admin_vertical)
 */
export async function loadAndApplyFromDB(
  empresaId: string, 
  userId?: string, 
  userRole?: string
): Promise<boolean> {
  try {
    log('Carregando config para empresa:', empresaId, 'userId:', userId, 'role:', userRole);

    // Admin vertical NUNCA recebe white label
    if (userRole === 'admin_vertical') {
      log('Admin vertical detectado, usando tema padrão');
      clearCache();
      clearWhiteLabelConfig();
      return false;
    }

    let empresaSstId: string | null = null;

    // Para instrutores, a empresa_id do profile já aponta para a SST
    // Então podemos usar diretamente
    if (userRole === 'instrutor' && empresaId) {
      empresaSstId = empresaId;
      log('Instrutor detectado, usando empresa_id diretamente:', empresaSstId);
    }
    // Para empresa_sst, ela mesma é a SST
    else if (userRole === 'empresa_sst' && empresaId) {
      empresaSstId = empresaId;
      log('Empresa SST detectada, usando empresa_id diretamente:', empresaSstId);
    }
    // Para outros roles, buscar via função RPC
    else if (userId) {
      log('Buscando empresa SST via user_id:', userId);
      const { data: empresaSstByUser, error: userError } = await (supabase as any)
        .rpc('get_empresa_sst_pai_by_user', { p_user_id: userId });

      log('Resultado get_empresa_sst_pai_by_user:', { data: empresaSstByUser, error: userError });

      if (!userError && empresaSstByUser) {
        empresaSstId = empresaSstByUser;
        log('Empresa SST encontrada via user_id:', empresaSstId);
      } else if (userError) {
        log('Erro ao buscar empresa SST via user_id:', userError);
      }
    }

    // Fallback: buscar pela empresa_id se não encontrou via user
    if (!empresaSstId && empresaId) {
      const { data: empresaSstByEmpresa, error: empresaError } = await (supabase as any)
        .rpc('get_empresa_sst_pai', { p_empresa_id: empresaId });

      if (!empresaError && empresaSstByEmpresa) {
        empresaSstId = empresaSstByEmpresa;
        log('Empresa SST encontrada via empresa_id:', empresaSstId);
      }
    }

    // Se não tem empresa SST pai (ex: vertical_on), usa tema padrão
    if (!empresaSstId) {
      log('Sem empresa SST pai, usando tema padrão');
      clearCache();
      clearWhiteLabelConfig();
      return false;
    }

    // Buscar configuração white label da empresa SST pai
    log('Buscando white_label_config para empresa_id:', empresaSstId);
    const { data, error } = await (supabase as any)
      .from('white_label_config')
      .select('*')
      .eq('empresa_id', empresaSstId)
      .single();

    log('Resultado busca white_label_config:', { data, error });

    if (error && error.code !== 'PGRST116') {
      log('Erro ao carregar white label config:', error);
      return false;
    }

    if (data) {
      log('Config encontrada, aplicando:', { 
        bgColor: data.bg_color, 
        primaryColor: data.primary_color,
        surfaceColor: data.surface_color 
      });
      
      const config = dbToFrontend(data as WhiteLabelDBRecord);
      
      // Salvar no cache e aplicar
      cacheConfig(config, empresaSstId);
      applyWhiteLabelConfig(config);
      
      return true;
    } else {
      log('Sem config encontrada para empresa SST:', empresaSstId);
      clearCache();
      clearWhiteLabelConfig();
      return false;
    }
  } catch (error) {
    log('Erro ao carregar white label config:', error);
    return false;
  }
}

// Exportar serviço como objeto para facilitar uso
export const whiteLabelService = {
  applyConfig: applyWhiteLabelConfig,
  clearConfig: clearWhiteLabelConfig,
  cacheConfig,
  getCachedConfig,
  clearCache,
  loadAndApplyFromCache,
  loadAndApplyFromDB,
  dbToFrontend,
};

export default whiteLabelService;
