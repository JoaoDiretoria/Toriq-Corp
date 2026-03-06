import { useMemo } from 'react';
import { usePermissoes } from './usePermissoes';
import { useToast } from './use-toast';

interface TelaPermissoes {
  podeVer: boolean;
  podeEditar: boolean;
  podeCriar: boolean;
  somenteVisualizacao: boolean;
  verificarAntesDeEditar: (callback: () => void) => void;
  verificarAntesDeCriar: (callback: () => void) => void;
  verificarAntesDeSalvar: (callback: () => void) => void;
  mensagemPermissao: string;
}

/**
 * Hook para controle de permissões em qualquer tela do sistema.
 * 
 * @param telaId - ID da tela (ex: 'cadastros', 'configuracoes', 'toriq-corp-tarefas', 'setor-{uuid}')
 * @returns Objeto com permissões e funções de verificação
 * 
 * @example
 * const { podeVer, podeEditar, podeCriar, somenteVisualizacao, verificarAntesDeSalvar } = useTelaPermissoes('cadastros');
 * 
 * // Verificar antes de salvar
 * const handleSave = () => {
 *   verificarAntesDeSalvar(() => {
 *     // Código para salvar
 *   });
 * };
 * 
 * // Desabilitar botão se não pode editar
 * <Button disabled={!podeEditar}>Salvar</Button>
 * 
 * // Mostrar badge de somente visualização
 * {somenteVisualizacao && <Badge>Somente Visualização</Badge>}
 */
export function useTelaPermissoes(telaId: string): TelaPermissoes {
  const { podeVisualizar, podeEditar: podeEditarHook, podeCriar: podeCriarHook } = usePermissoes();
  const { toast } = useToast();

  const permissoes = useMemo(() => {
    const podeVer = podeVisualizar(telaId);
    const podeEditar = podeEditarHook(telaId);
    const podeCriar = podeCriarHook(telaId);
    const somenteVisualizacao = podeVer && !podeEditar && !podeCriar;

    let mensagemPermissao = '';
    if (somenteVisualizacao) {
      mensagemPermissao = 'Você tem permissão apenas para visualizar esta tela. Não é possível criar ou editar registros.';
    } else if (podeVer && podeEditar && !podeCriar) {
      mensagemPermissao = 'Você pode visualizar e editar registros, mas não pode criar novos.';
    }

    return {
      podeVer,
      podeEditar,
      podeCriar,
      somenteVisualizacao,
      mensagemPermissao,
    };
  }, [telaId, podeVisualizar, podeEditarHook, podeCriarHook]);

  const verificarAntesDeEditar = (callback: () => void) => {
    if (!permissoes.podeEditar) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar registros nesta tela.',
        variant: 'destructive',
      });
      return;
    }
    callback();
  };

  const verificarAntesDeCriar = (callback: () => void) => {
    if (!permissoes.podeCriar) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para criar novos registros nesta tela.',
        variant: 'destructive',
      });
      return;
    }
    callback();
  };

  const verificarAntesDeSalvar = (callback: () => void) => {
    if (!permissoes.podeEditar && !permissoes.podeCriar) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para salvar alterações nesta tela.',
        variant: 'destructive',
      });
      return;
    }
    callback();
  };

  return {
    ...permissoes,
    verificarAntesDeEditar,
    verificarAntesDeCriar,
    verificarAntesDeSalvar,
  };
}

/**
 * Componente para exibir badge de permissões.
 * Mostra automaticamente quando o usuário tem restrições de acesso.
 */
export function PermissaoBadge({ telaId }: { telaId: string }) {
  const { somenteVisualizacao, podeEditar, podeCriar, mensagemPermissao } = useTelaPermissoes(telaId);

  if (!somenteVisualizacao && (podeEditar || podeCriar)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border-amber-300">
        {somenteVisualizacao ? 'Somente Visualização' : 'Sem Permissão para Criar'}
      </span>
      <span className="text-sm text-amber-700 dark:text-amber-400">
        {mensagemPermissao}
      </span>
    </div>
  );
}
