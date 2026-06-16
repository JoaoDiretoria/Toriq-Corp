import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { api } from '@/integrations/api/client';
import { useHierarquia, GrupoAcesso } from '@/hooks/useHierarquia';
import { MODULO_NOME_PARA_CODIGO } from '@/config/modulosTelas';

interface PermissaoSetor {
  setor_id: string;
  modulo_id: string;
  pagina_id: string;
  visualizar: boolean;
  editar: boolean;
  criar: boolean;
}

interface TelasEmpresa {
  modulo_id: string;
  tela_id: string;
  ativo: boolean;
}

interface ModuloEmpresa {
  modulo_id: string;
  ativo: boolean;
}

// Mapeamento de seções do sidebar para IDs de módulo/página
const SECAO_PARA_PERMISSAO: Record<string, { modulo_id: string; pagina_id: string }> = {
  // Perfil da Empresa
  'meu-perfil': { modulo_id: 'perfil_empresa', pagina_id: 'meu_perfil' },
  'usuarios': { modulo_id: 'perfil_empresa', pagina_id: 'usuarios' },
  'clientes': { modulo_id: 'perfil_empresa', pagina_id: 'meus_clientes' },
  'informacoes-empresa': { modulo_id: 'perfil_empresa', pagina_id: 'informacoes_empresa' },
  'configuracoes': { modulo_id: 'perfil_empresa', pagina_id: 'configuracoes' },
  'cadastros': { modulo_id: 'perfil_empresa', pagina_id: 'cadastros' },
  
  // Toriq Corp (Gestão Empresarial) - Páginas principais por setor
  'toriq-corp-tarefas': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_tarefas' },
  'toriq-corp-comercial': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_comercial' },
  'toriq-corp-contratos': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_contratos' },
  'toriq-corp-setores': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_setores' },
  'toriq-corp-administrativo': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_administrativo' },
  'toriq-corp-financeiro': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_financeiro' },
  'toriq-corp-tecnico': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_tecnico' },
  'toriq-corp-marketing': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_marketing' },
  'toriq-corp-controle-frota': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_controle_frota' },
  'toriq-corp-controle-equipamentos': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_controle_equipamentos' },
  'toriq-corp-configuracoes': { modulo_id: 'toriq_corp', pagina_id: 'toriq_corp_configuracoes' },

};

// Mapeamento de módulos para suas seções
const MODULO_SECOES: Record<string, string[]> = {
  'perfil_empresa': ['meu-perfil', 'usuarios', 'clientes', 'informacoes-empresa', 'configuracoes'],
  'toriq_corp': [
    'toriq-corp-tarefas', 'toriq-corp-comercial', 'toriq-corp-contratos', 'toriq-corp-setores',
    'toriq-corp-administrativo', 'toriq-corp-financeiro', 'toriq-corp-tecnico', 'toriq-corp-marketing', 
    'toriq-corp-controle-frota', 'toriq-corp-controle-equipamentos', 'toriq-corp-configuracoes'
  ],
};

