import { useState, useCallback } from 'react';
// import { api } from '@/integrations/api/client'; // NOTA (migração): disponível para uso futuro quando endpoints de movimentações forem criados no backend
import { useAuth } from './useAuth';

export interface CardMovimentacao {
  id: string;
  card_id: string;
  card_tipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling' | 'contas_receber';
  usuario_id: string | null;
  tipo: 'criacao' | 'mudanca_coluna' | 'mudanca_kanban' | 'mudanca_etapa' | 'encaminhamento' | 'edicao';
  descricao: string;
  kanban_origem: string | null;
  kanban_destino: string | null;
  coluna_origem_id: string | null;
  coluna_destino_id: string | null;
  coluna_origem_nome: string | null;
  coluna_destino_nome: string | null;
  dados_anteriores: any;
  dados_novos: any;
  created_at: string;
  usuario?: { nome: string };
}

export type KanbanTipo = 'prospeccao' | 'closer' | 'onboarding' | 'cross_selling' | 'financeiro';

interface RegistrarMovimentacaoParams {
  cardId: string;
  cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling' | 'contas_receber';
  tipo: 'criacao' | 'mudanca_coluna' | 'mudanca_kanban' | 'mudanca_etapa' | 'encaminhamento' | 'edicao';
  descricao: string;
  kanbanOrigem?: KanbanTipo;
  kanbanDestino?: KanbanTipo;
  colunaOrigemId?: string;
  colunaDestinoId?: string;
  colunaOrigemNome?: string;
  colunaDestinoNome?: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
}

const KANBAN_LABELS: Record<KanbanTipo, string> = {
  prospeccao: 'Prospecção',
  closer: 'Closer',
  onboarding: 'Onboarding',
  cross_selling: 'Cross-Selling',
  financeiro: 'Financeiro',
};


