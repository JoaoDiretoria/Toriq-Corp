import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { allowGlobalIntegrationFallback, env } from '../config/env';
import { decryptText, encryptText, maskSecret } from '../utils/crypto';
import { logger } from '../utils/logger';

interface EmpresaIntegrationRow {
  id: string;
  empresa_id: string;
  govbr_client_id: string | null;
  govbr_client_secret_enc: string | null;
  govbr_redirect_uri: string | null;
  govbr_environment: 'staging' | 'production';
  esocial_cert_base64_enc: string | null;
  esocial_cert_password_enc: string | null;
  esocial_tipo_inscricao: string;
  esocial_nr_inscricao: string | null;
  esocial_ambiente: '1' | '2';
  certificado_alias: string | null;
  certificado_valido_ate: string | null;
}

interface LegacyGroupIntegrationRow {
  id: string;
  group_id: string;
  govbr_client_id: string | null;
  govbr_client_secret: string | null;
  govbr_redirect_uri: string | null;
  govbr_environment: 'staging' | 'production';
  esocial_cert_base64: string | null;
  esocial_cert_password: string | null;
  esocial_tipo_inscricao: string;
  esocial_nr_inscricao: string | null;
  esocial_ambiente: '1' | '2';
}

export interface EffectiveConfig {
  govbrClientId: string;
  govbrClientSecret: string;
  govbrRedirectUri: string;
  govbrEnvironment: 'staging' | 'production';
  esocialCertBase64: string | null;
  esocialCertPassword: string;
  esocialTipoInscricao: string;
  esocialNrInscricao: string;
  esocialAmbiente: '1' | '2';
}

export interface EmpresaIntegrationUpsertInput {
  govbrClientId?: string | null;
  govbrClientSecret?: string | null;
  govbrRedirectUri?: string | null;
  govbrEnvironment?: 'staging' | 'production' | null;
  esocialCertBase64?: string | null;
  esocialCertPassword?: string | null;
  esocialTipoInscricao?: string | null;
  esocialNrInscricao?: string | null;
  esocialAmbiente?: '1' | '2' | null;
  certificadoAlias?: string | null;
  certificadoValidoAte?: string | null;
}

export interface EmpresaIntegrationPublicView {
  empresaId: string;
  govbrClientId: string | null;
  govbrRedirectUri: string | null;
  govbrEnvironment: 'staging' | 'production';
  hasGovbrClientSecret: boolean;
  govbrClientSecretMasked: string | null;
  hasEsocialCert: boolean;
  hasEsocialCertPassword: boolean;
  esocialTipoInscricao: string;
  esocialNrInscricao: string | null;
  esocialAmbiente: '1' | '2';
  certificadoAlias: string | null;
  certificadoValidoAte: string | null;
  updatedAt: string | null;
}

class GroupConfigService {
  private supabase: SupabaseClient | null = null;

  private getSupabaseClient(): SupabaseClient {
    if (!this.supabase) {
      const url = env.SUPABASE_URL;
      const key = env.SUPABASE_SERVICE_KEY;

      if (!url || !key) {
        throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY sao obrigatorios');
      }

      this.supabase = createClient(url, key);
    }

    return this.supabase;
  }

  private getEnvFallbackConfig(): EffectiveConfig {
    return {
      govbrClientId: env.GOVBR_CLIENT_ID || '',
      govbrClientSecret: env.GOVBR_CLIENT_SECRET || '',
      govbrRedirectUri: env.GOVBR_REDIRECT_URI || '',
      govbrEnvironment: (env.GOVBR_ENVIRONMENT || 'staging') as 'staging' | 'production',
      esocialCertBase64: null,
      esocialCertPassword: env.ESOCIAL_CERT_PASSWORD || '',
      esocialTipoInscricao: env.ESOCIAL_TIPO_INSCRICAO || '1',
      esocialNrInscricao: env.ESOCIAL_NR_INSCRICAO || '',
      esocialAmbiente: (env.ESOCIAL_AMBIENTE || '2') as '1' | '2',
    };
  }

  private mapEmpresaRowToEffectiveConfig(row: EmpresaIntegrationRow): EffectiveConfig {
    return {
      govbrClientId: row.govbr_client_id || '',
      govbrClientSecret: row.govbr_client_secret_enc ? decryptText(row.govbr_client_secret_enc) : '',
      govbrRedirectUri: row.govbr_redirect_uri || '',
      govbrEnvironment: row.govbr_environment || 'staging',
      esocialCertBase64: row.esocial_cert_base64_enc ? decryptText(row.esocial_cert_base64_enc) : null,
      esocialCertPassword: row.esocial_cert_password_enc ? decryptText(row.esocial_cert_password_enc) : '',
      esocialTipoInscricao: row.esocial_tipo_inscricao || '1',
      esocialNrInscricao: row.esocial_nr_inscricao || '',
      esocialAmbiente: row.esocial_ambiente || '2',
    };
  }