export function usePermissoes() {
  const { profile, empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  
  const [permissoes, setPermissoes] = useState<PermissaoSetor[]>([]);
  const [telasEmpresa, setTelasEmpresa] = useState<TelasEmpresa[]>([]);
  const [modulosEmpresa, setModulosEmpresa] = useState<ModuloEmpresa[]>([]);
  // Mapa código do módulo (ex. 'toriq_corp') → UUID real do catálogo, resolvido
  // dinamicamente no load. Substitui o MODULO_ID_PARA_UUID chumbado.
  const [moduloUuidPorCodigo, setModuloUuidPorCodigo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminVertical, setIsAdminVertical] = useState(false);

  useEffect(() => {
    const loadPermissoes = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      const setorId = profile.setor_id;

      // admin_vertical sempre tem acesso total (não aplica restrições de telas da empresa)
      if (profile.role === 'admin_vertical') {
        setIsAdmin(true);
        setIsAdminVertical(true);
        setLoading(false);
        return;
      }

      // cliente_torq SEM setor_id tem acesso total (é o dono/admin da empresa)
      // MAS ainda precisa respeitar as telas liberadas para a empresa
      if (profile.role === 'cliente_torq' && !setorId) {
        setIsAdmin(true);
        setIsAdminVertical(false);
      }

      // cliente_final SEM setor_id tem acesso total à sua empresa
      if ((profile.role as string) === 'cliente_final' && !setorId) {
        setIsAdmin(true);
        setIsAdminVertical(false);
      }

      // Carregar módulos e telas liberadas para a empresa.
      // Backend novo: /white-label/empresa-modulos e /white-label/empresa-modulos-telas
      // (ambos já escopados por empresa_id do token). O filtro ativo=true, antes
      // no .eq() do Supabase, é aplicado no cliente.
      if (empresaId) {
        try {
          const [modulosData, telasData, catalogoData] = await Promise.all([
            api.get<any[]>('/white-label/empresa-modulos').catch(() => [] as any[]),
            api.get<any[]>('/white-label/empresa-modulos-telas').catch(() => [] as any[]),
            api.get<any[]>('/white-label/modulos').catch(() => [] as any[]),
          ]);

          // Resolve código do módulo (ex. 'toriq_corp') → UUID real do catálogo,
          // eliminando o UUID chumbado que nunca casava com o id gerado no banco.
          const codigoParaUuid: Record<string, string> = {};
          (catalogoData || []).forEach((mod: any) => {
            const codigo = MODULO_NOME_PARA_CODIGO[mod.nome];
            if (codigo) codigoParaUuid[codigo] = mod.id;
          });
          setModuloUuidPorCodigo(codigoParaUuid);

          setModulosEmpresa(
            (modulosData || [])
              .filter((mo: any) => mo.ativo)
              .map((mo: any) => ({ modulo_id: mo.modulo_id, ativo: mo.ativo }))
          );

          setTelasEmpresa(
            (telasData || [])
              .filter((te: any) => te.ativo)
              .map((te: any) => ({ modulo_id: te.modulo_id, tela_id: te.tela_id, ativo: te.ativo }))
          );
        } catch (e) {
          console.error('Erro ao carregar módulos/telas da empresa:', e);
        }
      }

      // Se o usuário não tem setor, não tem permissões específicas (bloqueia tudo)
      // Exceto cliente_torq, admin_vertical e cliente_final que têm acesso total à sua empresa
      const roleStr = profile.role as string;
      const isAdminOrSST = roleStr === 'cliente_torq' || roleStr === 'admin_vertical' || roleStr === 'cliente_final';
      if (!setorId && !isAdminOrSST) {
        setPermissoes([]);
        setLoading(false);
        return;
      }

      // Carregar permissões do setor do usuário (se tiver setor).
      // Backend novo: /setores/{setor_id}/permissoes (escopado: valida que o
      // setor pertence à empresa do token). O endpoint devolve TODAS as linhas
      // do setor; o filtro por grupo_acesso, antes no .eq() do Supabase, é
      // aplicado no cliente.
      if (setorId) {
        try {
          const grupoAcesso = profile.grupo_acesso || 'colaborador';
          const data = await api
            .get<any[]>(`/setores/${setorId}/permissoes`)
            .catch(() => [] as any[]);
          setPermissoes((data || []).filter((p: any) => p.grupo_acesso === grupoAcesso));
        } catch (e) {
          console.error('Erro ao carregar permissões:', e);
          setPermissoes([]);
        }
      }
      
      setLoading(false);
    };

    loadPermissoes();
  }, [profile, empresaId]);

  // Verifica se o módulo está ativo para a empresa. Aceita o código do módulo
  // (ex. 'toriq_corp') OU o UUID real — o código é resolvido para o UUID real
  // dinamicamente via catálogo (moduloUuidPorCodigo), sem UUID chumbado.
  const moduloAtivoParaEmpresa = useCallback((moduloIdOuUUID: string): boolean => {
    // Admin Vertical sempre tem acesso total
    if (isAdminVertical) return true;

    // Se não há módulos configurados, permite tudo (comportamento legado)
    if (modulosEmpresa.length === 0) return true;

    // Converter código → UUID real se for um código conhecido; senão usa como veio
    const moduloUUID = moduloUuidPorCodigo[moduloIdOuUUID] || moduloIdOuUUID;

    // Verifica se o módulo está na lista de módulos ativos
    return modulosEmpresa.some(m => m.modulo_id === moduloUUID && m.ativo);
  }, [isAdminVertical, modulosEmpresa, moduloUuidPorCodigo]);

  // Telas do módulo "Perfil da Empresa" que são sempre liberadas para a EMPRESA (não para o usuário)
  // Estas telas são liberadas no nível da empresa, mas o usuário ainda precisa ter permissão do setor
  const TELAS_PERFIL_EMPRESA = ['meu-perfil', 'cadastros', 'configuracoes', 'usuarios', 'clientes', 'informacoes-empresa', 'dashboard-geral', 'suporte'];

  // Verifica se uma tela específica está liberada para a empresa
  // NOTA: Esta função verifica se a EMPRESA tem acesso à tela, não se o USUÁRIO tem
  const telaLiberada = useCallback((telaId: string): boolean => {
    // Admin Vertical sempre tem acesso total
    if (isAdminVertical) return true;

    // Admin da empresa (cliente_torq/cliente_final sem setor) tem acesso a todas as telas
    // dos módulos que a empresa tem ativos
    if (isAdmin) {
      if (TELAS_PERFIL_EMPRESA.includes(telaId)) return true;
      if (telaId.startsWith('setor-')) return moduloAtivoParaEmpresa('toriq_corp');
      const mapeamentoAdmin = SECAO_PARA_PERMISSAO[telaId];
      if (mapeamentoAdmin) return moduloAtivoParaEmpresa(mapeamentoAdmin.modulo_id);
      return true;
    }
    
    // Telas do Perfil da Empresa são sempre liberadas para a empresa (módulo padrão)
    if (TELAS_PERFIL_EMPRESA.includes(telaId)) return true;
    
    // Setores dinâmicos são sempre liberados para a empresa (se o módulo Toriq Corp estiver ativo)
    if (telaId.startsWith('setor-')) {
      return moduloAtivoParaEmpresa('toriq_corp');
    }
    
    // Se não há telas configuradas para a empresa, permite tudo (comportamento legado)
    // APENAS se também não há módulos configurados (empresa nova sem configuração)
    if (telasEmpresa.length === 0 && modulosEmpresa.length === 0) return true;
    
    // Buscar a tela na lista de telas liberadas pela Toriq (admin_vertical)
    const telaConfig = telasEmpresa.find(t => t.tela_id === telaId);
    
    // Se a tela está configurada e ativa, libera (verificando também se o módulo está ativo)
    if (telaConfig && telaConfig.ativo) {
      return moduloAtivoParaEmpresa(telaConfig.modulo_id);
    }

    // Se a tela pertence a um módulo que está ativo mas não tem telas configuradas individualmente,
    // libera a tela automaticamente (módulo ativo = todas as telas do módulo liberadas)
    const mapeamentoTela = SECAO_PARA_PERMISSAO[telaId];
    if (mapeamentoTela) {
      const moduloDaTela = mapeamentoTela.modulo_id;
      const moduloAtivo = moduloAtivoParaEmpresa(moduloDaTela);
      const telasDoModuloConfiguradas = telasEmpresa.some(t => t.modulo_id === (moduloUuidPorCodigo[moduloDaTela] || moduloDaTela));
      if (moduloAtivo && !telasDoModuloConfiguradas) return true;
    }

    // Se a tela não está na lista de telas liberadas, NÃO libera
    // Mesmo para admin da empresa, ele só pode ver o que a Toriq liberou
    return false;
  }, [isAdmin, isAdminVertical, telasEmpresa, modulosEmpresa, moduloAtivoParaEmpresa, moduloUuidPorCodigo]);

  // Verifica se o usuário pode visualizar uma seção
  // Combina: permissões do setor + telas liberadas da empresa
  const podeVisualizar = useCallback((secao: string): boolean => {
    // Primeiro verifica se a tela está liberada para a empresa
    if (!telaLiberada(secao)) return false;
    
    // Se é admin (da empresa sem setor), permite
    if (isAdmin) return true;
    
    // Se o usuário tem setor, deve verificar as permissões do setor
    // Se não há permissões configuradas para o setor, bloqueia por padrão
    if (permissoes.length === 0) return false;
    
    // Verificar se é um setor dinâmico (formato: setor-{uuid})
    if (secao.startsWith('setor-')) {
      const setorId = secao.replace('setor-', '');
      const permissao = permissoes.find(
        p => p.modulo_id === 'toriq_corp' && p.pagina_id === `setor_${setorId}`
      );
      return permissao?.visualizar === true;
    }
    
    // Caso especial: toriq-corp-setores é liberado se o usuário tem permissão para algum setor dinâmico
    if (secao === 'toriq-corp-setores') {
      const temPermissaoParaAlgumSetor = permissoes.some(
        p => p.modulo_id === 'toriq_corp' && p.pagina_id.startsWith('setor_') && p.visualizar
      );
      if (temPermissaoParaAlgumSetor) return true;
    }
    
    const mapeamento = SECAO_PARA_PERMISSAO[secao];
    
    // Se a seção não está mapeada, verifica se é uma tela especial
    if (!mapeamento) {
      // Telas especiais que não precisam de permissão específica
      const telasEspeciais = ['dashboard-geral', 'suporte'];
      if (telasEspeciais.includes(secao)) return true;
      
      // Para outras telas não mapeadas, bloqueia por padrão
      return false;
    }
    
    const permissao = permissoes.find(
      p => p.modulo_id === mapeamento.modulo_id && p.pagina_id === mapeamento.pagina_id
    );
    
    return permissao?.visualizar === true;
  }, [permissoes, isAdmin, telaLiberada]);

  // Verifica se o usuário pode editar em uma seção
  const podeEditar = useCallback((secao: string): boolean => {
    // Primeiro verifica se pode visualizar
    if (!podeVisualizar(secao)) return false;
    
    if (isAdmin) return true;
    
    // Se não há permissões configuradas, bloqueia
    if (permissoes.length === 0) return false;
    
    // Verificar se é um setor dinâmico (formato: setor-{uuid})
    if (secao.startsWith('setor-')) {
      const setorId = secao.replace('setor-', '');
      const permissao = permissoes.find(
        p => p.modulo_id === 'toriq_corp' && p.pagina_id === `setor_${setorId}`
      );
      return permissao?.editar === true;
    }
    
    const mapeamento = SECAO_PARA_PERMISSAO[secao];
    if (!mapeamento) return false;
    
    const permissao = permissoes.find(
      p => p.modulo_id === mapeamento.modulo_id && p.pagina_id === mapeamento.pagina_id
    );
    
    return permissao?.editar === true;
  }, [permissoes, isAdmin, podeVisualizar]);

  // Verifica se o usuário pode criar em uma seção
  const podeCriar = useCallback((secao: string): boolean => {
    // Primeiro verifica se pode visualizar
    if (!podeVisualizar(secao)) return false;
    
    if (isAdmin) return true;
    
    // Se não há permissões configuradas, bloqueia
    if (permissoes.length === 0) return false;
    
    // Verificar se é um setor dinâmico (formato: setor-{uuid})
    if (secao.startsWith('setor-')) {
      const setorId = secao.replace('setor-', '');
      const permissao = permissoes.find(
        p => p.modulo_id === 'toriq_corp' && p.pagina_id === `setor_${setorId}`
      );
      return permissao?.criar === true;
    }
    
    const mapeamento = SECAO_PARA_PERMISSAO[secao];
    if (!mapeamento) return false;
    
    const permissao = permissoes.find(
      p => p.modulo_id === mapeamento.modulo_id && p.pagina_id === mapeamento.pagina_id
    );
    
    return permissao?.criar === true;
  }, [permissoes, isAdmin, podeVisualizar]);

  // Verifica se o módulo inteiro tem alguma permissão de visualização
  const moduloVisivel = useCallback((moduloId: string): boolean => {
    if (isAdmin) return true;
    
    const secoesDoModulo = MODULO_SECOES[moduloId] || [];
    return secoesDoModulo.some(secao => podeVisualizar(secao));
  }, [isAdmin, podeVisualizar]);

  // Retorna as seções visíveis de um módulo
  const getSecoesVisiveis = useCallback((moduloId: string): string[] => {
    if (isAdmin) return MODULO_SECOES[moduloId] || [];
    
    const secoesDoModulo = MODULO_SECOES[moduloId] || [];
    return secoesDoModulo.filter(secao => podeVisualizar(secao));
  }, [isAdmin, podeVisualizar]);

  // Integração com hierarquia
  const hierarquia = useHierarquia();

  return {
    loading: loading || hierarquia.loading,
    isAdmin,
    isAdminVertical,
    permissoes,
    telasEmpresa,
    modulosEmpresa,
    telaLiberada,
    moduloAtivoParaEmpresa,
    podeVisualizar,
    podeEditar,
    podeCriar,
    moduloVisivel,
    getSecoesVisiveis,
    SECAO_PARA_PERMISSAO,
    MODULO_SECOES,
    // Exportar funções de hierarquia
    hierarquia: {
      grupoAcesso: hierarquia.grupoAcesso,
      isAdministrador: hierarquia.isAdministrador,
      isGestor: hierarquia.isGestor,
      isColaborador: hierarquia.isColaborador,
      subordinados: hierarquia.subordinados,
      usuariosVisiveis: hierarquia.usuariosVisiveis,
      podeVerUsuario: hierarquia.podeVerUsuario,
      podeEditarUsuario: hierarquia.podeEditarUsuario,
      podeDeletarUsuario: hierarquia.podeDeletarUsuario,
      podeVerRegistro: hierarquia.podeVerRegistro,
      podeEditarRegistro: hierarquia.podeEditarRegistro,
      podeDeletarRegistro: hierarquia.podeDeletarRegistro,
      getFiltroUsuarios: hierarquia.getFiltroUsuarios,
    },
  };
}
