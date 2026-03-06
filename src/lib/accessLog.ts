import { supabase } from '@/integrations/supabase/client';

interface LogData {
  acao: 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete';
  modulo?: string;
  pagina?: string;
  descricao?: string;
  metadata?: Record<string, any>;
}

// Detectar tipo de dispositivo
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Detectar browser
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'Internet Explorer';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Edg')) return 'Edge Chromium';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

// Detectar OS
const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
};

// Obter IP público (via API externa)
const getPublicIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};

// Função principal para registrar log - NÃO usa hooks, pode ser chamada de qualquer lugar
export const logAccess = async (
  empresaId: string,
  userId: string | null,
  userEmail: string | null,
  userNome: string | null,
  data: LogData
): Promise<void> => {
  try {
    const ip = await getPublicIP();
    
    await (supabase as any)
      .from('access_logs')
      .insert({
        empresa_id: empresaId,
        user_id: userId,
        user_email: userEmail,
        user_nome: userNome,
        acao: data.acao,
        modulo: data.modulo || null,
        pagina: data.pagina || null,
        descricao: data.descricao || null,
        ip_address: ip,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        metadata: data.metadata || {}
      });
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error);
  }
};

export type { LogData };
