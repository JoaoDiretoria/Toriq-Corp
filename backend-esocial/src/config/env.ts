import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.string().default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  
  // Gov.br Assinatura Digital
  GOVBR_CLIENT_ID: z.string().optional(),
  GOVBR_CLIENT_SECRET: z.string().optional(),
  GOVBR_REDIRECT_URI: z.string().optional(),
  GOVBR_ENVIRONMENT: z.string().default('staging'),
  
  // eSocial
  ESOCIAL_CERT_PATH: z.string().optional(),
  ESOCIAL_CERT_PASSWORD: z.string().optional(),
  ESOCIAL_TIPO_INSCRICAO: z.string().default('1'),
  ESOCIAL_NR_INSCRICAO: z.string().optional(),
  ESOCIAL_AMBIENTE: z.string().default('2'),
  
  // Segurança
  API_SECRET_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  REQUIRE_EMPRESA_ID_HEADER: z.string().default('true'),
  ALLOW_GLOBAL_INTEGRATION_FALLBACK: z.string().default('false'),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
};

export const requireEmpresaIdHeader = parseEnvBoolean(env.REQUIRE_EMPRESA_ID_HEADER, true);
export const allowGlobalIntegrationFallback = parseEnvBoolean(
  env.ALLOW_GLOBAL_INTEGRATION_FALLBACK,
  env.NODE_ENV !== 'production'
);

// URLs baseadas no ambiente
export const govbrUrls = {
  auth: env.GOVBR_ENVIRONMENT === 'production' 
    ? 'https://sso.acesso.gov.br'
    : 'https://sso.staging.acesso.gov.br',
  signApi: env.GOVBR_ENVIRONMENT === 'production'
    ? 'https://assinatura-api.iti.br'
    : 'https://assinatura-api.staging.iti.br',
};

export const esocialUrls = {
  envio: env.ESOCIAL_AMBIENTE === '1'
    ? 'https://webservices.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc'
    : 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
  consulta: env.ESOCIAL_AMBIENTE === '1'
    ? 'https://webservices.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    : 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
};