  private mapLegacyRowToEffectiveConfig(row: LegacyGroupIntegrationRow): EffectiveConfig {
    return {
      govbrClientId: row.govbr_client_id || '',
      govbrClientSecret: row.govbr_client_secret || '',
      govbrRedirectUri: row.govbr_redirect_uri || '',
      govbrEnvironment: row.govbr_environment || 'staging',
      esocialCertBase64: row.esocial_cert_base64 || null,
      esocialCertPassword: row.esocial_cert_password || '',
      esocialTipoInscricao: row.esocial_tipo_inscricao || '1',
      esocialNrInscricao: row.esocial_nr_inscricao || '',
      esocialAmbiente: row.esocial_ambiente || '2',
    };
  }

  private mergeWithFallback(primary: EffectiveConfig, fallback: EffectiveConfig, allowFallback: boolean): EffectiveConfig {
    if (!allowFallback) return primary;

    return {
      govbrClientId: primary.govbrClientId || fallback.govbrClientId,
      govbrClientSecret: primary.govbrClientSecret || fallback.govbrClientSecret,
      govbrRedirectUri: primary.govbrRedirectUri || fallback.govbrRedirectUri,
      govbrEnvironment: primary.govbrEnvironment || fallback.govbrEnvironment,
      esocialCertBase64: primary.esocialCertBase64 || fallback.esocialCertBase64,
      esocialCertPassword: primary.esocialCertPassword || fallback.esocialCertPassword,
      esocialTipoInscricao: primary.esocialTipoInscricao || fallback.esocialTipoInscricao,
      esocialNrInscricao: primary.esocialNrInscricao || fallback.esocialNrInscricao,
      esocialAmbiente: primary.esocialAmbiente || fallback.esocialAmbiente,
    };
  }

  private async getEmpresaIntegrationRow(empresaId: string): Promise<EmpresaIntegrationRow | null> {
    const supabase = this.getSupabaseClient();

    const { data, error } = await supabase
      .from('empresa_integracoes_esocial')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205') {
        logger.warn('Tabela empresa_integracoes_esocial nao encontrada no banco');
        return null;
      }

