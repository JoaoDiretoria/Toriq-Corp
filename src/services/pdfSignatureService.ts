/**
 * Serviço para assinatura digital de PDFs com certificado ICP-Brasil A1
 * 
 * Este serviço se comunica com o backend-esocial para:
 * - Verificar se a empresa tem certificado A1 configurado
 * - Assinar PDFs com o certificado da empresa
 */

const ESOCIAL_BACKEND_URL = (import.meta.env.VITE_ESOCIAL_BACKEND_URL || '').replace(/\/+$/, '');

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

/**
 * Verifica se a empresa tem um certificado A1 configurado e válido
 */
export async function verificarCertificadoEmpresa(empresaId: string): Promise<CertificadoInfo> {
  try {
    if (!ESOCIAL_BACKEND_URL || /seu-backend-esocial/i.test(ESOCIAL_BACKEND_URL)) {
      console.warn('VITE_ESOCIAL_BACKEND_URL não configurada');
      return { configurado: false };
    }

    const response = await fetch(`${ESOCIAL_BACKEND_URL}/api/pdf/certificate-info/${empresaId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { configurado: false };
    }

    const data = await response.json();
    
    if (!data.success || !data.hasCertificate) {
      return { configurado: false };
    }

    return {
      configurado: true,
      cn: data.cn,
      validade: data.validoAte,
      expirado: data.expirado,
    };
  } catch (error) {
    console.error('Erro ao verificar certificado da empresa:', error);
    return { configurado: false };
  }
}

/**
 * Assina um PDF com o certificado ICP-Brasil A1 da empresa
 * Adiciona uma página de assinatura ao final do documento
 */
export async function assinarPdfComIcpBrasil(
  pdfBase64: string,
  empresaId: string,
  documentoTipo: string,
  motivoAssinatura?: string
): Promise<AssinaturaResultado> {
  try {
    if (!ESOCIAL_BACKEND_URL || /seu-backend-esocial/i.test(ESOCIAL_BACKEND_URL)) {
      return {
        success: false,
        error: 'Backend de assinatura não configurado (VITE_ESOCIAL_BACKEND_URL)',
      };
    }

    const response = await fetch(`${ESOCIAL_BACKEND_URL}/api/pdf/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfBase64,
        empresaId,
        documentoTipo,
        motivoAssinatura: motivoAssinatura || `Certificado de ${documentoTipo}`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erro ao assinar PDF',
      };
    }

    return {
      success: true,
      pdfAssinadoBase64: data.pdfBase64 || data.pdfAssinado,
      certificadoInfo: data.certificadoInfo,
    };
  } catch (error: any) {
    console.error('Erro ao assinar PDF:', error);
    return {
      success: false,
      error: error.message || 'Erro de conexão com o servidor de assinatura',
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
