-- ============================================================================
-- ROLLBACK: Reverter Correções de Performance Fase 6
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- NOTA: Remover índices NÃO afeta funcionalidade, apenas performance
-- ============================================================================

-- GRUPO 1: CLOSER
DROP INDEX IF EXISTS idx_closer_atividades_responsavel_id;
DROP INDEX IF EXISTS idx_closer_atividades_usuario_id;
DROP INDEX IF EXISTS idx_closer_card_etiquetas_etiqueta_id;
DROP INDEX IF EXISTS idx_closer_card_movimentacoes_coluna_destino_id;
DROP INDEX IF EXISTS idx_closer_card_movimentacoes_coluna_origem_id;
DROP INDEX IF EXISTS idx_closer_card_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_closer_cards_empresa_lead_id;
DROP INDEX IF EXISTS idx_closer_modelos_atividade_empresa_id;

-- GRUPO 2: CONTAS A PAGAR/RECEBER
DROP INDEX IF EXISTS idx_contas_pagar_created_by;
DROP INDEX IF EXISTS idx_contas_pagar_atividades_usuario_id;
DROP INDEX IF EXISTS idx_contas_pagar_movimentacoes_coluna_destino_id;
DROP INDEX IF EXISTS idx_contas_pagar_movimentacoes_coluna_origem_id;
DROP INDEX IF EXISTS idx_contas_pagar_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_contas_receber_created_by;
DROP INDEX IF EXISTS idx_contas_receber_movimentacoes_coluna_destino_id;
DROP INDEX IF EXISTS idx_contas_receber_movimentacoes_coluna_origem_id;
DROP INDEX IF EXISTS idx_financeiro_contas_empresa_id;

-- GRUPO 3: CROSS-SELLING
DROP INDEX IF EXISTS idx_cross_selling_atividades_card_id;
DROP INDEX IF EXISTS idx_cross_selling_atividades_usuario_id;
DROP INDEX IF EXISTS idx_cross_selling_card_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_cross_selling_cards_coluna_id;
DROP INDEX IF EXISTS idx_cross_selling_cards_created_by;
DROP INDEX IF EXISTS idx_cross_selling_cards_empresa_id;
DROP INDEX IF EXISTS idx_cross_selling_cards_responsavel_id;
DROP INDEX IF EXISTS idx_cross_selling_colunas_empresa_id;
DROP INDEX IF EXISTS idx_cross_selling_etiquetas_empresa_id;

-- GRUPO 4: PROSPECÇÃO
DROP INDEX IF EXISTS idx_prospeccao_atividades_responsavel_id;
DROP INDEX IF EXISTS idx_prospeccao_atividades_usuario_id;
DROP INDEX IF EXISTS idx_prospeccao_card_movimentacoes_coluna_destino_id;
DROP INDEX IF EXISTS idx_prospeccao_card_movimentacoes_coluna_origem_id;
DROP INDEX IF EXISTS idx_prospeccao_card_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_prospeccao_cards_empresa_lead_id;

-- GRUPO 5: PÓS-VENDA
DROP INDEX IF EXISTS idx_pos_venda_atividades_responsavel_id;
DROP INDEX IF EXISTS idx_pos_venda_atividades_usuario_id;
DROP INDEX IF EXISTS idx_pos_venda_card_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_pos_venda_cards_cliente_id;
DROP INDEX IF EXISTS idx_pos_venda_cards_created_by;
DROP INDEX IF EXISTS idx_pos_venda_cards_responsavel_id;

-- GRUPO 6: FUNIL GENÉRICO
DROP INDEX IF EXISTS idx_funil_card_atividades_responsavel_id;
DROP INDEX IF EXISTS idx_funil_card_atividades_usuario_id;
DROP INDEX IF EXISTS idx_funil_card_comparacoes_created_by;
DROP INDEX IF EXISTS idx_funil_card_movimentacoes_etapa_destino_id;
DROP INDEX IF EXISTS idx_funil_card_movimentacoes_etapa_origem_id;
DROP INDEX IF EXISTS idx_funil_card_movimentacoes_usuario_id;
DROP INDEX IF EXISTS idx_funil_card_orcamentos_created_by;
DROP INDEX IF EXISTS idx_automacoes_etapa_id;
DROP INDEX IF EXISTS idx_comercial_funil_empresa_id;

