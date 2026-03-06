import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AcaoAuditoria = 'criou' | 'atualizou' | 'deletou';
export type EntidadeAuditoria = 'turma' | 'aula' | 'colaborador' | 'presenca' | 'instrutor' | 'certificado' | 'prova';

interface RegistrarAuditoriaParams {
  turmaId?: string | null;
  turmaCodigo?: string | null;
  acao: AcaoAuditoria;
  entidade: EntidadeAuditoria;
  descricao: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
}

export function useTurmasAuditoria() {
  const { user, profile } = useAuth();

  const registrarAuditoria = async ({
    turmaId,
    turmaCodigo,
    acao,
    entidade,
    descricao,
    dadosAnteriores,
    dadosNovos
  }: RegistrarAuditoriaParams) => {
    if (!user || !profile?.empresa_id) {
      console.warn('Auditoria: usuário ou empresa não identificados');
      return;
    }

    try {
      const db = supabase as any;
      
      // Mapear role para nome amigável
      const roleMap: Record<string, string> = {
        'admin_vertical': 'Admin Vertical',
        'empresa_sst': 'Administrador',
        'gestor': 'Gestor',
        'operador': 'Operador',
        'visualizador': 'Visualizador',
        'cliente_final': 'Cliente',
        'empresa_parceira': 'Parceiro',
        'instrutor': 'Instrutor'
      };
      
      const roleDisplay = profile.role ? (roleMap[profile.role] || profile.role) : null;
      
      // Buscar nome do setor se o usuário tiver setor_id
      let setorDisplay: string | null = null;
      const setorId = (profile as any).setor_id;
      if (setorId) {
        const { data: setorData } = await db
          .from('setores')
          .select('nome')
          .eq('id', setorId)
          .maybeSingle();
        setorDisplay = setorData?.nome || null;
      }
      
      const { error } = await db.from('turmas_auditoria').insert({
        empresa_id: profile.empresa_id,
        turma_id: turmaId || null,
        turma_codigo: turmaCodigo || null,
        usuario_id: user.id,
        usuario_nome: profile.nome || user.email?.split('@')[0] || 'Usuário',
        usuario_email: user.email,
        usuario_role: roleDisplay,
        usuario_setor: setorDisplay,
        acao,
        entidade,
        descricao,
        dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
        ip_address: null,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Erro ao registrar auditoria:', error);
      }
    } catch (err) {
      console.error('Erro ao registrar auditoria:', err);
    }
  };

  return { registrarAuditoria };
}
