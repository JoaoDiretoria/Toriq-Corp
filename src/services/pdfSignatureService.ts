/**
 * Serviço para assinatura digital de PDFs com certificado ICP-Brasil A1.
 *
 * Migração: antes apontava para um backend eSocial externo (VITE_ESOCIAL_BACKEND_URL).
 * Agora usa a API principal (apps/api), autenticada via cookie httpOnly:
 *   - GET  /esocial/pdf/certificate-info  → status do certificado A1 da empresa
 *   - POST /esocial/pdf/sign              → assina o PDF (PAdES ICP-Brasil)
 *
 * O tenant vem do usuário autenticado — o parâmetro empresaId é mantido só por
 * compatibilidade com os chamadores (não é mais enviado ao backend).
 */
import { api } from '@/integrations/api/client';

interface CertificadoInfo {
  configurado: boolean;
  cn?: string;
  validade?: string;
  expirado?: boolean;
}

interface AssinaturaResultado {
  success: boolean;
  pdfAssinadoBase64?: string;
  error?: string;
  certificadoInfo?: {
    cn: string;
    emissor: string;
    serialNumber: string;
  };
}

// Shapes retornados pelo backend (snake_case).
interface CertificateInfoOut {
  configurado: boolean;
  cn?: string | null;
  valido_ate?: string | null;
  expirado?: boolean | null;
}

interface AssinarPdfOut {
  success: boolean;
  pdf_base64?: string | null;
  certificado_info?: { cn: string; emissor: string; serial_number: string } | null;
  error?: string | null;
}

/**
 * Verifica se a empresa tem um certificado A1 configurado e válido.
 */
export async function verificarCertificadoEmpresa(_empresaId?: string): Promise<CertificadoInfo> {
  try {
    const data = await api.get<CertificateInfoOut>('/esocial/pdf/certificate-info');
    if (!data?.configurado) {
      return { configurado: false };
    }
    return {
      configurado: true,
      cn: data.cn ?? undefined,
      validade: data.valido_ate ?? undefined,
      expirado: data.expirado ?? undefined,
    };
  } catch (error) {
    console.error('Erro ao verificar certificado da empresa:', error);
    return { configurado: false };
  }
}

/**
 * Assina um PDF com o certificado ICP-Brasil A1 da empresa.
 * Adiciona uma página de assinatura ao final e aplica a assinatura PAdES.
 */
export async function assinarPdfComIcpBrasil(
  pdfBase64: string,
  _empresaId: string,
  documentoTipo: string,
  motivoAssinatura?: string,
): Promise<AssinaturaResultado> {
  try {
    const data = await api.post<AssinarPdfOut>('/esocial/pdf/sign', {
      pdf_base64: pdfBase64,
      documento_tipo: documentoTipo,
      motivo_assinatura: motivoAssinatura || `Certificado de ${documentoTipo}`,
    });

    if (!data?.success || !data.pdf_base64) {
      return { success: false, error: data?.error || 'Erro ao assinar PDF' };
    }

    return {
      success: true,
      pdfAssinadoBase64: data.pdf_base64,
      certificadoInfo: data.certificado_info
        ? {
            cn: data.certificado_info.cn,
            emissor: data.certificado_info.emissor,
            serialNumber: data.certificado_info.serial_number,
          }
        : undefined,
    };
  } catch (error: any) {
    console.error('Erro ao assinar PDF:', error);
    return {
      success: false,
      error: error?.message || 'Erro de conexão com o servidor de assinatura',
    };
  }
}

/**
 * Converte um Blob para Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converte Base64 para Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'application/pdf'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