export function useCardMovimentacoes() {
  const { profile } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<CardMovimentacao[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar movimentações de um card específico (incluindo card original se existir)
  // IMPORTANTE: Busca na tabela de MOVIMENTAÇÕES, não de atividades!
  // NOTA (migração): não há endpoints REST dedicados para listar movimentações por card_id;
  // as movimentações são criadas internamente pelo backend via /mover. Degrade para lista vazia.
  const fetchMovimentacoes = useCallback(async (
    _cardId: string,
    cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling' | 'contas_receber',
    _origemCardId?: string,
    _origemKanban?: string
  ) => {
    setLoading(true);
    try {
      // NOTA (migração): endpoints de listagem de movimentações por card_id não existem no backend.
      // O backend registra movimentações automaticamente via /mover. Degrade para lista vazia.

      // Não há endpoint de leitura de movimentações — retorna lista vazia para manter a UI intacta
      let todasMovimentacoes: any[] = [];

      // Ordenar por data (mais recente primeiro)
      todasMovimentacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Mapear para o formato CardMovimentacao
      // Usa campos diretos da tabela de movimentações (kanban_origem, kanban_destino, etc.)
      // com fallback para dados_anteriores/dados_novos para compatibilidade
      const movs: CardMovimentacao[] = todasMovimentacoes.map((mov: any) => ({
        id: mov.id,
        card_id: mov.card_id,
        card_tipo: cardTipo,
        usuario_id: mov.usuario_id,
        tipo: mov.tipo,
        descricao: mov.descricao,
        kanban_origem: mov.kanban_origem || mov.dados_anteriores?.kanban_origem || null,
        kanban_destino: mov.kanban_destino || mov.dados_novos?.kanban_destino || null,
        coluna_origem_id: mov.coluna_origem_id || mov.dados_anteriores?.coluna_origem_id || null,
        coluna_destino_id: mov.coluna_destino_id || mov.dados_novos?.coluna_destino_id || null,
        coluna_origem_nome: mov.dados_anteriores?.coluna_origem_nome || null,
        coluna_destino_nome: mov.dados_novos?.coluna_destino_nome || null,
        dados_anteriores: mov.dados_anteriores,
        dados_novos: mov.dados_novos,
        created_at: mov.created_at,
        usuario: mov.usuario,
      }));

      setMovimentacoes(movs);
      return movs;
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Registrar uma nova movimentação na tabela de MOVIMENTAÇÕES (não atividades!)
  // IMPORTANTE: Movimentações são registros automáticos de mudanças de coluna/kanban
  // Atividades são tarefas criadas manualmente pelo usuário
  // NOTA (migração): não há endpoint REST de POST direto para movimentacoes; o backend
  // registra movimentações automaticamente ao chamar /mover. Esta função torna-se no-op
  // e retorna true para não quebrar os chamadores. O histórico passa a ser gerado pelo backend.
  const registrarMovimentacao = useCallback(async (_params: RegistrarMovimentacaoParams) => {
    try {
      // NOTA (migração): sem endpoint de criação direta de movimentações no backend.
      // O backend cria movimentações automaticamente via /mover. Retorna true (no-op).
      return true;
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      return false;
    }
  }, [profile?.id]);

  // Registrar criação de card
  const registrarCriacao = useCallback(async (
    cardId: string,
    cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling',
    kanban: KanbanTipo,
    colunaNome: string,
    colunaId?: string,
    nomeCard?: string
  ) => {
    return registrarMovimentacao({
      cardId,
      cardTipo,
      tipo: 'criacao',
      descricao: `Card "${nomeCard || 'Novo'}" criado em ${KANBAN_LABELS[kanban]} → ${colunaNome}`,
      kanbanDestino: kanban,
      colunaDestinoId: colunaId,
      colunaDestinoNome: colunaNome,
    });
  }, [registrarMovimentacao]);

  // Registrar mudança de coluna (dentro do mesmo Kanban)
  const registrarMudancaColuna = useCallback(async (
    cardId: string,
    cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling',
    kanban: KanbanTipo,
    colunaOrigemNome: string,
    colunaDestinoNome: string,
    colunaOrigemId?: string,
    colunaDestinoId?: string,
    justificativa?: string
  ) => {
    const desc = justificativa 
      ? `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}" | Justificativa: ${justificativa}`
      : `Movido de "${colunaOrigemNome}" para "${colunaDestinoNome}"`;

    return registrarMovimentacao({
      cardId,
      cardTipo,
      tipo: 'mudanca_coluna',
      descricao: desc,
      kanbanOrigem: kanban,
      kanbanDestino: kanban,
      colunaOrigemId,
      colunaDestinoId,
      colunaOrigemNome,
      colunaDestinoNome,
    });
  }, [registrarMovimentacao]);

  // Registrar mudança de Kanban (encaminhamento para outro módulo)
  const registrarMudancaKanban = useCallback(async (
    cardId: string,
    cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling',
    kanbanOrigem: KanbanTipo,
    kanbanDestino: KanbanTipo,
    colunaDestinoNome?: string,
    colunaDestinoId?: string,
    nomeCard?: string
  ) => {
    return registrarMovimentacao({
      cardId,
      cardTipo,
      tipo: 'mudanca_kanban',
      descricao: `Card "${nomeCard || ''}" encaminhado de ${KANBAN_LABELS[kanbanOrigem]} para ${KANBAN_LABELS[kanbanDestino]}${colunaDestinoNome ? ` → ${colunaDestinoNome}` : ''}`,
      kanbanOrigem,
      kanbanDestino,
      colunaDestinoId,
      colunaDestinoNome,
    });
  }, [registrarMovimentacao]);

  // Buscar movimentações específicas para Contas a Receber (toda a cadeia: CR -> Closer -> Prospecção)
  // NOTA (migração): não há endpoints REST para listar movimentações de CR, closer ou prospecção
  // por card_id/conta_id. O backend cria movimentações via /mover. Degrade para lista vazia.
  const fetchMovimentacoesContasReceber = useCallback(async (
    _contaId: string,
    _closerCardId?: string,
    _origemCardId?: string,
    _origemKanban?: string
  ) => {
    setLoading(true);
    try {
      // NOTA (migração): não há endpoints REST para listar movimentações de CR, closer ou prospecção
      // por card_id/conta_id. O backend cria movimentações automaticamente via /mover.
      // Degrade para lista vazia para manter a UI intacta.
      let todasMovimentacoes: any[] = [];

      // Ordenar por data (mais recente primeiro)
      todasMovimentacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Mapear para o formato CardMovimentacao
      const movs: CardMovimentacao[] = todasMovimentacoes.map((mov: any) => ({
        id: mov.id,
        card_id: mov.card_id || mov.conta_id,
        card_tipo: 'contas_receber' as const,
        usuario_id: mov.usuario_id,
        tipo: mov.tipo,
        descricao: mov.descricao,
        kanban_origem: mov._kanban_origem || mov.kanban_origem || mov.dados_anteriores?.kanban_origem || null,
        kanban_destino: mov._kanban_origem || mov.kanban_destino || mov.dados_novos?.kanban_destino || null,
        coluna_origem_id: mov.coluna_origem_id || mov.dados_anteriores?.coluna_origem_id || null,
        coluna_destino_id: mov.coluna_destino_id || mov.dados_novos?.coluna_destino_id || null,
        coluna_origem_nome: mov.dados_anteriores?.coluna_nome || mov.dados_anteriores?.coluna_origem_nome || null,
        coluna_destino_nome: mov.dados_novos?.coluna_nome || mov.dados_novos?.coluna_destino_nome || null,
        dados_anteriores: mov.dados_anteriores,
        dados_novos: mov.dados_novos,
        created_at: mov.created_at,
        usuario: mov.usuario,
      }));

      setMovimentacoes(movs);
      return movs;
    } catch (error) {
      console.error('Erro ao buscar movimentações do Contas a Receber:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    movimentacoes,
    loading,
    fetchMovimentacoes,
    fetchMovimentacoesContasReceber,
    registrarMovimentacao,
    registrarCriacao,
    registrarMudancaColuna,
    registrarMudancaKanban,
    KANBAN_LABELS,
  };
}