-- GRUPO 7: TREINAMENTOS E COLABORADORES
DROP INDEX IF EXISTS idx_colaboradores_treinamentos_datas_colaborador_treinamento_id;
DROP INDEX IF EXISTS idx_solicitacoes_treinamento_colaborador_id;
DROP INDEX IF EXISTS idx_solicitacoes_treinamento_treinamento_id;
DROP INDEX IF EXISTS idx_treinamentos_empresa_id;
DROP INDEX IF EXISTS idx_sinistros_colaborador_registrado_por;
DROP INDEX IF EXISTS idx_sinistros_colaborador_tipo_sinistro_id;

-- GRUPO 8: INSTRUTORES
DROP INDEX IF EXISTS idx_instrutor_datas_indisponiveis_aprovado_por;
DROP INDEX IF EXISTS idx_instrutor_datas_indisponiveis_solicitado_por;
DROP INDEX IF EXISTS idx_instrutor_formacoes_instrutor_id;
DROP INDEX IF EXISTS idx_instrutor_solicitacao_perguntas_respondido_por;
DROP INDEX IF EXISTS idx_instrutor_solicitacoes_avaliado_por;
DROP INDEX IF EXISTS idx_instrutor_treinamentos_instrutor_id;
DROP INDEX IF EXISTS idx_instrutor_treinamentos_treinamento_id;
DROP INDEX IF EXISTS idx_instrutores_empresa_parceira_id;
DROP INDEX IF EXISTS idx_contratos_instrutor_id;
DROP INDEX IF EXISTS idx_contratos_modelo_id;

-- GRUPO 9: EMPRESAS E PARCEIROS
DROP INDEX IF EXISTS idx_empresas_parceiras_empresa_sst_id;
DROP INDEX IF EXISTS idx_empresas_parceiras_parceira_empresa_id;
DROP INDEX IF EXISTS idx_empresas_parceiras_responsavel_id;
DROP INDEX IF EXISTS idx_unidades_clientes_medico_pcmso_id;
DROP INDEX IF EXISTS idx_unidades_clientes_tecnico_responsavel_id;

-- GRUPO 10: EQUIPAMENTOS E FROTA
DROP INDEX IF EXISTS idx_equipamentos_modelos_atividade_empresa_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacao_atividades_membro_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacao_atividades_movimentacao_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_cliente_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_equipamento_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_kit_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_usuario_recebeu_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_usuario_separou_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_usuario_utilizou_id;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_historico_usuario_id;
DROP INDEX IF EXISTS idx_frota_checklists_created_by;
DROP INDEX IF EXISTS idx_frota_custos_created_by;
DROP INDEX IF EXISTS idx_frota_manutencoes_created_by;
DROP INDEX IF EXISTS idx_frota_manutencoes_empresa_id;
DROP INDEX IF EXISTS idx_frota_motoristas_created_by;
DROP INDEX IF EXISTS idx_frota_ocorrencias_created_by;
DROP INDEX IF EXISTS idx_frota_utilizacoes_created_by;
DROP INDEX IF EXISTS idx_frota_utilizacoes_empresa_id;
DROP INDEX IF EXISTS idx_frota_veiculos_created_by;

-- GRUPO 11: EPIs E SEGURANÇA
DROP INDEX IF EXISTS idx_cadastro_epis_created_by;
DROP INDEX IF EXISTS idx_entregas_epi_empresa_id;
DROP INDEX IF EXISTS idx_estoque_epis_created_by;
DROP INDEX IF EXISTS idx_matriz_epi_cargo_created_by;
DROP INDEX IF EXISTS idx_perigos_created_by;
DROP INDEX IF EXISTS idx_riscos_created_by;
DROP INDEX IF EXISTS idx_saude_ocupacional_empresa_id;

-- GRUPO 12: NOTIFICAÇÕES E SUPORTE
DROP INDEX IF EXISTS idx_notificacoes_lida_por;
DROP INDEX IF EXISTS idx_tickets_suporte_atendente_id;
DROP INDEX IF EXISTS idx_tickets_suporte_comentarios_autor_id;

-- GRUPO 13: PRODUTOS E PACOTES
DROP INDEX IF EXISTS idx_pacotes_produtos_itens_produto_id;
DROP INDEX IF EXISTS idx_produtos_servicos_forma_cobranca_id;

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 6
-- 2. Execute via MCP ou Supabase SQL Editor
-- NOTA: Remover índices apenas afeta performance, não funcionalidade
-- ============================================================================
