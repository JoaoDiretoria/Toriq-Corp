import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Mapeia o tipo de card para a tabela de MOVIMENTAÇÕES correspondente (NÃO atividades!)
// Movimentações = histórico de mudanças de coluna/kanban (automático)
// Atividades = tarefas criadas pelo usuário via botão "Nova Atividade"
const CARD_TIPO_TO_MOVIMENTACOES_TABLE: Record<string, string> = {
  funil: 'funil_card_movimentacoes',
  prospeccao: 'prospeccao_card_movimentacoes',
  closer: 'closer_card_movimentacoes',
  pos_venda: 'pos_venda_card_movimentacoes',
  cross_selling: 'cross_selling_card_movimentacoes',
  contas_receber: 'contas_receber_movimentacoes',
};

export function useCardMovimentacoes() {
  const { profile } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<CardMovimentacao[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar movimentações de um card específico (incluindo card original se existir)
  // IMPORTANTE: Busca na tabela de MOVIMENTAÇÕES, não de atividades!
  const fetchMovimentacoes = useCallback(async (
    cardId: string, 
    cardTipo: 'funil' | 'prospeccao' | 'closer' | 'pos_venda' | 'cross_selling' | 'contas_receber',
    origemCardId?: string,
    origemKanban?: string
  ) => {
    setLoading(true);
    try {
      const tabelaMovimentacoes = CARD_TIPO_TO_MOVIMENTACOES_TABLE[cardTipo];
      
      // Buscar movimentações do card atual na tabela de MOVIMENTAÇÕES
      const { data, error } = await (supabase as any)
        .from(tabelaMovimentacoes)
        .select(`
          *,
          usuario:profiles(nome)
        `)
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let todasMovimentacoes: any[] = data || [];

      // Se existe card de origem, buscar movimentações dele também
      // IMPORTANTE: Busca o histórico completo do card de origem para manter rastreabilidade
      if (origemCardId && origemKanban) {
        // Mapeia o kanban de origem para a tabela correta de movimentações
        const tabelaOrigem = CARD_TIPO_TO_MOVIMENTACOES_TABLE[origemKanban as string] || 'prospeccao_card_movimentacoes';
        
        const { data: dataOrigem, error: errorOrigem } = await (supabase as any)
          .from(tabelaOrigem)
          .select(`
            *,
            usuario:profiles(nome)
          `)
          .eq('card_id', origemCardId)
          .order('created_at', { ascending: false });

        if (!errorOrigem && dataOrigem) {
          todasMovimentacoes = [...todasMovimentacoes, ...dataOrigem];
        }
      }

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
  const registrarMovimentacao = useCallback(async (params: RegistrarMovimentacaoParams) => {
    const {
      cardId,
      cardTipo,
      tipo,
      descricao,
      kanbanOrigem,
      kanbanDestino,
      colunaOrigemId,
      colunaDestinoId,
      colunaOrigemNome,
      colunaDestinoNome,
      dadosAnteriores,
      dadosNovos,
    } = params;

    try {
      const tabelaMovimentacoes = CARD_TIPO_TO_MOVIMENTACOES_TABLE[cardTipo];

      const { error } = await (supabase as any)
        .from(tabelaMovimentacoes)
        .insert({
          card_id: cardId,
          usuario_id: profile?.id,
          tipo: tipo,
          descricao,
          coluna_origem_id: colunaOrigemId || null,
          coluna_destino_id: colunaDestinoId || null,
          kanban_origem: kanbanOrigem ? KANBAN_LABELS[kanbanOrigem] : null,
          kanban_destino: kanbanDestino ? KANBAN_LABELS[kanbanDestino] : null,
          dados_anteriores: {
            kanban_origem: kanbanOrigem ? KANBAN_LABELS[kanbanOrigem] : null,
            coluna_origem_id: colunaOrigemId || null,
            coluna_origem_nome: colunaOrigemNome || null,
            ...dadosAnteriores,
          },
          dados_novos: {
            kanban_destino: kanbanDestino ? KANBAN_LABELS[kanbanDestino] : null,
            coluna_destino_id: colunaDestinoId || null,
            coluna_destino_nome: colunaDestinoNome || null,
            ...dadosNovos,
          },
        });

      if (error) {
        console.error('Erro ao registrar movimentação:', error);
        return false;
      }

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
  const fetchMovimentacoesContasReceber = useCallback(async (
    contaId: string,
    closerCardId?: string,
    origemCardId?: string,
    origemKanban?: string
  ) => {
    setLoading(true);
    try {
      let todasMovimentacoes: any[] = [];

      // 1. Buscar movimentações do próprio Contas a Receber
      const { data: movsCR, error: errorCR } = await (supabase as any)
        .from('contas_receber_movimentacoes')
        .select('*, usuario:profiles(nome)')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });

      if (!errorCR && movsCR) {
        todasMovimentacoes = [...todasMovimentacoes, ...movsCR.map((m: any) => ({ ...m, _kanban_origem: 'Contas a Receber' }))];
      }

      // 2. Buscar movimentações do Closer (se existir)
      let prospeccaoCardId: string | null = null;
      if (closerCardId) {
        const { data: movsCloser, error: errorCloser } = await (supabase as any)
          .from('closer_card_movimentacoes')
          .select('*, usuario:profiles(nome)')
          .eq('card_id', closerCardId)
          .order('created_at', { ascending: false });

        if (!errorCloser && movsCloser) {
          todasMovimentacoes = [...todasMovimentacoes, ...movsCloser.map((m: any) => ({ ...m, _kanban_origem: 'Closer' }))];
        }

        // Buscar origem do Closer para pegar Prospecção
        const { data: closerCard } = await (supabase as any)
          .from('closer_cards')
          .select('origem_card_id, origem_kanban')
          .eq('id', closerCardId)
          .single();

        if (closerCard?.origem_card_id && closerCard?.origem_kanban === 'prospeccao') {
          prospeccaoCardId = closerCard.origem_card_id;
        }
      }

      // 3. Buscar movimentações da Prospecção (se existir)
      if (prospeccaoCardId) {
        const { data: movsProsp, error: errorProsp } = await (supabase as any)
          .from('prospeccao_card_movimentacoes')
          .select('*, usuario:profiles(nome)')
          .eq('card_id', prospeccaoCardId)
          .order('created_at', { ascending: false });

        if (!errorProsp && movsProsp) {
          todasMovimentacoes = [...todasMovimentacoes, ...movsProsp.map((m: any) => ({ ...m, _kanban_origem: 'Prospecção' }))];
        }
      }

      // 4. Buscar movimentações de origem adicional (se diferente da prospecção já buscada)
      if (origemCardId && origemKanban && origemCardId !== prospeccaoCardId) {
        const tabelaOrigem = CARD_TIPO_TO_MOVIMENTACOES_TABLE[origemKanban] || 'prospeccao_card_movimentacoes';
        const { data: movsOrigem, error: errorOrigem } = await (supabase as any)
          .from(tabelaOrigem)
          .select('*, usuario:profiles(nome)')
          .eq('card_id', origemCardId)
          .order('created_at', { ascending: false });

        if (!errorOrigem && movsOrigem) {
          const kanbanLabel = KANBAN_LABELS[origemKanban as KanbanTipo] || origemKanban;
          todasMovimentacoes = [...todasMovimentacoes, ...movsOrigem.map((m: any) => ({ ...m, _kanban_origem: kanbanLabel }))];
        }
      }

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
