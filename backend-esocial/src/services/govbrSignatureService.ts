import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { EffectiveConfig, groupConfigService } from './groupConfigService';

const getGovbrUrls = (environment: 'staging' | 'production') => ({
  auth: environment === 'production'
    ? 'https://sso.acesso.gov.br'
    : 'https://sso.staging.acesso.gov.br',
  signApi: environment === 'production'
    ? 'https://assinatura-api.iti.br'
    : 'https://assinatura-api.staging.iti.br',
});

interface GovBrTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface GovBrCertificateResponse {
  certificate: string;
  subjectDN: string;
  issuerDN: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
}

interface SignatureResult {
  success: boolean;
  pkcs7?: string;
  error?: string;
}

export class GovBrSignatureService {
  private config: EffectiveConfig;
  private govbrUrls: { auth: string; signApi: string };

  constructor(config: EffectiveConfig) {
    this.config = config;
    this.govbrUrls = getGovbrUrls(config.govbrEnvironment);
  }

  static async createForEmpresa(empresaId?: string): Promise<GovBrSignatureService> {
    const config = await groupConfigService.getEffectiveConfig(empresaId);
    return new GovBrSignatureService(config);
  }

  // Compatibilidade temporaria
  static async createForGroup(groupId?: string): Promise<GovBrSignatureService> {
    return this.createForEmpresa(groupId);
  }

  getAuthorizationUrl(state: string, nonce: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.govbrClientId,
      scope: 'openid email phone profile govbr_confiabilidades signature_session',
      redirect_uri: this.config.govbrRedirectUri,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.govbrUrls.auth}/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<GovBrTokenResponse> {
    try {
      const response = await axios.post<GovBrTokenResponse>(
        `${this.govbrUrls.auth}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.govbrRedirectUri,
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.config.govbrClientId}:${this.config.govbrClientSecret}`).toString('base64')}`,
          },
        }
      );

      logger.info('Token gov.br obtido com sucesso');
      return response.data;
    } catch (error: any) {
      logger.error('Erro ao obter token gov.br:', error.response?.data || error.message);
      throw new Error('Falha ao obter token de acesso gov.br');
    }
  }

  async getUserCertificate(accessToken: string): Promise<GovBrCertificateResponse> {
    try {
      const response = await axios.get<GovBrCertificateResponse>(
        `${this.govbrUrls.signApi}/externo/v2/certificadoPublico`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('Certificado gov.br obtido com sucesso');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data || error.message;
      logger.error('Erro ao obter certificado gov.br:', errorMessage);

      if (error.response?.status === 403) {
        throw new Error('Usuario nao possui conta Prata ou Ouro no gov.br');
      }

      throw new Error('Falha ao obter certificado digital');
    }
  }

  async signHash(accessToken: string, documentHash: string): Promise<SignatureResult> {
    try {
      const response = await axios.post(
        `${this.govbrUrls.signApi}/externo/v2/assinarPKCS7`,
        { hashBase64: documentHash },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          responseType: 'arraybuffer',
        }
      );

      const pkcs7Base64 = Buffer.from(response.data).toString('base64');
      logger.info('Documento assinado com sucesso via gov.br');

      return {
        success: true,
        pkcs7: pkcs7Base64,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.toString() || error.message;
      logger.error('Erro ao assinar documento:', errorMessage);

      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Cidadao nao possui identidade Prata ou Ouro necessaria para assinatura digital',
        };
      }

      return {
        success: false,
        error: 'Falha ao assinar documento',
      };
    }
  }

  async signBatch(accessToken: string, documentHashes: string[]): Promise<SignatureResult[]> {
    const results: SignatureResult[] = [];

    for (const hash of documentHashes) {
      const result = await this.signHash(accessToken, hash);
      results.push(result);
    }

    return results;
  }

  calculateHash(document: Buffer | string): string {
    const hash = crypto.createHash('sha256');
    hash.update(document);
    return hash.digest('base64');
  }

  generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }
}

export const createGovBrSignatureService = GovBrSignatureService.createForEmpresa;