      throw error;
    }

    return (data || null) as EmpresaIntegrationRow | null;
  }

  private async getLegacyGroupIntegrationRow(groupId: string): Promise<LegacyGroupIntegrationRow | null> {
    const supabase = this.getSupabaseClient();

    const { data, error } = await supabase
      .from('group_integrations')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205') {
        return null;
      }

      throw error;
    }

    return (data || null) as LegacyGroupIntegrationRow | null;
  }

  async getEffectiveConfig(empresaId?: string): Promise<EffectiveConfig> {
    const envFallback = this.getEnvFallbackConfig();

    if (!empresaId) {
      if (allowGlobalIntegrationFallback) {
        logger.warn('Requisicao sem empresa_id: usando fallback global de ambiente');
        return envFallback;
      }

      throw new Error('empresa_id nao informado para carregar integracao');
    }

    try {
      const row = await this.getEmpresaIntegrationRow(empresaId);
      if (row) {
        const config = this.mapEmpresaRowToEffectiveConfig(row);
        return this.mergeWithFallback(config, envFallback, allowGlobalIntegrationFallback);
      }

      const legacyRow = await this.getLegacyGroupIntegrationRow(empresaId);
      if (legacyRow) {
        logger.warn(`Usando configuracao legada group_integrations para empresa ${empresaId}`);
        const config = this.mapLegacyRowToEffectiveConfig(legacyRow);
        return this.mergeWithFallback(config, envFallback, allowGlobalIntegrationFallback);
      }
    } catch (error: any) {
      logger.error(`Erro ao buscar configuracao da empresa ${empresaId}:`, error.message);
      if (!allowGlobalIntegrationFallback) {
        throw error;
      }
    }

    if (allowGlobalIntegrationFallback) {
      logger.warn(`Config da empresa ${empresaId} nao encontrada. Usando fallback global`);
      return envFallback;
    }

    throw new Error(`Integracao nao configurada para empresa ${empresaId}`);
  }

  async getEmpresaIntegrationPublicView(empresaId: string): Promise<EmpresaIntegrationPublicView | null> {
    const row = await this.getEmpresaIntegrationRow(empresaId);
    if (!row) return null;

    const govbrClientSecret = row.govbr_client_secret_enc ? decryptText(row.govbr_client_secret_enc) : null;
    const esocialCertBase64 = row.esocial_cert_base64_enc ? decryptText(row.esocial_cert_base64_enc) : null;
    const esocialCertPassword = row.esocial_cert_password_enc ? decryptText(row.esocial_cert_password_enc) : null;

    return {
      empresaId: row.empresa_id,
      govbrClientId: row.govbr_client_id,
      govbrRedirectUri: row.govbr_redirect_uri,
      govbrEnvironment: row.govbr_environment || 'staging',
      hasGovbrClientSecret: !!govbrClientSecret,
      govbrClientSecretMasked: maskSecret(govbrClientSecret),
      hasEsocialCert: !!esocialCertBase64,
      hasEsocialCertPassword: !!esocialCertPassword,
      esocialTipoInscricao: row.esocial_tipo_inscricao || '1',
      esocialNrInscricao: row.esocial_nr_inscricao,
      esocialAmbiente: row.esocial_ambiente || '2',
      certificadoAlias: row.certificado_alias,
      certificadoValidoAte: row.certificado_valido_ate,
      updatedAt: (row as any).updated_at || null,
    };
  }

  async upsertEmpresaIntegration(empresaId: string, config: EmpresaIntegrationUpsertInput): Promise<void> {
    const supabase = this.getSupabaseClient();

    const payload: Record<string, any> = {
      empresa_id: empresaId,
      updated_at: new Date().toISOString(),
    };

    if (config.govbrClientId !== undefined) payload.govbr_client_id = config.govbrClientId;
    if (config.govbrClientSecret !== undefined) {
      payload.govbr_client_secret_enc = config.govbrClientSecret === null
        ? null
        : encryptText(config.govbrClientSecret);
    }
    if (config.govbrRedirectUri !== undefined) payload.govbr_redirect_uri = config.govbrRedirectUri;
    if (config.govbrEnvironment !== undefined && config.govbrEnvironment !== null) {
      payload.govbr_environment = config.govbrEnvironment;
    }

    if (config.esocialCertBase64 !== undefined) {
      payload.esocial_cert_base64_enc = config.esocialCertBase64 === null
        ? null
        : encryptText(config.esocialCertBase64);
    }
    if (config.esocialCertPassword !== undefined) {
      payload.esocial_cert_password_enc = config.esocialCertPassword === null
        ? null
        : encryptText(config.esocialCertPassword);
    }
    if (config.esocialTipoInscricao !== undefined && config.esocialTipoInscricao !== null) {
      payload.esocial_tipo_inscricao = config.esocialTipoInscricao;
    }
    if (config.esocialNrInscricao !== undefined) payload.esocial_nr_inscricao = config.esocialNrInscricao;
    if (config.esocialAmbiente !== undefined && config.esocialAmbiente !== null) {
      payload.esocial_ambiente = config.esocialAmbiente;
    }

    if (config.certificadoAlias !== undefined) payload.certificado_alias = config.certificadoAlias;
    if (config.certificadoValidoAte !== undefined) payload.certificado_valido_ate = config.certificadoValidoAte;

    const { error } = await supabase
      .from('empresa_integracoes_esocial')
      .upsert(payload, { onConflict: 'empresa_id' });

    if (error) {
      logger.error(`Erro ao salvar configuracao da empresa ${empresaId}:`, error.message);
      throw error;
    }

    logger.info(`Configuracao de integracao da empresa ${empresaId} atualizada com sucesso`);
  }

  // Compatibilidade temporaria com chamadas antigas
  async getGroupIntegration(groupId: string): Promise<LegacyGroupIntegrationRow | null> {
    return this.getLegacyGroupIntegrationRow(groupId);
  }

  // Compatibilidade temporaria com chamadas antigas
  async upsertGroupIntegration(groupId: string, config: Partial<LegacyGroupIntegrationRow>): Promise<void> {
    await this.upsertEmpresaIntegration(groupId, {
      govbrClientId: config.govbr_client_id,
      govbrClientSecret: config.govbr_client_secret,
      govbrRedirectUri: config.govbr_redirect_uri,
      govbrEnvironment: config.govbr_environment,
      esocialCertBase64: config.esocial_cert_base64,
      esocialCertPassword: config.esocial_cert_password,
      esocialTipoInscricao: config.esocial_tipo_inscricao,
      esocialNrInscricao: config.esocial_nr_inscricao,
      esocialAmbiente: config.esocial_ambiente,
    });
  }
}

export const groupConfigService = new GroupConfigService();
